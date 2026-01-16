import { Router } from 'express';
import { asyncHandler } from '../middleware/asyncHandler';
import { validate } from '../middleware/validate';
import { authenticate } from '../middleware/auth';
import {
  generatePlanSchema,
  getPlanSchema,
  updateTaskStatusSchema,
  listPlansSchema,
  getProgressSchema,
  deletePlanSchema,
} from '../schemas/planner.schema';
import * as plannerController from '../controllers/planner.controller';

const router = Router();

// All routes require authentication
router.use(authenticate);

// POST /api/planner/generate - Generate AI study plan
router.post('/generate', validate(generatePlanSchema), asyncHandler(plannerController.generatePlan));

// GET /api/planner/plan - Get plan for specific date (or today)
router.get('/plan', validate(getPlanSchema), asyncHandler(plannerController.getPlan));

// GET /api/planner/plans - List all study plans
router.get('/plans', validate(listPlansSchema), asyncHandler(plannerController.listPlans));

// GET /api/planner/progress - Get study plan progress
router.get('/progress', validate(getProgressSchema), asyncHandler(plannerController.getProgress));

// PATCH /api/planner/task/:task_id - Update task status
router.patch('/task/:task_id', validate(updateTaskStatusSchema), asyncHandler(plannerController.updateTaskStatus));

// DELETE /api/planner/plan/:plan_id - Delete study plan
router.delete('/plan/:plan_id', validate(deletePlanSchema), asyncHandler(plannerController.deletePlan));

export default router;
