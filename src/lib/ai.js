import { load, save } from './storage';

export function loadAiConfig() {
  return load('ai', { provider: 'openai', key: '' });
}

export function saveAiConfig(cfg) {
  save('ai', cfg);
}

function buildPrompt(file, question) {
  const code = (file.content || file.snippet || '').slice(0, 14000);
  const q = question && question.trim() ? question.trim() : 'Explain what this file does in simple English for a non-expert, then walk through the important parts.';
  return (
    'You are helping someone understand a code repository. Answer in plain, friendly English, keep it concise and use short paragraphs or bullets.\n\n' +
    'File path: ' + file.path + '\n\n' +
    'File content:\n```\n' + code + '\n```\n\n' +
    'Question: ' + q
  );
}

async function readError(res) {
  let msg = '';
  try {
    const data = await res.json();
    msg = (data && data.error && (data.error.message || data.error)) || '';
  } catch (e) {
    /* ignore */
  }
  if (res.status === 401) return 'Your API key was rejected. Open the AI key settings and check it.';
  if (res.status === 429) return 'The AI provider says you are out of quota or sending too fast. ' + (msg || '');
  return 'The AI provider returned an error (' + res.status + '). ' + (typeof msg === 'string' ? msg : '');
}

export async function askAi(cfg, file, question) {
  if (!cfg || !cfg.key) throw new Error('Add your OpenAI or Claude API key first.');
  const prompt = buildPrompt(file, question);
  let res;
  try {
    if (cfg.provider === 'claude') {
      res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-api-key': cfg.key,
          'anthropic-version': '2023-06-01',
          'anthropic-dangerous-direct-browser-access': 'true'
        },
        body: JSON.stringify({
          model: 'claude-3-5-haiku-latest',
          max_tokens: 900,
          messages: [{ role: 'user', content: prompt }]
        })
      });
    } else {
      res = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: { 'content-type': 'application/json', Authorization: 'Bearer ' + cfg.key },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          max_tokens: 900,
          messages: [{ role: 'user', content: prompt }]
        })
      });
    }
  } catch (e) {
    throw new Error('Could not reach the AI provider. Check your connection and try again.');
  }
  if (!res.ok) throw new Error(await readError(res));
  const data = await res.json();
  if (cfg.provider === 'claude') {
    return (data.content || []).map((c) => c.text || '').join('\n').trim();
  }
  return ((data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content) || '').trim();
}
