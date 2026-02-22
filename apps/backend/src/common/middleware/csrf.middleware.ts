import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import * as crypto from 'crypto';

@Injectable()
export class CsrfMiddleware implements NestMiddleware {
    use(req: Request, res: Response, next: NextFunction) {
        // Skip for safe methods
        if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
            // Set a CSRF cookie if it doesn't exist
            if (!req.cookies?.['XSRF-TOKEN']) {
                const token = crypto.randomBytes(32).toString('hex');
                res.cookie('XSRF-TOKEN', token, {
                    httpOnly: false, // Must be readable by frontend
                    secure: process.env.NODE_ENV === 'production',
                    sameSite: 'lax',
                });
            }
            return next();
        }

        // Verify token for mutations
        const csrfToken = req.headers['x-xsrf-token'] || req.headers['x-csrf-token'];
        const cookieToken = req.cookies?.['XSRF-TOKEN'];

        if (!csrfToken || csrfToken !== cookieToken) {
            // In development, we might want to log this but allow it if not fully set up
            if (process.env.NODE_ENV === 'development') {
                // console.warn('CSRF Token mismatch or missing');
                return next();
            }
            return res.status(403).json({
                message: 'Invalid or missing CSRF token',
                error: 'Forbidden',
                statusCode: 403,
            });
        }

        next();
    }
}
