#!/usr/bin/env node
/**
 * Airweave Notion Search POC
 * Terminal-based interface for searching Notion data via Airweave
 */

import * as readline from 'readline';
import { config } from 'dotenv';
import { resolve } from 'path';

// Load environment variables first
config({ path: resolve(process.cwd(), '.env') });

import { appConfig, isConfigValid, printConfig } from './config/env.js';
import { airweaveClient } from './lib/airweave.js';
import { searchService } from './services/search-service.js';
import { aiService } from './services/ai-service.js';
import type { CLIState, SearchType, OutputFormat, SearchResult } from './types/index.js';

/**
 * CLI Application
 */
class AirweaveCLI {
  private rl: readline.Interface;
  private state: CLIState;
  private running: boolean = true;

  constructor() {
    this.rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    this.state = {
      outputFormat: appConfig.defaultOutputFormat,
      searchType: appConfig.defaultSearchType,
      enhanceQueries: false,
    };
  }

  /**
   * Start the CLI
   */
  async start(): Promise<void> {
    this.printWelcome();
    this.checkConfiguration();

    while (this.running) {
      try {
        const input = await this.prompt();
        await this.handleInput(input);
      } catch (error) {
        console.error('\n❌ Error:', error instanceof Error ? error.message : error);
      }
    }

    this.rl.close();
  }

  /**
   * Print welcome message
   */
  private printWelcome(): void {
    console.log('\n');
    console.log('╔════════════════════════════════════════════════════════════╗');
    console.log('║           🔍 Airweave Notion Search POC                    ║');
    console.log('║     Search your Notion workspace using semantic AI         ║');
    console.log('╚════════════════════════════════════════════════════════════╝');
    console.log('\nType your search query or use commands:');
    console.log('  • Type any text to search your Notion data');
    console.log('  • /help    - Show available commands');
    console.log('  • /config  - View current configuration');
    console.log('  • /debug   - Debug connection to Airweave');
    console.log('  • /collections - List your collections');
    console.log('  • /outputs - Open outputs folder');
    console.log('  • /type    - Change search type (hybrid/semantic/keyword)');
    console.log('  • /clear   - Clear terminal screen');
    console.log('  • /exit    - Exit the application');
    console.log('');
  }

  /**
   * Check and display configuration status
   */
  private checkConfiguration(): void {
    const { valid, missing } = isConfigValid();

    if (!valid) {
      console.log('⚠️  Configuration incomplete. Missing:');
      missing.forEach(key => console.log(`   - ${key}`));
      console.log('\n   Please set these values in your .env file or use /set command.');
      console.log('   You can still use the CLI to configure via commands.\n');
    } else {
      console.log('✅ Configuration complete. Ready to search!\n');
    }
  }

  /**
   * Prompt user for input
   */
  private prompt(): Promise<string> {
    return new Promise((resolve) => {
      this.rl.question('🔍 > ', (input) => {
        resolve(input.trim());
      });
    });
  }

  /**
   * Handle user input
   */
  private async handleInput(input: string): Promise<void> {
    if (!input) return;

    // Check for commands
    if (input.startsWith('/')) {
      await this.handleCommand(input);
      return;
    }

    // Treat as search query
    await this.performSearch(input);
  }

  /**
   * Handle slash commands
   */
  private async handleCommand(command: string): Promise<void> {
    const parts = command.split(/\s+/);
    const cmd = parts[0].toLowerCase();
    const args = parts.slice(1);

    switch (cmd) {
      case '/help':
        this.showHelp();
        break;

      case '/config':
        printConfig();
        break;

      case '/debug':
        await this.debugConnection();
        break;

      case '/collections':
      case '/cols':
        await this.listCollections();
        break;

      case '/outputs':
      case '/output':
        this.showOutputLocation();
        break;

      case '/type':
        if (args[0]) {
          const type = args[0].toLowerCase() as SearchType;
          if (type === 'hybrid' || type === 'semantic' || type === 'keyword') {
            this.state.searchType = type;
            console.log(`✅ Search type set to: ${type}`);
          } else {
            console.log('❌ Invalid type. Use: hybrid, semantic, or keyword');
          }
        } else {
          console.log(`Current search type: ${this.state.searchType}`);
          console.log('Usage: /type [hybrid|semantic|keyword]');
        }
        break;

      case '/set':
        await this.handleSetCommand(args);
        break;

      case '/clear':
        console.clear();
        break;

      case '/exit':
      case '/quit':
      case '/q':
        this.running = false;
        console.log('\n👋 Goodbye! Thanks for using Airweave Notion Search.\n');
        break;

      default:
        console.log(`❌ Unknown command: ${cmd}`);
        console.log('Type /help for available commands.');
    }
  }

  /**
   * Show output folder location
   */
  private showOutputLocation(): void {
    const outputDir = searchService.getOutputDir();
    console.log(`\n📁 Output folder: ${outputDir}\n`);
  }

