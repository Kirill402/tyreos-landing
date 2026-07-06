import { SUPABASE_URL, SUPABASE_ANON_KEY } from './config.js';

const EDGE_URL = `${SUPABASE_URL.replace('https://', 'https://')}`.replace(
  /\.supabase\.co$/,
  '.functions.supabase.co'
) + '/ai-chat';

// Persistent session ID for rate-limiting (resets on page reload)
const SESSION_ID = 'sess-' + Math.random().toString(36).slice(2, 10) + '-' + Date.now();

// Conversation history sent to the backend each time
const history = [];

// DOM refs
const fab       = document.getElementById('chat-fab');
const panel     = document.getElementById('chat-panel');
const messages  = document.getElementById('chat-messages');
const input     = document.getElementById('chat-input');
const sendBtn   = document.getElementById('chat-send');

// ─── helpers ────────────────────────────────────────────────────────────────

function nowTime() {
  return new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
}

function appendMsg(role, text) {
  const wrap = document.createElement('div');
  wrap.className = `chat-msg chat-msg--${role === 'user' ? 'user' : 'bot'}`;

  const bubble = document.createElement('div');
  bubble.className = 'chat-msg__bubble';
  bubble.textContent = text;

  const time = document.createElement('div');
  time.className = 'chat-msg__time';
  time.textContent = nowTime();

  wrap.append(bubble, time);
  messages.appendChild(wrap);
  scrollToBottom();
  return wrap;
}

function appendBookingBadge(bookingId) {
  const badge = document.createElement('div');
  badge.className = 'chat-booking-badge';
  badge.innerHTML = `
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
      <rect x="4" y="5.5" width="16" height="14" rx="1.5"/>
      <path d="M4 9.5h16M8 3.5v3M16 3.5v3"/>
      <path d="m9 14 2 2 4-4"/>
    </svg>
    Запись создана · ID ${bookingId.slice(0, 8)}…`;
  messages.appendChild(badge);
  scrollToBottom();
}

function showTyping() {
  const el = document.createElement('div');
  el.className = 'chat-typing';
  el.innerHTML = `
    <span class="chat-typing__dot"></span>
    <span class="chat-typing__dot"></span>
    <span class="chat-typing__dot"></span>`;
  messages.appendChild(el);
  scrollToBottom();
  return el;
}

function scrollToBottom() {
  messages.scrollTop = messages.scrollHeight;
}

function setLocked(locked) {
  input.disabled = locked;
  sendBtn.disabled = locked || input.value.trim() === '';
}

// Auto-resize textarea
function autoResize() {
  input.style.height = 'auto';
  input.style.height = Math.min(input.scrollHeight, 120) + 'px';
  sendBtn.disabled = input.value.trim() === '';
}

// ─── send ────────────────────────────────────────────────────────────────────

async function sendMessage() {
  const text = input.value.trim();
  if (!text) return;

  // render user bubble
  appendMsg('user', text);
  history.push({ role: 'user', content: text });

  // reset input
  input.value = '';
  input.style.height = 'auto';
  setLocked(true);

  const typing = showTyping();

  try {
    const res = await fetch(EDGE_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      },
      body: JSON.stringify({ sessionId: SESSION_ID, messages: history }),
    });

    const data = await res.json();
    typing.remove();

    const reply = data.reply ?? 'Что-то пошло не так. Попробуйте ещё раз.';
    appendMsg('bot', reply);
    history.push({ role: 'assistant', content: reply });

    if (data.bookingId) {
      appendBookingBadge(data.bookingId);
    }
  } catch {
    typing.remove();
    appendMsg('bot', 'Не удалось связаться с сервером. Проверьте соединение и попробуйте снова.');
  } finally {
    setLocked(false);
    input.focus();
  }
}

// ─── toggle ──────────────────────────────────────────────────────────────────

let initialized = false;

function openChat() {
  fab.classList.add('is-open');
  panel.classList.add('is-open');
  fab.setAttribute('aria-expanded', 'true');
  panel.setAttribute('aria-hidden', 'false');

  if (!initialized) {
    initialized = true;
    // greeting
    setTimeout(() => {
      const typing = showTyping();
      setTimeout(() => {
        typing.remove();
        appendMsg('bot', window.__i18n
          ? window.__i18n.t('chat.greeting')
          : 'Привет! Я AI-администратор TYREOS 👋\nПомогу записаться на шиномонтаж, подобрать услугу или ответить на вопросы.\n\nС чего начнём?');
      }, 900);
    }, 300);
  }

  setTimeout(() => input.focus(), 350);
}

function closeChat() {
  fab.classList.remove('is-open');
  panel.classList.remove('is-open');
  fab.setAttribute('aria-expanded', 'false');
  panel.setAttribute('aria-hidden', 'true');
}

fab.addEventListener('click', () => {
  fab.classList.contains('is-open') ? closeChat() : openChat();
});

// close on Escape
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && panel.classList.contains('is-open')) closeChat();
});

// ─── input events ────────────────────────────────────────────────────────────

input.addEventListener('input', autoResize);

input.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    if (!sendBtn.disabled) sendMessage();
  }
});

sendBtn.addEventListener('click', sendMessage);
