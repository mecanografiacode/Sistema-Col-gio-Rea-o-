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

// Helper utilities for UUID validation and FK sanitization
const isUUID = (val: string | undefined | null): boolean => {
  if (!val) return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val);
};

const toValidUuidOrNull = (val: string | undefined | null): string | null => {
  if (!val || typeof val !== 'string') return null;
  const trimmed = val.trim();
  return isUUID(trimmed) ? trimmed : null;
};

const ensureValidUuid = (val: string | undefined | null): string => {
  if (val && typeof val === 'string' && isUUID(val.trim())) {
    return val.trim();
  }
  return crypto.randomUUID();
};

class StorageService {
  private listeners: Set<() => void> = new Set();

  constructor() {
    this.initLocalStorage();
  }

  private initLocalStorage() {
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
    const validId = crypto.randomUUID();
    const validUserId = toValidUuidOrNull(currentUser?.id);

    const newLog: AuditLog = {
      id: validId,
      user_id: validUserId || currentUser?.id || 'sys-anon',
      user_name: currentUser?.full_name || 'Sistema / Convidado',
      user_email: currentUser?.email || 'sistema@colegioreacaodf.com',
      action,
      module,
      target_record: targetRecord,
      old_value: oldValue || undefined,
      new_value: newValue || undefined,
      ip_address: '187.52.190.' + Math.floor(Math.random() * 200 + 10),
      created_at: new Date().toISOString()
    };

    const supabase = getSupabaseClient();
    if (supabase) {
      try {
        await supabase.from('audit_logs').insert([{
          id: validId,
          user_id: validUserId,
          user_name: newLog.user_name,
          user_email: newLog.user_email,
          action: newLog.action,
          module: newLog.module,
          target_record: newLog.target_record,
          old_value: newLog.old_value || null,
          new_value: newLog.new_value || null,
          ip_address: newLog.ip_address || null,
          created_at: newLog.created_at
        }]);
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

  // Clean payload helper for auto-seeding to Supabase
  private sanitizeItemForSupabase(item: any): any {
    const cleaned = { ...item };
    cleaned.id = ensureValidUuid(cleaned.id);

    if ('user_id' in cleaned) cleaned.user_id = toValidUuidOrNull(cleaned.user_id);
    if ('equipment_id' in cleaned) cleaned.equipment_id = toValidUuidOrNull(cleaned.equipment_id);
    if ('assigned_to' in cleaned) cleaned.assigned_to = toValidUuidOrNull(cleaned.assigned_to);
    if ('created_by' in cleaned) cleaned.created_by = toValidUuidOrNull(cleaned.created_by);
    if ('requested_by' in cleaned) cleaned.requested_by = toValidUuidOrNull(cleaned.requested_by);
    if ('reviewed_by' in cleaned) cleaned.reviewed_by = toValidUuidOrNull(cleaned.reviewed_by);
    if ('responsible_id' in cleaned) cleaned.responsible_id = toValidUuidOrNull(cleaned.responsible_id);
    if ('requester_id' in cleaned) cleaned.requester_id = toValidUuidOrNull(cleaned.requester_id);
    if ('funcionario_id' in cleaned) cleaned.funcionario_id = toValidUuidOrNull(cleaned.funcionario_id);

    // Fallbacks for non-null requirements
    if ('title' in cleaned && (cleaned.title === undefined || cleaned.title === null)) cleaned.title = 'Item';
    if ('name' in cleaned && (cleaned.name === undefined || cleaned.name === null)) cleaned.name = 'Equipamento';
    if ('description' in cleaned && (cleaned.description === undefined || cleaned.description === null)) cleaned.description = '';
    if ('sector' in cleaned && (cleaned.sector === undefined || cleaned.sector === null)) cleaned.sector = 'Geral';
    if ('email' in cleaned && (cleaned.email === undefined || cleaned.email === null)) cleaned.email = 'usuario@colegioreacaodf.com';
    if ('full_name' in cleaned && (cleaned.full_name === undefined || cleaned.full_name === null)) cleaned.full_name = 'Usuário';
    if ('role' in cleaned && (cleaned.role === undefined || cleaned.role === null)) cleaned.role = 'operador';
    if ('department' in cleaned && (cleaned.department === undefined || cleaned.department === null)) cleaned.department = 'Geral';
    if ('category' in cleaned && (cleaned.category === undefined || cleaned.category === null)) cleaned.category = 'outro';
    if ('priority' in cleaned && (cleaned.priority === undefined || cleaned.priority === null)) cleaned.priority = 'media';
    if ('status' in cleaned && (cleaned.status === undefined || cleaned.status === null)) cleaned.status = 'aberta';
    if ('type' in cleaned && (cleaned.type === undefined || cleaned.type === null)) cleaned.type = 'Outro';
    if ('room_location' in cleaned && (cleaned.room_location === undefined || cleaned.room_location === null)) cleaned.room_location = 'Almoxarifado';
    if ('created_by_name' in cleaned && (cleaned.created_by_name === undefined || cleaned.created_by_name === null)) cleaned.created_by_name = 'Sistema';
    if ('requested_by_name' in cleaned && (cleaned.requested_by_name === undefined || cleaned.requested_by_name === null)) cleaned.requested_by_name = 'Solicitante';
    if ('requester_name' in cleaned && (cleaned.requester_name === undefined || cleaned.requester_name === null)) cleaned.requester_name = 'Solicitante';
    if ('user_name' in cleaned && (cleaned.user_name === undefined || cleaned.user_name === null)) cleaned.user_name = 'Sistema';
    if ('user_email' in cleaned && (cleaned.user_email === undefined || cleaned.user_email === null)) cleaned.user_email = 'sistema@colegioreacaodf.com';

    return cleaned;
  }

  // Helper method to fetch from Supabase if configured, otherwise fallback to local storage
  private async fetchFromSupabaseOrCache<T>(
    tableName: string,
    cacheKey: string,
    initialSeedData: T[],
    orderBy: string = 'created_at',
    ascending: boolean = false
  ): Promise<T[]> {
    const supabase = getSupabaseClient();
    if (supabase) {
      try {
        const { data, error } = await supabase.from(tableName).select('*').order(orderBy, { ascending });
        if (!error && data) {
          if (data.length > 0) {
            this.setItem(cacheKey, data as T[]);
            return data as T[];
          } else {
            // Table in Supabase is empty (0 rows). Check if we have seed/local data to migrate to Supabase.
            const localItems = this.getItem<T>(cacheKey);
            const itemsToSeed = localItems && localItems.length > 0 ? localItems : initialSeedData;
            if (itemsToSeed && itemsToSeed.length > 0) {
              const sanitizedSeed = itemsToSeed.map((it) => this.sanitizeItemForSupabase(it));
              const { error: seedErr } = await supabase.from(tableName).insert(sanitizedSeed as any);
              if (!seedErr) {
                this.setItem(cacheKey, itemsToSeed);
                return itemsToSeed;
              } else {
                console.warn(`Supabase auto-seed warning for ${tableName}:`, seedErr.message);
              }
            }
            this.setItem(cacheKey, []);
            return [];
          }
        } else if (error) {
          console.warn(`Supabase query warning for ${tableName}:`, error.message);
        }
      } catch (err) {
        console.warn(`Supabase exception for ${tableName}:`, err);
      }
    }
    return this.getItem<T>(cacheKey);
  }

  // --- PROFILES & USERS ---
  public async getProfiles(): Promise<UserProfile[]> {
    return this.fetchFromSupabaseOrCache<UserProfile>('profiles', 'cr_profiles', INITIAL_PROFILES, 'created_at', false);
  }

  public async addProfile(profile: Omit<UserProfile, 'id' | 'created_at'>, actor: UserProfile | null): Promise<UserProfile> {
    const validId = crypto.randomUUID();
    const newProfile: UserProfile = {
      ...profile,
      id: validId,
      full_name: profile.full_name || 'Usuário Sem Nome',
      role: profile.role || 'operador',
      department: profile.department || 'Geral',
      is_active: profile.is_active ?? true,
      created_at: new Date().toISOString()
    };

    const supabase = getSupabaseClient();
    if (supabase) {
      try {
        await supabase.from('profiles').insert([{
          id: newProfile.id,
          email: newProfile.email,
          full_name: newProfile.full_name,
          role: newProfile.role,
          department: newProfile.department,
          avatar_url: newProfile.avatar_url || null,
          is_active: newProfile.is_active,
          created_at: newProfile.created_at
        }]);
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
      if (supabase && isUUID(userId)) {
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
      if (supabase && isUUID(userId)) {
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
    return this.fetchFromSupabaseOrCache<ServiceOrder>('service_orders', 'cr_service_orders', INITIAL_SERVICE_ORDERS, 'created_at', false);
  }

  public async addServiceOrder(
    so: Omit<ServiceOrder, 'id' | 'created_at' | 'updated_at' | 'comments'>,
    actor: UserProfile | null
  ): Promise<ServiceOrder> {
    const validId = crypto.randomUUID();
    const newSO: ServiceOrder = {
      ...so,
      id: validId,
      description: so.description || '',
      category: so.category || 'outro',
      priority: so.priority || 'media',
      status: so.status || 'aberta',
      sector: so.sector || 'Geral',
      comments: [],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    const supabase = getSupabaseClient();
    if (supabase) {
      try {
        await supabase.from('service_orders').insert([{
          id: newSO.id,
          title: newSO.title,
          description: newSO.description,
          category: newSO.category,
          priority: newSO.priority,
          status: newSO.status,
          sector: newSO.sector,
          location: newSO.location || null,
          observation: newSO.observation || null,
          equipment_id: toValidUuidOrNull(newSO.equipment_id),
          equipment_name: newSO.equipment_name || null,
          assigned_to: toValidUuidOrNull(newSO.assigned_to),
          assigned_to_name: newSO.assigned_to_name || null,
          created_by: toValidUuidOrNull(newSO.created_by),
          created_by_name: newSO.created_by_name || actor?.full_name || 'Sistema',
          photo_url: newSO.photo_url || null,
          foto_abertura_url: newSO.foto_abertura_url || null,
          foto_conclusao_url: newSO.foto_conclusao_url || null,
          concluded_at: newSO.concluded_at || null,
          concluded_notes: newSO.concluded_notes || null,
          comments: newSO.comments || [],
          created_at: newSO.created_at,
          updated_at: newSO.updated_at
        }]);
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
      if (supabase && isUUID(soId)) {
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
      if (supabase && isUUID(soId)) {
        await supabase.from('service_orders').update({
          assigned_to: toValidUuidOrNull(assignedToId),
          assigned_to_name: assignedToName || null,
          updated_at: items[idx].updated_at
        }).eq('id', soId);
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
        id: crypto.randomUUID(),
        user_name: actor?.full_name || 'Usuário',
        user_avatar: actor?.avatar_url,
        comment: commentText,
        created_at: new Date().toISOString()
      };
      items[idx].comments.push(newComment);
      items[idx].updated_at = new Date().toISOString();
      this.setItem('cr_service_orders', items);

      const supabase = getSupabaseClient();
      if (supabase && isUUID(soId)) {
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
      if (supabase && isUUID(soId)) {
        await supabase
          .from('service_orders')
          .update({
            status: 'concluida',
            concluded_notes: concludedNotes || null,
            foto_conclusao_url: fotoConclusaoUrl || null,
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
      if (supabase && isUUID(soId)) {
        await supabase.from('service_orders').delete().eq('id', soId);
      }

      await this.logAudit(actor, 'exclusao', 'ordens_servico', `OS Excluída: ID ${soId} (${target.title})`, `Setor: ${target.sector}`, undefined);
    }
  }

  // --- EQUIPMENT ---
  public async getEquipment(): Promise<Equipment[]> {
    return this.fetchFromSupabaseOrCache<Equipment>('equipments', 'cr_equipment', INITIAL_EQUIPMENT, 'created_at', false);
  }

  public async addEquipment(eq: Omit<Equipment, 'id' | 'created_at'>, actor: UserProfile | null): Promise<Equipment> {
    const validId = crypto.randomUUID();
    const newEq: Equipment = {
      ...eq,
      id: validId,
      type: eq.type || 'Outro',
      asset_number: eq.asset_number || `PAT-${Math.random().toString(36).substring(2, 8).toUpperCase()}`,
      room_location: eq.room_location || 'Almoxarifado',
      status: eq.status || 'ativo',
      created_at: new Date().toISOString()
    };

    const supabase = getSupabaseClient();
    if (supabase) {
      try {
        await supabase.from('equipments').insert([{
          id: newEq.id,
          name: newEq.name,
          type: newEq.type,
          asset_number: newEq.asset_number,
          room_location: newEq.room_location,
          acquisition_date: newEq.acquisition_date || new Date().toISOString().split('T')[0],
          warranty_until: newEq.warranty_until || null,
          status: newEq.status,
          notes: newEq.notes || null,
          foto_url: newEq.foto_url || null,
          created_at: newEq.created_at
        }]);
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
      if (supabase && isUUID(eqId)) {
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
      if (supabase && isUUID(eqId)) {
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
      if (supabase && isUUID(eqId)) {
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
      if (equipmentId && isUUID(equipmentId)) {
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
    const validId = crypto.randomUUID();
    const newLoan: EquipmentLoan = {
      ...loan,
      id: validId,
      status: 'em_aberto',
      created_at: new Date().toISOString()
    };

    const supabase = getSupabaseClient();
    if (supabase) {
      try {
        await supabase.from('emprestimos_equipamentos').insert([{
          id: newLoan.id,
          equipment_id: toValidUuidOrNull(newLoan.equipment_id),
          equipment_name: newLoan.equipment_name || null,
          funcionario_id: toValidUuidOrNull(newLoan.funcionario_id),
          funcionario_nome: newLoan.funcionario_nome || 'Funcionário',
          data_retirada: newLoan.data_retirada || new Date().toISOString(),
          observacao_retirada: newLoan.observacao_retirada || null,
          assinatura_retirada_url: newLoan.assinatura_retirada_url || null,
          data_devolucao: newLoan.data_devolucao || null,
          observacao_devolucao: newLoan.observacao_devolucao || null,
          assinatura_devolucao_url: newLoan.assinatura_devolucao_url || null,
          status: newLoan.status,
          created_at: newLoan.created_at
        }]);
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
      if (supabase && isUUID(loanId)) {
        await supabase
          .from('emprestimos_equipamentos')
          .update({
            status: 'concluido',
            data_devolucao: items[idx].data_devolucao,
            observacao_devolucao: observacaoDevolucao || null,
            assinatura_devolucao_url: assinaturaDevolucaoUrl || null
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
    return this.fetchFromSupabaseOrCache<MaterialRequest>('material_requests', 'cr_material_requests', INITIAL_MATERIAL_REQUESTS, 'created_at', false);
  }

  public async addMaterialRequest(
    req: Omit<MaterialRequest, 'id' | 'created_at' | 'status'>,
    actor: UserProfile | null
  ): Promise<MaterialRequest> {
    const validId = crypto.randomUUID();
    const newReq: MaterialRequest = {
      ...req,
      id: validId,
      justification: req.justification || '',
      sector: req.sector || 'Geral',
      urgency: req.urgency || 'media',
      status: 'pendente',
      created_at: new Date().toISOString()
    };

    const supabase = getSupabaseClient();
    if (supabase) {
      try {
        await supabase.from('material_requests').insert([{
          id: newReq.id,
          title: newReq.title,
          requested_by: toValidUuidOrNull(newReq.requested_by),
          requested_by_name: newReq.requested_by_name || actor?.full_name || 'Solicitante',
          sector: newReq.sector,
          urgency: newReq.urgency,
          justification: newReq.justification,
          items: newReq.items || [],
          status: newReq.status,
          reviewed_by: toValidUuidOrNull(newReq.reviewed_by),
          reviewed_by_name: newReq.reviewed_by_name || null,
          review_notes: newReq.review_notes || null,
          created_at: newReq.created_at
        }]);
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
      if (supabase && isUUID(reqId)) {
        await supabase
          .from('material_requests')
          .update({
            status,
            reviewed_by: toValidUuidOrNull(actor?.id),
            reviewed_by_name: actor?.full_name || null,
            review_notes: reviewNotes || null
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
      if (supabase && isUUID(reqId)) {
        await supabase.from('material_requests').delete().eq('id', reqId);
      }

      await this.logAudit(actor, 'exclusao', 'materiais', `Requisição Excluída: ID ${reqId} (${target.title})`, `Setor: ${target.sector}`, undefined);
    }
  }

  // --- MARKETING ---
  public async getMarketingContent(): Promise<MarketingContent[]> {
    return this.fetchFromSupabaseOrCache<MarketingContent>('marketing_contents', 'cr_marketing', INITIAL_MARKETING_CONTENT, 'scheduled_date', true);
  }

  public async addMarketingContent(
    content: Omit<MarketingContent, 'id' | 'created_at'>,
    actor: UserProfile | null
  ): Promise<MarketingContent> {
    const validId = crypto.randomUUID();
    const newContent: MarketingContent = {
      ...content,
      id: validId,
      content_type: content.content_type || 'post_estatico',
      scheduled_date: content.scheduled_date || new Date().toISOString().split('T')[0],
      status: content.status || 'ideia',
      has_image_authorization: content.has_image_authorization ?? false,
      created_at: new Date().toISOString()
    };

    const supabase = getSupabaseClient();
    if (supabase) {
      try {
        await supabase.from('marketing_contents').insert([{
          id: newContent.id,
          title: newContent.title,
          content_type: newContent.content_type,
          scheduled_date: newContent.scheduled_date,
          status: newContent.status,
          responsible_id: toValidUuidOrNull(newContent.responsible_id),
          responsible_name: newContent.responsible_name || null,
          asset_link: newContent.asset_link || null,
          has_image_authorization: newContent.has_image_authorization,
          notes: newContent.notes || null,
          created_at: newContent.created_at
        }]);
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
      if (supabase && isUUID(id)) {
        await supabase.from('marketing_contents').update({ status }).eq('id', id);
      }

      await this.logAudit(actor, 'mudanca_status', 'marketing', `Post Marketing: ${items[idx].title}`, `Status: ${oldStatus}`, `Status: ${status}`);
    }
  }

  public async getMarketingMetrics(): Promise<MarketingMetric[]> {
    return this.getItem<MarketingMetric>('cr_marketing_metrics');
  }

  public async addMarketingMetric(metric: Omit<MarketingMetric, 'id' | 'created_at'>, actor: UserProfile | null) {
    const validId = crypto.randomUUID();
    const newMetric: MarketingMetric = {
      ...metric,
      id: validId,
      instagram_reach: metric.instagram_reach || 0,
      engagement_rate: metric.engagement_rate || 0,
      followers_gained: metric.followers_gained || 0,
      leads_generated: metric.leads_generated || 0,
      created_at: new Date().toISOString()
    };

    const supabase = getSupabaseClient();
    if (supabase) {
      try {
        await supabase.from('marketing_metrics').insert([{
          id: newMetric.id,
          period_label: newMetric.period_label,
          instagram_reach: newMetric.instagram_reach,
          engagement_rate: newMetric.engagement_rate,
          followers_gained: newMetric.followers_gained,
          leads_generated: newMetric.leads_generated,
          notes: newMetric.notes || null,
          created_at: newMetric.created_at
        }]);
      } catch (e) {
        console.warn('Supabase marketing metric error:', e);
      }
    }

    const items = this.getItem<MarketingMetric>('cr_marketing_metrics');
    items.unshift(newMetric);
    this.setItem('cr_marketing_metrics', items);

    await this.logAudit(actor, 'criacao', 'marketing', `Métrica Período: ${newMetric.period_label}`, undefined, `Alcance: ${newMetric.instagram_reach}`);
  }

  // --- TECH TICKETS ---
  public async getTechTickets(): Promise<TechTicket[]> {
    return this.fetchFromSupabaseOrCache<TechTicket>('tech_tickets', 'cr_tech_tickets', INITIAL_TECH_TICKETS, 'created_at', false);
  }

  public async addTechTicket(ticket: Omit<TechTicket, 'id' | 'created_at' | 'updated_at'>, actor: UserProfile | null): Promise<TechTicket> {
    const validId = crypto.randomUUID();
    const newTicket: TechTicket = {
      ...ticket,
      id: validId,
      description: ticket.description || '',
      category: ticket.category || 'outro',
      priority: ticket.priority || 'media',
      status: ticket.status || 'aberto',
      sector: ticket.sector || 'Geral',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    const supabase = getSupabaseClient();
    if (supabase) {
      try {
        await supabase.from('tech_tickets').insert([{
          id: newTicket.id,
          title: newTicket.title,
          description: newTicket.description,
          category: newTicket.category,
          priority: newTicket.priority,
          status: newTicket.status,
          requester_id: toValidUuidOrNull(newTicket.requester_id),
          requester_name: newTicket.requester_name || actor?.full_name || 'Solicitante',
          sector: newTicket.sector,
          assigned_to: toValidUuidOrNull(newTicket.assigned_to),
          assigned_to_name: newTicket.assigned_to_name || null,
          attachment_url: newTicket.attachment_url || null,
          resolution_notes: newTicket.resolution_notes || null,
          created_at: newTicket.created_at,
          updated_at: newTicket.updated_at
        }]);
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
      if (supabase && isUUID(id)) {
        await supabase
          .from('tech_tickets')
          .update({
            status,
            resolution_notes: resolutionNotes || null,
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
    return this.fetchFromSupabaseOrCache<AuditLog>('audit_logs', 'cr_audit_logs', INITIAL_AUDIT_LOGS, 'created_at', false);
  }

  // --- NOTIFICATIONS ---
  public async getNotifications(userId: string): Promise<AppNotification[]> {
    const items = this.getItem<AppNotification>('cr_notifications');
    return items.filter((n) => n.user_id === userId || n.user_id === 'all');
  }

  public async addNotification(notif: AppNotification) {
    const validId = ensureValidUuid(notif.id);
    const notificationToSave = { ...notif, id: validId };

    const supabase = getSupabaseClient();
    if (supabase) {
      try {
        await supabase.from('notifications').insert([{
          id: validId,
          user_id: notif.user_id || 'all',
          title: notif.title || 'Notificação',
          body: notif.body || '',
          module: notif.module || 'configuracoes',
          target_id: notif.target_id || null,
          is_read: notif.is_read ?? false,
          created_at: notif.created_at || new Date().toISOString()
        }]);
      } catch (err) {
        console.warn('Supabase notification insert fallback:', err);
      }
    }

    const items = this.getItem<AppNotification>('cr_notifications');
    items.unshift(notificationToSave);
    this.setItem('cr_notifications', items);
  }

  public async markNotificationRead(id: string) {
    const items = this.getItem<AppNotification>('cr_notifications');
    const idx = items.findIndex((i) => i.id === id);
    if (idx !== -1) {
      items[idx].is_read = true;
      this.setItem('cr_notifications', items);

      const supabase = getSupabaseClient();
      if (supabase && isUUID(id)) {
        await supabase.from('notifications').update({ is_read: true }).eq('id', id);
      }
    }
  }
}

export const storage = new StorageService();
