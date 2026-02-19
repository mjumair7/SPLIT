import { DayOfWeek } from "@prisma/client";
import { Router } from "express";
import { z } from "zod";
import { prisma } from "../../config/prisma";
import { asyncHandler } from "../../utils/asyncHandler";
import { ApiError } from "../../utils/apiError";

const splitExerciseSchema = z
  .object({
    exerciseId: z.string().cuid(),
    targetSets: z.number().int().min(1).max(12),
    targetRepMin: z.number().int().min(1).max(50),
    targetRepMax: z.number().int().min(1).max(50),
    position: z.number().int().min(1).max(30)
  })
  .refine((input) => input.targetRepMin <= input.targetRepMax, {
    message: "targetRepMin must be less than or equal to targetRepMax",
    path: ["targetRepMin"]
  });

const splitDaySchema = z
  .object({
    dayOfWeek: z.nativeEnum(DayOfWeek),
    focus: z.string().max(120).optional(),
    exercises: z.array(splitExerciseSchema).min(1)
  })
  .superRefine((day, ctx) => {
    const positions = day.exercises.map((item) => item.position);
    if (new Set(positions).size !== positions.length) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Exercise positions must be unique within a day",
        path: ["exercises"]
      });
    }
  });

const createSplitSchema = z
  .object({
    name: z.string().min(2).max(80),
    goal: z.string().max(160).optional(),
    days: z.array(splitDaySchema).min(1).max(7)
  })
  .superRefine((split, ctx) => {
    const dayValues = split.days.map((day) => day.dayOfWeek);
    if (new Set(dayValues).size !== dayValues.length) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "A split cannot contain the same day twice",
        path: ["days"]
      });
    }
  });

export const splitsRouter = Router();

splitsRouter.post(
  "/",
  asyncHandler(async (req, res) => {
    const payload = createSplitSchema.parse(req.body);
    const userId = req.auth!.userId;

    const exerciseIds = new Set(
      payload.days.flatMap((day) => day.exercises.map((exercise) => exercise.exerciseId))
    );

    const existingExercises = await prisma.exercise.count({
      where: {
        id: {
          in: [...exerciseIds]
        }
      }
    });

    if (existingExercises !== exerciseIds.size) {
      throw new ApiError(400, "One or more exercise IDs do not exist");
    }

    const split = await prisma.$transaction(async (tx) => {
      const createdSplit = await tx.workoutSplit.create({
        data: {
          userId,
          name: payload.name,
          goal: payload.goal
        }
      });

      for (const day of payload.days) {
        const createdDay = await tx.splitDay.create({
          data: {
            splitId: createdSplit.id,
            dayOfWeek: day.dayOfWeek,
            focus: day.focus
          }
        });

        await tx.splitDayExercise.createMany({
          data: day.exercises.map((exercise) => ({
            splitDayId: createdDay.id,
            exerciseId: exercise.exerciseId,
            targetSets: exercise.targetSets,
            targetRepMin: exercise.targetRepMin,
            targetRepMax: exercise.targetRepMax,
            position: exercise.position
          }))
        });
      }

      return tx.workoutSplit.findUniqueOrThrow({
        where: { id: createdSplit.id },
        include: {
          days: {
            orderBy: { dayOfWeek: "asc" },
            include: {
              exercises: {
                orderBy: { position: "asc" },
                include: {
                  exercise: true
                }
              }
            }
          }
        }
      });
    });

    res.status(201).json({ split });
  })
);

splitsRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    const userId = req.auth!.userId;

    const splits = await prisma.workoutSplit.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      include: {
        days: {
          orderBy: { dayOfWeek: "asc" },
          include: {
            exercises: {
              orderBy: { position: "asc" },
              include: {
                exercise: true
              }
            }
          }
        }
      }
    });

    res.json({ splits });
  })
);

splitsRouter.get(
  "/:splitId",
  asyncHandler(async (req, res) => {
    const userId = req.auth!.userId;
    const paramsSchema = z.object({ splitId: z.string().cuid() });
    const { splitId } = paramsSchema.parse(req.params);

    const split = await prisma.workoutSplit.findFirst({
      where: {
        id: splitId,
        userId
      },
      include: {
        days: {
          orderBy: { dayOfWeek: "asc" },
          include: {
            exercises: {
              orderBy: { position: "asc" },
              include: {
                exercise: true
              }
            }
          }
        }
      }
    });

    if (!split) {
      throw new ApiError(404, "Split not found");
    }

    res.json({ split });
  })
);

splitsRouter.delete(
  "/:splitId",
  asyncHandler(async (req, res) => {
    const userId = req.auth!.userId;
    const paramsSchema = z.object({ splitId: z.string().cuid() });
    const { splitId } = paramsSchema.parse(req.params);

    const split = await prisma.workoutSplit.findFirst({
      where: {
        id: splitId,
        userId
      },
      select: { id: true }
    });

    if (!split) {
      throw new ApiError(404, "Split not found");
    }

    await prisma.workoutSplit.delete({ where: { id: splitId } });

    res.status(204).send();
  })
);
