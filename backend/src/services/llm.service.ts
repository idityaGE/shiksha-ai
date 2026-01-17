import { openai } from '@ai-sdk/openai';
import { streamText, generateText } from 'ai';
import { z } from 'zod';
import { logger, logAIRequest, logAIResponse, logStreamStart, logStreamEnd, logError } from '../utils/logger';
import { ExternalServiceError } from '../utils/apiError';
import type { TutorPromptContext } from '../prompts';
import { getTutorSystemPrompt } from '../prompts';
import { TUTOR_EVALUATION_SYSTEM_PROMPT } from '../prompts/iq.prompts';
import { iqService, type TutorEvaluation } from './iq.service';

/**
 * LLM Service using Vercel AI SDK
 * Handles all interactions with OpenAI models
 */
export class LLMService {
  private tutorModel;
  private utilityModel;

  constructor() {
    // Initialize models from environment
    const tutorModelName = process.env.OPENAI_MODEL_TUTOR || 'gpt-4o';
    const utilityModelName = process.env.OPENAI_MODEL_UTILITY || 'gpt-4o-mini';

    this.tutorModel = openai(tutorModelName);
    this.utilityModel = openai(utilityModelName);

    logger.info({ tutorModel: tutorModelName, utilityModel: utilityModelName }, 'LLM Service initialized');
  }

  /**
   * Stream a tutor response with token-by-token output
   * Returns an async iterable for SSE streaming
   */
  async streamTutorAnswer(context: TutorPromptContext, userId?: string) {
    const systemPrompt = getTutorSystemPrompt(context);
    const modelName = process.env.OPENAI_MODEL_TUTOR || 'gpt-4o';

    logAIRequest(modelName, systemPrompt.length, userId, {
      answerMode: context.answerMode,
      subject: context.subject,
      class: context.studentClass,
    });

    logStreamStart(modelName, userId, { answerMode: context.answerMode });
    const startTime = Date.now();

    try {
      const result = await streamText({
        model: this.tutorModel,
        system: systemPrompt,
        messages: context.conversationHistory
          ? this.parseConversationHistory(context.conversationHistory)
          : [{ role: 'user', content: context.question }],
        temperature: 0.7,
        maxRetries: 2,
      });

      // Log when stream completes (fire and forget)
      if (result.usage) {
        result.usage.then((usage) => {
          const duration = Date.now() - startTime;
          logStreamEnd(modelName, duration, usage.totalTokens, userId, {
            answerMode: context.answerMode,
          });
        });
      }

      return result.textStream;
    } catch (error) {
      const duration = Date.now() - startTime;
      logError(error as Error, {
        service: 'LLM',
        method: 'streamTutorAnswer',
        userId,
        duration,
        context: context.answerMode,
      });
      throw new ExternalServiceError('AI service unavailable. Please try again in a moment.');
    }
  }

  /**
   * Generate non-streaming completion (for quiz, detection, planner)
   * Uses utility model (gpt-4o-mini) by default for cost efficiency
   */
  async generateCompletion(
    systemPrompt: string,
    userPrompt: string,
    options: {
      useUtilityModel?: boolean;
      temperature?: number;
      maxTokens?: number;
      userId?: string;
    } = {}
  ): Promise<string> {
    const {
      useUtilityModel = true,
      temperature = 0.7,
      maxTokens = 1500,
      userId,
    } = options;

    const model = useUtilityModel ? this.utilityModel : this.tutorModel;
    const modelName = useUtilityModel
      ? process.env.OPENAI_MODEL_UTILITY || 'gpt-4o-mini'
      : process.env.OPENAI_MODEL_TUTOR || 'gpt-4o';

    logAIRequest(modelName, systemPrompt.length, userId);
    const startTime = Date.now();

    try {
      const result = await generateText({
        model,
        system: systemPrompt,
        messages: [{ role: 'user', content: userPrompt }],
        temperature,
        maxRetries: 2,
      });

      const duration = Date.now() - startTime;
      logAIResponse(modelName, result.usage?.totalTokens || 0, duration, userId);

      return result.text;
    } catch (error) {
      const duration = Date.now() - startTime;
      logError(error as Error, {
        service: 'LLM',
        method: 'generateCompletion',
        userId,
        duration,
        modelName,
      });
      throw new ExternalServiceError('AI service unavailable. Please try again.');
    }
  }

