export interface ToolCall {
  id: string;
  type: 'function';
  function: { name: string; arguments: string };
}

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string | null;
  tool_calls?: ToolCall[];
  tool_call_id?: string;
}

export interface ToolSchema {
  type: 'function';
  function: { name: string; description: string; parameters: unknown };
}

export function buildChatRequest(model: string, messages: ChatMessage[], tools: ToolSchema[]) {
  return {
    model,
    messages,
    tools,
    tool_choice: 'auto' as const,
    temperature: 0.3,
  };
}

export interface ParsedAssistant {
  content: string | null;
  toolCalls: ToolCall[];
}

export function parseAssistantMessage(responseJson: unknown): ParsedAssistant {
  const msg = (responseJson as any)?.choices?.[0]?.message ?? {};
  return {
    content: typeof msg.content === 'string' ? msg.content : null,
    toolCalls: Array.isArray(msg.tool_calls) ? (msg.tool_calls as ToolCall[]) : [],
  };
}
