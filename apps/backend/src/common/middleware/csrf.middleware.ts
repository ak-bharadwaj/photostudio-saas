import { Injectable, NestMiddleware } from "@nestjs/common";
import { Request, Response, NextFunction } from "express";
import * as crypto from "crypto";

@Injectable()
export class CsrfMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    // Set a CSRF cookie on any request if it doesn't exist
    if (!req.cookies?.["XSRF-TOKEN"]) {
      const token = crypto.randomBytes(32).toString("hex");
      res.cookie("XSRF-TOKEN", token, {
        httpOnly: false, // Must be readable by frontend
        secure: process.env.NODE_ENV === "production",
        sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
      });
      res.setHeader("X-CSRF-Token", token);
      // For the current request logic, we inject it into cookies so verify works if it's a mutation
      req.cookies = { ...req.cookies, "XSRF-TOKEN": token };
    } else {
      // Even if cookie exists, also expose it as header for cross-domain reading
      res.setHeader("X-CSRF-Token", req.cookies["XSRF-TOKEN"]);
    }

    // Skip verification for safe methods
    if (["GET", "HEAD", "OPTIONS"].includes(req.method)) {
      return next();
    }

    // Verify token for mutations
    const csrfToken =
      req.headers["x-xsrf-token"] || req.headers["x-csrf-token"];
    const cookieToken = req.cookies?.["XSRF-TOKEN"];

    if (!csrfToken || csrfToken !== cookieToken) {
      // In development, allow it
      if (
        process.env.NODE_ENV === "development" ||
        process.env.NODE_ENV === "test"
      ) {
        return next();
      }
      
      console.error(`[CSRF] Failure: Header[${csrfToken}] vs Cookie[${cookieToken}] on ${req.method} ${req.originalUrl}`);
      
      return res.status(403).json({
        message: "Invalid or missing CSRF token. Please refresh the page.",
        error: "Forbidden",
        statusCode: 403,
      });
    }

    next();
  }
}
