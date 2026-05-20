import request from "supertest";
import { MongoMemoryServer } from "mongodb-memory-server";
import mongoose from "mongoose";
import jwt from "jsonwebtoken";
import app from "../src/app";
import { User } from "../src/models/User";
import { HeroModel } from "../src/models/hero.model";
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

process.env.JWT_SECRET = "super_secret_test_key_123";

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

describe("Protected Hero Routes (CRUD & Authorization)", () => {
  let user1Id: string;
  let user2Id: string;
  let user1Cookie: string;
  let user2Cookie: string;
  let heroId: string;

  const validHeroData = {
    name: "Anti-Mage",
    attackType: "Melee",
    primaryAttribute: "Agility",
    roles: ["Carry", "Escape"],
    complexity: 1,
  };

  beforeEach(async () => {
    await User.deleteMany({});
    await HeroModel.deleteMany({});

    const user1 = await User.create({
      email: "user1@example.com",
      password: "password123",
    });
    const user2 = await User.create({
      email: "user2@example.com",
      password: "password123",
    });

    user1Id = user1._id.toString();
    user2Id = user2._id.toString();

    const token1 = jwt.sign(
      { userId: user1Id },
      process.env.JWT_SECRET as string,
      { expiresIn: "15m" },
    );
    const token2 = jwt.sign(
      { userId: user2Id },
      process.env.JWT_SECRET as string,
      { expiresIn: "15m" },
    );

    user1Cookie = `access_token=${token1};`;
    user2Cookie = `access_token=${token2};`;
  });

  describe("POST /", () => {
    it("повинен повертати 401, якщо користувач не авторизований (немає токена)", async () => {
      const res = await request(app).post("/api/heroes").send(validHeroData);

      expect(res.status).toBe(401);
    });

    it("повинен створювати героя і прив'язувати його до ownerId", async () => {
      const res = await request(app)
        .post("/api/heroes")
        .set("Cookie", [user1Cookie])
        .send(validHeroData);

      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty("ownerId");
      expect(res.body.ownerId).toBe(user1Id);

      const heroInDb = await HeroModel.findById(res.body._id);
      expect(heroInDb?.ownerId?.toString()).toBe(user1Id);
    });
  });

  describe("PATCH /:id", () => {
    beforeEach(async () => {
      const newHero = await HeroModel.create({
        ...validHeroData,
        ownerId: user1Id,
      });
      heroId = newHero._id.toString();
    });

    it("повинен повертати 401 для неавторизованих запитів", async () => {
      const res = await request(app)
        .patch(`/api/heroes/${heroId}`)
        .send({ name: "Magina" });

      expect(res.status).toBe(401);
    });

    it("повинен оновлювати героя, якщо запит робить власник (ownerId збігається)", async () => {
      const res = await request(app)
        .patch(`/api/heroes/${heroId}`)
        .set("Cookie", [user1Cookie])
        .send({ name: "Magina" });

      expect(res.status).toBe(200);
      expect(res.body.name).toBe("Magina");
    });

    it("повинен повертати 403 Forbidden, якщо запит робить НЕ власник", async () => {
      const res = await request(app)
        .patch(`/api/heroes/${heroId}`)
        .set("Cookie", [user2Cookie])
        .send({ name: "Hacked Name" });

      expect(res.status).toBe(403);
      expect(res.body.message).toBe("Forbidden");

      const heroInDb = await HeroModel.findById(heroId);
      expect(heroInDb?.name).toBe("Anti-Mage");
    });
  });

  describe("DELETE /:id", () => {
    beforeEach(async () => {
      const newHero = await HeroModel.create({
        ...validHeroData,
        ownerId: user1Id,
      });
      heroId = newHero._id.toString();
    });

    it("повинен повертати 401 для неавторизованих запитів", async () => {
      const res = await request(app).delete(`/api/heroes/${heroId}`);
      expect(res.status).toBe(401);
    });

    it("повинен видаляти героя, якщо запит робить власник", async () => {
      const res = await request(app)
        .delete(`/api/heroes/${heroId}`)
        .set("Cookie", [user1Cookie]);

      expect(res.status).toBe(204);

      const heroInDb = await HeroModel.findById(heroId);
      expect(heroInDb).toBeNull();
    });

    it("повинен повертати 403 Forbidden, якщо видалити намагається НЕ власник", async () => {
      const res = await request(app)
        .delete(`/api/heroes/${heroId}`)
        .set("Cookie", [user2Cookie]);

      expect(res.status).toBe(403);

      const heroInDb = await HeroModel.findById(heroId);
      expect(heroInDb).not.toBeNull();
    });
  });
});
