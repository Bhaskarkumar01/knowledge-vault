import React from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api.js';

const TYPE_LABEL = { article: 'Article', pdf: 'PDF', youtube: 'Video', note: 'Note' };
const TYPE_ICON = { article: '◧', pdf: '▤', youtube: '▶', note: '✎' };

export default function ItemCard({ item, onChanged }) {
  const navigate = useNavigate();

  async function toggleFav(e) {
    e.stopPropagation();
    const res = await api.toggleFavorite(item.id);
    onChanged?.(res.item);
  }

  return (
    <div
      onClick={() => navigate(`/item/${item.id}`)}
      className="index-card p-0 cursor-pointer flex flex-col overflow-hidden"
    >
      <div className="pt-3 px-4 flex items-start justify-between gap-2">
        <span className="stamp text-[10px] uppercase tracking-widest text-moss px-1.5 py-0.5 border border-moss/30 rounded-sm">
          {TYPE_ICON[item.type]} {TYPE_LABEL[item.type]}
        </span>
        <button onClick={toggleFav} className={`text-lg leading-none transition-colors ${item.is_favorite ? 'text-brass' : 'text-inktext/15 hover:text-brass/60'}`}>
          ★
        </button>
      </div>

      {item.thumbnail && (
        <div className="mx-4 mt-3 h-32 rounded-sm overflow-hidden bg-paper-dark">
          <img src={item.thumbnail} alt="" className="w-full h-full object-cover" loading="lazy" />
        </div>
      )}

      <div className="px-4 pt-3 pb-4 flex-1 flex flex-col">
        <h3 className="font-display text-lg leading-snug text-inktext line-clamp-2">{item.title}</h3>
        {item.excerpt && <p className="text-sm text-inktext/60 mt-1.5 line-clamp-2">{item.excerpt}</p>}

        <div className="mt-auto pt-3 flex items-center justify-between">
          <div className="flex gap-1.5 flex-wrap">
            {item.tags?.slice(0, 3).map((t) => (
              <span key={t.id} className="font-mono text-[10px] text-moss bg-moss/10 px-1.5 py-0.5 rounded-sm">#{t.name}</span>
            ))}
          </div>
          {item.progress > 0 && (
            <span className="stamp text-[10px] text-inktext/40">{item.progress}%</span>
          )}
        </div>
        {item.progress > 0 && (
          <div className="mt-1.5 h-0.5 bg-paper-dark rounded-full overflow-hidden">
            <div className="h-full bg-brass" style={{ width: `${item.progress}%` }} />
          </div>
        )}
      </div>
    </div>
  );
}
