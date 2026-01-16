import { z } from 'zod';

/**
 * Schema for asking a question (streaming endpoint)
 */
export const askQuestionSchema = z.object({
  session_id: z.string().uuid().optional(),
  question: z.string().min(1, 'Question is required').max(2000, 'Question too long'),
  answer_mode: z.enum(['simple', '2-mark', '5-mark', 'topper']).default('simple'),
  subject: z.string().optional(), // Optional hint for better RAG search
  chapter: z.string().optional(), // Optional hint for better RAG search
});

/**
 * Schema for getting session history
 */
export const getSessionSchema = z.object({
  session_id: z.string().uuid(),
});

/**
 * Schema for listing user sessions
 */
export const listSessionsSchema = z.object({
  limit: z.number().int().min(1).max(100).optional().default(10),
  offset: z.number().int().min(0).optional().default(0),
});

/**
 * Schema for deleting a session
 */
export const deleteSessionSchema = z.object({
  session_id: z.string().uuid(),
});

/**
 * TypeScript types inferred from schemas
 */
export type AskQuestionInput = z.infer<typeof askQuestionSchema>;
export type GetSessionInput = z.infer<typeof getSessionSchema>;
export type ListSessionsInput = z.infer<typeof listSessionsSchema>;
export type DeleteSessionInput = z.infer<typeof deleteSessionSchema>;
