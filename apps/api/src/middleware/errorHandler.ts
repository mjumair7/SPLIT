import type { NextFunction, Request, Response } from "express";
import { ZodError } from "zod";
import { ApiError } from "../utils/apiError";

export function notFound(_req: Request, res: Response) {
  return res.status(404).json({
    message: "Route not found"
  });
}

export function errorHandler(error: unknown, _req: Request, res: Response, _next: NextFunction) {
  if (error instanceof ApiError) {
    return res.status(error.statusCode).json({ message: error.message });
  }

  if (error instanceof ZodError) {
    return res.status(400).json({
      message: "Validation failed",
      issues: error.flatten().fieldErrors
    });
  }

  console.error(error);

  return res.status(500).json({
    message: "Internal server error"
  });
}
