import express from "express";
import { z } from "zod";
import { User } from "../models/User";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";

const router = express.Router();

const registerSchema = z.object({
  email: z.string().email("Некоректний формат пошти"),
  password: z.string().min(6, "Мінімальна довжина пароля - 6 символів"),
});

router.post("/register", async (req, res) => {
  try {
    const { email, password } = registerSchema.parse(req.body);

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res
        .status(409)
        .json({ message: "Користувач з такою поштою вже існує" });
    }

    const user = new User({ email, password });
    await user.save();

    res.status(201).json({
      id: user._id,
      email: user.email,
      createdAt: user.createdAt,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ errors: error.issues });
    }
    console.error(error);
    res.status(500).json({ message: "Внутрішня помилка сервера" });
  }
});


const loginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
});

const generateTokens = (userId: string) => {
  const accessToken = jwt.sign({ userId }, process.env.JWT_SECRET as string, {
    expiresIn: "15m",
  });
  const refreshToken = jwt.sign({ userId }, process.env.JWT_SECRET as string, {
    expiresIn: "30d",
  });
  return { accessToken, refreshToken };
};

const cookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production", 
  sameSite: "strict" as const,
};

router.post("/login", async (req, res) => {
  try {
    const { email, password } = loginSchema.parse(req.body);

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ message: "Невірний email або пароль" });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: "Невірний email або пароль" }); 
    }

    const { accessToken, refreshToken } = generateTokens(user.id);

    res.cookie("access_token", accessToken, cookieOptions);
    res.cookie("refresh_token", refreshToken, cookieOptions);

    res.status(200).json({ message: "Успішний вхід" });
  } catch (error) {
    res.status(400).json({ message: "Помилка валідації вхідних даних" });
  }
});

router.post("/refresh", async (req, res) => {
  const { refresh_token } = req.cookies;

  if (!refresh_token) {
    return res.status(401).json({ message: "Токен відсутній" });
  }

  try {
    const decoded = jwt.verify(
      refresh_token,
      process.env.JWT_SECRET as string,
    ) as { userId: string };

    const { accessToken, refreshToken } = generateTokens(decoded.userId);

    res.cookie("access_token", accessToken, cookieOptions);
    res.cookie("refresh_token", refreshToken, cookieOptions);

    res.status(200).json({ message: "Токени успішно оновлено" });
  } catch (error) {
    res.status(401).json({ message: "Недійсний або прострочений токен" });
  }
});

router.post("/logout", (req, res) => {
  res.clearCookie("access_token");
  res.clearCookie("refresh_token");
  res.status(200).json({ message: "Вихід успішний" });
});

export default router;
