export class AppError extends Error {
    constructor(
        public message: string,
        public statusCode: number,
        public isOperational = true
    ) {
        super(message);
        Object.setPrototypeOf(this, AppError.prototype);
    }
}

export const createError = (message: string, statusCode: number): AppError => {
    return new AppError(message, statusCode);
};