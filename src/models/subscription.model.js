import mongoose, { Schema } from "mongoose";
import { User } from "./user.mdel";

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

export const Subsciption = mongoose.model("Subsciption", subsciptionSchema);
