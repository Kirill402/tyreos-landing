import { createClient } from 'npm:@supabase/supabase-js@2';
import { corsHeaders, handleCors } from '../_shared/cors.ts';
import { createSupabaseRepo } from '../_shared/repo.ts';
import { TOOL_SCHEMAS, runTool } from '../_shared/tools.ts';
import { buildChatRequest, parseAssistantMessage, type ChatMessage } from '../_shared/llm.ts';
import { checkChatRateLimit } from '../_shared/ratelimit.ts';
import { shopLocalDateStr } from '../_shared/datetime.ts';

const MAX_TOOL_ROUNDS = 5;

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

function startOfUtcDayIso(): string {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())).toISOString();
}

function limitMessage(reason?: string): string {
  return reason === 'global_daily'
    ? 'Демо-лимит на сегодня исчерпан — загляните завтра, пожалуйста.'
    : 'Вы задали много вопросов в этой сессии. Обновите страницу, чтобы начать заново.';
}

function systemPrompt(todayStr: string): string {
  return [
    'Ты — вежливый администратор шиномонтажа TYREOS. Сегодня ' + todayStr + ' (часовой пояс МСК).',
    'Отвечай кратко, по-русски. Помоги клиенту записаться на услугу.',
    'Сначала пойми услугу: для шиномонтажа уточни диаметр колёс (например R17), чтобы выбрать нужную услугу.',
    'Используй инструменты: list_services — показать услуги; get_available_slots — свободное время; create_booking — создать запись.',
    'Вызывай create_booking только после того, как клиент подтвердил имя, телефон, услугу и конкретное время из предложенных слотов.',
    'Не выдумывай услуги, цены и свободное время — бери их только из инструментов.',
  ].join(' ');
}

Deno.serve(async (req: Request) => {
  const pre = handleCors(req);
  if (pre) return pre;
  if (req.method !== 'POST') return json({ error: 'method_not_allowed' }, 405);

  try {
    const body = await req.json().catch(() => null);
    const sessionId = body?.sessionId;
    const messages = body?.messages;
    if (typeof sessionId !== 'string' || !Array.isArray(messages)) {
      return json({ error: 'bad_request' }, 400);
    }

    const sb = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
    const repo = createSupabaseRepo(sb);

    const since = startOfUtcDayIso();
    const [sessionRes, globalRes] = await Promise.all([
      sb.from('ai_usage').select('*', { count: 'exact', head: true }).eq('session_id', sessionId).eq('kind', 'chat').gte('created_at', since),
      sb.from('ai_usage').select('*', { count: 'exact', head: true }).gte('created_at', since),
    ]);
    const rl = checkChatRateLimit({ sessionChatCount: sessionRes.count ?? 0, globalDailyCount: globalRes.count ?? 0 });
    if (!rl.allowed) return json({ reply: limitMessage(rl.reason), bookingId: null });

    const apiKey = Deno.env.get('LLM_API_KEY')!;
    const baseUrl = Deno.env.get('LLM_BASE_URL') ?? 'https://api.deepseek.com';
    const model = Deno.env.get('LLM_MODEL') ?? 'deepseek-chat';

    const convo: ChatMessage[] = [
      { role: 'system', content: systemPrompt(shopLocalDateStr(new Date())) },
      ...(messages as ChatMessage[]),
    ];

    let createdBookingId: string | null = null;

    for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
      const res = await fetch(`${baseUrl}/chat/completions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
        body: JSON.stringify(buildChatRequest(model, convo, TOOL_SCHEMAS)),
      });
      if (!res.ok) {
        return json({ reply: 'Не получилось связаться с администратором, попробуйте ещё раз.', bookingId: null });
      }
      const data = await res.json();
      const { content, toolCalls } = parseAssistantMessage(data);

      if (toolCalls.length === 0) {
        await sb.from('ai_usage').insert({ session_id: sessionId, kind: 'chat' });
        return json({ reply: content ?? '', bookingId: createdBookingId });
      }

      convo.push({ role: 'assistant', content: content ?? '', tool_calls: toolCalls });
      for (const tc of toolCalls) {
        const result = await runTool(tc.function.name, tc.function.arguments, repo);
        if (result.ok && tc.function.name === 'create_booking') {
          createdBookingId = (result.data as any).booking_id ?? createdBookingId;
        }
        convo.push({ role: 'tool', tool_call_id: tc.id, content: JSON.stringify(result) });
      }
    }

    await sb.from('ai_usage').insert({ session_id: sessionId, kind: 'chat' });
    return json({ reply: 'Уточните, пожалуйста, услугу и удобное время — и я запишу вас.', bookingId: createdBookingId });
  } catch (_e) {
    return json({ reply: 'Произошла ошибка. Попробуйте ещё раз.', bookingId: null }, 200);
  }
});
