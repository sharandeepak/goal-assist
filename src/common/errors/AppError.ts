export class AppError extends Error {
  public readonly errorCode: string;
  public readonly errorMessage: string;
  public readonly httpStatusCode: number;

  constructor(errorCode: string, errorMessage: string, httpStatusCode: number = 500) {
    super(errorMessage);
    this.errorCode = errorCode;
    this.errorMessage = errorMessage;
    this.httpStatusCode = httpStatusCode;
    Object.setPrototypeOf(this, AppError.prototype);
  }

  static badRequest(errorCode: string, message: string): AppError {
    return new AppError(errorCode, message, 400);
  }

  static notFound(errorCode: string, message: string): AppError {
    return new AppError(errorCode, message, 404);
  }

  static conflict(errorCode: string, message: string): AppError {
    return new AppError(errorCode, message, 409);
  }

  static internal(errorCode: string, message: string): AppError {
    return new AppError(errorCode, message, 500);
  }
}
