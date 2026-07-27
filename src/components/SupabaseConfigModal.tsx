import React, { useState } from 'react';
import { saveSupabaseCredentials, clearSupabaseCredentials, isSupabaseConfigured } from '../lib/supabase';
import { SUPABASE_SQL_SCHEMA } from '../lib/mockData';
import { Database, Check, Copy, X, Key, Link, FileCode, RefreshCw } from 'lucide-react';

interface SupabaseConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved: () => void;
}

export const SupabaseConfigModal: React.FC<SupabaseConfigModalProps> = ({
  isOpen,
  onClose,
  onSaved
}) => {
  const [activeTab, setActiveTab] = useState<'config' | 'sql'>('config');
  const [url, setUrl] = useState(localStorage.getItem('colegio_supabase_url') || import.meta.env.VITE_SUPABASE_URL || '');
  const [anonKey, setAnonKey] = useState(localStorage.getItem('colegio_supabase_key') || import.meta.env.VITE_SUPABASE_ANON_KEY || '');
  const [copiedSql, setCopiedSql] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  if (!isOpen) return null;

  const isConfigured = isSupabaseConfigured();

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (url && anonKey) {
      saveSupabaseCredentials(url, anonKey);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2000);
      onSaved();
    }
  };

  const handleClear = () => {
    clearSupabaseCredentials();
    setUrl('');
    setAnonKey('');
    onSaved();
  };

  const handleCopySql = () => {
    navigator.clipboard.writeText(SUPABASE_SQL_SCHEMA);
    setCopiedSql(true);
    setTimeout(() => setCopiedSql(false), 2500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-red-600 rounded-lg">
              <Database className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="text-base font-bold">Integração Supabase — Colégio Reação</h3>
              <p className="text-xs text-slate-400">Banco Postgres, Auth, Storage e RLS</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Navigation Tabs */}
        <div className="flex border-b border-slate-200 bg-slate-50 px-6 pt-2">
          <button
            onClick={() => setActiveTab('config')}
            className={`pb-3 px-4 text-xs font-bold border-b-2 flex items-center space-x-2 ${
              activeTab === 'config'
                ? 'border-red-600 text-red-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Key className="w-4 h-4" />
            <span>Credenciais (URL + Anon Key)</span>
          </button>

          <button
            onClick={() => setActiveTab('sql')}
            className={`pb-3 px-4 text-xs font-bold border-b-2 flex items-center space-x-2 ${
              activeTab === 'sql'
                ? 'border-red-600 text-red-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <FileCode className="w-4 h-4" />
            <span>Script SQL (`supabase_schema.sql`)</span>
          </button>
        </div>

        {/* Tab Content */}
        <div className="p-6 overflow-y-auto flex-1">
          {activeTab === 'config' ? (
            <div className="space-y-5">
              <div className={`p-4 rounded-xl border ${
                isConfigured ? 'bg-emerald-50 border-emerald-200 text-emerald-900' : 'bg-amber-50 border-amber-200 text-amber-900'
              }`}>
                <div className="flex items-start space-x-3">
                  <div className={`p-1.5 rounded-lg mt-0.5 ${isConfigured ? 'bg-emerald-600 text-white' : 'bg-amber-500 text-white'}`}>
                    <Database className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold">
                      {isConfigured ? 'Supabase Conectado & Ativo' : 'Modo Demonstrativo com Armazenamento Local'}
                    </h4>
                    <p className="text-xs mt-1 leading-relaxed opacity-90">
                      {isConfigured
                        ? 'O aplicativo está pronto e configurado para salvar dados diretamente no Supabase.'
                        : 'Você pode testar e usar o app imediatamente em modo local. Para conectar ao seu Supabase, informe a URL e a Anon Key abaixo.'}
                    </p>
                  </div>
                </div>
              </div>

              <form onSubmit={handleSave} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    SUPABASE_URL
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                      <Link className="w-4 h-4" />
                    </div>
                    <input
                      type="url"
                      value={url}
                      onChange={(e) => setUrl(e.target.value)}
                      placeholder="https://xyzcompany.supabase.co"
                      className="block w-full pl-9 pr-3 py-2.5 border border-slate-300 rounded-lg text-xs font-mono text-slate-900 focus:outline-none focus:ring-2 focus:ring-red-600"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    SUPABASE_ANON_KEY
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                      <Key className="w-4 h-4" />
                    </div>
                    <input
                      type="text"
                      value={anonKey}
                      onChange={(e) => setAnonKey(e.target.value)}
                      placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                      className="block w-full pl-9 pr-3 py-2.5 border border-slate-300 rounded-lg text-xs font-mono text-slate-900 focus:outline-none focus:ring-2 focus:ring-red-600"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2">
                  <button
                    type="button"
                    onClick={handleClear}
                    className="text-xs font-medium text-slate-500 hover:text-red-600 underline"
                  >
                    Restaurar Padrão Local
                  </button>

                  <button
                    type="submit"
                    className="flex items-center space-x-2 px-5 py-2.5 bg-red-600 text-white rounded-lg text-xs font-bold hover:bg-red-700 shadow-sm transition-colors"
                  >
                    {saveSuccess ? (
                      <>
                        <Check className="w-4 h-4" />
                        <span>Salvo com Sucesso!</span>
                      </>
                    ) : (
                      <>
                        <RefreshCw className="w-4 h-4" />
                        <span>Salvar & Reinstanciar</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold text-slate-900">
                    Instruções para o Supabase SQL Editor
                  </h4>
                  <p className="text-xs text-slate-500">
                    Copie e cole este código no SQL Editor do Supabase para criar as tabelas, tipos e RLS.
                  </p>
                </div>
                <button
                  onClick={handleCopySql}
                  className="flex items-center space-x-1.5 px-3 py-1.5 bg-slate-900 text-white rounded-lg text-xs font-bold hover:bg-slate-800 transition-colors"
                >
                  {copiedSql ? (
                    <>
                      <Check className="w-4 h-4 text-emerald-400" />
                      <span>Copiado!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4" />
                      <span>Copiar SQL</span>
                    </>
                  )}
                </button>
              </div>

              <div className="bg-slate-950 text-slate-200 rounded-xl p-4 font-mono text-[11px] overflow-x-auto max-h-[350px] border border-slate-800">
                <pre>{SUPABASE_SQL_SCHEMA}</pre>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
