import { body } from 'express-validator';

export const eventValidator = {
  create: [
    body('start').isISO8601().withMessage('Start must be a valid ISO 8601 date'),
    body('end').isISO8601().withMessage('End must be a valid ISO 8601 date'),
    body('day').matches(/^\d{4}-\d{2}-\d{2}$/).withMessage('Day must be in YYYY-MM-DD format'),
    body('project').notEmpty().withMessage('Project is required'),
    body('activity.id').optional(),
    body('activity.label').notEmpty().withMessage('Activity label is required'),
    body('notes').optional().isString(),
    body('artiaLaunched').optional().isBoolean(),
    body('workplace').optional().isString()
  ],

  update: [
    body('start').optional().isISO8601().withMessage('Start must be a valid ISO 8601 date'),
    body('end').optional().isISO8601().withMessage('End must be a valid ISO 8601 date'),
    body('day').optional().matches(/^\d{4}-\d{2}-\d{2}$/).withMessage('Day must be in YYYY-MM-DD format'),
    body('project').optional().notEmpty().withMessage('Project cannot be empty'),
    body('activity.id').optional(),
    body('activity.label').optional().notEmpty().withMessage('Activity label cannot be empty'),
    body('notes').optional().isString(),
    body('artiaLaunched').optional().isBoolean(),
    body('workplace').optional().isString()
  ],

  move: [
    body('newStart').isISO8601().withMessage('New start must be a valid ISO 8601 date'),
    body('newEnd').isISO8601().withMessage('New end must be a valid ISO 8601 date'),
    body('newDay').matches(/^\d{4}-\d{2}-\d{2}$/).withMessage('New day must be in YYYY-MM-DD format')
  ],

  importLegacy: [
    body('mode')
      .optional()
      .isIn(['merge', 'replace'])
      .withMessage('Mode must be merge or replace')
  ]
};
