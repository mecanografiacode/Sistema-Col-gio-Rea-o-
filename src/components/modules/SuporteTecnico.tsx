import React, { useState, useEffect } from 'react';
import { TechTicket, FaqItem, UserProfile, TicketCategory, TicketStatus, OSPriority } from '../../types';
import { storage } from '../../lib/storage';
import { createSystemNotification } from '../../lib/notifications';
import {
  Wrench,
  Plus,
  HelpCircle,
  Search,
  CheckCircle2,
  Clock,
  X,
  Send,
  Building2,
  Paperclip,
  ChevronDown,
  ChevronUp
} from 'lucide-react';

interface SuporteTecnicoProps {
  currentUser: UserProfile;
}

export const SuporteTecnico: React.FC<SuporteTecnicoProps> = ({ currentUser }) => {
  const [tickets, setTickets] = useState<TechTicket[]>([]);
  const [faqItems, setFaqItems] = useState<FaqItem[]>([]);
  const [activeTab, setActiveTab] = useState<'tickets' | 'faq'>('tickets');
  const [faqSearch, setFaqSearch] = useState('');
  const [expandedFaqId, setExpandedFaqId] = useState<string | null>(null);

  // Modal States
  const [isNewModalOpen, setIsNewModalOpen] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState<TechTicket | null>(null);

  // Form State
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<TicketCategory>('rede');
  const [priority, setPriority] = useState<OSPriority>('media');
  const [sector, setSector] = useState(currentUser.department || 'Secretaria');
  const [attachmentUrl, setAttachmentUrl] = useState('');

  // Resolution note
  const [resolutionNotes, setResolutionNotes] = useState('');

  const isAdmin = currentUser.role === 'admin' || currentUser.role === 'super_admin';

  const loadData = async () => {
    const tik = await storage.getTechTickets();
    const faq = await storage.getFaqItems();
    setTickets(tik);
    setFaqItems(faq);
  };

  useEffect(() => {
    loadData();
    const unsubscribe = storage.subscribe(() => {
      loadData();
    });
    return () => unsubscribe();
  }, []);

  const handleCreateTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !description.trim()) return;

    const created = await storage.addTechTicket(
      {
        title,
        description,
        category,
        priority,
        status: 'aberto',
        requester_id: currentUser.id,
        requester_name: currentUser.full_name,
        sector,
        attachment_url: attachmentUrl || undefined
      },
      currentUser
    );

    // Notify IT admins
    const profiles = await storage.getProfiles();
    const tiAdmins = profiles.filter((p) => p.department.includes('TI') || p.role === 'admin' || p.role === 'super_admin');
    for (const adm of tiAdmins) {
      await createSystemNotification(
        adm.id,
        'Novo Chamado de TI Aberto',
        `Chamado #${created.id}: ${created.title}`,
        'suporte_tecnico',
        created.id
      );
    }

    setIsNewModalOpen(false);
    setTitle('');
    setDescription('');
    setAttachmentUrl('');
  };

  const handleUpdateStatus = async (ticketId: string, status: TicketStatus) => {
    await storage.updateTicketStatus(ticketId, status, resolutionNotes, currentUser);

    const target = tickets.find((t) => t.id === ticketId);
    if (target) {
      await createSystemNotification(
        target.requester_id,
        'Chamado de TI Atualizado',
        `Seu chamado #${ticketId} foi alterado para: ${status}`,
        'suporte_tecnico',
        ticketId
      );
    }

    setSelectedTicket(null);
    setResolutionNotes('');
  };

  const filteredFaq = faqItems.filter((f) => {
    const q = faqSearch.toLowerCase();
    return (
      f.question.toLowerCase().includes(q) ||
      f.answer.toLowerCase().includes(q) ||
      f.category.toLowerCase().includes(q)
    );
  });

  const getCategoryBadge = (cat: TicketCategory) => {
    switch (cat) {
      case 'hardware':
        return <span className="bg-slate-100 text-slate-800 text-[10px] font-bold px-2 py-0.5 rounded-md">Hardware</span>;
      case 'software':
        return <span className="bg-purple-100 text-purple-800 text-[10px] font-bold px-2 py-0.5 rounded-md">Software</span>;
      case 'rede':
        return <span className="bg-blue-100 text-blue-800 text-[10px] font-bold px-2 py-0.5 rounded-md">Rede / Wi-Fi</span>;
      case 'acesso_login':
        return <span className="bg-amber-100 text-amber-800 text-[10px] font-bold px-2 py-0.5 rounded-md">Acesso / Login</span>;
      default:
        return <span className="bg-slate-100 text-slate-700 text-[10px] font-bold px-2 py-0.5 rounded-md">Outro</span>;
    }
  };

  const getStatusBadge = (st: TicketStatus) => {
    switch (st) {
      case 'aberto':
        return <span className="bg-rose-100 text-rose-800 border border-rose-300 text-xs font-semibold px-2.5 py-0.5 rounded-full">Aberto</span>;
      case 'em_atendimento':
        return <span className="bg-blue-100 text-blue-800 border border-blue-300 text-xs font-semibold px-2.5 py-0.5 rounded-full">Em Atendimento</span>;
      case 'resolvido':
        return <span className="bg-emerald-100 text-emerald-800 border border-emerald-300 text-xs font-semibold px-2.5 py-0.5 rounded-full">Resolvido</span>;
      case 'fechado':
        return <span className="bg-slate-100 text-slate-700 border border-slate-300 text-xs font-semibold px-2.5 py-0.5 rounded-full">Fechado</span>;
    }
  };

  return (
    <div className="space-y-6 pb-20 lg:pb-8">
      {/* Title Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <Wrench className="w-6 h-6 text-[#D32F2F]" />
            <h2 className="text-2xl font-serif-editorial font-bold text-gray-900">Suporte Técnico & TI</h2>
          </div>
          <p className="text-xs text-gray-500 mt-1">
            Chamados internos de informática, rede, computadores e base de conhecimento
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <div className="bg-slate-100 p-1 rounded-xl flex space-x-1 border border-slate-200 text-xs font-bold">
            <button
              onClick={() => setActiveTab('tickets')}
              className={`px-3 py-1.5 rounded-lg transition-colors flex items-center space-x-1 ${
                activeTab === 'tickets' ? 'bg-white text-red-600 shadow-xs' : 'text-slate-600'
              }`}
            >
              <Wrench className="w-3.5 h-3.5" />
              <span>Chamados</span>
            </button>
            <button
              onClick={() => setActiveTab('faq')}
              className={`px-3 py-1.5 rounded-lg transition-colors flex items-center space-x-1 ${
                activeTab === 'faq' ? 'bg-white text-red-600 shadow-xs' : 'text-slate-600'
              }`}
            >
              <HelpCircle className="w-3.5 h-3.5" />
              <span>Base de Conhecimento FAQ</span>
            </button>
          </div>

          <button
            onClick={() => setIsNewModalOpen(true)}
            className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-red-600 text-white font-bold text-xs rounded-xl hover:bg-red-700 shadow-sm transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Abrir Chamado TI</span>
          </button>
        </div>
      </div>

      {activeTab === 'tickets' ? (
        /* TICKETS LIST */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {tickets.map((t) => (
            <div
              key={t.id}
              onClick={() => setSelectedTicket(t)}
              className="bg-white rounded-xl border border-slate-200 shadow-xs hover:shadow-md transition-all p-4 cursor-pointer flex flex-col justify-between group"
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="font-mono text-xs text-slate-400 font-bold">#{t.id}</span>
                  <div className="flex items-center space-x-1">
                    {getCategoryBadge(t.category)}
                    {getStatusBadge(t.status)}
                  </div>
                </div>

                <h3 className="text-sm font-bold text-slate-900 group-hover:text-red-600 transition-colors">
                  {t.title}
                </h3>
                <p className="text-xs text-slate-500 mt-1 line-clamp-2 leading-relaxed">
                  {t.description}
                </p>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                <span className="flex items-center space-x-1">
                  <Building2 className="w-3.5 h-3.5 text-slate-400" />
                  <span>{t.sector}</span>
                </span>
                <span className="text-[11px] text-slate-400">Solicitante: {t.requester_name.split(' ')[0]}</span>
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* FAQ KNOWLEDGE BASE */
        <div className="space-y-4">
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-7 top-7" />
            <input
              type="text"
              value={faqSearch}
              onChange={(e) => setFaqSearch(e.target.value)}
              placeholder="Pesquisar soluções de problemas de Wi-Fi, projetor, Chromebooks, senhas..."
              className="w-full pl-9 pr-3 py-2.5 border border-slate-200 rounded-lg text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-red-600"
            />
          </div>

          <div className="space-y-3">
            {filteredFaq.map((faq) => {
              const isExpanded = expandedFaqId === faq.id;
              return (
                <div key={faq.id} className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-2xs">
                  <button
                    onClick={() => setExpandedFaqId(isExpanded ? null : faq.id)}
                    className="w-full p-4 text-left flex items-center justify-between hover:bg-slate-50 transition-colors"
                  >
                    <div>
                      <span className="text-[10px] font-bold text-red-600 uppercase tracking-wider">
                        {faq.category}
                      </span>
                      <h4 className="text-sm font-bold text-slate-900 mt-0.5">{faq.question}</h4>
                    </div>
                    {isExpanded ? <ChevronUp className="w-5 h-5 text-slate-400" /> : <ChevronDown className="w-5 h-5 text-slate-400" />}
                  </button>

                  {isExpanded && (
                    <div className="px-4 pb-4 pt-2 border-t border-slate-100 bg-slate-50/50 text-xs text-slate-700 leading-relaxed space-y-2">
                      <p>{faq.answer}</p>
                      <div className="flex items-center space-x-1 pt-1">
                        {faq.tags.map((tag) => (
                          <span key={tag} className="text-[10px] bg-slate-200 text-slate-700 px-2 py-0.5 rounded-md">
                            #{tag}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* NEW TICKET MODAL */}
      {isNewModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
            <div className="px-6 py-4 bg-red-600 text-white flex items-center justify-between">
              <h3 className="text-sm font-bold flex items-center gap-2">
                <Wrench className="w-4 h-4" /> Abrir Chamado de TI
              </h3>
              <button onClick={() => setIsNewModalOpen(false)} className="text-white hover:opacity-80">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateTicket} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Assunto / Problema</label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Ex: Sinal de Wi-Fi caindo na sala 202"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-red-600"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Categoria TI</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value as TicketCategory)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-red-600"
                  >
                    <option value="rede">Rede / Wi-Fi</option>
                    <option value="hardware">Hardware / Periféricos</option>
                    <option value="software">Software / Programas</option>
                    <option value="acesso_login">Acesso / Senha do Portal</option>
                    <option value="outro">Outro</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Prioridade</label>
                  <select
                    value={priority}
                    onChange={(e) => setPriority(e.target.value as OSPriority)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-red-600"
                  >
                    <option value="baixa">Baixa</option>
                    <option value="media">Média</option>
                    <option value="alta">Alta</option>
                    <option value="urgente">Urgente</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Setor / Local</label>
                <input
                  type="text"
                  required
                  value={sector}
                  onChange={(e) => setSector(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-red-600"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Descrição do Ocorrido</label>
                <textarea
                  required
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Explique com detalhes o erro ou solicitação..."
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-red-600"
                />
              </div>

              <div className="pt-3 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setIsNewModalOpen(false)}
                  className="px-4 py-2 border border-slate-300 text-slate-700 text-xs font-semibold rounded-lg hover:bg-slate-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-red-600 text-white text-xs font-bold rounded-lg hover:bg-red-700 shadow-sm"
                >
                  Abrir Chamado
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* TICKET DETAIL & ACTION MODAL */}
      {selectedTicket && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
            <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
              <div>
                <span className="text-xs font-mono text-red-400 font-bold">#{selectedTicket.id}</span>
                <h3 className="text-base font-bold">{selectedTicket.title}</h3>
              </div>
              <button onClick={() => setSelectedTicket(null)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="flex items-center justify-between bg-slate-50 p-3 rounded-xl border border-slate-200">
                <div>
                  <p className="text-[10px] text-slate-400 uppercase font-bold">Status Atual</p>
                  <div className="mt-1">{getStatusBadge(selectedTicket.status)}</div>
                </div>
                <div className="text-right">
                  <p className="text-[10px] text-slate-400 uppercase font-bold">Solicitante</p>
                  <p className="text-xs font-bold text-slate-800 mt-1">{selectedTicket.requester_name}</p>
                </div>
              </div>

              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs text-slate-800">
                <p className="font-bold mb-1">Descrição:</p>
                <p>{selectedTicket.description}</p>
              </div>

              {selectedTicket.resolution_notes && (
                <div className="bg-emerald-50 p-3 rounded-xl border border-emerald-200 text-xs text-emerald-900">
                  <p className="font-bold mb-1">Resolução do Suporte TI:</p>
                  <p>{selectedTicket.resolution_notes}</p>
                </div>
              )}

              {/* ADMIN RESOLUTION ACTIONS */}
              {isAdmin && (
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
                  <h4 className="text-xs font-bold text-slate-900 uppercase">Ação da Equipe de TI</h4>
                  <textarea
                    rows={2}
                    value={resolutionNotes}
                    onChange={(e) => setResolutionNotes(e.target.value)}
                    placeholder="Instruções de resolução ou solução aplicada..."
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs text-slate-900 bg-white"
                  />
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      onClick={() => handleUpdateStatus(selectedTicket.id, 'em_atendimento')}
                      className="py-2 bg-blue-600 text-white font-bold text-xs rounded-lg hover:bg-blue-700"
                    >
                      Em Atendimento
                    </button>
                    <button
                      onClick={() => handleUpdateStatus(selectedTicket.id, 'resolvido')}
                      className="py-2 bg-emerald-600 text-white font-bold text-xs rounded-lg hover:bg-emerald-700"
                    >
                      Marcar Resolvido
                    </button>
                    <button
                      onClick={() => handleUpdateStatus(selectedTicket.id, 'fechado')}
                      className="py-2 bg-slate-700 text-white font-bold text-xs rounded-lg hover:bg-slate-800"
                    >
                      Fechar Chamado
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
