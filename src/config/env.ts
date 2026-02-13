/**
 * Environment Configuration
 * Loads and validates environment variables
 */

import { config } from 'dotenv';
import { resolve } from 'path';
import type { AppConfig, LLMProvider, SearchType, OutputFormat } from '../types/index.js';

// Load .env file
config({ path: resolve(process.cwd(), '.env') });

/**
 * Get environment variable with fallback
 */
function getEnv(key: string, fallback?: string): string | undefined {
  return process.env[key] ?? fallback;
}

/**
 * Get required environment variable (throws if missing)
 */
function getRequiredEnv(key: string): string {
  const value = process.env[key];
  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
}

/**
 * Parse boolean from environment variable
 */
function parseBoolean(value: string | undefined, fallback: boolean): boolean {
  if (!value) return fallback;
  return value.toLowerCase() === 'true' || value === '1';
}

/**
 * Validate LLM provider
 */
function validateLLMProvider(value: string | undefined): LLMProvider {
  const validProviders: LLMProvider[] = ['google', 'openai', 'anthropic'];
  const provider = (value?.toLowerCase() as LLMProvider) || 'google';
  
  if (!validProviders.includes(provider)) {
    console.warn(`Invalid LLM provider "${value}", falling back to "google"`);
    return 'google';
  }
  
  return provider;
}

/**
 * Validate search type
 */
function validateSearchType(value: string | undefined): SearchType {
  const validTypes: SearchType[] = ['hybrid', 'semantic', 'keyword'];
  const type = (value?.toLowerCase() as SearchType) || 'hybrid';
  
  if (!validTypes.includes(type)) {
    console.warn(`Invalid search type "${value}", falling back to "hybrid"`);
    return 'hybrid';
  }
  
  return type;
}

/**
 * Validate output format
 */
function validateOutputFormat(value: string | undefined): OutputFormat {
  const validFormats: OutputFormat[] = ['json', 'text'];
  const format = (value?.toLowerCase() as OutputFormat) || 'json';
  
  if (!validFormats.includes(format)) {
    console.warn(`Invalid output format "${value}", falling back to "json"`);
    return 'json';
  }
  
  return format;
}

/**
 * Application configuration object
 * Note: API keys are loaded from env but can be set later via CLI
 */
export const appConfig: AppConfig = {
  airweaveApiKey: getEnv('AIRWEAVE_API_KEY', '')!,
  airweaveCollectionId: getEnv('AIRWEAVE_COLLECTION_ID', '')!,
  airweaveApiUrl: getEnv('AIRWEAVE_API_URL', 'https://api.airweave.ai')!,
  llmProvider: validateLLMProvider(getEnv('LLM_PROVIDER')),
  googleApiKey: getEnv('GOOGLE_GENERATIVE_AI_API_KEY'),
  openaiApiKey: getEnv('OPENAI_API_KEY'),
  anthropicApiKey: getEnv('ANTHROPIC_API_KEY'),
  defaultSearchType: validateSearchType(getEnv('DEFAULT_SEARCH_TYPE')),
  maxResults: parseInt(getEnv('MAX_RESULTS', '10')!, 10),
  defaultOutputFormat: validateOutputFormat(getEnv('DEFAULT_OUTPUT_FORMAT')),
};

/**
 * Check if configuration is valid
 */
export function isConfigValid(): { valid: boolean; missing: string[] } {
  const missing: string[] = [];
  
  if (!appConfig.airweaveApiKey) {
    missing.push('AIRWEAVE_API_KEY');
  }
  
  if (!appConfig.airweaveCollectionId) {
    missing.push('AIRWEAVE_COLLECTION_ID');
  }
  
  // Check LLM API key based on provider
  if (appConfig.llmProvider === 'google' && !appConfig.googleApiKey) {
    missing.push('GOOGLE_GENERATIVE_AI_API_KEY');
  } else if (appConfig.llmProvider === 'openai' && !appConfig.openaiApiKey) {
    missing.push('OPENAI_API_KEY');
  } else if (appConfig.llmProvider === 'anthropic' && !appConfig.anthropicApiKey) {
    missing.push('ANTHROPIC_API_KEY');
  }
  
  return {
    valid: missing.length === 0,
    missing,
  };
}

/**
 * Print current configuration (masked)
 */
export function printConfig(): void {
  console.log('\n📋 Current Configuration:');
  console.log('─'.repeat(40));
  console.log(`  Airweave API Key: ${maskApiKey(appConfig.airweaveApiKey)}`);
  console.log(`  Collection ID: ${appConfig.airweaveCollectionId || '(not set)'}`);
  console.log(`  LLM Provider: ${appConfig.llmProvider}`);
  console.log(`  Search Type: ${appConfig.defaultSearchType}`);
  console.log(`  Max Results: ${appConfig.maxResults}`);
  console.log(`  Output Format: ${appConfig.defaultOutputFormat}`);
  console.log('─'.repeat(40));
}

/**
 * Mask API key for display
 */
function maskApiKey(key: string): string {
  if (!key) return '(not set)';
  if (key.length <= 8) return '****';
  return `${key.slice(0, 4)}${'*'.repeat(8)}${key.slice(-4)}`;
}

export default appConfig;
