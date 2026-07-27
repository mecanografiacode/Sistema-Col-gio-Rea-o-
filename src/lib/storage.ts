import {
  UserProfile,
  ServiceOrder,
  Equipment,
  EquipmentLoan,
  MaterialRequest,
  MarketingContent,
  MarketingMetric,
  TechTicket,
  FaqItem,
  AuditLog,
  AppNotification,
  AuditAction,
  AuditModule,
  OSStatus,
  MaterialRequestStatus,
  MarketingStatus,
  TicketStatus,
  UserRole
} from '../types';
import {
  INITIAL_PROFILES,
  INITIAL_EQUIPMENT,
  INITIAL_EQUIPMENT_LOANS,
  INITIAL_SERVICE_ORDERS,
  INITIAL_MATERIAL_REQUESTS,
  INITIAL_MARKETING_CONTENT,
  INITIAL_MARKETING_METRICS,
  INITIAL_TECH_TICKETS,
  INITIAL_FAQ_ITEMS,
  INITIAL_AUDIT_LOGS,
  INITIAL_NOTIFICATIONS
} from './mockData';
import { getSupabaseClient } from './supabase';

class StorageService {
  private listeners: Set<() => void> = new Set();

  constructor() {
    this.initLocalStorage();
  }

  private initLocalStorage() {
    // Clear old mock data if present
    if (!localStorage.getItem('cr_v3_clean')) {
      localStorage.removeItem('cr_profiles');
      localStorage.removeItem('cr_equipment');
      localStorage.removeItem('cr_equipment_loans');
      localStorage.removeItem('cr_service_orders');
      localStorage.removeItem('cr_material_requests');
      localStorage.removeItem('cr_marketing');
      localStorage.removeItem('cr_marketing_metrics');
      localStorage.removeItem('cr_tech_tickets');
      localStorage.removeItem('cr_faq');
      localStorage.removeItem('cr_audit_logs');
      localStorage.removeItem('cr_notifications');
      localStorage.setItem('cr_v3_clean', 'true');
    }

    if (!localStorage.getItem('cr_profiles')) {
      localStorage.setItem('cr_profiles', JSON.stringify(INITIAL_PROFILES));
    }
    if (!localStorage.getItem('cr_equipment')) {
      localStorage.setItem('cr_equipment', JSON.stringify(INITIAL_EQUIPMENT));
    }
    if (!localStorage.getItem('cr_equipment_loans')) {
      localStorage.setItem('cr_equipment_loans', JSON.stringify(INITIAL_EQUIPMENT_LOANS));
    }
    if (!localStorage.getItem('cr_service_orders')) {
      localStorage.setItem('cr_service_orders', JSON.stringify(INITIAL_SERVICE_ORDERS));
    }
    if (!localStorage.getItem('cr_material_requests')) {
      localStorage.setItem('cr_material_requests', JSON.stringify(INITIAL_MATERIAL_REQUESTS));
    }
    if (!localStorage.getItem('cr_marketing')) {
      localStorage.setItem('cr_marketing', JSON.stringify(INITIAL_MARKETING_CONTENT));
    }
    if (!localStorage.getItem('cr_marketing_metrics')) {
      localStorage.setItem('cr_marketing_metrics', JSON.stringify(INITIAL_MARKETING_METRICS));
    }
    if (!localStorage.getItem('cr_tech_tickets')) {
      localStorage.setItem('cr_tech_tickets', JSON.stringify(INITIAL_TECH_TICKETS));
    }
    if (!localStorage.getItem('cr_faq')) {
      localStorage.setItem('cr_faq', JSON.stringify(INITIAL_FAQ_ITEMS));
    }
    if (!localStorage.getItem('cr_audit_logs')) {
      localStorage.setItem('cr_audit_logs', JSON.stringify(INITIAL_AUDIT_LOGS));
    }
    if (!localStorage.getItem('cr_notifications')) {
      localStorage.setItem('cr_notifications', JSON.stringify(INITIAL_NOTIFICATIONS));
    }
  }

