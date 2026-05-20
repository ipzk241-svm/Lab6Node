import request from "supertest";
import { MongoMemoryServer } from "mongodb-memory-server";
import mongoose from "mongoose";
import app from "../src/app";
import {
  describe,
  it,
  expect,
  beforeAll,
  afterAll,
  afterEach,
  jest,
  beforeEach,
} from "@jest/globals";
import { User } from "../src/models/User";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";

process.env.JWT_SECRET = "secret_key";

let mongoServer: MongoMemoryServer;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const mongoUri = mongoServer.getUri();
  await mongoose.connect(mongoUri);
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

beforeEach(async () => {
  await User.deleteMany({});
});

describe("POST /auth/register", () => {
  it("повинен успішно реєструвати нового користувача", async () => {
    const res = await request(app).post("/auth/register").send({
      email: "test@example.com",
      password: "password123",
    });

    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty("id");
    expect(res.body.email).toBe("test@example.com");

    expect(res.body).not.toHaveProperty("password");

    const userInDb = await User.findOne({ email: "test@example.com" });
    expect(userInDb).not.toBeNull();
    expect(userInDb?.password).not.toBe("password123");
  });

  it("повинен повертати 409 Conflict при дублюванні пошти", async () => {
    await User.create({
      email: "test@example.com",
      password: "hashedpassword",
    });

    const res = await request(app).post("/auth/register").send({
      email: "test@example.com",
      password: "newpassword123",
    });

    expect(res.status).toBe(409);
  });

  it("повинен повертати 400 при невалідному email", async () => {
    const res = await request(app).post("/auth/register").send({
      email: "invalid-email",
      password: "password123",
    });

    expect(res.status).toBe(400);
  });

  it("повинен повертати 400 при надто короткому паролі", async () => {
    const res = await request(app).post("/auth/register").send({
      email: "test@example.com",
      password: "123",
    });

    expect(res.status).toBe(400);
  });
});

describe("Auth Endpoints (Login, Refresh, Logout)", () => {
  const testUser = {
    email: "login_test@example.com",
    password: "securepassword123",
  };

  let cookies: string[];

  beforeEach(async () => {
    await User.deleteMany({});

    await User.create({
      email: testUser.email,
      password: testUser.password,
    });
  });

  describe("POST /auth/login", () => {
    it("повинен успішно логінити та повертати cookies з токенами", async () => {
      const res = await request(app).post("/auth/login").send({
        email: testUser.email,
        password: testUser.password,
      });

      expect(res.status).toBe(200);
      expect(res.body.message).toBe("Успішний вхід");

      cookies = res.headers["set-cookie"] as unknown as string[];
      expect(cookies).toBeDefined();

      const hasAccessToken = cookies.some((cookie) =>
        cookie.includes("access_token="),
      );
      const hasRefreshToken = cookies.some((cookie) =>
        cookie.includes("refresh_token="),
      );
      expect(hasAccessToken).toBeTruthy();
      expect(hasRefreshToken).toBeTruthy();
    });

    it("повинен повертати 401 при неправильному паролі", async () => {
      const res = await request(app).post("/auth/login").send({
        email: testUser.email,
        password: "wrongpassword",
      });

      expect(res.status).toBe(401);
      expect(res.body.message).toBe("Невірний email або пароль");
      expect(res.headers["set-cookie"]).toBeUndefined();
    });

    it("повинен повертати 401 при неіснуючому email", async () => {
      const res = await request(app).post("/auth/login").send({
        email: "nonexistent@example.com",
        password: testUser.password,
      });

      expect(res.status).toBe(401);
    });
  });

  describe("POST /auth/refresh", () => {
    it("повинен оновлювати токени при наявності валідного refresh_token", async () => {
      const loginRes = await request(app).post("/auth/login").send(testUser);

      const validCookies = loginRes.headers[
        "set-cookie"
      ] as unknown as string[];

      const refreshRes = await request(app)
        .post("/auth/refresh")
        .set("Cookie", validCookies);

      expect(refreshRes.status).toBe(200);
      expect(refreshRes.headers["set-cookie"]).toBeDefined();

      const newCookies = refreshRes.headers[
        "set-cookie"
      ] as unknown as string[];
      const hasNewAccessToken = newCookies.some((c: string) =>
        c.includes("access_token="),
      );
      expect(hasNewAccessToken).toBeTruthy();
    });

    it("повинен повертати 401, якщо refresh_token відсутній", async () => {
      const res = await request(app).post("/auth/refresh");

      expect(res.status).toBe(401);
      expect(res.body.message).toBe("Токен відсутній");
    });

    it("повинен повертати 401, якщо refresh_token недійсний", async () => {
      const res = await request(app)
        .post("/auth/refresh")
        .set("Cookie", ["refresh_token=invalid_token_string; HttpOnly"]);

      expect(res.status).toBe(401);
      expect(res.body.message).toBe("Недійсний або прострочений токен");
    });
  });

  describe("POST /auth/logout", () => {
    it("повинен очищати cookies при виході", async () => {
      const res = await request(app).post("/auth/logout");

      expect(res.status).toBe(200);
      expect(res.body.message).toBe("Вихід успішний");

      const clearCookies = res.headers["set-cookie"];
      expect(clearCookies).toBeDefined();
      expect(clearCookies[0]).toMatch(/access_token=;/);
      expect(clearCookies[1]).toMatch(/refresh_token=;/);
    });
  });
});
