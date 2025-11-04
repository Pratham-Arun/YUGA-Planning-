import { body } from 'express-validator';

export const projectValidator = [
  body('name')
    .isString()
    .notEmpty()
    .trim()
    .withMessage('Project name is required'),
  body('description')
    .optional()
    .isString()
    .trim(),
  body('metadata')
    .optional()
    .isObject()
    .withMessage('Metadata must be an object'),
];