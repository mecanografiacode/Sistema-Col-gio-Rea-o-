import React, { useState, useEffect } from 'react';
import { ServiceOrder, Equipment, UserProfile, OSStatus, OSPriority, OSCategory } from '../../types';
import { storage } from '../../lib/storage';
import { createSystemNotification } from '../../lib/notifications';
import { ImageCaptureInput } from '../common/ImageCaptureInput';
import { ConfirmDeleteModal } from '../common/ConfirmDeleteModal';
import { exportServiceOrdersPDF } from '../../lib/pdfExport';
import {
  ClipboardList,
  Plus,
  Search,
  Filter,
  Clock,
  UserCheck,
  Building2,
  AlertTriangle,
  MessageSquare,
  X,
  CheckCircle2,
  Send,
  Wrench,
  Camera,
  ChevronRight,
  Check,
  Calendar,
  FileCheck,
  Trash2,
  FileDown,
  Share2,
  ExternalLink
} from 'lucide-react';

interface OrdensServicoProps {
  currentUser: UserProfile;
}

export const OrdensServico: React.FC<OrdensServicoProps> = ({ currentUser }) => {
  const [orders, setOrders] = useState<ServiceOrder[]>([]);
  const [equipments, setEquipments] = useState<Equipment[]>([]);
  const [profiles, setProfiles] = useState<UserProfile[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string>('todos');
  const [selectedPriority, setSelectedPriority] = useState<string>('todas');
  const [selectedCategory, setSelectedCategory] = useState<string>('todas');
  const [copiedExternalLink, setCopiedExternalLink] = useState(false);

  // Modal States
  const [isNewModalOpen, setIsNewModalOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<ServiceOrder | null>(null);

  // OS Closure Modal State
  const [isConcludeModalOpen, setIsConcludeModalOpen] = useState(false);
  const [conclusaoData, setConclusaoData] = useState('');
  const [conclusaoObservacao, setConclusaoObservacao] = useState('');
  const [fotoConsertoUrl, setFotoConsertoUrl] = useState('');

  // Delete Confirm State
  const [deleteTarget, setDeleteTarget] = useState<ServiceOrder | null>(null);

  // New OS Form
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<OSCategory>('predial');
  const [priority, setPriority] = useState<OSPriority>('media');
  const [sector, setSector] = useState('Salas de Aula');
  const [equipmentId, setEquipmentId] = useState('');
  const [photoUrl, setPhotoUrl] = useState('');

  // Comment input
  const [newComment, setNewComment] = useState('');

  const isAdmin = currentUser.role === 'admin' || currentUser.role === 'super_admin';

  const loadData = async () => {
    const osData = await storage.getServiceOrders();
    const eqData = await storage.getEquipment();
    const profData = await storage.getProfiles();
    setOrders(osData);
    setEquipments(eqData);
    setProfiles(profData);
  };

  useEffect(() => {
    loadData();
    const unsubscribe = storage.subscribe(() => {
      loadData();
    });
    return () => unsubscribe();
  }, []);

  const handleCreateOS = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !description.trim()) return;

    const selectedEq = equipments.find((e) => e.id === equipmentId);

    const created = await storage.addServiceOrder(
      {
        title,
        description,
        category,
        priority,
        status: 'aberta',
        sector,
        equipment_id: equipmentId || undefined,
        equipment_name: selectedEq?.name,
        created_by: currentUser.id,
        created_by_name: currentUser.full_name,
        photo_url: photoUrl || undefined
      },
      currentUser
    );

    // Notify admins
    const admins = profiles.filter((p) => p.role === 'admin' || p.role === 'super_admin');
    for (const adm of admins) {
      await createSystemNotification(
        adm.id,
        'Nova Ordem de Serviço Criada',
        `OS #${created.id}: ${created.title} em ${created.sector}`,
        'ordens_servico',
        created.id
      );
    }

    setIsNewModalOpen(false);
    setTitle('');
    setDescription('');
    setPhotoUrl('');
    setEquipmentId('');
  };

  const handleUpdateStatus = async (osId: string, newStatus: OSStatus) => {
    if (newStatus === 'concluida') {
      // Prompt conclusion details modal
      setConclusaoData(new Date().toISOString().slice(0, 16));
      setConclusaoObservacao('');
      setFotoConsertoUrl('');
      setIsConcludeModalOpen(true);
      return;
    }

    await storage.updateServiceOrderStatus(osId, newStatus, currentUser);

    const targetOS = orders.find((o) => o.id === osId);
    if (targetOS) {
      const userToNotify = targetOS.assigned_to || targetOS.created_by;
      await createSystemNotification(
        userToNotify,
        'Status de OS Atualizado',
        `A OS #${osId} mudou para: ${getStatusLabel(newStatus)}`,
        'ordens_servico',
        osId
      );
    }
  };

  const handleConcludeOS = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOrder) return;

    await storage.concludeServiceOrder(
      selectedOrder.id,
      conclusaoData || new Date().toISOString(),
      conclusaoObservacao || undefined,
      fotoConsertoUrl || undefined,
      currentUser
    );

    setIsConcludeModalOpen(false);

    // Refresh selected order
    const updatedOrders = await storage.getServiceOrders();
    const curr = updatedOrders.find((o) => o.id === selectedOrder.id);
    if (curr) setSelectedOrder(curr);

    await createSystemNotification(
      selectedOrder.created_by,
      'Ordem de Serviço Concluída',
      `A OS #${selectedOrder.id} foi concluída com sucesso.`,
      'ordens_servico',
      selectedOrder.id
    );
  };

  const handleAssignStaff = async (osId: string, staffId: string) => {
    const staff = profiles.find((p) => p.id === staffId);
    if (staff) {
      await storage.assignServiceOrder(osId, staff.id, staff.full_name, currentUser);

      await createSystemNotification(
        staff.id,
        'Ordem de Serviço Atribuída a Você',
        `Você é o responsável pela OS #${osId}`,
        'ordens_servico',
        osId
      );
    }
  };

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOrder || !newComment.trim()) return;

    await storage.addOSComment(selectedOrder.id, newComment.trim(), currentUser);
    setNewComment('');

    // refresh selected order state
    const updatedOrders = await storage.getServiceOrders();
    const current = updatedOrders.find((o) => o.id === selectedOrder.id);
    if (current) setSelectedOrder(current);
  };

  const handleDeleteOrder = (os: ServiceOrder, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setDeleteTarget(os);
  };

  const confirmDeleteOrder = async () => {
    if (!deleteTarget) return;
    await storage.deleteServiceOrder(deleteTarget.id, currentUser);
    if (selectedOrder?.id === deleteTarget.id) {
      setSelectedOrder(null);
    }
    setDeleteTarget(null);
    loadData();
  };

  const handleCopyExternalLink = () => {
    const url = `${window.location.origin}${window.location.pathname}?portal=os`;
    navigator.clipboard.writeText(url).then(() => {
      setCopiedExternalLink(true);
      setTimeout(() => setCopiedExternalLink(false), 2500);
    });
  };

  const filteredOrders = orders.filter((o) => {
    const matchesSearch =
      o.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      o.sector.toLowerCase().includes(searchQuery.toLowerCase()) ||
      o.id.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = selectedStatus === 'todos' || o.status === selectedStatus;
    const matchesPriority = selectedPriority === 'todas' || o.priority === selectedPriority;
    const matchesCategory = selectedCategory === 'todas' || o.category === selectedCategory;
    return matchesSearch && matchesStatus && matchesPriority && matchesCategory;
  });

  const getPriorityBadge = (p: OSPriority) => {
    switch (p) {
      case 'urgente':
        return <span className="bg-red-100 text-red-800 border border-red-200 text-[10px] font-bold px-2 py-0.5 rounded-full">Urgente</span>;
      case 'alta':
        return <span className="bg-amber-100 text-amber-800 border border-amber-200 text-[10px] font-bold px-2 py-0.5 rounded-full">Alta</span>;
      case 'media':
        return <span className="bg-blue-100 text-blue-800 border border-blue-200 text-[10px] font-bold px-2 py-0.5 rounded-full">Média</span>;
      default:
        return <span className="bg-slate-100 text-slate-700 border border-slate-200 text-[10px] font-bold px-2 py-0.5 rounded-full">Baixa</span>;
    }
  };

  const getStatusLabel = (s: OSStatus) => {
    switch (s) {
      case 'aberta':
        return 'Aberta';
      case 'em_andamento':
        return 'Em Andamento';
      case 'aguardando_peca':
        return 'Aguardando Peça';
      case 'concluida':
        return 'Concluída';
      case 'cancelada':
        return 'Cancelada';
    }
  };

  const getStatusBadge = (s: OSStatus) => {
    switch (s) {
      case 'aberta':
        return <span className="bg-slate-100 text-slate-800 border border-slate-300 text-xs font-semibold px-2.5 py-1 rounded-lg">Aberta</span>;
      case 'em_andamento':
        return <span className="bg-blue-100 text-blue-800 border border-blue-300 text-xs font-semibold px-2.5 py-1 rounded-lg">Em Andamento</span>;
      case 'aguardando_peca':
        return <span className="bg-amber-100 text-amber-800 border border-amber-300 text-xs font-semibold px-2.5 py-1 rounded-lg">Aguardando Peça</span>;
      case 'concluida':
        return <span className="bg-emerald-100 text-emerald-800 border border-emerald-300 text-xs font-semibold px-2.5 py-1 rounded-lg">Concluída</span>;
      case 'cancelada':
        return <span className="bg-rose-100 text-rose-800 border border-rose-300 text-xs font-semibold px-2.5 py-1 rounded-lg">Cancelada</span>;
    }
  };

  return (
    <div className="space-y-6 pb-20 lg:pb-8">
      {/* Module Title Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <ClipboardList className="w-6 h-6 text-[#D32F2F]" />
            <h2 className="text-2xl font-serif-editorial font-bold text-gray-900">Ordens de Serviço</h2>
          </div>
          <p className="text-xs text-gray-500 mt-1">
            Manutenção predial, elétrica, hidráulica e infraestrutura do Colégio Reação
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handleCopyExternalLink}
            className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2.5 bg-slate-100 text-slate-800 font-bold text-xs rounded-xl hover:bg-slate-200 border border-slate-300 shadow-2xs transition-colors"
            title="Copiar link público para pessoas externas abrirem OS sem login"
          >
            {copiedExternalLink ? (
              <>
                <Check className="w-4 h-4 text-emerald-600" />
                <span className="text-emerald-700">Link OS Copiado!</span>
              </>
            ) : (
              <>
                <Share2 className="w-4 h-4 text-[#D32F2F]" />
                <span>Link Externo (OS)</span>
              </>
            )}
          </button>

          <button
            onClick={() => exportServiceOrdersPDF(filteredOrders)}
            className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2.5 bg-slate-800 text-white font-bold text-xs rounded-xl hover:bg-slate-900 shadow-sm transition-colors"
            title="Baixar Relatório de Ordens de Serviço com Imagens em PDF"
          >
            <FileDown className="w-4 h-4 text-emerald-400" />
            <span>PDF Ordens de Serviço</span>
          </button>

          <button
            onClick={() => setIsNewModalOpen(true)}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-[#D32F2F] text-white font-bold text-xs uppercase tracking-wider rounded-xl hover:bg-red-800 shadow-sm transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Nova Ordem</span>
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white p-4 rounded-xl shadow-xs border border-slate-200 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
        {/* Search */}
        <div className="relative lg:col-span-2">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar por título, setor ou código (ex: os-101)..."
            className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-red-600"
          />
        </div>

        {/* Status Filter */}
        <select
          value={selectedStatus}
          onChange={(e) => setSelectedStatus(e.target.value)}
          className="w-full py-2 px-3 border border-slate-200 rounded-lg text-xs text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-red-600"
        >
          <option value="todos">Todos os Status</option>
          <option value="aberta">Aberta</option>
          <option value="em_andamento">Em Andamento</option>
          <option value="aguardando_peca">Aguardando Peça</option>
          <option value="concluida">Concluída</option>
          <option value="cancelada">Cancelada</option>
        </select>

        {/* Priority Filter */}
        <select
          value={selectedPriority}
          onChange={(e) => setSelectedPriority(e.target.value)}
          className="w-full py-2 px-3 border border-slate-200 rounded-lg text-xs text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-red-600"
        >
          <option value="todas">Todas as Prioridades</option>
          <option value="urgente">Urgente</option>
          <option value="alta">Alta</option>
          <option value="media">Média</option>
          <option value="baixa">Baixa</option>
        </select>

        {/* Category Filter */}
        <select
          value={selectedCategory}
          onChange={(e) => setSelectedCategory(e.target.value)}
          className="w-full py-2 px-3 border border-slate-200 rounded-lg text-xs text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-red-600"
        >
          <option value="todas">Todas as Categorias</option>
          <option value="eletrica">Elétrica</option>
          <option value="hidraulica">Hidráulica</option>
          <option value="TI">TI / Redes</option>
          <option value="predial">Predial</option>
          <option value="mobiliario">Mobiliário</option>
          <option value="outro">Outro</option>
        </select>
      </div>

      {/* Service Orders Grid / List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredOrders.length === 0 ? (
          <div className="col-span-full bg-white rounded-xl p-12 text-center border border-dashed border-slate-300">
            <ClipboardList className="w-10 h-10 text-slate-300 mx-auto mb-2" />
            <p className="text-sm font-bold text-slate-700">Nenhuma Ordem de Serviço encontrada</p>
            <p className="text-xs text-slate-400 mt-1">Ajuste os filtros ou crie um novo registro.</p>
          </div>
        ) : (
          filteredOrders.map((os) => (
            <div
              key={os.id}
              onClick={() => setSelectedOrder(os)}
              className="bg-white rounded-xl border border-slate-200 shadow-xs hover:shadow-md transition-all p-4 cursor-pointer flex flex-col justify-between group"
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-2">
                  <span className="font-mono text-xs text-[#1565C0] font-bold">#{os.id}</span>
                  <div className="flex items-center space-x-1.5">
                    {getPriorityBadge(os.priority)}
                    {getStatusBadge(os.status)}
                  </div>
                </div>

                <h3 className="text-sm font-bold text-slate-900 group-hover:text-red-600 transition-colors line-clamp-2">
                  {os.title}
                </h3>
                <p className="text-xs text-slate-500 mt-1 line-clamp-2 leading-relaxed">
                  {os.description}
                </p>

                {os.photo_url && (
                  <div className="mt-3 relative h-32 rounded-lg overflow-hidden bg-slate-100">
                    <img src={os.photo_url} alt="Foto da OS" className="w-full h-full object-cover" />
                  </div>
                )}
              </div>

              <div className="mt-4 pt-3 border-t border-slate-100 text-xs space-y-1.5">
                <div className="flex items-center text-slate-600 space-x-1.5">
                  <Building2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span className="truncate">{os.sector}</span>
                </div>

                <div className="flex items-center justify-between text-slate-500 text-[11px]">
                  <div className="flex items-center space-x-1">
                    <UserCheck className="w-3.5 h-3.5 text-slate-400" />
                    <span>{os.assigned_to_name || 'Sem responsável'}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="flex items-center space-x-1 text-slate-400">
                      <MessageSquare className="w-3.5 h-3.5" />
                      <span>{os.comments.length}</span>
                    </div>
                    <button
                      onClick={(e) => handleDeleteOrder(os, e)}
                      className="p-1 text-slate-400 hover:text-rose-600 rounded-md hover:bg-rose-50 transition-colors"
                      title="Excluir Ordem de Serviço"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* NEW SERVICE ORDER MODAL */}
      {isNewModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
            <div className="px-6 py-4 bg-red-600 text-white flex items-center justify-between">
              <h3 className="text-sm font-bold flex items-center gap-2">
                <ClipboardList className="w-4 h-4" /> Nova Ordem de Serviço
              </h3>
              <button onClick={() => setIsNewModalOpen(false)} className="text-white hover:opacity-80">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateOS} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Título do Problema</label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Ex: Troca de disjuntor do bloco B"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-red-600"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Descrição Detalhada</label>
                <textarea
                  required
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Descreva o que está acontecendo e a localização exata..."
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-red-600"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Categoria</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value as OSCategory)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-red-600"
                  >
                    <option value="eletrica">Elétrica</option>
                    <option value="hidraulica">Hidráulica</option>
                    <option value="TI">TI / Redes</option>
                    <option value="predial">Predial</option>
                    <option value="mobiliario">Mobiliário</option>
                    <option value="outro">Outro</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Prioridade</label>
                  <select
                    value={priority}
                    onChange={(e) => setPriority(e.target.value as OSPriority)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-red-600"
                  >
                    <option value="baixa">Baixa</option>
                    <option value="media">Média</option>
                    <option value="alta">Alta</option>
                    <option value="urgente">Urgente</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Local / Setor</label>
                <input
                  type="text"
                  required
                  value={sector}
                  onChange={(e) => setSector(e.target.value)}
                  placeholder="Ex: Ginásio, Sala 104, Laboratório de Informática"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-red-600"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Equipamento Vinculado (Opcional)</label>
                <select
                  value={equipmentId}
                  onChange={(e) => setEquipmentId(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-red-600"
                >
                  <option value="">Nenhum equipamento cadastrado</option>
                  {equipments.map((eq) => (
                    <option key={eq.id} value={eq.id}>
                      {eq.name} ({eq.asset_number})
                    </option>
                  ))}
                </select>
              </div>

              {/* Photo Capture using Camera or Gallery */}
              <ImageCaptureInput
                label="Foto do Local / Equipamento Danificado (Câmera ou Galeria)"
                onImageCaptured={(url) => setPhotoUrl(url)}
                currentImageUrl={photoUrl}
              />

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
                  className="px-5 py-2 bg-[#D32F2F] text-white text-xs font-bold uppercase tracking-wider rounded-lg hover:bg-red-800 shadow-sm"
                >
                  Criar Ordem de Serviço
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* SERVICE ORDER DETAIL & COMMENTS MODAL */}
      {selectedOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
            <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
              <div>
                <span className="text-xs text-red-400 font-mono font-bold">OS #{selectedOrder.id}</span>
                <h3 className="text-base font-bold">{selectedOrder.title}</h3>
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={(e) => handleDeleteOrder(selectedOrder, e)}
                  className="p-1.5 bg-rose-600/20 hover:bg-rose-600 text-rose-300 hover:text-white rounded-lg transition-colors flex items-center gap-1 text-xs font-semibold px-2.5"
                  title="Excluir Ordem de Serviço"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Excluir</span>
                </button>
                <button onClick={() => setSelectedOrder(null)} className="text-slate-400 hover:text-white">
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="p-6 space-y-6 overflow-y-auto flex-1">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs">
                <div>
                  <p className="text-slate-400 text-[10px] uppercase font-bold">Status Atual</p>
                  <div className="mt-1">{getStatusBadge(selectedOrder.status)}</div>
                </div>
                <div>
                  <p className="text-slate-400 text-[10px] uppercase font-bold">Prioridade</p>
                  <div className="mt-1">{getPriorityBadge(selectedOrder.priority)}</div>
                </div>
                <div>
                  <p className="text-slate-400 text-[10px] uppercase font-bold">Setor</p>
                  <p className="font-semibold text-slate-800 mt-1">{selectedOrder.sector}</p>
                </div>
                <div>
                  <p className="text-slate-400 text-[10px] uppercase font-bold">Criado por</p>
                  <p className="font-semibold text-slate-800 mt-1">{selectedOrder.created_by_name}</p>
                </div>
              </div>

              <div>
                <h4 className="text-xs font-bold text-slate-700 uppercase mb-1">Descrição do Chamado</h4>
                <p className="text-xs text-slate-800 bg-slate-50 p-3 rounded-lg border border-slate-200 leading-relaxed whitespace-pre-line">
                  {selectedOrder.description}
                </p>
              </div>

              {/* INITIAL PHOTO */}
              {selectedOrder.photo_url && (
                <div>
                  <h4 className="text-xs font-bold text-slate-700 uppercase mb-1">Foto Inicial do Problema</h4>
                  <div className="h-48 w-full rounded-xl overflow-hidden bg-slate-100 border border-slate-200">
                    <img src={selectedOrder.photo_url} alt="Foto Inicial" className="w-full h-full object-cover" />
                  </div>
                </div>
              )}

              {/* CONCLUSION DETAILS (IF CONCLUDED) */}
              {selectedOrder.status === 'concluida' && (
                <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl space-y-3">
                  <div className="flex items-center gap-2 text-emerald-900">
                    <FileCheck className="w-5 h-5 text-emerald-600" />
                    <h4 className="text-xs font-bold uppercase tracking-wider">
                      Detalhes da Conclusão do Servico
                    </h4>
                  </div>

                  <div className="text-xs text-emerald-950 space-y-1">
                    {selectedOrder.conclusao_data && (
                      <p>
                        <span className="font-bold">Data/Hora da Conclusão:</span>{' '}
                        {new Date(selectedOrder.conclusao_data).toLocaleString('pt-BR')}
                      </p>
                    )}
                    {selectedOrder.conclusao_observacao && (
                      <p>
                        <span className="font-bold">Observação do Reparo:</span>{' '}
                        {selectedOrder.conclusao_observacao}
                      </p>
                    )}
                  </div>

                  {selectedOrder.foto_conserto_url && (
                    <div className="mt-2">
                      <p className="text-[10px] uppercase font-bold text-emerald-800 mb-1">
                        Foto do Conserto Finalizado:
                      </p>
                      <div className="h-44 w-full rounded-lg overflow-hidden bg-white border border-emerald-200">
                        <img
                          src={selectedOrder.foto_conserto_url}
                          alt="Foto do Conserto"
                          className="w-full h-full object-cover"
                        />
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* ADMIN / STAFF CONTROLS: Status Change & Assignment */}
              {(isAdmin || selectedOrder.assigned_to === currentUser.id) && (
                <div className="p-4 bg-red-50/50 rounded-xl border border-red-100 space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold text-red-900 uppercase tracking-wider">
                      Gerenciamento da Ordem de Serviço
                    </h4>

                    {selectedOrder.status !== 'concluida' && (
                      <button
                        onClick={() => {
                          setConclusaoData(new Date().toISOString().slice(0, 16));
                          setConclusaoObservacao('');
                          setFotoConsertoUrl('');
                          setIsConcludeModalOpen(true);
                        }}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-lg shadow-xs transition-colors"
                      >
                        <CheckCircle2 className="w-4 h-4" />
                        <span>Concluir OS</span>
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">Atualizar Status</label>
                      <select
                        value={selectedOrder.status}
                        onChange={(e) => handleUpdateStatus(selectedOrder.id, e.target.value as OSStatus)}
                        className="w-full py-1.5 px-3 border border-slate-300 rounded-lg text-xs font-medium text-slate-900 bg-white"
                      >
                        <option value="aberta">Aberta</option>
                        <option value="em_andamento">Em Andamento</option>
                        <option value="aguardando_peca">Aguardando Peça</option>
                        <option value="concluida">Concluída</option>
                        <option value="cancelada">Cancelada</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">Atribuir Responsável</label>
                      <select
                        value={selectedOrder.assigned_to || ''}
                        onChange={(e) => handleAssignStaff(selectedOrder.id, e.target.value)}
                        className="w-full py-1.5 px-3 border border-slate-300 rounded-lg text-xs font-medium text-slate-900 bg-white"
                      >
                        <option value="">Ninguém atribuído</option>
                        {profiles.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.full_name} ({p.department})
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
              )}

              {/* COMMENTS / TIMELINE SECTION */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                  <MessageSquare className="w-4 h-4 text-red-600" /> Histórico & Atualizações ({selectedOrder.comments.length})
                </h4>

                <div className="space-y-2.5 max-h-48 overflow-y-auto pr-1">
                  {selectedOrder.comments.length === 0 ? (
                    <p className="text-xs text-slate-400 italic">Nenhum comentário registrado ainda.</p>
                  ) : (
                    selectedOrder.comments.map((c) => (
                      <div key={c.id} className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-xs">
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-bold text-slate-900">{c.user_name}</span>
                          <span className="text-[10px] text-slate-400">
                            {new Date(c.created_at).toLocaleDateString('pt-BR')} {new Date(c.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        <p className="text-slate-700">{c.comment}</p>
                      </div>
                    ))
                  )}
                </div>

                <form onSubmit={handleAddComment} className="flex gap-2 pt-2">
                  <input
                    type="text"
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    placeholder="Adicionar atualização ou observação..."
                    className="flex-1 px-3 py-2 border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-red-600"
                  />
                  <button
                    type="submit"
                    className="px-4 py-2 bg-slate-900 text-white rounded-lg text-xs font-bold hover:bg-slate-800 flex items-center gap-1"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>Enviar</span>
                  </button>
                </form>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* CONCLUDE SERVICE ORDER MODAL */}
      {isConcludeModalOpen && selectedOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
            <div className="px-6 py-4 bg-emerald-700 text-white flex items-center justify-between">
              <h3 className="text-sm font-bold flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4" /> Finalizar & Concluir Ordem de Serviço
              </h3>
              <button onClick={() => setIsConcludeModalOpen(false)} className="text-white hover:opacity-80">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleConcludeOS} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
              <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 text-xs text-emerald-900">
                <p className="font-bold">OS #{selectedOrder.id}: {selectedOrder.title}</p>
                <p className="text-[11px] text-emerald-700">Setor: {selectedOrder.sector}</p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Data e Hora da Conclusão
                </label>
                <input
                  type="datetime-local"
                  required
                  value={conclusaoData}
                  onChange={(e) => setConclusaoData(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-600"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Observações do Servico Realizado
                </label>
                <textarea
                  required
                  rows={3}
                  value={conclusaoObservacao}
                  onChange={(e) => setConclusaoObservacao(e.target.value)}
                  placeholder="Descreva o reparo ou serviço efetuado, peças trocadas..."
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-600"
                />
              </div>

              {/* Photo of Repair */}
              <ImageCaptureInput
                label="Foto do Conserto Finalizado (Câmera ou Galeria)"
                onImageCaptured={(url) => setFotoConsertoUrl(url)}
                currentImageUrl={fotoConsertoUrl}
              />

              <div className="pt-3 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setIsConcludeModalOpen(false)}
                  className="px-4 py-2 border border-slate-300 text-slate-700 text-xs font-semibold rounded-lg hover:bg-slate-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-600 text-white text-xs font-bold uppercase tracking-wider rounded-lg hover:bg-emerald-700 shadow-sm"
                >
                  Concluir e Salvar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* CONFIRM DELETE MODAL */}
      <ConfirmDeleteModal
        isOpen={!!deleteTarget}
        title="Excluir Ordem de Serviço"
        description={`Tem certeza que deseja excluir permanentemente a OS #${deleteTarget?.id} ("${deleteTarget?.title}")? Esta ação não pode ser desfeita.`}
        onConfirm={confirmDeleteOrder}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
};
