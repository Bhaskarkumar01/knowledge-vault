import React, { useState } from 'react';
import { api } from '../api.js';
import { useVaultData } from '../context/VaultDataContext.jsx';

const TABS = [
  { id: 'url', label: 'Link', hint: 'Article or YouTube URL' },
  { id: 'note', label: 'Note', hint: 'Write something down' },
  { id: 'pdf', label: 'PDF', hint: 'Upload a file' },
];

export default function AddItemModal({ onClose, onCreated }) {
  const [tab, setTab] = useState('url');
  const [url, setUrl] = useState('');
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [file, setFile] = useState(null);
  const [tagsInput, setTagsInput] = useState('');
  const [folderId, setFolderId] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const { folders, refresh } = useVaultData();

  const tags = tagsInput.split(',').map((t) => t.trim()).filter(Boolean);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      let item;
      if (tab === 'pdf') {
        if (!file) throw new Error('Choose a PDF file first');
        const fd = new FormData();
        fd.append('file', file);
        if (title) fd.append('title', title);
        if (folderId) fd.append('folder_id', folderId);
        fd.append('tags', JSON.stringify(tags));
        const res = await api.uploadPdf(fd);
        item = res.item;
      } else if (tab === 'note') {
        if (!content.trim()) throw new Error('Write something before saving');
        const res = await api.createItem({ type: 'note', title: title || 'Untitled note', content, folder_id: folderId || undefined, tags });
        item = res.item;
      } else {
        if (!url.trim()) throw new Error('Paste a URL first');
        const res = await api.createItem({ type: 'article', url, title: title || undefined, folder_id: folderId || undefined, tags });
        item = res.item;
      }
      refresh();
      onCreated(item);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-ink/60 backdrop-blur-sm flex items-start justify-center pt-[10vh] px-4 z-50" onClick={onClose}>
      <div className="w-full max-w-lg bg-paper-card index-card !border-t !mt-1.5" onClick={(e) => e.stopPropagation()}>
        <div className="flex border-b border-paper-dark">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={`flex-1 py-3 font-mono text-xs uppercase tracking-widest border-b-2 transition-colors ${
                tab === t.id ? 'border-brass text-inktext' : 'border-transparent text-inktext/40'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <p className="font-mono text-[11px] text-inktext/40 -mt-1">{TABS.find((t) => t.id === tab).hint}</p>

          {tab === 'url' && (
            <input
              autoFocus
              type="url"
              required
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://…"
              className="w-full border border-paper-dark bg-paper px-3 py-2.5 rounded-sm focus-ring"
            />
          )}

          {tab === 'note' && (
            <textarea
              autoFocus
              required
              rows={6}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Jot down a thought, quote, or summary…"
              className="w-full border border-paper-dark bg-paper px-3 py-2.5 rounded-sm focus-ring resize-none"
            />
          )}

          {tab === 'pdf' && (
            <input
              autoFocus
              type="file"
              accept="application/pdf"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
              className="w-full border border-paper-dark bg-paper px-3 py-2.5 rounded-sm focus-ring file:mr-3 file:border-0 file:bg-brass/20 file:text-inktext file:px-3 file:py-1 file:rounded-sm"
            />
          )}

          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Title (optional — we'll auto-detect for links)"
            className="w-full border border-paper-dark bg-paper px-3 py-2.5 rounded-sm focus-ring text-sm"
          />

          <div className="flex gap-3">
            <select
              value={folderId}
              onChange={(e) => setFolderId(e.target.value)}
              className="flex-1 border border-paper-dark bg-paper px-3 py-2.5 rounded-sm focus-ring text-sm"
            >
              <option value="">No drawer</option>
              {folders.map((f) => (
                <option key={f.id} value={f.id}>{f.name}</option>
              ))}
            </select>
            <input
              value={tagsInput}
              onChange={(e) => setTagsInput(e.target.value)}
              placeholder="tags, comma, separated"
              className="flex-1 border border-paper-dark bg-paper px-3 py-2.5 rounded-sm focus-ring text-sm font-mono"
            />
          </div>

          {error && <p className="text-oxblood text-sm bg-oxblood/10 border border-oxblood/30 px-3 py-2 rounded-sm">{error}</p>}

          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-inktext/60 hover:text-inktext">
              Cancel
            </button>
            <button type="submit" disabled={busy} className="px-5 py-2 text-sm bg-brass hover:bg-brass-light text-ink rounded-sm font-medium disabled:opacity-60">
              {busy ? 'Saving…' : 'Save to vault'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
