import type { Response } from 'express';
import type { AuthRequest } from '../middleware/auth';
import { supabase } from '../db/supabase';
import { successResponse } from '../utils/apiResponse';
import { NotFoundError, DatabaseError, ValidationError } from '../utils/apiError';
import { llmService } from '../services/llm.service';
import { getStudyPlanPrompt, type StudyPlan as StudyPlanStructure } from '../prompts/planner.prompts';
import { logger } from '../utils/logger';
import type {
  GeneratePlanInput,
  GetPlanInput,
  UpdateTaskStatusInput,
  ListPlansInput,
  GetProgressInput,
} from '../schemas/planner.schema';

/**
 * Generate a new study plan with AI
 * POST /api/planner/generate
 */
export const generatePlan = async (req: AuthRequest, res: Response) => {
  const userId = req.user!.id;
  const input = req.body as GeneratePlanInput;

  logger.info({ userId, input }, 'Generating study plan');

  try {
    // Get user profile for class and board
    const { data: profile, error: profileError } = await supabase
      .from('user_profile')
      .select('class_level, board, weak_topics, strong_topics')
      .eq('user_id', userId)
      .single();

    if (profileError || !profile) {
      throw new ValidationError('User profile not found. Please complete your profile first.');
    }

    // Merge user-provided topics with profile topics
    const weakTopics = [
      ...(input.weak_topics || []),
      ...(profile.weak_topics || []),
    ].filter((v, i, a) => a.indexOf(v) === i); // Deduplicate

    const strongTopics = [
      ...(input.strong_topics || []),
      ...(profile.strong_topics || []),
    ].filter((v, i, a) => a.indexOf(v) === i);

    // Generate study plan with AI
    const systemPrompt = 'You are an expert study planner for Indian school students. Create comprehensive, realistic study plans aligned with NCERT curriculum.';
    const userPrompt = getStudyPlanPrompt({
      studentClass: profile.class_level,
      board: profile.board,
      subject: input.subject,
      examDate: input.exam_date,
      weakTopics,
      strongTopics,
      dailyStudyHours: input.daily_study_hours,
      currentDate: new Date().toISOString(),
    });

    logger.info({ operation: 'plan-generation', promptLength: userPrompt.length }, 'Generating plan with AI');

    // Generate plan as JSON
    const planStructure = await llmService.generateJSON<StudyPlanStructure>(
      systemPrompt,
      userPrompt,
      {
        temperature: 0.7,
        maxTokens: 4000,
      }
    );

    logger.info({ phases: planStructure.phases.length, totalDays: planStructure.total_days }, 'Study plan generated');

    // Calculate plan date (today)
    const planDate = new Date().toISOString().split('T')[0];

    // Save study plan to database
    const { data: studyPlan, error: planError } = await supabase
      .from('study_plans')
      .insert({
        user_id: userId,
        plan_date: planDate,
        generated_by: 'system',
        plan_meta: {
          title: planStructure.title,
          total_days: planStructure.total_days,
          daily_hours: planStructure.daily_hours,
          subject: input.subject,
          exam_date: input.exam_date,
          phases: planStructure.phases,
          weak_topics: weakTopics,
          strong_topics: strongTopics,
        },
      })
      .select()
      .single();

    if (planError) {
      logger.error({ error: planError }, 'Failed to save study plan');
      throw new DatabaseError('Failed to save study plan');
    }

    // Create plan tasks from the generated plan
    const tasks: any[] = [];
    planStructure.phases.forEach((phase) => {
      phase.tasks.forEach((task) => {
        tasks.push({
          study_plan_id: studyPlan.id,
          user_id: userId,
          task_type: 'study', // Default type
          subject: input.subject,
          chapter: task.topics[0] || null,
          topic: task.topics.join(', '),
          duration_min: Math.round(task.estimated_hours * 60),
          status: 'pending',
        });
      });
    });

    if (tasks.length > 0) {
      const { error: tasksError } = await supabase
        .from('plan_tasks')
        .insert(tasks);

      if (tasksError) {
        logger.error({ error: tasksError }, 'Failed to save plan tasks');
        // Don't throw - plan is saved, tasks can be regenerated
      }
    }

    logger.info({ planId: studyPlan.id, taskCount: tasks.length }, 'Study plan and tasks saved');

    res.json(
      successResponse({
        plan: {
          id: studyPlan.id,
          plan_date: studyPlan.plan_date,
          subject: input.subject,
          exam_date: input.exam_date,
          created_at: studyPlan.created_at,
        },
        structure: planStructure,
      })
    );
  } catch (error) {
    logger.error({ error, userId, input }, 'Study plan generation failed');
    if (error instanceof ValidationError || error instanceof DatabaseError) throw error;
    throw new DatabaseError('Failed to generate study plan');
  }
};

