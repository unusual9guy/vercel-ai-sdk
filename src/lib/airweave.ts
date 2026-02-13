/**
 * Airweave Client Library
 * Handles communication with Airweave API
 */

import type { SearchType, SearchResult, SearchOptions, SearchResponse } from '../types/index.js';
import { appConfig } from '../config/env.js';

/**
 * Airweave API Client
 * Direct HTTP client for Airweave REST API
 */
export class AirweaveClient {
  private apiKey: string;
  private baseUrl: string;
  private collectionId: string;

  constructor(apiKey?: string, collectionId?: string, baseUrl?: string) {
    this.apiKey = apiKey || appConfig.airweaveApiKey;
    this.collectionId = collectionId || appConfig.airweaveCollectionId;
    this.baseUrl = baseUrl || appConfig.airweaveApiUrl;
  }

  /**
   * Update API key
   */
  setApiKey(apiKey: string): void {
    this.apiKey = apiKey;
  }

  /**
   * Update collection ID
   */
  setCollectionId(collectionId: string): void {
    this.collectionId = collectionId;
  }

  /**
   * Check if client is configured
   */
  isConfigured(): boolean {
    return !!(this.apiKey && this.collectionId);
  }

  /**
   * Debug: Print current configuration
   */
  debugConfig(): void {
    console.log('\n🔧 Airweave Client Debug:');
    console.log('─'.repeat(40));
    console.log(`  API Key: ${this.apiKey ? this.apiKey.slice(0, 8) + '...' : '(not set)'}`);
    console.log(`  Collection ID: ${this.collectionId || '(not set)'}`);
    console.log(`  Base URL: ${this.baseUrl}`);
    console.log(`  Configured: ${this.isConfigured() ? '✅' : '❌'}`);
    console.log('─'.repeat(40));
  }

  /**
   * Search collection using Airweave semantic search
   */
  async search(options: SearchOptions): Promise<SearchResponse> {
    const startTime = Date.now();

    if (!this.isConfigured()) {
      return {
        success: false,
        query: options.query,
        searchType: options.searchType || 'hybrid',
        results: [],
        totalResults: 0,
        error: 'Airweave client not configured. Please set API key and collection ID.',
      };
    }

    try {
      const response = await this.makeSearchRequest(options);
      const processingTime = Date.now() - startTime;

      return {
        success: true,
        query: options.query,
        searchType: options.searchType || 'hybrid',
        results: response.results || [],
        totalResults: response.results?.length || 0,
        processingTime,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      console.error('\n❌ Airweave API Error:', errorMessage);
      return {
        success: false,
        query: options.query,
        searchType: options.searchType || 'hybrid',
        results: [],
        totalResults: 0,
        error: errorMessage,
      };
    }
  }

  /**
   * Make HTTP request to Airweave Search API
   */
  private async makeSearchRequest(options: SearchOptions): Promise<{ results: SearchResult[] }> {
    const url = `${this.baseUrl}/collections/${this.collectionId}/search`;

    const requestBody = {
      query: options.query,
      search_type: options.searchType || 'hybrid',
      limit: options.limit || appConfig.maxResults,
    };

    console.log(`\n📡 Requesting: POST ${url}`);
    console.log(`   Body:`, JSON.stringify(requestBody));

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': this.apiKey,
      },
      body: JSON.stringify(requestBody),
    });

    console.log(`   Status: ${response.status} ${response.statusText}`);

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`   Response: ${errorText}`);
      throw new Error(`Airweave API error (${response.status}): ${errorText}`);
    }

    const data = await response.json();
    console.log(`   Raw response type: ${typeof data}`);
    console.log(`   Raw response preview:`, JSON.stringify(data).slice(0, 500));

    // Transform Airweave response to our SearchResult format
    return this.transformResponse(data);
  }

  /**
   * Transform Airweave API response to SearchResult format
   */
  private transformResponse(data: unknown): { results: SearchResult[] } {
    // Handle different possible response formats from Airweave
    let rawResults: unknown[] = [];

    if (Array.isArray(data)) {
      rawResults = data;
    } else if (data && typeof data === 'object') {
      const obj = data as Record<string, unknown>;
      // Try common response structures
      if (Array.isArray(obj.results)) {
        rawResults = obj.results;
      } else if (Array.isArray(obj.data)) {
        rawResults = obj.data;
      } else if (Array.isArray(obj.items)) {
        rawResults = obj.items;
      } else if (Array.isArray(obj.hits)) {
        rawResults = obj.hits;
      } else if (Array.isArray(obj.documents)) {
        rawResults = obj.documents;
      } else {
        // Maybe the whole object is a single result?
        console.log('   ⚠️  Unknown response structure, keys:', Object.keys(obj));
      }
    }

    if (rawResults.length === 0) {
      console.log('   ⚠️  No results found in response');
    }

    const results: SearchResult[] = rawResults.map((item, index) => {
      const obj = item as Record<string, unknown>;
      
      // Try to extract content from various possible fields
      const content = String(
        obj.content || 
        obj.text || 
        obj.body || 
        obj.document || 
        obj.page_content ||
        obj.chunk ||
        obj.data ||
        JSON.stringify(obj)
      );

      return {
        id: String(obj.id || obj._id || obj.entity_id || index),
        content,
        source: String(obj.source || obj.source_name || obj.collection || 'notion'),
        sourceType: String(obj.source_type || obj.type || 'notion'),
        score: Number(obj.score || obj.relevance_score || obj._score || obj.similarity || 1),
        metadata: obj.metadata as Record<string, unknown> | undefined,
        url: obj.url as string | undefined,
        title: obj.title as string | undefined || obj.name as string | undefined,
        createdAt: obj.created_at as string | undefined || obj.createdAt as string | undefined,
        updatedAt: obj.updated_at as string | undefined || obj.updatedAt as string | undefined,
      };
    });

    return { results };
  }

  /**
   * List available collections (for debugging)
   */
  async listCollections(): Promise<unknown[]> {
    const url = `${this.baseUrl}/collections`;

    console.log(`\n📡 Listing collections: GET ${url}`);

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': this.apiKey,
      },
    });

    console.log(`   Status: ${response.status} ${response.statusText}`);

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to list collections: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    console.log(`   Collections:`, JSON.stringify(data, null, 2));
    return data as unknown[];
  }

  /**
   * Test connection to Airweave
   */
  async testConnection(): Promise<{ success: boolean; message: string }> {
    try {
      const collections = await this.listCollections();
      return {
        success: true,
        message: `Connected successfully. Found ${Array.isArray(collections) ? collections.length : 0} collections.`,
      };
    } catch (error) {
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Connection failed',
      };
    }
  }
}

// Export singleton instance
export const airweaveClient = new AirweaveClient();

export default AirweaveClient;
