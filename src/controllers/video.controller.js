import mongoose, { isValidObjectId } from "mongoose";
import { Video } from "../models/video.model.js";
import { User } from "../models/user.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";

const getAllVideos = asyncHandler(async (req, res) => {
  const { page = 1, limit = 10, query, sortBy, sortType, userId } = req.query;
  //TODO: get all videos based on query, sort, pagination
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
});

const updateVideo = asyncHandler(async (req, res) => {
  const { videoId } = req.params;
  //TODO: update video details like title, description, thumbnail
});

const deleteVideo = asyncHandler(async (req, res) => {
  const { videoId } = req.params;
  //TODO: delete video
});

const togglePublishStatus = asyncHandler(async (req, res) => {
  const { videoId } = req.params;
});

export {
  getAllVideos,
  publishAVideo,
  getVideoById,
  updateVideo,
  deleteVideo,
  togglePublishStatus,
};
