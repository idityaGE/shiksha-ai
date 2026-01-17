import { z } from 'zod';

/**
 * Generate Study Plan Schema (Original - AI-based general plan)
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
 * Generate Chapter-wise Study Plan Schema
 * POST /api/planner/generate-chapter-plan
 * 
 * Creates a structured plan based on specific chapters with deadlines
 */
export const generateChapterPlanSchema = z.object({
  subject: z.string().min(1, 'Subject is required'),
  chapter_ids: z.array(z.string().min(1)).min(1, 'At least one chapter is required').max(30, 'Maximum 30 chapters allowed'),
  deadline: z.string().datetime('Invalid deadline format'),
  daily_study_hours: z.number().min(0.5).max(12).default(2),
  priority_chapters: z.array(z.string()).optional(), // Chapter IDs to prioritize
  include_revision: z.boolean().default(true), // Include revision days at the end
  revision_days: z.number().int().min(0).max(14).default(2), // Days for final revision
});

export type GenerateChapterPlanInput = z.infer<typeof generateChapterPlanSchema>;

/**
 * Get Chapter Plan by ID
 * GET /api/planner/chapter-plan/:plan_id
 */
export const getChapterPlanSchema = z.object({
  plan_id: z.string().uuid('Invalid plan ID'),
});

export type GetChapterPlanInput = z.infer<typeof getChapterPlanSchema>;

/**
 * Update Chapter Task Status
 * PATCH /api/planner/chapter-task/:task_id
 */
export const updateChapterTaskSchema = z.object({
  task_id: z.string().uuid('Invalid task ID'),
});

export const updateChapterTaskBodySchema = z.object({
  status: z.enum(['pending', 'in_progress', 'completed', 'skipped']),
  actual_hours: z.number().min(0).max(24).optional(),
  notes: z.string().max(500).optional(),
});

export type UpdateChapterTaskInput = z.infer<typeof updateChapterTaskBodySchema>;

/**
 * Get Plans by Deadline
 * GET /api/planner/by-deadline
 */
export const getPlansByDeadlineSchema = z.object({
  start_date: z.string().optional(), // Filter plans with deadline after this date
  end_date: z.string().optional(), // Filter plans with deadline before this date
  status: z.enum(['active', 'completed', 'overdue', 'all']).default('all'),
});

export type GetPlansByDeadlineInput = z.infer<typeof getPlansByDeadlineSchema>;

/**
 * Get Today's Tasks (across all plans)
 * GET /api/planner/today
 */
export const getTodayTasksSchema = z.object({
  include_overdue: z.coerce.boolean().default(true),
});

export type GetTodayTasksInput = z.infer<typeof getTodayTasksSchema>;

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
export const updateTaskStatusParamsSchema = z.object({
  task_id: z.string().uuid('Invalid task ID'),
});

export const updateTaskStatusBodySchema = z.object({
  status: z.enum(['pending', 'in_progress', 'completed', 'skipped']),
  completed_at: z.string().datetime().optional(),
});

export const updateTaskStatusSchema = z.object({
  task_id: z.string().uuid('Invalid task ID'),
  status: z.enum(['pending', 'in_progress', 'completed', 'skipped']),
  completed_at: z.string().datetime().optional(),
});

export type UpdateTaskStatusInput = z.infer<typeof updateTaskStatusBodySchema>;

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
