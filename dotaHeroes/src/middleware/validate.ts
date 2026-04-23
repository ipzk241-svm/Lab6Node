import { Request, Response, NextFunction } from "express";
import { ZodObject } from "zod";

export const validate =
  (schema: ZodObject<any>) =>
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      await schema.parseAsync(req.body);
      next();
    } catch (error) {
      next(error); 
    }
  };