  public subscribe(listener: () => void) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify() {
    this.listeners.forEach((l) => l());
  }

  // --- STORAGE UPLOAD HELPER ---
  public async uploadFile(file: File | Blob, bucket: string = 'anexos', customName?: string): Promise<string> {
    const supabase = getSupabaseClient();
    const fileName = customName || `${Date.now()}-${Math.random().toString(36).substring(2, 8)}.png`;

    if (supabase) {
      try {
        const { data, error } = await supabase.storage.from(bucket).upload(fileName, file, {
          upsert: true
        });
        if (!error && data) {
          const { data: publicData } = supabase.storage.from(bucket).getPublicUrl(fileName);
          if (publicData?.publicUrl) return publicData.publicUrl;
        }
      } catch (err) {
        console.warn('Supabase storage upload error, falling back to base64 Data URL:', err);
      }
    }

    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.readAsDataURL(file);
    });
  }

  // --- AUDIT LOG HELPER ---
  public async logAudit(
    currentUser: UserProfile | null,
    action: AuditAction,
    module: AuditModule,
    targetRecord: string,
    oldValue?: string,
    newValue?: string
  ) {
    const newLog: AuditLog = {
      id: `log-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      user_id: currentUser?.id || 'sys-anon',
      user_name: currentUser?.full_name || 'Sistema / Convidado',
      user_email: currentUser?.email || 'sistema@colegioreacaodf.com',
      action,
      module,
      target_record: targetRecord,
      old_value: oldValue,
      new_value: newValue,
      ip_address: '187.52.190.' + Math.floor(Math.random() * 200 + 10),
      created_at: new Date().toISOString()
    };

    const supabase = getSupabaseClient();
    if (supabase) {
      try {
        await supabase.from('audit_logs').insert([newLog]);
      } catch (err) {
        console.warn('Supabase audit log insert fallback:', err);
      }
    }

    const logs = this.getItem<AuditLog>('cr_audit_logs');
    logs.unshift(newLog);
    this.setItem('cr_audit_logs', logs);
  }

  // --- LOCAL STORAGE HELPERS ---
  private getItem<T>(key: string): T[] {
    try {
      const data = localStorage.getItem(key);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  }

  private setItem<T>(key: string, data: T[]) {
    localStorage.setItem(key, JSON.stringify(data));
    this.notify();
  }

  // --- PROFILES & USERS ---
  public async getProfiles(): Promise<UserProfile[]> {
    const supabase = getSupabaseClient();
    if (supabase) {
      const { data, error } = await supabase.from('profiles').select('*');
      if (!error && data && data.length > 0) return data as UserProfile[];
    }
    return this.getItem<UserProfile>('cr_profiles');
  }

  public async addProfile(profile: Omit<UserProfile, 'id' | 'created_at'>, actor: UserProfile | null): Promise<UserProfile> {
    const newProfile: UserProfile = {
      ...profile,
      id: `user-${Date.now()}`,
      created_at: new Date().toISOString()
    };

    const supabase = getSupabaseClient();
    if (supabase) {
      try {
        await supabase.from('profiles').insert([newProfile]);
      } catch (e) {
        console.warn('Supabase profile add error:', e);
      }
    }

    const profiles = this.getItem<UserProfile>('cr_profiles');
    profiles.push(newProfile);
    this.setItem('cr_profiles', profiles);

    await this.logAudit(actor, 'criacao', 'usuarios', `Novo Usuário: ${newProfile.full_name}`, undefined, `Role: ${newProfile.role}`);
    return newProfile;
  }

  public async updateProfileRole(userId: string, newRole: UserRole, actor: UserProfile | null) {
    const profiles = this.getItem<UserProfile>('cr_profiles');
    const index = profiles.findIndex((p) => p.id === userId);
    if (index !== -1) {
      const oldRole = profiles[index].role;
      profiles[index].role = newRole;
      this.setItem('cr_profiles', profiles);

      const supabase = getSupabaseClient();
      if (supabase) {
        await supabase.from('profiles').update({ role: newRole }).eq('id', userId);
      }

      await this.logAudit(
        actor,
        'mudanca_role',
        'usuarios',
        `Usuário ID: ${userId} (${profiles[index].full_name})`,
        `Role: ${oldRole}`,
        `Role: ${newRole}`
      );
    }
  }

  public async toggleProfileActive(userId: string, actor: UserProfile | null) {
    const profiles = this.getItem<UserProfile>('cr_profiles');
    const index = profiles.findIndex((p) => p.id === userId);
    if (index !== -1) {
      const oldVal = profiles[index].is_active;
      profiles[index].is_active = !oldVal;
      this.setItem('cr_profiles', profiles);

      const supabase = getSupabaseClient();
      if (supabase) {
        await supabase.from('profiles').update({ is_active: !oldVal }).eq('id', userId);
      }

      await this.logAudit(
        actor,
        'edicao',
        'usuarios',
        `Status Usuário: ${profiles[index].full_name}`,
        `Ativo: ${oldVal}`,
        `Ativo: ${!oldVal}`
      );
    }
  }

  // --- SERVICE ORDERS ---
  public async getServiceOrders(): Promise<ServiceOrder[]> {
    const supabase = getSupabaseClient();
    if (supabase) {
      const { data, error } = await supabase.from('service_orders').select('*').order('created_at', { ascending: false });
      if (!error && data && data.length > 0) return data as ServiceOrder[];
    }
    return this.getItem<ServiceOrder>('cr_service_orders');
  }

  public async addServiceOrder(
    so: Omit<ServiceOrder, 'id' | 'created_at' | 'updated_at' | 'comments'>,
    actor: UserProfile | null
  ): Promise<ServiceOrder> {
    const newSO: ServiceOrder = {
      ...so,
      id: `os-${Date.now().toString().slice(-4)}`,
      comments: [],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    const supabase = getSupabaseClient();
    if (supabase) {
      try {
        await supabase.from('service_orders').insert([newSO]);
      } catch (e) {
        console.warn('Supabase OS insert error:', e);
      }
    }

    const items = this.getItem<ServiceOrder>('cr_service_orders');
    items.unshift(newSO);
    this.setItem('cr_service_orders', items);

    await this.logAudit(actor, 'criacao', 'ordens_servico', `OS: ${newSO.title}`, undefined, `Status: ${newSO.status}, Setor: ${newSO.sector}`);
    return newSO;
  }

  public async updateServiceOrderStatus(soId: string, status: OSStatus, actor: UserProfile | null) {
    const items = this.getItem<ServiceOrder>('cr_service_orders');
    const idx = items.findIndex((i) => i.id === soId);
    if (idx !== -1) {
      const oldStatus = items[idx].status;
      items[idx].status = status;
      items[idx].updated_at = new Date().toISOString();
      this.setItem('cr_service_orders', items);

      const supabase = getSupabaseClient();
      if (supabase) {
        await supabase.from('service_orders').update({ status, updated_at: items[idx].updated_at }).eq('id', soId);
      }

      await this.logAudit(
        actor,
        'mudanca_status',
        'ordens_servico',
        `OS ID ${soId} (${items[idx].title})`,
        `Status: ${oldStatus}`,
        `Status: ${status}`
      );
    }
  }

  public async assignServiceOrder(soId: string, assignedToId: string, assignedToName: string, actor: UserProfile | null) {
    const items = this.getItem<ServiceOrder>('cr_service_orders');
    const idx = items.findIndex((i) => i.id === soId);
    if (idx !== -1) {
      const oldAssigned = items[idx].assigned_to_name || 'Ninguém';
      items[idx].assigned_to = assignedToId;
      items[idx].assigned_to_name = assignedToName;
      items[idx].updated_at = new Date().toISOString();
      this.setItem('cr_service_orders', items);

      const supabase = getSupabaseClient();
      if (supabase) {
        await supabase.from('service_orders').update({ assigned_to: assignedToId, updated_at: items[idx].updated_at }).eq('id', soId);
      }

      await this.logAudit(
        actor,
        'edicao',
        'ordens_servico',
        `OS ID ${soId} - Responsável`,
        `Anterior: ${oldAssigned}`,
        `Novo: ${assignedToName}`
      );
    }
  }

  public async addOSComment(soId: string, commentText: string, actor: UserProfile | null) {
    const items = this.getItem<ServiceOrder>('cr_service_orders');
    const idx = items.findIndex((i) => i.id === soId);
    if (idx !== -1) {
      const newComment = {
        id: `c-${Date.now()}`,
        user_name: actor?.full_name || 'Usuário',
        user_avatar: actor?.avatar_url,
        comment: commentText,
        created_at: new Date().toISOString()
      };
      items[idx].comments.push(newComment);
      items[idx].updated_at = new Date().toISOString();
      this.setItem('cr_service_orders', items);

      const supabase = getSupabaseClient();
      if (supabase) {
        await supabase.from('service_orders').update({ comments: items[idx].comments, updated_at: items[idx].updated_at }).eq('id', soId);
      }
    }
  }

  public async concludeServiceOrder(
    soId: string,
    concludedNotes: string,
    fotoConclusaoUrl: string | undefined,
    concludedAt: string | undefined,
    actor: UserProfile | null
  ) {
    const items = this.getItem<ServiceOrder>('cr_service_orders');
    const idx = items.findIndex((i) => i.id === soId);
    if (idx !== -1) {
      const oldStatus = items[idx].status;
      items[idx].status = 'concluida';
      items[idx].concluded_notes = concludedNotes;
      if (fotoConclusaoUrl) items[idx].foto_conclusao_url = fotoConclusaoUrl;
      items[idx].concluded_at = concludedAt || new Date().toISOString();
      items[idx].updated_at = new Date().toISOString();
      this.setItem('cr_service_orders', items);

      const supabase = getSupabaseClient();
      if (supabase) {
        await supabase
          .from('service_orders')
          .update({
            status: 'concluida',
            concluded_notes: concludedNotes,
            foto_conclusao_url: fotoConclusaoUrl,
            concluded_at: items[idx].concluded_at,
            updated_at: items[idx].updated_at
          })
          .eq('id', soId);
      }

      await this.logAudit(
        actor,
        'mudanca_status',
        'ordens_servico',
        `OS ID ${soId} (${items[idx].title}) Concluída`,
        `Status: ${oldStatus}`,
        `Status: concluida (Obs: ${concludedNotes || 'Nenhuma'})`
      );
    }
  }

  public async deleteServiceOrder(soId: string, actor: UserProfile | null) {
    const items = this.getItem<ServiceOrder>('cr_service_orders');
    const target = items.find((i) => i.id === soId);
    if (target) {
      const filtered = items.filter((i) => i.id !== soId);
      this.setItem('cr_service_orders', filtered);

      const supabase = getSupabaseClient();
      if (supabase) {
        await supabase.from('service_orders').delete().eq('id', soId);
      }

      await this.logAudit(actor, 'exclusao', 'ordens_servico', `OS Excluída: ID ${soId} (${target.title})`, `Setor: ${target.sector}`, undefined);
    }
  }

  // --- EQUIPMENT ---
  public async getEquipment(): Promise<Equipment[]> {
    const supabase = getSupabaseClient();
    if (supabase) {
      const { data, error } = await supabase.from('equipments').select('*').order('created_at', { ascending: false });
      if (!error && data && data.length > 0) return data as Equipment[];
    }
    return this.getItem<Equipment>('cr_equipment');
  }

  public async addEquipment(eq: Omit<Equipment, 'id' | 'created_at'>, actor: UserProfile | null): Promise<Equipment> {
    const newEq: Equipment = {
      ...eq,
      id: `eq-${Date.now().toString().slice(-4)}`,
      created_at: new Date().toISOString()
    };

    const supabase = getSupabaseClient();
    if (supabase) {
      try {
        await supabase.from('equipments').insert([newEq]);
      } catch (e) {
        console.warn('Supabase equipment insert error:', e);
      }
    }

    const items = this.getItem<Equipment>('cr_equipment');
    items.unshift(newEq);
    this.setItem('cr_equipment', items);

    await this.logAudit(actor, 'criacao', 'equipamentos', `Equipamento: ${newEq.name} (${newEq.asset_number})`, undefined, `Status: ${newEq.status}`);
    return newEq;
  }

  public async updateEquipment(eqId: string, updatedFields: Partial<Equipment>, actor: UserProfile | null) {
    const items = this.getItem<Equipment>('cr_equipment');
    const idx = items.findIndex((i) => i.id === eqId);
    if (idx !== -1) {
      items[idx] = { ...items[idx], ...updatedFields };
      this.setItem('cr_equipment', items);

      const supabase = getSupabaseClient();
      if (supabase) {
        await supabase.from('equipments').update(updatedFields).eq('id', eqId);
      }

      await this.logAudit(actor, 'edicao', 'equipamentos', `Equipamento ID ${eqId} (${items[idx].name})`, undefined, 'Atualizado');
    }
  }

  public async deleteEquipment(eqId: string, actor: UserProfile | null) {
    const items = this.getItem<Equipment>('cr_equipment');
    const target = items.find((i) => i.id === eqId);
    if (target) {
      const filtered = items.filter((i) => i.id !== eqId);
      this.setItem('cr_equipment', filtered);

      // Clean up associated loans for this deleted equipment
      const loans = this.getItem<EquipmentLoan>('cr_equipment_loans');
      const filteredLoans = loans.filter((l) => l.equipment_id !== eqId);
      this.setItem('cr_equipment_loans', filteredLoans);

      const supabase = getSupabaseClient();
      if (supabase) {
        await supabase.from('equipments').delete().eq('id', eqId);
        await supabase.from('emprestimos_equipamentos').delete().eq('equipment_id', eqId);
      }

      await this.logAudit(actor, 'exclusao', 'equipamentos', `Equipamento Excluído: ${target.name} (${target.asset_number})`, `Patrimônio: ${target.asset_number}`, undefined);
    }
  }

  public async updateEquipmentStatus(eqId: string, status: Equipment['status'], actor: UserProfile | null) {
    const items = this.getItem<Equipment>('cr_equipment');
    const idx = items.findIndex((i) => i.id === eqId);
    if (idx !== -1) {
      const oldStatus = items[idx].status;
      items[idx].status = status;
      this.setItem('cr_equipment', items);

      const supabase = getSupabaseClient();
      if (supabase) {
        await supabase.from('equipments').update({ status }).eq('id', eqId);
      }

      await this.logAudit(actor, 'mudanca_status', 'equipamentos', `Equipamento ${items[idx].name}`, `Anterior: ${oldStatus}`, `Novo: ${status}`);
    }
  }

  // --- EQUIPMENT LOANS ---
  public async getEquipmentLoans(equipmentId?: string): Promise<EquipmentLoan[]> {
    const equipments = this.getItem<Equipment>('cr_equipment');
    const existingEqIds = new Set(equipments.map((e) => e.id));

    const supabase = getSupabaseClient();
    if (supabase) {
      let query = supabase.from('emprestimos_equipamentos').select('*').order('created_at', { ascending: false });
      if (equipmentId) {
        query = query.eq('equipment_id', equipmentId);
      }
      const { data, error } = await query;
      if (!error && data && data.length > 0) {
        return (data as EquipmentLoan[]).filter((l) => existingEqIds.size === 0 || existingEqIds.has(l.equipment_id));
      }
    }
    const items = this.getItem<EquipmentLoan>('cr_equipment_loans');
    const validItems = items.filter((l) => existingEqIds.has(l.equipment_id));

    if (equipmentId) {
      return validItems.filter((l) => l.equipment_id === equipmentId);
    }
    return validItems;
  }

  public async addEquipmentLoan(
    loan: Omit<EquipmentLoan, 'id' | 'status' | 'created_at'>,
    actor: UserProfile | null
  ): Promise<EquipmentLoan> {
    const newLoan: EquipmentLoan = {
      ...loan,
      id: `loan-${Date.now().toString().slice(-4)}`,
      status: 'em_aberto',
      created_at: new Date().toISOString()
    };

    const supabase = getSupabaseClient();
    if (supabase) {
      try {
        await supabase.from('emprestimos_equipamentos').insert([newLoan]);
      } catch (e) {
        console.warn('Supabase loan insert error:', e);
      }
    }

    const items = this.getItem<EquipmentLoan>('cr_equipment_loans');
    items.unshift(newLoan);
    this.setItem('cr_equipment_loans', items);

    // Update equipment status to 'emprestado'
    await this.updateEquipmentStatus(loan.equipment_id, 'emprestado', actor);

    await this.logAudit(
      actor,
      'criacao',
      'equipamentos',
      `Empréstimo Equipamento: ${loan.equipment_name || loan.equipment_id}`,
      undefined,
      `Retirado por: ${loan.funcionario_nome}`
    );

    return newLoan;
  }

  public async returnEquipmentLoan(
    loanId: string,
    dataDevolucao: string,
    observacaoDevolucao: string | undefined,
    assinaturaDevolucaoUrl: string | undefined,
    actor: UserProfile | null
  ) {
    const items = this.getItem<EquipmentLoan>('cr_equipment_loans');
    const idx = items.findIndex((i) => i.id === loanId);
    if (idx !== -1) {
      const eqId = items[idx].equipment_id;
      items[idx].status = 'concluido';
      items[idx].data_devolucao = dataDevolucao || new Date().toISOString();
      items[idx].observacao_devolucao = observacaoDevolucao;
      items[idx].assinatura_devolucao_url = assinaturaDevolucaoUrl;
      this.setItem('cr_equipment_loans', items);

      const supabase = getSupabaseClient();
      if (supabase) {
        await supabase
          .from('emprestimos_equipamentos')
          .update({
            status: 'concluido',
            data_devolucao: items[idx].data_devolucao,
            observacao_devolucao: observacaoDevolucao,
            assinatura_devolucao_url: assinaturaDevolucaoUrl
          })
          .eq('id', loanId);
      }

      // Return equipment status back to 'ativo'
      await this.updateEquipmentStatus(eqId, 'ativo', actor);

      await this.logAudit(
        actor,
        'edicao',
        'equipamentos',
        `Devolução Empréstimo ID: ${loanId}`,
        `Status: em_aberto`,
        `Status: concluido`
      );
    }
  }

  // --- MATERIAL REQUESTS ---
  public async getMaterialRequests(): Promise<MaterialRequest[]> {
    const supabase = getSupabaseClient();
    if (supabase) {
      const { data, error } = await supabase.from('material_requests').select('*').order('created_at', { ascending: false });
      if (!error && data && data.length > 0) return data as MaterialRequest[];
    }
    return this.getItem<MaterialRequest>('cr_material_requests');
  }

  public async addMaterialRequest(
    req: Omit<MaterialRequest, 'id' | 'created_at' | 'status'>,
    actor: UserProfile | null
  ): Promise<MaterialRequest> {
    const newReq: MaterialRequest = {
      ...req,
      id: `req-${Date.now().toString().slice(-4)}`,
      status: 'pendente',
      created_at: new Date().toISOString()
    };

    const supabase = getSupabaseClient();
    if (supabase) {
      try {
        await supabase.from('material_requests').insert([newReq]);
      } catch (e) {
        console.warn('Supabase material request error:', e);
      }
    }

    const items = this.getItem<MaterialRequest>('cr_material_requests');
    items.unshift(newReq);
    this.setItem('cr_material_requests', items);

    await this.logAudit(actor, 'criacao', 'materiais', `Requisição de Material: ${newReq.title}`, undefined, `Qtd Itens: ${newReq.items.length}`);
    return newReq;
  }

  public async updateMaterialRequestStatus(
    reqId: string,
    status: MaterialRequestStatus,
    reviewNotes: string,
    actor: UserProfile | null
  ) {
    const items = this.getItem<MaterialRequest>('cr_material_requests');
    const idx = items.findIndex((i) => i.id === reqId);
    if (idx !== -1) {
      const oldStatus = items[idx].status;
      items[idx].status = status;
      items[idx].reviewed_by = actor?.id;
      items[idx].reviewed_by_name = actor?.full_name;
      items[idx].review_notes = reviewNotes;
      this.setItem('cr_material_requests', items);

      const supabase = getSupabaseClient();
      if (supabase) {
        await supabase
          .from('material_requests')
          .update({
            status,
            reviewed_by: actor?.id,
            review_notes: reviewNotes
          })
          .eq('id', reqId);
      }

      await this.logAudit(
        actor,
        'aprovacao',
        'materiais',
        `Requisição ID ${reqId} (${items[idx].title})`,
        `Status: ${oldStatus}`,
        `Status: ${status} (Nota: ${reviewNotes || 'Sem observações'})`
      );
    }
  }

  public async deleteMaterialRequest(reqId: string, actor: UserProfile | null) {
    const items = this.getItem<MaterialRequest>('cr_material_requests');
    const target = items.find((i) => i.id === reqId);
    if (target) {
      const filtered = items.filter((i) => i.id !== reqId);
      this.setItem('cr_material_requests', filtered);

      const supabase = getSupabaseClient();
      if (supabase) {
        await supabase.from('material_requests').delete().eq('id', reqId);
      }

      await this.logAudit(actor, 'exclusao', 'materiais', `Requisição Excluída: ID ${reqId} (${target.title})`, `Setor: ${target.sector}`, undefined);
    }
  }

  // --- MARKETING ---
  public async getMarketingContent(): Promise<MarketingContent[]> {
    const supabase = getSupabaseClient();
    if (supabase) {
      const { data, error } = await supabase.from('marketing_contents').select('*').order('scheduled_date', { ascending: true });
      if (!error && data && data.length > 0) return data as MarketingContent[];
    }
    return this.getItem<MarketingContent>('cr_marketing');
  }

  public async addMarketingContent(
    content: Omit<MarketingContent, 'id' | 'created_at'>,
    actor: UserProfile | null
  ): Promise<MarketingContent> {
    const newContent: MarketingContent = {
      ...content,
      id: `mkt-${Date.now().toString().slice(-4)}`,
      created_at: new Date().toISOString()
    };

    const supabase = getSupabaseClient();
    if (supabase) {
      try {
        await supabase.from('marketing_contents').insert([newContent]);
      } catch (e) {
        console.warn('Supabase marketing error:', e);
      }
    }

    const items = this.getItem<MarketingContent>('cr_marketing');
    items.unshift(newContent);
    this.setItem('cr_marketing', items);

    await this.logAudit(
      actor,
      'criacao',
      'marketing',
      `Post Marketing: ${newContent.title}`,
      undefined,
      `Tipo: ${newContent.content_type}, Data: ${newContent.scheduled_date}`
    );
    return newContent;
  }

  public async updateMarketingStatus(id: string, status: MarketingStatus, actor: UserProfile | null) {
    const items = this.getItem<MarketingContent>('cr_marketing');
    const idx = items.findIndex((i) => i.id === id);
    if (idx !== -1) {
      const oldStatus = items[idx].status;
      items[idx].status = status;
      this.setItem('cr_marketing', items);

      const supabase = getSupabaseClient();
      if (supabase) {
        await supabase.from('marketing_contents').update({ status }).eq('id', id);
      }

      await this.logAudit(actor, 'mudanca_status', 'marketing', `Post Marketing: ${items[idx].title}`, `Status: ${oldStatus}`, `Status: ${status}`);
    }
  }

  public async getMarketingMetrics(): Promise<MarketingMetric[]> {
    return this.getItem<MarketingMetric>('cr_marketing_metrics');
  }

  public async addMarketingMetric(metric: Omit<MarketingMetric, 'id' | 'created_at'>, actor: UserProfile | null) {
    const newMetric: MarketingMetric = {
      ...metric,
      id: `met-${Date.now()}`,
      created_at: new Date().toISOString()
    };

    const items = this.getItem<MarketingMetric>('cr_marketing_metrics');
    items.unshift(newMetric);
    this.setItem('cr_marketing_metrics', items);

    await this.logAudit(actor, 'criacao', 'marketing', `Métrica Período: ${newMetric.period_label}`, undefined, `Alcance: ${newMetric.instagram_reach}`);
  }

  // --- TECH TICKETS ---
  public async getTechTickets(): Promise<TechTicket[]> {
    const supabase = getSupabaseClient();
    if (supabase) {
      const { data, error } = await supabase.from('tech_tickets').select('*').order('created_at', { ascending: false });
      if (!error && data && data.length > 0) return data as TechTicket[];
    }
    return this.getItem<TechTicket>('cr_tech_tickets');
  }

  public async addTechTicket(ticket: Omit<TechTicket, 'id' | 'created_at' | 'updated_at'>, actor: UserProfile | null): Promise<TechTicket> {
    const newTicket: TechTicket = {
      ...ticket,
      id: `tik-${Date.now().toString().slice(-4)}`,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    const supabase = getSupabaseClient();
    if (supabase) {
      try {
        await supabase.from('tech_tickets').insert([newTicket]);
      } catch (e) {
        console.warn('Supabase tech ticket error:', e);
      }
    }

    const items = this.getItem<TechTicket>('cr_tech_tickets');
    items.unshift(newTicket);
    this.setItem('cr_tech_tickets', items);

    await this.logAudit(
      actor,
      'criacao',
      'suporte_tecnico',
      `Chamado TI: ${newTicket.title}`,
      undefined,
      `Categoria: ${newTicket.category}, Prioridade: ${newTicket.priority}`
    );
    return newTicket;
  }

  public async updateTicketStatus(id: string, status: TicketStatus, resolutionNotes: string | undefined, actor: UserProfile | null) {
    const items = this.getItem<TechTicket>('cr_tech_tickets');
    const idx = items.findIndex((i) => i.id === id);
    if (idx !== -1) {
      const oldStatus = items[idx].status;
      items[idx].status = status;
      if (resolutionNotes) items[idx].resolution_notes = resolutionNotes;
      items[idx].updated_at = new Date().toISOString();
      this.setItem('cr_tech_tickets', items);

      const supabase = getSupabaseClient();
      if (supabase) {
        await supabase
          .from('tech_tickets')
          .update({
            status,
            resolution_notes: resolutionNotes,
            updated_at: items[idx].updated_at
          })
          .eq('id', id);
      }

      await this.logAudit(
        actor,
        'mudanca_status',
        'suporte_tecnico',
        `Chamado ID ${id} (${items[idx].title})`,
        `Status: ${oldStatus}`,
        `Status: ${status}`
      );
    }
  }

  public async getFaqItems(): Promise<FaqItem[]> {
    return this.getItem<FaqItem>('cr_faq');
  }

  // --- AUDIT LOGS ---
  public async getAuditLogs(): Promise<AuditLog[]> {
    const supabase = getSupabaseClient();
    if (supabase) {
      const { data, error } = await supabase.from('audit_logs').select('*').order('created_at', { ascending: false });
      if (!error && data && data.length > 0) return data as AuditLog[];
    }
    return this.getItem<AuditLog>('cr_audit_logs');
  }

  // --- NOTIFICATIONS ---
  public async getNotifications(userId: string): Promise<AppNotification[]> {
    const items = this.getItem<AppNotification>('cr_notifications');
    return items.filter((n) => n.user_id === userId || n.user_id === 'all');
  }

  public async addNotification(notif: AppNotification) {
    const items = this.getItem<AppNotification>('cr_notifications');
    items.unshift(notif);
    this.setItem('cr_notifications', items);
  }

  public async markNotificationRead(id: string) {
    const items = this.getItem<AppNotification>('cr_notifications');
    const idx = items.findIndex((i) => i.id === id);
    if (idx !== -1) {
      items[idx].is_read = true;
      this.setItem('cr_notifications', items);
    }
  }
}

export const storage = new StorageService();
