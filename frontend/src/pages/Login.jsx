import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

export default function Login() {
  const [mode, setMode] = useState('login'); // 'login' | 'register'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const { login, register } = useAuth();
  const navigate = useNavigate();

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      if (mode === 'login') await login(email, password);
      else await register(email, password, name);
      navigate('/');
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen bg-ink flex items-center justify-center px-6 relative overflow-hidden">
      {/* Ambient catalog-drawer stripes */}
      <div className="pointer-events-none absolute inset-0 opacity-[0.06]"
           style={{ backgroundImage: 'repeating-linear-gradient(180deg, #EDE6D6 0px, #EDE6D6 1px, transparent 1px, transparent 64px)' }} />

      <div className="w-full max-w-sm relative">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-sm bg-brass text-ink font-display font-semibold text-lg mb-4">
            V
          </div>
          <h1 className="font-display text-3xl text-paper tracking-tight">Vault</h1>
          <p className="font-mono text-xs text-paper/50 mt-2 tracking-widest uppercase">Your second brain</p>
        </div>

        <div className="bg-ink-light border border-paper/10 p-7">
          <div className="flex mb-6 font-mono text-xs uppercase tracking-widest">
            <button
              className={`flex-1 pb-3 border-b-2 transition-colors ${mode === 'login' ? 'border-brass text-paper' : 'border-paper/10 text-paper/40'}`}
              onClick={() => setMode('login')}
              type="button"
            >
              Sign in
            </button>
            <button
              className={`flex-1 pb-3 border-b-2 transition-colors ${mode === 'register' ? 'border-brass text-paper' : 'border-paper/10 text-paper/40'}`}
              onClick={() => setMode('register')}
              type="button"
            >
              Create account
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === 'register' && (
              <div>
                <label className="block font-mono text-[11px] uppercase tracking-widest text-paper/50 mb-1.5">Name</label>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-ink border border-paper/15 px-3 py-2.5 text-paper focus-ring rounded-sm"
                  placeholder="Ada Lovelace"
                />
              </div>
            )}
            <div>
              <label className="block font-mono text-[11px] uppercase tracking-widest text-paper/50 mb-1.5">Email</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-ink border border-paper/15 px-3 py-2.5 text-paper focus-ring rounded-sm"
                placeholder="you@example.com"
              />
            </div>
            <div>
              <label className="block font-mono text-[11px] uppercase tracking-widest text-paper/50 mb-1.5">Password</label>
              <input
                type="password"
                required
                minLength={8}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-ink border border-paper/15 px-3 py-2.5 text-paper focus-ring rounded-sm"
                placeholder="At least 8 characters"
              />
            </div>

            {error && (
              <p className="text-oxblood-light text-sm bg-oxblood/10 border border-oxblood/30 px-3 py-2 rounded-sm">{error}</p>
            )}

            <button
              type="submit"
              disabled={busy}
              className="w-full bg-brass hover:bg-brass-light text-ink font-medium py-2.5 rounded-sm transition-colors disabled:opacity-60"
            >
              {busy ? 'Please wait…' : mode === 'login' ? 'Sign in' : 'Create account'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
