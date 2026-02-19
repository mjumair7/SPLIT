import { RecordMetric } from "@prisma/client";
import { Router } from "express";
import { z } from "zod";
import { prisma } from "../../config/prisma";
import { asyncHandler } from "../../utils/asyncHandler";
import { ApiError } from "../../utils/apiError";

const setSchema = z.object({
  setNumber: z.number().int().min(1).max(20),
  reps: z.number().int().min(1).max(100),
  weightKg: z.number().min(0).max(1000),
  rpe: z.number().min(1).max(10).optional(),
  notes: z.string().max(200).optional()
});

const exerciseLogSchema = z
  .object({
    exerciseId: z.string().cuid(),
    sets: z.array(setSchema).min(1)
  })
  .superRefine((exercise, ctx) => {
    const setNumbers = exercise.sets.map((entry) => entry.setNumber).sort((a, b) => a - b);

    for (let i = 0; i < setNumbers.length; i += 1) {
      if (setNumbers[i] !== i + 1) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Set numbers must be sequential starting at 1",
          path: ["sets"]
        });
        break;
      }
    }
  });

const createSessionSchema = z
  .object({
    splitDayId: z.string().cuid().optional(),
    notes: z.string().max(500).optional(),
    performedAt: z.coerce.date().optional(),
    exercises: z.array(exerciseLogSchema).min(1)
  })
  .superRefine((session, ctx) => {
    const exerciseIds = session.exercises.map((item) => item.exerciseId);
    if (new Set(exerciseIds).size !== exerciseIds.length) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Each exercise can only appear once per session",
        path: ["exercises"]
      });
    }
  });

const listQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(20)
});

function estimateOneRepMax(weightKg: number, reps: number) {
  return weightKg * (1 + reps / 30);
}

export const workoutsRouter = Router();

workoutsRouter.post(
  "/sessions",
  asyncHandler(async (req, res) => {
    const payload = createSessionSchema.parse(req.body);
    const userId = req.auth!.userId;

    const exerciseIds = [...new Set(payload.exercises.map((exercise) => exercise.exerciseId))];

    const exercisesCount = await prisma.exercise.count({
      where: {
        id: {
          in: exerciseIds
        }
      }
    });

    if (exerciseIds.length !== exercisesCount) {
      throw new ApiError(400, "One or more exercise IDs do not exist");
    }

    if (payload.splitDayId) {
      const splitDay = await prisma.splitDay.findFirst({
        where: {
          id: payload.splitDayId,
          split: {
            userId
          }
        },
        include: {
          exercises: {
            select: {
              exerciseId: true
            }
          }
        }
      });

      if (!splitDay) {
        throw new ApiError(404, "Split day not found for current user");
      }

      const splitDayExerciseIds = new Set(splitDay.exercises.map((entry) => entry.exerciseId));

      for (const exerciseId of exerciseIds) {
        if (!splitDayExerciseIds.has(exerciseId)) {
          throw new ApiError(400, "Logged exercise is not part of the selected split day");
        }
      }
    }

    const session = await prisma.$transaction(async (tx) => {
      const createdSession = await tx.workoutSession.create({
        data: {
          userId,
          splitDayId: payload.splitDayId,
          notes: payload.notes,
          performedAt: payload.performedAt
        }
      });

      const setRows = payload.exercises.flatMap((exercise) =>
        exercise.sets.map((set) => ({
          sessionId: createdSession.id,
          exerciseId: exercise.exerciseId,
          setNumber: set.setNumber,
          reps: set.reps,
          weightKg: set.weightKg,
          rpe: set.rpe,
          notes: set.notes
        }))
      );

      await tx.workoutSet.createMany({
        data: setRows
      });

      for (const exercise of payload.exercises) {
        const bestWeight = Math.max(...exercise.sets.map((set) => set.weightKg));
        const bestEstimatedOneRepMax = Math.max(
          ...exercise.sets.map((set) => estimateOneRepMax(set.weightKg, set.reps))
        );

        const nextRecords = [
          { metric: RecordMetric.MAX_WEIGHT, value: bestWeight },
          { metric: RecordMetric.ESTIMATED_ONE_REP_MAX, value: bestEstimatedOneRepMax }
        ];

        for (const nextRecord of nextRecords) {
          const existingRecord = await tx.personalRecord.findUnique({
            where: {
              userId_exerciseId_metric: {
                userId,
                exerciseId: exercise.exerciseId,
                metric: nextRecord.metric
              }
            }
          });

          if (!existingRecord) {
            await tx.personalRecord.create({
              data: {
                userId,
                exerciseId: exercise.exerciseId,
                sessionId: createdSession.id,
                metric: nextRecord.metric,
                value: nextRecord.value,
                achievedAt: payload.performedAt ?? new Date()
              }
            });
            continue;
          }

          if (nextRecord.value > existingRecord.value) {
            await tx.personalRecord.update({
              where: {
                id: existingRecord.id
              },
              data: {
                value: nextRecord.value,
                sessionId: createdSession.id,
                achievedAt: payload.performedAt ?? new Date()
              }
            });
          }
        }
      }

      return tx.workoutSession.findUniqueOrThrow({
        where: {
          id: createdSession.id
        },
        include: {
          sets: {
            orderBy: [{ exerciseId: "asc" }, { setNumber: "asc" }],
            include: {
              exercise: true
            }
          },
          splitDay: {
            include: {
              split: true
            }
          }
        }
      });
    });

    res.status(201).json({ session });
  })
);

workoutsRouter.get(
  "/sessions",
  asyncHandler(async (req, res) => {
    const userId = req.auth!.userId;
    const { limit } = listQuerySchema.parse(req.query);

    const sessions = await prisma.workoutSession.findMany({
      where: { userId },
      orderBy: { performedAt: "desc" },
      take: limit,
      include: {
        splitDay: {
          include: {
            split: {
              select: {
                id: true,
                name: true
              }
            }
          }
        },
        sets: {
          orderBy: [{ exerciseId: "asc" }, { setNumber: "asc" }],
          include: {
            exercise: {
              select: {
                id: true,
                name: true,
                primaryMuscle: true
              }
            }
          }
        }
      }
    });

    res.json({ sessions });
  })
);
