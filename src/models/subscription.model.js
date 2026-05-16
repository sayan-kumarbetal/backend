import mongoose, { Schema } from "mongoose";
import { User } from "./user.model.js";

const subsciptionSchema = new Schema(
  {
    subscriber: {
      type: Schema.Types.ObjectId, //one who is subscribing
      ref: "User",
    },
    channel: {
      type: Schema.Types.ObjectId, //one to  whom subscriber
      ref: "User",
    },
  },
  { timestamps: true }
);

export const Subscription = mongoose.model("Subsciption", subsciptionSchema);
