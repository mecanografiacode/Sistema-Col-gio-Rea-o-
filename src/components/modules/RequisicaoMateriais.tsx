import React, { useState, useEffect } from 'react';
import { MaterialRequest, MaterialItem, UserProfile, MaterialRequestStatus, OSPriority } from '../../types';
import { storage } from '../../lib/storage';
import { createSystemNotification } from '../../lib/notifications';
import { exportMaterialRequestPDF } from '../../lib/pdfExport';
import { ConfirmDeleteModal } from '../common/ConfirmDeleteModal';
import { SignatureCanvas } from '../common/SignatureCanvas';
import {
  Package,
  Plus,
  Trash2,
  CheckCircle2,
  XCircle,
  Clock,
  Truck,
  Building2,
  X,
  FileText,
  AlertCircle,
  Share2,
  Check
} from 'lucide-react';

interface RequisicaoMateriaisProps {
  currentUser: UserProfile;
}

export const RequisicaoMateriais: React.FC<RequisicaoMateriaisProps> = ({ currentUser }) => {
  const [requests, setRequests] = useState<MaterialRequest[]>([]);
  const [isNewModalOpen, setIsNewModalOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<MaterialRequest | null>(null);
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<string>('todos');
  const [copiedExternalLink, setCopiedExternalLink] = useState(false);

  // New Request Form
  const [requestedByName, setRequestedByName] = useState(currentUser.full_name);
  const [turma, setTurma] = useState('');
  const [requestDate, setRequestDate] = useState(new Date().toISOString().split('T')[0]);
  const [requesterSignatureUrl, setRequesterSignatureUrl] = useState('');
  const [title, setTitle] = useState('');
  const [sector, setSector] = useState(currentUser.department || 'Coordenação');
  const [urgency, setUrgency] = useState<OSPriority>('media');
  const [justification, setJustification] = useState('');
  const [items, setItems] = useState<MaterialItem[]>([
    { id: '1', name: '', quantity: 1, unit: 'unidades' }
  ]);

  // Review & Director Approval State
  const [reviewNotes, setReviewNotes] = useState('');
  const [directorName, setDirectorName] = useState(currentUser.full_name || 'Diretora Geral');
  const [directorSignatureUrl, setDirectorSignatureUrl] = useState('');
  const [directorApprovalDate, setDirectorApprovalDate] = useState(new Date().toISOString().split('T')[0]);

  // Delete Confirm State
  const [deleteTarget, setDeleteTarget] = useState<MaterialRequest | null>(null);

  const isAdmin = currentUser.role === 'admin' || currentUser.role === 'super_admin';

  const loadData = async () => {
    const data = await storage.getMaterialRequests();
    setRequests(data);
  };

  useEffect(() => {
    loadData();
    const unsubscribe = storage.subscribe(() => {
      loadData();
    });
    return () => unsubscribe();
  }, []);

  const handleAddItem = () => {
    setItems([...items, { id: Date.now().toString(), name: '', quantity: 1, unit: 'unidades' }]);
  };

  const handleRemoveItem = (id: string) => {
    if (items.length === 1) return;
    setItems(items.filter((i) => i.id !== id));
  };

  const handleItemChange = (id: string, field: keyof MaterialItem, value: any) => {
    setItems(
      items.map((i) => (i.id === id ? { ...i, [field]: value } : i))
    );
  };

  const handleCreateRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    const validItems = items.filter((i) => i.name.trim() !== '');
    if (!title.trim() || validItems.length === 0) return;

    if (!requesterSignatureUrl) {
      alert('Por favor, assine digitalmente a requisição no campo de assinatura.');
      return;
    }

    const created = await storage.addMaterialRequest(
      {
        title,
        requested_by: currentUser.id,
        requested_by_name: requestedByName.trim() || currentUser.full_name,
        sector,
        turma: turma.trim() || 'Geral / Sem Turma',
        request_date: requestDate ? new Date(requestDate).toLocaleDateString('pt-BR') : new Date().toLocaleDateString('pt-BR'),
        requester_signature_url: requesterSignatureUrl,
        urgency,
        justification,
        items: validItems
      },
      currentUser
    );

    // Notify admins for approval
    const profiles = await storage.getProfiles();
    const admins = profiles.filter((p) => p.role === 'admin' || p.role === 'super_admin');
    for (const adm of admins) {
      await createSystemNotification(
        adm.id,
        'Nova Requisição de Material Pendente',
        `${created.requested_by_name} (${created.turma || created.sector}) solicitou materiais`,
        'materiais',
        created.id
      );
    }

    setIsNewModalOpen(false);
    setTitle('');
    setJustification('');
    setTurma('');
    setRequesterSignatureUrl('');
    setItems([{ id: '1', name: '', quantity: 1, unit: 'unidades' }]);
  };

  const handleDeleteRequest = (req: MaterialRequest, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setDeleteTarget(req);
  };

  const confirmDeleteRequest = async () => {
    if (!deleteTarget) return;
    try {
      await storage.deleteMaterialRequest(deleteTarget.id, currentUser);
      if (selectedRequest?.id === deleteTarget.id) {
        setSelectedRequest(null);
      }
      setDeleteTarget(null);
      loadData();
    } catch (err: any) {
      console.error('Erro retornado pelo Supabase ao deletar requisição de material:', err?.message || err);
    }
  };

  const handleCopyExternalLink = () => {
    const url = `${window.location.origin}${window.location.pathname}?portal=materiais`;
    navigator.clipboard.writeText(url).then(() => {
      setCopiedExternalLink(true);
      setTimeout(() => setCopiedExternalLink(false), 2500);
    });
  };

  const handleReviewRequest = async (status: MaterialRequestStatus) => {
    if (!selectedRequest) return;

    await storage.updateMaterialRequestStatus(
      selectedRequest.id,
      status,
      reviewNotes,
      currentUser,
      {
        director_name: directorName,
        director_signature_url: directorSignatureUrl || selectedRequest.director_signature_url,
        director_approval_date: directorApprovalDate ? new Date(directorApprovalDate).toLocaleDateString('pt-BR') : new Date().toLocaleDateString('pt-BR')
      }
    );

    // Notify requester
    await createSystemNotification(
      selectedRequest.requested_by,
      `Requisição de Material ${status.toUpperCase()}`,
      `Sua requisição #${selectedRequest.id} foi atualizada para: ${status}`,
      'materiais',
      selectedRequest.id
    );

    setSelectedRequest(null);
    setReviewNotes('');
    setDirectorSignatureUrl('');
  };

  const filteredRequests = requests.filter((r) => {
    if (selectedStatusFilter === 'todos') return true;
    return r.status === selectedStatusFilter;
  });

  const getStatusBadge = (st: MaterialRequestStatus) => {
    switch (st) {
      case 'pendente':
        return <span className="bg-amber-100 text-amber-800 border border-amber-300 text-xs font-semibold px-2.5 py-1 rounded-lg">Pendente de Aprovação</span>;
      case 'aprovado':
        return <span className="bg-emerald-100 text-emerald-800 border border-emerald-300 text-xs font-semibold px-2.5 py-1 rounded-lg">Aprovado</span>;
      case 'reprovado':
        return <span className="bg-rose-100 text-rose-800 border border-rose-300 text-xs font-semibold px-2.5 py-1 rounded-lg">Reprovado</span>;
      case 'entregue':
        return <span className="bg-blue-100 text-blue-800 border border-blue-300 text-xs font-semibold px-2.5 py-1 rounded-lg">Entregue</span>;
    }
  };

  return (
    <div className="space-y-6 pb-20 lg:pb-8">
      {/* Title Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <Package className="w-6 h-6 text-[#D32F2F]" />
            <h2 className="text-2xl font-serif-editorial font-bold text-gray-900">Requisição de Materiais</h2>
          </div>
          <p className="text-xs text-gray-500 mt-1">
            Solicitação de suprimentos pedagógicos, escritório, papelaria e higiene do Colégio Reação
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handleCopyExternalLink}
            className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2.5 bg-slate-100 text-slate-800 font-bold text-xs rounded-xl hover:bg-slate-200 border border-slate-300 shadow-2xs transition-colors"
            title="Copiar link público para pessoas externas solicitarem materiais sem login"
          >
            {copiedExternalLink ? (
              <>
                <Check className="w-4 h-4 text-emerald-600" />
                <span className="text-emerald-700">Link Materiais Copiado!</span>
              </>
            ) : (
              <>
                <Share2 className="w-4 h-4 text-[#D32F2F]" />
                <span>Link Externo (Materiais)</span>
              </>
            )}
          </button>

          <button
            onClick={() => setIsNewModalOpen(true)}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-[#D32F2F] text-white font-bold text-xs uppercase tracking-wider rounded-xl hover:bg-red-800 shadow-sm transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Solicitar Materiais</span>
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white p-4 rounded-xl shadow-xs border border-slate-200 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center space-x-2">
          <span className="text-xs font-bold text-slate-600 uppercase">Filtrar por Status:</span>
          <select
            value={selectedStatusFilter}
            onChange={(e) => setSelectedStatusFilter(e.target.value)}
            className="py-1.5 px-3 border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-red-600 bg-white"
          >
            <option value="todos">Todos</option>
            <option value="pendente">Pendentes</option>
            <option value="aprovado">Aprovados</option>
            <option value="entregue">Entregues</option>
            <option value="reprovado">Reprovados</option>
          </select>
        </div>

        <div className="text-xs text-slate-500 font-semibold">
          Mostrando {filteredRequests.length} solicitações
        </div>
      </div>

      {/* Requests Table / Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredRequests.map((req) => (
          <div
            key={req.id}
            onClick={() => setSelectedRequest(req)}
            className="bg-white rounded-xl border border-slate-200 shadow-xs hover:shadow-md transition-all p-4 cursor-pointer flex flex-col justify-between group"
          >
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="font-mono text-xs text-slate-400 font-bold">#{req.id}</span>
                {getStatusBadge(req.status)}
              </div>

              <h3 className="text-sm font-bold text-slate-900 group-hover:text-red-600 transition-colors">
                {req.title}
              </h3>

              <div className="mt-3 bg-slate-50 p-2.5 rounded-lg border border-slate-100 text-xs space-y-1">
                <p className="font-semibold text-slate-700">Itens Solicitados ({req.items.length}):</p>
                <ul className="list-disc list-inside text-slate-600 text-[11px] space-y-0.5">
                  {req.items.slice(0, 3).map((item) => (
                    <li key={item.id}>
                      {item.quantity} {item.unit} — {item.name}
                    </li>
                  ))}
                  {req.items.length > 3 && (
                    <li className="text-slate-400 italic">+ {req.items.length - 3} outro(s) item(ns)</li>
                  )}
                </ul>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
              <div className="flex items-center space-x-1">
                <Building2 className="w-3.5 h-3.5 text-slate-400" />
                <span>{req.sector}</span>
              </div>
              <div className="flex items-center space-x-2">
                <span className="text-[11px] text-slate-400">
                  {new Date(req.created_at).toLocaleDateString('pt-BR')}
                </span>
                <button
                  onClick={(e) => handleDeleteRequest(req, e)}
                  className="p-1 text-slate-400 hover:text-rose-600 rounded-md hover:bg-rose-50 transition-colors"
                  title="Excluir Requisição"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* NEW REQUEST MODAL */}
      {isNewModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white w-full max-w-xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
            <div className="px-6 py-4 bg-red-600 text-white flex items-center justify-between">
              <h3 className="text-sm font-bold flex items-center gap-2">
                <Package className="w-4 h-4" /> Solicitante de Materiais
              </h3>
              <button onClick={() => setIsNewModalOpen(false)} className="text-white hover:opacity-80">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateRequest} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Nome do Solicitante *</label>
                  <input
                    type="text"
                    required
                    value={requestedByName}
                    onChange={(e) => setRequestedByName(e.target.value)}
                    placeholder="Nome completo do solicitante"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-red-600"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Turma / Ano Letivo (ou Setor) *</label>
                  <input
                    type="text"
                    required
                    value={turma}
                    onChange={(e) => setTurma(e.target.value)}
                    placeholder="Ex: 3º Ano A, 6º B, Pré II ou N/A (Secretaria)"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-red-600"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Data do Pedido *</label>
                  <input
                    type="date"
                    required
                    value={requestDate}
                    onChange={(e) => setRequestDate(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-red-600"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Setor Solicitante *</label>
                  <input
                    type="text"
                    required
                    value={sector}
                    onChange={(e) => setSector(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-red-600"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Título da Requisição *</label>
                  <input
                    type="text"
                    required
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Ex: Suprimentos de papel A4 e canetas"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-red-600"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Urgência</label>
                  <select
                    value={urgency}
                    onChange={(e) => setUrgency(e.target.value as OSPriority)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-red-600 bg-white"
                  >
                    <option value="baixa">Baixa</option>
                    <option value="media">Média</option>
                    <option value="alta">Alta</option>
                    <option value="urgente">Urgente</option>
                  </select>
                </div>
              </div>

              {/* DYNAMIC ITEMS BUILDER */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-bold text-slate-700 uppercase">Itens Solicitados</label>
                  <button
                    type="button"
                    onClick={handleAddItem}
                    className="text-xs font-bold text-red-600 hover:underline flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" /> Adicionar Item
                  </button>
                </div>

                <div className="space-y-2">
                  {items.map((item) => (
                    <div key={item.id} className="flex items-center gap-2">
                      <input
                        type="text"
                        placeholder="Nome do item (ex: Papel A4 Chamex)"
                        required
                        value={item.name}
                        onChange={(e) => handleItemChange(item.id, 'name', e.target.value)}
                        className="flex-1 px-3 py-1.5 border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-red-600"
                      />
                      <input
                        type="number"
                        min="1"
                        required
                        value={item.quantity}
                        onChange={(e) => handleItemChange(item.id, 'quantity', parseInt(e.target.value) || 1)}
                        className="w-16 px-2 py-1.5 border border-slate-300 rounded-lg text-xs text-center font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-red-600"
                      />
                      <select
                        value={item.unit}
                        onChange={(e) => handleItemChange(item.id, 'unit', e.target.value)}
                        className="w-24 px-2 py-1.5 border border-slate-300 rounded-lg text-xs text-slate-800 bg-white"
                      >
                        <option value="unidades">Unidades</option>
                        <option value="caixas">Caixas</option>
                        <option value="fardos">Fardos</option>
                        <option value="pacotes">Pacotes</option>
                        <option value="galões">Galões</option>
                      </select>
                      <button
                        type="button"
                        onClick={() => handleRemoveItem(item.id)}
                        className="text-slate-400 hover:text-rose-600 p-1"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Justificativa Pedagógica / Operacional</label>
                <textarea
                  required
                  rows={2}
                  value={justification}
                  onChange={(e) => setJustification(e.target.value)}
                  placeholder="Por que estes materiais são necessários para seu setor?"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-red-600"
                />
              </div>

              {/* ASSINATURA DIGITAL DO SOLICITANTE */}
              <div className="pt-2 border-t border-slate-100">
                <label className="block text-xs font-bold text-slate-700 uppercase mb-2">
                  Assinatura Digital do Solicitante *
                </label>
                <SignatureCanvas
                  label="Desenhe sua assinatura com o mouse ou tela sensível ao toque"
                  onSaveSignature={(dataUrl) => setRequesterSignatureUrl(dataUrl)}
                  initialSignature={requesterSignatureUrl}
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
                  Enviar Requisição
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* REQUEST DETAIL & APPROVAL MODAL */}
      {selectedRequest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
            <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
              <div>
                <span className="text-xs font-mono text-red-400 font-bold">#{selectedRequest.id}</span>
                <h3 className="text-base font-bold">{selectedRequest.title}</h3>
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={(e) => handleDeleteRequest(selectedRequest, e)}
                  className="p-1.5 bg-rose-600/20 hover:bg-rose-600 text-rose-300 hover:text-white rounded-lg transition-colors flex items-center gap-1 text-xs font-semibold px-2.5"
                  title="Excluir Requisição"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Excluir</span>
                </button>
                <button onClick={() => setSelectedRequest(null)} className="text-slate-400 hover:text-white">
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="p-6 space-y-5 overflow-y-auto flex-1">
              <div className="flex items-center justify-between bg-slate-50 p-3 rounded-xl border border-slate-200">
                <div>
                  <p className="text-[10px] text-slate-400 uppercase font-bold">Status Atual</p>
                  <div className="mt-1">{getStatusBadge(selectedRequest.status)}</div>
                </div>
                <div className="text-right">
                  <p className="text-[10px] text-slate-400 uppercase font-bold">Solicitante</p>
                  <p className="text-xs font-bold text-slate-800 mt-1">{selectedRequest.requested_by_name}</p>
                </div>
              </div>

              {/* DETALHES DE NOME, TURMA E DATA */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs">
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-bold block">Turma / Ano</span>
                  <span className="font-semibold text-slate-800">{selectedRequest.turma || 'Geral'}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-bold block">Data do Pedido</span>
                  <span className="font-semibold text-slate-800">
                    {selectedRequest.request_date || new Date(selectedRequest.created_at).toLocaleDateString('pt-BR')}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-bold block">Setor</span>
                  <span className="font-semibold text-slate-800">{selectedRequest.sector}</span>
                </div>
              </div>

              <div>
                <h4 className="text-xs font-bold text-slate-700 uppercase mb-1">Itens Solicitados</h4>
                <div className="bg-slate-50 rounded-xl border border-slate-200 divide-y divide-slate-100">
                  {selectedRequest.items.map((item) => (
                    <div key={item.id} className="p-3 flex items-center justify-between text-xs">
                      <span className="font-medium text-slate-800">{item.name}</span>
                      <span className="font-bold text-slate-900 bg-white px-2 py-0.5 rounded-md border border-slate-200">
                        {item.quantity} {item.unit}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <h4 className="text-xs font-bold text-slate-700 uppercase mb-1">Justificativa</h4>
                <p className="text-xs text-slate-700 bg-slate-50 p-3 rounded-lg border border-slate-200">
                  {selectedRequest.justification}
                </p>
              </div>

              {/* EXIBIÇÃO DE ASSINATURAS CADASTRADAS */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <p className="text-[10px] text-slate-400 uppercase font-bold mb-1">Assinatura do Solicitante</p>
                  {selectedRequest.requester_signature_url ? (
                    <img
                      src={selectedRequest.requester_signature_url}
                      alt="Assinatura Solicitante"
                      className="h-14 object-contain bg-white rounded border border-slate-200 p-1 w-full"
                    />
                  ) : (
                    <p className="text-xs text-slate-400 italic">Sem assinatura anexada</p>
                  )}
                  <p className="text-[10px] text-slate-500 font-medium mt-1">{selectedRequest.requested_by_name}</p>
                </div>

                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <p className="text-[10px] text-slate-400 uppercase font-bold mb-1">Assinatura da Diretora</p>
                  {selectedRequest.director_signature_url ? (
                    <img
                      src={selectedRequest.director_signature_url}
                      alt="Assinatura Diretora"
                      className="h-14 object-contain bg-white rounded border border-slate-200 p-1 w-full"
                    />
                  ) : (
                    <p className="text-xs text-slate-400 italic">Pendente de Visto / Assinatura da Direção</p>
                  )}
                  <p className="text-[10px] text-slate-500 font-medium mt-1">
                    {selectedRequest.director_name || 'Aguardando Direção'}
                    {selectedRequest.director_approval_date && ` (${selectedRequest.director_approval_date})`}
                  </p>
                </div>
              </div>

              {/* BOTÃO PARA IMPRIMIR OU BAIXAR PDF */}
              <button
                onClick={() => exportMaterialRequestPDF(selectedRequest)}
                className="w-full py-2.5 px-4 bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-2 shadow-sm transition-colors"
              >
                <FileText className="w-4 h-4 text-red-400" />
                <span>Gerar Documento Oficial PDF com Assinaturas</span>
              </button>

              {selectedRequest.review_notes && (
                <div>
                  <h4 className="text-xs font-bold text-slate-700 uppercase mb-1">
                    Parecer da Gestão / Anotação
                  </h4>
                  <p className="text-xs text-slate-800 bg-blue-50 p-3 rounded-lg border border-blue-200">
                    {selectedRequest.review_notes}
                  </p>
                </div>
              )}

              {/* ADMIN APPROVAL / REJECTION / DELIVERY ACTIONS */}
              {isAdmin && (
                <div className="p-4 bg-red-50/50 rounded-xl border border-red-100 space-y-4 pt-4">
                  <h4 className="text-xs font-bold text-red-900 uppercase tracking-wider flex items-center gap-1.5">
                    <Package className="w-4 h-4 text-red-600" />
                    Visto & Aprovação da Direção / Gestão
                  </h4>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">Nome da Diretora *</label>
                      <input
                        type="text"
                        value={directorName}
                        onChange={(e) => setDirectorName(e.target.value)}
                        placeholder="Ex: Dra. Maria Silva / Diretora Pedagógica"
                        className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-xs text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-red-600"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">Data da Assinatura *</label>
                      <input
                        type="date"
                        value={directorApprovalDate}
                        onChange={(e) => setDirectorApprovalDate(e.target.value)}
                        className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-xs text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-red-600"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                      Assinatura Digital da Diretora
                    </label>
                    <SignatureCanvas
                      label="Assine no campo abaixo para aprovar a requisição"
                      onSaveSignature={(dataUrl) => setDirectorSignatureUrl(dataUrl)}
                      initialSignature={directorSignatureUrl || selectedRequest.director_signature_url}
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                      Parecer / Observações do Pedido
                    </label>
                    <textarea
                      rows={2}
                      value={reviewNotes}
                      onChange={(e) => setReviewNotes(e.target.value)}
                      placeholder="Observações do parecer de aprovação ou entrega..."
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-red-600"
                    />
                  </div>

                  <div className="flex flex-wrap gap-2 pt-1">
                    <button
                      onClick={() => handleReviewRequest('aprovado')}
                      className="flex-1 py-2 px-3 bg-emerald-600 text-white font-bold text-xs rounded-lg hover:bg-emerald-700 flex items-center justify-center gap-1 shadow-sm"
                    >
                      <CheckCircle2 className="w-4 h-4" /> Aprovar com Visto
                    </button>
                    <button
                      onClick={() => handleReviewRequest('entregue')}
                      className="flex-1 py-2 px-3 bg-blue-600 text-white font-bold text-xs rounded-lg hover:bg-blue-700 flex items-center justify-center gap-1 shadow-sm"
                    >
                      <Truck className="w-4 h-4" /> Marcar Entregue
                    </button>
                    <button
                      onClick={() => handleReviewRequest('reprovado')}
                      className="flex-1 py-2 px-3 bg-rose-600 text-white font-bold text-xs rounded-lg hover:bg-rose-700 flex items-center justify-center gap-1 shadow-sm"
                    >
                      <XCircle className="w-4 h-4" /> Reprovar
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
      {/* CONFIRM DELETE MODAL */}
      <ConfirmDeleteModal
        isOpen={!!deleteTarget}
        title="Excluir Requisição de Material"
        description={`Tem certeza que deseja excluir permanentemente a requisição "${deleteTarget?.title}" (${deleteTarget?.sector})? Esta ação não pode ser desfeita.`}
        onConfirm={confirmDeleteRequest}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
};
