import React from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
}

export class ErrorBoundary extends React.Component<{ children: React.ReactNode }, State> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    this.setState({ errorInfo });
    console.error('[ErrorBoundary] Caught error:', error, errorInfo);
  }

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-indigo-50 flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-white rounded-3xl shadow-2xl border border-slate-100 p-8 text-center space-y-6">
          <div className="w-16 h-16 bg-rose-100 rounded-2xl flex items-center justify-center mx-auto">
            <AlertTriangle size={32} className="text-rose-500" />
          </div>
          <div>
            <h2 className="text-2xl font-black text-slate-900 mb-2">Une erreur est survenue</h2>
            <p className="text-slate-500 text-sm leading-relaxed">
              L'interface a rencontré un problème inattendu. Vos fichiers ne sont pas perdus.
            </p>
          </div>
          {this.state.error && (
            <div className="bg-slate-50 rounded-2xl p-4 text-left border border-slate-100">
              <p className="text-xs font-mono text-rose-600 break-all">
                {this.state.error.message}
              </p>
            </div>
          )}
          <div className="flex flex-col sm:flex-row gap-3">
            <button
              onClick={() => this.setState({ hasError: false, error: null, errorInfo: null })}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-2xl transition-all"
            >
              <RefreshCw size={16} /> Réessayer
            </button>
            <button
              onClick={() => { window.location.href = '/'; }}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-2xl transition-all"
            >
              <Home size={16} /> Accueil
            </button>
          </div>
        </div>
      </div>
    );
  }
}
