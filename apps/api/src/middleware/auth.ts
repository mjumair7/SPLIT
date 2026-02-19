import type { NextFunction, Request, Response } from "express";
import { ApiError } from "../utils/apiError";
import { verifyAuthToken } from "../utils/jwt";

export function requireAuth(req: Request, _res: Response, next: NextFunction) {
  const header = req.headers.authorization;

  if (!header?.startsWith("Bearer ")) {
    return next(new ApiError(401, "Missing or invalid Authorization header"));
  }

  const token = header.slice(7);

  try {
    req.auth = verifyAuthToken(token);
    return next();
  } catch {
    return next(new ApiError(401, "Invalid or expired token"));
  }
}
