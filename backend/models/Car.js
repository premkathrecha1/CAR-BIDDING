import mongoose from "mongoose";

const carSchema = new mongoose.Schema({
  make: String,
  model: String,
  year: Number,
  currentBid: Number,
  endTime: Number
});

export default mongoose.model("Car", carSchema);