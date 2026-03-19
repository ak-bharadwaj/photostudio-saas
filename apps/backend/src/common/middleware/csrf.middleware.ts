import { Injectable, NestMiddleware } from "@nestjs/common";
import { Request, Response, NextFunction } from "express";
import * as crypto from "crypto";

@Injectable()
export class CsrfMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    // Set a CSRF cookie on any request if it doesn't exist
    const isProduction = process.env.NODE_ENV === "production";
    const isSecure = req.secure || req.headers["x-forwarded-proto"] === "https";

    if (!req.cookies?.["XSRF-TOKEN"]) {
      const token = crypto.randomBytes(32).toString("hex");
      res.cookie("XSRF-TOKEN", token, {
        httpOnly: false, // Must be readable by frontend if not using header cache
        secure: isSecure || isProduction,
        sameSite: isSecure || isProduction ? "none" : "lax",
      });
      res.setHeader("X-CSRF-Token", token);
      req.cookies = { ...req.cookies, "XSRF-TOKEN": token };
    } else {
      // Even if cookie exists, also expose it as header and ensure it has correct flags for cross-domain
      const existingToken = req.cookies["XSRF-TOKEN"];
      res.setHeader("X-CSRF-Token", existingToken);

      // Refresh the cookie with correct flags if it's a production/secure flow
      if (isSecure || isProduction) {
        res.cookie("XSRF-TOKEN", existingToken, {
          httpOnly: false,
          secure: true,
          sameSite: "none",
        });
      }
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

      console.error(
        `[CSRF] Failure: Header[${csrfToken}] vs Cookie[${cookieToken}] on ${req.method} ${req.originalUrl}`,
      );

      return res.status(403).json({
        message: "Invalid or missing CSRF token. Please refresh the page.",
        error: "Forbidden",
        statusCode: 403,
      });
    }

    next();
  }
}
