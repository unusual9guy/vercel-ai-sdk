# Airweave Notion Search POC

A command-line interface for searching your Notion workspace using Airweave's semantic search capabilities, enhanced with AI-powered query optimization and result processing.

## 🚀 Features

- **Semantic Search**: Search your Notion data using natural language
- **AI Enhancement**: Query expansion and optimization using Google Gemini
- **Smart Re-ranking**: AI-powered result relevance ranking
- **Result Summaries**: Auto-generated summaries of search results
- **Multiple Search Types**: Hybrid (default), semantic, or keyword search
- **Flexible Output**: JSON or human-readable text format
- **Interactive CLI**: Easy-to-use terminal interface

## 📋 Prerequisites

- Node.js 18+ or Bun
- Airweave account with Notion connected
- Google Gemini API key (for AI enhancement)
- Your Airweave collection ID

## 📦 Installation

### Step 1: Install Dependencies

```bash
cd airweave-poc

# Using npm
npm install

# Using bun
bun install
```

### Step 2: Configure Environment

1. Copy the example environment file:
   ```bash
   cp .env.example .env
   ```

2. Edit `.env` with your credentials:
   ```env
   # Required
   AIRWEAVE_API_KEY=your_airweave_api_key
   AIRWEAVE_COLLECTION_ID=your_collection_readable_id
   GOOGLE_GENERATIVE_AI_API_KEY=your_gemini_api_key
   ```

### Step 3: Get Your Credentials

#### Airweave API Key
1. Go to [Airweave Dashboard](https://app.airweave.ai)
2. Navigate to Settings → API Keys
3. Create or copy your API key

#### Collection ID
1. In Airweave Dashboard, go to Collections
2. Find your Notion collection
3. Copy the `readable_id` (e.g., `my-notion-workspace`)

#### Google Gemini API Key
1. Go to [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Create an API key
3. Copy the key

## 🎮 Usage

### Start the CLI

```bash
# Using npm
npm run dev

# Using bun
bun run dev

# Or directly with tsx
npx tsx src/cli.ts
```

### Basic Search

Simply type your search query and press Enter:

```
🔍 > meeting notes from last week

🔄 Searching...
🤖 Enhancing query with AI...
   Original: "meeting notes from last week"
   Enhanced: "meeting notes weekly discussion agenda action items decisions"

📊 SEARCH RESULTS
════════════════════════════════════════════════════════════
...
```

### Available Commands

| Command | Description |
|---------|-------------|
| `<query>` | Search your Notion data |
| `/help` | Show available commands |
| `/config` | View current configuration |
| `/format [json\|text]` | Toggle or set output format |
| `/type [hybrid\|semantic\|keyword]` | Set search type |
| `/enhance` | Toggle AI query enhancement |
| `/set api-key <key>` | Set Airweave API key |
| `/set collection-id <id>` | Set collection ID |
| `/clear` | Clear terminal screen |
| `/exit` | Exit the application |

### Search Types

- **hybrid** (default): Combines semantic and keyword search for best results
- **semantic**: Pure vector similarity search, great for conceptual queries
- **keyword**: Traditional text matching, useful for exact terms

### Output Formats

#### JSON Format
```json
{
  "success": true,
  "query": "project timeline",
  "searchType": "hybrid",
  "totalResults": 5,
  "results": [
    {
      "index": 1,
      "title": "Q4 Project Plan",
      "source": "notion",
      "score": "0.8923",
      "content": "..."
    }
  ]
}
```

#### Text Format
```
════════════════════════════════════════════════════════════
📊 SEARCH RESULTS
════════════════════════════════════════════════════════════
Query: "project timeline"
Search Type: hybrid
Total Results: 5
────────────────────────────────────────────────────────────

📌 Result 1
────────────────────────────────────
Source: notion
Score: 0.8923
Title: Q4 Project Plan

Content:
...
```

## 🔧 Architecture

```
src/
├── config/
│   └── env.ts           # Environment configuration
├── lib/
│   └── airweave.ts      # Airweave API client
├── services/
│   ├── ai-service.ts    # AI enhancement with Gemini
│   └── search-service.ts # Search operations
├── types/
│   └── index.ts         # TypeScript types
└── cli.ts               # Main CLI entry point
```

## 🔄 Workflow

```
User Input
    ↓
[CLI] Capture query
    ↓
[AI Service] Query Enhancement
    - Expand with synonyms
    - Add context
    - Extract keywords
    ↓
[Airweave] Semantic Search
    - POST /collections/{id}/search
    - Hybrid/semantic/keyword mode
    ↓
[AI Service] Post-processing
    - Re-rank by relevance
    - Generate summary
    ↓
[Formatter] Output
    - JSON or text format
    ↓
[CLI] Display to user
```

## 🧩 Extending the POC

### Adding Data to Notion (Future)

The architecture supports adding data through Airweave's API:

```typescript
// Future implementation
await airweaveClient.addData({
  collectionId: 'your-collection',
  content: 'New content to add',
  metadata: { source: 'manual' }
});
```

### Switching LLM Providers

The application supports three LLM providers: Google Gemini, OpenAI, and Anthropic.

To switch providers:

1. Update `.env`:
   ```env
   # For OpenAI
   LLM_PROVIDER=openai
   OPENAI_API_KEY=your_key
   
   # For Anthropic
   LLM_PROVIDER=anthropic
   ANTHROPIC_API_KEY=your_key
   
   # For Google Gemini (default)
   LLM_PROVIDER=google
   GOOGLE_GENERATIVE_AI_API_KEY=your_key
   ```

2. The AI service will automatically use the configured provider.

**Default Models:**
- Google: `gemini-1.5-flash`
- OpenAI: `gpt-4-turbo-preview`
- Anthropic: `claude-3-haiku-20240307`

Note: All provider packages are already included in the project dependencies.

## 🐛 Troubleshooting

### "Configuration incomplete"
- Ensure all required environment variables are set
- Check that your `.env` file is in the project root

### "Airweave API error (401)"
- Verify your `AIRWEAVE_API_KEY` is correct
- Check if your API key has expired

### "Collection not found"
- Confirm your `AIRWEAVE_COLLECTION_ID` is correct
- Ensure the collection exists in your Airweave dashboard

### "AI enhancement failed"
- Check your `GOOGLE_GENERATIVE_AI_API_KEY`
- Verify you have API quota available

### Slow searches
- Try using `keyword` search type for faster results
- Disable AI enhancement with `/enhance` command

## 📚 Dependencies

| Package | Purpose |
|---------|---------|
| `ai` | Vercel AI SDK core |
| `@airweave/sdk` | Airweave TypeScript client |
| `@ai-sdk/google` | Google Gemini provider |
| `@ai-sdk/openai` | OpenAI provider |
| `@ai-sdk/anthropic` | Anthropic provider |
| `dotenv` | Environment variables |
| `chalk` | Terminal colors |
| `ora` | Loading spinners |

## 📄 License

MIT

## 🙏 Credits

- [Airweave](https://airweave.ai) - Context retrieval layer
- [Vercel AI SDK](https://ai-sdk.dev) - AI integration framework
- [Google Gemini](https://ai.google.dev) - LLM provider
