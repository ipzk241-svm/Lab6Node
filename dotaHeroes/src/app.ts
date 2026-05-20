import express from "express";
import cors from "cors";
import heroRouter from "./routes/hero";
import { errorHandler } from "./middleware/errorHandler";
import mongoose from "mongoose";
import authRoutes from "./routes/auth";
import cookieParser from "cookie-parser";

const app = express();
app.use(cookieParser());

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
app.use("/auth", authRoutes);

app.use(errorHandler);

export default app;

if (require.main === module) {
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => {
    console.log(`Сервер працює на порту ${PORT}`);
  });
}