/**
 * Get study plan for a specific date
 * GET /api/planner/plan
 */
export const getPlan = async (req: AuthRequest, res: Response) => {
  const userId = req.user!.id;
  const input = req.query as unknown as GetPlanInput;

  try {
    const planDate = input.date ? new Date(input.date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0];

    // Get study plan
    const { data: plan, error: planError } = await supabase
      .from('study_plans')
      .select('*')
      .eq('user_id', userId)
      .eq('plan_date', planDate)
      .single();

    if (planError || !plan) {
      throw new NotFoundError('No study plan found for this date');
    }

    // Get associated tasks
    const { data: tasks, error: tasksError } = await supabase
      .from('plan_tasks')
      .select('*')
      .eq('study_plan_id', plan.id)
      .order('created_at', { ascending: true });

    if (tasksError) {
      logger.error({ error: tasksError }, 'Failed to fetch plan tasks');
      throw new DatabaseError('Failed to fetch plan tasks');
    }

    res.json(
      successResponse({
        plan: {
          id: plan.id,
          plan_date: plan.plan_date,
          generated_by: plan.generated_by,
          created_at: plan.created_at,
          ...plan.plan_meta,
        },
        tasks: tasks || [],
      })
    );
  } catch (error) {
    logger.error({ error, userId, date: input.date }, 'Failed to get study plan');
    if (error instanceof NotFoundError || error instanceof DatabaseError) throw error;
    throw new DatabaseError('Failed to get study plan');
  }
};

/**
 * Update task status (complete, skip, etc.)
 * PATCH /api/planner/task/:task_id
 */
export const updateTaskStatus = async (req: AuthRequest, res: Response) => {
  const userId = req.user!.id;
  const { task_id } = req.params;
  const input = req.body as UpdateTaskStatusInput;

  logger.info({ userId, taskId: task_id, newStatus: input.status }, 'Updating task status');

  try {
    // Verify task ownership
    const { data: task, error: taskError } = await supabase
      .from('plan_tasks')
      .select('id, user_id')
      .eq('id', task_id)
      .single();

    if (taskError || !task) {
      throw new NotFoundError('Task not found');
    }

    if (task.user_id !== userId) {
      throw new ValidationError('Access denied');
    }

    // Update task status
    const updateData: any = {
      status: input.status,
    };

    if (input.status === 'completed' && input.completed_at) {
      updateData.completed_at = input.completed_at;
    } else if (input.status === 'completed') {
      updateData.completed_at = new Date().toISOString();
    }

    const { data: updatedTask, error: updateError } = await supabase
      .from('plan_tasks')
      .update(updateData)
      .eq('id', task_id)
      .select()
      .single();

    if (updateError) {
      logger.error({ error: updateError }, 'Failed to update task');
      throw new DatabaseError('Failed to update task');
    }

    logger.info({ taskId: task_id, newStatus: input.status }, 'Task status updated');

    res.json(
      successResponse({
        task: updatedTask,
      })
    );
  } catch (error) {
    logger.error({ error, userId, taskId: task_id }, 'Failed to update task status');
    if (error instanceof NotFoundError || error instanceof ValidationError || error instanceof DatabaseError) throw error;
    throw new DatabaseError('Failed to update task status');
  }
};

/**
 * List all study plans for user
 * GET /api/planner/plans
 */
