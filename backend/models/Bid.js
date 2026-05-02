import mongoose from "mongoose";

const bidSchema = new mongoose.Schema({
  userName: String,
  amount: Number,
  carId: String,
  time: Number,
});

export default mongoose.model("Bid", bidSchema);