import React, { useEffect, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { api } from '../api.js';
import ItemCard from '../components/ItemCard.jsx';

export default function Favorites() {
  const [items, setItems] = useState(null);
  const { openAdd } = useOutletContext();

  useEffect(() => {
    api.listItems({ favorite: 'true' }).then((res) => setItems(res.items));
  }, []);

  function handleChanged(updated) {
    if (!updated.is_favorite) {
      setItems((prev) => prev.filter((i) => i.id !== updated.id));
    } else {
      setItems((prev) => prev.map((i) => (i.id === updated.id ? updated : i)));
    }
  }

  return (
    <div className="max-w-6xl mx-auto px-8 py-8">
      <header className="mb-6">
        <p className="font-mono text-[11px] uppercase tracking-widest text-brass mb-1">★ Starred</p>
        <h1 className="font-display text-3xl text-inktext">Favourites</h1>
      </header>

      {items === null && <p className="text-inktext/40 font-mono text-sm">Loading…</p>}

      {items?.length === 0 && (
        <div className="text-center py-24 border border-dashed border-paper-dark rounded-sm">
          <p className="font-display text-2xl text-inktext/70 mb-2">No favourites yet</p>
          <p className="text-inktext/40 mb-5">Star anything in your vault to pin it here.</p>
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
