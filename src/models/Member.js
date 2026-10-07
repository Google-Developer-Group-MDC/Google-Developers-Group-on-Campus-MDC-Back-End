import mongoose from "mongoose";
import { HEAR_ABOUT_OPTIONS, INTEREST_OPTIONS, MEMBER_STATUSES, YEAR_OPTIONS } from "../validators/options.js";

const memberSchema = new mongoose.Schema(
  {
    firstName: { type: String, required: true, trim: true },
    lastName: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    phone: { type: String, default: "" },
    major: { type: String, required: true, trim: true },
    year: { type: String, enum: YEAR_OPTIONS, required: true },
    interests: [{ type: String, enum: INTEREST_OPTIONS }],
    hearAboutUs: { type: String, enum: [...HEAR_ABOUT_OPTIONS, ""], default: "" },
    additionalInfo: { type: String, default: "" },
    status: { type: String, enum: MEMBER_STATUSES, default: "pending" },
    notes: { type: String, default: "" },
  },
  { timestamps: true }
);

memberSchema.index({ createdAt: -1 });

export const Member = mongoose.model("Member", memberSchema);
