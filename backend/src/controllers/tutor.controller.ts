import type { Response } from 'express';
import type { AuthRequest } from '../middleware/auth';
import { supabase } from '../db/supabase';
import { successResponse, errorResponse } from '../utils/apiResponse';
import { NotFoundError, DatabaseError, ValidationError } from '../utils/apiError';
import { llmService } from '../services/llm.service';
import { ragService } from '../services/rag.service';
import { logger, logWarning } from '../utils/logger';
import type { AskQuestionInput, GetSessionInput, ListSessionsInput } from '../schemas/tutor.schema';
import { getDetectionPrompt } from '../prompts';

/**
 * Stream tutor answer with RAG context
 * POST /api/tutor/ask
 * Server-Sent Events (SSE) streaming endpoint
 */
export const askQuestion = async (req: AuthRequest, res: Response) => {
  const { session_id, question, answer_mode, subject, chapter }: AskQuestionInput = req.body;
  const userId = req.user!.id;

  try {
    // 1. Get user profile for context
    const { data: profileData, error: profileError } = await supabase
      .from('user_profile')
      .select('class, board, subjects')
      .eq('user_id', userId)
      .single();

    if (profileError || !profileData) {
      throw new DatabaseError('Failed to fetch user profile');
    }

    // 2. Get or create session
    let sessionId = session_id;
    if (!sessionId) {
      const { data: newSession, error: sessionError } = await supabase
        .from('tutor_sessions')
        .insert({ user_id: userId })
        .select()
        .single();

      if (sessionError || !newSession) {
        throw new DatabaseError('Failed to create session');
      }
      sessionId = newSession.id;
    } else {
      // Update last_active_at for existing session
      await supabase
        .from('tutor_sessions')
        .update({ last_active_at: new Date().toISOString() })
        .eq('id', sessionId)
        .eq('user_id', userId);
    }

    // 3. Save user question to database (fire and forget)
    const userMessagePromise = supabase
      .from('tutor_messages')
      .insert({
        session_id: sessionId,
        user_id: userId,
        role: 'user',
        content: question,
      })
      .select()
      .single();

    // 4. Detect topic in background (fire and forget)
    const detectionPromise = llmService
      .generateJSON<{ subject: string | null; chapter: string | null; topic: string | null; confidence: number }>(
        getDetectionPrompt(question, profileData.class, profileData.board),
        ''
      )
      .catch((err) => {
        logWarning('Topic detection failed', { error: err.message, question });
        return null;
      });

    // 5. Search for NCERT context (RAG)
    const ragContext = await ragService.searchRelevantContext(
      question,
      {
        class: profileData.class,
        board: profileData.board,
        subject: subject || undefined,
        chapter: chapter || undefined,
      },
      5
    );

    // 6. Stream AI response
    const stream = await llmService.streamTutorAnswer(
      {
        studentClass: profileData.class,
        board: profileData.board,
        subject: subject || 'General',
        question,
        ragContext: ragContext.contextText,
        answerMode: answer_mode,
      },
      userId
    );

    // 7. Setup SSE headers
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no'); // Disable nginx buffering

    // Send initial metadata
    res.write(`data: ${JSON.stringify({ type: 'metadata', session_id: sessionId, rag_results: ragContext.chunks.length })}\n\n`);

    // 8. Stream tokens
    let fullResponse = '';
    for await (const chunk of stream) {
      fullResponse += chunk;
      res.write(`data: ${JSON.stringify({ type: 'token', text: chunk })}\n\n`);
    }

    // 9. Save assistant response to database
    const assistantMessagePromise = supabase
      .from('tutor_messages')
      .insert({
        session_id: sessionId,
        user_id: userId,
        role: 'assistant',
        content: fullResponse,
        answer_mode: answer_mode,
      })
      .select()
      .single();

    // 10. Wait for detection and save metadata
    const [userMessage, detection, assistantMessage] = await Promise.all([
      userMessagePromise,
      detectionPromise,
      assistantMessagePromise,
    ]);

    // Update user message with detection data if available
    if (detection && detection.confidence > 0.7 && userMessage.data) {
      await supabase
        .from('tutor_messages')
        .update({
          detected_class: profileData.class,
          detected_subject: detection.subject,
          detected_chapter: detection.chapter,
          detected_topic: detection.topic,
          detection_confidence: detection.confidence,
        })
        .eq('id', userMessage.data.id);
    }

    // 11. Send completion event
    res.write(`data: ${JSON.stringify({ type: 'done', session_id: sessionId, detected_topic: detection?.topic })}\n\n`);
    res.end();

  } catch (error) {
    logger.error({ error, userId, question }, 'Error in askQuestion');
    
    // Send error event if stream hasn't started
    if (!res.headersSent) {
      res.status(500).json(errorResponse(
        'Failed to generate response. Please try again.',
        'TUTOR_ERROR'
      ));
    } else {
      // Stream already started, send error event
      res.write(`data: ${JSON.stringify({ type: 'error', message: 'An error occurred. Please try again.' })}\n\n`);
      res.end();
    }
  }
};

/**
 * Get session with messages
 * GET /api/tutor/session/:session_id
 */
export const getSession = async (req: AuthRequest, res: Response) => {
  const { session_id } = req.params;
  const userId = req.user!.id;

  // Get session
  const { data: session, error: sessionError } = await supabase
    .from('tutor_sessions')
    .select('*')
    .eq('id', session_id)
    .eq('user_id', userId)
    .single();

  if (sessionError || !session) {
    throw new NotFoundError('Session not found');
  }

  // Get messages
  const { data: messages, error: messagesError } = await supabase
    .from('tutor_messages')
    .select('*')
    .eq('session_id', session_id)
    .order('created_at', { ascending: true });

  if (messagesError) {
    throw new DatabaseError(messagesError.message);
  }

  res.json(successResponse({ session, messages }));
};

/**
 * List user sessions
 * GET /api/tutor/sessions
 */
export const listSessions = async (req: AuthRequest, res: Response) => {
  const userId = req.user!.id;
  const limit = parseInt(req.query.limit as string) || 10;
  const offset = parseInt(req.query.offset as string) || 0;

  const { data, error, count } = await supabase
    .from('tutor_sessions')
    .select('*, tutor_messages(count)', { count: 'exact' })
    .eq('user_id', userId)
    .order('last_active_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) {
    throw new DatabaseError(error.message);
  }

  res.json(successResponse({
    sessions: data,
    total: count,
    limit,
    offset,
  }));
};

/**
 * Delete session
 * DELETE /api/tutor/session/:session_id
 */
export const deleteSession = async (req: AuthRequest, res: Response) => {
  const { session_id } = req.params;
  const userId = req.user!.id;

  const { error } = await supabase
    .from('tutor_sessions')
    .delete()
    .eq('id', session_id)
    .eq('user_id', userId);

  if (error) {
    throw new DatabaseError(error.message);
  }

  res.json(successResponse(null, 'Session deleted successfully'));
};
