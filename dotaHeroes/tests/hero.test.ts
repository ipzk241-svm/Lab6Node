import request from "supertest";
import mongoose from "mongoose";
import app from "../src/app";
import { HeroModel } from "../src/models/hero.model";
import { connectTestDB, closeTestDB, clearTestDB } from "./setup";
import {
  describe,
  it,
  expect,
  beforeAll,
  afterAll,
  afterEach,
  jest,
} from "@jest/globals";
import { heroStorage } from "../src/storage/hero";

beforeAll(async () => await connectTestDB());
afterEach(async () => await clearTestDB());
afterAll(async () => await closeTestDB());

describe("Hero API Integration Tests (MongoDB)", () => {
  const validHero = {
    name: "Axe",
    primaryAttribute: "Strength",
    attackType: "Melee",
    complexity: 1,
    roles: ["Initiator", "Durable"],
  };

  const seedHero = async (data = validHero) => {
    return await HeroModel.create(data);
  };

  describe("POST /api/heroes", () => {
    it("should create a new hero", async () => {
      const res = await request(app)
        .post("/api/heroes")
        .send(validHero)
        .expect(201);
      expect(res.body).toHaveProperty("_id");
      expect(res.body.name).toBe(validHero.name);
      expect(res.body.powerProfile).toBeDefined();
    });

    it("should return 400 when creating with invalid data", async () => {
      const invalidHero = { ...validHero, complexity: 5 };
      const res = await request(app)
        .post("/api/heroes")
        .send(invalidHero)
        .expect(400);
      expect(res.body).toHaveProperty("errors");
    });
  });

  describe("GET /api/heroes", () => {
    it("should get all heroes with pagination meta-data", async () => {
      await seedHero();
      const res = await request(app).get("/api/heroes").expect(200);

      expect(res.body).toHaveProperty("data");
      expect(res.body).toHaveProperty("pagination");
      expect(Array.isArray(res.body.data)).toBeTruthy();
      expect(res.body.data.length).toBe(1);
      expect(res.body.pagination.total).toBe(1);
    });

    it("should filter heroes by query parameters", async () => {
      await seedHero();
      await seedHero({
        ...validHero,
        name: "Sniper",
        primaryAttribute: "Agility",
        attackType: "Ranged",
      });

      const res = await request(app)
        .get("/api/heroes?attackType=Ranged")
        .expect(200);
      expect(res.body.data.length).toBe(1);
      expect(res.body.data[0].name).toBe("Sniper");
    });

    it("should return sorted and paginated heroes", async () => {
      await seedHero({ ...validHero, name: "Zeta" });
      await seedHero({ ...validHero, name: "Alpha" });

      const res = await request(app)
        .get("/api/heroes?sort=name&limit=1")
        .expect(200);
      expect(res.body.data.length).toBe(1);
      expect(res.body.data[0].name).toBe("Alpha");
    });
  });

  describe("GET /api/heroes/melee", () => {
    it("should get only melee heroes", async () => {
      await seedHero();
      await seedHero({ ...validHero, name: "Sniper", attackType: "Ranged" });

      const res = await request(app).get("/api/heroes/melee").expect(200);
      expect(res.body.length).toBe(1);
      expect(res.body[0].attackType).toBe("Melee");
    });
  });

  describe("GET /api/heroes/:id", () => {
    it("should get a hero by valid id", async () => {
      const hero = await seedHero();
      const res = await request(app).get(`/api/heroes/${hero._id}`).expect(200);
      expect(res.body.name).toBe(validHero.name);
    });

    it("should return 404 for non-existent valid ObjectId", async () => {
      const fakeId = new mongoose.Types.ObjectId();
      await request(app).get(`/api/heroes/${fakeId}`).expect(404);
    });

    it("should return 400 for invalid ObjectId format (CastError)", async () => {
      const res = await request(app)
        .get("/api/heroes/invalid-id-123")
        .expect(400);
      expect(res.body.message).toContain("Невалідний формат ID");
    });
  });

  describe("PATCH /api/heroes/:id", () => {
    it("should update a hero", async () => {
      const hero = await seedHero();
      const res = await request(app)
        .patch(`/api/heroes/${hero._id}`)
        .send({ complexity: 2 })
        .expect(200);
      expect(res.body.complexity).toBe(2);
    });
  });

  describe("DELETE /api/heroes/:id", () => {
    it("should delete a hero", async () => {
      const hero = await seedHero();
      await request(app).delete(`/api/heroes/${hero._id}`).expect(204);

      const check = await HeroModel.findById(hero._id);
      expect(check).toBeNull();
    });
  });
  describe("Edge Cases and Error Handling (Coverage)", () => {
    const fakeId = "609d2a35f113c638f4a15998";

    beforeAll(() => {
      jest.spyOn(console, "error").mockImplementation(() => {});
    });

    afterAll(() => {
      jest.restoreAllMocks();
    });

    it("should return 404 when updating non-existent hero", async () => {
      await request(app)
        .patch(`/api/heroes/${fakeId}`)
        .send({ complexity: 2 })
        .expect(404);
    });

    it("should return 404 when deleting non-existent hero", async () => {
      await request(app).delete(`/api/heroes/${fakeId}`).expect(404);
    });

    it("should handle MongoDB Duplicate Key Error (409)", async () => {
      jest.spyOn(heroStorage, "create").mockRejectedValueOnce({
        name: "MongoServerError",
        code: 11000,
        keyValue: { name: "Axe" },
      });

      const res = await request(app)
        .post("/api/heroes")
        .send(validHero)
        .expect(409);
      expect(res.body.message).toContain("Конфлікт даних");
    });

    it("should handle Mongoose ValidationError (400)", async () => {
      const validationError = new mongoose.Error.ValidationError();
      validationError.errors = {
        roles: new mongoose.Error.ValidatorError({
          message: "Test error",
          path: "roles",
        }),
      };

      jest.spyOn(heroStorage, "update").mockRejectedValueOnce(validationError);
      const res = await request(app)
        .patch(`/api/heroes/${fakeId}`)
        .send({ complexity: 2 })
        .expect(400);
      expect(res.body.message).toContain("Помилка валідації");
    });

    it("should handle generic Server Error (500) in GET /", async () => {
      jest
        .spyOn(heroStorage, "getAll")
        .mockRejectedValueOnce(new Error("DB Crash"));
      const res = await request(app).get("/api/heroes").expect(500);
      expect(res.body.message).toBe("Internal Server Error");
    });

    it("should handle generic Server Error (500) in GET /melee", async () => {
      jest
        .spyOn(heroStorage, "getAll")
        .mockRejectedValueOnce(new Error("DB Crash"));
      await request(app).get("/api/heroes/melee").expect(500);
    });

    it("should handle generic Server Error (500) in DELETE", async () => {
      jest
        .spyOn(heroStorage, "remove")
        .mockRejectedValueOnce(new Error("DB Crash"));
      await request(app).delete(`/api/heroes/${fakeId}`).expect(500);
    });

    it("should filter by primaryAttribute to cover specific lines in storage", async () => {
      await request(app)
        .get("/api/heroes?primaryAttribute=Strength")
        .expect(200);
    });
  });
});
