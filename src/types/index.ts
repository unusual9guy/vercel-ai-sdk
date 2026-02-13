/**
 * Type definitions for Airweave Notion POC
 */

// ===========================================
// Configuration Types
// ===========================================

export type LLMProvider = 'google' | 'openai' | 'anthropic';
export type SearchType = 'hybrid' | 'semantic' | 'keyword';
export type OutputFormat = 'json' | 'text';

export interface AppConfig {
  airweaveApiKey: string;
  airweaveCollectionId: string;
  airweaveApiUrl: string;
  llmProvider: LLMProvider;
  googleApiKey?: string;
  openaiApiKey?: string;
  anthropicApiKey?: string;
  defaultSearchType: SearchType;
  maxResults: number;
  defaultOutputFormat: OutputFormat;
}

// ===========================================
// Search Types
// ===========================================

export interface SearchOptions {
  query: string;
  searchType?: SearchType;
  limit?: number;
  enhanceQuery?: boolean;
}

export interface SearchResult {
  id: string;
  content: string;
  source: string;
  sourceType?: string;
  score: number;
  metadata?: Record<string, unknown>;
  url?: string;
  title?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface SearchResponse {
  success: boolean;
  query: string;
  enhancedQuery?: string;
  searchType: SearchType;
  results: SearchResult[];
  totalResults: number;
  processingTime?: number;
  error?: string;
}

// ===========================================
// AI Enhancement Types
// ===========================================

export interface QueryEnhancement {
  originalQuery: string;
  enhancedQuery: string;
  keywords: string[];
  intent: string;
}

export interface ResultSummary {
  summary: string;
  keyPoints: string[];
  relevantTopics: string[];
}

// ===========================================
// CLI Types
// ===========================================

export interface CLICommand {
  type: 'search' | 'config' | 'help' | 'exit' | 'format' | 'type' | 'clear';
  payload?: string | Record<string, unknown>;
}

export interface CLIState {
  outputFormat: OutputFormat;
  searchType: SearchType;
  enhanceQueries: boolean;
  lastQuery?: string;
  lastResults?: SearchResult[];
}
