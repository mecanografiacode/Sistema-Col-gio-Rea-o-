import React, { useState, useEffect } from 'react';
import { Equipment, ServiceOrder, UserProfile, EquipmentStatus, EquipmentLoan } from '../../types';
import { storage } from '../../lib/storage';
import { ImageCaptureInput } from '../common/ImageCaptureInput';
import { SignatureCanvas } from '../common/SignatureCanvas';
import { ConfirmDeleteModal } from '../common/ConfirmDeleteModal';
import { exportEquipmentsPDF, exportLoansPDF } from '../../lib/pdfExport';
import {
  Monitor,
  Plus,
  Search,
  AlertTriangle,
  QrCode,
  Calendar,
  Building2,
  CheckCircle2,
  Wrench,
  XCircle,
  X,
  History,
  ShieldAlert,
  Handshake,
  UserCheck,
  FileText,
  Clock,
  User,
  ArrowRight,
  FileDown,
  Trash2,
  Maximize2,
  Boxes,
  CheckSquare,
  Square,
  Filter,
  Eye,
  RefreshCw,
  Layers,
  ArrowDownLeft,
  ArrowUpRight
} from 'lucide-react';

interface EquipamentosProps {
  currentUser: UserProfile;
}

export const Equipamentos: React.FC<EquipamentosProps> = ({ currentUser }) => {
  if (currentUser.role === 'operador') {
    return (
      <div className="bg-white rounded-2xl p-8 text-center border border-slate-200 shadow-xs my-6">
        <ShieldAlert className="w-12 h-12 text-red-600 mx-auto mb-3" />
        <h3 className="text-lg font-bold text-slate-800">Acesso Restrito</h3>
        <p className="text-xs text-slate-500 mt-1">O perfil de Operador não possui acesso ao módulo de Equipamentos.</p>
      </div>
    );
  }

  // Data States
  const [equipmentList, setEquipmentList] = useState<Equipment[]>([]);
  const [serviceOrders, setServiceOrders] = useState<ServiceOrder[]>([]);
  const [allLoans, setAllLoans] = useState<EquipmentLoan[]>([]);
  const [profiles, setProfiles] = useState<UserProfile[]>([]);

  // Sub-tab state: 'inventario' | 'emprestimo' | 'devolucao' | 'historico'
  const [activeSubTab, setActiveSubTab] = useState<'inventario' | 'emprestimo' | 'devolucao' | 'historico'>('inventario');

  // Filter & Search States
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string>('todos');
  const [qrInput, setQrInput] = useState('');

  // Modal States
  const [isNewModalOpen, setIsNewModalOpen] = useState(false);
  const [selectedEquipment, setSelectedEquipment] = useState<Equipment | null>(null);
  const [activeDetailTab, setActiveDetailTab] = useState<'detalhes' | 'emprestimos'>('detalhes');
  const [expandedImage, setExpandedImage] = useState<string | null>(null);

  // Delete Confirm State
  const [deleteTarget, setDeleteTarget] = useState<Equipment | null>(null);

  // New Equipment Form State
  const [name, setName] = useState('');
  const [type, setType] = useState('Multimídia');
  const [assetNumber, setAssetNumber] = useState('');
  const [roomLocation, setRoomLocation] = useState('');
  const [acquisitionDate, setAcquisitionDate] = useState('');
  const [status, setStatus] = useState<EquipmentStatus>('ativo');
  const [notes, setNotes] = useState('');
  const [fotoUrl, setFotoUrl] = useState('');

  // MULTI-EQUIPMENT LOAN FORM STATE
  const [loanFuncionarioNome, setLoanFuncionarioNome] = useState('');
  const [loanFuncionarioId, setLoanFuncionarioId] = useState('');
  const [loanDataRetirada, setLoanDataRetirada] = useState('');
  const [loanObservacao, setLoanObservacao] = useState('');
  const [loanAssinaturaUrl, setLoanAssinaturaUrl] = useState('');
  const [selectedEquipmentIdsForLoan, setSelectedEquipmentIdsForLoan] = useState<string[]>([]);
  const [loanSearchEq, setLoanSearchEq] = useState('');
  const [isSubmittingLoan, setIsSubmittingLoan] = useState(false);
  const [loanSuccessMessage, setLoanSuccessMessage] = useState<string | null>(null);

  // MULTI-EQUIPMENT RETURN FORM STATE
  const [returnDataDevolucao, setReturnDataDevolucao] = useState('');
  const [returnObservacao, setReturnObservacao] = useState('');
  const [returnAssinaturaUrl, setReturnAssinaturaUrl] = useState('');
  const [selectedLoanIdsForReturn, setSelectedLoanIdsForReturn] = useState<string[]>([]);
  const [returnSearchText, setReturnSearchText] = useState('');
  const [isSubmittingReturn, setIsSubmittingReturn] = useState(false);
  const [returnSuccessMessage, setReturnSuccessMessage] = useState<string | null>(null);

  // History Filter
  const [historyFilterStatus, setHistoryFilterStatus] = useState<'todos' | 'em_aberto' | 'concluido'>('todos');
  const [historySearch, setHistorySearch] = useState('');

  const isAdmin = currentUser.role === 'admin' || currentUser.role === 'super_admin';

  const loadData = async () => {
    const eq = await storage.getEquipment();
    const os = await storage.getServiceOrders();
    const loans = await storage.getEquipmentLoans();
    const profs = await storage.getProfiles();
    setEquipmentList(eq);
    setServiceOrders(os);
    setAllLoans(loans);
    setProfiles(profs);
  };

  useEffect(() => {
    loadData();
    const unsubscribe = storage.subscribe(() => {
      loadData();
    });
    return () => unsubscribe();
  }, []);

  // Initialize dates when entering tabs
  useEffect(() => {
    if (activeSubTab === 'emprestimo' && !loanDataRetirada) {
      setLoanDataRetirada(new Date().toISOString().slice(0, 16));
    }
    if (activeSubTab === 'devolucao' && !returnDataDevolucao) {
      setReturnDataDevolucao(new Date().toISOString().slice(0, 16));
    }
  }, [activeSubTab]);

  // Create New Equipment
  const handleCreateEquipment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !assetNumber.trim()) return;

    await storage.addEquipment(
      {
        name,
        type,
        asset_number: assetNumber,
        room_location: roomLocation,
        acquisition_date: acquisitionDate || undefined,
        warranty_until: new Date().toISOString().split('T')[0],
        status,
        notes: notes || undefined,
        foto_url: fotoUrl || undefined
      },
      currentUser
    );

    setIsNewModalOpen(false);
    setName('');
    setAssetNumber('');
    setRoomLocation('');
    setAcquisitionDate('');
    setNotes('');
    setFotoUrl('');
    loadData();
  };

  // Change Equipment Status
  const handleStatusChange = async (eqId: string, newStatus: EquipmentStatus) => {
    await storage.updateEquipmentStatus(eqId, newStatus, currentUser);
    if (selectedEquipment && selectedEquipment.id === eqId) {
      setSelectedEquipment({ ...selectedEquipment, status: newStatus });
    }
    loadData();
  };

  // Handle Multi-Equipment Loan Submission
  const handleCreateMultiLoan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loanFuncionarioNome.trim()) {
      alert('Por favor, informe o nome do funcionário ou professor responsável.');
      return;
    }
    if (selectedEquipmentIdsForLoan.length === 0) {
      alert('Selecione pelo menos 1 equipamento para realizar o empréstimo.');
      return;
    }

    // Check if any selected equipment is currently loaned out
    const openLoanEqIds = new Set(allLoans.filter((l) => l.status === 'em_aberto').map((l) => l.equipment_id));
    const alreadyLoaned = selectedEquipmentIdsForLoan.filter((id) => openLoanEqIds.has(id));
    if (alreadyLoaned.length > 0) {
      alert('Um ou mais equipamentos selecionados já possuem um empréstimo em aberto e ainda não foram devolvidos!');
      return;
    }

    setIsSubmittingLoan(true);
    setLoanSuccessMessage(null);

    try {
      for (const eqId of selectedEquipmentIdsForLoan) {
        const eq = equipmentList.find((item) => item.id === eqId);
        if (eq) {
          await storage.addEquipmentLoan(
            {
              equipment_id: eq.id,
              equipment_name: eq.name,
              funcionario_id: loanFuncionarioId || undefined,
              funcionario_nome: loanFuncionarioNome.trim(),
              data_retirada: loanDataRetirada || new Date().toISOString(),
              observacao_retirada: loanObservacao || undefined,
              assinatura_retirada_url: loanAssinaturaUrl || undefined
            },
            currentUser
          );
        }
      }

      const totalItems = selectedEquipmentIdsForLoan.length;
      setLoanSuccessMessage(`✅ Empréstimo registrado com sucesso para ${totalItems} equipamento(s)!`);
      setSelectedEquipmentIdsForLoan([]);
      setLoanObservacao('');
      setLoanAssinaturaUrl('');
      loadData();

      setTimeout(() => {
        setLoanSuccessMessage(null);
        setActiveSubTab('historico');
      }, 1500);
    } catch (err: any) {
      console.error('Erro ao registrar empréstimo múltiplo:', err);
      alert('Ocorreu um erro ao salvar o empréstimo. Tente novamente.');
    } finally {
      setIsSubmittingLoan(false);
    }
  };

  // Handle Multi-Equipment Return Submission
  const handleCreateMultiReturn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedLoanIdsForReturn.length === 0) {
      alert('Selecione pelo menos 1 empréstimo para registrar a devolução.');
      return;
    }

    setIsSubmittingReturn(true);
    setReturnSuccessMessage(null);

    try {
      for (const loanId of selectedLoanIdsForReturn) {
        await storage.returnEquipmentLoan(
          loanId,
          returnDataDevolucao || new Date().toISOString(),
          returnObservacao || undefined,
          returnAssinaturaUrl || undefined,
          currentUser
        );
      }

      const totalItems = selectedLoanIdsForReturn.length;
      setReturnSuccessMessage(`✅ Devolução concluída com sucesso para ${totalItems} equipamento(s)!`);
      setSelectedLoanIdsForReturn([]);
      setReturnObservacao('');
      setReturnAssinaturaUrl('');
      loadData();

      setTimeout(() => {
        setReturnSuccessMessage(null);
        setActiveSubTab('historico');
      }, 1500);
    } catch (err: any) {
      console.error('Erro ao registrar devolução múltipla:', err);
      alert('Ocorreu um erro ao processar a devolução. Tente novamente.');
    } finally {
      setIsSubmittingReturn(false);
    }
  };

  // Confirm Equipment Delete
  const confirmDeleteEquipment = async () => {
    if (!deleteTarget) return;
    try {
      await storage.deleteEquipment(deleteTarget.id, currentUser);
      if (selectedEquipment?.id === deleteTarget.id) {
        setSelectedEquipment(null);
      }
      setDeleteTarget(null);
      loadData();
    } catch (err: any) {
      console.error('Erro ao deletar equipamento:', err?.message || err);
    }
  };

  // Filtered Equipment List for Inventory
  const openLoans = allLoans.filter((l) => l.status === 'em_aberto');
  const openLoanEquipmentIds = new Set(openLoans.map((l) => l.equipment_id));

  const filteredInventoryList = equipmentList.filter((e) => {
    const matchesSearch =
      e.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      e.asset_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
      e.room_location.toLowerCase().includes(searchQuery.toLowerCase());

    const isLoaned = e.status === 'emprestado' || openLoanEquipmentIds.has(e.id);

    if (selectedStatus === 'em_aberto_emprestimos') {
      return matchesSearch && isLoaned;
    }

    const matchesStatus =
      selectedStatus === 'todos' ||
      (selectedStatus === 'emprestado' ? isLoaned : (selectedStatus === 'ativo' ? (e.status === 'ativo' && !isLoaned) : e.status === selectedStatus));

    const matchesQr = !qrInput || e.asset_number.toLowerCase().includes(qrInput.toLowerCase());
    return matchesSearch && matchesStatus && matchesQr;
  });

  // Equipments available for loan
  const availableEquipmentsForLoan = equipmentList.filter(
    (e) =>
      e.status === 'ativo' &&
      !openLoanEquipmentIds.has(e.id) &&
      (e.name.toLowerCase().includes(loanSearchEq.toLowerCase()) ||
        e.asset_number.toLowerCase().includes(loanSearchEq.toLowerCase()) ||
        e.room_location.toLowerCase().includes(loanSearchEq.toLowerCase()))
  );

  // Active loans available for return
  const activeLoansForReturn = allLoans.filter((l) => {
    if (l.status !== 'em_aberto') return false;
    if (!returnSearchText.trim()) return true;
    const text = returnSearchText.toLowerCase();
    return (
      l.funcionario_nome.toLowerCase().includes(text) ||
      (l.equipment_name && l.equipment_name.toLowerCase().includes(text)) ||
      (l.observacao_retirada && l.observacao_retirada.toLowerCase().includes(text))
    );
  });

  // Loans for history
  const filteredHistoryLoans = allLoans.filter((l) => {
    const matchesStatus = historyFilterStatus === 'todos' || l.status === historyFilterStatus;
    const text = historySearch.toLowerCase();
    const matchesSearch =
      !text ||
      l.funcionario_nome.toLowerCase().includes(text) ||
      (l.equipment_name && l.equipment_name.toLowerCase().includes(text)) ||
      (l.observacao_retirada && l.observacao_retirada.toLowerCase().includes(text)) ||
      (l.observacao_devolucao && l.observacao_devolucao.toLowerCase().includes(text));

    return matchesStatus && matchesSearch;
  });

  const getStatusBadge = (st: EquipmentStatus) => {
    switch (st) {
      case 'ativo':
        return <span className="bg-emerald-100 text-emerald-800 border border-emerald-300 text-xs font-semibold px-2.5 py-0.5 rounded-full">Ativo</span>;
      case 'emprestado':
        return <span className="bg-purple-100 text-purple-800 border border-purple-300 text-xs font-semibold px-2.5 py-0.5 rounded-full">Emprestado</span>;
      case 'manutencao':
        return <span className="bg-amber-100 text-amber-800 border border-amber-300 text-xs font-semibold px-2.5 py-0.5 rounded-full">Em Manutenção</span>;
      case 'baixado':
        return <span className="bg-rose-100 text-rose-800 border border-rose-300 text-xs font-semibold px-2.5 py-0.5 rounded-full">Baixado</span>;
    }
  };

  return (
    <div className="space-y-6 pb-20 lg:pb-8">
      {/* Title Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <Monitor className="w-6 h-6 text-[#D32F2F]" />
            <h2 className="text-2xl font-serif-editorial font-bold text-slate-900">Gestão de Equipamentos</h2>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Controle de patrimônio, computadores, projetores, som e empréstimos do Colégio Reação
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => exportEquipmentsPDF(filteredInventoryList)}
            className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 bg-slate-800 text-white font-bold text-xs rounded-xl hover:bg-slate-900 shadow-xs transition-colors cursor-pointer"
            title="Baixar Inventário Completo de Equipamentos em PDF"
          >
            <FileDown className="w-4 h-4 text-emerald-400" />
            <span>PDF Patrimônios</span>
          </button>

          <button
            onClick={() => exportLoansPDF(allLoans)}
            className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 bg-slate-800 text-white font-bold text-xs rounded-xl hover:bg-slate-900 shadow-xs transition-colors cursor-pointer"
            title="Baixar Relatório de Empréstimos e Devoluções em PDF"
          >
            <FileDown className="w-4 h-4 text-purple-400" />
            <span>PDF Empréstimos</span>
          </button>

          <button
            onClick={() => setIsNewModalOpen(true)}
            className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-[#D32F2F] text-white font-bold text-xs uppercase tracking-wider rounded-xl hover:bg-red-800 shadow-xs transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Novo Patrimônio</span>
          </button>
        </div>
      </div>

      {/* SUB-TABS NAVIGATION BAR */}
      <div className="bg-white p-1.5 rounded-2xl border border-slate-200 shadow-xs flex flex-wrap gap-1.5">
        <button
          onClick={() => setActiveSubTab('inventario')}
          className={`flex-1 min-w-[140px] px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center space-x-2 cursor-pointer ${
            activeSubTab === 'inventario'
              ? 'bg-[#D32F2F] text-white shadow-sm'
              : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
          }`}
        >
          <Boxes className="w-4 h-4" />
          <span>Inventário & Itens ({equipmentList.length})</span>
        </button>

        <button
          onClick={() => setActiveSubTab('emprestimo')}
          className={`flex-1 min-w-[160px] px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center space-x-2 cursor-pointer ${
            activeSubTab === 'emprestimo'
              ? 'bg-purple-700 text-white shadow-sm'
              : 'text-purple-800 bg-purple-50/80 hover:bg-purple-100'
          }`}
        >
          <Handshake className="w-4 h-4" />
          <span>Novo Empréstimo (Multi-Itens)</span>
        </button>

        <button
          onClick={() => setActiveSubTab('devolucao')}
          className={`flex-1 min-w-[160px] px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center space-x-2 cursor-pointer ${
            activeSubTab === 'devolucao'
              ? 'bg-emerald-700 text-white shadow-sm'
              : 'text-emerald-800 bg-emerald-50/80 hover:bg-emerald-100'
          }`}
        >
          <UserCheck className="w-4 h-4" />
          <span>Registrar Devolução ({openLoans.length})</span>
        </button>

        <button
          onClick={() => setActiveSubTab('historico')}
          className={`flex-1 min-w-[140px] px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center space-x-2 cursor-pointer ${
            activeSubTab === 'historico'
              ? 'bg-slate-900 text-white shadow-sm'
              : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
          }`}
        >
          <History className="w-4 h-4" />
          <span>Histórico de Empréstimos</span>
        </button>
      </div>

      {/* --- SUB-ABA 1: INVENTÁRIO & LISTA DE EQUIPAMENTOS --- */}
      {activeSubTab === 'inventario' && (
        <div className="space-y-6">
          {/* Open Loans Banner */}
          {openLoans.length > 0 && (
            <div className="p-4 bg-purple-50 border border-purple-200 rounded-xl flex items-start space-x-3 text-purple-900 shadow-xs">
              <Handshake className="w-5 h-5 text-purple-600 shrink-0 mt-0.5" />
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold uppercase tracking-wider">
                    Empréstimos em Aberto ({openLoans.length} equipamento(s))
                  </h4>
                  <button
                    onClick={() => setActiveSubTab('devolucao')}
                    className="text-[11px] font-bold text-purple-700 hover:underline cursor-pointer"
                  >
                    Registrar Devoluções →
                  </button>
                </div>
                <p className="text-xs mt-1 text-purple-800 leading-relaxed">
                  Há {openLoans.length} equipamento(s) atualmente retirados por professores ou funcionários.
                </p>
              </div>
            </div>
          )}

          {/* Filter & QR Simulator Bar */}
          <div className="bg-white p-4 rounded-xl shadow-xs border border-slate-200 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {/* Search */}
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar nome, sala, patrimônio..."
                className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-red-600"
              />
            </div>

            {/* QR Code / Asset Reader Simulator */}
            <div className="relative">
              <QrCode className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <input
                type="text"
                value={qrInput}
                onChange={(e) => setQrInput(e.target.value)}
                placeholder="Simular Leitor de QR / Patrimônio..."
                className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-lg text-xs font-mono text-slate-800 focus:outline-none focus:ring-2 focus:ring-red-600"
              />
            </div>

            {/* Status Filter */}
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="w-full py-2 px-3 border border-slate-200 rounded-lg text-xs text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-red-600"
            >
              <option value="todos">Todos os Status</option>
              <option value="ativo">Ativos</option>
              <option value="emprestado">Emprestados</option>
              <option value="em_aberto_emprestimos">🔴 Empréstimos Em Aberto</option>
              <option value="manutencao">Em Manutenção</option>
              <option value="baixado">Baixados</option>
            </select>

            <div className="flex items-center justify-end text-xs text-slate-500 font-semibold px-2">
              Exibindo: {filteredInventoryList.length} de {equipmentList.length}
            </div>
          </div>

          {/* Equipment List Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredInventoryList.map((eq) => {
              const linkedOSCount = serviceOrders.filter((os) => os.equipment_id === eq.id).length;
              const currentOpenLoan = allLoans.find((l) => l.equipment_id === eq.id && l.status === 'em_aberto');

              return (
                <div
                  key={eq.id}
                  onClick={() => {
                    setSelectedEquipment(eq);
                    setActiveDetailTab('detalhes');
                  }}
                  className="bg-white rounded-2xl border border-slate-200 shadow-xs hover:shadow-md transition-all overflow-hidden cursor-pointer flex flex-col justify-between group"
                >
                  {/* Clean Product Photo Frame */}
                  {eq.foto_url ? (
                    <div className="h-44 w-full bg-slate-950 overflow-hidden relative group/img flex items-center justify-center">
                      {/* Blurred background preview to avoid harsh black bars */}
                      <div
                        className="absolute inset-0 bg-cover bg-center opacity-30 blur-sm"
                        style={{ backgroundImage: `url(${eq.foto_url})` }}
                      />
                      <img
                        src={eq.foto_url}
                        alt={eq.name}
                        className="relative z-10 max-h-full max-w-full object-contain p-2 transition-transform duration-300 group-hover/img:scale-105"
                      />
                      <div className="absolute top-2 right-2 z-20 flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setExpandedImage(eq.foto_url!);
                          }}
                          className="p-1.5 bg-slate-900/80 hover:bg-slate-900 text-white rounded-lg backdrop-blur-md border border-white/20 transition-colors shadow-xs"
                          title="Ampliar foto em alta resolução"
                        >
                          <Maximize2 className="w-3.5 h-3.5" />
                        </button>
                        {getStatusBadge(currentOpenLoan ? 'emprestado' : eq.status)}
                      </div>
                    </div>
                  ) : (
                    <div className="h-24 w-full bg-slate-50 p-4 border-b border-slate-100 flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <Monitor className="w-6 h-6 text-slate-400" />
                        <span className="font-mono text-xs font-bold text-red-600 bg-red-50 px-2 py-1 rounded-md border border-red-100">
                          {eq.asset_number}
                        </span>
                      </div>
                      {getStatusBadge(currentOpenLoan ? 'emprestado' : eq.status)}
                    </div>
                  )}

                  <div className="p-4">
                    {eq.foto_url && (
                      <div className="mb-2">
                        <span className="font-mono text-xs font-bold text-red-600 bg-red-50 px-2 py-0.5 rounded-md border border-red-100">
                          {eq.asset_number}
                        </span>
                      </div>
                    )}

                    <h3 className="text-sm font-bold text-slate-900 group-hover:text-red-600 transition-colors">
                      {eq.name}
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">Tipo: {eq.type}</p>

                    {currentOpenLoan && (
                      <div className="mt-2.5 p-2 bg-purple-50 border border-purple-200 rounded-xl text-xs text-purple-900 flex items-center justify-between">
                        <span className="flex items-center gap-1 font-semibold truncate">
                          <User className="w-3.5 h-3.5 text-purple-600 shrink-0" />
                          <span className="truncate">{currentOpenLoan.funcionario_nome}</span>
                        </span>
                        <span className="text-[10px] bg-purple-200 text-purple-800 font-bold px-1.5 py-0.5 rounded-md shrink-0">
                          Emprestado
                        </span>
                      </div>
                    )}

                    <div className="mt-3 space-y-1.5 text-xs text-slate-600">
                      <div className="flex items-center space-x-1.5">
                        <Building2 className="w-3.5 h-3.5 text-slate-400" />
                        <span>{eq.room_location}</span>
                      </div>

                      <div className="flex items-center space-x-1.5 text-slate-500">
                        <Calendar className="w-3.5 h-3.5 text-slate-400" />
                        <span>
                          Aquisição: {eq.acquisition_date ? new Date(eq.acquisition_date).toLocaleDateString('pt-BR') : 'Não informada'}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="px-4 pb-4 pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                    <span className="flex items-center space-x-1">
                      <History className="w-3.5 h-3.5 text-slate-400" />
                      <span>{linkedOSCount} OS</span>
                    </span>
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setDeleteTarget(eq);
                        }}
                        className="p-1 text-slate-400 hover:text-rose-600 rounded-md hover:bg-rose-50 transition-colors cursor-pointer"
                        title="Excluir Equipamento"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                      <span className="text-red-600 font-semibold group-hover:underline">Ver detalhes →</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* --- SUB-ABA 2: NOVO EMPRÉSTIMO (COM SELEÇÃO MÚLTIPLA DE EQUIPAMENTOS) --- */}
      {activeSubTab === 'emprestimo' && (
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-6">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100">
            <div>
              <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <Handshake className="w-5 h-5 text-purple-700" />
                <span>Registrar Saída / Empréstimo de Equipamentos</span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Selecione um ou múltiplos equipamentos disponíveis para um professor ou funcionário retirar.
              </p>
            </div>
            <span className="text-xs font-bold text-purple-800 bg-purple-50 border border-purple-200 px-3 py-1 rounded-full">
              {availableEquipmentsForLoan.length} itens disponíveis
            </span>
          </div>

          {loanSuccessMessage && (
            <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-bold flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
              <span>{loanSuccessMessage}</span>
            </div>
          )}

          <form onSubmit={handleCreateMultiLoan} className="space-y-6">
            {/* Responsible Person & Date */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Funcionário / Professor Responsável <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  list="profiles-list-subtab"
                  value={loanFuncionarioNome}
                  onChange={(e) => {
                    setLoanFuncionarioNome(e.target.value);
                    const found = profiles.find((p) => p.full_name.toLowerCase() === e.target.value.toLowerCase());
                    if (found) setLoanFuncionarioId(found.id);
                  }}
                  placeholder="Digite ou selecione o nome do professor / funcionário..."
                  className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-purple-600 shadow-2xs"
                />
                <datalist id="profiles-list-subtab">
                  {profiles.map((p) => (
                    <option key={p.id} value={p.full_name}>
                      {p.department}
                    </option>
                  ))}
                </datalist>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Data e Hora da Retirada <span className="text-red-500">*</span>
                </label>
                <input
                  type="datetime-local"
                  required
                  value={loanDataRetirada}
                  onChange={(e) => setLoanDataRetirada(e.target.value)}
                  className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-purple-600 shadow-2xs"
                />
              </div>
            </div>

            {/* Multi-Equipment Selector */}
            <div className="space-y-3 pt-2 border-t border-slate-100">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <div>
                  <label className="block text-xs font-bold text-slate-800 uppercase">
                    Selecione os Equipamentos para Empréstimo <span className="text-red-500">*</span>
                  </label>
                  <p className="text-[11px] text-slate-500">
                    Você pode selecionar mais de um item para o mesmo empréstimo (ex: Projetor + Som + Cabo).
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-purple-700 bg-purple-100 px-3 py-1 rounded-xl">
                    {selectedEquipmentIdsForLoan.length} item(ns) selecionado(s)
                  </span>
                  {availableEquipmentsForLoan.length > 0 && (
                    <button
                      type="button"
                      onClick={() => {
                        if (selectedEquipmentIdsForLoan.length === availableEquipmentsForLoan.length) {
                          setSelectedEquipmentIdsForLoan([]);
                        } else {
                          setSelectedEquipmentIdsForLoan(availableEquipmentsForLoan.map((e) => e.id));
                        }
                      }}
                      className="text-xs font-semibold text-slate-600 hover:text-purple-700 underline cursor-pointer"
                    >
                      {selectedEquipmentIdsForLoan.length === availableEquipmentsForLoan.length
                        ? 'Desmarcar Todos'
                        : 'Selecionar Todos'}
                    </button>
                  )}
                </div>
              </div>

              {/* Search Available Equipments */}
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  value={loanSearchEq}
                  onChange={(e) => setLoanSearchEq(e.target.value)}
                  placeholder="Filtrar equipamentos disponíveis por nome, patrimônio ou sala..."
                  className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-purple-600 bg-slate-50"
                />
              </div>

              {/* Selectable Equipment Cards Grid */}
              {availableEquipmentsForLoan.length === 0 ? (
                <div className="p-8 text-center bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-500">
                  <AlertTriangle className="w-6 h-6 text-amber-500 mx-auto mb-2" />
                  Nenhum equipamento ativo disponível para empréstimo no momento.
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 max-h-72 overflow-y-auto p-1">
                  {availableEquipmentsForLoan.map((eq) => {
                    const isSelected = selectedEquipmentIdsForLoan.includes(eq.id);
                    return (
                      <div
                        key={eq.id}
                        onClick={() => {
                          if (isSelected) {
                            setSelectedEquipmentIdsForLoan((prev) => prev.filter((id) => id !== eq.id));
                          } else {
                            setSelectedEquipmentIdsForLoan((prev) => [...prev, eq.id]);
                          }
                        }}
                        className={`p-3 rounded-xl border text-xs cursor-pointer transition-all flex items-start space-x-3 select-none ${
                          isSelected
                            ? 'bg-purple-50 border-purple-400 shadow-2xs ring-2 ring-purple-600/30'
                            : 'bg-white border-slate-200 hover:border-purple-300'
                        }`}
                      >
                        <div className="mt-0.5">
                          {isSelected ? (
                            <CheckSquare className="w-4 h-4 text-purple-700" />
                          ) : (
                            <Square className="w-4 h-4 text-slate-300" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <span className="font-mono text-[10px] font-bold text-red-600 bg-red-50 px-1.5 py-0.5 rounded-md">
                              {eq.asset_number}
                            </span>
                            <span className="text-[10px] text-slate-400 font-medium">{eq.type}</span>
                          </div>
                          <p className="font-bold text-slate-900 mt-1 truncate">{eq.name}</p>
                          <p className="text-[11px] text-slate-500 mt-0.5">{eq.room_location}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Note Input */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Observações da Retirada</label>
              <textarea
                rows={2}
                value={loanObservacao}
                onChange={(e) => setLoanObservacao(e.target.value)}
                placeholder="Ex: Utilização na Sala de Reunião para apresentação de projeto pedagógico..."
                className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-purple-600 shadow-2xs"
              />
            </div>

            {/* Signature Canvas */}
            <SignatureCanvas
              label="Assinatura Digital de Retirada (Comprovante do Professor/Funcionário)"
              onSaveSignature={(dataUrl) => setLoanAssinaturaUrl(dataUrl)}
            />

            {/* Submit Button */}
            <div className="pt-2 flex justify-end">
              <button
                type="submit"
                disabled={isSubmittingLoan || selectedEquipmentIdsForLoan.length === 0}
                className="w-full sm:w-auto px-6 py-3 bg-purple-700 hover:bg-purple-800 text-white font-bold text-xs uppercase tracking-wider rounded-xl shadow-md transition-colors flex items-center justify-center space-x-2 disabled:opacity-50 cursor-pointer"
              >
                {isSubmittingLoan ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin text-white" />
                    <span>Registrando Empréstimo...</span>
                  </>
                ) : (
                  <>
                    <Handshake className="w-4 h-4" />
                    <span>Confirmar Saída de {selectedEquipmentIdsForLoan.length} Equipamento(s)</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* --- SUB-ABA 3: REGISTRAR DEVOLUÇÃO (COM SELEÇÃO MÚLTIPLA) --- */}
      {activeSubTab === 'devolucao' && (
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-6">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100">
            <div>
              <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <UserCheck className="w-5 h-5 text-emerald-700" />
                <span>Registrar Devolução de Equipamentos</span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Marque um ou mais equipamentos que estão sendo devolvidos para dar baixa nos empréstimos em aberto.
              </p>
            </div>
            <span className="text-xs font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 px-3 py-1 rounded-full">
              {activeLoansForReturn.length} pendente(s)
            </span>
          </div>

          {returnSuccessMessage && (
            <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-bold flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
              <span>{returnSuccessMessage}</span>
            </div>
          )}

          <form onSubmit={handleCreateMultiReturn} className="space-y-6">
            {/* Search Filter for Active Loans */}
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <input
                type="text"
                value={returnSearchText}
                onChange={(e) => setReturnSearchText(e.target.value)}
                placeholder="Buscar empréstimo pendente por funcionário ou equipamento..."
                className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-600 bg-slate-50"
              />
            </div>

            {/* Multi-Select Active Loans List */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-bold text-slate-800 uppercase">
                  Empréstimos em Aberto Aguardando Devolução <span className="text-red-500">*</span>
                </label>
                {activeLoansForReturn.length > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      if (selectedLoanIdsForReturn.length === activeLoansForReturn.length) {
                        setSelectedLoanIdsForReturn([]);
                      } else {
                        setSelectedLoanIdsForReturn(activeLoansForReturn.map((l) => l.id));
                      }
                    }}
                    className="text-xs font-semibold text-slate-600 hover:text-emerald-700 underline cursor-pointer"
                  >
                    {selectedLoanIdsForReturn.length === activeLoansForReturn.length
                      ? 'Desmarcar Todos'
                      : 'Selecionar Todos'}
                  </button>
                )}
              </div>

              {activeLoansForReturn.length === 0 ? (
                <div className="p-8 text-center bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-500">
                  <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
                  Nenhum empréstimo em aberto registrado no momento! Todos os equipamentos estão devidamente devolvidos.
                </div>
              ) : (
                <div className="space-y-2 max-h-80 overflow-y-auto p-1">
                  {activeLoansForReturn.map((loan) => {
                    const isSelected = selectedLoanIdsForReturn.includes(loan.id);
                    return (
                      <div
                        key={loan.id}
                        onClick={() => {
                          if (isSelected) {
                            setSelectedLoanIdsForReturn((prev) => prev.filter((id) => id !== loan.id));
                          } else {
                            setSelectedLoanIdsForReturn((prev) => [...prev, loan.id]);
                          }
                        }}
                        className={`p-4 rounded-xl border text-xs cursor-pointer transition-all flex items-start space-x-3 select-none ${
                          isSelected
                            ? 'bg-emerald-50/80 border-emerald-400 shadow-2xs ring-2 ring-emerald-600/30'
                            : 'bg-white border-slate-200 hover:border-emerald-300'
                        }`}
                      >
                        <div className="mt-0.5">
                          {isSelected ? (
                            <CheckSquare className="w-4 h-4 text-emerald-700" />
                          ) : (
                            <Square className="w-4 h-4 text-slate-300" />
                          )}
                        </div>

                        <div className="flex-1 space-y-1">
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-slate-900 text-sm">{loan.funcionario_nome}</span>
                            <span className="text-[10px] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">
                              Retirado em {new Date(loan.data_retirada).toLocaleString('pt-BR')}
                            </span>
                          </div>

                          <p className="font-semibold text-slate-800">
                            Equipamento: <span className="text-purple-700">{loan.equipment_name}</span>
                          </p>

                          {loan.observacao_retirada && (
                            <p className="text-[11px] text-slate-500 italic">
                              Obs Retirada: "{loan.observacao_retirada}"
                            </p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Date & Return Notes */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-slate-100">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Data e Hora da Devolução <span className="text-red-500">*</span>
                </label>
                <input
                  type="datetime-local"
                  required
                  value={returnDataDevolucao}
                  onChange={(e) => setReturnDataDevolucao(e.target.value)}
                  className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-600 shadow-2xs"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Observações da Devolução</label>
                <input
                  type="text"
                  value={returnObservacao}
                  onChange={(e) => setReturnObservacao(e.target.value)}
                  placeholder="Ex: Devolvido em ótimo estado de conservação, testado..."
                  className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-600 shadow-2xs"
                />
              </div>
            </div>

            {/* Signature Canvas */}
            <SignatureCanvas
              label="Assinatura Digital de Devolução (Conferência / Recebimento)"
              onSaveSignature={(dataUrl) => setReturnAssinaturaUrl(dataUrl)}
            />

            {/* Submit Button */}
            <div className="pt-2 flex justify-end">
              <button
                type="submit"
                disabled={isSubmittingReturn || selectedLoanIdsForReturn.length === 0}
                className="w-full sm:w-auto px-6 py-3 bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs uppercase tracking-wider rounded-xl shadow-md transition-colors flex items-center justify-center space-x-2 disabled:opacity-50 cursor-pointer"
              >
                {isSubmittingReturn ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin text-white" />
                    <span>Processando Devoluções...</span>
                  </>
                ) : (
                  <>
                    <UserCheck className="w-4 h-4" />
                    <span>Confirmar Devolução de {selectedLoanIdsForReturn.length} Item(ns)</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* --- SUB-ABA 4: HISTÓRICO COMPLETO DE EMPRÉSTIMOS --- */}
      {activeSubTab === 'historico' && (
        <div className="space-y-6">
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <input
                type="text"
                value={historySearch}
                onChange={(e) => setHistorySearch(e.target.value)}
                placeholder="Buscar por funcionário, equipamento ou observação..."
                className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-800"
              />
            </div>

            <div className="flex items-center gap-2">
              <select
                value={historyFilterStatus}
                onChange={(e) => setHistoryFilterStatus(e.target.value as any)}
                className="py-2 px-3 border border-slate-200 rounded-lg text-xs text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-slate-800"
              >
                <option value="todos">Todos os Registros</option>
                <option value="em_aberto">🔴 Em Aberto</option>
                <option value="concluido">🟢 Concluídos</option>
              </select>

              <button
                onClick={() => exportLoansPDF(filteredHistoryLoans)}
                className="px-3.5 py-2 bg-purple-700 hover:bg-purple-800 text-white text-xs font-bold rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <FileDown className="w-4 h-4" />
                <span>Exportar PDF</span>
              </button>
            </div>
          </div>

          {filteredHistoryLoans.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-2xl border border-slate-200">
              <History className="w-10 h-10 text-slate-300 mx-auto mb-2" />
              <p className="text-xs text-slate-500 font-medium">Nenhum registro de empréstimo encontrado.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredHistoryLoans.map((loan) => (
                <div
                  key={loan.id}
                  className={`p-4 rounded-2xl border text-xs space-y-3 bg-white ${
                    loan.status === 'em_aberto' ? 'border-purple-300 shadow-xs' : 'border-slate-200'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-900 text-sm">{loan.funcionario_nome}</span>
                      {loan.status === 'em_aberto' ? (
                        <span className="bg-purple-600 text-white font-bold text-[10px] uppercase px-2.5 py-0.5 rounded-full animate-pulse">
                          Em Aberto
                        </span>
                      ) : (
                        <span className="bg-emerald-100 text-emerald-800 font-bold text-[10px] uppercase px-2.5 py-0.5 rounded-full">
                          Devolvido / Concluído
                        </span>
                      )}
                    </div>

                    <span className="font-mono text-xs text-slate-500 font-bold">
                      Equipamento: <span className="text-slate-900">{loan.equipment_name}</span>
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-slate-50 p-3 rounded-xl border border-slate-200/80">
                    {/* Withdrawal details */}
                    <div>
                      <p className="text-[10px] uppercase font-bold text-slate-400 flex items-center gap-1">
                        <ArrowUpRight className="w-3 h-3 text-purple-600" /> Retirada
                      </p>
                      <p className="text-xs font-medium text-slate-800 mt-0.5">
                        {new Date(loan.data_retirada).toLocaleString('pt-BR')}
                      </p>
                      {loan.observacao_retirada && (
                        <p className="text-[11px] text-slate-600 italic mt-1">
                          Obs: "{loan.observacao_retirada}"
                        </p>
                      )}
                      {loan.assinatura_retirada_url && (
                        <div className="mt-2">
                          <p className="text-[9px] uppercase font-bold text-slate-400">Assinatura Retirada:</p>
                          <img
                            src={loan.assinatura_retirada_url}
                            alt="Assinatura Retirada"
                            className="h-12 border border-slate-200 rounded-md mt-1 bg-white object-contain"
                          />
                        </div>
                      )}
                    </div>

                    {/* Return details */}
                    <div>
                      <p className="text-[10px] uppercase font-bold text-slate-400 flex items-center gap-1">
                        <ArrowDownLeft className="w-3 h-3 text-emerald-600" /> Devolução
                      </p>
                      {loan.data_devolucao ? (
                        <>
                          <p className="text-xs font-medium text-slate-800 mt-0.5">
                            {new Date(loan.data_devolucao).toLocaleString('pt-BR')}
                          </p>
                          {loan.observacao_devolucao && (
                            <p className="text-[11px] text-slate-600 italic mt-1">
                              Obs: "{loan.observacao_devolucao}"
                            </p>
                          )}
                          {loan.assinatura_devolucao_url && (
                            <div className="mt-2">
                              <p className="text-[9px] uppercase font-bold text-slate-400">Assinatura Devolução:</p>
                              <img
                                src={loan.assinatura_devolucao_url}
                                alt="Assinatura Devolução"
                                className="h-12 border border-slate-200 rounded-md mt-1 bg-white object-contain"
                              />
                            </div>
                          )}
                        </>
                      ) : (
                        <p className="text-xs text-purple-700 font-semibold italic mt-1">
                          Aguardando devolução...
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* NEW EQUIPMENT MODAL */}
      {isNewModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
            <div className="px-6 py-4 bg-[#D32F2F] text-white flex items-center justify-between">
              <h3 className="text-sm font-bold flex items-center gap-2">
                <Monitor className="w-4 h-4" /> Cadastrar Novo Equipamento
              </h3>
              <button onClick={() => setIsNewModalOpen(false)} className="text-white hover:opacity-80 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateEquipment} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
              {/* Photo Input with Camera and Gallery */}
              <ImageCaptureInput
                label="Foto do Equipamento (Câmera ou Galeria)"
                onImageCaptured={(url) => setFotoUrl(url)}
                currentImageUrl={fotoUrl}
              />

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Nome do Equipamento</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ex: Projetor Epson PowerLite"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-red-600"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Tipo / Categoria</label>
                  <input
                    type="text"
                    required
                    value={type}
                    onChange={(e) => setType(e.target.value)}
                    placeholder="Multimídia, Climatização, TI..."
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-red-600"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Nº de Patrimônio</label>
                  <input
                    type="text"
                    required
                    value={assetNumber}
                    onChange={(e) => setAssetNumber(e.target.value)}
                    placeholder="Ex: CR-PAT-2026-050"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-mono text-slate-900 focus:outline-none focus:ring-2 focus:ring-red-600"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Local / Sala de Instalação</label>
                <input
                  type="text"
                  required
                  value={roomLocation}
                  onChange={(e) => setRoomLocation(e.target.value)}
                  placeholder="Ex: Sala 104, Laboratório de TI, Auditório"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-red-600"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Observações de Fatura / Fornecedor</label>
                <textarea
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Detalhes adicionais de garantia ou fornecedor..."
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-red-600"
                />
              </div>

              <div className="pt-3 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setIsNewModalOpen(false)}
                  className="px-4 py-2 border border-slate-300 text-slate-700 text-xs font-semibold rounded-lg hover:bg-slate-50 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-[#D32F2F] text-white text-xs font-bold uppercase tracking-wider rounded-lg hover:bg-red-800 shadow-xs cursor-pointer"
                >
                  Cadastrar Patrimônio
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EQUIPMENT DETAIL MODAL */}
      {selectedEquipment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
            <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
              <div>
                <span className="text-xs font-mono text-red-400 font-bold">{selectedEquipment.asset_number}</span>
                <h3 className="text-base font-bold">{selectedEquipment.name}</h3>
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setDeleteTarget(selectedEquipment)}
                  className="p-1.5 bg-rose-600/20 hover:bg-rose-600 text-rose-300 hover:text-white rounded-lg transition-colors flex items-center gap-1 text-xs font-semibold px-2.5 cursor-pointer"
                  title="Excluir Equipamento"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Excluir</span>
                </button>
                <button onClick={() => setSelectedEquipment(null)} className="text-slate-400 hover:text-white cursor-pointer">
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* TAB NAVIGATION */}
            <div className="flex border-b border-slate-200 bg-slate-50 px-6 pt-2 gap-4 text-xs font-bold">
              <button
                onClick={() => setActiveDetailTab('detalhes')}
                className={`py-2.5 border-b-2 transition-colors cursor-pointer ${
                  activeDetailTab === 'detalhes'
                    ? 'border-red-600 text-red-600'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                Detalhes & OS
              </button>
              <button
                onClick={() => setActiveDetailTab('emprestimos')}
                className={`py-2.5 border-b-2 transition-colors flex items-center gap-1.5 cursor-pointer ${
                  activeDetailTab === 'emprestimos'
                    ? 'border-red-600 text-red-600'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                <Handshake className="w-3.5 h-3.5" />
                <span>Histórico do Item</span>
                {allLoans.filter((l) => l.equipment_id === selectedEquipment.id && l.status === 'em_aberto').length > 0 && (
                  <span className="w-2 h-2 rounded-full bg-purple-600 animate-pulse" />
                )}
              </button>
            </div>

            <div className="p-6 space-y-5 overflow-y-auto flex-1">
              {activeDetailTab === 'detalhes' ? (
                <>
                  {/* Clean Framed Image with Blur Effect */}
                  {selectedEquipment.foto_url && (
                    <div className="relative w-full h-64 rounded-2xl overflow-hidden bg-slate-950 border border-slate-800 flex items-center justify-center">
                      <div
                        className="absolute inset-0 bg-cover bg-center opacity-30 blur-md"
                        style={{ backgroundImage: `url(${selectedEquipment.foto_url})` }}
                      />
                      <img
                        src={selectedEquipment.foto_url}
                        alt={selectedEquipment.name}
                        className="relative z-10 max-h-full max-w-full object-contain p-2"
                      />
                      <button
                        type="button"
                        onClick={() => setExpandedImage(selectedEquipment.foto_url!)}
                        className="absolute top-3 right-3 z-20 px-3 py-1.5 bg-slate-900/80 hover:bg-slate-900 text-white rounded-xl backdrop-blur-md border border-white/20 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer shadow-sm"
                      >
                        <Maximize2 className="w-3.5 h-3.5" />
                        <span>Ver em alta resolução</span>
                      </button>
                    </div>
                  )}

                  <div className="flex items-center justify-between bg-slate-50 p-3 rounded-xl border border-slate-200">
                    <div>
                      <p className="text-[10px] text-slate-400 uppercase font-bold">Status do Patrimônio</p>
                      <div className="mt-1">
                        {getStatusBadge(
                          allLoans.some((l) => l.equipment_id === selectedEquipment.id && l.status === 'em_aberto')
                            ? 'emprestado'
                            : selectedEquipment.status
                        )}
                      </div>
                    </div>

                    {isAdmin && (
                      <div className="flex space-x-1">
                        <button
                          onClick={() => handleStatusChange(selectedEquipment.id, 'ativo')}
                          className="px-2.5 py-1 text-[11px] font-semibold rounded-md bg-emerald-100 text-emerald-800 hover:bg-emerald-200 cursor-pointer"
                        >
                          Ativo
                        </button>
                        <button
                          onClick={() => handleStatusChange(selectedEquipment.id, 'manutencao')}
                          className="px-2.5 py-1 text-[11px] font-semibold rounded-md bg-amber-100 text-amber-800 hover:bg-amber-200 cursor-pointer"
                        >
                          Manutenção
                        </button>
                        <button
                          onClick={() => handleStatusChange(selectedEquipment.id, 'baixado')}
                          className="px-2.5 py-1 text-[11px] font-semibold rounded-md bg-rose-100 text-rose-800 hover:bg-rose-200 cursor-pointer"
                        >
                          Baixar
                        </button>
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                      <p className="text-slate-400 text-[10px] uppercase font-bold">Localização / Sala</p>
                      <p className="font-semibold text-slate-800 mt-0.5">{selectedEquipment.room_location}</p>
                    </div>

                    <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                      <p className="text-slate-400 text-[10px] uppercase font-bold">Observações</p>
                      <p className="font-semibold text-slate-800 mt-0.5">
                        {selectedEquipment.notes || 'Nenhuma observação registrada'}
                      </p>
                    </div>
                  </div>

                  {/* LINKED SERVICE ORDERS */}
                  <div className="space-y-2">
                    <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                      <History className="w-4 h-4 text-red-600" /> Histórico de Manutenções & OS
                    </h4>

                    {serviceOrders.filter((os) => os.equipment_id === selectedEquipment.id).length === 0 ? (
                      <p className="text-xs text-slate-400 italic p-3 bg-slate-50 rounded-lg">
                        Nenhuma Ordem de Serviço vinculada a este equipamento.
                      </p>
                    ) : (
                      serviceOrders
                        .filter((os) => os.equipment_id === selectedEquipment.id)
                        .map((os) => (
                          <div key={os.id} className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-xs">
                            <div className="flex items-center justify-between mb-1">
                              <span className="font-mono font-bold text-slate-700">#{os.id}</span>
                              <span className="text-[10px] bg-slate-200 text-slate-700 px-2 py-0.5 rounded-full">
                                {os.status}
                              </span>
                            </div>
                            <p className="font-bold text-slate-900">{os.title}</p>
                            <p className="text-slate-500 text-[11px] mt-0.5">{os.description}</p>
                          </div>
                        ))
                    )}
                  </div>
                </>
              ) : (
                /* LOANS TAB CONTENT IN MODAL */
                <div className="space-y-5">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900">
                        Histórico de Empréstimos Deste Equipamento
                      </h4>
                      <p className="text-xs text-slate-500">
                        Registro individual de saídas e devoluções.
                      </p>
                    </div>
                  </div>

                  {/* LOAN LIST FOR THIS EQUIPMENT */}
                  {allLoans.filter((l) => l.equipment_id === selectedEquipment.id).length === 0 ? (
                    <div className="text-center py-8 bg-slate-50 border border-slate-200 rounded-xl">
                      <Handshake className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                      <p className="text-xs text-slate-500 font-medium">Nenhum empréstimo registrado para este equipamento.</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {allLoans
                        .filter((l) => l.equipment_id === selectedEquipment.id)
                        .map((loan) => (
                          <div
                            key={loan.id}
                            className={`p-4 rounded-xl border text-xs space-y-3 ${
                              loan.status === 'em_aberto'
                                ? 'bg-purple-50/70 border-purple-200 shadow-xs'
                                : 'bg-slate-50 border-slate-200'
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-slate-900 text-sm">{loan.funcionario_nome}</span>
                                {loan.status === 'em_aberto' ? (
                                  <span className="bg-red-600 text-white font-bold text-[10px] uppercase px-2 py-0.5 rounded-full animate-pulse">
                                    Em Aberto
                                  </span>
                                ) : (
                                  <span className="bg-emerald-100 text-emerald-800 font-bold text-[10px] uppercase px-2 py-0.5 rounded-full">
                                    Concluído
                                  </span>
                                )}
                              </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-white p-3 rounded-lg border border-slate-200/80">
                              <div>
                                <p className="text-[10px] uppercase font-bold text-slate-400">Retirada</p>
                                <p className="text-xs font-medium text-slate-800 mt-0.5">
                                  {new Date(loan.data_retirada).toLocaleString('pt-BR')}
                                </p>
                                {loan.observacao_retirada && (
                                  <p className="text-[11px] text-slate-600 italic mt-1">
                                    Obs: "{loan.observacao_retirada}"
                                  </p>
                                )}
                                {loan.assinatura_retirada_url && (
                                  <div className="mt-2">
                                    <p className="text-[9px] uppercase font-bold text-slate-400">Assinatura Retirada:</p>
                                    <img
                                      src={loan.assinatura_retirada_url}
                                      alt="Assinatura Retirada"
                                      className="h-12 border border-slate-200 rounded-md mt-1 bg-white object-contain"
                                    />
                                  </div>
                                )}
                              </div>

                              <div>
                                <p className="text-[10px] uppercase font-bold text-slate-400">Devolução</p>
                                {loan.data_devolucao ? (
                                  <>
                                    <p className="text-xs font-medium text-slate-800 mt-0.5">
                                      {new Date(loan.data_devolucao).toLocaleString('pt-BR')}
                                    </p>
                                    {loan.observacao_devolucao && (
                                      <p className="text-[11px] text-slate-600 italic mt-1">
                                        Obs: "{loan.observacao_devolucao}"
                                      </p>
                                    )}
                                    {loan.assinatura_devolucao_url && (
                                      <div className="mt-2">
                                        <p className="text-[9px] uppercase font-bold text-slate-400">Assinatura Devolução:</p>
                                        <img
                                          src={loan.assinatura_devolucao_url}
                                          alt="Assinatura Devolução"
                                          className="h-12 border border-slate-200 rounded-md mt-1 bg-white object-contain"
                                        />
                                      </div>
                                    )}
                                  </>
                                ) : (
                                  <p className="text-xs text-amber-700 font-semibold italic mt-1">
                                    Aguardando devolução...
                                  </p>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* LIGHTBOX FOR EXPANDED PRODUCT FOTO */}
      {expandedImage && (
        <div className="fixed inset-0 z-50 bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-4">
          <div className="relative max-w-4xl w-full max-h-[90vh] flex flex-col items-center">
            <button
              onClick={() => setExpandedImage(null)}
              className="absolute -top-10 right-0 p-2 text-white hover:text-red-400 transition-colors cursor-pointer"
            >
              <X className="w-6 h-6" />
            </button>
            <div className="w-full max-h-[80vh] flex items-center justify-center p-2 bg-slate-900 rounded-2xl border border-slate-800 overflow-hidden shadow-2xl">
              <img
                src={expandedImage}
                alt="Foto do Equipamento Ampliada"
                className="max-w-full max-h-[75vh] object-contain rounded-lg"
              />
            </div>
            <p className="text-xs text-slate-300 mt-3 font-medium">Foto original em alta definição</p>
          </div>
        </div>
      )}

      {/* CONFIRM DELETE MODAL */}
      <ConfirmDeleteModal
        isOpen={!!deleteTarget}
        title="Excluir Equipamento"
        description={`Tem certeza que deseja excluir permanentemente o equipamento "${deleteTarget?.name}" (Patrimônio: ${deleteTarget?.asset_number})? Esta ação não pode ser desfeita.`}
        onConfirm={confirmDeleteEquipment}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
};
