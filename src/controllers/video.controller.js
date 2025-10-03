import mongoose, { isValidObjectId } from "mongoose";
import { Video } from "../models/video.model.js";
import { User } from "../models/user.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import {
  uploadOnCloudinary,
  deleteFromCloudinary,
} from "../utils/cloudinary.js";

const getAllVideos = asyncHandler(async (req, res) => {
  const { page = 1, limit = 10, query, sortBy, sortType, userId } = req.query;
  //TODO: get all videos based on query, sort, pagination

  const matchStage = {};

  //if user id is provided, filter by owner
  if (userId) {
    if (!userId) {
      throw new ApiError(401, "User is undefined");
    }
    matchStage.owner = mongoose.Types.ObjectId(userId);
  }

  //if query is given search by title and description

  if (query) {
    matchStage.$or = [
      { title: { $regex: query, $options: "i" } },
      {
        description: { $regex: query, $options: "i" },
      },
    ];
  }

  matchStage.isPublished = true;

  const sortStage = {};
  if (sortBy && sortType) {
    sortStage[sortBy] = sortType === "desc" ? -1 : 1;
  } else {
    sortStage.createdAt = -1;
  }

  const pipeline = [
    {
      $match: matchStage,
    },
    {
      $lookup: {
        from: "users",
        localField: "owner",
        foreignField: "_id",
        as: "ownerDetails",
        pipeline: [
          {
            $project: {
              username: 1,
              avatar: 1,
            },
          },
        ],
      },
    },
    {
      $addFields: {
        owner: {
          $first: "$ownerDetails",
        },
      },
    },
    { $sort: sortStage },
    {
      $project: {
        ownerDetails: 0,
      },
    },
  ];

  const pageNumber = parseInt(page, 10);
  const limitNumber = parseInt(limit, 10);

  const videos = await Video.aggregatePaginate(pipeline, {
    page: pageNumber,
    limit: limitNumber,
  });

  return res
    .status(200)
    .json(new ApiResponse(200, videos, "Videos fetched sucessfully"));
});

const publishAVideo = asyncHandler(async (req, res) => {
  // TODO: get video, upload to cloudinary, create video
  const { title, description } = req.body;
  if ([title, description].some((field) => field?.trim() === "")) {
    throw new ApiError(400, "All fields are required");
  }

  const filePath = req.files?.videoFile?.[0]?.path;
  const thumbnailPath = req.files?.thumbnail?.[0]?.path;

  if (!filePath) {
    throw new ApiError(401, "Video is required for publish");
  }

  if (!thumbnailPath) {
    throw new ApiError(401, "Video is required for publish");
  }

  const uploadVideo = await uploadOnCloudinary(filePath);
  const thumbnailFile = await uploadOnCloudinary(thumbnailPath);

  if (!uploadVideo) {
    throw new ApiError(400, "Error while uploading on video");
  }
  if (!thumbnailFile) {
    throw new ApiError(400, "Error while uploading on video");
  }

  const video = await Video.create({
    title,
    description,
    duration: uploadVideo.duration,
    videoFile: uploadVideo.secure_url,
    thumbnail: thumbnailFile.secure_url,
    views: 0,
    owner: req.user?._id,
    isPublished: true,
  });

  return res
    .status(200)
    .json(new ApiResponse(200, video, "Video upload sucessfully"));
});

const getVideoById = asyncHandler(async (req, res) => {
  const { videoId } = req.params;
  //TODO: get video by id
  if (!videoId || !mongoose.Types.ObjectId.isValid(videoId)) {
    throw new ApiError(401, "VideoId is missing");
  }

  const video = await Video.aggregate([
    {
      $match: { _id: new mongoose.Types.ObjectId(videoId) },
    },
    {
      $lookup: {
        from: "likes",
        localField: "_id",
        foreignField: "video",
        as: "likes",
      },
    },
    {
      $lookup: {
        from: "users",
        localField: "owner",
        foreignField: "_id",
        as: "owner",
        pipeline: [
          {
            $lookup: {
              from: "subsciptions",
              localField: "_id",
              foreignField: "channel",
              as: "subscribers",
            },
          },
          {
            $addFields: {
              subscriberCount: {
                $size: "$subscribers",
              },
              isSubscribed: {
                $cond: {
                  if: {
                    $in: [req.user?._id, "$subscribers.subscriber"],
                  },
                  then: true,
                  else: false,
                },
              },
            },
          },
          {
            $project: {
              username: 1,
              avatar: 1,
              subscriberCount: 1,
              isSubscribed: 1,
            },
          },
        ],
      },
    },
    {
      $addFields: {
        likesCount: {
          $size: "$likes",
        },
        owner: {
          $first: "$owner",
        },
        isLiked: {
          $cond: {
            if: {
              $in: [req.user?._id, "$likes.likedBy"],
            },
            then: true,
            else: false,
          },
        },
      },
    },
    {
      $project: {
        videoFile: 1,
        thumbnail: 1,
        title: 1,
        description: 1,
        views: 1,
        createdAt: 1,
        owner: 1,
        likesCount: 1,
        isLiked: 1,
      },
    },
  ]);

  if (!video?.length) {
    throw new ApiError(404, "Video does not exist");
  }

  const videoDoc = await Video.findById(videoId);
  if (req.user && videoDoc.owner.toString() !== req.user._id.toString()) {
    videoDoc.views += 1;
    await videoDoc.save({ validateBeforeSave: false });
  }
  return res
    .status(200)
    .json(new ApiResponse(200, video[0], "Video fetched sucessfully"));
});

