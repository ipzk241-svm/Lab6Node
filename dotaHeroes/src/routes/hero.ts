import { Router, Request, Response, NextFunction } from "express";
import { heroStorage } from "../storage/hero";
import { createHeroSchema, updateHeroSchema } from "../schemas/hero.schema";
import { validate } from "../middleware/validate";
import { requireAuth, AuthRequest } from "../middleware/requireAuth";

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
  requireAuth, 
  validate(createHeroSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const authReq = req as AuthRequest;

      const heroData = {
        ...req.body,
        ownerId: authReq.userId,
      };

      const newHero = await heroStorage.create(heroData);
      res.status(201).json(newHero);
    } catch (error) {
      next(error);
    }
  },
);

router.patch(
  "/:id",
  requireAuth, 
  validate(updateHeroSchema),
  async (req: Request<{ id: string }>, res: Response, next: NextFunction) => {
    try {
      const authReq = req as AuthRequest;

      const hero = await heroStorage.getById(req.params.id);
      if (!hero) {
        res.status(404).json({ message: "Hero not found" });
        return;
      }

      if (hero.ownerId?.toString() !== authReq.userId) {
        res.status(403).json({ message: "Forbidden" });
        return;
      }

      const updatedHero = await heroStorage.update(req.params.id, req.body);
      res.status(200).json(updatedHero);
    } catch (error) {
      next(error);
    }
  },
);

router.delete(
  "/:id",
  requireAuth, 
  async (req: Request<{ id: string }>, res: Response, next: NextFunction) => {
    try {
      const authReq = req as AuthRequest;

      const hero = await heroStorage.getById(req.params.id);
      if (!hero) {
        res.status(404).json({ message: "Hero not found" });
        return;
      }

      if (hero.ownerId?.toString() !== authReq.userId) {
        res.status(403).json({ message: "Forbidden" });
        return;
      }

      await heroStorage.remove(req.params.id);
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  },
);

export default router;
