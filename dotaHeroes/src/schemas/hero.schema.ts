import { z } from "zod";

const PrimaryAttributeEnum = z.enum([
  "Strength",
  "Agility",
  "Intelligence",
  "Universal",
]);
const AttackTypeEnum = z.enum(["Melee", "Ranged"]);

export const createHeroSchema = z.object({
  name: z.string().min(1, "Hero name cannot be empty").max(100),
  description: z.string().max(500).optional(),

  primaryAttribute: PrimaryAttributeEnum,
  attackType: AttackTypeEnum,

  imageUrl: z.string().url("Must be a valid URL").optional(),
  complexity: z
    .number()
    .int()
    .min(1)
    .max(3, "Complexity must be between 1 and 3"),
  roles: z.array(z.string()).min(1, "Hero must have at least one role"),
});

export const updateHeroSchema = createHeroSchema.partial();

export type CreateHeroInput = z.infer<typeof createHeroSchema>;

export type HeroEntity = CreateHeroInput & {
  id: string;
  createdAt: Date;
  updatedAt: Date;
};
