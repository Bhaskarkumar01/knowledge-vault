import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { api } from '../api.js';

const VaultDataContext = createContext(null);

export function VaultDataProvider({ children }) {
  const [folders, setFolders] = useState([]);
  const [tags, setTags] = useState([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    const [f, t] = await Promise.all([api.listFolders(), api.listTags()]);
    setFolders(f.folders);
    setTags(t.tags);
  }, []);

  useEffect(() => {
    refresh().finally(() => setLoading(false));
  }, [refresh]);

  return (
    <VaultDataContext.Provider value={{ folders, tags, loading, refresh }}>
      {children}
    </VaultDataContext.Provider>
  );
}

export function useVaultData() {
  const ctx = useContext(VaultDataContext);
  if (!ctx) throw new Error('useVaultData must be used within VaultDataProvider');
  return ctx;
}
