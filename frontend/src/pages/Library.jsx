import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useOutletContext } from 'react-router-dom';
import { api } from '../api.js';
import { useVaultData } from '../context/VaultDataContext.jsx';
import ItemCard from '../components/ItemCard.jsx';

const TYPES = [
  { id: '', label: 'All' },
  { id: 'article', label: 'Articles' },
  { id: 'pdf', label: 'PDFs' },
  { id: 'youtube', label: 'Videos' },
  { id: 'note', label: 'Notes' },
];

export default function Library() {
  const { folderId, tagName } = useParams();
  const { folders } = useVaultData();
  const { openAdd } = useOutletContext();
  const [items, setItems] = useState(null);
  const [q, setQ] = useState('');
  const [type, setType] = useState('');

  const load = useCallback(async () => {
    const params = {};
    if (folderId) params.folder_id = folderId;
    if (tagName) params.tag = tagName;
    if (type) params.type = type;
    if (q) params.q = q;
    const res = await api.listItems(params);
    setItems(res.items);
  }, [folderId, tagName, type, q]);

  useEffect(() => { load(); }, [load]);

  const folder = folders.find((f) => f.id === folderId);
  const heading = folder ? folder.name : tagName ? `#${tagName}` : 'All items';

  function handleChanged(updated) {
    setItems((prev) => prev.map((i) => (i.id === updated.id ? updated : i)));
  }

  return (
    <div className="max-w-6xl mx-auto px-8 py-8">
      <header className="flex items-start justify-between gap-6 mb-6">
        <div>
          <p className="font-mono text-[11px] uppercase tracking-widest text-moss mb-1">Library</p>
          <h1 className="font-display text-3xl text-inktext">{heading}</h1>
        </div>
        <button
          onClick={openAdd}
          className="shrink-0 bg-brass hover:bg-brass-light text-ink text-sm font-medium px-4 py-2 rounded-sm transition-colors"
        >
          + Save something
        </button>
      </header>

      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search your vault…"
          className="flex-1 border border-paper-dark bg-paper-card px-4 py-2.5 rounded-sm focus-ring"
        />
        <div className="flex gap-1.5 font-mono text-xs uppercase tracking-widest overflow-x-auto">
          {TYPES.map((t) => (
            <button
              key={t.id}
              onClick={() => setType(t.id)}
              className={`px-3 py-2 rounded-sm shrink-0 transition-colors ${
                type === t.id ? 'bg-ink text-paper' : 'bg-paper-card text-inktext/50 hover:text-inktext'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {items === null && <p className="text-inktext/40 font-mono text-sm">Loading…</p>}

      {items?.length === 0 && (
        <div className="text-center py-24 border border-dashed border-paper-dark rounded-sm">
          <p className="font-display text-2xl text-inktext/70 mb-2">This drawer is empty</p>
          <p className="text-inktext/40 mb-5">Save an article, a video, a PDF, or jot a note to get started.</p>
          <button onClick={openAdd} className="bg-brass hover:bg-brass-light text-ink text-sm font-medium px-4 py-2 rounded-sm">
            + Save something
          </button>
        </div>
      )}

      {items?.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {items.map((item) => (
            <ItemCard key={item.id} item={item} onChanged={handleChanged} />
          ))}
        </div>
      )}
    </div>
  );
}
