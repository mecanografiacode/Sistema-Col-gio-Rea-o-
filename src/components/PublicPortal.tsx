import React, { useState, useEffect } from 'react';
import { Equipment, OSCategory, OSPriority, MaterialItem } from '../types';
import { storage } from '../lib/storage';
import { createSystemNotification } from '../lib/notifications';
import { ImageCaptureInput } from './common/ImageCaptureInput';
import { SignatureCanvas } from './common/SignatureCanvas';
import {
  Wrench,
  Package,
  Plus,
  Trash2,
  CheckCircle2,
  Building2,
  User,
  Phone,
  Camera,
  AlertTriangle,
  ClipboardList,
  Send,
  Copy,
  Check,
  ExternalLink,
  ArrowLeft,
  ShieldCheck,
  Share2,
  FileText,
  Sparkles,
  HelpCircle,
  Clock,
  Layers
} from 'lucide-react';

interface PublicPortalProps {
  initialType?: 'os' | 'materiais';
  onBackToLogin?: () => void;
}

export const PublicPortal: React.FC<PublicPortalProps> = ({
  initialType = 'os',
  onBackToLogin
}) => {
  const [activeTab, setActiveTab] = useState<'os' | 'materiais'>(initialType);
  const [equipments, setEquipments] = useState<Equipment[]>([]);
  const [copiedLink, setCopiedLink] = useState(false);

  // Success Confirmation State
  const [submittedProtocol, setSubmittedProtocol] = useState<{
    type: 'os' | 'materiais';
    id: string;
    title: string;
    requesterName: string;
    contact: string;
    sector: string;
    createdAt: string;
  } | null>(null);

  // --- FORM STATE: ORDEM DE SERVIÇO ---
  const [osRequesterName, setOsRequesterName] = useState('');
  const [osContact, setOsContact] = useState('');
  const [osTitle, setOsTitle] = useState('');
  const [osDescription, setOsDescription] = useState('');
  const [osCategory, setOsCategory] = useState<OSCategory>('predial');
  const [osPriority, setOsPriority] = useState<OSPriority>('media');
  const [osSector, setOsSector] = useState('Salas de Aula');
  const [osEquipmentId, setOsEquipmentId] = useState('');
  const [osPhotoUrl, setOsPhotoUrl] = useState('');
  const [osIsSubmitting, setOsIsSubmitting] = useState(false);

  // --- FORM STATE: REQUIÇÃO DE MATERIAIS ---
  const [matRequesterName, setMatRequesterName] = useState('');
  const [matContact, setMatContact] = useState('');
  const [matTurma, setMatTurma] = useState('');
  const [matRequestDate, setMatRequestDate] = useState(new Date().toISOString().split('T')[0]);
  const [matRequesterSignatureUrl, setMatRequesterSignatureUrl] = useState('');
  const [matTitle, setMatTitle] = useState('');
  const [matSector, setMatSector] = useState('Coordenação');
  const [matUrgency, setMatUrgency] = useState<OSPriority>('media');
  const [matJustification, setMatJustification] = useState('');
  const [matItems, setMatItems] = useState<MaterialItem[]>([
    { id: '1', name: '', quantity: 1, unit: 'unidades' }
  ]);
  const [matIsSubmitting, setMatIsSubmitting] = useState(false);

  useEffect(() => {
    loadEquipments();
  }, []);

  const loadEquipments = async () => {
    try {
      const eq = await storage.getEquipment();
      setEquipments(eq.filter((e) => e.status !== 'manutencao'));
    } catch (e) {
      console.warn('Erro ao carregar equipamentos no portal público:', e);
    }
  };

  const handleCopyPortalLink = (type?: 'os' | 'materiais') => {
    const baseUrl = window.location.origin + window.location.pathname;
    const targetType = type || activeTab;
    const shareUrl = `${baseUrl}?portal=${targetType}`;
    
    navigator.clipboard.writeText(shareUrl).then(() => {
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2500);
    });
  };

  // --- SUBMIT SERVICE ORDER ---
  const handleSubmitOS = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!osRequesterName.trim() || !osTitle.trim() || !osDescription.trim()) return;

    setOsIsSubmitting(true);
    try {
      const selectedEq = equipments.find((eq) => eq.id === osEquipmentId);
      const requesterFullName = `${osRequesterName.trim()} (Externo - ${osContact.trim() || 'Sem contato'})`;

      const created = await storage.addServiceOrder(
        {
          title: osTitle.trim(),
          description: osDescription.trim(),
          category: osCategory,
          priority: osPriority,
          status: 'aberta',
          sector: osSector,
          equipment_id: osEquipmentId || undefined,
          equipment_name: selectedEq?.name,
          created_by: 'externo-' + Date.now(),
          created_by_name: requesterFullName,
          photo_url: osPhotoUrl || undefined
        },
        null // Anonymous / External Actor
      );

      // Notify Admins
      try {
        const profiles = await storage.getProfiles();
        const admins = profiles.filter((p) => p.role === 'admin' || p.role === 'super_admin');
        for (const adm of admins) {
          await createSystemNotification(
            adm.id,
            '🔔 Nova OS Externa Recebida',
            `Chamado #${created.id} enviado por ${osRequesterName} (${osSector})`,
            'ordens_servico',
            created.id
          );
        }
      } catch (err) {
        console.warn('Erro ao notificar administradores:', err);
      }

      setSubmittedProtocol({
        type: 'os',
        id: created.id,
        title: created.title,
        requesterName: osRequesterName,
        contact: osContact,
        sector: osSector,
        createdAt: new Date().toLocaleString('pt-BR')
      });

      // Clear Form
      setOsTitle('');
      setOsDescription('');
      setOsPhotoUrl('');
      setOsEquipmentId('');
    } catch (err) {
      console.error('Erro ao registrar OS no portal público:', err);
      alert('Ocorreu um erro ao enviar seu chamado. Por favor, tente novamente.');
    } finally {
      setOsIsSubmitting(false);
    }
  };

  // --- SUBMIT MATERIAL REQUEST ---
  const handleAddMatItem = () => {
    setMatItems([
      ...matItems,
      { id: Date.now().toString(), name: '', quantity: 1, unit: 'unidades' }
    ]);
  };

  const handleRemoveMatItem = (id: string) => {
    if (matItems.length === 1) return;
    setMatItems(matItems.filter((i) => i.id !== id));
  };

  const handleMatItemChange = (id: string, field: keyof MaterialItem, value: any) => {
    setMatItems(matItems.map((i) => (i.id === id ? { ...i, [field]: value } : i)));
  };

  const handleSubmitMaterials = async (e: React.FormEvent) => {
    e.preventDefault();
    const validItems = matItems.filter((i) => i.name.trim() !== '');
    if (!matRequesterName.trim() || !matTitle.trim() || validItems.length === 0) return;

    if (!matRequesterSignatureUrl) {
      alert('Por favor, faça a assinatura digital antes de enviar a requisição.');
      return;
    }

    setMatIsSubmitting(true);
    try {
      const requesterFullName = matRequesterName.trim();

      const created = await storage.addMaterialRequest(
        {
          title: matTitle.trim(),
          requested_by: 'externo-' + Date.now(),
          requested_by_name: requesterFullName,
          sector: matSector,
          turma: matTurma.trim() || 'Geral / Sem Turma',
          request_date: matRequestDate ? new Date(matRequestDate).toLocaleDateString('pt-BR') : new Date().toLocaleDateString('pt-BR'),
          requester_signature_url: matRequesterSignatureUrl,
          urgency: matUrgency,
          justification: matJustification.trim(),
          items: validItems
        },
        null // Anonymous / External Actor
      );

      // Notify Admins
      try {
        const profiles = await storage.getProfiles();
        const admins = profiles.filter((p) => p.role === 'admin' || p.role === 'super_admin');
        for (const adm of admins) {
          await createSystemNotification(
            adm.id,
            '📦 Nova Requisição de Material Externa',
            `Solicitação #${created.id} enviada por ${matRequesterName} (${matSector})`,
            'materiais',
            created.id
          );
        }
      } catch (err) {
        console.warn('Erro ao notificar administradores:', err);
      }

      setSubmittedProtocol({
        type: 'materiais',
        id: created.id,
        title: created.title,
        requesterName: matRequesterName,
        contact: matContact,
        sector: matSector,
        createdAt: new Date().toLocaleString('pt-BR')
      });

      // Clear Form
      setMatTitle('');
      setMatJustification('');
      setMatItems([{ id: '1', name: '', quantity: 1, unit: 'unidades' }]);
    } catch (err) {
      console.error('Erro ao registrar requisição no portal público:', err);
      alert('Ocorreu um erro ao enviar sua requisição. Por favor, tente novamente.');
    } finally {
      setMatIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col font-['Plus_Jakarta_Sans',sans-serif] text-slate-800 selection:bg-red-100 selection:text-red-900 pb-16">
      {/* PUBLIC HEADER */}
      <header className="sticky top-0 z-40 bg-white border-b border-slate-200 shadow-xs">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <img
              src="https://i.imgur.com/8RP9DL7.png"
              alt="Logo Colégio Reação"
              className="h-10 w-auto object-contain"
            />
            <div>
              <div className="flex items-center space-x-2">
                <h1 className="text-base sm:text-lg font-serif-editorial font-bold text-slate-900 tracking-tight">
                  Colégio Reação
                </h1>
                <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3" /> Portal Externo
                </span>
              </div>
              <p className="text-xs text-slate-500 hidden sm:block">Abertura Rápida de Chamados & Requisições</p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => handleCopyPortalLink()}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg border border-slate-300 bg-slate-50 text-slate-700 hover:bg-slate-100 transition-colors shadow-2xs"
              title="Copiar link direto desta página"
            >
              {copiedLink ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                  <span className="text-emerald-700">Link Copiado!</span>
                </>
              ) : (
                <>
                  <Share2 className="w-3.5 h-3.5 text-slate-500" />
                  <span className="hidden sm:inline">Compartilhar Link</span>
                </>
              )}
            </button>

            {onBackToLogin && (
              <button
                onClick={onBackToLogin}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg bg-[#D32F2F] text-white hover:bg-red-800 transition-colors shadow-2xs"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Acesso Interno</span>
              </button>
            )}
          </div>
        </div>
      </header>

      {/* PORTAL BODY CONTAINER */}
      <main className="flex-1 max-w-4xl w-full mx-auto px-4 sm:px-6 pt-6">
        {/* BANNER INFORMATIVO */}
        <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-red-950 text-white rounded-2xl p-6 mb-6 shadow-md relative overflow-hidden">
          <div className="relative z-10">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/10 text-white text-[11px] font-semibold mb-3 backdrop-blur-xs border border-white/20">
              <Sparkles className="w-3.5 h-3.5 text-yellow-300" /> Atendimento sem necessidade de senha
            </div>
            <h2 className="text-xl sm:text-2xl font-serif-editorial font-bold tracking-tight">
              Abertura Externa de Ordens de Serviço e Materiais
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 mt-1 max-w-2xl">
              Canal aberto para professores, equipe externa, prestadores e comunidade escolar registrarem demandas de manutenção predial, TI, equipamentos e insumos com notificação imediata à administração do Colégio Reação.
            </p>
          </div>
        </div>

        {/* PROTOCOL CONFIRMATION SCREEN */}
        {submittedProtocol ? (
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 p-6 sm:p-8 text-center animate-in fade-in zoom-in-95 duration-200">
            <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4 ring-8 ring-emerald-50">
              <CheckCircle2 className="w-10 h-10" />
            </div>

            <h3 className="text-2xl font-serif-editorial font-bold text-slate-900">
              {submittedProtocol.type === 'os'
                ? 'Ordem de Serviço Enviada com Sucesso!'
                : 'Requisição de Material Registrada!'}
            </h3>

            <p className="text-xs text-slate-500 mt-1">
              Sua solicitação foi gravada diretamente no sistema e a equipe do Colégio Reação já foi notificada.
            </p>

            <div className="my-6 p-4 sm:p-6 bg-slate-50 rounded-xl border border-slate-200 text-left max-w-lg mx-auto space-y-3">
              <div className="flex items-center justify-between pb-3 border-b border-slate-200">
                <span className="text-xs text-slate-500 uppercase font-bold tracking-wider">Protocolo / ID</span>
                <span className="text-base font-mono font-bold text-[#D32F2F]">#{submittedProtocol.id}</span>
              </div>

              <div>
                <p className="text-xs text-slate-500 font-semibold uppercase">Título da Solicitação</p>
                <p className="text-sm font-bold text-slate-800">{submittedProtocol.title}</p>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <p className="text-slate-500 font-semibold uppercase">Solicitante</p>
                  <p className="font-semibold text-slate-800">{submittedProtocol.requesterName}</p>
                </div>
                <div>
                  <p className="text-slate-500 font-semibold uppercase">Setor / Local</p>
                  <p className="font-semibold text-slate-800">{submittedProtocol.sector}</p>
                </div>
              </div>

              {submittedProtocol.contact && (
                <div className="text-xs">
                  <p className="text-slate-500 font-semibold uppercase">Contato do Solicitante</p>
                  <p className="font-semibold text-slate-800">{submittedProtocol.contact}</p>
                </div>
              )}

              <div className="text-[11px] text-slate-400 pt-2 border-t border-slate-200 flex items-center justify-between">
                <span>Data do Registro:</span>
                <span>{submittedProtocol.createdAt}</span>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <button
                onClick={() => setSubmittedProtocol(null)}
                className="w-full sm:w-auto px-6 py-2.5 bg-[#D32F2F] text-white font-bold text-xs uppercase tracking-wider rounded-xl hover:bg-red-800 transition-colors shadow-sm"
              >
                Abrir Outro Chamado
              </button>

              {onBackToLogin && (
                <button
                  onClick={onBackToLogin}
                  className="w-full sm:w-auto px-6 py-2.5 bg-slate-100 text-slate-700 font-bold text-xs uppercase tracking-wider rounded-xl hover:bg-slate-200 transition-colors"
                >
                  Ir para Login do Sistema
                </button>
              )}
            </div>
          </div>
        ) : (
          /* REGULAR FORM CONTAINER */
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden">
            {/* TABS SWITCHER */}
            <div className="grid grid-cols-2 bg-slate-100 p-1.5 border-b border-slate-200">
              <button
                onClick={() => setActiveTab('os')}
                className={`py-3 px-4 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center space-x-2 transition-all ${
                  activeTab === 'os'
                    ? 'bg-white text-[#D32F2F] shadow-sm ring-1 ring-slate-200'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                }`}
              >
                <Wrench className="w-4 h-4 shrink-0 text-[#D32F2F]" />
                <span>Ordem de Serviço (OS)</span>
              </button>

              <button
                onClick={() => setActiveTab('materiais')}
                className={`py-3 px-4 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center space-x-2 transition-all ${
                  activeTab === 'materiais'
                    ? 'bg-white text-[#D32F2F] shadow-sm ring-1 ring-slate-200'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                }`}
              >
                <Package className="w-4 h-4 shrink-0 text-[#D32F2F]" />
                <span>Requisição de Materiais</span>
              </button>
            </div>

            {/* TAB CONTENT: OS FORM */}
            {activeTab === 'os' && (
              <form onSubmit={handleSubmitOS} className="p-6 sm:p-8 space-y-5">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                    <ClipboardList className="w-5 h-5 text-[#D32F2F]" /> Formulario de Ordem de Serviço
                  </h3>
                  <span className="text-xs text-slate-500 font-medium">* Campos obrigatórios</span>
                </div>

                {/* DADOS DO SOLICITANTE */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                      Seu Nome Completo *
                    </label>
                    <div className="relative">
                      <User className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                      <input
                        type="text"
                        required
                        value={osRequesterName}
                        onChange={(e) => setOsRequesterName(e.target.value)}
                        placeholder="Ex: João da Silva / Prof. Maria"
                        className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-red-600"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                      Telefone / WhatsApp ou E-mail
                    </label>
                    <div className="relative">
                      <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                      <input
                        type="text"
                        value={osContact}
                        onChange={(e) => setOsContact(e.target.value)}
                        placeholder="(61) 99999-9999 ou seu@email.com"
                        className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-red-600"
                      />
                    </div>
                  </div>
                </div>

                {/* DETALHES DA OS */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                      Setor / Local *
                    </label>
                    <select
                      value={osSector}
                      onChange={(e) => setOsSector(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-red-600 bg-white"
                    >
                      <option value="Salas de Aula">Salas de Aula</option>
                      <option value="Refeitório / Cantina">Refeitório / Cantina</option>
                      <option value="Quadra de Esportes">Quadra de Esportes</option>
                      <option value="Secretaria">Secretaria</option>
                      <option value="TI & Laboratório">TI & Laboratório</option>
                      <option value="Diretoria / Coordenação">Diretoria / Coordenação</option>
                      <option value="Manutenção & Limpeza">Manutenção & Limpeza</option>
                      <option value="Pátio / Área Externa">Pátio / Área Externa</option>
                      <option value="Outro Setor">Outro Setor</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                      Categoria da OS
                    </label>
                    <select
                      value={osCategory}
                      onChange={(e) => setOsCategory(e.target.value as OSCategory)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-red-600 bg-white"
                    >
                      <option value="predial">Manutenção Predial</option>
                      <option value="eletrica">Elétrica</option>
                      <option value="hidraulica">Hidráulica</option>
                      <option value="ti">TI & Informática</option>
                      <option value="marcenaria">Marcenaria / Móveis</option>
                      <option value="limpeza">Limpeza / Conservação</option>
                      <option value="outro">Outros Assuntos</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                      Grau de Urgência
                    </label>
                    <select
                      value={osPriority}
                      onChange={(e) => setOsPriority(e.target.value as OSPriority)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-red-600 bg-white"
                    >
                      <option value="baixa">🟢 Baixa (Rotina)</option>
                      <option value="media">🟡 Média (Normal)</option>
                      <option value="alta">🟠 Alta (Atendimento Rápido)</option>
                      <option value="critica">🔴 Crítica (Urgência Imediata)</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Título Resumido do Chamado *
                  </label>
                  <input
                    type="text"
                    required
                    value={osTitle}
                    onChange={(e) => setOsTitle(e.target.value)}
                    placeholder="Ex: Ar-condicionado da Sala 04 não liga ou Vazamento na torneira"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-red-600"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Descrição Detalhada do Problema *
                  </label>
                  <textarea
                    required
                    rows={3}
                    value={osDescription}
                    onChange={(e) => setOsDescription(e.target.value)}
                    placeholder="Descreva com detalhes o que está acontecendo, o local exato e qualquer observação importante para os técnicos..."
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-red-600"
                  />
                </div>

                {/* EQUIPAMENTO RELACIONADO (OPCIONAL) */}
                {equipments.length > 0 && (
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                      Equipamento Relacionado (Opcional)
                    </label>
                    <select
                      value={osEquipmentId}
                      onChange={(e) => setOsEquipmentId(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-red-600 bg-white"
                    >
                      <option value="">Nenhum equipamento cadastrado selecionado</option>
                      {equipments.map((eq) => (
                        <option key={eq.id} value={eq.id}>
                          {eq.name} (Patrimônio #{eq.asset_number}) - {eq.room_location}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {/* FOTO DO PROBLEMA */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Anexar Foto do Local / Defeito (Opcional)
                  </label>
                  <ImageCaptureInput
                    label="Foto do problema ou defeito"
                    value={osPhotoUrl}
                    onChange={(url) => setOsPhotoUrl(url)}
                  />
                </div>

                <div className="pt-4 border-t border-slate-200 flex items-center justify-end">
                  <button
                    type="submit"
                    disabled={osIsSubmitting}
                    className="w-full sm:w-auto px-8 py-3 bg-[#D32F2F] text-white font-bold text-xs uppercase tracking-wider rounded-xl hover:bg-red-800 disabled:opacity-50 flex items-center justify-center gap-2 shadow-md transition-all"
                  >
                    {osIsSubmitting ? (
                      <span>Registrando Ordem de Serviço...</span>
                    ) : (
                      <>
                        <Send className="w-4 h-4" />
                        <span>Enviar Ordem de Serviço</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}

            {/* TAB CONTENT: MATERIAL REQUISITION FORM */}
            {activeTab === 'materiais' && (
              <form onSubmit={handleSubmitMaterials} className="p-6 sm:p-8 space-y-5">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                    <Package className="w-5 h-5 text-[#D32F2F]" /> Formulario de Requisição de Materiais
                  </h3>
                  <span className="text-xs text-slate-500 font-medium">* Campos obrigatórios</span>
                </div>

                {/* DADOS DO SOLICITANTE */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                      Seu Nome Completo *
                    </label>
                    <div className="relative">
                      <User className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                      <input
                        type="text"
                        required
                        value={matRequesterName}
                        onChange={(e) => setMatRequesterName(e.target.value)}
                        placeholder="Ex: Profe. Roberto / Coord. Ana"
                        className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-red-600"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                      Turma / Ano Letivo (ou Setor) *
                    </label>
                    <input
                      type="text"
                      required
                      value={matTurma}
                      onChange={(e) => setMatTurma(e.target.value)}
                      placeholder="Ex: 3º Ano A, 6º Ano B, Pré II ou N/A (Funcionário)"
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-red-600"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                      Data do Pedido *
                    </label>
                    <input
                      type="date"
                      required
                      value={matRequestDate}
                      onChange={(e) => setMatRequestDate(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-red-600"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                      Telefone / WhatsApp ou E-mail
                    </label>
                    <div className="relative">
                      <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                      <input
                        type="text"
                        value={matContact}
                        onChange={(e) => setMatContact(e.target.value)}
                        placeholder="(61) 99999-9999 ou seu@email.com"
                        className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-red-600"
                      />
                    </div>
                  </div>
                </div>

                {/* DETALHES DA REQUISIÇÃO */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                      Setor / Departamento *
                    </label>
                    <select
                      value={matSector}
                      onChange={(e) => setMatSector(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-red-600 bg-white"
                    >
                      <option value="Coordenação Pedagógica">Coordenação Pedagógica</option>
                      <option value="Salas de Aula">Salas de Aula</option>
                      <option value="Secretaria / Atendimento">Secretaria / Atendimento</option>
                      <option value="Almoxarifado & Compras">Almoxarifado & Compras</option>
                      <option value="TI & Mecanografia">TI & Mecanografia</option>
                      <option value="Direção Geral">Direção Geral</option>
                      <option value="Manutenção / Conservação">Manutenção / Conservação</option>
                      <option value="Outro Setor">Outro Setor</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                      Nível de Urgência
                    </label>
                    <select
                      value={matUrgency}
                      onChange={(e) => setMatUrgency(e.target.value as OSPriority)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-red-600 bg-white"
                    >
                      <option value="baixa">🟢 Baixa (Previsão de Estoque)</option>
                      <option value="media">🟡 Média (Necessidade Normal)</option>
                      <option value="alta">🟠 Alta (Atividades de Aulas)</option>
                      <option value="critica">🔴 Crítica (Falta Imediata de Insumo)</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Título / Finalidade da Requisição *
                  </label>
                  <input
                    type="text"
                    required
                    value={matTitle}
                    onChange={(e) => setMatTitle(e.target.value)}
                    placeholder="Ex: Materiais de Escritório para Provas ou Papel A4 e Cartuchos"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-red-600"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Justificativa da Solicitação
                  </label>
                  <textarea
                    rows={2}
                    value={matJustification}
                    onChange={(e) => setMatJustification(e.target.value)}
                    placeholder="Informe a necessidade pedagógica ou operacional destes materiais..."
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-red-600"
                  />
                </div>

                {/* LISTA DINÂMICA DE ITENS */}
                <div className="space-y-3 pt-2">
                  <div className="flex items-center justify-between">
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                      Itens / Materiais Solicitados *
                    </label>
                    <button
                      type="button"
                      onClick={handleAddMatItem}
                      className="text-xs font-bold text-[#D32F2F] hover:text-red-800 flex items-center gap-1"
                    >
                      <Plus className="w-3.5 h-3.5" /> Adicionar Item
                    </button>
                  </div>

                  <div className="space-y-2">
                    {matItems.map((item, idx) => (
                      <div
                        key={item.id}
                        className="flex items-center gap-2 p-2 bg-slate-50 border border-slate-200 rounded-xl"
                      >
                        <span className="text-xs font-bold text-slate-400 w-5 text-center">
                          {idx + 1}.
                        </span>
                        <input
                          type="text"
                          required
                          placeholder="Nome do Material (Ex: Resma Papel A4, Marcador de Quadro)"
                          value={item.name}
                          onChange={(e) => handleMatItemChange(item.id, 'name', e.target.value)}
                          className="flex-1 px-3 py-1.5 border border-slate-300 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-red-600 bg-white"
                        />
                        <input
                          type="number"
                          min="1"
                          required
                          value={item.quantity}
                          onChange={(e) =>
                            handleMatItemChange(item.id, 'quantity', parseInt(e.target.value) || 1)
                          }
                          className="w-20 px-2 py-1.5 border border-slate-300 rounded-lg text-xs text-center focus:outline-none focus:ring-2 focus:ring-red-600 bg-white"
                        />
                        <select
                          value={item.unit}
                          onChange={(e) => handleMatItemChange(item.id, 'unit', e.target.value)}
                          className="w-28 px-2 py-1.5 border border-slate-300 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-red-600 bg-white"
                        >
                          <option value="unidades">Unidades</option>
                          <option value="caixas">Caixas</option>
                          <option value="pacotes">Pacotes</option>
                          <option value="resmas">Resmas</option>
                          <option value="metros">Metros</option>
                          <option value="litros">Litros</option>
                          <option value="pacs">Pacs</option>
                          <option value="kilos">Kg</option>
                        </select>
                        <button
                          type="button"
                          onClick={() => handleRemoveMatItem(item.id)}
                          disabled={matItems.length === 1}
                          className="p-1.5 text-slate-400 hover:text-red-600 disabled:opacity-30"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                {/* ASSINATURA DIGITAL DO SOLICITANTE */}
                <div className="pt-2 border-t border-slate-100">
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                    Assinatura Digital do Solicitante *
                  </label>
                  <SignatureCanvas
                    label="Assine com o dedo no celular ou mouse no computador"
                    onSaveSignature={(dataUrl) => setMatRequesterSignatureUrl(dataUrl)}
                    initialSignature={matRequesterSignatureUrl}
                  />
                </div>

                <div className="pt-4 border-t border-slate-200 flex items-center justify-end">
                  <button
                    type="submit"
                    disabled={matIsSubmitting}
                    className="w-full sm:w-auto px-8 py-3 bg-[#D32F2F] text-white font-bold text-xs uppercase tracking-wider rounded-xl hover:bg-red-800 disabled:opacity-50 flex items-center justify-center gap-2 shadow-md transition-all"
                  >
                    {matIsSubmitting ? (
                      <span>Enviando Requisição...</span>
                    ) : (
                      <>
                        <Send className="w-4 h-4" />
                        <span>Enviar Requisição de Materiais</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>
        )}
      </main>
    </div>
  );
};
