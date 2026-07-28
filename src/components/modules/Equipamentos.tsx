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
  Trash2
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

  const [equipmentList, setEquipmentList] = useState<Equipment[]>([]);
  const [serviceOrders, setServiceOrders] = useState<ServiceOrder[]>([]);
  const [allLoans, setAllLoans] = useState<EquipmentLoan[]>([]);
  const [profiles, setProfiles] = useState<UserProfile[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string>('todos');

  // Modal States
  const [isNewModalOpen, setIsNewModalOpen] = useState(false);
  const [selectedEquipment, setSelectedEquipment] = useState<Equipment | null>(null);
  const [activeDetailTab, setActiveDetailTab] = useState<'detalhes' | 'emprestimos'>('detalhes');

  // Loan Sub-modals
  const [isLoanModalOpen, setIsLoanModalOpen] = useState(false);
  const [isReturnModalOpen, setIsReturnModalOpen] = useState(false);
  const [activeLoanToReturn, setActiveLoanToReturn] = useState<EquipmentLoan | null>(null);

  // Delete Confirm State
  const [deleteTarget, setDeleteTarget] = useState<Equipment | null>(null);

  // QR / Asset Code Reader Simulator
  const [qrInput, setQrInput] = useState('');

  // New Equipment Form State
  const [name, setName] = useState('');
  const [type, setType] = useState('Multimídia');
  const [assetNumber, setAssetNumber] = useState('');
  const [roomLocation, setRoomLocation] = useState('');
  const [acquisitionDate, setAcquisitionDate] = useState('');
  const [status, setStatus] = useState<EquipmentStatus>('ativo');
  const [notes, setNotes] = useState('');
  const [fotoUrl, setFotoUrl] = useState('');

  // Loan Form State
  const [loanFuncionarioNome, setLoanFuncionarioNome] = useState('');
  const [loanFuncionarioId, setLoanFuncionarioId] = useState('');
  const [loanDataRetirada, setLoanDataRetirada] = useState('');
  const [loanObservacao, setLoanObservacao] = useState('');
  const [loanAssinaturaUrl, setLoanAssinaturaUrl] = useState('');

  // Return Form State
  const [returnDataDevolucao, setReturnDataDevolucao] = useState('');
  const [returnObservacao, setReturnObservacao] = useState('');
  const [returnAssinaturaUrl, setReturnAssinaturaUrl] = useState('');

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

  const handleCreateEquipment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !assetNumber.trim()) return;

    await storage.addEquipment(
      {
        name,
        type,
        asset_number: assetNumber,
        room_location: roomLocation,
        acquisition_date: acquisitionDate || new Date().toISOString().split('T')[0],
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
    setNotes('');
    setFotoUrl('');
  };

  const handleStatusChange = async (eqId: string, newStatus: EquipmentStatus) => {
    await storage.updateEquipmentStatus(eqId, newStatus, currentUser);
    if (selectedEquipment && selectedEquipment.id === eqId) {
      setSelectedEquipment({ ...selectedEquipment, status: newStatus });
    }
  };

  // Open Loan Registration Modal
  const handleOpenLoanModal = () => {
    setLoanFuncionarioNome('');
    setLoanFuncionarioId('');
    setLoanDataRetirada(new Date().toISOString().slice(0, 16));
    setLoanObservacao('');
    setLoanAssinaturaUrl('');
    setIsLoanModalOpen(true);
  };

  const handleCreateLoan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEquipment || !loanFuncionarioNome.trim()) return;

    await storage.addEquipmentLoan(
      {
        equipment_id: selectedEquipment.id,
        equipment_name: selectedEquipment.name,
        funcionario_id: loanFuncionarioId || undefined,
        funcionario_nome: loanFuncionarioNome,
        data_retirada: loanDataRetirada || new Date().toISOString(),
        observacao_retirada: loanObservacao || undefined,
        assinatura_retirada_url: loanAssinaturaUrl || undefined
      },
      currentUser
    );

    setIsLoanModalOpen(false);
    loadData();
    // Update local selected equipment status to emprestado
    setSelectedEquipment({ ...selectedEquipment, status: 'emprestado' });
  };

  // Open Return Registration Modal
  const handleOpenReturnModal = (loan: EquipmentLoan) => {
    setActiveLoanToReturn(loan);
    setReturnDataDevolucao(new Date().toISOString().slice(0, 16));
    setReturnObservacao('');
    setReturnAssinaturaUrl('');
    setIsReturnModalOpen(true);
  };

  const handleCreateReturn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeLoanToReturn || !selectedEquipment) return;

    await storage.returnEquipmentLoan(
      activeLoanToReturn.id,
      returnDataDevolucao || new Date().toISOString(),
      returnObservacao || undefined,
      returnAssinaturaUrl || undefined,
      currentUser
    );

    setIsReturnModalOpen(false);
    setActiveLoanToReturn(null);
    loadData();
    // Update local selected equipment status back to ativo
    setSelectedEquipment({ ...selectedEquipment, status: 'ativo' });
  };

  const openLoans = allLoans.filter((l) => l.status === 'em_aberto');

  const filteredList = equipmentList.filter((e) => {
    const matchesSearch =
      e.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      e.asset_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
      e.room_location.toLowerCase().includes(searchQuery.toLowerCase());

    if (selectedStatus === 'em_aberto_emprestimos') {
      return matchesSearch && e.status === 'emprestado';
    }

    const matchesStatus = selectedStatus === 'todos' || e.status === selectedStatus;
    const matchesQr = !qrInput || e.asset_number.toLowerCase().includes(qrInput.toLowerCase());
    return matchesSearch && matchesStatus && matchesQr;
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

  const handleDeleteEquipment = (eq: Equipment, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setDeleteTarget(eq);
  };

  const confirmDeleteEquipment = async () => {
    if (!deleteTarget) return;
    await storage.deleteEquipment(deleteTarget.id, currentUser);
    if (selectedEquipment?.id === deleteTarget.id) {
      setSelectedEquipment(null);
    }
    setDeleteTarget(null);
    loadData();
  };

  return (
    <div className="space-y-6 pb-20 lg:pb-8">
      {/* Title Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <Monitor className="w-6 h-6 text-[#D32F2F]" />
            <h2 className="text-2xl font-serif-editorial font-bold text-gray-900">Gestão de Equipamentos</h2>
          </div>
          <p className="text-xs text-gray-500 mt-1">
            Controle de patrimônio, computadores, projetores e som do Colégio Reação
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => exportEquipmentsPDF(filteredList)}
            className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 bg-slate-800 text-white font-bold text-xs rounded-xl hover:bg-slate-900 shadow-sm transition-colors"
            title="Baixar Inventário Completo de Equipamentos com Fotos em PDF"
          >
            <FileDown className="w-4 h-4 text-emerald-400" />
            <span>PDF Patrimônios</span>
          </button>

          <button
            onClick={() => exportLoansPDF(allLoans)}
            className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 bg-slate-800 text-white font-bold text-xs rounded-xl hover:bg-slate-900 shadow-sm transition-colors"
            title="Baixar Relatório de Empréstimos e Devoluções em PDF"
          >
            <FileDown className="w-4 h-4 text-purple-400" />
            <span>PDF Empréstimos</span>
          </button>

          <button
            onClick={() => setIsNewModalOpen(true)}
            className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-[#D32F2F] text-white font-bold text-xs uppercase tracking-wider rounded-xl hover:bg-red-800 shadow-sm transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Cadastrar</span>
          </button>
        </div>
      </div>

      {/* Open Loans Banner */}
      {openLoans.length > 0 && (
        <div className="p-4 bg-purple-50 border border-purple-200 rounded-xl flex items-start space-x-3 text-purple-900 shadow-xs">
          <Handshake className="w-5 h-5 text-purple-600 shrink-0 mt-0.5" />
          <div className="flex-1">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold uppercase tracking-wider">
                Empréstimos em Aberto ({openLoans.length})
              </h4>
              <button
                onClick={() => setSelectedStatus('em_aberto_emprestimos')}
                className="text-[11px] font-bold text-purple-700 hover:underline"
              >
                Ver Todos →
              </button>
            </div>
            <p className="text-xs mt-1 text-purple-800 leading-relaxed">
              Há {openLoans.length} equipamento(s) atualmente em posse de funcionários.
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
          Total: {filteredList.length} itens
        </div>
      </div>

      {/* Equipment List Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredList.map((eq) => {
          const linkedOSCount = serviceOrders.filter((os) => os.equipment_id === eq.id).length;
          const currentOpenLoan = allLoans.find((l) => l.equipment_id === eq.id && l.status === 'em_aberto');

          return (
            <div
              key={eq.id}
              onClick={() => {
                setSelectedEquipment(eq);
                setActiveDetailTab('detalhes');
              }}
              className="bg-white rounded-xl border border-slate-200 shadow-xs hover:shadow-md transition-all overflow-hidden cursor-pointer flex flex-col justify-between group"
            >
              {eq.foto_url && (
                <div className="h-36 w-full bg-slate-100 overflow-hidden relative">
                  <img
                    src={eq.foto_url}
                    alt={eq.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  <div className="absolute top-2 right-2">
                    {getStatusBadge(eq.status)}
                  </div>
                </div>
              )}

              <div className="p-4">
                {!eq.foto_url && (
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-mono text-xs font-bold text-red-600 bg-red-50 px-2 py-0.5 rounded-md border border-red-100">
                      {eq.asset_number}
                    </span>
                    {getStatusBadge(eq.status)}
                  </div>
                )}

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
                  <div className="mt-2.5 p-2 bg-purple-50 border border-purple-200 rounded-lg text-xs text-purple-900 flex items-center justify-between">
                    <span className="flex items-center gap-1 font-semibold">
                      <User className="w-3.5 h-3.5 text-purple-600" />
                      {currentOpenLoan.funcionario_nome}
                    </span>
                    <span className="text-[10px] bg-purple-200 text-purple-800 font-bold px-1.5 py-0.5 rounded-md">
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
                    <span>Aquisição: {eq.acquisition_date ? new Date(eq.acquisition_date).toLocaleDateString('pt-BR') : 'Não informada'}</span>
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
                    onClick={(e) => handleDeleteEquipment(eq, e)}
                    className="p-1 text-slate-400 hover:text-rose-600 rounded-md hover:bg-rose-50 transition-colors"
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

      {/* NEW EQUIPMENT MODAL */}
      {isNewModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
            <div className="px-6 py-4 bg-[#D32F2F] text-white flex items-center justify-between">
              <h3 className="text-sm font-bold flex items-center gap-2">
                <Monitor className="w-4 h-4" /> Cadastrar Novo Equipamento
              </h3>
              <button onClick={() => setIsNewModalOpen(false)} className="text-white hover:opacity-80">
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
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Data de Aquisição</label>
                <input
                  type="date"
                  required
                  value={acquisitionDate}
                  onChange={(e) => setAcquisitionDate(e.target.value)}
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
                  className="px-4 py-2 border border-slate-300 text-slate-700 text-xs font-semibold rounded-lg hover:bg-slate-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-[#D32F2F] text-white text-xs font-bold uppercase tracking-wider rounded-lg hover:bg-red-800 shadow-sm"
                >
                  Cadastrar Patrimônio
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EQUIPMENT DETAIL & LOANS MODAL */}
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
                  onClick={(e) => handleDeleteEquipment(selectedEquipment, e)}
                  className="p-1.5 bg-rose-600/20 hover:bg-rose-600 text-rose-300 hover:text-white rounded-lg transition-colors flex items-center gap-1 text-xs font-semibold px-2.5"
                  title="Excluir Equipamento"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Excluir</span>
                </button>
                <button onClick={() => setSelectedEquipment(null)} className="text-slate-400 hover:text-white">
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* TAB NAVIGATION */}
            <div className="flex border-b border-slate-200 bg-slate-50 px-6 pt-2 gap-4 text-xs font-bold">
              <button
                onClick={() => setActiveDetailTab('detalhes')}
                className={`py-2.5 border-b-2 transition-colors ${
                  activeDetailTab === 'detalhes'
                    ? 'border-red-600 text-red-600'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                Detalhes & OS
              </button>
              <button
                onClick={() => setActiveDetailTab('emprestimos')}
                className={`py-2.5 border-b-2 transition-colors flex items-center gap-1.5 ${
                  activeDetailTab === 'emprestimos'
                    ? 'border-red-600 text-red-600'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                <Handshake className="w-3.5 h-3.5" />
                <span>Empréstimos</span>
                {allLoans.filter((l) => l.equipment_id === selectedEquipment.id && l.status === 'em_aberto').length > 0 && (
                  <span className="w-2 h-2 rounded-full bg-purple-600 animate-pulse" />
                )}
              </button>
            </div>

            <div className="p-6 space-y-5 overflow-y-auto flex-1">
              {activeDetailTab === 'detalhes' ? (
                <>
                  {selectedEquipment.foto_url && (
                    <div className="w-full h-56 rounded-xl overflow-hidden bg-slate-900 border border-slate-200 shadow-xs">
                      <img
                        src={selectedEquipment.foto_url}
                        alt={selectedEquipment.name}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  )}

                  <div className="flex items-center justify-between bg-slate-50 p-3 rounded-xl border border-slate-200">
                    <div>
                      <p className="text-[10px] text-slate-400 uppercase font-bold">Status do Patrimônio</p>
                      <div className="mt-1">{getStatusBadge(selectedEquipment.status)}</div>
                    </div>

                    {isAdmin && (
                      <div className="flex space-x-1">
                        <button
                          onClick={() => handleStatusChange(selectedEquipment.id, 'ativo')}
                          className="px-2.5 py-1 text-[11px] font-semibold rounded-md bg-emerald-100 text-emerald-800 hover:bg-emerald-200"
                        >
                          Ativo
                        </button>
                        <button
                          onClick={() => handleStatusChange(selectedEquipment.id, 'manutencao')}
                          className="px-2.5 py-1 text-[11px] font-semibold rounded-md bg-amber-100 text-amber-800 hover:bg-amber-200"
                        >
                          Manutenção
                        </button>
                        <button
                          onClick={() => handleStatusChange(selectedEquipment.id, 'baixado')}
                          className="px-2.5 py-1 text-[11px] font-semibold rounded-md bg-rose-100 text-rose-800 hover:bg-rose-200"
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
                /* LOANS TAB CONTENT */
                <div className="space-y-5">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900">
                        Histórico de Empréstimos & Retiradas
                      </h4>
                      <p className="text-xs text-slate-500">
                        Controle de quem retirou este item, assinaturas digitais e devoluções.
                      </p>
                    </div>

                    {selectedEquipment.status !== 'emprestado' ? (
                      <button
                        onClick={handleOpenLoanModal}
                        className="inline-flex items-center gap-1.5 px-3 py-2 bg-purple-700 hover:bg-purple-800 text-white font-bold text-xs rounded-xl shadow-xs transition-colors"
                      >
                        <Handshake className="w-4 h-4" />
                        <span>Novo Empréstimo</span>
                      </button>
                    ) : (
                      <span className="text-xs font-bold text-purple-700 bg-purple-50 px-3 py-1.5 rounded-xl border border-purple-200">
                        Equipamento Emprestado
                      </span>
                    )}
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

                              {loan.status === 'em_aberto' && (
                                <button
                                  onClick={() => handleOpenReturnModal(loan)}
                                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-lg shadow-xs transition-colors"
                                >
                                  <UserCheck className="w-3.5 h-3.5" />
                                  <span>Registrar Devolução</span>
                                </button>
                              )}
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-white p-3 rounded-lg border border-slate-200/80">
                              {/* Withdrawal info */}
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

                              {/* Return info */}
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

      {/* REGISTER NEW LOAN MODAL */}
      {isLoanModalOpen && selectedEquipment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
            <div className="px-6 py-4 bg-purple-800 text-white flex items-center justify-between">
              <h3 className="text-sm font-bold flex items-center gap-2">
                <Handshake className="w-4 h-4" /> Registrar Retirada / Empréstimo
              </h3>
              <button onClick={() => setIsLoanModalOpen(false)} className="text-white hover:opacity-80">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateLoan} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
              <div className="p-3 bg-purple-50 rounded-xl border border-purple-200 text-xs text-purple-900">
                <p className="font-bold">{selectedEquipment.name}</p>
                <p className="text-[11px] font-mono text-purple-700">Patrimônio: {selectedEquipment.asset_number}</p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Funcionário Responsável pela Retirada <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  list="profiles-list"
                  value={loanFuncionarioNome}
                  onChange={(e) => {
                    setLoanFuncionarioNome(e.target.value);
                    const found = profiles.find((p) => p.full_name.toLowerCase() === e.target.value.toLowerCase());
                    if (found) setLoanFuncionarioId(found.id);
                  }}
                  placeholder="Digite ou selecione o nome do funcionário..."
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-purple-600"
                />
                <datalist id="profiles-list">
                  {profiles.map((p) => (
                    <option key={p.id} value={p.full_name}>
                      {p.department}
                    </option>
                  ))}
                </datalist>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Data e Hora da Retirada</label>
                <input
                  type="datetime-local"
                  required
                  value={loanDataRetirada}
                  onChange={(e) => setLoanDataRetirada(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-purple-600"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Observação da Retirada</label>
                <textarea
                  rows={2}
                  value={loanObservacao}
                  onChange={(e) => setLoanObservacao(e.target.value)}
                  placeholder="Ex: Para uso na Sala 4 durante a feira de ciências..."
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-purple-600"
                />
              </div>

              {/* Digital Signature Canvas */}
              <SignatureCanvas
                label="Assinatura Digital de Retirada"
                onSaveSignature={(dataUrl) => setLoanAssinaturaUrl(dataUrl)}
              />

              <div className="pt-3 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setIsLoanModalOpen(false)}
                  className="px-4 py-2 border border-slate-300 text-slate-700 text-xs font-semibold rounded-lg hover:bg-slate-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-purple-700 text-white text-xs font-bold uppercase tracking-wider rounded-lg hover:bg-purple-800 shadow-sm"
                >
                  Confirmar Retirada
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* REGISTER RETURN MODAL */}
      {isReturnModalOpen && activeLoanToReturn && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
            <div className="px-6 py-4 bg-emerald-700 text-white flex items-center justify-between">
              <h3 className="text-sm font-bold flex items-center gap-2">
                <UserCheck className="w-4 h-4" /> Registrar Devolução de Equipamento
              </h3>
              <button onClick={() => setIsReturnModalOpen(false)} className="text-white hover:opacity-80">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateReturn} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
              <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 text-xs text-emerald-900">
                <p className="font-bold">Retirado por: {activeLoanToReturn.funcionario_nome}</p>
                <p className="text-[11px] text-emerald-700">
                  Data de retirada: {new Date(activeLoanToReturn.data_retirada).toLocaleString('pt-BR')}
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Data e Hora da Devolução</label>
                <input
                  type="datetime-local"
                  required
                  value={returnDataDevolucao}
                  onChange={(e) => setReturnDataDevolucao(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-600"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Observação da Devolução</label>
                <textarea
                  rows={2}
                  value={returnObservacao}
                  onChange={(e) => setReturnObservacao(e.target.value)}
                  placeholder="Ex: Devolvido em perfeito estado, testado e guardado..."
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-600"
                />
              </div>

              {/* Digital Signature Canvas for Return */}
              <SignatureCanvas
                label="Assinatura Digital de Devolução"
                onSaveSignature={(dataUrl) => setReturnAssinaturaUrl(dataUrl)}
              />

              <div className="pt-3 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setIsReturnModalOpen(false)}
                  className="px-4 py-2 border border-slate-300 text-slate-700 text-xs font-semibold rounded-lg hover:bg-slate-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-600 text-white text-xs font-bold uppercase tracking-wider rounded-lg hover:bg-emerald-700 shadow-sm"
                >
                  Confirmar Devolução
                </button>
              </div>
            </form>
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
