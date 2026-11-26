import React, { useState, useEffect } from 'react';
import { Sparkles, Loader2, KeyRound, X } from 'lucide-react';
import { loadAiConfig, saveAiConfig, askAi } from '../lib/ai';
import { fetchFileContent } from '../lib/analyzer';

export default function AiAsk({ node, repo, isSample }) {
  const [cfg, setCfg] = useState(loadAiConfig());
  const [editing, setEditing] = useState(false);
  const [draftKey, setDraftKey] = useState(cfg.key || '');
  const [draftProvider, setDraftProvider] = useState(cfg.provider || 'openai');
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    setAnswer('');
    setError('');
    setQuestion('');
  }, [node && node.path]);

  function handleSaveKey(event) {
    event.preventDefault();
    const next = { provider: draftProvider, key: draftKey.trim() };
    setCfg(next);
    saveAiConfig(next);
    setEditing(false);
  }

  async function handleAsk(event) {
    event.preventDefault();
    setBusy(true);
    setError('');
    setAnswer('');
    try {
      let content = node.snippet || '';
      if (!isSample && repo && repo.owner) {
        try {
          content = await fetchFileContent(repo.owner, repo.name, node.path, repo.branch || 'main');
        } catch (e) {
          /* fall back to snippet */
        }
      }
      const text = await askAi(cfg, { path: node.path, content: content, snippet: node.snippet }, question);
      setAnswer(text || 'The AI returned an empty answer. Try rephrasing your question.');
    } catch (err) {
      setError(err.message || 'Something went wrong asking the AI.');
    } finally {
      setBusy(false);
    }
  }

  const hasKey = !!cfg.key;

  return (
    <div className="ai-box">
      <h4 className="detail-sub"><Sparkles size={13} /> Ask AI about this file</h4>

      {(!hasKey || editing) ? (
        <form className="ai-key-form" onSubmit={handleSaveKey}>
          <p className="ai-note">Use your own key. It is stored only in this browser and sent only to the provider you choose.</p>
          <div className="ai-provider">
            <button type="button" className={'chip' + (draftProvider === 'openai' ? ' chip-active' : '')} onClick={() => setDraftProvider('openai')}>OpenAI</button>
            <button type="button" className={'chip' + (draftProvider === 'claude' ? ' chip-active' : '')} onClick={() => setDraftProvider('claude')}>Claude</button>
          </div>
          <input
            className="modal-input"
            type="password"
            value={draftKey}
            onChange={(e) => setDraftKey(e.target.value)}
            placeholder={draftProvider === 'claude' ? 'sk-ant-...' : 'sk-...'}
            autoComplete="off"
            spellCheck="false"
            aria-label="AI API key"
          />
          <div className="ai-actions">
            {hasKey && <button type="button" className="btn btn-ghost ai-btn" onClick={() => setEditing(false)}>Cancel</button>}
            <button type="submit" className="btn btn-primary ai-btn" disabled={!draftKey.trim()}>Save key</button>
          </div>
        </form>
      ) : (
        <form onSubmit={handleAsk}>
          <textarea
            className="ai-input"
            rows={3}
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="Ask anything, e.g. 'What does the checkout function do?' (leave empty for a full explanation)"
            aria-label="Question for the AI"
          />
          <div className="ai-actions">
            <button type="button" className="icon-btn" onClick={() => { setDraftKey(cfg.key); setDraftProvider(cfg.provider); setEditing(true); }} title={'Using ' + (cfg.provider === 'claude' ? 'Claude' : 'OpenAI') + '. Click to change key'} aria-label="Change AI key">
              <KeyRound size={15} />
            </button>
            <button type="submit" className="btn btn-primary ai-btn" disabled={busy}>
              {busy ? <Loader2 size={15} className="spin" /> : <Sparkles size={15} />}
              {busy ? 'Thinking' : 'Ask AI'}
            </button>
          </div>
        </form>
      )}

      {error && <div className="modal-msg modal-msg-err">{error}</div>}
      {answer && (
        <div className="ai-answer">
          <button className="icon-btn ai-clear" onClick={() => setAnswer('')} aria-label="Clear answer"><X size={13} /></button>
          {answer}
        </div>
      )}
    </div>
  );
}
