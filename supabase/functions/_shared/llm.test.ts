import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildChatRequest, parseAssistantMessage, type ChatMessage, type ToolSchema } from './llm.ts';

const tools: ToolSchema[] = [
  { type: 'function', function: { name: 'noop', description: 'x', parameters: { type: 'object', properties: {} } } },
];

test('buildChatRequest produces an OpenAI-compatible body', () => {
  const msgs: ChatMessage[] = [{ role: 'user', content: 'привет' }];
  const body = buildChatRequest('deepseek-chat', msgs, tools);
  assert.equal(body.model, 'deepseek-chat');
  assert.equal(body.tool_choice, 'auto');
  assert.deepEqual(body.messages, msgs);
  assert.equal(body.tools, tools);
});

test('parseAssistantMessage extracts plain content and empty toolCalls', () => {
  const parsed = parseAssistantMessage({ choices: [{ message: { content: 'здравствуйте' } }] });
  assert.equal(parsed.content, 'здравствуйте');
  assert.deepEqual(parsed.toolCalls, []);
});

test('parseAssistantMessage extracts tool_calls', () => {
  const parsed = parseAssistantMessage({
    choices: [{ message: { content: null, tool_calls: [{ id: 'c1', type: 'function', function: { name: 'list_services', arguments: '{}' } }] } }],
  });
  assert.equal(parsed.content, null);
  assert.equal(parsed.toolCalls.length, 1);
  assert.equal(parsed.toolCalls[0].function.name, 'list_services');
});

test('parseAssistantMessage is tolerant of a malformed response', () => {
  const parsed = parseAssistantMessage({});
  assert.equal(parsed.content, null);
  assert.deepEqual(parsed.toolCalls, []);
});
