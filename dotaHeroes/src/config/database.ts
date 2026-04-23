import mongoose from "mongoose";

export async function connectDB(): Promise<void> {
  const uri = process.env.MONGODB_URI;

  if (!uri) {
    console.error("Помилка: MONGODB_URI не знайдено у змінних середовища.");
    process.exit(1);
  }

  try {
    await mongoose.connect(uri);
    console.log("Успішно підключено до MongoDB");
  } catch (error) {
    console.error("Помилка підключення до MongoDB:", error);
    process.exit(1);
  }
}

mongoose.connection.on("error", (err) => {
  console.error("MongoDB помилка:", err);
});

mongoose.connection.on("disconnected", () => {
  console.warn("MongoDB відключено");
});
