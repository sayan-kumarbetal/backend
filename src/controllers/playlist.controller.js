import mongoose, { isValidObjectId } from "mongoose";
import { Playlist } from "../models/playlist.model.js";
import { User } from "../models/user.model.js";
import { Video } from "../models/user.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const createPlaylist = asyncHandler(async (req, res) => {
  const { name, description } = req.body;
  //TODO: create playlist

  if (!name || !name.trim().length === 0) {
    throw new ApiError(400, "Name is required required");
  }

  const currentUser = await User.findById(req.user?._id);
  if (!currentUser) {
    throw new ApiError(404, "User not found");
  }

  const playlist = await Playlist.create({
    name: name.trim(),
    description: description?.trim() || "",
    owner: req.user?._id,
    videos: [],
  });

  if (!playlist) {
    throw new ApiError(500, "Faild to create Playlist");
  }

  const createdPlaylist = await Playlist.findById(playlist._id).populate(
    "owner",
    "username fullname avatar"
  );

  return res
    .status(201)
    .json(
      new ApiResponse(201, createdPlaylist, "Playlist created successfully")
    );
});

const getUserPlaylists = asyncHandler(async (req, res) => {
  const { userId } = req.params;
  //TODO: get user playlists

  if (!isValidObjectId(userId)) {
    throw new ApiError(400, "UserId is not valid");
  }

  const user = await User.findById(userId);
  if (!user) {
    throw new ApiError(404, "User not found");
  }

  // Get pagination parameters
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const skip = (page - 1) * limit;

  const playlists = await Playlist.aggregate([
    {
      $match: {
        owner: new mongoose.Types.ObjectId(userId),
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
        videoCount: { $size: "$videos" },
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
  const totalPlaylists = await Playlist.countDocuments({ owner: userId });

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        playlists,
        user: {
          _id: user._id,
          username: user.username,
          fullName: user.fullName,
          avatar: user.avatar,
        },
        pagination: {
          page,
          limit,
          total: totalPlaylists,
          pages: Math.ceil(totalPlaylists / limit),
        },
      },
      "User playlists retrieved successfully"
    )
  );
});

const getPlaylistById = asyncHandler(async (req, res) => {
  const { playlistId } = req.params;
  //TODO: get playlist by id

  if (!isValidObjectId(playlistId)) {
    throw new ApiError(400, "Invalid PlaylistId");
  }

  const playlist = await Playlist.aggregate([
    {
      $match: {
        _id: new mongoose.Types.ObjectId(playlistId),
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
      $lookup: {
        from: "videos",
        localField: "videos",
        foreignField: "_id",
        as: "videos",
        pipeline: [
          {
            $lookup: {
              from: "users",
              localField: "owner",
              foreignField: "_id",
              as: "videoOwner",
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
              owner: { $first: "$videoOwner" },
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
        owner: { $first: "$owner" },
        videoCount: { $size: "$videos" },
      },
    },
  ]);

  if (!playlist?.length) {
    throw new ApiError(404, "Playlist not found");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, playlist[0], "Playlist retrieved successfully"));
});

const addVideoToPlaylist = asyncHandler(async (req, res) => {
  const { playlistId, videoId } = req.params;

  if (!isValidObjectId(playlistId)) {
    throw new ApiError(400, "Invalid playList id");
  }

  if (!isValidObjectId(videoId)) {
    throw new ApiError(400, "Invalid video id");
  }

  const user = User.findById(req.user?._id);
  if (!user) {
    throw new ApiError(404, "User not found");
  }

  const playlist = await Playlist.findById(playlistId);
  if (!playlist) {
    throw new ApiError(404, "Playlist not found");
  }

  const video = await Video.findById(videoId);
  if (!video) {
    throw new ApiError(404, "Video not found");
  }

  // Check if user owns the playlist
  if (playlist.owner.toString() !== req.user?._id.toString()) {
    throw new ApiError(403, "You are not authorized to modify this playlist");
  }

  // Check if video is already in playlist
  if (playlist.videos.includes(videoId)) {
    throw new ApiError(400, "Video is already in the playlist");
  }

  const updatedPlaylist = await Playlist.findByIdAndUpdate(
    playlistId,
    { $push: { videos: videoId } },
    { new: true }
  ).populate("owner", "username fullname avatar");

  return res
    .status(201)
    .json(
      new ApiResponse(201, updatedPlaylist, "Add video in playlist sucessfully")
    );
});

const removeVideoFromPlaylist = asyncHandler(async (req, res) => {
  const { playlistId, videoId } = req.params;
  // TODO: remove video from playlist

  if (!isValidObjectId(playlistId)) {
    throw new ApiError(400, "Invalid playList id");
  }

  if (!isValidObjectId(videoId)) {
    throw new ApiError(400, "Invalid video id");
  }

  const user = User.findById(req.user?._id);
  if (!user) {
    throw new ApiError(404, "User not found");
  }

  const playlist = await Playlist.findById(playlistId);
  if (!playlist) {
    throw new ApiError(404, "Playlist not found");
  }

  const video = await Video.findById(videoId);
  if (!video) {
    throw new ApiError(404, "Video not found");
  }

  // Check if user owns the playlist
  if (playlist.owner.toString() !== req.user?._id.toString()) {
    throw new ApiError(403, "You are not authorized to modify this playlist");
  }

  // Check if video is in playlist
  if (!playlist.videos.includes(videoId)) {
    throw new ApiError(400, "Video is not in the playlist");
  }

  // Remove video from playlist
  const updatedPlaylist = await Playlist.findByIdAndUpdate(
    playlistId,
    { $pull: { videos: videoId } },
    { new: true }
  ).populate("owner", "username fullName avatar");

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        updatedPlaylist,
        "Video removed from playlist successfully"
      )
    );
});

const deletePlaylist = asyncHandler(async (req, res) => {
  const { playlistId } = req.params;
  // TODO: delete playlist

  if (!isValidObjectId(playlistId)) {
    throw new ApiError(400, "Invalid playList id");
  }

  const user = User.findById(req.user?._id);
  if (!user) {
    throw new ApiError(404, "User not found");
  }

  const playlist = await Playlist.findById(playlistId);
  if (!playlist) {
    throw new ApiError(404, "Playlist not found");
  }

  // Check if user owns the playlist
  if (playlist.owner.toString() !== req.user?._id.toString()) {
    throw new ApiError(403, "You are not authorized to delete this playlist");
  }

  await Playlist.findByIdAndDelete(playlistId);

  return res
    .status(200)
    .json(new ApiResponse(200, {}, "Playlist deleted successfully"));
});

const updatePlaylist = asyncHandler(async (req, res) => {
  const { playlistId } = req.params;
  const { name, description } = req.body;
  //TODO: update playlist

  if (!isValidObjectId(playlistId)) {
    throw new ApiError(400, "Invalid playList id");
  }

  if (!name && !description) {
    throw new ApiError(400, "At least name or description is required");
  }
  const user = User.findById(req.user?._id);
  if (!user) {
    throw new ApiError(404, "User not found");
  }

  const playlist = await Playlist.findById(playlistId);
  if (!playlist) {
    throw new ApiError(404, "Playlist not found");
  }

  // Check if user owns the playlist
  if (playlist.owner.toString() !== req.user?._id.toString()) {
    throw new ApiError(403, "You are not authorized to delete this playlist");
  }

  // Prepare update object
  const updateFields = {};
  if (name) updateFields.name = name.trim();
  if (description !== undefined) updateFields.description = description.trim();

  const updatedPlaylist = await Playlist.findByIdAndUpdate(
    playlistId,
    { $set: updateFields },
    { new: true }
  ).populate("owner", "username fullname avatar");

  return res.status(
    new ApiResponse(200, updatedPlaylist, "Playlist updated successfully")
  );
});

export {
  createPlaylist,
  getUserPlaylists,
  getPlaylistById,
  addVideoToPlaylist,
  removeVideoFromPlaylist,
  deletePlaylist,
  updatePlaylist,
};
