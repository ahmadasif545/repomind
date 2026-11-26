import React, { useState } from 'react';
import { X, KeyRound, ShieldCheck, Loader2, ExternalLink } from 'lucide-react';
import { checkToken } from '../lib/analyzer';

export default function TokenDialog({ token, onSave, onClose }) {
  const [value, setValue] = useState(token || '');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const [ok, setOk] = useState(false);

  async function handleSave(event) {
    event.preventDefault();
    const trimmed = value.trim();
    if (!trimmed) {
      onSave('');
      onClose();
      return;
    }
    setBusy(true);
    setMsg('');
    try {
      const info = await checkToken(trimmed);
      setOk(true);
      setMsg('Token works. You have ' + info.remaining + ' of ' + info.limit + ' requests left this hour.');
      onSave(trimmed);
      setTimeout(onClose, 1100);
    } catch (err) {
      setOk(false);
      setMsg(err.message);
    } finally {
      setBusy(false);
    }
  }

  function handleRemove() {
    onSave('');
    setValue('');
    setOk(false);
    setMsg('Token removed. You are back on the 60 requests per hour public limit.');
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-label="GitHub access token">
        <div className="modal-head">
          <div className="modal-title"><KeyRound size={18} /> GitHub access token</div>
          <button className="icon-btn" onClick={onClose} aria-label="Close"><X size={16} /></button>
        </div>
        <p className="modal-text">
          A token raises GitHub's limit from 60 to 5,000 requests per hour and lets RepoMind read your private repositories.
        </p>
        <ol className="modal-steps">
          <li>
            Open{' '}
            <a href="https://github.com/settings/tokens/new?scopes=repo&description=RepoMind" target="_blank" rel="noreferrer">
              GitHub token settings <ExternalLink size={12} />
            </a>
          </li>
          <li>Pick an expiry, keep the <strong>repo</strong> box ticked (or none, for public repos only), and generate it.</li>
          <li>Paste the token below.</li>
        </ol>
        <form onSubmit={handleSave}>
          <input
            className="modal-input"
            type="password"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder="ghp_xxxxxxxxxxxxxxxxxxxx"
            autoComplete="off"
            spellCheck="false"
            aria-label="GitHub token"
          />
          {msg && <div className={ok ? 'modal-msg modal-msg-ok' : 'modal-msg modal-msg-err'}>{msg}</div>}
          <div className="modal-note"><ShieldCheck size={14} /> Stored only in this browser and sent only to api.github.com.</div>
          <div className="modal-actions">
            {token && <button type="button" className="btn btn-ghost" onClick={handleRemove}>Remove token</button>}
            <button type="submit" className="btn btn-primary" disabled={busy}>
              {busy ? <Loader2 size={16} className="spin" /> : null}
              {busy ? 'Checking' : 'Save token'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
