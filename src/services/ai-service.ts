/**
 * AI Enhancement Service
 * Uses AI SDK with Gemini for query enhancement and result post-processing
 */

import { generateText } from 'ai';
import { google } from '@ai-sdk/google';
import type { SearchResult, QueryEnhancement, ResultSummary, LLMProvider } from '../types/index.js';
import { appConfig } from '../config/env.js';

/**
 * AI Service Class
 * Provides AI-powered enhancement features
 */
export class AIService {
  private provider: LLMProvider;
  private model: string;

  constructor() {
    this.provider = appConfig.llmProvider;
    this.model = this.getModelName();
  }

  /**
   * Get the model name based on provider
   */
  private getModelName(): string {
    switch (this.provider) {
      case 'google':
        return 'gemini-2.5-flash-preview'; // Using Gemini Flash for speed and efficiency
      case 'openai':
        return 'gpt-4-turbo-preview';
      case 'anthropic':
        return 'claude-3-haiku-20240307';
      default:
        return 'gemini-1.5-flash';
    }
  }

  /**
   * Get the appropriate AI model based on provider
   */
  private getModel() {
    switch (this.provider) {
      case 'google':
        return google(this.model);
      default:
        // Default to Google Gemini
        return google(this.model);
    }
  }

  /**
   * Check if AI service is configured
   */
  isConfigured(): boolean {
    if (this.provider === 'google') {
      return !!appConfig.googleApiKey;
    }
    if (this.provider === 'openai') {
      return !!appConfig.openaiApiKey;
    }
    if (this.provider === 'anthropic') {
      return !!appConfig.anthropicApiKey;
    }
    return false;
  }

