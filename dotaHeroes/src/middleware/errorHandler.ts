import { Request, Response, NextFunction } from "express";
import { ZodError } from "zod";
import mongoose from "mongoose";

export const errorHandler = (
  err: any,
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  if (err instanceof ZodError) {
    res.status(400).json({
      message: "Помилка валідації вхідних даних",
      errors: err.issues,
    });
    return;
  }

  if (err instanceof mongoose.Error.CastError && err.kind === "ObjectId") {
    res.status(400).json({
      message: `Невалідний формат ID. Очікується ObjectId, отримано: ${err.value}`,
    });
    return;
  }

  if (err instanceof mongoose.Error.ValidationError) {
    const messages = Object.values(err.errors).map((e) => e.message);
    res.status(400).json({
      message: "Помилка валідації бази даних",
      errors: messages,
    });
    return;
  }

  if (err.name === "MongoServerError" && err.code === 11000) {
    const field = Object.keys(err.keyValue)[0];
    res.status(409).json({
      message: `Конфлікт даних: Запис із таким значенням '${field}' вже існує.`,
    });
    return;
  }

  console.error("Unhandled Error:", err);
  res.status(500).json({ message: "Internal Server Error" });
};