/**
 * Smart Router
 *
 * 5-category query classification using Gemini Flash.
 * Routes: RAG, Web, Memory, Casual, Dashboard
 *
 * Ported from Holy Grail Chat (HGC) with 9.5/10 confidence.
 * Part of: 3-System Consolidation
 */

import { withTimeout } from '@/lib/security';
import type { RouteType, RouterDecision } from './types';

const ROUTER_TIMEOUT_MS = 10000; // 10 second timeout for routing decisions

/**
 * Route definitions with descriptions
 */
const ROUTE_DEFINITIONS: Record<RouteType, { description: string; examples: string[] }> = {
  rag: {
    description: 'Questions about client data, documents, or knowledge base',
    examples: ['What does the contract say?', 'Tell me about client X'],
  },
  web: {
    description: 'Questions needing current web information',
    examples: ['Latest marketing trends', 'News about competitor'],
  },
  memory: {
    description: 'Questions about past conversations or preferences',
    examples: ['What did we discuss?', 'Remind me of that client'],
  },
  dashboard: {
    description: 'Requests to view/navigate to data or execute actions',
    examples: ['Show me at-risk clients', 'Open alerts'],
  },
  casual: {
    description: 'General conversation, greetings, or unclear intent',
    examples: ['Hello', 'Thanks', 'What can you do?'],
  },
};

/**
 * Classification prompt for Gemini
 */
function buildClassificationPrompt(query: string): string {
  const routeDescriptions = Object.entries(ROUTE_DEFINITIONS)
    .map(([type, def]) => `${type.toUpperCase()}: ${def.description}\nExamples: ${def.examples.join(', ')}`)
    .join('\n\n');

  return `You are a query classifier for a marketing agency AI assistant.

Classify the following user query into exactly ONE of these route types:

${routeDescriptions}

USER QUERY: "${query}"

Respond with a JSON object (no markdown):
{
  "route": "rag" | "web" | "memory" | "casual" | "dashboard",
  "confidence": 0.0-1.0,
  "reasoning": "brief explanation"
}

Rules:
- Choose the MOST specific route that applies
- RAG for agency/client data queries
- WEB for current trends/news/external info
- MEMORY for "we discussed", "you said", "remind me"
- DASHBOARD for navigation commands like "show", "open", "go to"
- CASUAL for greetings, thanks, general chat`;
}

/**
 * Quick pattern matching for obvious queries (no API call needed)
 */
function quickClassify(query: string): RouterDecision | null {
  const lowerQuery = query.toLowerCase().trim();

  // Dashboard navigation patterns
  const dashboardPatterns = [
    /^(show|open|go to|navigate to|display)\s/,
    /^(take me to|bring up)\s/,
    /(at.risk|at risk)\s*(clients?)?/,
    /clients?\s+with\s+(red|yellow|green)/,
  ];
  if (dashboardPatterns.some((p) => p.test(lowerQuery))) {
    return {
      route: 'dashboard',
      confidence: 0.95,
      reasoning: 'Navigation or data command detected',
    };
  }

  // Memory patterns
  const memoryPatterns = [
    /we (discussed|talked about)/,
    /you (said|told|mentioned)/,
    /remind me/,
    /last (time|session|conversation)/,
  ];
  if (memoryPatterns.some((p) => p.test(lowerQuery))) {
    return {
      route: 'memory',
      confidence: 0.95,
      reasoning: 'Memory reference detected',
    };
  }

  // Casual greetings
  const casualPatterns = [
    /^(hi|hello|hey|thanks|thank you|bye|goodbye)[\s!.,]*$/,
    /^(how are you|what can you do|help)[\s?]*$/,
  ];
  if (casualPatterns.some((p) => p.test(lowerQuery))) {
    return {
      route: 'casual',
      confidence: 0.98,
      reasoning: 'Greeting or simple phrase',
    };
  }

  // Web search patterns
  const webPatterns = [
    /(latest|recent|new|current|today)/,
    /(news|update|trend)/,
    /(industry|market|competitor)/,
  ];
  const webMatch = webPatterns.filter((p) => p.test(lowerQuery)).length;
  if (webMatch >= 2) {
    return {
      route: 'web',
      confidence: 0.85,
      reasoning: 'Multiple web search indicators',
    };
  }

  return null;
}

/**
 * Route a query using Gemini classification
 */
export async function routeQuery(
  query: string,
  geminiApiKey: string
): Promise<RouterDecision> {
  // Try quick pattern matching first
  const quickResult = quickClassify(query);
  if (quickResult && quickResult.confidence >= 0.9) {
    return quickResult;
  }

  const prompt = buildClassificationPrompt(query);

  try {
    const response = await withTimeout(
      fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-001:generateContent?key=${geminiApiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ role: 'user', parts: [{ text: prompt }] }],
            generationConfig: {
              temperature: 0.1,
              maxOutputTokens: 200,
            },
          }),
        }
      ),
      ROUTER_TIMEOUT_MS,
      'Router classification timed out'
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error?.message || `Gemini API error: ${response.status}`);
    }

    const data = await response.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || '';

    // Parse JSON response
    let jsonStr = text;
    if (jsonStr.startsWith('```')) {
      jsonStr = jsonStr.replace(/```json?\n?/g, '').replace(/```/g, '');
    }

    const parsed = JSON.parse(jsonStr);
    const validRoutes: RouteType[] = ['rag', 'web', 'memory', 'casual', 'dashboard'];
    const route = validRoutes.includes(parsed.route) ? parsed.route : 'casual';

    return {
      route,
      confidence: Math.max(0, Math.min(1, Number(parsed.confidence) || 0.5)),
      reasoning: parsed.reasoning || 'Classified by Gemini',
    };
  } catch {
    // Fall back to quick result or casual
    return quickResult || {
      route: 'casual',
      confidence: 0.4,
      reasoning: 'Classification failed, using fallback',
    };
  }
}