  /**
   * Enhance user query using AI
   * Expands query with synonyms and context for better semantic search
   */
  async enhanceQuery(userQuery: string): Promise<QueryEnhancement> {
    // If AI is not configured, return original query
    if (!this.isConfigured()) {
      console.log('⚠️  AI enhancement not configured, using original query');
      return {
        originalQuery: userQuery,
        enhancedQuery: userQuery,
        keywords: [],
        intent: 'search',
      };
    }

    try {
      const result = await generateText({
        model: this.getModel(),
        prompt: `You are a search query optimization expert. Enhance the following search query for better semantic search results in a Notion knowledge base.

User Query: "${userQuery}"

Instructions:
1. Analyze the user's intent
2. Expand the query with relevant synonyms and related terms
3. Add context that might help find relevant Notion pages
4. Keep the enhanced query concise but comprehensive

Return your response in this exact JSON format (no markdown, just plain JSON):
{
  "original_query": "the original query",
  "enhanced_query": "the optimized query for semantic search",
  "keywords": ["key", "terms", "extracted"],
  "intent": "brief description of user intent"
}

JSON response only:`,
      });

      // Parse the JSON response
      const responseText = result.text.trim();
      
      // Try to extract JSON from the response
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in response');
      }

      const parsed = JSON.parse(jsonMatch[0]);

      return {
        originalQuery: userQuery,
        enhancedQuery: parsed.enhanced_query || userQuery,
        keywords: parsed.keywords || [],
        intent: parsed.intent || 'search',
      };
    } catch (error) {
      console.error('Query enhancement failed:', error instanceof Error ? error.message : error);
      // Return original query on failure
      return {
        originalQuery: userQuery,
        enhancedQuery: userQuery,
        keywords: [],
        intent: 'search',
      };
    }
  }

  /**
   * Summarize search results using AI
   */
  async summarizeResults(results: SearchResult[], originalQuery: string): Promise<ResultSummary> {
    if (!this.isConfigured() || results.length === 0) {
      return {
        summary: 'No results to summarize.',
        keyPoints: [],
        relevantTopics: [],
      };
    }

    try {
      const resultsContext = results
        .slice(0, 5) // Limit to top 5 results
        .map((r, i) => `[${i + 1}] Source: ${r.source}\nContent: ${r.content.slice(0, 500)}`)
        .join('\n\n');

      const result = await generateText({
        model: this.getModel(),
        prompt: `You are a knowledge synthesis expert. Summarize the following search results related to the query: "${originalQuery}"

Search Results:
${resultsContext}

Instructions:
1. Provide a concise summary of the information found
2. Extract 3-5 key points
3. Identify relevant topics or themes

Return your response in this exact JSON format:
{
  "summary": "A concise summary of the search results",
  "key_points": ["Point 1", "Point 2", "Point 3"],
  "relevant_topics": ["Topic 1", "Topic 2"]
}

JSON response only:`,
      });

      const responseText = result.text.trim();
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      
      if (!jsonMatch) {
        throw new Error('No JSON found in response');
      }

      const parsed = JSON.parse(jsonMatch[0]);

      return {
        summary: parsed.summary || 'Unable to generate summary.',
        keyPoints: parsed.key_points || [],
        relevantTopics: parsed.relevant_topics || [],
      };
    } catch (error) {
      console.error('Summarization failed:', error instanceof Error ? error.message : error);
      return {
        summary: 'Failed to generate summary.',
        keyPoints: [],
        relevantTopics: [],
      };
    }
  }

  /**
   * Re-rank search results based on relevance to query
   */
  async reRankResults(results: SearchResult[], query: string): Promise<SearchResult[]> {
    if (!this.isConfigured() || results.length <= 1) {
      return results;
    }

    try {
      const result = await generateText({
        model: this.getModel(),
        prompt: `You are a relevance ranking expert. Re-rank the following search results based on their relevance to the query: "${query}"

Results (in order of original ranking):
${results.map((r, i) => `[${i}] Score: ${r.score.toFixed(4)}, Content: ${r.content.slice(0, 200)}`).join('\n')}

Return ONLY a JSON array of indices in order of most relevant to least relevant.
Example: [2, 0, 3, 1, 4]

Response:`,
      });

      const responseText = result.text.trim();
      
      // Try to extract the array from the response
      const arrayMatch = responseText.match(/\[[\d\s,]+\]/);
      if (!arrayMatch) {
        return results;
      }

      const indices: number[] = JSON.parse(arrayMatch[0]);
      
      // Validate indices and re-order results
      const validIndices = indices.filter(i => i >= 0 && i < results.length);
      
      if (validIndices.length === 0) {
        return results;
      }

      // Create reordered array
      const reordered: SearchResult[] = [];
      const usedIndices = new Set<number>();

      for (const idx of validIndices) {
        if (!usedIndices.has(idx)) {
          reordered.push(results[idx]);
          usedIndices.add(idx);
        }
      }

      // Add any remaining results not in the reordered list
      for (let i = 0; i < results.length; i++) {
        if (!usedIndices.has(i)) {
          reordered.push(results[i]);
        }
      }

      return reordered;
    } catch (error) {
      console.error('Re-ranking failed:', error instanceof Error ? error.message : error);
      return results;
    }
  }

  /**
   * Process search with full AI enhancement pipeline
   */
  async enhancedSearch(
    query: string,
    searchFn: (query: string) => Promise<SearchResult[]>
  ): Promise<{
    enhancement: QueryEnhancement;
    results: SearchResult[];
    summary?: ResultSummary;
  }> {
    // Step 1: Enhance the query
    const enhancement = await this.enhanceQuery(query);

    // Step 2: Execute search with enhanced query
    let results = await searchFn(enhancement.enhancedQuery);

    // Step 3: Re-rank results
    if (results.length > 0) {
      results = await this.reRankResults(results, query);
    }

    // Step 4: Generate summary
    const summary = await this.summarizeResults(results, query);

    return {
      enhancement,
      results,
      summary,
    };
  }
}

// Export singleton instance
export const aiService = new AIService();

export default AIService;
