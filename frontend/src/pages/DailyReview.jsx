import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api.js';

const TYPE_LABEL = { article: 'Article', pdf: 'PDF', youtube: 'Video', note: 'Note' };

export default function DailyReview() {
  const [queue, setQueue] = useState(null);
  const [stats, setStats] = useState(null);
  const [doneToday, setDoneToday] = useState([]);
  const navigate = useNavigate();

  async function load() {
    const res = await api.todayReview();
    setQueue(res.queue);
    setStats(res.stats);
  }

  useEffect(() => { load(); }, []);

  async function markReviewed(id) {
    await api.completeReview(id);
    setQueue((prev) => prev.filter((i) => i.id !== id));
    setDoneToday((prev) => [...prev, id]);
  }

  const today = new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' });

  return (
    <div className="max-w-3xl mx-auto px-8 py-8">
      <header className="mb-8">
        <p className="font-mono text-[11px] uppercase tracking-widest text-moss mb-1">◔ Call slip — {today}</p>
        <h1 className="font-display text-3xl text-inktext">Daily review</h1>
        <p className="text-inktext/50 mt-2 max-w-lg">
          A short, spaced-out pass through what you've saved — so nothing just sits in the drawer unread.
        </p>
      </header>

      {stats && (
        <div className="grid grid-cols-3 gap-3 mb-8">
          <Stat label="In vault" value={stats.total} />
          <Stat label="Finished" value={stats.completed} />
          <Stat label="Favourited" value={stats.favorites} />
        </div>
      )}

      {queue === null && <p className="text-inktext/40 font-mono text-sm">Loading…</p>}

      {queue?.length === 0 && (
        <div className="text-center py-20 border border-dashed border-paper-dark rounded-sm">
          <p className="font-display text-2xl text-inktext/70 mb-2">
            {doneToday.length > 0 ? "That's today's review, done." : 'All caught up'}
          </p>
          <p className="text-inktext/40">Come back tomorrow for a fresh set.</p>
        </div>
      )}

      {queue?.length > 0 && (
        <ul className="space-y-3">
          {queue.map((item) => (
            <li key={item.id} className="index-card !border-t px-5 py-4 flex items-center gap-4">
              {item.thumbnail && (
                <img src={item.thumbnail} alt="" className="w-16 h-16 object-cover rounded-sm shrink-0 bg-paper-dark" />
              )}
              <div className="min-w-0 flex-1 cursor-pointer" onClick={() => navigate(`/item/${item.id}`)}>
                <span className="stamp text-[10px] uppercase tracking-widest text-moss">{TYPE_LABEL[item.type]}</span>
                <h3 className="font-display text-lg text-inktext leading-snug truncate">{item.title}</h3>
                {item.excerpt && <p className="text-sm text-inktext/50 truncate">{item.excerpt}</p>}
              </div>
              <button
                onClick={() => markReviewed(item.id)}
                className="shrink-0 font-mono text-[11px] uppercase tracking-widest border border-moss/40 text-moss px-3 py-2 rounded-sm hover:bg-moss/10 transition-colors"
              >
                Mark reviewed
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function Stat({ label, value }) {
  return (
    <div className="border border-paper-dark bg-paper-card rounded-sm px-4 py-3 text-center">
      <p className="font-display text-2xl text-inktext">{value}</p>
      <p className="font-mono text-[10px] uppercase tracking-widest text-inktext/40 mt-0.5">{label}</p>
    </div>
  );
}
