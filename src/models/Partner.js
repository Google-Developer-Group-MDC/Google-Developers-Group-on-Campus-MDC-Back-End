import mongoose from "mongoose";
import { PARTNERSHIP_OPTIONS, PARTNER_STATUSES } from "../validators/options.js";

const partnerSchema = new mongoose.Schema(
  {
    companyName: { type: String, required: true, trim: true },
    contactName: { type: String, required: true, trim: true },
    email: { type: String, required: true, lowercase: true, trim: true },
    phone: { type: String, required: true },
    website: { type: String, default: "" },
    streetAddress: { type: String, required: true },
    city: { type: String, required: true },
    state: { type: String, required: true },
    zip: { type: String, required: true },
    partnershipInterest: { type: String, enum: PARTNERSHIP_OPTIONS, required: true },
    message: { type: String, default: "" },
    status: { type: String, enum: PARTNER_STATUSES, default: "new" },
    notes: { type: String, default: "" },
  },
  { timestamps: true }
);

partnerSchema.index({ createdAt: -1 });

export const Partner = mongoose.model("Partner", partnerSchema);
