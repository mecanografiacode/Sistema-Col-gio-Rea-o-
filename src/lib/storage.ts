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
import { getSupabaseClient, markSupabaseOffline, resetSupabaseOfflineStatus } from './supabase';

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
    if (!localStorage.getItem('cr_teachers')) {
      localStorage.setItem('cr_teachers', JSON.stringify([]));
    }
    if (!localStorage.getItem('cr_classes')) {
      localStorage.setItem('cr_classes', JSON.stringify([]));
    }
    if (!localStorage.getItem('cr_schedule_slots')) {
      localStorage.setItem('cr_schedule_slots', JSON.stringify([]));
    }
    if (!localStorage.getItem('cr_time_blocks')) {
      localStorage.setItem('cr_time_blocks', JSON.stringify([]));
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
    try {
      const validId = crypto.randomUUID();
      const validUserId = toValidUuidOrNull(currentUser?.id);

      const supabase = getSupabaseClient();
      let finalUserId: string | null = null;

      if (supabase && validUserId) {
        try {
          // Garante que exista um registro correspondente em public.profiles antes de gravar o log
          const { data: profileExists, error: profileErr } = await supabase
            .from('profiles')
            .select('id')
            .eq('id', validUserId)
            .maybeSingle();

          if (profileErr) {
            console.warn('Erro ao consultar Supabase profiles no logAudit:', profileErr.message);
          }

          if (profileExists) {
            finalUserId = validUserId;
          } else {
            console.warn(`Aviso no logAudit: perfil ${validUserId} não localizado no banco. Gravando log com user_id = null.`);
            finalUserId = null;
          }
        } catch (err: any) {
          console.warn('Exceção ao verificar perfil no logAudit:', err?.message || err);
          finalUserId = null;
        }
      }

      const newLog: AuditLog = {
        id: validId,
        user_id: finalUserId,
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

      if (supabase) {
        try {
          const { error: insertErr } = await supabase.from('audit_logs').insert([{
            id: validId,
            user_id: finalUserId,
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

          if (insertErr) {
            console.error('Erro retornado pelo Supabase ao gravar log de auditoria (Constraint de FK ou similar):', insertErr.message, insertErr.details || '');
            if (insertErr.message?.includes('Failed to fetch')) {
              markSupabaseOffline(insertErr.message);
            }
          }
        } catch (err: any) {
          console.error('Exceção ao gravar log de auditoria no Supabase:', err?.message || err);
          if (err?.message?.includes('Failed to fetch') || err?.name === 'TypeError') {
            markSupabaseOffline(err?.message || 'Failed to fetch');
          }
        }
      }

      const logs = this.getItem<AuditLog>('cr_audit_logs');
      logs.unshift(newLog);
      this.setItem('cr_audit_logs', logs);
    } catch (outerErr: any) {
      console.error('Falha geral silenciosa em logAudit para evitar cancelamento da ação principal:', outerErr?.message || outerErr);
    }
  }

  // --- LOCAL STORAGE HELPERS ---
  public getItem<T>(key: string): T[] {
    try {
      const data = localStorage.getItem(key);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  }

  public setItem<T>(key: string, data: T[], notify: boolean = true) {
    try {
      const current = localStorage.getItem(key);
      const next = JSON.stringify(data);
      if (current !== next) {
        localStorage.setItem(key, next);
        if (notify) {
          this.notify();
        }
      }
    } catch (e) {
      console.warn(`Error setting storage key ${key}:`, e);
    }
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
    if ('class_id' in cleaned) cleaned.class_id = toValidUuidOrNull(cleaned.class_id);
    if ('teacher_id' in cleaned) cleaned.teacher_id = toValidUuidOrNull(cleaned.teacher_id);

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
            this.setItem(cacheKey, data as T[], false);
            return data as T[];
          } else {
            // Table in Supabase is empty (0 rows). Respect manual deletion and keep empty.
            this.setItem(cacheKey, [], false);
            return [];
          }
        } else if (error) {
          if (error.message?.includes('Failed to fetch')) {
            markSupabaseOffline(error.message);
          } else {
            console.warn(`Supabase query warning for ${tableName}:`, error.message);
          }
        }
      } catch (err: any) {
        if (err?.message?.includes('Failed to fetch') || err?.name === 'TypeError') {
          markSupabaseOffline(err?.message || 'TypeError');
        } else {
          console.warn(`Supabase exception for ${tableName}:`, err);
        }
      }
    }
    return this.getItem<T>(cacheKey);
  }

  // --- PROFILES & USERS ---
  public async getProfiles(): Promise<UserProfile[]> {
    const cached = this.getItem<UserProfile>('cr_profiles');
    const supabase = getSupabaseClient();

    if (supabase) {
      try {
        const { data, error } = await supabase.from('profiles').select('*').order('created_at', { ascending: false });
        if (!error && data) {
          const remoteProfiles: UserProfile[] = data.map((p: any) => ({
            id: p.id || crypto.randomUUID(),
            email: p.email || 'usuario@colegioreacaodf.com',
            full_name: p.full_name || 'Usuário Sem Nome',
            role: (p.role as UserRole) || 'operador',
            department: p.department || 'Geral',
            avatar_url: p.avatar_url || undefined,
            is_active: p.is_active ?? true,
            created_at: p.created_at || new Date().toISOString(),
            password: p.password || '123456'
          }));

          // Merge cached items that may not be in remoteProfiles yet
          const merged = [...remoteProfiles];
          for (const c of cached) {
            if (!merged.some((m) => m.id === c.id || m.email.toLowerCase() === c.email.toLowerCase())) {
              merged.push(c);
              // Background push to Supabase
              const res = await supabase.from('profiles').upsert([{
                id: c.id,
                email: c.email.toLowerCase(),
                full_name: c.full_name,
                role: c.role,
                department: c.department,
                avatar_url: c.avatar_url || null,
                password: c.password || '123456',
                is_active: c.is_active,
                created_at: c.created_at
              }]);
              if (res?.error && res.error.message?.includes('Failed to fetch')) {
                markSupabaseOffline(res.error.message);
              }
            }
          }

          this.setItem('cr_profiles', merged, false);
          return merged;
        } else if (error) {
          if (error.message?.includes('Failed to fetch')) {
            markSupabaseOffline(error.message);
          } else {
            console.warn('Supabase query error for profiles:', error.message);
          }
        }
      } catch (err: any) {
        if (err?.message?.includes('Failed to fetch') || err?.name === 'TypeError') {
          markSupabaseOffline(err?.message || 'TypeError');
        } else {
          console.warn('Supabase profiles exception:', err);
        }
      }
    }

    return cached.map((p) => ({
      ...p,
      password: p.password || '123456',
      department: p.department || 'Geral',
      is_active: p.is_active ?? true
    }));
  }

  public async addProfile(profile: Omit<UserProfile, 'id' | 'created_at'>, actor: UserProfile | null): Promise<UserProfile> {
    const validId = crypto.randomUUID();
    const newProfile: UserProfile = {
      ...profile,
      id: validId,
      full_name: profile.full_name?.trim() || 'Usuário Sem Nome',
      role: profile.role || 'operador',
      department: profile.department?.trim() || 'Geral',
      password: profile.password?.trim() || '123456',
      is_active: profile.is_active ?? true,
      created_at: new Date().toISOString()
    };

    // Update local storage immediately
    const profiles = this.getItem<UserProfile>('cr_profiles');
    const existingIndex = profiles.findIndex(
      (p) => p.id === newProfile.id || p.email.toLowerCase() === newProfile.email.toLowerCase()
    );
    if (existingIndex !== -1) {
      profiles[existingIndex] = newProfile;
    } else {
      profiles.push(newProfile);
    }
    this.setItem('cr_profiles', profiles);

    // Persist to Supabase if client available
    const supabase = getSupabaseClient();
    if (supabase) {
      try {
        const payload = {
          id: newProfile.id,
          email: newProfile.email.toLowerCase(),
          full_name: newProfile.full_name,
          role: newProfile.role,
          department: newProfile.department,
          avatar_url: newProfile.avatar_url || null,
          password: newProfile.password || '123456',
          is_active: newProfile.is_active,
          created_at: newProfile.created_at
        };

        const { error: upsertErr } = await supabase.from('profiles').upsert([payload]);
        if (upsertErr) {
          console.warn('Supabase profile add/upsert error:', upsertErr.message);
        } else {
          console.log('Perfil salvo com sucesso na tabela profiles do Supabase:', newProfile.email);
        }

        // Try creating account in Supabase Auth as well if configured
        try {
          await supabase.auth.signUp({
            email: newProfile.email,
            password: newProfile.password || '123456',
            options: {
              data: {
                full_name: newProfile.full_name,
                role: newProfile.role,
                department: newProfile.department
              }
            }
          });
        } catch (authErr) {
          // Ignore if auth user already exists or auth admin disabled
        }
      } catch (e) {
        console.warn('Exceção ao adicionar perfil no Supabase:', e);
      }
    }

    await this.logAudit(
      actor,
      'criacao',
      'usuarios',
      `Novo Usuário: ${newProfile.full_name}`,
      undefined,
      `Role: ${newProfile.role} | E-mail: ${newProfile.email}`
    );

    return newProfile;
  }

  public async updateProfile(userId: string, updatedFields: Partial<UserProfile>, actor: UserProfile | null) {
    const profiles = this.getItem<UserProfile>('cr_profiles');
    const index = profiles.findIndex((p) => p.id === userId);
    if (index !== -1) {
      const oldProfile = { ...profiles[index] };
      profiles[index] = { ...profiles[index], ...updatedFields };
      this.setItem('cr_profiles', profiles);

      const supabase = getSupabaseClient();
      if (supabase && isUUID(userId)) {
        try {
          const payload = {
            id: userId,
            email: profiles[index].email.toLowerCase(),
            full_name: profiles[index].full_name,
            role: profiles[index].role,
            department: profiles[index].department,
            avatar_url: profiles[index].avatar_url || null,
            password: profiles[index].password || '123456',
            is_active: profiles[index].is_active
          };

          const { error } = await supabase.from('profiles').upsert([payload]);
          if (error) {
            console.warn('Supabase profile update error:', error.message);
          }
        } catch (e) {
          console.warn('Supabase profile update error:', e);
        }
      }

      await this.logAudit(
        actor,
        'edicao',
        'usuarios',
        `Edição do Usuário: ${profiles[index].full_name} (${profiles[index].email})`,
        `Anterior: ${oldProfile.full_name} (${oldProfile.role})`,
        `Novo: ${profiles[index].full_name} (${profiles[index].role})`
      );
    }
  }

  public async deleteProfile(userId: string, actor: UserProfile | null) {
    const supabase = getSupabaseClient();
    if (supabase && isUUID(userId)) {
      const { error } = await supabase.from('profiles').delete().eq('id', userId);
      if (error) {
        console.error('Erro ao excluir perfil no Supabase:', error.message);
        throw error;
      }
    }

    const profiles = this.getItem<UserProfile>('cr_profiles');
    const target = profiles.find((p) => p.id === userId);
    if (target) {
      const filtered = profiles.filter((p) => p.id !== userId);
      this.setItem('cr_profiles', filtered);

      await this.logAudit(actor, 'exclusao', 'usuarios', `Usuário Removido: ${target.full_name} (${target.email})`, undefined, undefined);
    }
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
      cost: so.cost || 0,
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
          cost: newSO.cost || 0,
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
    actor: UserProfile | null,
    cost?: number
  ) {
    const items = this.getItem<ServiceOrder>('cr_service_orders');
    const idx = items.findIndex((i) => i.id === soId);
    if (idx !== -1) {
      const oldStatus = items[idx].status;
      items[idx].status = 'concluida';
      items[idx].concluded_notes = concludedNotes;
      if (fotoConclusaoUrl) items[idx].foto_conclusao_url = fotoConclusaoUrl;
      items[idx].concluded_at = concludedAt || new Date().toISOString();
      if (typeof cost === 'number') items[idx].cost = cost;
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
            cost: items[idx].cost || 0,
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
        `Status: concluida (Obs: ${concludedNotes || 'Nenhuma'}, Valor: R$ ${items[idx].cost || 0})`
      );
    }
  }

  public async updateServiceOrderCost(soId: string, cost: number, actor: UserProfile | null) {
    const items = this.getItem<ServiceOrder>('cr_service_orders');
    const idx = items.findIndex((i) => i.id === soId);
    if (idx !== -1) {
      const oldCost = items[idx].cost || 0;
      items[idx].cost = cost;
      items[idx].updated_at = new Date().toISOString();
      this.setItem('cr_service_orders', items);

      const supabase = getSupabaseClient();
      if (supabase && isUUID(soId)) {
        await supabase.from('service_orders').update({ cost, updated_at: items[idx].updated_at }).eq('id', soId);
      }

      await this.logAudit(
        actor,
        'edicao',
        'ordens_servico',
        `OS ID ${soId} (${items[idx].title}) - Custo Atualizado`,
        `R$ ${oldCost}`,
        `R$ ${cost}`
      );
    }
  }

  public async deleteServiceOrder(soId: string, actor: UserProfile | null) {
    const supabase = getSupabaseClient();
    if (supabase && isUUID(soId)) {
      const { error } = await supabase.from('service_orders').delete().eq('id', soId);
      if (error) {
        console.error('Erro ao excluir ordem de serviço no Supabase:', error.message);
        throw error;
      }
    }

    const items = this.getItem<ServiceOrder>('cr_service_orders');
    const target = items.find((i) => i.id === soId);
    if (target) {
      const filtered = items.filter((i) => i.id !== soId);
      this.setItem('cr_service_orders', filtered);

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
    const supabase = getSupabaseClient();
    if (supabase && isUUID(eqId)) {
      const { error: err1 } = await supabase.from('equipments').delete().eq('id', eqId);
      if (err1) {
        console.error('Erro ao excluir equipamento no Supabase:', err1.message);
        throw err1;
      }
      const { error: err2 } = await supabase.from('emprestimos_equipamentos').delete().eq('equipment_id', eqId);
      if (err2) {
        console.warn('Erro ao excluir empréstimos associados no Supabase:', err2.message);
      }
    }

    const items = this.getItem<Equipment>('cr_equipment');
    const target = items.find((i) => i.id === eqId);
    if (target) {
      const filtered = items.filter((i) => i.id !== eqId);
      this.setItem('cr_equipment', filtered);

      // Clean up associated loans for this deleted equipment
      const loans = this.getItem<EquipmentLoan>('cr_equipment_loans');
      const filteredLoans = loans.filter((l) => l.equipment_id !== eqId);
      this.setItem('cr_equipment_loans', filteredLoans);

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
      turma: req.turma || undefined,
      request_date: req.request_date || new Date().toLocaleDateString('pt-BR'),
      requester_signature_url: req.requester_signature_url || undefined,
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
          turma: newReq.turma || null,
          request_date: newReq.request_date || null,
          requester_signature_url: newReq.requester_signature_url || null,
          urgency: newReq.urgency,
          justification: newReq.justification,
          items: newReq.items || [],
          status: newReq.status,
          reviewed_by: toValidUuidOrNull(newReq.reviewed_by),
          reviewed_by_name: newReq.reviewed_by_name || null,
          director_name: newReq.director_name || null,
          director_signature_url: newReq.director_signature_url || null,
          director_approval_date: newReq.director_approval_date || null,
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
    actor: UserProfile | null,
    directorData?: {
      director_name?: string;
      director_signature_url?: string;
      director_approval_date?: string;
    }
  ) {
    const items = this.getItem<MaterialRequest>('cr_material_requests');
    const idx = items.findIndex((i) => i.id === reqId);
    if (idx !== -1) {
      const oldStatus = items[idx].status;
      items[idx].status = status;
      items[idx].reviewed_by = actor?.id;
      items[idx].reviewed_by_name = actor?.full_name;
      items[idx].review_notes = reviewNotes;

      if (directorData) {
        items[idx].director_name = directorData.director_name || actor?.full_name || 'Diretora Geral';
        items[idx].director_signature_url = directorData.director_signature_url || items[idx].director_signature_url;
        items[idx].director_approval_date = directorData.director_approval_date || new Date().toLocaleDateString('pt-BR');
      }

      this.setItem('cr_material_requests', items);

      const supabase = getSupabaseClient();
      if (supabase && isUUID(reqId)) {
        await supabase
          .from('material_requests')
          .update({
            status,
            reviewed_by: toValidUuidOrNull(actor?.id),
            reviewed_by_name: actor?.full_name || null,
            review_notes: reviewNotes || null,
            director_name: items[idx].director_name || null,
            director_signature_url: items[idx].director_signature_url || null,
            director_approval_date: items[idx].director_approval_date || null
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
    const supabase = getSupabaseClient();
    if (supabase && isUUID(reqId)) {
      const { error } = await supabase.from('material_requests').delete().eq('id', reqId);
      if (error) {
        console.error('Erro ao excluir requisição de material no Supabase:', error.message);
        throw error;
      }
    }

    const items = this.getItem<MaterialRequest>('cr_material_requests');
    const target = items.find((i) => i.id === reqId);
    if (target) {
      const filtered = items.filter((i) => i.id !== reqId);
      this.setItem('cr_material_requests', filtered);

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
          category: newContent.category || null,
          script: newContent.script || null,
          caption: newContent.caption || null,
          hashtags: newContent.hashtags || [],
          target_audience: newContent.target_audience || null,
          hook: newContent.hook || null,
          audio_suggestion: newContent.audio_suggestion || null,
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

  public async updateMarketingContent(id: string, updatedFields: Partial<MarketingContent>, actor: UserProfile | null) {
    const items = this.getItem<MarketingContent>('cr_marketing');
    const idx = items.findIndex((i) => i.id === id);
    if (idx !== -1) {
      const oldItem = { ...items[idx] };
      items[idx] = { ...items[idx], ...updatedFields };
      this.setItem('cr_marketing', items);

      const supabase = getSupabaseClient();
      if (supabase && isUUID(id)) {
        try {
          await supabase.from('marketing_contents').update({
            title: items[idx].title,
            content_type: items[idx].content_type,
            scheduled_date: items[idx].scheduled_date,
            status: items[idx].status,
            asset_link: items[idx].asset_link || null,
            has_image_authorization: items[idx].has_image_authorization,
            notes: items[idx].notes || null,
            category: items[idx].category || null,
            script: items[idx].script || null,
            caption: items[idx].caption || null,
            hashtags: items[idx].hashtags || [],
            target_audience: items[idx].target_audience || null,
            hook: items[idx].hook || null,
            audio_suggestion: items[idx].audio_suggestion || null
          }).eq('id', id);
        } catch (e) {
          console.warn('Supabase update marketing content error:', e);
        }
      }

      await this.logAudit(actor, 'edicao', 'marketing', `Edição Post: ${items[idx].title}`, `Anterior: ${oldItem.title}`, `Novo: ${items[idx].title}`);
    }
  }

  public async deleteMarketingContent(id: string, actor: UserProfile | null) {
    const supabase = getSupabaseClient();
    if (supabase && isUUID(id)) {
      const { error } = await supabase.from('marketing_contents').delete().eq('id', id);
      if (error) {
        console.error('Erro ao excluir conteúdo de marketing no Supabase:', error.message);
        throw error;
      }
    }

    const items = this.getItem<MarketingContent>('cr_marketing');
    const target = items.find((i) => i.id === id);
    if (target) {
      const filtered = items.filter((i) => i.id !== id);
      this.setItem('cr_marketing', filtered);

      await this.logAudit(actor, 'exclusao', 'marketing', `Post Removido: ${target.title}`, undefined, undefined);
    }
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
    const localLogs = this.getItem<AuditLog>('cr_audit_logs');
    const supabase = getSupabaseClient();

    if (supabase) {
      try {
        const { data, error } = await supabase
          .from('audit_logs')
          .select('*')
          .order('created_at', { ascending: false });

        if (!error && data) {
          const remoteLogs = data as AuditLog[];
          const mergedMap = new Map<string, AuditLog>();

          // Populate with remote logs
          remoteLogs.forEach((r) => mergedMap.set(r.id, r));

          // Retain local logs not yet in remote, and push them to Supabase in background
          localLogs.forEach(async (l) => {
            if (!mergedMap.has(l.id)) {
              mergedMap.set(l.id, l);
              try {
                let finalUserId = toValidUuidOrNull(l.user_id);
                if (finalUserId) {
                  const { data: profileExists } = await supabase
                    .from('profiles')
                    .select('id')
                    .eq('id', finalUserId)
                    .maybeSingle();
                  if (!profileExists) {
                    finalUserId = null;
                  }
                }
                const res = await supabase.from('audit_logs').upsert([{
                  id: l.id,
                  user_id: finalUserId,
                  user_name: l.user_name || 'Sistema',
                  user_email: l.user_email || 'sistema@colegioreacaodf.com',
                  action: l.action,
                  module: l.module,
                  target_record: l.target_record,
                  old_value: l.old_value || null,
                  new_value: l.new_value || null,
                  ip_address: l.ip_address || null,
                  created_at: l.created_at
                }]);
                if (res?.error) {
                  console.warn('Erro ao sincronizar log de auditoria em background:', res.error.message);
                  if (res.error.message?.includes('Failed to fetch')) {
                    markSupabaseOffline(res.error.message);
                  }
                }
              } catch (err: any) {
                console.warn('Exceção ao sincronizar log de auditoria em background:', err?.message || err);
              }
            }
          });

          const mergedList = Array.from(mergedMap.values()).sort(
            (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
          );

          this.setItem('cr_audit_logs', mergedList, false);
          return mergedList;
        } else if (error) {
          if (error.message?.includes('Failed to fetch')) {
            markSupabaseOffline(error.message);
          }
        }
      } catch (err: any) {
        if (err?.message?.includes('Failed to fetch') || err?.name === 'TypeError') {
          markSupabaseOffline(err?.message || 'TypeError');
        }
      }
    }

    return localLogs.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }

  // --- NOTIFICATIONS ---
  public async getNotifications(userId: string, userRole?: UserRole): Promise<AppNotification[]> {
    const items = this.getItem<AppNotification>('cr_notifications');
    let userNotifs = items.filter((n) => n.user_id === userId || n.user_id === 'all');
    if (userRole === 'operador') {
      userNotifs = userNotifs.filter((n) => n.module === 'materiais');
    }
    return userNotifs;
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

  // --- TEACHERS (PROFESSORES) ---
  public async getTeachers(): Promise<any[]> {
    return this.fetchFromSupabaseOrCache<any>('teachers', 'cr_teachers', [], 'name', true);
  }

  public async saveTeachers(teachers: any[]): Promise<void> {
    this.setItem('cr_teachers', teachers);
    const supabase = getSupabaseClient();
    if (supabase) {
      try {
        for (const t of teachers) {
          const payload = {
            id: ensureValidUuid(t.id),
            name: t.name || 'Professor',
            subjects: t.subjects || [],
            groups: t.groups || [],
            workload_hours: t.workload_hours || 0,
            available_days: t.available_days || [],
            availability_shift: t.availability_shift || 'ambos',
            available_slots: t.available_slots || [],
            class_ids: t.class_ids || [],
            availability_grid: t.availability_grid || {},
            created_at: t.created_at || new Date().toISOString()
          };
          await supabase.from('teachers').upsert([payload]);
        }
      } catch (err) {
        console.warn('Erro ao salvar professores no Supabase:', err);
      }
    }
  }

  public async deleteTeacher(id: string): Promise<void> {
    const supabase = getSupabaseClient();
    if (supabase && isUUID(id)) {
      const { error } = await supabase.from('teachers').delete().eq('id', id);
      if (error) {
        console.error('Erro ao deletar professor no Supabase:', error.message);
        throw error;
      }
    }
    const items = this.getItem<any>('cr_teachers').filter(t => t.id !== id);
    this.setItem('cr_teachers', items);
  }

  // --- SUBJECTS (DISCIPLINAS) ---
  public async getSubjects(): Promise<any[]> {
    return this.fetchFromSupabaseOrCache<any>('subjects', 'cr_subjects', [], 'name', true);
  }

  public async saveSubjects(subjects: any[]): Promise<void> {
    this.setItem('cr_subjects', subjects);
    const supabase = getSupabaseClient();
    if (supabase) {
      try {
        for (const s of subjects) {
          const payload = {
            id: ensureValidUuid(s.id),
            name: s.name,
            created_at: s.created_at || new Date().toISOString()
          };
          await supabase.from('subjects').upsert([payload]);
        }
      } catch (err) {
        console.warn('Erro ao salvar disciplinas no Supabase:', err);
      }
    }
  }

  public async deleteSubject(id: string): Promise<void> {
    const supabase = getSupabaseClient();
    if (supabase && isUUID(id)) {
      const { error } = await supabase.from('subjects').delete().eq('id', id);
      if (error) {
        console.error('Erro ao deletar disciplina no Supabase:', error.message);
        throw error;
      }
    }
    const items = this.getItem<any>('cr_subjects').filter(s => s.id !== id);
    this.setItem('cr_subjects', items);
  }

  // --- CLASSES (TURMAS) ---
  public async getClasses(): Promise<any[]> {
    return this.fetchFromSupabaseOrCache<any>('classes', 'cr_classes', [], 'name', true);
  }

  public async saveClasses(classes: any[]): Promise<void> {
    this.setItem('cr_classes', classes);
    const supabase = getSupabaseClient();
    if (supabase) {
      try {
        for (const c of classes) {
          const payload = {
            id: ensureValidUuid(c.id),
            name: c.name || 'Turma',
            "group": c.group || 'anos_iniciais',
            subject_workloads: c.subject_workloads || {},
            shift: c.shift || 'ambos',
            created_at: c.created_at || new Date().toISOString()
          };
          await supabase.from('classes').upsert([payload]);
        }
      } catch (err) {
        console.warn('Erro ao salvar turmas no Supabase:', err);
      }
    }
  }

  public async deleteClass(id: string): Promise<void> {
    const supabase = getSupabaseClient();
    if (supabase && isUUID(id)) {
      const { error } = await supabase.from('classes').delete().eq('id', id);
      if (error) {
        console.error('Erro ao deletar turma no Supabase:', error.message);
        throw error;
      }
    }
    const items = this.getItem<any>('cr_classes').filter(c => c.id !== id);
    this.setItem('cr_classes', items);
  }

  // --- SCHEDULE SLOTS ---
  public async getScheduleSlots(): Promise<any[]> {
    const slots = await this.fetchFromSupabaseOrCache<any>('schedule_slots', 'cr_schedule_slots', [], 'day_of_week', true);
    // Deduplicate slots by class_id + day_of_week + start_time to prevent any overlap/accumulation
    const seen = new Set<string>();
    const uniqueSlots: any[] = [];
    for (const s of slots) {
      const key = `${s.class_id || 'all'}_${s.day_of_week || 'segunda'}_${s.start_time || '07:15'}`;
      if (!seen.has(key)) {
        seen.add(key);
        uniqueSlots.push(s);
      }
    }
    return uniqueSlots;
  }

  public async saveScheduleSlots(slots: any[]): Promise<void> {
    // Deduplicate before saving
    const seen = new Set<string>();
    const uniqueSlots: any[] = [];
    for (const s of slots) {
      const key = `${s.class_id || 'all'}_${s.day_of_week || 'segunda'}_${s.start_time || '07:15'}`;
      if (!seen.has(key)) {
        seen.add(key);
        uniqueSlots.push(s);
      }
    }

    this.setItem('cr_schedule_slots', uniqueSlots);
    const supabase = getSupabaseClient();
    if (supabase) {
      try {
        const activeIds = uniqueSlots.map(s => ensureValidUuid(s.id));
        
        // Retrieve all existing slot IDs from Supabase to find orphaned ones
        const { data: existingRows, error: fetchErr } = await supabase.from('schedule_slots').select('id');
        if (!fetchErr && existingRows) {
          const existingIds = existingRows.map((r: any) => r.id);
          const idsToDelete = existingIds.filter((id: string) => !activeIds.includes(id));
          if (idsToDelete.length > 0) {
            await supabase.from('schedule_slots').delete().in('id', idsToDelete);
          }
        } else if (activeIds.length === 0) {
          // If fetch failed or we have no active slots, do a general fallback clear
          await supabase.from('schedule_slots').delete().neq('id', '00000000-0000-0000-0000-000000000000');
        }

        // Upsert current slots
        for (const s of uniqueSlots) {
          const payload = {
            id: ensureValidUuid(s.id),
            class_id: toValidUuidOrNull(s.class_id),
            teacher_id: toValidUuidOrNull(s.teacher_id),
            subject: s.subject || 'Aula',
            day_of_week: s.day_of_week || 'segunda',
            start_time: s.start_time || '07:15',
            end_time: s.end_time || '08:05'
          };
          await supabase.from('schedule_slots').upsert([payload]);
        }
      } catch (err) {
        console.warn('Erro ao salvar slots de horários no Supabase:', err);
      }
    }
  }

  // --- TIME BLOCKS ---
  public async getTimeBlocks(): Promise<any[]> {
    const blocks = await this.fetchFromSupabaseOrCache<any>('time_blocks', 'cr_time_blocks', [], 'start_time', true);
    // Deduplicate blocks by class_id + start_time to prevent any accumulation of duplicate records
    const seen = new Set<string>();
    const uniqueBlocks: any[] = [];
    for (const b of blocks) {
      const key = `${b.class_id || 'all'}_${b.start_time || '07:15'}`;
      if (!seen.has(key)) {
        seen.add(key);
        uniqueBlocks.push(b);
      }
    }
    return uniqueBlocks;
  }

  public async saveTimeBlocks(blocks: any[]): Promise<void> {
    // Deduplicate blocks before saving to avoid duplicate accumulation in local cache and DB
    const seen = new Set<string>();
    const uniqueBlocks: any[] = [];
    for (const b of blocks) {
      const key = `${b.class_id || 'all'}_${b.start_time || '07:15'}`;
      if (!seen.has(key)) {
        seen.add(key);
        uniqueBlocks.push(b);
      }
    }

    this.setItem('cr_time_blocks', uniqueBlocks);
    const supabase = getSupabaseClient();
    if (supabase) {
      try {
        const activeIds = uniqueBlocks.map(b => ensureValidUuid(b.id));
        
        // Retrieve all existing time_blocks IDs from Supabase to find orphaned ones
        const { data: existingRows, error: fetchErr } = await supabase.from('time_blocks').select('id');
        if (!fetchErr && existingRows) {
          const existingIds = existingRows.map((r: any) => r.id);
          const idsToDelete = existingIds.filter((id: string) => !activeIds.includes(id));
          if (idsToDelete.length > 0) {
            await supabase.from('time_blocks').delete().in('id', idsToDelete);
          }
        } else if (activeIds.length === 0) {
          // General fallback clear
          await supabase.from('time_blocks').delete().neq('id', '00000000-0000-0000-0000-000000000000');
        }

        // Upsert current blocks
        for (const tb of uniqueBlocks) {
          const payload = {
            id: ensureValidUuid(tb.id),
            class_id: toValidUuidOrNull(tb.class_id),
            start_time: tb.start_time || '07:15',
            end_time: tb.end_time || '08:05',
            is_interval: tb.is_interval || false
          };
          await supabase.from('time_blocks').upsert([payload]);
        }
      } catch (err) {
        console.warn('Erro ao salvar blocos de horários no Supabase:', err);
      }
    }
  }

  // --- CLEAR ALL SCHEDULE DATA ---
  public async clearAllScheduleData(): Promise<void> {
    localStorage.removeItem('cr_teachers');
    localStorage.removeItem('cr_classes');
    localStorage.removeItem('cr_schedule_slots');
    localStorage.removeItem('cr_time_blocks');
    localStorage.removeItem('cr_subjects');
    localStorage.setItem('cr_teachers', JSON.stringify([]));
    localStorage.setItem('cr_classes', JSON.stringify([]));
    localStorage.setItem('cr_schedule_slots', JSON.stringify([]));
    localStorage.setItem('cr_time_blocks', JSON.stringify([]));
    localStorage.setItem('cr_subjects', JSON.stringify([]));

    const supabase = getSupabaseClient();
    if (supabase) {
      try {
        await supabase.from('schedule_slots').delete().neq('id', '00000000-0000-0000-0000-000000000000');
        await supabase.from('time_blocks').delete().neq('id', '00000000-0000-0000-0000-000000000000');
        await supabase.from('teachers').delete().neq('id', '00000000-0000-0000-0000-000000000000');
        await supabase.from('classes').delete().neq('id', '00000000-0000-0000-0000-000000000000');
        await supabase.from('subjects').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      } catch (err) {
        console.warn('Erro ao limpar tabelas de horários no Supabase:', err);
      }
    }
    this.notify();
  }

  // --- FORCE SYNC LOCAL DATA TO SUPABASE ---
  public async syncAllToSupabase(): Promise<{ success: boolean; count: number; error?: string }> {
    const supabase = getSupabaseClient();
    if (!supabase) {
      return {
        success: false,
        count: 0,
        error: 'Supabase não está configurado. Insira a URL e a Anon Key válidas primeiro.'
      };
    }

    try {
      let count = 0;

      // 1. Profiles
      const profiles = this.getItem<UserProfile>('cr_profiles');
      for (const p of profiles) {
        const payload = {
          id: ensureValidUuid(p.id),
          email: p.email.toLowerCase(),
          full_name: p.full_name,
          role: p.role,
          department: p.department || 'Geral',
          avatar_url: p.avatar_url || null,
          password: p.password || '123456',
          is_active: p.is_active,
          created_at: p.created_at || new Date().toISOString()
        };
        const { error } = await supabase.from('profiles').upsert([payload]);
        if (!error) count++;
      }

      // 2. Equipments
      const equipments = this.getItem<Equipment>('cr_equipment');
      for (const eq of equipments) {
        const payload = {
          id: ensureValidUuid(eq.id),
          name: eq.name,
          type: eq.type,
          asset_number: eq.asset_number,
          room_location: eq.room_location,
          acquisition_date: eq.acquisition_date || new Date().toISOString().split('T')[0],
          warranty_until: eq.warranty_until || null,
          status: eq.status,
          notes: eq.notes || null,
          foto_url: eq.foto_url || null,
          created_at: eq.created_at || new Date().toISOString()
        };
        const { error } = await supabase.from('equipments').upsert([payload]);
        if (!error) count++;
      }

      // 3. Service Orders
      const serviceOrders = this.getItem<ServiceOrder>('cr_service_orders');
      for (const so of serviceOrders) {
        const payload = {
          id: ensureValidUuid(so.id),
          title: so.title,
          description: so.description,
          category: so.category,
          priority: so.priority,
          status: so.status,
          sector: so.sector,
          location: so.location || null,
          observation: so.observation || null,
          equipment_id: toValidUuidOrNull(so.equipment_id),
          equipment_name: so.equipment_name || null,
          assigned_to: toValidUuidOrNull(so.assigned_to),
          assigned_to_name: so.assigned_to_name || null,
          created_by: toValidUuidOrNull(so.created_by),
          created_by_name: so.created_by_name || 'Sistema',
          photo_url: so.photo_url || null,
          foto_abertura_url: so.foto_abertura_url || null,
          foto_conclusao_url: so.foto_conclusao_url || null,
          concluded_at: so.concluded_at || null,
          concluded_notes: so.concluded_notes || null,
          cost: so.cost || 0,
          comments: so.comments || [],
          created_at: so.created_at || new Date().toISOString(),
          updated_at: so.updated_at || new Date().toISOString()
        };
        const { error } = await supabase.from('service_orders').upsert([payload]);
        if (!error) count++;
      }

      // 4. Material Requests
      const materialReqs = this.getItem<MaterialRequest>('cr_material_requests');
      for (const mr of materialReqs) {
        const payload = {
          id: ensureValidUuid(mr.id),
          title: mr.title,
          requested_by: toValidUuidOrNull(mr.requested_by),
          requested_by_name: mr.requested_by_name || 'Solicitante',
          sector: mr.sector,
          urgency: mr.urgency,
          justification: mr.justification,
          items: mr.items || [],
          status: mr.status,
          reviewed_by: toValidUuidOrNull(mr.reviewed_by),
          reviewed_by_name: mr.reviewed_by_name || null,
          review_notes: mr.review_notes || null,
          created_at: mr.created_at || new Date().toISOString()
        };
        const { error } = await supabase.from('material_requests').upsert([payload]);
        if (!error) count++;
      }

      // 5. Marketing
      const mktContents = this.getItem<MarketingContent>('cr_marketing');
      for (const mc of mktContents) {
        const payload = {
          id: ensureValidUuid(mc.id),
          title: mc.title,
          content_type: mc.content_type,
          scheduled_date: mc.scheduled_date,
          status: mc.status,
          has_image_authorization: mc.has_image_authorization,
          assigned_to_name: (mc as any).assigned_to_name || null,
          attachment_url: (mc as any).attachment_url || null,
          notes: mc.notes || null,
          created_at: mc.created_at || new Date().toISOString()
        };
        const { error } = await supabase.from('marketing_contents').upsert([payload]);
        if (!error) count++;
      }

      // 6. Tech Tickets
      const tickets = this.getItem<TechTicket>('cr_tech_tickets');
      for (const t of tickets) {
        const payload = {
          id: ensureValidUuid(t.id),
          title: t.title,
          description: t.description,
          category: t.category,
          priority: t.priority,
          status: t.status,
          requester_id: toValidUuidOrNull(t.requester_id),
          requester_name: t.requester_name || 'Solicitante',
          sector: t.sector,
          assigned_to: toValidUuidOrNull(t.assigned_to),
          assigned_to_name: t.assigned_to_name || null,
          attachment_url: t.attachment_url || null,
          resolution_notes: t.resolution_notes || null,
          created_at: t.created_at || new Date().toISOString(),
          updated_at: t.updated_at || new Date().toISOString()
        };
        const { error } = await supabase.from('tech_tickets').upsert([payload]);
        if (!error) count++;
      }

      // 7. Audit Logs
      const auditLogs = this.getItem<AuditLog>('cr_audit_logs');
      for (const al of auditLogs) {
        try {
          let finalUserId = toValidUuidOrNull(al.user_id);
          if (finalUserId) {
            const { data: profileExists } = await supabase
              .from('profiles')
              .select('id')
              .eq('id', finalUserId)
              .maybeSingle();
            if (!profileExists) {
              finalUserId = null;
            }
          }
          const payload = {
            id: ensureValidUuid(al.id),
            user_id: finalUserId,
            user_name: al.user_name || 'Sistema',
            user_email: al.user_email || 'sistema@colegioreacaodf.com',
            action: al.action,
            module: al.module,
            target_record: al.target_record,
            old_value: al.old_value || null,
            new_value: al.new_value || null,
            ip_address: al.ip_address || null,
            created_at: al.created_at || new Date().toISOString()
          };
          const { error } = await supabase.from('audit_logs').upsert([payload]);
          if (!error) count++;
          else {
            console.warn('Erro ao sincronizar log de auditoria no syncLocalDataToSupabase:', error.message);
          }
        } catch (err: any) {
          console.warn('Exceção ao sincronizar log de auditoria no syncLocalDataToSupabase:', err?.message || err);
        }
      }

      // 8. Teachers
      const teachers = this.getItem<any>('cr_teachers');
      for (const t of teachers) {
        const payload = {
          id: ensureValidUuid(t.id),
          name: t.name || 'Professor',
          subjects: t.subjects || [],
          groups: t.groups || [],
          workload_hours: t.workload_hours || 0,
          available_days: t.available_days || [],
          availability_shift: t.availability_shift || 'ambos',
          created_at: t.created_at || new Date().toISOString()
        };
        const { error } = await supabase.from('teachers').upsert([payload]);
        if (!error) count++;
      }

      // 9. Classes
      const classes = this.getItem<any>('cr_classes');
      for (const c of classes) {
        const payload = {
          id: ensureValidUuid(c.id),
          name: c.name || 'Turma',
          "group": c.group || 'anos_iniciais',
          subject_workloads: c.subject_workloads || {},
          shift: c.shift || 'ambos',
          created_at: c.created_at || new Date().toISOString()
        };
        const { error } = await supabase.from('classes').upsert([payload]);
        if (!error) count++;
      }

      // 10. Schedule Slots
      const slots = this.getItem<any>('cr_schedule_slots');
      for (const s of slots) {
        const payload = {
          id: ensureValidUuid(s.id),
          class_id: toValidUuidOrNull(s.class_id),
          teacher_id: toValidUuidOrNull(s.teacher_id),
          subject: s.subject || 'Aula',
          day_of_week: s.day_of_week || 'segunda',
          start_time: s.start_time || '07:15',
          end_time: s.end_time || '08:05'
        };
        const { error } = await supabase.from('schedule_slots').upsert([payload]);
        if (!error) count++;
      }

      // 11. Time Blocks
      const blocks = this.getItem<any>('cr_time_blocks');
      for (const tb of blocks) {
        const payload = {
          id: ensureValidUuid(tb.id),
          class_id: toValidUuidOrNull(tb.class_id),
          start_time: tb.start_time || '07:15',
          end_time: tb.end_time || '08:05',
          is_interval: tb.is_interval || false
        };
        const { error } = await supabase.from('time_blocks').upsert([payload]);
        if (!error) count++;
      }

      resetSupabaseOfflineStatus();
      this.notify();
      return { success: true, count };
    } catch (err: any) {
      console.error('Erro na sincronização completa:', err);
      return {
        success: false,
        count: 0,
        error: err?.message || 'Erro ao sincronizar dados com Supabase.'
      };
    }
  }
}

export const storage = new StorageService();