  /**
   * Generate JSON response with automatic parsing
   * Useful for structured outputs (quiz, detection, planner)
   */
  async generateJSON<T>(
    systemPrompt: string,
    userPrompt: string,
    options: {
      temperature?: number;
      maxTokens?: number;
      userId?: string;
    } = {}
  ): Promise<T> {
    const rawResponse = await this.generateCompletion(systemPrompt, userPrompt, {
      useUtilityModel: true,
      ...options,
    });

    try {
      // Try to extract JSON from markdown code blocks if present
      const jsonMatch = rawResponse.match(/```json\s*\n?([\s\S]*?)\n?```/);
      const jsonString = jsonMatch && jsonMatch[1] ? jsonMatch[1] : rawResponse;

      // Parse and return
      const parsed = JSON.parse(jsonString.trim());
      return parsed as T;
    } catch (error) {
      logError(error as Error, {
        service: 'LLM',
        method: 'generateJSON',
        rawResponse: rawResponse.substring(0, 500),
      });
      throw new ExternalServiceError('Failed to parse AI response. Please try again.');
    }
  }

  /**
   * Generate completion with conversation history
   */
  async generateWithHistory(
    systemPrompt: string,
    conversationHistory: Array<{ role: 'user' | 'assistant'; content: string }>,
    newMessage: string,
    options: {
      useUtilityModel?: boolean;
      temperature?: number;
      userId?: string;
    } = {}
  ): Promise<string> {
    const {
      useUtilityModel = true,
      temperature = 0.7,
      userId,
    } = options;

    const model = useUtilityModel ? this.utilityModel : this.tutorModel;
    const modelName = useUtilityModel
      ? process.env.OPENAI_MODEL_UTILITY || 'gpt-4o-mini'
      : process.env.OPENAI_MODEL_TUTOR || 'gpt-4o';

    logAIRequest(modelName, systemPrompt.length, userId, { hasHistory: true });
    const startTime = Date.now();

    try {
      const result = await generateText({
        model,
        system: systemPrompt,
        messages: [...conversationHistory, { role: 'user', content: newMessage }],
        temperature,
        maxRetries: 2,
      });

      const duration = Date.now() - startTime;
      logAIResponse(modelName, result.usage?.totalTokens || 0, duration, userId);

      return result.text;
    } catch (error) {
      const duration = Date.now() - startTime;
      logError(error as Error, {
        service: 'LLM',
        method: 'generateWithHistory',
        userId,
        duration,
      });
      throw new ExternalServiceError('AI service unavailable. Please try again.');
    }
  }

  /**
   * Parse conversation history from string format
   * Expected format: "user: question\nassistant: answer\nuser: follow-up\n..."
   */
  private parseConversationHistory(history: string): Array<{ role: 'user' | 'assistant'; content: string }> {
    const messages: Array<{ role: 'user' | 'assistant'; content: string }> = [];
    const lines = history.split('\n');

    for (const line of lines) {
      const userMatch = line.match(/^user:\s*(.+)$/i);
      const assistantMatch = line.match(/^assistant:\s*(.+)$/i);

      if (userMatch && userMatch[1]) {
        messages.push({ role: 'user', content: userMatch[1].trim() });
      } else if (assistantMatch && assistantMatch[1]) {
        messages.push({ role: 'assistant', content: assistantMatch[1].trim() });
      }
    }

    return messages;
  }

