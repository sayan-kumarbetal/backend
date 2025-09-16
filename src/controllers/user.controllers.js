import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { User } from "../models/user.mdel.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";

const registerUser = asyncHandler(async (req, res) => {
  // get user details from fronted
  //validation -not empty
  //chech if user already exists: username,email
  //check them to cloudinary,avatar
  //upload them to cloudinary ,avatar
  //create user object-create entry in db
  //remove password and referesh token field from response
  //check for user creation
  //return res

  const { fullname, email, username, password } = req.body;
  console.log("email", email);

  if (
    [fullname, email, username, password].some((field) => field?.trim() === "")
  ) {
    throw new ApiError(400, "All fields are required");
  }

  const existedUsre = await User.findOne({
    $or: [{ username }, { email }],
  });

  if (existedUsre) {
    throw new ApiError(409, "Usre with email with username already exist");
  }

  const avatarLocalPath = req.files?.avatar?.[0]?.path;
  const coverImageLocalPath = req.files?.coverImage?.[0]?.path;
  // console.log("req.files:", req.files);
  // console.log("avatarLocalPath:", avatarLocalPath);

  if (!avatarLocalPath) {
    throw new ApiError(400, "Avatar file is required");
  }

  const avatar = await uploadOnCloudinary(avatarLocalPath);
  if (!avatar) {
    throw new ApiError(400, "Cloudinary upload failed for avatar");
  }
  const coverImage = await uploadOnCloudinary(coverImageLocalPath);

  if (!avatar) {
    throw new ApiError(400, "Avatar file is required");
  }

  const user = await User.create({
    fullname,
    avatar: avatar.url,
    coverImage: coverImage?.url || "",
    email,
    password,
    username: username.toLowerCase(),
  });

  const createdUser = await User.findById(user._id).select(
    "-password -refreshToken"
  );

  if (!createdUser) {
    throw new ApiError(500, "Something went Wrong!");
  }

  return res
    .status(201)
    .json(new ApiResponse(200, createdUser, "User registered sucessfully"));
});

export { registerUser };
