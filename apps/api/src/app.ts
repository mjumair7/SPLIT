import cors from "cors";
import express from "express";
import helmet from "helmet";
import morgan from "morgan";
import { requireAuth } from "./middleware/auth";
import { errorHandler, notFound } from "./middleware/errorHandler";
import { analyticsRouter } from "./modules/analytics/routes";
import { authRouter } from "./modules/auth/routes";
import { exercisesRouter } from "./modules/exercises/routes";
import { splitsRouter } from "./modules/splits/routes";
import { workoutsRouter } from "./modules/workouts/routes";

export const app = express();

app.use(helmet());
app.use(cors());
app.use(express.json({ limit: "1mb" }));
app.use(morgan("dev"));

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.use("/api/auth", authRouter);

app.get("/api/me", requireAuth, (req, res) => {
  res.json({ user: req.auth });
});

app.use("/api/exercises", requireAuth, exercisesRouter);
app.use("/api/splits", requireAuth, splitsRouter);
app.use("/api/workouts", requireAuth, workoutsRouter);
app.use("/api/analytics", requireAuth, analyticsRouter);

app.use(notFound);
app.use(errorHandler);
