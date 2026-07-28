import React, { useState, useEffect } from 'react';
import { AuditLog, UserProfile, AuditModule, AuditAction } from '../../types';
import { storage } from '../../lib/storage';
import {
  SearchCheck,
  Filter,
  Download,
  Search,
  User,
  ShieldAlert,
  Calendar,
  Layers,
  ArrowRight
} from 'lucide-react';

interface AuditoriaProps {
  currentUser: UserProfile;
}

export const Auditoria: React.FC<AuditoriaProps> = ({ currentUser }) => {
  if (currentUser.role === 'operador') {
    return (
      <div className="bg-white rounded-2xl p-8 text-center border border-slate-200 shadow-xs my-6">
        <SearchCheck className="w-12 h-12 text-red-600 mx-auto mb-3" />
        <h3 className="text-lg font-bold text-slate-800">Acesso Restrito</h3>
        <p className="text-xs text-slate-500 mt-1">O perfil de Operador não possui acesso aos Logs de Auditoria.</p>
      </div>
    );
  }

  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedModule, setSelectedModule] = useState<string>('todos');
  const [selectedAction, setSelectedAction] = useState<string>('todas');

  const isSuperAdmin = currentUser.role === 'super_admin';

  const loadData = async () => {
    const data = await storage.getAuditLogs();
    setLogs(data);
  };

  useEffect(() => {
    loadData();
    const unsubscribe = storage.subscribe(() => {
      loadData();
    });
    return () => unsubscribe();
  }, []);

  const filteredLogs = logs.filter((l) => {
    const q = searchQuery.toLowerCase();
    const matchesSearch =
      l.user_name.toLowerCase().includes(q) ||
      l.user_email.toLowerCase().includes(q) ||
      l.target_record.toLowerCase().includes(q);
    const matchesModule = selectedModule === 'todos' || l.module === selectedModule;
    const matchesAction = selectedAction === 'todas' || l.action === selectedAction;
    return matchesSearch && matchesModule && matchesAction;
  });

  const handleExportCSV = () => {
    const headers = ['ID', 'Data/Hora', 'Usuário', 'E-mail', 'Módulo', 'Ação', 'Registro', 'Dado Anterior', 'Dado Novo', 'IP'];
    const rows = filteredLogs.map((l) => [
      l.id,
      new Date(l.created_at).toLocaleString('pt-BR'),
      `"${l.user_name}"`,
      l.user_email,
      l.module,
      l.action,
      `"${l.target_record}"`,
      `"${l.old_value || ''}"`,
      `"${l.new_value || ''}"`,
      l.ip_address || ''
    ]);

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `auditoria_colegio_reacao_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  const getActionBadge = (a: AuditAction) => {
    switch (a) {
      case 'criacao':
        return <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded-full">Criação</span>;
      case 'edicao':
        return <span className="bg-blue-100 text-blue-800 text-[10px] font-bold px-2 py-0.5 rounded-full">Edição</span>;
      case 'exclusao':
        return <span className="bg-rose-100 text-rose-800 text-[10px] font-bold px-2 py-0.5 rounded-full">Exclusão</span>;
      case 'mudanca_status':
        return <span className="bg-amber-100 text-amber-800 text-[10px] font-bold px-2 py-0.5 rounded-full">Status</span>;
      case 'mudanca_role':
        return <span className="bg-purple-100 text-purple-800 text-[10px] font-bold px-2 py-0.5 rounded-full">Permissão</span>;
      case 'aprovacao':
        return <span className="bg-teal-100 text-teal-800 text-[10px] font-bold px-2 py-0.5 rounded-full">Aprovação</span>;
      default:
        return <span className="bg-slate-100 text-slate-800 text-[10px] font-bold px-2 py-0.5 rounded-full">Sistema</span>;
    }
  };

  return (
    <div className="space-y-6 pb-20 lg:pb-8">
      {/* Title Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <SearchCheck className="w-6 h-6 text-[#D32F2F]" />
            <h2 className="text-2xl font-serif-editorial font-bold text-gray-900">Log de Auditoria do Sistema</h2>
          </div>
          <p className="text-xs text-gray-500 mt-1">
            Histórico imutável de ações, alterações de dados e permissões dos usuários
          </p>
        </div>

        <button
          onClick={handleExportCSV}
          className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-slate-900 text-white font-bold text-xs rounded-xl hover:bg-slate-800 shadow-sm transition-colors"
        >
          <Download className="w-4 h-4" />
          <span>Exportar Relatório CSV</span>
        </button>
      </div>

      {/* Filter Bar */}
      <div className="bg-white p-4 rounded-xl shadow-xs border border-slate-200 grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar por usuário, e-mail ou registro..."
            className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-red-600"
          />
        </div>

        <select
          value={selectedModule}
          onChange={(e) => setSelectedModule(e.target.value)}
          className="w-full py-2 px-3 border border-slate-200 rounded-lg text-xs text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-red-600"
        >
          <option value="todos">Todos os Módulos</option>
          <option value="ordens_servico">Ordens de Serviço</option>
          <option value="equipamentos">Equipamentos</option>
          <option value="materiais">Requisição de Materiais</option>
          <option value="marketing">Marketing</option>
          <option value="suporte_tecnico">Suporte Técnico</option>
          <option value="usuarios">Gestão de Usuários</option>
        </select>

        <select
          value={selectedAction}
          onChange={(e) => setSelectedAction(e.target.value)}
          className="w-full py-2 px-3 border border-slate-200 rounded-lg text-xs text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-red-600"
        >
          <option value="todas">Todas as Ações</option>
          <option value="criacao">Criações</option>
          <option value="edicao">Edições</option>
          <option value="mudanca_status">Mudanças de Status</option>
          <option value="mudanca_role">Alteração de Nível/Role</option>
          <option value="aprovacao">Aprovações</option>
        </select>
      </div>

      {/* AUDIT LOG TABLE */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                <th className="py-3 px-4">Data & Hora</th>
                <th className="py-3 px-4">Usuário</th>
                <th className="py-3 px-4">Módulo</th>
                <th className="py-3 px-4">Tipo de Ação</th>
                <th className="py-3 px-4">Registro Afetado</th>
                <th className="py-3 px-4">Modificação (Anterior → Novo)</th>
                <th className="py-3 px-4 text-right">IP</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400 italic">
                    Nenhum registro de auditoria encontrado.
                  </td>
                </tr>
              ) : (
                filteredLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-4 font-mono text-[11px] text-slate-500 whitespace-nowrap">
                      {new Date(log.created_at).toLocaleDateString('pt-BR')} {new Date(log.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                    </td>
                    <td className="py-3 px-4">
                      <p className="font-bold text-slate-900">{log.user_name}</p>
                      <p className="text-[10px] text-slate-400">{log.user_email}</p>
                    </td>
                    <td className="py-3 px-4">
                      <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded-md font-semibold text-[11px]">
                        {log.module}
                      </span>
                    </td>
                    <td className="py-3 px-4">{getActionBadge(log.action)}</td>
                    <td className="py-3 px-4 font-semibold text-slate-800 max-w-[180px] truncate">
                      {log.target_record}
                    </td>
                    <td className="py-3 px-4">
                      {log.old_value || log.new_value ? (
                        <div className="flex items-center space-x-1.5 text-[11px]">
                          {log.old_value && <span className="text-slate-500 line-through">{log.old_value}</span>}
                          {log.old_value && log.new_value && <ArrowRight className="w-3 h-3 text-slate-400" />}
                          {log.new_value && <span className="font-bold text-slate-900">{log.new_value}</span>}
                        </div>
                      ) : (
                        <span className="text-slate-400 italic text-[10px]">—</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right font-mono text-[10px] text-slate-400">
                      {log.ip_address}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
