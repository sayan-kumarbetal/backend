import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";

const app = express();

app.use(
  cors({
    origin: process.env.CORS_ORIGIN,
    credentials: true,
  })
);

app.use(express.json({ limit: "16kb" }));
app.use(express.urlencoded({ extended: true, limit: "16kb" }));
app.use(express.static("public"));
app.use(cookieParser());

//routes immport

import userRouter from "./routes/user.routs.js";
import videosRouter from "./routes/video.routes.js";
import commentsRouter from "./routes/comment.routes.js";
import likesRouter from "./routes/comment.routes.js";
import tweetsRouter from "./routes/comment.routes.js";

//routes declaration
app.use("/api/v1/users", userRouter);
app.use("/api/v1/videos", videosRouter);
app.use("/api/v1/comments", commentsRouter);
app.use("/api/v1/likes", likesRouter);
app.use("/api/v1/tweets", tweetsRouter);

export { app };
