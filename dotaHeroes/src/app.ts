import express from "express";
import cors from "cors";
import heroRouter from "./routes/hero";
import { errorHandler } from "./middleware/errorHandler";
import mongoose from "mongoose";


const app = express();

app.get("/health", (req, res) => {
  if (mongoose.connection.readyState === 1) {
    res.status(200).json({ status: "OK", database: "connected" });
  } else {
    res
      .status(503)
      .json({ status: "Service Unavailable", database: "disconnected" });
  }
});

app.use(cors());
app.use(express.json());

app.use("/api/heroes", heroRouter);

app.use(errorHandler);

export default app;
