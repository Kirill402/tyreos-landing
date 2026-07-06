export const RATE_LIMITS = {
  sessionChatMax: 25, // chat turns per session per day
  globalDailyMax: 500, // total LLM calls (chat + analyst) per day — the wallet ceiling
} as const;

export interface RateLimitInput {
  sessionChatCount: number;
  globalDailyCount: number;
}

export interface RateLimitResult {
  allowed: boolean;
  reason?: 'global_daily' | 'session';
}

export function checkChatRateLimit(input: RateLimitInput): RateLimitResult {
  if (input.globalDailyCount >= RATE_LIMITS.globalDailyMax) {
    return { allowed: false, reason: 'global_daily' };
  }
  if (input.sessionChatCount >= RATE_LIMITS.sessionChatMax) {
    return { allowed: false, reason: 'session' };
  }
  return { allowed: true };
}