  /**
   * Stream a tutor response with IQ evaluation tool
   * The AI can call the evaluation tool to assess the user's cognitive level
   */
  async streamTutorWithEvaluation(
    context: TutorPromptContext,
    userId: string,
    sessionId: string
  ) {
    const baseSystemPrompt = getTutorSystemPrompt(context);
    // Combine base tutor prompt with evaluation instructions
    const systemPrompt = `${baseSystemPrompt}\n\n${TUTOR_EVALUATION_SYSTEM_PROMPT}`;
    const modelName = process.env.OPENAI_MODEL_TUTOR || 'gpt-4o';

    logAIRequest(modelName, systemPrompt.length, userId, {
      answerMode: context.answerMode,
      subject: context.subject,
      class: context.studentClass,
      withEvaluation: true,
    });

    logStreamStart(modelName, userId, { answerMode: context.answerMode, withEvaluation: true });
    const startTime = Date.now();

    try {
      // Define evaluation tool schema
      const evaluationToolSchema = z.object({
        bloom_level: z.enum(['remember', 'understand', 'apply', 'analyze', 'evaluate', 'create'])
          .describe("The Bloom's taxonomy level of the question"),
        question_complexity: z.number().int().min(1).max(10)
          .describe('Complexity score: 1-3 simple, 4-6 moderate, 7-10 complex'),
        demonstrates_understanding: z.boolean()
          .describe('Whether the question shows prior understanding of the topic'),
        reasoning_quality: z.number().int().min(1).max(10)
          .describe('Quality of reasoning/thinking shown in the question'),
        subject: z.string().optional()
          .describe('The academic subject (e.g., Physics, Mathematics, Chemistry)'),
        topic: z.string().optional()
          .describe('The specific topic within the subject'),
        chapter: z.string().optional()
          .describe('The chapter or unit if identifiable'),
      });

      type EvaluationParams = z.infer<typeof evaluationToolSchema>;

      const result = await streamText({
        model: this.tutorModel,
        system: systemPrompt,
        messages: context.conversationHistory
          ? this.parseConversationHistory(context.conversationHistory)
          : [{ role: 'user', content: context.question }],
        tools: {
          evaluate_user_understanding: {
            description: `Evaluate the student's question to assess their cognitive level and understanding. 
Call this tool for substantive academic questions to track the student's intellectual development.
Do NOT call for greetings, clarifications, or off-topic questions.`,
            inputSchema: evaluationToolSchema,
            execute: async (params: EvaluationParams) => {
              // This gets called when the AI decides to evaluate
              logger.info({ userId, sessionId, evaluation: params }, 'AI called evaluation tool');
              
              // Fire and forget - update IQ in background
              iqService.updateFromTutor(userId, sessionId, params as TutorEvaluation).catch((err) => {
                logger.error({ error: err }, 'Failed to update IQ from tutor evaluation');
              });

              // Return confirmation (this won't be shown to user)
              return { evaluated: true, bloom_level: params.bloom_level };
            },
          },
        },
        temperature: 0.7,
        maxRetries: 2,
      });

      // Log when stream completes (fire and forget)
      if (result.usage) {
        result.usage.then((usage) => {
          const duration = Date.now() - startTime;
          logStreamEnd(modelName, duration, usage.totalTokens, userId, {
            answerMode: context.answerMode,
            withEvaluation: true,
          });
        });
      }

      return {
        textStream: result.textStream,
        toolCalls: result.toolCalls,
      };
    } catch (error) {
      const duration = Date.now() - startTime;
      logError(error as Error, {
        service: 'LLM',
        method: 'streamTutorWithEvaluation',
        userId,
        duration,
        context: context.answerMode,
      });
      throw new ExternalServiceError('AI service unavailable. Please try again in a moment.');
    }
  }

  /**
   * Health check for LLM service
   */
  async healthCheck(): Promise<boolean> {
    try {
      await generateText({
        model: this.utilityModel,
        messages: [{ role: 'user', content: 'Hello' }],
        maxRetries: 1,
      });
      return true;
    } catch (error) {
      logError(error as Error, { service: 'LLM', method: 'healthCheck' });
      return false;
    }
  }
}

/**
 * Singleton instance
 */
export const llmService = new LLMService();
