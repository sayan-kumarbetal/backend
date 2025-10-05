import mongoose, { isValidObjectId } from "mongoose";
import { User } from "../models/user.model.js";
import { Comment } from "../models/comment.model.js";
import { Tweet } from "../models/tweet.model.js";
import { Like } from "../models/like.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const toggleVideoLike = asyncHandler(async (req, res) => {
  //TODO: toggle like on video
  const { videoId } = req.params;

  if (!videoId || !mongoose.Types.ObjectId.isValid(videoId)) {
    throw new ApiError(400, "Video not found");
  }

  const currentUser = await User.findById(req.user?._id);
  if (!currentUser) {
    throw new ApiError(404, "User not found");
  }

  const video = await Video.findById(videoId);
  if (!video) {
    throw new ApiError(404, "Video not found");
  }

  const existingLike = await Like.findOne({
    video: videoId,
    likedBy: req.user?._id,
  });

  let isLiked;
  let message;
  if (existingLike) {
    await Like.findByIdAndDelete(existingLike._id);
    message = "Video unliked sucessfully";
    isLiked = false;
  } else {
    await Like.create({
      video: videoId,
      likedBy: req.user?._id,
    });
    message = "Video liked sucessfuly";
    isLiked = true;
  }

  return res.status(200).json(new ApiResponse(200, { isLiked }, message));
});

const toggleCommentLike = asyncHandler(async (req, res) => {
  //TODO: toggle like on comment
  const { commentId } = req.params;

  if (!commentId || !mongoose.Types.ObjectId.isValid(commentId)) {
    throw new ApiError(400, "Comment is missing");
  }

  const currentUser = await User.findById(req.user?._id);
  if (!currentUser) {
    throw new ApiError(404, "Current user not found");
  }

  const comment = await Comment.findById(commentId);
  if (!comment) {
    throw new ApiError(404, "Comment not found");
  }

  const existingLike = await Like.findOne({
    comment: commentId,
    likedBy: req.user?._id,
  });

  let isLiked;
  let message;
  if (existingLike) {
    await Like.findByIdAndDelete(existingLike._id);
    message = "Comment unliked sucessfully";
    isLiked = false;
  } else {
    await Like.create({
      comment: commentId,
      likedBy: req.user?._id,
    });
    message = "Comment liked sucessfuly";
    isLiked = true;
  }

  return res.status(200).json(new ApiResponse(200, { isLiked }, message));
});

const toggleTweetLike = asyncHandler(async (req, res) => {
  const { tweetId } = req.params;
  //TODO: toggle like on tweet

  if (!tweetId || !mongoose.Types.ObjectId.isValid(tweetId)) {
    throw new ApiError(400, "Tweet is missing");
  }

  const currentUser = await User.findById(req.user?._id);
  if (!currentUser) {
    throw new ApiError(404, "Current user not found");
  }

  const tweet = await Tweet.findById(tweetId);
  if (!tweet) {
    throw new ApiError(404, "Tweet not found");
  }

  const existingLike = await Like.findOne({
    tweet: tweetId,
    likedBy: req.user?._id,
  });

  let isLiked;
  let message;
  if (existingLike) {
    await Like.findByIdAndDelete(existingLike._id);
    message = "Tweet unliked sucessfully";
    isLiked = false;
  } else {
    await Like.create({
      tweet: tweetId,
      likedBy: req.user?._id,
    });
    message = "Tweet liked sucessfuly";
    isLiked = true;
  }

  return res.status(200).json(new ApiResponse(200, { isLiked }, message));
});

const getLikedVideos = asyncHandler(async (req, res) => {
  //TODO: get all liked videos

  const currentUser = await User.findById(req.user?._id);
  if (!currentUser) {
    throw new ApiError(404, "User not found");
  }

  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const skip = (page - 1) * limit;

  const likedVideos = await Like.aggregate([
    {
      $match: {
        likedBy: new mongoose.Types.ObjectId(req.user?._id),
        video: { $exists: true },
      },
    },
    {
      $lookup: {
        from: "videos",
        localField: "video",
        foreignField: "_id",
        as: "videoDetails",
        pipeline: [
          {
            $lookup: {
              from: "users",
              localField: "owner",
              foreignField: "_id",
              as: "owner",
              pipeline: [
                {
                  $project: {
                    username: 1,
                    fullname: 1,
                    avatar: 1,
                  },
                },
              ],
            },
          },
          {
            $addFields: {
              owner: { $first: "$owner" },
            },
          },
          {
            $project: {
              title: 1,
              description: 1,
              thumbnail: 1,
              duration: 1,
              views: 1,
              createdAt: 1,
              owner: 1,
            },
          },
        ],
      },
    },
    {
      $addFields: {
        video: { $first: "$videodetails" },
      },
    },
    {
      $match: {
        video: { $ne: null },
      },
    },
    {
      $project: {
        videodetails: 0,
        likedBy: 0,
      },
    },
    {
      $sort: { createdAt: -1 },
    },
    {
      $skip: skip,
    },
    {
      $limit: limit,
    },
  ]);

  // Get total count for pagination
  const totalLikedVideos = await Like.countDocuments({
    likedBy: req.user?._id,
    video: { $exists: true },
  });

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        likedVideos,
        user: {
          _id: currentUser._id,
          username: currentUser.username,
          fullName: currentUser.fullName,
          avatar: currentUser.avatar,
        },
        pagination: {
          page,
          limit,
          total: totalLikedVideos,
          pages: Math.ceil(totalLikedVideos / limit),
        },
      },
      "Liked videos retrieved successfully"
    )
  );
});

export { toggleCommentLike, toggleTweetLike, toggleVideoLike, getLikedVideos };
