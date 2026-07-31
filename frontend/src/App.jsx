import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext.jsx';
import Login from './pages/Login.jsx';
import Shell from './components/Shell.jsx';
import Library from './pages/Library.jsx';
import ItemDetail from './pages/ItemDetail.jsx';
import Favorites from './pages/Favorites.jsx';
import DailyReview from './pages/DailyReview.jsx';

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-ink text-paper font-mono text-sm tracking-widest">
        LOADING VAULT…
      </div>
    );
  }
  if (!user) return <Navigate to="/login" replace />;
  return children;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <Shell />
          </ProtectedRoute>
        }
      >
        <Route index element={<Library />} />
        <Route path="folder/:folderId" element={<Library />} />
        <Route path="tag/:tagName" element={<Library />} />
        <Route path="favorites" element={<Favorites />} />
        <Route path="review" element={<DailyReview />} />
        <Route path="item/:itemId" element={<ItemDetail />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
