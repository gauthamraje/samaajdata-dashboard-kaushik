import { CDA_API_BASE } from '../config';

const THREAD_STORAGE_KEY = 'cda_thread_id';

export function getStoredThreadId() {
  try {
    return localStorage.getItem(THREAD_STORAGE_KEY);
  } catch {
    return null;
  }
}

export function setStoredThreadId(threadId) {
  try {
    localStorage.setItem(THREAD_STORAGE_KEY, threadId);
  } catch {
    /* ignore quota / private mode */
  }
}

export function clearStoredThreadId() {
  try {
    localStorage.removeItem(THREAD_STORAGE_KEY);
  } catch {
    /* ignore */
  }
}

async function parseError(res) {
  try {
    const body = await res.json();
    return body.detail || res.statusText;
  } catch {
    return res.statusText;
  }
}

export async function createThread() {
  const res = await fetch(`${CDA_API_BASE}/threads`, { method: 'POST' });
  if (!res.ok) throw new Error(await parseError(res));
  const data = await res.json();
  setStoredThreadId(data.thread_id);
  return data.thread_id;
}

export async function postMessage(threadId, content) {
  const res = await fetch(`${CDA_API_BASE}/threads/${threadId}/messages`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ content }),
  });
  if (!res.ok) throw new Error(await parseError(res));
  return res.json();
}

export async function getRunStatus(threadId, runId) {
  const res = await fetch(`${CDA_API_BASE}/threads/${threadId}/runs/${runId}`);
  if (!res.ok) throw new Error(await parseError(res));
  return res.json();
}

export async function getMessages(threadId) {
  const res = await fetch(`${CDA_API_BASE}/threads/${threadId}/messages`);
  if (!res.ok) throw new Error(await parseError(res));
  return res.json();
}

export async function logInteraction(threadId, userQuery, botResponse) {
  try {
    await fetch(`${CDA_API_BASE}/log`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        thread_id: threadId,
        user_query: userQuery,
        bot_response: botResponse,
      }),
    });
  } catch {
    /* logging is best-effort */
  }
}

/** Poll until run completes, then return latest assistant message content. */
export async function sendAndAwaitReply(threadId, content, { onStatus } = {}) {
  const { run_id: runId } = await postMessage(threadId, content);

  if (!threadId || threadId === 'undefined' || !runId || runId === 'undefined') {
    throw new Error('Session not initialized. Please reset and try again.');
  }

  const terminalFailure = new Set(['failed', 'cancelled', 'expired']);

  for (let attempt = 0; attempt < 120; attempt += 1) {
    const { status } = await getRunStatus(threadId, runId);
    onStatus?.(status);

    if (status === 'completed') {
      const { messages } = await getMessages(threadId);
      const last = messages[messages.length - 1];
      if (last?.role === 'assistant') {
        const userMsg = messages[messages.length - 2];
        if (userMsg?.role === 'user') {
          await logInteraction(
            threadId,
            userMsg.content,
            last.content.split('---')[0]
          );
        }
        return last.content;
      }
      throw new Error('No assistant reply received.');
    }

    if (terminalFailure.has(status)) {
      throw new Error(`Session ended with status: ${status}`);
    }

    await new Promise((r) => setTimeout(r, 1000));
  }

  throw new Error('Request timed out. Please try again.');
}

export async function checkHealth() {
  try {
    const res = await fetch(`${CDA_API_BASE}/health`);
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}