export const listPlans = async (req: AuthRequest, res: Response) => {
  const userId = req.user!.id;
  const input = req.query as unknown as ListPlansInput;

  try {
    let query = supabase
      .from('study_plans')
      .select('id, plan_date, plan_meta, generated_by, created_at', {
        count: 'exact',
      })
      .eq('user_id', userId)
      .order('plan_date', { ascending: false });

    // Apply subject filter if provided
    if (input.subject) {
      query = query.contains('plan_meta', { subject: input.subject });
    }

    // Pagination
    const from = (input.page - 1) * input.limit;
    const to = from + input.limit - 1;
    query = query.range(from, to);

    const { data: plans, error, count } = await query;

    if (error) {
      logger.error({ error }, 'Failed to list study plans');
      throw new DatabaseError('Failed to list study plans');
    }

    res.json(
      successResponse({
        plans: (plans || []).map((p) => ({
          id: p.id,
          plan_date: p.plan_date,
          subject: p.plan_meta?.subject,
          title: p.plan_meta?.title,
          total_days: p.plan_meta?.total_days,
          generated_by: p.generated_by,
          created_at: p.created_at,
        })),
        pagination: {
          page: input.page,
          limit: input.limit,
          total: count || 0,
        },
      })
    );
  } catch (error) {
    logger.error({ error, userId }, 'Failed to list study plans');
    if (error instanceof DatabaseError) throw error;
    throw new DatabaseError('Failed to list study plans');
  }
};

/**
 * Get study plan progress
 * GET /api/planner/progress
 */
export const getProgress = async (req: AuthRequest, res: Response) => {
  const userId = req.user!.id;
  const input = req.query as unknown as GetProgressInput;

  try {
    let planId = input.plan_id;

    // If no plan_id provided, get plan for date (or today)
    if (!planId) {
      const planDate = input.date ? new Date(input.date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0];

      const { data: plan } = await supabase
        .from('study_plans')
        .select('id')
        .eq('user_id', userId)
        .eq('plan_date', planDate)
        .single();

      if (!plan) {
        throw new NotFoundError('No study plan found');
      }

      planId = plan.id;
    }

    // Get all tasks for this plan
    const { data: tasks, error: tasksError } = await supabase
      .from('plan_tasks')
      .select('id, status, duration_min, topic')
      .eq('study_plan_id', planId);

    if (tasksError) {
      logger.error({ error: tasksError }, 'Failed to fetch tasks');
      throw new DatabaseError('Failed to fetch tasks');
    }

    if (!tasks || tasks.length === 0) {
      return res.json(
        successResponse({
          progress: {
            total_tasks: 0,
            completed_tasks: 0,
            pending_tasks: 0,
            skipped_tasks: 0,
            in_progress_tasks: 0,
            completion_percentage: 0,
            total_minutes: 0,
            completed_minutes: 0,
          },
        })
      );
    }

    // Calculate progress
    const totalTasks = tasks.length;
    const completedTasks = tasks.filter((t) => t.status === 'completed').length;
    const pendingTasks = tasks.filter((t) => t.status === 'pending').length;
    const skippedTasks = tasks.filter((t) => t.status === 'skipped').length;
    const inProgressTasks = tasks.filter((t) => t.status === 'in_progress').length;
    const completionPercentage = Math.round((completedTasks / totalTasks) * 100);

    const totalMinutes = tasks.reduce((sum, t) => sum + (t.duration_min || 0), 0);
    const completedMinutes = tasks
      .filter((t) => t.status === 'completed')
      .reduce((sum, t) => sum + (t.duration_min || 0), 0);

    res.json(
      successResponse({
        progress: {
          total_tasks: totalTasks,
          completed_tasks: completedTasks,
          pending_tasks: pendingTasks,
          skipped_tasks: skippedTasks,
          in_progress_tasks: inProgressTasks,
          completion_percentage: completionPercentage,
          total_minutes: totalMinutes,
          completed_minutes: completedMinutes,
        },
      })
    );
  } catch (error) {
    logger.error({ error, userId }, 'Failed to get progress');
    if (error instanceof NotFoundError || error instanceof DatabaseError) throw error;
    throw new DatabaseError('Failed to get progress');
  }
};

/**
 * Delete study plan
 * DELETE /api/planner/plan/:plan_id
 */
export const deletePlan = async (req: AuthRequest, res: Response) => {
  const userId = req.user!.id;
  const { plan_id } = req.params;

  try {
    // Verify ownership and delete
    const { error } = await supabase
      .from('study_plans')
      .delete()
      .eq('id', plan_id)
      .eq('user_id', userId);

    if (error) {
      logger.error({ error }, 'Failed to delete study plan');
      throw new DatabaseError('Failed to delete study plan');
    }

    logger.info({ userId, planId: plan_id }, 'Study plan deleted');

    res.json(successResponse({ message: 'Study plan deleted successfully' }));
  } catch (error) {
    logger.error({ error, userId, planId: plan_id }, 'Failed to delete study plan');
    if (error instanceof DatabaseError) throw error;
    throw new DatabaseError('Failed to delete study plan');
  }
};
