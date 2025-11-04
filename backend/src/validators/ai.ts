import { body } from 'express-validator';

export const generateValidator = [
  body('type')
    .isIn(['code', 'art', 'world'])
    .withMessage('Invalid generation type'),
  body('prompt')
    .isString()
    .notEmpty()
    .withMessage('Prompt is required'),
  body('projectId')
    .isUUID()
    .withMessage('Invalid project ID'),
  body('context')
    .optional()
    .isObject()
    .withMessage('Context must be an object'),
  body('context.files')
    .optional()
    .isArray()
    .withMessage('Files must be an array'),
  body('context.scene')
    .optional()
    .isObject()
    .withMessage('Scene must be an object'),
  body('context.assets')
    .optional()
    .isArray()
    .withMessage('Assets must be an array'),
];