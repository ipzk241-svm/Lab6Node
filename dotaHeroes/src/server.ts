import dotenv from "dotenv";
dotenv.config();

import app from "./app";
import mongoose from "mongoose";
import { connectDB } from "./config/database";

const PORT = process.env.PORT || 3000;

async function startServer() {

  

  await connectDB();

  const server = app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
  });

  process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
  process.on("SIGINT", () => gracefulShutdown("SIGINT"));

  const gracefulShutdown = async (signal: string) => {
    console.log("\nClosing server after ${signal}");

    server.close(async (err) => {
      if (err) {
        console.error("Помилка при закритті сервера:", err);
        process.exit(1);
      }
      console.log("HTTP сервер закрито");

      try {
        await mongoose.connection.close();
        console.log("З'єднання з MongoDB закрито");
        process.exit(0);
      } catch (mongoErr) {
        console.error("Помилка при закритті з'єднання з MongoDB:", mongoErr);
        process.exit(1);
      }
    });
  };
}

startServer();
