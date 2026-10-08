import mongoose from "mongoose";

// Single document holding numbers synced from the chapter page on gdg.community.dev.
const chapterStatsSchema = new mongoose.Schema(
  {
    chapterId: { type: Number, required: true, unique: true },
    gdgMembersCount: { type: Number, default: 0 },
    lastSyncedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

export const ChapterStats = mongoose.model("ChapterStats", chapterStatsSchema);
