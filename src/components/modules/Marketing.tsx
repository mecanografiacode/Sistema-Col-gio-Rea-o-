import React, { useState, useEffect } from 'react';
import { MarketingContent, MarketingMetric, UserProfile, MarketingStatus, MarketingContentType } from '../../types';
import { storage } from '../../lib/storage';
import {
  Megaphone,
  Plus,
  Calendar as CalendarIcon,
  LayoutGrid,
  ListFilter,
  CheckSquare,
  ShieldCheck,
  TrendingUp,
  Instagram,
  Users,
  Award,
  X,
  ExternalLink,
  ChevronRight
} from 'lucide-react';

interface MarketingProps {
  currentUser: UserProfile;
}

export const Marketing: React.FC<MarketingProps> = ({ currentUser }) => {
  const [contents, setContents] = useState<MarketingContent[]>([]);
  const [metrics, setMetrics] = useState<MarketingMetric[]>([]);
  const [activeView, setActiveView] = useState<'kanban' | 'metrics'>('kanban');

  // Modal States
  const [isNewModalOpen, setIsNewModalOpen] = useState(false);
  const [isNewMetricModalOpen, setIsNewMetricModalOpen] = useState(false);
  const [selectedContent, setSelectedContent] = useState<MarketingContent | null>(null);

  // New Content Form State
  const [title, setTitle] = useState('');
  const [contentType, setContentType] = useState<MarketingContentType>('carrossel');
  const [scheduledDate, setScheduledDate] = useState(new Date().toISOString().split('T')[0]);
  const [status, setStatus] = useState<MarketingStatus>('ideia');
  const [assetLink, setAssetLink] = useState('');
  const [hasAuthImage, setHasAuthImage] = useState(true);
  const [notes, setNotes] = useState('');

  // New Metric Form State
  const [periodLabel, setPeriodLabel] = useState('Agosto / 2026');
  const [reach, setReach] = useState(30000);
  const [engagement, setEngagement] = useState(6.5);
  const [followers, setFollowers] = useState(250);
  const [leads, setLeads] = useState(40);

  const loadData = async () => {
    const cData = await storage.getMarketingContent();
    const mData = await storage.getMarketingMetrics();
    setContents(cData);
    setMetrics(mData);
  };

  useEffect(() => {
    loadData();
    const unsubscribe = storage.subscribe(() => {
      loadData();
    });
    return () => unsubscribe();
  }, []);

  const handleCreateContent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    await storage.addMarketingContent(
      {
        title,
        content_type: contentType,
        scheduled_date: scheduledDate,
        status,
        responsible_id: currentUser.id,
        responsible_name: currentUser.full_name,
        asset_link: assetLink || undefined,
        has_image_authorization: hasAuthImage,
        notes: notes || undefined
      },
      currentUser
    );

    setIsNewModalOpen(false);
    setTitle('');
    setAssetLink('');
    setNotes('');
  };

  const handleCreateMetric = async (e: React.FormEvent) => {
    e.preventDefault();
    await storage.addMarketingMetric(
      {
        period_label: periodLabel,
        instagram_reach: reach,
        engagement_rate: engagement,
        followers_gained: followers,
        leads_generated: leads
      },
      currentUser
    );
    setIsNewMetricModalOpen(false);
  };

  const handleStatusChange = async (contentId: string, newStatus: MarketingStatus) => {
    await storage.updateMarketingStatus(contentId, newStatus, currentUser);
    if (selectedContent && selectedContent.id === contentId) {
      setSelectedContent({ ...selectedContent, status: newStatus });
    }
  };

  const getContentTypeBadge = (type: MarketingContentType) => {
    switch (type) {
      case 'carrossel':
        return <span className="bg-purple-100 text-purple-800 border border-purple-200 text-[10px] font-bold px-2 py-0.5 rounded-md">Carrossel</span>;
      case 'reels':
        return <span className="bg-pink-100 text-pink-800 border border-pink-200 text-[10px] font-bold px-2 py-0.5 rounded-md">Reels</span>;
      case 'story':
        return <span className="bg-amber-100 text-amber-800 border border-amber-200 text-[10px] font-bold px-2 py-0.5 rounded-md">Story</span>;
      default:
        return <span className="bg-blue-100 text-blue-800 border border-blue-200 text-[10px] font-bold px-2 py-0.5 rounded-md">Post Estático</span>;
    }
  };

  const columns: { id: MarketingStatus; label: string; bg: string }[] = [
    { id: 'ideia', label: 'Ideia / Planejamento', bg: 'bg-slate-50 border-slate-200' },
    { id: 'producao', label: 'Em Produção', bg: 'bg-blue-50/50 border-blue-100' },
    { id: 'aprovacao', label: 'Aprovação Pedagógica', bg: 'bg-amber-50/50 border-amber-100' },
    { id: 'publicado', label: 'Publicado', bg: 'bg-emerald-50/50 border-emerald-100' }
  ];

  return (
    <div className="space-y-6 pb-20 lg:pb-8">
      {/* Title Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <Megaphone className="w-6 h-6 text-[#D32F2F]" />
            <h2 className="text-2xl font-serif-editorial font-bold text-gray-900">Comunicação & Marketing</h2>
          </div>
          <p className="text-xs text-gray-500 mt-1">
            Calendário editorial do @colegioreacao, reels, avisos e métricas de matrículas
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <div className="bg-slate-100 p-1 rounded-xl flex space-x-1 border border-slate-200 text-xs font-bold">
            <button
              onClick={() => setActiveView('kanban')}
              className={`px-3 py-1.5 rounded-lg transition-colors flex items-center space-x-1 ${
                activeView === 'kanban' ? 'bg-white text-red-600 shadow-xs' : 'text-slate-600'
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span>Kanban Editorial</span>
            </button>
            <button
              onClick={() => setActiveView('metrics')}
              className={`px-3 py-1.5 rounded-lg transition-colors flex items-center space-x-1 ${
                activeView === 'metrics' ? 'bg-white text-red-600 shadow-xs' : 'text-slate-600'
              }`}
            >
              <TrendingUp className="w-3.5 h-3.5" />
              <span>Métricas</span>
            </button>
          </div>

          <button
            onClick={() => setIsNewModalOpen(true)}
            className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-red-600 text-white font-bold text-xs rounded-xl hover:bg-red-700 shadow-sm transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Novo Post</span>
          </button>
        </div>
      </div>

      {activeView === 'kanban' ? (
        /* KANBAN BOARD */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 items-start">
          {columns.map((col) => {
            const colContents = contents.filter((c) => c.status === col.id);

            return (
              <div key={col.id} className={`p-3 rounded-2xl border ${col.bg} flex flex-col space-y-3`}>
                <div className="flex items-center justify-between px-1">
                  <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">{col.label}</h3>
                  <span className="bg-white text-slate-700 text-[11px] font-bold px-2 py-0.5 rounded-full border border-slate-200 shadow-2xs">
                    {colContents.length}
                  </span>
                </div>

                <div className="space-y-3 min-h-[250px]">
                  {colContents.map((item) => (
                    <div
                      key={item.id}
                      onClick={() => setSelectedContent(item)}
                      className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs hover:shadow-md transition-all cursor-pointer space-y-2 group"
                    >
                      <div className="flex items-center justify-between">
                        {getContentTypeBadge(item.content_type)}
                        <span className="text-[10px] text-slate-400 font-medium">
                          {new Date(item.scheduled_date).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}
                        </span>
                      </div>

                      <h4 className="text-xs font-bold text-slate-900 group-hover:text-red-600 transition-colors">
                        {item.title}
                      </h4>

                      {/* LGPD / ECA COMPLIANCE BADGE */}
                      <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[10px]">
                        <span
                          className={`inline-flex items-center gap-1 font-semibold ${
                            item.has_image_authorization ? 'text-emerald-700' : 'text-amber-700'
                          }`}
                        >
                          <ShieldCheck className="w-3 h-3" />
                          {item.has_image_authorization ? 'LGPD Autorizada' : 'Sem Imagem de Alunos'}
                        </span>

                        {item.asset_link && (
                          <span className="text-blue-600 flex items-center gap-0.5 hover:underline">
                            Link <ExternalLink className="w-2.5 h-2.5" />
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* METRICS PANEL */
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <h3 className="text-sm font-bold text-slate-800 uppercase">
              Relatórios Semestrais & Desempenho do Instagram
            </h3>
            <button
              onClick={() => setIsNewMetricModalOpen(true)}
              className="px-3 py-1.5 bg-slate-900 text-white font-bold text-xs rounded-lg hover:bg-slate-800"
            >
              + Registrar Métrica Semanal
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {metrics.map((m) => (
              <div key={m.id} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-3">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                  <span className="text-xs font-bold text-slate-900">{m.period_label}</span>
                  <Instagram className="w-4 h-4 text-pink-600" />
                </div>

                <div className="space-y-2 text-xs">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Alcance do Perfil:</span>
                    <span className="font-bold text-slate-900">{m.instagram_reach.toLocaleString('pt-BR')}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Taxa de Engajamento:</span>
                    <span className="font-bold text-emerald-600">{m.engagement_rate}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Novos Seguidores:</span>
                    <span className="font-bold text-slate-900">+{m.followers_gained}</span>
                  </div>
                  <div className="flex justify-between bg-red-50 p-1.5 rounded-lg text-red-900 font-bold">
                    <span>Leads de Matrículas:</span>
                    <span>{m.leads_generated} famílias</span>
                  </div>
                </div>

                {m.notes && <p className="text-[11px] text-slate-500 italic pt-1">{m.notes}</p>}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* NEW CONTENT MODAL */}
      {isNewModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
            <div className="px-6 py-4 bg-red-600 text-white flex items-center justify-between">
              <h3 className="text-sm font-bold flex items-center gap-2">
                <Megaphone className="w-4 h-4" /> Agendar Conteúdo de Marketing
              </h3>
              <button onClick={() => setIsNewModalOpen(false)} className="text-white hover:opacity-80">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateContent} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Título do Post / Tema</label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Ex: Lançamento das Matrículas 2027"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-red-600"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Formato</label>
                  <select
                    value={contentType}
                    onChange={(e) => setContentType(e.target.value as MarketingContentType)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-red-600"
                  >
                    <option value="carrossel">Carrossel</option>
                    <option value="reels">Reels / Vídeo curto</option>
                    <option value="story">Story do Dia</option>
                    <option value="post_estatico">Post Estático</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Data Agendada</label>
                  <input
                    type="date"
                    required
                    value={scheduledDate}
                    onChange={(e) => setScheduledDate(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-red-600"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Link do Material (Canva / Drive)</label>
                <input
                  type="url"
                  value={assetLink}
                  onChange={(e) => setAssetLink(e.target.value)}
                  placeholder="https://canva.com/..."
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-red-600"
                />
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={hasAuthImage}
                    onChange={(e) => setHasAuthImage(e.target.checked)}
                    className="w-4 h-4 text-red-600 rounded focus:ring-red-500"
                  />
                  <span className="text-xs font-bold text-slate-800">
                    Possui autorização de uso de imagem? (LGPD / ECA)
                  </span>
                </label>
                <p className="text-[11px] text-slate-500 mt-1 pl-6">
                  Confirmação obrigatória para posts contendo fotos ou vídeos de alunos do Colégio Reação.
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Observações da Legenda / Copy</label>
                <textarea
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Instruções para a equipe de design e redação..."
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
                  Salvar no Kanban
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CONTENT DETAIL & STATUS CHANGE MODAL */}
      {selectedContent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
            <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
              <div>
                <span className="text-xs font-mono text-red-400 font-bold">{selectedContent.content_type.toUpperCase()}</span>
                <h3 className="text-base font-bold">{selectedContent.title}</h3>
              </div>
              <button onClick={() => setSelectedContent(null)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Mudar Estágio do Kanban</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => handleStatusChange(selectedContent.id, 'ideia')}
                    className={`py-2 px-3 text-xs font-bold rounded-lg border ${
                      selectedContent.status === 'ideia' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-700'
                    }`}
                  >
                    1. Ideia
                  </button>
                  <button
                    onClick={() => handleStatusChange(selectedContent.id, 'producao')}
                    className={`py-2 px-3 text-xs font-bold rounded-lg border ${
                      selectedContent.status === 'producao' ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-700'
                    }`}
                  >
                    2. Em Produção
                  </button>
                  <button
                    onClick={() => handleStatusChange(selectedContent.id, 'aprovacao')}
                    className={`py-2 px-3 text-xs font-bold rounded-lg border ${
                      selectedContent.status === 'aprovacao' ? 'bg-amber-600 text-white' : 'bg-slate-100 text-slate-700'
                    }`}
                  >
                    3. Aprovação
                  </button>
                  <button
                    onClick={() => handleStatusChange(selectedContent.id, 'publicado')}
                    className={`py-2 px-3 text-xs font-bold rounded-lg border ${
                      selectedContent.status === 'publicado' ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-700'
                    }`}
                  >
                    4. Publicado
                  </button>
                </div>
              </div>

              {selectedContent.asset_link && (
                <a
                  href={selectedContent.asset_link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block w-full py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-900 font-bold text-xs rounded-xl text-center border border-slate-300"
                >
                  Abrir Arquivos de Design / Mídia ↗
                </a>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
