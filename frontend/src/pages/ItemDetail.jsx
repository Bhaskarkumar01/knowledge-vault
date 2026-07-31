import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../api.js';
import { useVaultData } from '../context/VaultDataContext.jsx';

function youtubeEmbedId(url) {
  const m = url?.match(/(?:youtube\.com\/(?:watch\?v=|shorts\/|embed\/)|youtu\.be\/)([\w-]{11})/i);
  return m ? m[1] : null;
}

export default function ItemDetail() {
  const { itemId } = useParams();
  const navigate = useNavigate();
  const { folders, refresh } = useVaultData();
  const [item, setItem] = useState(null);
  const [tagsInput, setTagsInput] = useState('');
  const [notice, setNotice] = useState('');
  const scrollRef = useRef(null);

  const load = useCallback(async () => {
    const res = await api.getItem(itemId);
    setItem(res.item);
    setTagsInput(res.item.tags.map((t) => t.name).join(', '));
  }, [itemId]);

  useEffect(() => { load(); }, [load]);

  // Track reading progress on scroll for article/note bodies.
  const handleScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el || !item) return;
    const scrollable = el.scrollHeight - el.clientHeight;
    if (scrollable <= 0) return;
    const pct = Math.min(100, Math.round((el.scrollTop / scrollable) * 100));
    if (pct > item.progress) {
      api.setProgress(item.id, pct).then((res) => setItem((prev) => ({ ...prev, progress: res.item.progress })));
    }
  }, [item]);

  async function toggleFav() {
    const res = await api.toggleFavorite(item.id);
    setItem((prev) => ({ ...prev, is_favorite: res.item.is_favorite }));
  }

  async function saveTags() {
    const tags = tagsInput.split(',').map((t) => t.trim()).filter(Boolean);
    const res = await api.updateItem(item.id, { tags });
    setItem(res.item);
    refresh();
    setNotice('Tags updated');
    setTimeout(() => setNotice(''), 1500);
  }

  async function moveFolder(folderId) {
    const res = await api.updateItem(item.id, { folder_id: folderId || null });
    setItem(res.item);
    refresh();
  }

  async function markFinished() {
    const res = await api.setProgress(item.id, 100);
    setItem((prev) => ({ ...prev, progress: res.item.progress }));
  }

  async function remove() {
    if (!confirm('Remove this item from your vault? This cannot be undone.')) return;
    await api.deleteItem(item.id);
    refresh();
    navigate(-1);
  }

  if (!item) return <div className="max-w-3xl mx-auto px-8 py-8 text-inktext/40 font-mono text-sm">Loading…</div>;

  const ytId = item.type === 'youtube' ? youtubeEmbedId(item.url) : null;

  return (
    <div className="max-w-3xl mx-auto px-8 py-8">
      <button onClick={() => navigate(-1)} className="font-mono text-xs text-inktext/40 hover:text-inktext mb-6">
        ← Back
      </button>

      <div className="index-card !border-t p-8">
        <div className="flex items-start justify-between gap-4 mb-4">
          <span className="stamp text-[10px] uppercase tracking-widest text-moss px-2 py-1 border border-moss/30 rounded-sm">
            {item.type}
          </span>
          <div className="flex items-center gap-3">
            <button onClick={toggleFav} className={`text-2xl leading-none transition-colors ${item.is_favorite ? 'text-brass' : 'text-inktext/15 hover:text-brass/60'}`}>
              ★
            </button>
            <button onClick={remove} className="font-mono text-[10px] uppercase tracking-widest text-inktext/30 hover:text-oxblood">
              Delete
            </button>
          </div>
        </div>

        <h1 className="font-display text-3xl text-inktext leading-tight mb-2">{item.title}</h1>
        {item.url && (
          <a href={item.url} target="_blank" rel="noreferrer" className="text-sm text-brass hover:underline break-all">
            {item.url}
          </a>
        )}

        {ytId && (
          <div className="aspect-video mt-5 rounded-sm overflow-hidden bg-ink">
            <iframe
              className="w-full h-full"
              src={`https://www.youtube.com/embed/${ytId}`}
              title={item.title}
              allowFullScreen
            />
          </div>
        )}

        {!ytId && item.thumbnail && (
          <img src={item.thumbnail} alt="" className="w-full rounded-sm mt-5 object-cover max-h-80" />
        )}

        {item.type === 'pdf' && item.file_path && (
          <a
            href={item.file_path}
            target="_blank"
            rel="noreferrer"
            className="inline-block mt-5 bg-brass hover:bg-brass-light text-ink text-sm font-medium px-4 py-2 rounded-sm"
          >
            Open PDF ↗
          </a>
        )}

        {item.content && (
          <div
            ref={scrollRef}
            onScroll={handleScroll}
            className="mt-6 max-h-96 overflow-y-auto scrollbar-thin pr-2 text-inktext/80 leading-relaxed whitespace-pre-wrap border-t border-paper-dark pt-5"
          >
            {item.content}
          </div>
        )}

        <div className="mt-6 pt-5 border-t border-paper-dark">
          <div className="flex items-center justify-between mb-1.5">
            <span className="font-mono text-[11px] uppercase tracking-widest text-inktext/40">Reading progress</span>
            <span className="font-mono text-[11px] text-inktext/40">{item.progress}%</span>
          </div>
          <div className="h-1.5 bg-paper-dark rounded-full overflow-hidden">
            <div className="h-full bg-brass transition-all" style={{ width: `${item.progress}%` }} />
          </div>
          {item.progress < 100 && (
            <button onClick={markFinished} className="mt-2 font-mono text-[11px] uppercase tracking-widest text-moss hover:underline">
              Mark as finished
            </button>
          )}
        </div>

        <div className="mt-6 pt-5 border-t border-paper-dark grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block font-mono text-[11px] uppercase tracking-widest text-inktext/40 mb-1.5">Drawer</label>
            <select
              value={item.folder_id || ''}
              onChange={(e) => moveFolder(e.target.value)}
              className="w-full border border-paper-dark bg-paper px-3 py-2 rounded-sm focus-ring text-sm"
            >
              <option value="">No drawer</option>
              {folders.map((f) => (
                <option key={f.id} value={f.id}>{f.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block font-mono text-[11px] uppercase tracking-widest text-inktext/40 mb-1.5">Tags</label>
            <div className="flex gap-2">
              <input
                value={tagsInput}
                onChange={(e) => setTagsInput(e.target.value)}
                onBlur={saveTags}
                placeholder="comma, separated"
                className="flex-1 border border-paper-dark bg-paper px-3 py-2 rounded-sm focus-ring text-sm font-mono"
              />
            </div>
          </div>
        </div>
        {notice && <p className="text-xs text-moss mt-2">{notice}</p>}
      </div>
    </div>
  );
}
