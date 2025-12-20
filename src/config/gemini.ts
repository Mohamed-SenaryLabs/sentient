/**
 * Shared configuration for all intelligence actors
 * Planner, Operative, and Oracle all use the same Gemini API key
 */

export const GEMINI_API_KEY = process.env.EXPO_PUBLIC_GEMINI_API_KEY || '';
export const GEMINI_MODEL = 'gemini-2.5-flash-lite'; // As per user request
export const GEMINI_API_ENDPOINT = 'https://generativelanguage.googleapis.com/v1beta/models';

/**
 * Check if API key is available
 */
export function isApiKeyAvailable(): boolean {
  return !!GEMINI_API_KEY;
}

/**
 * Get the full API URL for a model
 */
export function getApiUrl(model: string = GEMINI_MODEL): string {
  return `${GEMINI_API_ENDPOINT}/${model}:generateContent?key=${encodeURIComponent(GEMINI_API_KEY)}`;
}
