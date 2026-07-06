import { test } from 'node:test';
import assert from 'node:assert/strict';
import { checkChatRateLimit, RATE_LIMITS } from './ratelimit.ts';

test('allows a fresh session under both caps', () => {
  assert.deepEqual(checkChatRateLimit({ sessionChatCount: 0, globalDailyCount: 0 }), { allowed: true });
});

test('blocks when the session cap is reached', () => {
  const r = checkChatRateLimit({ sessionChatCount: RATE_LIMITS.sessionChatMax, globalDailyCount: 10 });
  assert.equal(r.allowed, false);
  assert.equal(r.reason, 'session');
});

test('global cap takes precedence over the session cap', () => {
  const r = checkChatRateLimit({ sessionChatCount: RATE_LIMITS.sessionChatMax, globalDailyCount: RATE_LIMITS.globalDailyMax });
  assert.equal(r.allowed, false);
  assert.equal(r.reason, 'global_daily');
});
