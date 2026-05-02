import express from "express";
import Car from "../models/Car.js";

const router = express.Router();

// POST API
router.post("/", async (req, res) => {
  try {
    const car = new Car(req.body);
    await car.save();
    res.json(car);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET API
router.get("/", async (req, res) => {
  const cars = await Car.find();
  res.json(cars);
});

export default router;