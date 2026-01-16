import { z } from 'zod';

/**
 * Generate Study Plan Schema
 * POST /api/planner/generate
 */
export const generatePlanSchema = z.object({
  subject: z.string().min(1, 'Subject is required'),
  exam_date: z.string().datetime('Invalid exam date format'),
  daily_study_hours: z.number().min(0.5).max(12).default(2),
  weak_topics: z.array(z.string()).optional(),
  strong_topics: z.array(z.string()).optional(),
});

export type GeneratePlanInput = z.infer<typeof generatePlanSchema>;

/**
 * Get Plan Schema (Query Params)
 * GET /api/planner/plan
 */
export const getPlanSchema = z.object({
  date: z.string().optional(), // ISO date string, defaults to today
});

export type GetPlanInput = z.infer<typeof getPlanSchema>;

/**
 * Update Task Status Schema
 * PATCH /api/planner/task/:task_id
 */
export const updateTaskStatusSchema = z.object({
  task_id: z.string().uuid('Invalid task ID'),
  status: z.enum(['pending', 'in_progress', 'completed', 'skipped']),
  completed_at: z.string().datetime().optional(),
});

export type UpdateTaskStatusInput = z.infer<typeof updateTaskStatusSchema>;

/**
 * List Plans Schema (Query Params)
 * GET /api/planner/plans
 */
export const listPlansSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(10),
  subject: z.string().optional(),
});

export type ListPlansInput = z.infer<typeof listPlansSchema>;

/**
 * Delete Plan Schema (Path Param)
 * DELETE /api/planner/plan/:plan_id
 */
export const deletePlanSchema = z.object({
  plan_id: z.string().uuid('Invalid plan ID'),
});

/**
 * Get Progress Schema (Query Params)
 * GET /api/planner/progress
 */
export const getProgressSchema = z.object({
  plan_id: z.string().uuid('Invalid plan ID').optional(),
  date: z.string().optional(), // ISO date string
});

export type GetProgressInput = z.infer<typeof getProgressSchema>;
