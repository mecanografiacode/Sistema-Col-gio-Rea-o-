import React, { useState, useEffect } from 'react';
import { MarketingContent, MarketingMetric, UserProfile, MarketingStatus, MarketingContentType } from '../../types';
import { storage } from '../../lib/storage';
import {
  Megaphone,
  Plus,
  Calendar as CalendarIcon,
  LayoutGrid,
  TrendingUp,
  Sparkles,
  Instagram,
  ShieldCheck,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  X,
  Play,
  Copy,
  Check,
  Target,
  FileText,
  Clock,
  Video,
  Layers,
  MessageCircle,
  Hash,
  Pencil,
  Trash2,
  RefreshCw,
  Lightbulb,
  CheckCircle2,
  AlertCircle,
  List
} from 'lucide-react';

interface MarketingProps {
  currentUser: UserProfile;
}

interface AiIdeaResponse {
  title: string;
  content_type: MarketingContentType;
  category: string;
  hook: string;
  script: string;
  caption: string;
  hashtags: string[];
  target_audience: string;
  audio_suggestion?: string;
  has_image_authorization: boolean;
  notes?: string;
}

export const Marketing: React.FC<MarketingProps> = ({ currentUser }) => {
  if (currentUser.role === 'operador') {
    return (
      <div className="bg-white rounded-2xl p-8 text-center border border-slate-200 shadow-xs my-6">
        <Megaphone className="w-12 h-12 text-red-600 mx-auto mb-3" />
        <h3 className="text-lg font-bold text-slate-800">Acesso Restrito</h3>
        <p className="text-xs text-slate-500 mt-1">O perfil de Operador não possui acesso ao módulo de Marketing & Mídia.</p>
      </div>
    );
  }

  const [contents, setContents] = useState<MarketingContent[]>([]);
  const [metrics, setMetrics] = useState<MarketingMetric[]>([]);
  const [activeTab, setActiveTab] = useState<'calendar' | 'kanban' | 'ai_generator' | 'plan' | 'metrics'>('calendar');

  // Calendar State
  const [currentDate, setCurrentDate] = useState(new Date(2026, 6, 1)); // Default July/August 2026
  const [filterType, setFilterType] = useState<string>('todos');
  const [filterCategory, setFilterCategory] = useState<string>('todos');
  const [searchQuery, setSearchQuery] = useState('');
  const [calendarViewMode, setCalendarViewMode] = useState<'grid' | 'agenda'>('grid');

  // Kanban State
  const [kanbanMobileCol, setKanbanMobileCol] = useState<'todos' | 'ideia' | 'producao' | 'aprovacao' | 'publicado'>('todos');

  // Modals State
  const [isNewModalOpen, setIsNewModalOpen] = useState(false);
  const [isNewMetricModalOpen, setIsNewMetricModalOpen] = useState(false);
  const [selectedContent, setSelectedContent] = useState<MarketingContent | null>(null);
  const [editingContent, setEditingContent] = useState<MarketingContent | null>(null);

  // New Content Form State
  const [title, setTitle] = useState('');
  const [contentType, setContentType] = useState<MarketingContentType>('reels');
  const [category, setCategory] = useState('Captação de Alunos');
  const [scheduledDate, setScheduledDate] = useState(new Date().toISOString().split('T')[0]);
  const [status, setStatus] = useState<MarketingStatus>('ideia');
  const [assetLink, setAssetLink] = useState('');
  const [hasAuthImage, setHasAuthImage] = useState(true);
  const [notes, setNotes] = useState('');
  const [hook, setHook] = useState('');
  const [script, setScript] = useState('');
  const [caption, setCaption] = useState('');
  const [hashtags, setHashtags] = useState('#ColegioReacao #EducacaoDF #RecantoDasEmas');
  const [targetAudience, setTargetAudience] = useState('Pais de Alunos e Comunidade');

  // AI Generator Form State
  const [aiObjective, setAiObjective] = useState('Captação de Matrículas e Destaque Pedagógico');
  const [aiAudience, setAiAudience] = useState('Pais de Alunos Novos e Comunidade de Brasília/DF');
  const [aiFormat, setAiFormat] = useState('mistura');
  const [aiQuantity, setAiQuantity] = useState(3);
  const [aiNotes, setAiNotes] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [aiIdeas, setAiIdeas] = useState<AiIdeaResponse[]>([]);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  // New Metric Form State
  const [periodLabel, setPeriodLabel] = useState('Agosto / 2026');
  const [reach, setReach] = useState(35000);
  const [engagement, setEngagement] = useState(6.8);
  const [followers, setFollowers] = useState(310);
  const [leads, setLeads] = useState(52);

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

  // --- CALENDAR LOGIC ---
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const firstDayOfMonth = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const handlePrevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  const handleToday = () => {
    setCurrentDate(new Date());
  };

  const monthNames = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
  ];

  const handleOpenNewModalWithDate = (dateStr?: string) => {
    setTitle('');
    setContentType('reels');
    setCategory('Captação de Alunos');
    setScheduledDate(dateStr || new Date().toISOString().split('T')[0]);
    setStatus('ideia');
    setAssetLink('');
    setHasAuthImage(true);
    setNotes('');
    setHook('');
    setScript('');
    setCaption('');
    setHashtags('#ColegioReacao #EducacaoDF #RecantoDasEmas');
    setTargetAudience('Pais de Alunos e Comunidade');
    setIsNewModalOpen(true);
  };

  const handleCreateContent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    const parsedHashtags = hashtags
      .split(' ')
      .map((h) => h.trim())
      .filter((h) => h.startsWith('#') || h.length > 0);

    await storage.addMarketingContent(
      {
        title: title.trim(),
        content_type: contentType,
        category,
        scheduled_date: scheduledDate,
        status,
        responsible_id: currentUser.id,
        responsible_name: currentUser.full_name,
        asset_link: assetLink || undefined,
        has_image_authorization: hasAuthImage,
        notes: notes || undefined,
        hook: hook || undefined,
        script: script || undefined,
        caption: caption || undefined,
        hashtags: parsedHashtags,
        target_audience: targetAudience || undefined
      },
      currentUser
    );

    setIsNewModalOpen(false);
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingContent || !editingContent.title.trim()) return;

    const parsedHashtags = typeof hashtags === 'string'
      ? hashtags.split(' ').filter(Boolean)
      : hashtags;

    await storage.updateMarketingContent(
      editingContent.id,
      {
        title: editingContent.title,
        content_type: editingContent.content_type,
        category: editingContent.category,
        scheduled_date: editingContent.scheduled_date,
        status: editingContent.status,
        asset_link: editingContent.asset_link || undefined,
        has_image_authorization: editingContent.has_image_authorization,
        notes: editingContent.notes || undefined,
        hook: editingContent.hook || undefined,
        script: editingContent.script || undefined,
        caption: editingContent.caption || undefined,
        hashtags: parsedHashtags,
        target_audience: editingContent.target_audience || undefined
      },
      currentUser
    );

    setEditingContent(null);
    setSelectedContent(null);
  };

  const handleDeletePost = async (id: string) => {
    try {
      await storage.deleteMarketingContent(id, currentUser);
      setSelectedContent(null);
      setEditingContent(null);
    } catch (err: any) {
      console.error('Erro retornado pelo Supabase ao deletar conteúdo de marketing:', err?.message || err);
    }
  };

  const handleStatusChange = async (contentId: string, newStatus: MarketingStatus) => {
    await storage.updateMarketingStatus(contentId, newStatus, currentUser);
    if (selectedContent && selectedContent.id === contentId) {
      setSelectedContent({ ...selectedContent, status: newStatus });
    }
  };

  // --- AI GENERATOR CALL ---
  const handleGenerateAiIdeas = async () => {
    setAiLoading(true);
    setAiIdeas([]);

    try {
      const response = await fetch('/api/marketing/generate-ideas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          objective: aiObjective,
          targetAudience: aiAudience,
          contentType: aiFormat,
          quantity: aiQuantity,
          customNotes: aiNotes
        })
      });

      const data = await response.json();
      if (data.success && Array.isArray(data.ideas)) {
        setAiIdeas(data.ideas);
      }
    } catch (err) {
      console.error('Error generating AI ideas:', err);
    } finally {
      setAiLoading(false);
    }
  };

  const handleConvertIdeaToPost = (idea: AiIdeaResponse) => {
    setTitle(idea.title);
    setContentType(idea.content_type);
    setCategory(idea.category || 'Captação de Alunos');
    setHook(idea.hook || '');
    setScript(idea.script || '');
    setCaption(idea.caption || '');
    setHashtags(Array.isArray(idea.hashtags) ? idea.hashtags.join(' ') : '#ColegioReacao');
    setTargetAudience(idea.target_audience || 'Pais de Alunos');
    setHasAuthImage(idea.has_image_authorization);
    setNotes(idea.notes || 'Ideia gerada com IA Gemini');
    setScheduledDate(new Date().toISOString().split('T')[0]);
    setStatus('ideia');
    setIsNewModalOpen(true);
  };

  const copyToClipboard = (text: string, index: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const getContentTypeBadge = (type: MarketingContentType) => {
    switch (type) {
      case 'carrossel':
        return (
          <span className="bg-purple-100 text-purple-900 border border-purple-200 text-[10px] font-bold px-2 py-0.5 rounded-md inline-flex items-center gap-1">
            <Layers className="w-3 h-3 text-purple-600" /> Carrossel
          </span>
        );
      case 'reels':
        return (
          <span className="bg-pink-100 text-pink-900 border border-pink-200 text-[10px] font-bold px-2 py-0.5 rounded-md inline-flex items-center gap-1">
            <Video className="w-3 h-3 text-pink-600" /> Reels
          </span>
        );
      case 'story':
        return (
          <span className="bg-amber-100 text-amber-900 border border-amber-200 text-[10px] font-bold px-2 py-0.5 rounded-md inline-flex items-center gap-1">
            <Clock className="w-3 h-3 text-amber-600" /> Story
          </span>
        );
      default:
        return (
          <span className="bg-blue-100 text-blue-900 border border-blue-200 text-[10px] font-bold px-2 py-0.5 rounded-md inline-flex items-center gap-1">
            <FileText className="w-3 h-3 text-blue-600" /> Estático
          </span>
        );
    }
  };

  const getStatusBadge = (s: MarketingStatus) => {
    switch (s) {
      case 'ideia':
        return <span className="bg-slate-100 text-slate-700 text-[10px] font-bold px-2 py-0.5 rounded-full border border-slate-200">Ideia</span>;
      case 'producao':
        return <span className="bg-blue-100 text-blue-800 text-[10px] font-bold px-2 py-0.5 rounded-full border border-blue-200">Em Produção</span>;
      case 'aprovacao':
        return <span className="bg-amber-100 text-amber-800 text-[10px] font-bold px-2 py-0.5 rounded-full border border-amber-200">Em Aprovação</span>;
      case 'publicado':
        return <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded-full border border-emerald-200">Publicado</span>;
    }
  };

  // Filter contents
  const filteredContents = contents.filter((item) => {
    if (filterType !== 'todos' && item.content_type !== filterType) return false;
    if (filterCategory !== 'todos' && item.category !== filterCategory) return false;
    if (searchQuery.trim() && !item.title.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

  return (
    <div className="space-y-6 pb-20 lg:pb-8 font-['Plus_Jakarta_Sans',sans-serif]">
      {/* Title Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <div className="flex items-center space-x-2.5">
            <div className="p-2.5 bg-red-600 text-white rounded-xl shadow-xs shrink-0">
              <Megaphone className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-xl sm:text-2xl font-serif-editorial font-bold text-gray-900 leading-tight">Comunicação & Marketing Digital</h2>
                <span className="bg-pink-100 text-pink-800 text-[11px] font-bold px-2.5 py-0.5 rounded-full border border-pink-200 inline-flex items-center gap-1">
                  <Instagram className="w-3 h-3" /> @colegioreacao
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Calendário Editorial, Ideias de Vídeos & Reels com IA Gemini e Métricas de Captação
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto">
          <button
            onClick={() => setActiveTab('ai_generator')}
            className={`flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'ai_generator'
                ? 'bg-purple-600 text-white shadow-md'
                : 'bg-purple-50 text-purple-700 border border-purple-200 hover:bg-purple-100'
            }`}
          >
            <Sparkles className="w-4 h-4 text-purple-300" />
            <span>Ideias com IA</span>
          </button>

          <button
            onClick={() => handleOpenNewModalWithDate()}
            className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 px-4 py-2 bg-red-600 text-white font-bold text-xs rounded-xl hover:bg-red-700 shadow-sm transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Novo Post</span>
          </button>
        </div>
      </div>

      {/* Navigation Tabs - Horizontally scrollable on mobile */}
      <div className="bg-white p-1.5 rounded-2xl border border-slate-200 flex items-center gap-1.5 text-xs font-bold shadow-2xs overflow-x-auto scrollbar-none whitespace-nowrap">
        <button
          onClick={() => setActiveTab('calendar')}
          className={`px-3.5 sm:px-4 py-2 rounded-xl transition-colors flex items-center space-x-2 shrink-0 ${
            activeTab === 'calendar' ? 'bg-slate-900 text-white shadow-xs' : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <CalendarIcon className="w-4 h-4 text-red-400" />
          <span>Calendário Editorial</span>
        </button>

        <button
          onClick={() => setActiveTab('kanban')}
          className={`px-3.5 sm:px-4 py-2 rounded-xl transition-colors flex items-center space-x-2 shrink-0 ${
            activeTab === 'kanban' ? 'bg-slate-900 text-white shadow-xs' : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <LayoutGrid className="w-4 h-4 text-blue-400" />
          <span>Kanban de Produção</span>
        </button>

        <button
          onClick={() => setActiveTab('ai_generator')}
          className={`px-3.5 sm:px-4 py-2 rounded-xl transition-colors flex items-center space-x-2 shrink-0 ${
            activeTab === 'ai_generator' ? 'bg-purple-600 text-white shadow-xs' : 'text-purple-700 bg-purple-50 hover:bg-purple-100'
          }`}
        >
          <Sparkles className="w-4 h-4" />
          <span>Gerador de Ideias (IA)</span>
        </button>

        <button
          onClick={() => setActiveTab('plan')}
          className={`px-3.5 sm:px-4 py-2 rounded-xl transition-colors flex items-center space-x-2 shrink-0 ${
            activeTab === 'plan' ? 'bg-slate-900 text-white shadow-xs' : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Target className="w-4 h-4 text-amber-400" />
          <span>Plano & Pilares</span>
        </button>

        <button
          onClick={() => setActiveTab('metrics')}
          className={`px-3.5 sm:px-4 py-2 rounded-xl transition-colors flex items-center space-x-2 shrink-0 ${
            activeTab === 'metrics' ? 'bg-slate-900 text-white shadow-xs' : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <TrendingUp className="w-4 h-4 text-emerald-400" />
          <span>Métricas de Impacto</span>
        </button>
      </div>

      {/* --- TAB 1: CALENDÁRIO EDITORIAL --- */}
      {activeTab === 'calendar' && (
        <div className="space-y-4">
          {/* Calendar Controls & Filters */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            {/* Month Switcher + View Mode Toggle */}
            <div className="flex flex-wrap items-center justify-between sm:justify-start gap-3">
              <div className="flex items-center space-x-2 sm:space-x-3">
                <button
                  onClick={handlePrevMonth}
                  className="p-2 hover:bg-slate-100 rounded-lg text-slate-700 transition-colors border border-slate-200"
                  title="Mês Anterior"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>

                <h3 className="text-sm sm:text-base font-bold text-slate-900 min-w-[120px] sm:min-w-[140px] text-center">
                  {monthNames[month]} {year}
                </h3>

                <button
                  onClick={handleNextMonth}
                  className="p-2 hover:bg-slate-100 rounded-lg text-slate-700 transition-colors border border-slate-200"
                  title="Próximo Mês"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>

                <button
                  onClick={handleToday}
                  className="px-2.5 py-1.5 bg-slate-100 text-slate-700 text-xs font-bold rounded-lg hover:bg-slate-200 transition-colors border border-slate-200"
                >
                  Hoje
                </button>
              </div>

              {/* Grade vs Agenda Mode Toggle */}
              <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs font-bold">
                <button
                  onClick={() => setCalendarViewMode('grid')}
                  className={`px-3 py-1 rounded-lg flex items-center gap-1.5 transition-colors ${
                    calendarViewMode === 'grid' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <CalendarIcon className="w-3.5 h-3.5 text-red-600" />
                  <span>Grade</span>
                </button>
                <button
                  onClick={() => setCalendarViewMode('agenda')}
                  className={`px-3 py-1 rounded-lg flex items-center gap-1.5 transition-colors ${
                    calendarViewMode === 'agenda' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <List className="w-3.5 h-3.5 text-blue-600" />
                  <span>Agenda</span>
                </button>
              </div>
            </div>

            {/* Quick Filters */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs w-full lg:w-auto">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar por palavra-chave..."
                className="px-3 py-1.5 border border-slate-300 rounded-lg text-xs text-slate-900 w-full focus:outline-none focus:ring-2 focus:ring-red-600"
              />

              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="px-3 py-1.5 border border-slate-300 rounded-lg text-xs text-slate-800 bg-white w-full"
              >
                <option value="todos">Todos Formatos</option>
                <option value="reels">Reels / Vídeos</option>
                <option value="carrossel">Carrosséis</option>
                <option value="story">Stories</option>
                <option value="post_estatico">Posts Estáticos</option>
              </select>

              <select
                value={filterCategory}
                onChange={(e) => setFilterCategory(e.target.value)}
                className="px-3 py-1.5 border border-slate-300 rounded-lg text-xs text-slate-800 bg-white w-full"
              >
                <option value="todos">Todos os Pilares</option>
                <option value="Captação de Alunos">Captação de Alunos</option>
                <option value="Vida Escolar">Vida Escolar</option>
                <option value="Pedagógico">Pedagógico</option>
                <option value="Esportes">Esportes & Arte</option>
                <option value="Depoimentos">Depoimentos</option>
              </select>
            </div>
          </div>

          {/* Month Grid View */}
          {calendarViewMode === 'grid' && (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
              <div className="overflow-x-auto">
                <div className="min-w-[700px]">
                  {/* Days Header */}
                  <div className="grid grid-cols-7 bg-slate-900 text-white text-center py-2.5 text-xs font-bold border-b border-slate-800">
                    <span>DOM</span>
                    <span>SEG</span>
                    <span>TER</span>
                    <span>QUA</span>
                    <span>QUI</span>
                    <span>SEX</span>
                    <span>SÁB</span>
                  </div>

                  {/* Calendar Days Cells */}
                  <div className="grid grid-cols-7 auto-rows-fr divide-x divide-y divide-slate-100 bg-slate-50/30">
                    {/* Empty leading offset cells */}
                    {Array.from({ length: firstDayOfMonth }).map((_, i) => (
                      <div key={`empty-${i}`} className="min-h-[110px] bg-slate-50/50 p-2" />
                    ))}

                    {/* Month Days */}
                    {Array.from({ length: daysInMonth }).map((_, i) => {
                      const dayNum = i + 1;
                      const formattedDay = dayNum < 10 ? `0${dayNum}` : `${dayNum}`;
                      const formattedMonth = month + 1 < 10 ? `0${month + 1}` : `${month + 1}`;
                      const dateKey = `${year}-${formattedMonth}-${formattedDay}`;

                      const dayPosts = filteredContents.filter((c) => c.scheduled_date === dateKey);

                      const isToday =
                        new Date().getDate() === dayNum &&
                        new Date().getMonth() === month &&
                        new Date().getFullYear() === year;

                      return (
                        <div
                          key={dateKey}
                          className={`min-h-[120px] p-2 transition-colors flex flex-col justify-between group hover:bg-red-50/30 ${
                            isToday ? 'bg-red-50/60 ring-2 ring-red-500 ring-inset' : 'bg-white'
                          }`}
                        >
                          <div>
                            <div className="flex items-center justify-between mb-1.5">
                              <span
                                className={`text-xs font-bold px-1.5 py-0.5 rounded-full ${
                                  isToday ? 'bg-red-600 text-white' : 'text-slate-700'
                                }`}
                              >
                                {dayNum}
                              </span>

                              <button
                                onClick={() => handleOpenNewModalWithDate(dateKey)}
                                className="text-red-600 hover:bg-red-100 p-1 rounded-md transition-opacity sm:opacity-0 sm:group-hover:opacity-100"
                                title="Agendar neste dia"
                              >
                                <Plus className="w-3.5 h-3.5" />
                              </button>
                            </div>

                            {/* Day Scheduled Posts */}
                            <div className="space-y-1">
                              {dayPosts.map((post) => (
                                <div
                                  key={post.id}
                                  onClick={() => setSelectedContent(post)}
                                  className="p-1.5 rounded-lg border border-slate-200 bg-white hover:border-red-300 shadow-2xs hover:shadow-xs cursor-pointer transition-all space-y-1"
                                >
                                  <div className="flex flex-wrap items-center justify-between gap-1">
                                    {getContentTypeBadge(post.content_type)}
                                    {getStatusBadge(post.status)}
                                  </div>
                                  <p className="text-[11px] font-bold text-slate-800 line-clamp-2 leading-tight">
                                    {post.title}
                                  </p>
                                </div>
                              ))}
                            </div>
                          </div>

                          {dayPosts.length === 0 && (
                            <button
                              onClick={() => handleOpenNewModalWithDate(dateKey)}
                              className="text-[10px] text-slate-400 py-1 hover:text-red-600 text-center transition-opacity sm:opacity-0 sm:group-hover:opacity-100"
                            >
                              + Agendar Post
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Agenda / List View for Mobile & Compact Browsing */}
          {calendarViewMode === 'agenda' && (
            <div className="space-y-3">
              {Array.from({ length: daysInMonth }).map((_, i) => {
                const dayNum = i + 1;
                const formattedDay = dayNum < 10 ? `0${dayNum}` : `${dayNum}`;
                const formattedMonth = month + 1 < 10 ? `0${month + 1}` : `${month + 1}`;
                const dateKey = `${year}-${formattedMonth}-${formattedDay}`;

                const dayPosts = filteredContents.filter((c) => c.scheduled_date === dateKey);
                const isToday =
                  new Date().getDate() === dayNum &&
                  new Date().getMonth() === month &&
                  new Date().getFullYear() === year;

                const dateObj = new Date(year, month, dayNum);
                const weekDayName = dateObj.toLocaleDateString('pt-BR', { weekday: 'long' });

                if (searchQuery.trim() || filterType !== 'todos' || filterCategory !== 'todos') {
                  if (dayPosts.length === 0) return null;
                }

                return (
                  <div
                    key={dateKey}
                    className={`bg-white rounded-2xl border p-4 shadow-2xs space-y-3 ${
                      isToday ? 'border-red-500 ring-2 ring-red-500/20 bg-red-50/20' : 'border-slate-200'
                    }`}
                  >
                    <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                      <div className="flex items-center space-x-2">
                        <span
                          className={`text-xs font-bold px-2.5 py-1 rounded-lg ${
                            isToday ? 'bg-red-600 text-white' : 'bg-slate-900 text-white'
                          }`}
                        >
                          Dia {dayNum}
                        </span>
                        <span className="text-xs font-bold text-slate-800 capitalize">
                          {weekDayName}, {formattedDay}/{formattedMonth}
                        </span>
                        {isToday && (
                          <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-red-100 text-red-800">
                            Hoje
                          </span>
                        )}
                      </div>

                      <button
                        onClick={() => handleOpenNewModalWithDate(dateKey)}
                        className="inline-flex items-center gap-1 text-xs font-bold text-red-600 bg-red-50 hover:bg-red-100 px-2.5 py-1 rounded-lg transition-colors"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Agendar</span>
                      </button>
                    </div>

                    {dayPosts.length === 0 ? (
                      <p className="text-xs text-slate-400 italic py-1">Nenhum post agendado para esta data.</p>
                    ) : (
                      <div className="space-y-2.5">
                        {dayPosts.map((post) => (
                          <div
                            key={post.id}
                            onClick={() => setSelectedContent(post)}
                            className="p-3 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-white hover:border-red-300 shadow-2xs cursor-pointer transition-all space-y-2"
                          >
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <div className="flex items-center space-x-2">
                                {getContentTypeBadge(post.content_type)}
                                <span className="text-[11px] font-bold text-slate-500 bg-white px-2 py-0.5 rounded border border-slate-200">
                                  {post.category}
                                </span>
                              </div>
                              {getStatusBadge(post.status)}
                            </div>

                            <h4 className="text-xs sm:text-sm font-bold text-slate-900">{post.title}</h4>

                            {post.hook && (
                              <p className="text-xs text-amber-900 bg-amber-50 p-2 rounded-lg border border-amber-200/60 italic">
                                ⚡ "{post.hook}"
                              </p>
                            )}

                            <div className="flex items-center justify-between text-[11px] pt-1 text-slate-500 border-t border-slate-100">
                              <span className="flex items-center gap-1">
                                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                                {post.has_image_authorization ? 'LGPD Autorizado' : 'Sem foto de aluno'}
                              </span>
                              <span className="text-red-600 font-bold hover:underline">Ver Detalhes →</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* --- TAB 2: KANBAN EDITORIAL --- */}
      {activeTab === 'kanban' && (
        <div className="space-y-4">
          {/* Mobile Column Selector Tabs */}
          <div className="md:hidden flex items-center gap-1.5 overflow-x-auto scrollbar-none pb-1 whitespace-nowrap">
            {[
              { id: 'todos', label: 'Todas' },
              { id: 'ideia', label: '1. Ideia' },
              { id: 'producao', label: '2. Em Produção' },
              { id: 'aprovacao', label: '3. Em Aprovação' },
              { id: 'publicado', label: '4. Publicado' }
            ].map((colTab) => (
              <button
                key={colTab.id}
                onClick={() => setKanbanMobileCol(colTab.id as any)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold shrink-0 transition-all ${
                  kanbanMobileCol === colTab.id
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'
                }`}
              >
                {colTab.label}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 items-start">
            {[
              { id: 'ideia', label: '1. Ideia / Planejamento', bg: 'bg-slate-50 border-slate-200' },
              { id: 'producao', label: '2. Em Produção (Gravação/Design)', bg: 'bg-blue-50/50 border-blue-100' },
              { id: 'aprovacao', label: '3. Aprovação Pedagógica', bg: 'bg-amber-50/50 border-amber-100' },
              { id: 'publicado', label: '4. Publicado no Instagram', bg: 'bg-emerald-50/50 border-emerald-100' }
            ].map((col) => {
              // Hide columns if mobile filter is active
              if (kanbanMobileCol !== 'todos' && kanbanMobileCol !== col.id) {
                return null;
              }

              const colContents = contents.filter((c) => c.status === col.id);

              return (
                <div key={col.id} className={`p-3.5 rounded-2xl border ${col.bg} flex flex-col space-y-3`}>
                  <div className="flex items-center justify-between px-1">
                    <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">{col.label}</h3>
                    <span className="bg-white text-slate-700 text-[11px] font-bold px-2.5 py-0.5 rounded-full border border-slate-200 shadow-2xs">
                      {colContents.length}
                    </span>
                  </div>

                  <div className="space-y-3 min-h-[200px] md:min-h-[300px]">
                    {colContents.length === 0 ? (
                      <div className="p-4 rounded-xl border border-dashed border-slate-200 bg-white/50 text-center text-xs text-slate-400">
                        Nenhum post nesta fase
                      </div>
                    ) : (
                      colContents.map((item) => (
                        <div
                          key={item.id}
                          onClick={() => setSelectedContent(item)}
                          className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs hover:shadow-md transition-all cursor-pointer space-y-2.5 group"
                        >
                          <div className="flex items-center justify-between gap-1">
                            {getContentTypeBadge(item.content_type)}
                            <span className="text-[10px] text-slate-400 font-medium shrink-0">
                              {new Date(item.scheduled_date).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}
                            </span>
                          </div>

                          <h4 className="text-xs font-bold text-slate-900 group-hover:text-red-600 transition-colors">
                            {item.title}
                          </h4>

                          {item.category && (
                            <span className="inline-block text-[10px] text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md">
                              📌 {item.category}
                            </span>
                          )}

                          {/* Hook preview if available */}
                          {item.hook && (
                            <p className="text-[11px] text-slate-600 bg-amber-50/70 p-2 rounded-lg border border-amber-100 italic line-clamp-2">
                              ⚡ <strong>Gancho 3s:</strong> "{item.hook}"
                            </p>
                          )}

                          {/* LGPD / ECA COMPLIANCE BADGE */}
                          <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[10px]">
                            <span
                              className={`inline-flex items-center gap-1 font-semibold ${
                                item.has_image_authorization ? 'text-emerald-700' : 'text-amber-700'
                              }`}
                            >
                              <ShieldCheck className="w-3.5 h-3.5" />
                              {item.has_image_authorization ? 'LGPD Autorizada' : 'Sem Imagem de Alunos'}
                            </span>

                            {item.asset_link && (
                              <span className="text-blue-600 flex items-center gap-0.5 font-bold hover:underline">
                                Design <ExternalLink className="w-2.5 h-2.5" />
                              </span>
                            )}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* --- TAB 3: GERADOR DE IDEIAS COM IA GEMINI --- */}
      {activeTab === 'ai_generator' && (
        <div className="space-y-6">
          {/* AI Banner Header */}
          <div className="bg-gradient-to-r from-purple-900 via-slate-900 to-indigo-900 text-white p-4 sm:p-6 rounded-2xl shadow-xl space-y-4">
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <span className="bg-purple-500/30 text-purple-200 border border-purple-400/30 text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-wider inline-flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5 text-purple-300" /> Powered by Gemini 3.1 Flash Lite
                </span>
                <h3 className="text-lg sm:text-xl font-serif-editorial font-bold">
                  Gerador de Roteiros, Reels e Estratégias para Instagram
                </h3>
                <p className="text-xs text-purple-200/90 max-w-2xl leading-relaxed">
                  Crie ganchos irresistíveis nos primeiros 3 segundos, roteiros de vídeos curtos, estruturas de carrosséis e legendas de alto engajamento focadas em captar novas famílias para o Colégio Reação.
                </p>
              </div>
            </div>

            {/* Quick Presets */}
            <div className="pt-2 border-t border-purple-800/50">
              <span className="text-[11px] font-bold text-purple-300 block mb-2">
                Sugestões Rápidas de Campanha:
              </span>
              <div className="flex flex-wrap gap-1.5 sm:gap-2">
                {[
                  'Captação de Matrículas 2027',
                  'Laboratório de Robótica & TI',
                  'Vida Escolar & Rotina do Aluno',
                  'Proposta Pedagógica & Aprovados',
                  'Depoimentos de Pais Satisfação',
                  'Esportes & Eventos Esportivos'
                ].map((preset) => (
                  <button
                    key={preset}
                    onClick={() => setAiObjective(preset)}
                    className="px-2.5 sm:px-3 py-1 bg-purple-800/40 hover:bg-purple-700/60 border border-purple-500/30 text-white text-[11px] sm:text-xs font-medium rounded-lg transition-colors"
                  >
                    + {preset}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* AI Generation Form */}
          <div className="bg-white p-4 sm:p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
            <h4 className="text-xs sm:text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
              <Lightbulb className="w-4 h-4 text-purple-600" /> Configuração da Geração
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Objetivo da Campanha
                </label>
                <input
                  type="text"
                  value={aiObjective}
                  onChange={(e) => setAiObjective(e.target.value)}
                  placeholder="Ex: Lançamento do Ano Letivo 2027"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-purple-600"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Público-Alvo
                </label>
                <input
                  type="text"
                  value={aiAudience}
                  onChange={(e) => setAiAudience(e.target.value)}
                  placeholder="Ex: Pais de alunos de 3 a 15 anos"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-purple-600"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Formato Pretendido
                </label>
                <select
                  value={aiFormat}
                  onChange={(e) => setAiFormat(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-purple-600"
                >
                  <option value="mistura">Mistura Inteligente (Reels + Carrossel)</option>
                  <option value="reels">Foco Exclusivo em REELS / Vídeos</option>
                  <option value="carrossel">Foco em Carrosséis Pedagógicos</option>
                  <option value="story">Stories Interativos</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Quantidade de Ideias
                </label>
                <select
                  value={aiQuantity}
                  onChange={(e) => setAiQuantity(Number(e.target.value))}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-purple-600"
                >
                  <option value={3}>3 Ideias Detalhadas</option>
                  <option value={5}>5 Ideias Detalhadas</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                Instruções Específicas / Detalhes do Colégio (Opcional)
              </label>
              <textarea
                rows={2}
                value={aiNotes}
                onChange={(e) => setAiNotes(e.target.value)}
                placeholder="Ex: Enfatizar que temos salas 100% climatizadas, bolsas de estudo por mérito e passeios pedagógicos."
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-purple-600"
              />
            </div>

            <button
              onClick={handleGenerateAiIdeas}
              disabled={aiLoading}
              className="w-full py-3 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-bold text-xs uppercase tracking-wider rounded-xl shadow-md transition-all flex items-center justify-center space-x-2 disabled:opacity-50"
            >
              {aiLoading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin text-white" />
                  <span>A IA Gemini está criando roteiros e estratégias...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 text-purple-200" />
                  <span>Gerar Ideias e Roteiros com IA Gemini</span>
                </>
              )}
            </button>
          </div>

          {/* Generated Ideas Result */}
          {aiIdeas.length > 0 && (
            <div className="space-y-4">
              <h4 className="text-xs sm:text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" /> Ideias Sugeridas ({aiIdeas.length})
              </h4>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {aiIdeas.map((idea, idx) => (
                  <div
                    key={idx}
                    className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 shadow-xs flex flex-col justify-between space-y-4 hover:shadow-md transition-shadow"
                  >
                    <div className="space-y-3">
                      <div className="flex items-center justify-between gap-2">
                        {getContentTypeBadge(idea.content_type)}
                        <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md shrink-0">
                          {idea.category}
                        </span>
                      </div>

                      <h3 className="text-xs sm:text-sm font-bold text-slate-900 leading-snug">{idea.title}</h3>

                      {/* Hook Box */}
                      {idea.hook && (
                        <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl space-y-1">
                          <span className="text-[10px] font-bold text-amber-800 uppercase flex items-center gap-1">
                            ⚡ Gancho Inicial (Primeiros 3 segundos):
                          </span>
                          <p className="text-xs font-semibold text-amber-950 italic">"{idea.hook}"</p>
                        </div>
                      )}

                      {/* Script Preview */}
                      {idea.script && (
                        <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
                          <span className="text-[10px] font-bold text-slate-700 uppercase flex items-center gap-1">
                            🎬 Roteiro / Estrutura de Slides:
                          </span>
                          <p className="text-xs text-slate-800 whitespace-pre-line leading-relaxed font-mono text-[11px] max-h-36 overflow-y-auto">
                            {idea.script}
                          </p>
                        </div>
                      )}

                      {/* Caption Box */}
                      {idea.caption && (
                        <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] font-bold text-slate-700 uppercase">
                              ✍️ Sugestão de Legenda:
                            </span>
                            <button
                              onClick={() => copyToClipboard(idea.caption, idx)}
                              className="text-[10px] text-blue-600 hover:underline flex items-center gap-0.5"
                            >
                              {copiedIndex === idx ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                              <span>{copiedIndex === idx ? 'Copiado!' : 'Copiar Legenda'}</span>
                            </button>
                          </div>
                          <p className="text-xs text-slate-700 line-clamp-3 italic">
                            {idea.caption}
                          </p>
                        </div>
                      )}

                      {/* Hashtags */}
                      {idea.hashtags && idea.hashtags.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {idea.hashtags.slice(0, 4).map((h, i) => (
                            <span key={i} className="text-[10px] text-purple-700 bg-purple-50 px-2 py-0.5 rounded-md font-mono">
                              {h}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="pt-3 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                      <span
                        className={`text-[10px] font-semibold flex items-center gap-1 ${
                          idea.has_image_authorization ? 'text-emerald-700' : 'text-amber-700'
                        }`}
                      >
                        <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
                        {idea.has_image_authorization ? 'Requer LGPD' : 'Sem Imagens de Alunos'}
                      </span>

                      <button
                        onClick={() => handleConvertIdeaToPost(idea)}
                        className="w-full sm:w-auto px-3 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl shadow-2xs transition-colors flex items-center justify-center gap-1"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Agendar no Calendário</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* --- TAB 4: PLANO ESTRATÉGICO & PILARES --- */}
      {activeTab === 'plan' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-2">
              <span className="text-xs font-bold text-slate-500 uppercase">Meta Semanal de Reels</span>
              <div className="flex items-baseline justify-between">
                <span className="text-2xl font-bold text-pink-600">3 Vídeos</span>
                <span className="text-xs text-emerald-600 font-bold">100% cumprida</span>
              </div>
              <p className="text-[11px] text-slate-500">Vídeos curtos no Reels aumentam o alcance orgânico em até 4x no DF.</p>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-2">
              <span className="text-xs font-bold text-slate-500 uppercase">Meta de Carrosséis</span>
              <div className="flex items-baseline justify-between">
                <span className="text-2xl font-bold text-purple-600">2 Posts</span>
                <span className="text-xs text-emerald-600 font-bold">Em andamento</span>
              </div>
              <p className="text-[11px] text-slate-500">Foco em carrosséis explicativos com dicas de estudo e robótica.</p>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-2">
              <span className="text-xs font-bold text-slate-500 uppercase">Stories Diários</span>
              <div className="flex items-baseline justify-between">
                <span className="text-2xl font-bold text-amber-600">5+ Stories/dia</span>
                <span className="text-xs text-amber-600 font-bold">Ativo hoje</span>
              </div>
              <p className="text-[11px] text-slate-500">Acolhimento da manhã, refeições, intervalo e saídas com os pais.</p>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-2">
              <span className="text-xs font-bold text-slate-500 uppercase">Conformidade LGPD / ECA</span>
              <div className="flex items-baseline justify-between">
                <span className="text-2xl font-bold text-emerald-600">100% Protegido</span>
                <ShieldCheck className="w-5 h-5 text-emerald-600" />
              </div>
              <p className="text-[11px] text-slate-500">Verificação obrigatória dos termos de imagem assinados na matrícula.</p>
            </div>
          </div>

          {/* Pilares Editoriais */}
          <div className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
            <h3 className="text-xs sm:text-sm font-bold text-slate-900 uppercase tracking-wider">
              Pilares Editoriais do Colégio Reação
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                <div className="flex justify-between items-center">
                  <h4 className="text-xs font-bold text-slate-900">1. Excelência Pedagógica & Aprovações (40%)</h4>
                  <span className="text-xs font-bold text-blue-600">Captação</span>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Destaques dos projetos de robótica, simulação de exames, olimpíadas de conhecimento e índice de aprovação nas universidades.
                </p>
              </div>

              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                <div className="flex justify-between items-center">
                  <h4 className="text-xs font-bold text-slate-900">2. Formação Humana & Esportes (30%)</h4>
                  <span className="text-xs font-bold text-emerald-600">Valores</span>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Jogos escolares, inteligência emocional, trabalho em equipe e projetos sociais promovidos pelos alunos do Colégio Reação.
                </p>
              </div>

              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                <div className="flex justify-between items-center">
                  <h4 className="text-xs font-bold text-slate-900">3. Infraestrutura & Segurança (15%)</h4>
                  <span className="text-xs font-bold text-purple-600">Confiança</span>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Salas climatizadas, laboratórios modernos, catracas de acesso seguro e câmeras para tranquilidade dos pais.
                </p>
              </div>

              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                <div className="flex justify-between items-center">
                  <h4 className="text-xs font-bold text-slate-900">4. Depoimentos & Comunidade (15%)</h4>
                  <span className="text-xs font-bold text-amber-600">Prova Social</span>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Relatos sinceros de pais e alunos sobre a experiência no colégio, satisfação e atendimento do corpo docente.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* --- TAB 5: MÉTRICAS DE IMPACTO --- */}
      {activeTab === 'metrics' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <h3 className="text-xs sm:text-sm font-bold text-slate-800 uppercase">
              Relatórios Semestrais & Desempenho do Instagram
            </h3>
            <button
              onClick={() => setIsNewMetricModalOpen(true)}
              className="w-full sm:w-auto px-3.5 py-2 bg-slate-900 text-white font-bold text-xs rounded-xl hover:bg-slate-800 transition-colors text-center justify-center inline-flex items-center gap-1"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Registrar Métrica Semanal</span>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
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
                  <div className="flex justify-between bg-red-50 p-2 rounded-lg text-red-900 font-bold border border-red-100">
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

      {/* --- NEW / EDIT CONTENT MODAL --- */}
      {isNewModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white w-full max-w-xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
            <div className="px-4 sm:px-6 py-3.5 bg-red-600 text-white flex items-center justify-between shrink-0">
              <h3 className="text-xs sm:text-sm font-bold flex items-center gap-2">
                <Megaphone className="w-4 h-4" /> Agendar Conteúdo no Calendário
              </h3>
              <button onClick={() => setIsNewModalOpen(false)} className="text-white hover:opacity-80 p-1">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateContent} className="p-4 sm:p-6 space-y-4 overflow-y-auto">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Título do Post / Tema</label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Ex: 5 Vantagens do Nosso Laboratório de Robótica"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-red-600"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Formato</label>
                  <select
                    value={contentType}
                    onChange={(e) => setContentType(e.target.value as MarketingContentType)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-red-600"
                  >
                    <option value="reels">Reels / Vídeo Curto</option>
                    <option value="carrossel">Carrossel</option>
                    <option value="story">Story do Dia</option>
                    <option value="post_estatico">Post Estático</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Pilar / Categoria</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-red-600"
                  >
                    <option value="Captação de Alunos">Captação de Alunos</option>
                    <option value="Vida Escolar">Vida Escolar</option>
                    <option value="Pedagógico">Pedagógico & Robótica</option>
                    <option value="Esportes">Esportes & Arte</option>
                    <option value="Depoimentos">Depoimentos</option>
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

              {/* Gancho Inicial */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Gancho de Retenção (3 primeiros segundos)
                </label>
                <input
                  type="text"
                  value={hook}
                  onChange={(e) => setHook(e.target.value)}
                  placeholder="Ex: Sua escola prepara o aluno para a IA ou só para a prova?"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-red-600"
                />
              </div>

              {/* Roteiro / Slides */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Roteiro de Gravação / Estrutura de Slides
                </label>
                <textarea
                  rows={3}
                  value={script}
                  onChange={(e) => setScript(e.target.value)}
                  placeholder="00:00 - Cena 1: Alunos programando o robô&#10;00:05 - Cena 2: Depoimento curto do professor..."
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs text-slate-900 font-mono focus:outline-none focus:ring-2 focus:ring-red-600"
                />
              </div>

              {/* Legenda Pronta */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Legenda para o Instagram</label>
                <textarea
                  rows={3}
                  value={caption}
                  onChange={(e) => setCaption(e.target.value)}
                  placeholder="Texto completo que vai na legenda do post..."
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-red-600"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Hashtags</label>
                  <input
                    type="text"
                    value={hashtags}
                    onChange={(e) => setHashtags(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-red-600"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Link Canva / Drive</label>
                  <input
                    type="url"
                    value={assetLink}
                    onChange={(e) => setAssetLink(e.target.value)}
                    placeholder="https://canva.com/..."
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-red-600"
                  />
                </div>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                <label className="flex items-start space-x-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={hasAuthImage}
                    onChange={(e) => setHasAuthImage(e.target.checked)}
                    className="w-4 h-4 mt-0.5 text-red-600 rounded focus:ring-red-500 shrink-0"
                  />
                  <div>
                    <span className="text-xs font-bold text-slate-800 block">
                      Possui autorização de uso de imagem? (LGPD / ECA)
                    </span>
                    <span className="text-[11px] text-slate-500 block mt-0.5">
                      Verificação obrigatória para posts contendo fotos ou vídeos de alunos do Colégio Reação.
                    </span>
                  </div>
                </label>
              </div>

              <div className="pt-3 border-t border-slate-100 flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsNewModalOpen(false)}
                  className="w-full sm:w-auto px-4 py-2 border border-slate-300 text-slate-700 text-xs font-semibold rounded-lg hover:bg-slate-50 text-center"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="w-full sm:w-auto px-5 py-2 bg-red-600 text-white text-xs font-bold rounded-lg hover:bg-red-700 shadow-sm text-center"
                >
                  Salvar no Calendário
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- SELECTED CONTENT DETAIL MODAL --- */}
      {selectedContent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
            <div className="px-4 sm:px-6 py-3.5 bg-slate-900 text-white flex items-center justify-between shrink-0">
              <div>
                <div className="flex items-center space-x-2">
                  {getContentTypeBadge(selectedContent.content_type)}
                  <span className="text-xs text-red-400 font-mono font-bold">{selectedContent.category}</span>
                </div>
                <h3 className="text-sm sm:text-base font-bold text-white mt-1">{selectedContent.title}</h3>
              </div>
              <button onClick={() => setSelectedContent(null)} className="text-slate-400 hover:text-white p-1">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 sm:p-6 space-y-4 overflow-y-auto">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Mudar Estágio de Produção</label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {[
                    { id: 'ideia', label: '1. Ideia / Planejamento', bg: 'bg-slate-900' },
                    { id: 'producao', label: '2. Em Produção', bg: 'bg-blue-600' },
                    { id: 'aprovacao', label: '3. Em Aprovação', bg: 'bg-amber-600' },
                    { id: 'publicado', label: '4. Publicado', bg: 'bg-emerald-600' }
                  ].map((st) => (
                    <button
                      key={st.id}
                      onClick={() => handleStatusChange(selectedContent.id, st.id as MarketingStatus)}
                      className={`py-2 px-3 text-xs font-bold rounded-lg border transition-colors ${
                        selectedContent.status === st.id ? `${st.bg} text-white` : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                      }`}
                    >
                      {st.label}
                    </button>
                  ))}
                </div>
              </div>

              {selectedContent.hook && (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl space-y-1">
                  <span className="text-[10px] font-bold text-amber-800 uppercase">⚡ Gancho (3s):</span>
                  <p className="text-xs font-bold text-amber-950 italic">"{selectedContent.hook}"</p>
                </div>
              )}

              {selectedContent.script && (
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
                  <span className="text-[10px] font-bold text-slate-700 uppercase">🎬 Roteiro de Gravação:</span>
                  <p className="text-xs text-slate-800 whitespace-pre-line font-mono text-[11px] leading-relaxed">
                    {selectedContent.script}
                  </p>
                </div>
              )}

              {selectedContent.caption && (
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
                  <span className="text-[10px] font-bold text-slate-700 uppercase">✍️ Legenda do Instagram:</span>
                  <p className="text-xs text-slate-800 leading-relaxed italic">
                    {selectedContent.caption}
                  </p>
                </div>
              )}

              {selectedContent.asset_link && (
                <a
                  href={selectedContent.asset_link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block w-full py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-900 font-bold text-xs rounded-xl text-center border border-slate-300 transition-colors"
                >
                  Abrir Arquivo no Canva / Drive ↗
                </a>
              )}

              <div className="pt-3 border-t border-slate-200 flex flex-col-reverse sm:flex-row sm:items-center justify-between gap-2">
                <button
                  onClick={() => handleDeletePost(selectedContent.id)}
                  className="w-full sm:w-auto px-3 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-bold text-xs rounded-lg transition-colors flex items-center justify-center gap-1"
                >
                  <Trash2 className="w-3.5 h-3.5" /> Excluir Post
                </button>

                <button
                  onClick={() => setSelectedContent(null)}
                  className="w-full sm:w-auto px-4 py-2 bg-slate-900 text-white font-bold text-xs rounded-lg text-center"
                >
                  Fechar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* --- NEW METRIC MODAL --- */}
      {isNewMetricModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
            <div className="px-4 sm:px-6 py-3.5 bg-slate-900 text-white flex items-center justify-between shrink-0">
              <h3 className="text-xs sm:text-sm font-bold flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-emerald-400" /> Registrar Métrica do Perfil
              </h3>
              <button onClick={() => setIsNewMetricModalOpen(false)} className="text-white hover:opacity-80 p-1">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form
              onSubmit={async (e) => {
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
              }}
              className="p-4 sm:p-6 space-y-4 overflow-y-auto"
            >
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Rótulo do Período</label>
                <input
                  type="text"
                  required
                  value={periodLabel}
                  onChange={(e) => setPeriodLabel(e.target.value)}
                  placeholder="Ex: Agosto / 2026"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-red-600"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Alcance Total</label>
                  <input
                    type="number"
                    required
                    value={reach}
                    onChange={(e) => setReach(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-red-600"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Engajamento (%)</label>
                  <input
                    type="number"
                    step="0.1"
                    required
                    value={engagement}
                    onChange={(e) => setEngagement(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-red-600"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Novos Seguidores</label>
                  <input
                    type="number"
                    required
                    value={followers}
                    onChange={(e) => setFollowers(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-red-600"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Leads Matrícula</label>
                  <input
                    type="number"
                    required
                    value={leads}
                    onChange={(e) => setLeads(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-red-600"
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsNewMetricModalOpen(false)}
                  className="w-full sm:w-auto px-4 py-2 border border-slate-300 text-slate-700 text-xs font-semibold rounded-lg hover:bg-slate-50 text-center"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="w-full sm:w-auto px-5 py-2 bg-slate-900 text-white text-xs font-bold rounded-lg hover:bg-slate-800 shadow-sm text-center"
                >
                  Salvar Métrica
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
