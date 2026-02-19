import { Router } from "express";
import { z } from "zod";
import { prisma } from "../../config/prisma";
import { asyncHandler } from "../../utils/asyncHandler";

const querySchema = z.object({
  muscle: z.string().min(2).optional()
});

export const exercisesRouter = Router();

exercisesRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    const query = querySchema.parse(req.query);

    const exercises = await prisma.exercise.findMany({
      where: query.muscle
        ? {
            primaryMuscle: {
              contains: query.muscle,
              mode: "insensitive"
            }
          }
        : undefined,
      orderBy: [{ primaryMuscle: "asc" }, { name: "asc" }]
    });

    res.json({ exercises });
  })
);