  /**
   * Debug connection to Airweave
   */
  private async debugConnection(): Promise<void> {
    console.log('\n🔧 Running diagnostics...\n');
    
    airweaveClient.debugConfig();

    if (!airweaveClient.isConfigured()) {
      console.log('\n❌ Cannot test connection: Missing API key or collection ID');
      return;
    }

    console.log('\n📡 Testing connection to Airweave...');
    const result = await airweaveClient.testConnection();
    
    if (result.success) {
      console.log(`✅ ${result.message}`);
    } else {
      console.log(`❌ ${result.message}`);
    }
  }

  /**
   * List available collections
   */
  private async listCollections(): Promise<void> {
    console.log('\n📋 Fetching collections...\n');

    if (!airweaveClient.isConfigured()) {
      console.log('❌ Missing API key. Use /set api-key <key> first.');
      return;
    }

    try {
      await airweaveClient.listCollections();
    } catch (error) {
      console.log('❌ Failed to list collections:', error instanceof Error ? error.message : error);
    }
  }

  /**
   * Handle /set command for configuration
   */
  private async handleSetCommand(args: string[]): Promise<void> {
    if (args.length < 2) {
      console.log('Usage: /set <key> <value>');
      console.log('Available keys: api-key, collection-id');
      return;
    }

    const key = args[0].toLowerCase();
    const value = args.slice(1).join(' ');

    switch (key) {
      case 'api-key':
      case 'apikey':
        airweaveClient.setApiKey(value);
        appConfig.airweaveApiKey = value;
        console.log('✅ Airweave API key updated');
        break;

      case 'collection-id':
      case 'collectionid':
      case 'collection':
        airweaveClient.setCollectionId(value);
        appConfig.airweaveCollectionId = value;
        console.log('✅ Collection ID updated');
        break;

      default:
        console.log(`❌ Unknown setting: ${key}`);
        console.log('Available: api-key, collection-id');
    }
  }

  /**
   * Show help message
   */
  private showHelp(): void {
    console.log('\n📖 Available Commands:');
    console.log('─'.repeat(40));
    console.log('  <query>       - Search your Notion data');
    console.log('                  (results saved to outputs/ folder)');
    console.log('  /help         - Show this help message');
    console.log('  /config       - View current configuration');
    console.log('  /debug        - Debug Airweave connection');
    console.log('  /collections  - List your collections');
    console.log('  /outputs      - Show output folder location');
    console.log('  /type <type>  - Set search type');
    console.log('                  (hybrid/semantic/keyword)');
    console.log('  /set <k> <v>  - Set configuration value');
    console.log('                  (api-key, collection-id)');
    console.log('  /clear        - Clear terminal screen');
    console.log('  /exit         - Exit the application');
    console.log('─'.repeat(40));
    console.log('\n📊 Current Settings:');
    console.log(`  Search Type: ${this.state.searchType}`);
    console.log(`  Output Folder: ${searchService.getOutputDir()}`);
  }

  /**
   * Perform search operation
   */
  private async performSearch(query: string): Promise<void> {
    console.log('\n🔄 Searching...');

    // Execute search
    const response = await searchService.search({
      query: query,
      searchType: this.state.searchType,
    });

    // Check for errors
    if (!response.success) {
      console.log(`\n❌ Search failed: ${response.error}`);
      return;
    }

    console.log(`   Found ${response.totalResults} results`);

    // Generate AI summary if we have results
    let aiSummary: string | undefined;
    let keyPoints: string[] | undefined;
    
    if (response.results.length > 0 && aiService.isConfigured()) {
      console.log('🤖 Generating AI summary...');
      const summary = await aiService.summarizeResults(response.results, query);
      aiSummary = summary.summary;
      keyPoints = summary.keyPoints;
    }

    // Save results to file
    const filePath = searchService.saveResultsToFile(query, response, aiSummary, keyPoints);

    // Show success message with file location
    console.log('\n✅ Search complete!');
    console.log(`📄 View your results in: ${filePath}`);
    console.log('');

    // Store last search
    this.state.lastQuery = query;
    this.state.lastResults = response.results;
  }
}

/**
 * Main entry point
 */
async function main(): Promise<void> {
  const cli = new AirweaveCLI();

  // Handle Ctrl+C gracefully
  process.on('SIGINT', () => {
    console.log('\n\n👋 Goodbye! Thanks for using Airweave Notion Search.\n');
    process.exit(0);
  });

  // Handle uncaught errors
  process.on('uncaughtException', (error) => {
    console.error('\n❌ Unexpected error:', error.message);
    process.exit(1);
  });

  await cli.start();
}

// Run the CLI
main().catch((error) => {
  console.error('Failed to start CLI:', error);
  process.exit(1);
});

export { AirweaveCLI };
