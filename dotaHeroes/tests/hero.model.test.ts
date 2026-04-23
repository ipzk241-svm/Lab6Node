import { HeroModel } from "../src/models/hero.model";
import { connectTestDB, closeTestDB, clearTestDB } from "./setup";
import {
  describe,
  it,
  expect,
  beforeAll,
  afterAll,
  afterEach,
} from "@jest/globals";

beforeAll(async () => await connectTestDB());
afterEach(async () => await clearTestDB());
afterAll(async () => await closeTestDB());

describe("Hero Model Unit Tests", () => {
  const validHeroData = {
    name: "Axe",
    primaryAttribute: "Strength",
    attackType: "Melee",
    roles: ["Initiator", "Durable"],
  };

  it("should create a hero with default values and timestamps", async () => {
    const hero = await HeroModel.create(validHeroData);

    expect(hero.name).toBe(validHeroData.name);
    expect(hero.complexity).toBe(1);
    expect(hero.createdAt).toBeDefined();
    expect(hero.updatedAt).toBeDefined();
  });

  it('should compute the virtual property "powerProfile"', async () => {
    const hero = await HeroModel.create(validHeroData);
    expect(hero.powerProfile).toBe("Strength / Melee");
  });

  it("should fail validation if required fields are missing", async () => {
    const heroWithoutName = new HeroModel({ attackType: "Melee" });
    let error: any;
    try {
      await heroWithoutName.validate();
    } catch (e) {
      error = e;
    }
    expect(error).toBeDefined();
    expect(error.errors.name).toBeDefined();
  });

  it("should fail validation if roles array is empty (custom validator)", async () => {
    const heroWithEmptyRoles = new HeroModel({ ...validHeroData, roles: [] });
    let error: any;
    try {
      await heroWithEmptyRoles.validate();
    } catch (e) {
      error = e;
    }
    expect(error).toBeDefined();
    expect(error.errors.roles.message).toBe(
      "Герой повинен мати хоча б одну роль",
    );
  });
});
