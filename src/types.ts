export type UserRole = 'super_admin' | 'admin' | 'operador';

export interface UserProfile {
  id: string;
  email: string;
  full_name: string;
  role: UserRole;
  department: string;
  avatar_url?: string;
  is_active: boolean;
  created_at: string;
  password?: string;
}

export type OSStatus = 'aberta' | 'em_andamento' | 'aguardando_peca' | 'concluida' | 'cancelada';
export type OSPriority = 'baixa' | 'media' | 'alta' | 'urgente';
export type OSCategory = 'eletrica' | 'hidraulica' | 'TI' | 'predial' | 'mobiliario' | 'outro';

export interface OSComment {
  id: string;
  user_name: string;
  user_avatar?: string;
  comment: string;
  created_at: string;
}

export interface ServiceOrder {
  id: string;
  title: string;
  description: string;
  category: OSCategory;
  priority: OSPriority;
  status: OSStatus;
  sector: string;
  location?: string;
  observation?: string;
  equipment_id?: string;
  equipment_name?: string;
  assigned_to?: string;
  assigned_to_name?: string;
  created_by: string;
  created_by_name: string;
  photo_url?: string;
  foto_abertura_url?: string;
  foto_conclusao_url?: string;
  concluded_at?: string;
  concluded_notes?: string;
  comments: OSComment[];
  created_at: string;
  updated_at: string;
}

export type EquipmentStatus = 'ativo' | 'emprestado' | 'manutencao' | 'baixado';

export interface Equipment {
  id: string;
  name: string;
  type: string;
  asset_number: string; // nº patrimônio
  room_location: string;
  acquisition_date: string;
  warranty_until: string;
  status: EquipmentStatus;
  notes?: string;
  foto_url?: string;
  created_at: string;
}

export type EquipmentLoanStatus = 'em_aberto' | 'concluido';

export interface EquipmentLoan {
  id: string;
  equipment_id: string;
  equipment_name?: string;
  funcionario_id?: string;
  funcionario_nome: string;
  data_retirada: string;
  observacao_retirada?: string;
  assinatura_retirada_url?: string;
  data_devolucao?: string;
  observacao_devolucao?: string;
  assinatura_devolucao_url?: string;
  status: EquipmentLoanStatus;
  created_at: string;
}

export type MaterialRequestStatus = 'pendente' | 'aprovado' | 'reprovado' | 'entregue';

export interface MaterialItem {
  id: string;
  name: string;
  quantity: number;
  unit: string;
}

export interface MaterialRequest {
  id: string;
  title: string;
  requested_by: string;
  requested_by_name: string;
  sector: string;
  urgency: OSPriority;
  justification: string;
  items: MaterialItem[];
  status: MaterialRequestStatus;
  reviewed_by?: string;
  reviewed_by_name?: string;
  review_notes?: string;
  created_at: string;
}

export type MarketingContentType = 'carrossel' | 'story' | 'reels' | 'post_estatico';
export type MarketingStatus = 'ideia' | 'producao' | 'aprovacao' | 'publicado';

export interface MarketingContent {
  id: string;
  title: string;
  content_type: MarketingContentType;
  scheduled_date: string;
  status: MarketingStatus;
  responsible_id?: string;
  responsible_name?: string;
  asset_link?: string;
  has_image_authorization: boolean; // LGPD/ECA check
  notes?: string;
  created_at: string;
}

export interface MarketingMetric {
  id: string;
  period_label: string;
  instagram_reach: number;
  engagement_rate: number;
  followers_gained: number;
  leads_generated: number;
  notes?: string;
  created_at: string;
}

export type TicketCategory = 'hardware' | 'software' | 'rede' | 'acesso_login' | 'outro';
export type TicketStatus = 'aberto' | 'em_atendimento' | 'resolvido' | 'fechado';

export interface TechTicket {
  id: string;
  title: string;
  description: string;
  category: TicketCategory;
  priority: OSPriority;
  status: TicketStatus;
  requester_id: string;
  requester_name: string;
  sector: string;
  assigned_to?: string;
  assigned_to_name?: string;
  attachment_url?: string;
  resolution_notes?: string;
  created_at: string;
  updated_at: string;
}

export interface FaqItem {
  id: string;
  question: string;
  answer: string;
  category: string;
  tags: string[];
}

export type AuditAction = 'criacao' | 'edicao' | 'exclusao' | 'mudanca_status' | 'mudanca_role' | 'login' | 'aprovacao';
export type AuditModule = 'ordens_servico' | 'equipamentos' | 'materiais' | 'marketing' | 'suporte_tecnico' | 'usuarios' | 'configuracoes';

export interface AuditLog {
  id: string;
  user_id: string;
  user_name: string;
  user_email: string;
  action: AuditAction;
  module: AuditModule;
  target_record: string;
  old_value?: string;
  new_value?: string;
  ip_address?: string;
  created_at: string;
}

export interface AppNotification {
  id: string;
  user_id: string;
  title: string;
  body: string;
  module: AuditModule;
  target_id?: string;
  is_read: boolean;
  created_at: string;
}

export interface SupabaseConfig {
  url: string;
  anonKey: string;
  isConfigured: boolean;
}
