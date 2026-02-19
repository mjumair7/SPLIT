import { RecordMetric } from "@prisma/client";
import { Router } from "express";
import { z } from "zod";
import { prisma } from "../../config/prisma";
import { asyncHandler } from "../../utils/asyncHandler";
import { ApiError } from "../../utils/apiError";

const paramsSchema = z.object({
  exerciseId: z.string().cuid()
});

const progressQuerySchema = z.object({
  days: z.coerce.number().int().min(7).max(365).default(90)
});

function estimateOneRepMax(weightKg: number, reps: number) {
  return weightKg * (1 + reps / 30);
}

export const analyticsRouter = Router();

analyticsRouter.get(
  "/exercise/:exerciseId/progress",
  asyncHandler(async (req, res) => {
    const { exerciseId } = paramsSchema.parse(req.params);
    const { days } = progressQuerySchema.parse(req.query);
    const userId = req.auth!.userId;

    const exercise = await prisma.exercise.findUnique({
      where: { id: exerciseId }
    });

    if (!exercise) {
      throw new ApiError(404, "Exercise not found");
    }

    const since = new Date();
    since.setDate(since.getDate() - days);

    const sets = await prisma.workoutSet.findMany({
      where: {
        exerciseId,
        session: {
          userId,
          performedAt: {
            gte: since
          }
        }
      },
      orderBy: {
        createdAt: "asc"
      },
      include: {
        session: {
          select: {
            performedAt: true
          }
        }
      }
    });

    const byDate = new Map<
      string,
      {
        date: string;
        bestWeight: number;
        bestEstimatedOneRepMax: number;
        totalReps: number;
        totalVolume: number;
      }
    >();

    for (const set of sets) {
      const date = set.session.performedAt.toISOString().slice(0, 10);
      const oneRepMax = estimateOneRepMax(set.weightKg, set.reps);
      const row = byDate.get(date) ?? {
        date,
        bestWeight: 0,
        bestEstimatedOneRepMax: 0,
        totalReps: 0,
        totalVolume: 0
      };

      row.bestWeight = Math.max(row.bestWeight, set.weightKg);
      row.bestEstimatedOneRepMax = Math.max(row.bestEstimatedOneRepMax, oneRepMax);
      row.totalReps += set.reps;
      row.totalVolume += set.reps * set.weightKg;

      byDate.set(date, row);
    }

    const records = await prisma.personalRecord.findMany({
      where: {
        userId,
        exerciseId,
        metric: {
          in: [RecordMetric.MAX_WEIGHT, RecordMetric.ESTIMATED_ONE_REP_MAX]
        }
      }
    });

    const maxWeightRecord = records.find((record) => record.metric === RecordMetric.MAX_WEIGHT);
    const maxOneRepRecord = records.find(
      (record) => record.metric === RecordMetric.ESTIMATED_ONE_REP_MAX
    );

    res.json({
      exercise,
      points: [...byDate.values()].sort((a, b) => a.date.localeCompare(b.date)),
      records: {
        maxWeightKg: maxWeightRecord?.value ?? null,
        estimatedOneRepMaxKg: maxOneRepRecord?.value ?? null
      }
    });
  })
);

analyticsRouter.get(
  "/summary",
  asyncHandler(async (req, res) => {
    const userId = req.auth!.userId;
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const [sessionsThisMonth, setsThisMonth, prsThisMonth, lastSession] = await Promise.all([
      prisma.workoutSession.count({
        where: {
          userId,
          performedAt: {
            gte: monthStart
          }
        }
      }),
      prisma.workoutSet.findMany({
        where: {
          session: {
            userId,
            performedAt: {
              gte: monthStart
            }
          }
        },
        select: {
          reps: true,
          weightKg: true
        }
      }),
      prisma.personalRecord.count({
        where: {
          userId,
          achievedAt: {
            gte: monthStart
          }
        }
      }),
      prisma.workoutSession.findFirst({
        where: { userId },
        orderBy: { performedAt: "desc" },
        select: { performedAt: true }
      })
    ]);

    const totalVolumeKg = setsThisMonth.reduce((sum, set) => sum + set.reps * set.weightKg, 0);
    const totalReps = setsThisMonth.reduce((sum, set) => sum + set.reps, 0);

    res.json({
      sessionsThisMonth,
      totalVolumeKg,
      totalReps,
      prsThisMonth,
      lastSessionAt: lastSession?.performedAt ?? null
    });
  })
);
