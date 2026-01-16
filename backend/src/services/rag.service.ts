import weaviate, { type WeaviateClient, ApiKey } from 'weaviate-ts-client';
import { openai } from '@ai-sdk/openai';
import { embed } from 'ai';
import { logger, logRAGQuery, logRAGError, logError } from '../utils/logger';
import { ExternalServiceError } from '../utils/apiError';

/**
 * NCERT Chunk structure in Weaviate
 */
export interface NCERTChunk {
  text: string;
  class: string;
  board: string;
  subject: string;
  chapter: string;
}

/**
 * RAG search filters
 */
export interface RAGFilters {
  class?: number;
  board?: string;
  subject?: string;
  chapter?: string;
}

/**
 * RAG search result
 */
export interface RAGContext {
  chunks: NCERTChunk[];
  contextText: string;
  metadata: {
    query: string;
    resultsCount: number;
    filters: RAGFilters;
  };
}

/**
 * RAG Service for Weaviate integration
 * Handles embedding generation and vector search
 */
export class RAGService {
  private client!: WeaviateClient;
  private embeddingModel: any;
  private className: string;
  private isInitialized: boolean = false;

  constructor() {
    const weaviateUrl = process.env.WEAVIATE_URL;
    const weaviateScheme = process.env.WEAVIATE_SCHEME as 'http' | 'https' || 'https';
    const weaviateApiKey = process.env.WEAVIATE_API_KEY;
    this.className = process.env.WEAVIATE_CLASS_NAME || 'NCERTChunks';

    if (!weaviateUrl) {
      logger.warn('WEAVIATE_URL not configured - RAG service will be disabled');
      return;
    }

    // Initialize Weaviate client
    const clientConfig: any = {
      scheme: weaviateScheme,
      host: weaviateUrl,
    };

    // Add API key if provided (for cloud-hosted Weaviate)
    if (weaviateApiKey) {
      clientConfig.apiKey = new ApiKey(weaviateApiKey);
    }

    this.client = weaviate.client(clientConfig);

    // Initialize embedding model
    this.embeddingModel = openai.embedding(
      process.env.OPENAI_EMBEDDING_MODEL || 'text-embedding-3-small'
    );

    this.isInitialized = true;
    logger.info(
      {
        url: weaviateUrl,
        scheme: weaviateScheme,
        className: this.className,
        hasApiKey: !!weaviateApiKey,
      },
      'RAG Service initialized'
    );
  }

  /**
   * Generate embedding for a text query
   */
  private async generateEmbedding(text: string): Promise<number[]> {
    try {
      const { embedding } = await embed({
        model: this.embeddingModel,
        value: text,
      });
      return embedding;
    } catch (error) {
      logError(error as Error, { service: 'RAG', method: 'generateEmbedding' });
      throw new ExternalServiceError('Failed to generate embedding');
    }
  }

  /**
   * Search for relevant NCERT chunks using semantic search
   */
  async searchRelevantContext(
    query: string,
    filters: RAGFilters = {},
    limit: number = 5
  ): Promise<RAGContext> {
    // If RAG service not initialized, return empty context
    if (!this.isInitialized) {
      logger.warn('RAG service not initialized - returning empty context');
      return {
        chunks: [],
        contextText: '',
        metadata: { query, resultsCount: 0, filters },
      };
    }

    try {
      // 1. Generate embedding for the query
      const queryEmbedding = await this.generateEmbedding(query);

      // 2. Build Weaviate query with nearVector search
      let graphQuery = this.client.graphql
        .get()
        .withClassName(this.className)
        .withFields('text class board subject chapter')
        .withNearVector({ vector: queryEmbedding })
        .withLimit(limit);

      // 3. Add filters if provided
      const whereFilters: any[] = [];

      if (filters.class) {
        whereFilters.push({
          path: ['class'],
          operator: 'Equal',
          valueString: filters.class.toString(),
        });
      }

      if (filters.board) {
        whereFilters.push({
          path: ['board'],
          operator: 'Equal',
          valueString: filters.board,
        });
      }

      if (filters.subject) {
        whereFilters.push({
          path: ['subject'],
          operator: 'Equal',
          valueString: filters.subject,
        });
      }

      if (filters.chapter) {
        whereFilters.push({
          path: ['chapter'],
          operator: 'Equal',
          valueString: filters.chapter,
        });
      }

      // Apply filters if any exist
      if (whereFilters.length > 0) {
        graphQuery = graphQuery.withWhere({
          operator: 'And',
          operands: whereFilters,
        });
      }

      // 4. Execute the query
      const result = await graphQuery.do();

      // 5. Extract chunks
      const chunks: NCERTChunk[] = result.data?.Get?.[this.className] || [];

      logRAGQuery(query, chunks.length, filters);

      // 6. Format context text for LLM
      const contextText = chunks
        .map((chunk, idx) => {
          return `[NCERT Excerpt ${idx + 1}]
Class: ${chunk.class} | Board: ${chunk.board} | Subject: ${chunk.subject} | Chapter: ${chunk.chapter}
${chunk.text}`;
        })
        .join('\n\n---\n\n');

      return {
        chunks,
        contextText,
        metadata: {
          query,
          resultsCount: chunks.length,
          filters,
        },
      };
    } catch (error) {
      // Log error but don't throw - return empty context instead (fallback strategy)
      logRAGError(query, error as Error, { filters });
      
      return {
        chunks: [],
        contextText: '',
        metadata: {
          query,
          resultsCount: 0,
          filters,
        },
      };
    }
  }

  /**
   * Search with automatic retry on failure
   */
  async searchWithRetry(
    query: string,
    filters: RAGFilters = {},
    limit: number = 5,
    maxRetries: number = 2
  ): Promise<RAGContext> {
    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await this.searchRelevantContext(query, filters, limit);
      } catch (error) {
        lastError = error as Error;
        logger.warn(
          { attempt: attempt + 1, maxRetries: maxRetries + 1, error: (error as Error).message },
          'RAG search attempt failed, retrying...'
        );
        
        // Wait before retry (exponential backoff)
        if (attempt < maxRetries) {
          await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
        }
      }
    }

    // All retries failed, return empty context
    logRAGError(query, lastError!, { filters, retriesExhausted: true });
    
    return {
      chunks: [],
      contextText: '',
      metadata: {
        query,
        resultsCount: 0,
        filters,
      },
    };
  }

  /**
   * Health check for Weaviate connection
   */
  async healthCheck(): Promise<boolean> {
    if (!this.isInitialized) {
      return false;
    }

    try {
      const result = await this.client.schema.getter().do();
      return !!result;
    } catch (error) {
      logError(error as Error, { service: 'RAG', method: 'healthCheck' });
      return false;
    }
  }

  /**
   * Get class schema info (for debugging)
   */
  async getSchemaInfo(): Promise<any> {
    if (!this.isInitialized) {
      return null;
    }

    try {
      const schema = await this.client.schema.classGetter().withClassName(this.className).do();
      return schema;
    } catch (error) {
      logError(error as Error, { service: 'RAG', method: 'getSchemaInfo' });
      return null;
    }
  }
}

/**
 * Singleton instance
 */
export const ragService = new RAGService();
