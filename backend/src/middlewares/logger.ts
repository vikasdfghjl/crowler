import { Request, Response, NextFunction } from 'express';
import morgan from 'morgan';

// Custom middleware for logging
export const requestLogger = morgan('dev');

// Extended logger middleware for more detailed logging
export const detailedLogger = (req: Request, res: Response, next: NextFunction): void => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  console.log('Request Body:', req.body);
  next();
};