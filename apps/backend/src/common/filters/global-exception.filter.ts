import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from "@nestjs/common";
import { Request, Response } from "express";
import { Prisma } from "@prisma/client";

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const res = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message: string | string[] = "Internal server error";
    let error = "Internal Server Error";

    // Handle HTTP exceptions
    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse();

      if (typeof exceptionResponse === "string") {
        message = exceptionResponse;
      } else if (
        typeof exceptionResponse === "object" &&
        exceptionResponse !== null
      ) {
        const responseObj = exceptionResponse as any;
        message = responseObj.message || exception.message;
        error = responseObj.error || error;
      }
    }
    // Handle Prisma errors
    else if (exception instanceof Prisma.PrismaClientKnownRequestError) {
      status = HttpStatus.BAD_REQUEST;
      error = "Database Error";

      // Handle specific Prisma error codes
      switch (exception.code) {
        case "P2002":
          message = "A record with this value already exists";
          status = HttpStatus.CONFLICT;
          break;
        case "P2025":
          message = "Record not found";
          status = HttpStatus.NOT_FOUND;
          break;
        case "P2003":
          message = "Foreign key constraint failed";
          break;
        case "P2011":
          message = "Null constraint violation";
          break;
        case "P2012":
          message = "Required field is missing";
          break;
        case "P2014":
          message = "Invalid relation";
          break;
        default:
          message = "Database operation failed";
      }

      this.logger.error(
        `Prisma error ${exception.code}: ${exception.message}`,
        exception.stack,
      );
    }
    // Handle Prisma validation errors
    else if (exception instanceof Prisma.PrismaClientValidationError) {
      status = HttpStatus.BAD_REQUEST;
      error = "Validation Error";
      message = "Invalid data provided";
      this.logger.error(
        `Prisma validation error: ${exception.message}`,
        exception.stack,
      );
    }
    // Handle unknown errors
    else if (exception instanceof Error) {
      message =
        process.env.NODE_ENV === "production"
          ? "An unexpected error occurred"
          : exception.message;

      this.logger.error(
        `Unhandled exception: ${exception.message}`,
        exception.stack,
      );
    }
    // Handle completely unknown exceptions
    else {
      this.logger.error(
        `Unknown exception type: ${typeof exception}`,
        JSON.stringify(exception),
      );
    }

    // Construct error response
    const errorResponse = {
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: request.url,
      method: request.method,
      error,
      message,
    };

    // Log the error in non-production environments with full details
    if (process.env.NODE_ENV !== "production") {
      this.logger.error(
        `${request.method} ${request.url}`,
        JSON.stringify(errorResponse, null, 2),
      );
    }

    res.status(status).json(errorResponse);
  }
}
