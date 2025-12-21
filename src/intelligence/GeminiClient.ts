import { GoogleGenerativeAI } from '@google/generative-ai';
import { GEMINI_API_KEY, GEMINI_MODEL, isApiKeyAvailable } from '../config/gemini';

/**
 * Generic Gemini LLM Client
 * 
 * Provides a reusable interface for calling Gemini API from any agent.
 * Handles API key validation, error handling, and fallback logic.
 */

export interface GeminiRequest {
  systemPrompt: string;
  userPrompt: string;
  temperature?: number;
  maxTokens?: number;
}

export interface GeminiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  usedFallback: boolean;
}

export class GeminiClient {
  private static genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
  
  /**
   * Generic method to call Gemini with any prompt
   * Returns raw text response
   */
  static async generateText(request: GeminiRequest): Promise<GeminiResponse<string>> {
    if (!isApiKeyAvailable()) {
      console.warn('[GeminiClient] API Key missing. Cannot generate.');
      return {
        success: false,
        error: 'API key not available',
        usedFallback: false
      };
    }

    try {
      const model = this.genAI.getGenerativeModel({ 
        model: GEMINI_MODEL,
        generationConfig: {
          temperature: request.temperature ?? 0.7,
          maxOutputTokens: request.maxTokens ?? 2048,
        }
      });

      const result = await model.generateContent([
        request.systemPrompt,
        request.userPrompt
      ]);
      
      const response = result.response;
      const text = response.text();

      return {
        success: true,
        data: text,
        usedFallback: false
      };

    } catch (error) {
      console.error('[GeminiClient] Generation failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        usedFallback: false
      };
    }
  }

  /**
   * Generate and parse JSON response
   * Useful for structured outputs from agents
   */
  static async generateJSON<T>(
    request: GeminiRequest,
    validator?: (data: T) => boolean
  ): Promise<GeminiResponse<T>> {
    const textResponse = await this.generateText(request);

    if (!textResponse.success || !textResponse.data) {
      return {
        success: false,
        error: textResponse.error,
        usedFallback: false
      };
    }

    try {
      // Clean JSON from markdown code blocks
      const cleanedText = textResponse.data
        .replace(/```json/g, '')
        .replace(/```/g, '')
        .trim();
      
      const parsed = JSON.parse(cleanedText) as T;

      // Optional validation
      if (validator && !validator(parsed)) {
        console.warn('[GeminiClient] Response failed validation');
        return {
          success: false,
          error: 'Validation failed',
          usedFallback: false
        };
      }

      return {
        success: true,
        data: parsed,
        usedFallback: false
      };

    } catch (error) {
      console.error('[GeminiClient] JSON parsing failed:', error);
      return {
        success: false,
        error: 'Failed to parse JSON response',
        usedFallback: false
      };
    }
  }

  /**
   * Generate with automatic fallback
   * Agents provide their own fallback logic
   */
  static async generateWithFallback<T>(
    request: GeminiRequest,
    fallback: T,
    validator?: (data: T) => boolean
  ): Promise<GeminiResponse<T>> {
    const response = await this.generateJSON<T>(request, validator);

    if (!response.success) {
      console.warn('[GeminiClient] Using fallback due to:', response.error);
      return {
        success: true,
        data: fallback,
        usedFallback: true
      };
    }

    return response;
  }

  /**
   * Check if Gemini API is available
   */
  static isAvailable(): boolean {
    return isApiKeyAvailable();
  }
}