const updateVideo = asyncHandler(async (req, res) => {
  //TODO: update video details like title, description, thumbnail
  const { videoId } = req.params;
  const { title, description } = req.body;
  const thumbnailLocalPath = req.file?.path;

  if (!isValidObjectId(videoId)) {
    throw new ApiError(400, "Invalid Viddeoid");
  }

  const video = await Video.findById(videoId);
  if (!video) {
    throw new ApiError(404, "No video found");
  }

  if (video.owner.toString() !== req.user?._id.toString()) {
    throw new ApiError(403, "You are not the owner of this video");
  }

  const updateData = {};
  if (title) {
    updateData.title = title;
  }

  if (description) {
    updateData.description = description;
  }

  if (thumbnailLocalPath) {
    const oldThumbnailUrl = video.thumbnail;
    const thumbnail = await uploadOnCloudinary(thumbnailLocalPath);
    if (!thumbnail.secure_url) {
      throw new ApiError(400, "Error while uploading thumbnail");
    }

    updateData.thumbnail = thumbnail.secure_url;

    // Delete old thumbnail after updating the document
    if (oldThumbnailUrl) {
      try {
        await deleteFromCloudinary(oldThumbnailUrl);
      } catch (error) {
        console.error("Failed to delete old thumbnail:", error);
      }
    }
  }

  const updatedVideo = await Video.findByIdAndUpdate(
    videoId,
    { $set: updateData },
    { new: true }
  );

  if (!updatedVideo) {
    throw new ApiError(500, "Failed to update video details");
  }

  return res
    .status(200)
    .json(
      new ApiResponse(200, updatedVideo, "Video details updated successfully")
    );
});

const deleteVideo = asyncHandler(async (req, res) => {
  const { videoId } = req.params;
  //TODO: delete video
  if (!isValidObjectId(videoId)) {
    throw new ApiError(400, "Invalid Viddeoid");
  }

  const video = await Video.findById(videoId);
  if (!video) {
    throw new ApiError(404, "No video found");
  }

  if (video.owner.toString() !== req.user?._id.toString()) {
    throw new ApiError(403, "You are not the owner of this video");
  }

  // Delete video file from Cloudinary using URL
  if (video.videoFile) {
    try {
      await deleteFromCloudinary(video.videoFile);
      console.log("Video file deleted from Cloudinary");
    } catch (error) {
      console.error("Failed to delete video file from Cloudinary:", error);
      // Don't throw error here - continue with database deletion
    }
  }

  // Delete thumbnail from Cloudinary using URL
  if (video.thumbnail) {
    try {
      await deleteFromCloudinary(video.thumbnail);
      console.log("Thumbnail deleted from Cloudinary");
    } catch (error) {
      console.error("Failed to delete thumbnail from Cloudinary:", error);
      // Don't throw error here - continue with database deletion
    }
  }

  // Delete video
  const videoDeleted = await Video.findByIdAndDelete(video?._id);

  if (!videoDeleted) {
    throw new ApiError(400, "Failed to delete the video please try again");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, {}, "Video deleted successfully"));
});

const togglePublishStatus = asyncHandler(async (req, res) => {
  const { videoId } = req.params;

  if (!isValidObjectId(videoId)) {
    throw new ApiError(400, "Invalid videoId");
  }

  const video = await Video.findById(videoId);

  if (!video) {
    throw new ApiError(404, "video not found");
  }

  if (video?.owner.toString() !== req.user?._id.toString()) {
    throw new ApiError(
      400,
      "You can't toggle this video,you are not owner of this video"
    );
  }

  video.isPublished = !video.isPublished;
  await video.save({ validateBeforeSave: false });

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        { isPublished: video.isPublished },
        "Video publish toggled successfully"
      )
    );
});

export {
  getAllVideos,
  publishAVideo,
  getVideoById,
  updateVideo,
  deleteVideo,
  togglePublishStatus,
};
