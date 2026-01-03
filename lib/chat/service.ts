/**
 * Chat Service
 *
 * Main orchestrator for chat interactions with Gemini.
 * Handles routing and responses.
 *
 * Ported from Holy Grail Chat (HGC) with 9.5/10 confidence.
 * Part of: 3-System Consolidation
 */

import { routeQuery } from './router';
import { hgcFunctions, executeFunction } from './functions';
import type {
  ChatMessage,
  ChatServiceConfig,
  RouterDecision,
  SessionContext,
  StreamChunk,
  ChatError,
  FunctionCall,
} from './types';

const DEFAULT_MODEL = 'gemini-2.0-flash-001';

/**
 * Generate unique ID
 */
function generateId(): string {
  return crypto.randomUUID();
}

/**
 * Dashboard system prompt for function calling
 */
const DASHBOARD_SYSTEM_PROMPT = `You are Chi, an AI assistant for a marketing agency management platform.

You have access to the following functions to query and interact with the platform:
- get_clients: List clients with optional filters (stage, health_status)
- get_client_details: Get detailed info about a specific client
- get_alerts: List alerts with optional filters (severity, status, type)
- get_recent_communications: Get recent communications for a client
- get_agency_stats: Get agency-wide statistics
- navigate_to: Navigate to a page in the application

When the user asks about clients, alerts, statistics, or wants to navigate:
1. Call the appropriate function(s) to get the data
2. Analyze the results
3. Provide a clear, helpful summary

Always be concise and actionable. If something requires attention, highlight it.`;

/**
 * Chat Service class
 */
export class ChatService {
  private config: ChatServiceConfig;

  constructor(config: ChatServiceConfig) {
    this.config = config;
  }

  /**
   * Process a chat message and return a response
   */
  async processMessage(
    userMessage: string,
    history: ChatMessage[]
  ): Promise<ChatMessage> {
    const startTime = Date.now();

    // 1. Route the query
    const decision = await routeQuery(userMessage, this.config.geminiApiKey);

    // 2. Handle based on route
    let response: string;
    let functionCalls: FunctionCall[] | undefined;

    switch (decision.route) {
      case 'dashboard': {
        const dashResult = await this.handleDashboardRoute(userMessage);
        response = dashResult.response;
        functionCalls = dashResult.functionCalls;
        break;
      }

      case 'rag':
        // TODO: Implement RAG (document search) handler
        response = "I'd like to help you search through documents, but the knowledge base search feature isn't available yet. I can still help answer general questions about your clients and data.";
        break;

      case 'web':
        // TODO: Implement web search handler
        response = "I'd like to search the web for you, but external search isn't available yet. I can help with questions about your agency data and clients instead.";
        break;

      case 'memory':
        // TODO: Implement memory/session context handler
        response = "I don't have access to our previous conversation history yet. This feature is coming soon! For now, please provide the context you need in your message.";
        break;

      case 'casual':
      default:
        response = await this.handleCasualRoute(userMessage, history);
        break;
    }

    return {
      id: generateId(),
      role: 'assistant',
      content: response,
      timestamp: new Date(),
      route: decision.route,
      metadata: {
        latencyMs: Date.now() - startTime,
        model: DEFAULT_MODEL,
        functionCalls,
      },
    };
  }

  /**
   * Handle dashboard route with function calling
   */
  private async handleDashboardRoute(
    message: string
  ): Promise<{ response: string; functionCalls?: FunctionCall[] }> {
    try {
      // Call Gemini with function declarations
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${DEFAULT_MODEL}:generateContent?key=${this.config.geminiApiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [
              { role: 'user', parts: [{ text: DASHBOARD_SYSTEM_PROMPT }] },
              { role: 'user', parts: [{ text: message }] },
            ],
            tools: [{ functionDeclarations: hgcFunctions }],
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error?.message || `Gemini API error: ${response.status}`);
      }

      const data = await response.json();
      const candidate = data.candidates?.[0];
      const parts = candidate?.content?.parts || [];

      // Process function calls
      const functionResults: Array<{ name: string; result: unknown }> = [];
      const functionCalls: FunctionCall[] = [];

      for (const part of parts) {
        if (part.functionCall) {
          const functionName = part.functionCall.name;
          const functionArgs = part.functionCall.args || {};

          try {
            const result = await executeFunction(
              functionName,
              { agencyId: this.config.agencyId, userId: this.config.userId },
              functionArgs
            );

            functionResults.push({ name: functionName, result });
            functionCalls.push({
              name: functionName,
              args: functionArgs,
              result,
              success: true,
            });
          } catch (error) {
            console.error(`Function ${functionName} failed:`, error);
            functionCalls.push({
              name: functionName,
              args: functionArgs,
              success: false,
            });
          }
        }
      }

      // If we got function calls, get a final summary from Gemini
      if (functionResults.length > 0) {
        const functionResponseContent = functionResults
          .map((fr) => `Function ${fr.name} returned:\n${JSON.stringify(fr.result, null, 2)}`)
          .join('\n\n');

        const finalResponse = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${DEFAULT_MODEL}:generateContent?key=${this.config.geminiApiKey}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [
                { role: 'user', parts: [{ text: DASHBOARD_SYSTEM_PROMPT }] },
                { role: 'user', parts: [{ text: message }] },
                {
                  role: 'model',
                  parts: [{ text: `I called the necessary functions. Here are the results:\n\n${functionResponseContent}` }],
                },
                {
                  role: 'user',
                  parts: [{ text: 'Please provide a clear, helpful summary of this data for the user.' }],
                },
              ],
            }),
          }
        );

        if (!finalResponse.ok) {
          const errorData = await finalResponse.json().catch(() => ({}));
          throw new Error(errorData.error?.message || `Gemini API error: ${finalResponse.status}`);
        }

        const finalData = await finalResponse.json();
        const finalText = finalData.candidates?.[0]?.content?.parts?.[0]?.text || '';

        return { response: finalText, functionCalls };
      }

      // If no function calls, return direct response
      const directText = parts.find((p: { text?: string }) => p.text)?.text || '';
      if (directText) {
        return { response: directText };
      }

      return {
        response:
          'I understand you want to see dashboard information. Could you be more specific? Try:\n\n- "Show me at-risk clients"\n- "What are my open alerts?"\n- "Give me agency statistics"',
      };
    } catch (error) {
      console.error('Dashboard route error:', error);
      return {
        response: 'Sorry, I had trouble processing that request. Please try again.',
      };
    }
  }

  /**
   * Handle casual/general conversation
   */
  private async handleCasualRoute(
    message: string,
    history: ChatMessage[]
  ): Promise<string> {
    const systemPrompt = `You are Chi, a helpful AI assistant for a marketing agency management platform.
Be concise, friendly, and helpful. If the user asks about clients, alerts, or data, suggest they ask more specifically.`;

    // Build conversation history
    const conversationHistory = history.slice(-10).map((msg) => ({
      role: msg.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: msg.content }],
    }));

    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${DEFAULT_MODEL}:generateContent?key=${this.config.geminiApiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [
              { role: 'user', parts: [{ text: systemPrompt }] },
              ...conversationHistory,
              { role: 'user', parts: [{ text: message }] },
            ],
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error?.message || `Gemini API error: ${response.status}`);
      }

      const data = await response.json();
      return data.candidates?.[0]?.content?.parts?.[0]?.text || "I'm not sure how to respond to that.";
    } catch (error) {
      console.error('Casual route error:', error);
      return 'Sorry, I had trouble processing that. Please try again.';
    }
  }
}
