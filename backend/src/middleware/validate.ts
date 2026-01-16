import type { Request, Response, NextFunction } from 'express';
import { ZodError, type ZodSchema } from 'zod';
import { ValidationError } from '../utils/apiError.ts';

/**
 * Validation middleware factory
 * Validates request body, query, or params against a Zod schema
 */
export const validate = (schema: ZodSchema, source: 'body' | 'query' | 'params' = 'body') => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      const dataToValidate = req[source];
      const validated = schema.parse(dataToValidate);
      
      // Replace request data with validated (and transformed) data
      req[source] = validated;
      
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const details = error.issues.map((err: any) => ({
          path: err.path.join('.'),
          message: err.message,
        }));
        
        next(new ValidationError('Validation failed', details));
      } else {
        next(error);
      }
    }
  };
};
