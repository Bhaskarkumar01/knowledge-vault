import React, { useState, useCallback } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import Sidebar from './Sidebar.jsx';
import AddItemModal from './AddItemModal.jsx';
import { VaultDataProvider } from '../context/VaultDataContext.jsx';

export default function Shell() {
  const [addOpen, setAddOpen] = useState(false);
  const navigate = useNavigate();

  const handleCreated = useCallback((item) => {
    setAddOpen(false);
    navigate(`/item/${item.id}`);
  }, [navigate]);

  return (
    <VaultDataProvider>
      <div className="h-screen flex bg-paper">
        <Sidebar onAddClick={() => setAddOpen(true)} />
        <main className="flex-1 overflow-y-auto scrollbar-thin">
          <Outlet context={{ openAdd: () => setAddOpen(true) }} />
        </main>
      </div>
      {addOpen && <AddItemModal onClose={() => setAddOpen(false)} onCreated={handleCreated} />}
    </VaultDataProvider>
  );
}
