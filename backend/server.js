import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import dotenv from "dotenv";

import carRoutes from "./routes/carRoutes.js";
import authRoutes from "./routes/authRoutes.js";


dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());
app.use("/api/auth", authRoutes);

// test route
app.get("/", (req, res) => {
  res.send("API Running 🚀");
});

// 🔥 IMPORTANT ROUTE
app.use("/api/cars", carRoutes);

const PORT = 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});