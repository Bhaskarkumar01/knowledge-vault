import React, { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { useVaultData } from '../context/VaultDataContext.jsx';
import { api } from '../api.js';

function DrawerLink({ to, children, icon }) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        `flex items-center gap-2.5 px-3 py-2 text-sm rounded-sm transition-colors ${
          isActive ? 'bg-brass/20 text-brass-light' : 'text-paper/70 hover:bg-paper/5 hover:text-paper'
        }`
      }
    >
      <span className="w-4 text-center opacity-80">{icon}</span>
      <span className="truncate">{children}</span>
    </NavLink>
  );
}

export default function Sidebar({ onAddClick }) {
  const { user, logout } = useAuth();
  const { folders, tags, refresh } = useVaultData();
  const navigate = useNavigate();
  const [newFolder, setNewFolder] = useState(false);
  const [folderName, setFolderName] = useState('');

  async function submitFolder(e) {
    e.preventDefault();
    if (!folderName.trim()) return;
    await api.createFolder({ name: folderName.trim() });
    setFolderName('');
    setNewFolder(false);
    refresh();
  }

  return (
    <aside className="w-64 shrink-0 bg-ink text-paper flex flex-col h-full">
      <div className="px-5 pt-6 pb-4">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-sm bg-brass text-ink font-display font-semibold flex items-center justify-center text-sm">V</div>
          <span className="font-display text-lg tracking-tight">Vault</span>
        </div>
      </div>

      <div className="px-4">
        <button
          onClick={onAddClick}
          className="w-full bg-brass hover:bg-brass-light text-ink text-sm font-medium py-2 rounded-sm transition-colors flex items-center justify-center gap-2"
        >
          <span className="text-base leading-none">+</span> Save something
        </button>
      </div>

      <nav className="px-4 mt-6 space-y-0.5">
        <p className="font-mono text-[10px] uppercase tracking-widest text-paper/35 px-3 mb-1.5">Library</p>
        <DrawerLink to="/" icon="◧">All items</DrawerLink>
        <DrawerLink to="/favorites" icon="★">Favourites</DrawerLink>
        <DrawerLink to="/review" icon="◔">Daily review</DrawerLink>
      </nav>

      <nav className="px-4 mt-6 flex-1 overflow-y-auto scrollbar-thin">
        <div className="flex items-center justify-between px-3 mb-1.5">
          <p className="font-mono text-[10px] uppercase tracking-widest text-paper/35">Drawers</p>
          <button onClick={() => setNewFolder((v) => !v)} className="text-paper/40 hover:text-brass text-xs leading-none">
            + new
          </button>
        </div>
        {newFolder && (
          <form onSubmit={submitFolder} className="px-3 mb-2">
            <input
              autoFocus
              value={folderName}
              onChange={(e) => setFolderName(e.target.value)}
              onBlur={() => !folderName && setNewFolder(false)}
              placeholder="Drawer name…"
              className="w-full bg-ink-light border border-paper/15 rounded-sm px-2 py-1.5 text-sm text-paper focus-ring"
            />
          </form>
        )}
        <div className="space-y-0.5">
          {folders.map((f) => (
            <DrawerLink key={f.id} to={`/folder/${f.id}`} icon={<span style={{ color: f.color }}>▤</span>}>
              {f.name}
              {f.item_count > 0 && <span className="ml-1.5 font-mono text-[10px] text-paper/30">{f.item_count}</span>}
            </DrawerLink>
          ))}
          {folders.length === 0 && !newFolder && (
            <p className="px-3 text-xs text-paper/30 italic">No drawers yet</p>
          )}
        </div>

        {tags.length > 0 && (
          <>
            <p className="font-mono text-[10px] uppercase tracking-widest text-paper/35 px-3 mt-6 mb-1.5">Tags</p>
            <div className="flex flex-wrap gap-1.5 px-3">
              {tags.map((t) => (
                <button
                  key={t.id}
                  onClick={() => navigate(`/tag/${t.name}`)}
                  className="font-mono text-[11px] px-2 py-1 rounded-sm bg-paper/5 text-paper/60 hover:bg-brass/20 hover:text-brass-light transition-colors"
                >
                  #{t.name}
                </button>
              ))}
            </div>
          </>
        )}
      </nav>

      <div className="px-4 py-4 border-t border-paper/10 flex items-center justify-between">
        <div className="min-w-0">
          <p className="text-sm truncate">{user?.name || user?.email}</p>
          <p className="text-xs text-paper/40 truncate">{user?.email}</p>
        </div>
        <button onClick={logout} className="font-mono text-[10px] uppercase tracking-widest text-paper/40 hover:text-oxblood-light shrink-0 ml-2">
          Sign out
        </button>
      </div>
    </aside>
  );
}
