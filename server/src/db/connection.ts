import mongoose from "mongoose";

const MONGODB_URI =
  process.env.MONGODB_URI ?? "mongodb://127.0.0.1:27017/legal-assistant";

export async function connectDB(): Promise<void> {
  if (mongoose.connection.readyState >= 1) return;
  try {
    await mongoose.connect(MONGODB_URI);
    console.log(`✅ MongoDB connected → ${MONGODB_URI.split("@").pop()}`); // hide credentials in logs
  } catch (err) {
    console.error("❌ MongoDB connection error:", err);
    // Don't exit on Vercel, just throw so the function can retry
    if (process.env.VERCEL) throw err;
    process.exit(1);
  }
}
