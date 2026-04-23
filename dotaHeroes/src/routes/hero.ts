import { Router, Request, Response, NextFunction } from "express";
import { heroStorage } from "../storage/hero";
import { createHeroSchema, updateHeroSchema } from "../schemas/hero.schema";
import { validate } from "../middleware/validate";

const router = Router();

router.get(
  "/melee",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await heroStorage.getAll({
        attackType: "Melee",
        limit: 100,
      });
      res.status(200).json(result.data);
    } catch (error) {
      next(error);
    }
  },
);

router.get("/", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await heroStorage.getAll(req.query as any);
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
});

router.get(
  "/:id",
  async (req: Request<{ id: string }>, res: Response, next: NextFunction) => {
    try {
      const hero = await heroStorage.getById(req.params.id);
      if (!hero) {
        res.status(404).json({ message: "Hero not found" });
        return;
      }
      res.status(200).json(hero);
    } catch (error) {
      next(error);
    }
  },
);

router.post(
  "/",
  validate(createHeroSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const newHero = await heroStorage.create(req.body);
      res.status(201).json(newHero);
    } catch (error) {
      next(error);
    }
  },
);

router.patch(
  "/:id",
  validate(updateHeroSchema),
  async (req: Request<{ id: string }>, res: Response, next: NextFunction) => {
    try {
      const updatedHero = await heroStorage.update(req.params.id, req.body);
      if (!updatedHero) {
        res.status(404).json({ message: "Hero not found" });
        return;
      }
      res.status(200).json(updatedHero);
    } catch (error) {
      next(error);
    }
  },
);

router.delete(
  "/:id",
  async (req: Request<{ id: string }>, res: Response, next: NextFunction) => {
    try {
      const isDeleted = await heroStorage.remove(req.params.id);
      if (!isDeleted) {
        res.status(404).json({ message: "Hero not found" });
        return;
      }
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  },
);

export default router;
