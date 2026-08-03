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
  AppNotification
} from '../types';

// DADOS INICIAIS LIMPOS - SEM EXEMPLOS MOCK
export const INITIAL_PROFILES: UserProfile[] = [];

export const INITIAL_EQUIPMENT: Equipment[] = [];

export const INITIAL_EQUIPMENT_LOANS: EquipmentLoan[] = [];

export const INITIAL_SERVICE_ORDERS: ServiceOrder[] = [];

export const INITIAL_MATERIAL_REQUESTS: MaterialRequest[] = [];

export const INITIAL_MARKETING_CONTENT: MarketingContent[] = [];

export const INITIAL_MARKETING_METRICS: MarketingMetric[] = [];

export const INITIAL_TECH_TICKETS: TechTicket[] = [];

export const INITIAL_FAQ_ITEMS: FaqItem[] = [];

export const INITIAL_AUDIT_LOGS: AuditLog[] = [];

export const INITIAL_NOTIFICATIONS: AppNotification[] = [];

export const SUPABASE_SQL_SCHEMA = `-- ============================================================
-- SCRIPT REFACTORADO & COMPLETO DE BANCO DE DADOS (SUPABASE SQL EDITOR)
-- Sistema de Gestão Interna - Colégio Reação (Recanto das Emas, DF)
-- Resoluções: Not NULL violation (PostgreSQL 23502), UUID defaults e RLS
-- ============================================================

-- OPTIONAL: SE DESEJAR RECRIAR TODAS AS TABELAS DO ZERO (DESCOMENTE AS LINHAS ABAIXO):
/*
DROP TABLE IF EXISTS public.push_subscriptions CASCADE;
DROP TABLE IF EXISTS public.notifications CASCADE;
DROP TABLE IF EXISTS public.audit_logs CASCADE;
DROP TABLE IF EXISTS public.faq_items CASCADE;
DROP TABLE IF EXISTS public.tech_tickets CASCADE;
DROP TABLE IF EXISTS public.marketing_metrics CASCADE;
DROP TABLE IF EXISTS public.marketing_contents CASCADE;
DROP TABLE IF EXISTS public.material_requests CASCADE;
DROP TABLE IF EXISTS public.service_orders CASCADE;
DROP TABLE IF EXISTS public.emprestimos_equipamentos CASCADE;
DROP TABLE IF EXISTS public.equipments CASCADE;
DROP TABLE IF EXISTS public.profiles CASCADE;
*/

-- 1. EXTENSÕES & TIPOS ENUM
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

DO $$ BEGIN
    CREATE TYPE user_role AS ENUM ('super_admin', 'admin', 'operador');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE os_status AS ENUM ('aberta', 'em_andamento', 'aguardando_peca', 'concluida', 'cancelada');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE os_priority AS ENUM ('baixa', 'media', 'alta', 'urgente');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE os_category AS ENUM ('eletrica', 'hidraulica', 'TI', 'predial', 'mobiliario', 'outro');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE equipment_status AS ENUM ('ativo', 'emprestado', 'manutencao', 'baixado');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE material_status AS ENUM ('pendente', 'aprovado', 'reprovado', 'entregue');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE mkt_content_type AS ENUM ('carrossel', 'story', 'reels', 'post_estatico');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE mkt_status AS ENUM ('ideia', 'producao', 'aprovacao', 'publicado');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE ticket_category AS ENUM ('hardware', 'software', 'rede', 'acesso_login', 'outro');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE ticket_status AS ENUM ('aberto', 'em_atendimento', 'resolvido', 'fechado');
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- 2. ALTERAÇÃO DE TABELAS EXISTENTES (REMOVE NOT NULL E ADICIONA DEFAULTS PARA CORRIGIR ERRO 23502)
DO $$ BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'profiles') THEN
    ALTER TABLE public.profiles ALTER COLUMN email DROP NOT NULL;
    ALTER TABLE public.profiles ALTER COLUMN full_name DROP NOT NULL;
    ALTER TABLE public.profiles ALTER COLUMN full_name SET DEFAULT '';
    ALTER TABLE public.profiles ALTER COLUMN role DROP NOT NULL;
    ALTER TABLE public.profiles ALTER COLUMN role SET DEFAULT 'operador'::user_role;
    ALTER TABLE public.profiles ALTER COLUMN department DROP NOT NULL;
    ALTER TABLE public.profiles ALTER COLUMN department SET DEFAULT 'Geral';
    ALTER TABLE public.profiles ALTER COLUMN is_active DROP NOT NULL;
    ALTER TABLE public.profiles ALTER COLUMN is_active SET DEFAULT true;
    ALTER TABLE public.profiles ALTER COLUMN created_at DROP NOT NULL;
    ALTER TABLE public.profiles ALTER COLUMN created_at SET DEFAULT NOW();
  END IF;

  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'equipments') THEN
    ALTER TABLE public.equipments ALTER COLUMN name DROP NOT NULL;
    ALTER TABLE public.equipments ALTER COLUMN name SET DEFAULT 'Equipamento';
    ALTER TABLE public.equipments ALTER COLUMN type DROP NOT NULL;
    ALTER TABLE public.equipments ALTER COLUMN type SET DEFAULT 'Outro';
    ALTER TABLE public.equipments ALTER COLUMN asset_number DROP NOT NULL;
    ALTER TABLE public.equipments ALTER COLUMN room_location DROP NOT NULL;
    ALTER TABLE public.equipments ALTER COLUMN room_location SET DEFAULT 'Almoxarifado';
    ALTER TABLE public.equipments ALTER COLUMN acquisition_date DROP NOT NULL;
    ALTER TABLE public.equipments ALTER COLUMN acquisition_date SET DEFAULT CURRENT_DATE;
    ALTER TABLE public.equipments ALTER COLUMN warranty_until DROP NOT NULL;
    ALTER TABLE public.equipments ALTER COLUMN status DROP NOT NULL;
    ALTER TABLE public.equipments ALTER COLUMN status SET DEFAULT 'ativo'::equipment_status;
    ALTER TABLE public.equipments ALTER COLUMN created_at DROP NOT NULL;
    ALTER TABLE public.equipments ALTER COLUMN created_at SET DEFAULT NOW();
  END IF;

  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'emprestimos_equipamentos') THEN
    ALTER TABLE public.emprestimos_equipamentos ALTER COLUMN equipment_id DROP NOT NULL;
    ALTER TABLE public.emprestimos_equipamentos ALTER COLUMN funcionario_nome DROP NOT NULL;
    ALTER TABLE public.emprestimos_equipamentos ALTER COLUMN funcionario_nome SET DEFAULT 'Funcionário';
    ALTER TABLE public.emprestimos_equipamentos ALTER COLUMN data_retirada DROP NOT NULL;
    ALTER TABLE public.emprestimos_equipamentos ALTER COLUMN data_retirada SET DEFAULT NOW();
    ALTER TABLE public.emprestimos_equipamentos ALTER COLUMN status DROP NOT NULL;
    ALTER TABLE public.emprestimos_equipamentos ALTER COLUMN status SET DEFAULT 'em_aberto';
    ALTER TABLE public.emprestimos_equipamentos ALTER COLUMN created_at DROP NOT NULL;
    ALTER TABLE public.emprestimos_equipamentos ALTER COLUMN created_at SET DEFAULT NOW();
  END IF;

  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'service_orders') THEN
    ALTER TABLE public.service_orders ALTER COLUMN title DROP NOT NULL;
    ALTER TABLE public.service_orders ALTER COLUMN title SET DEFAULT 'Ordem de Serviço';
    ALTER TABLE public.service_orders ALTER COLUMN description DROP NOT NULL;
    ALTER TABLE public.service_orders ALTER COLUMN description SET DEFAULT '';
    ALTER TABLE public.service_orders ALTER COLUMN category DROP NOT NULL;
    ALTER TABLE public.service_orders ALTER COLUMN category SET DEFAULT 'outro'::os_category;
    ALTER TABLE public.service_orders ALTER COLUMN priority DROP NOT NULL;
    ALTER TABLE public.service_orders ALTER COLUMN priority SET DEFAULT 'media'::os_priority;
    ALTER TABLE public.service_orders ALTER COLUMN status DROP NOT NULL;
    ALTER TABLE public.service_orders ALTER COLUMN status SET DEFAULT 'aberta'::os_status;
    ALTER TABLE public.service_orders ALTER COLUMN sector DROP NOT NULL;
    ALTER TABLE public.service_orders ALTER COLUMN sector SET DEFAULT 'Geral';
    ALTER TABLE public.service_orders ALTER COLUMN created_by_name DROP NOT NULL;
    ALTER TABLE public.service_orders ALTER COLUMN created_by_name SET DEFAULT 'Sistema';
    ALTER TABLE public.service_orders ALTER COLUMN comments DROP NOT NULL;
    ALTER TABLE public.service_orders ALTER COLUMN comments SET DEFAULT '[]'::jsonb;
    ALTER TABLE public.service_orders ALTER COLUMN created_at DROP NOT NULL;
    ALTER TABLE public.service_orders ALTER COLUMN created_at SET DEFAULT NOW();
    ALTER TABLE public.service_orders ALTER COLUMN updated_at DROP NOT NULL;
    ALTER TABLE public.service_orders ALTER COLUMN updated_at SET DEFAULT NOW();
  END IF;

  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'material_requests') THEN
    ALTER TABLE public.material_requests ALTER COLUMN title DROP NOT NULL;
    ALTER TABLE public.material_requests ALTER COLUMN title SET DEFAULT 'Requisição de Material';
    ALTER TABLE public.material_requests ALTER COLUMN requested_by_name DROP NOT NULL;
    ALTER TABLE public.material_requests ALTER COLUMN requested_by_name SET DEFAULT 'Solicitante';
    ALTER TABLE public.material_requests ALTER COLUMN sector DROP NOT NULL;
    ALTER TABLE public.material_requests ALTER COLUMN sector SET DEFAULT 'Geral';
    ALTER TABLE public.material_requests ALTER COLUMN urgency DROP NOT NULL;
    ALTER TABLE public.material_requests ALTER COLUMN urgency SET DEFAULT 'media'::os_priority;
    ALTER TABLE public.material_requests ALTER COLUMN justification DROP NOT NULL;
    ALTER TABLE public.material_requests ALTER COLUMN justification SET DEFAULT '';
    ALTER TABLE public.material_requests ALTER COLUMN items DROP NOT NULL;
    ALTER TABLE public.material_requests ALTER COLUMN items SET DEFAULT '[]'::jsonb;
    ALTER TABLE public.material_requests ALTER COLUMN status DROP NOT NULL;
    ALTER TABLE public.material_requests ALTER COLUMN status SET DEFAULT 'pendente'::material_status;
    ALTER TABLE public.material_requests ALTER COLUMN created_at DROP NOT NULL;
    ALTER TABLE public.material_requests ALTER COLUMN created_at SET DEFAULT NOW();
  END IF;

  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'marketing_contents') THEN
    ALTER TABLE public.marketing_contents ALTER COLUMN title DROP NOT NULL;
    ALTER TABLE public.marketing_contents ALTER COLUMN title SET DEFAULT 'Conteúdo';
    ALTER TABLE public.marketing_contents ALTER COLUMN content_type DROP NOT NULL;
    ALTER TABLE public.marketing_contents ALTER COLUMN content_type SET DEFAULT 'post_estatico'::mkt_content_type;
    ALTER TABLE public.marketing_contents ALTER COLUMN scheduled_date DROP NOT NULL;
    ALTER TABLE public.marketing_contents ALTER COLUMN scheduled_date SET DEFAULT CURRENT_DATE;
    ALTER TABLE public.marketing_contents ALTER COLUMN status DROP NOT NULL;
    ALTER TABLE public.marketing_contents ALTER COLUMN status SET DEFAULT 'ideia'::mkt_status;
    ALTER TABLE public.marketing_contents ALTER COLUMN has_image_authorization DROP NOT NULL;
    ALTER TABLE public.marketing_contents ALTER COLUMN has_image_authorization SET DEFAULT false;
    ALTER TABLE public.marketing_contents ALTER COLUMN created_at DROP NOT NULL;
    ALTER TABLE public.marketing_contents ALTER COLUMN created_at SET DEFAULT NOW();
  END IF;

  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'marketing_metrics') THEN
    ALTER TABLE public.marketing_metrics ALTER COLUMN period_label DROP NOT NULL;
    ALTER TABLE public.marketing_metrics ALTER COLUMN period_label SET DEFAULT 'Período';
    ALTER TABLE public.marketing_metrics ALTER COLUMN instagram_reach DROP NOT NULL;
    ALTER TABLE public.marketing_metrics ALTER COLUMN instagram_reach SET DEFAULT 0;
    ALTER TABLE public.marketing_metrics ALTER COLUMN engagement_rate DROP NOT NULL;
    ALTER TABLE public.marketing_metrics ALTER COLUMN engagement_rate SET DEFAULT 0.0;
    ALTER TABLE public.marketing_metrics ALTER COLUMN followers_gained DROP NOT NULL;
    ALTER TABLE public.marketing_metrics ALTER COLUMN followers_gained SET DEFAULT 0;
    ALTER TABLE public.marketing_metrics ALTER COLUMN leads_generated DROP NOT NULL;
    ALTER TABLE public.marketing_metrics ALTER COLUMN leads_generated SET DEFAULT 0;
    ALTER TABLE public.marketing_metrics ALTER COLUMN created_at DROP NOT NULL;
    ALTER TABLE public.marketing_metrics ALTER COLUMN created_at SET DEFAULT NOW();
  END IF;

  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'tech_tickets') THEN
    ALTER TABLE public.tech_tickets ALTER COLUMN title DROP NOT NULL;
    ALTER TABLE public.tech_tickets ALTER COLUMN title SET DEFAULT 'Chamado Técnico';
    ALTER TABLE public.tech_tickets ALTER COLUMN description DROP NOT NULL;
    ALTER TABLE public.tech_tickets ALTER COLUMN description SET DEFAULT '';
    ALTER TABLE public.tech_tickets ALTER COLUMN category DROP NOT NULL;
    ALTER TABLE public.tech_tickets ALTER COLUMN category SET DEFAULT 'outro'::ticket_category;
    ALTER TABLE public.tech_tickets ALTER COLUMN priority DROP NOT NULL;
    ALTER TABLE public.tech_tickets ALTER COLUMN priority SET DEFAULT 'media'::os_priority;
    ALTER TABLE public.tech_tickets ALTER COLUMN status DROP NOT NULL;
    ALTER TABLE public.tech_tickets ALTER COLUMN status SET DEFAULT 'aberto'::ticket_status;
    ALTER TABLE public.tech_tickets ALTER COLUMN requester_name DROP NOT NULL;
    ALTER TABLE public.tech_tickets ALTER COLUMN requester_name SET DEFAULT 'Solicitante';
    ALTER TABLE public.tech_tickets ALTER COLUMN sector DROP NOT NULL;
    ALTER TABLE public.tech_tickets ALTER COLUMN sector SET DEFAULT 'Geral';
    ALTER TABLE public.tech_tickets ALTER COLUMN created_at DROP NOT NULL;
    ALTER TABLE public.tech_tickets ALTER COLUMN created_at SET DEFAULT NOW();
  END IF;

  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'faq_items') THEN
    ALTER TABLE public.faq_items ALTER COLUMN question DROP NOT NULL;
    ALTER TABLE public.faq_items ALTER COLUMN question SET DEFAULT '';
    ALTER TABLE public.faq_items ALTER COLUMN answer DROP NOT NULL;
    ALTER TABLE public.faq_items ALTER COLUMN answer SET DEFAULT '';
    ALTER TABLE public.faq_items ALTER COLUMN category DROP NOT NULL;
    ALTER TABLE public.faq_items ALTER COLUMN category SET DEFAULT 'geral';
    ALTER TABLE public.faq_items ALTER COLUMN tags DROP NOT NULL;
    ALTER TABLE public.faq_items ALTER COLUMN tags SET DEFAULT '{}';
    ALTER TABLE public.faq_items ALTER COLUMN created_at DROP NOT NULL;
    ALTER TABLE public.faq_items ALTER COLUMN created_at SET DEFAULT NOW();
  END IF;

  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'audit_logs') THEN
    ALTER TABLE public.audit_logs ALTER COLUMN user_name DROP NOT NULL;
    ALTER TABLE public.audit_logs ALTER COLUMN user_name SET DEFAULT 'Sistema';
    ALTER TABLE public.audit_logs ALTER COLUMN user_email DROP NOT NULL;
    ALTER TABLE public.audit_logs ALTER COLUMN user_email SET DEFAULT 'sistema@colegioreacaodf.com';
    ALTER TABLE public.audit_logs ALTER COLUMN action DROP NOT NULL;
    ALTER TABLE public.audit_logs ALTER COLUMN action SET DEFAULT 'acao';
    ALTER TABLE public.audit_logs ALTER COLUMN module DROP NOT NULL;
    ALTER TABLE public.audit_logs ALTER COLUMN module SET DEFAULT 'sistema';
    ALTER TABLE public.audit_logs ALTER COLUMN target_record DROP NOT NULL;
    ALTER TABLE public.audit_logs ALTER COLUMN target_record SET DEFAULT '';
    ALTER TABLE public.audit_logs ALTER COLUMN created_at DROP NOT NULL;
    ALTER TABLE public.audit_logs ALTER COLUMN created_at SET DEFAULT NOW();
  END IF;

  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'notifications') THEN
    ALTER TABLE public.notifications ALTER COLUMN user_id DROP NOT NULL;
    ALTER TABLE public.notifications ALTER COLUMN user_id SET DEFAULT 'all';
    ALTER TABLE public.notifications ALTER COLUMN title DROP NOT NULL;
    ALTER TABLE public.notifications ALTER COLUMN title SET DEFAULT 'Notificação';
    ALTER TABLE public.notifications ALTER COLUMN body DROP NOT NULL;
    ALTER TABLE public.notifications ALTER COLUMN body SET DEFAULT '';
    ALTER TABLE public.notifications ALTER COLUMN module DROP NOT NULL;
    ALTER TABLE public.notifications ALTER COLUMN module SET DEFAULT 'configuracoes';
    ALTER TABLE public.notifications ALTER COLUMN is_read DROP NOT NULL;
    ALTER TABLE public.notifications ALTER COLUMN is_read SET DEFAULT false;
    ALTER TABLE public.notifications ALTER COLUMN created_at DROP NOT NULL;
    ALTER TABLE public.notifications ALTER COLUMN created_at SET DEFAULT NOW();
  END IF;
END $$;

-- 3. CRIAÇÃO DAS TABELAS (SEM RESTRITIVIDADE NOT NULL EXCETO PK DE SEGURANÇA)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE,
  full_name TEXT DEFAULT '',
  role user_role DEFAULT 'operador'::user_role,
  department TEXT DEFAULT 'Geral',
  avatar_url TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.equipments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT DEFAULT 'Equipamento',
  type TEXT DEFAULT 'Outro',
  asset_number TEXT UNIQUE DEFAULT ('PAT-' || SUBSTRING(gen_random_uuid()::text, 1, 8)),
  room_location TEXT DEFAULT 'Almoxarifado',
  acquisition_date DATE DEFAULT CURRENT_DATE,
  warranty_until DATE,
  status equipment_status DEFAULT 'ativo'::equipment_status,
  notes TEXT,
  foto_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.emprestimos_equipamentos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  equipment_id TEXT,
  equipment_name TEXT,
  funcionario_id TEXT,
  funcionario_nome TEXT DEFAULT 'Funcionário',
  data_retirada TIMESTAMPTZ DEFAULT NOW(),
  observacao_retirada TEXT,
  assinatura_retirada_url TEXT,
  data_devolucao TIMESTAMPTZ,
  observacao_devolucao TEXT,
  assinatura_devolucao_url TEXT,
  status TEXT DEFAULT 'em_aberto',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.service_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT DEFAULT 'Ordem de Serviço',
  description TEXT DEFAULT '',
  category os_category DEFAULT 'outro'::os_category,
  priority os_priority DEFAULT 'media'::os_priority,
  status os_status DEFAULT 'aberta'::os_status,
  sector TEXT DEFAULT 'Geral',
  location TEXT,
  observation TEXT,
  equipment_id UUID REFERENCES public.equipments(id) ON DELETE SET NULL,
  equipment_name TEXT,
  assigned_to UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  assigned_to_name TEXT,
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_by_name TEXT DEFAULT 'Sistema',
  photo_url TEXT,
  foto_abertura_url TEXT,
  foto_conclusao_url TEXT,
  concluded_at TIMESTAMPTZ,
  concluded_notes TEXT,
  comments JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.material_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT DEFAULT 'Requisição de Material',
  requested_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  requested_by_name TEXT DEFAULT 'Solicitante',
  sector TEXT DEFAULT 'Geral',
  urgency os_priority DEFAULT 'media'::os_priority,
  justification TEXT DEFAULT '',
  items JSONB DEFAULT '[]'::jsonb,
  status material_status DEFAULT 'pendente'::material_status,
  reviewed_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  reviewed_by_name TEXT,
  review_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.marketing_contents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT DEFAULT 'Conteúdo Marketing',
  content_type mkt_content_type DEFAULT 'post_estatico'::mkt_content_type,
  scheduled_date DATE DEFAULT CURRENT_DATE,
  status mkt_status DEFAULT 'ideia'::mkt_status,
  responsible_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  responsible_name TEXT,
  asset_link TEXT,
  has_image_authorization BOOLEAN DEFAULT false,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.marketing_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  period_label TEXT DEFAULT 'Período',
  instagram_reach INT DEFAULT 0,
  engagement_rate NUMERIC(6,2) DEFAULT 0.0,
  followers_gained INT DEFAULT 0,
  leads_generated INT DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.tech_tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT DEFAULT 'Chamado Técnico',
  description TEXT DEFAULT '',
  category ticket_category DEFAULT 'outro'::ticket_category,
  priority os_priority DEFAULT 'media'::os_priority,
  status ticket_status DEFAULT 'aberto'::ticket_status,
  requester_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  requester_name TEXT DEFAULT 'Solicitante',
  sector TEXT DEFAULT 'Geral',
  assigned_to UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  assigned_to_name TEXT,
  attachment_url TEXT,
  resolution_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.faq_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question TEXT DEFAULT '',
  answer TEXT DEFAULT '',
  category TEXT DEFAULT 'geral',
  tags TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  user_name TEXT DEFAULT 'Sistema',
  user_email TEXT DEFAULT 'sistema@colegioreacaodf.com',
  action TEXT DEFAULT 'acao',
  module TEXT DEFAULT 'sistema',
  target_record TEXT DEFAULT '',
  old_value TEXT,
  new_value TEXT,
  ip_address TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT DEFAULT 'all',
  title TEXT DEFAULT 'Notificação',
  body TEXT DEFAULT '',
  module TEXT DEFAULT 'configuracoes',
  target_id TEXT,
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.push_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  endpoint TEXT,
  p256dh TEXT,
  auth TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 13. Tabela de Professores (teachers) - Editor de Horários
CREATE TABLE IF NOT EXISTS public.teachers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT DEFAULT 'Professor',
  subjects TEXT[] DEFAULT '{}',
  groups TEXT[] DEFAULT '{}',
  workload_hours INT DEFAULT 0,
  available_days TEXT[] DEFAULT '{}',
  availability_shift TEXT DEFAULT 'ambos' CHECK (availability_shift IN ('matutino', 'vespertino', 'ambos')),
  available_slots INT[] DEFAULT '{}',
  class_ids TEXT[] DEFAULT '{}',
  availability_grid JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 14. Tabela de Turmas (classes) - Editor de Horários
CREATE TABLE IF NOT EXISTS public.classes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT DEFAULT 'Turma',
  "group" TEXT DEFAULT 'anos_iniciais' CHECK ("group" IN ('infantil', 'anos_iniciais', 'anos_finais', 'ensino_medio')),
  subject_workloads JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 15. Tabela de Slots de Grade Horária (schedule_slots) - Editor de Horários
CREATE TABLE IF NOT EXISTS public.schedule_slots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id UUID REFERENCES public.classes(id) ON DELETE CASCADE,
  teacher_id UUID REFERENCES public.teachers(id) ON DELETE SET NULL,
  subject TEXT DEFAULT 'Aula',
  day_of_week TEXT DEFAULT 'segunda' CHECK (day_of_week IN ('segunda', 'terca', 'quarta', 'quinta', 'sexta', 'sabado')),
  start_time TEXT DEFAULT '07:15',
  end_time TEXT DEFAULT '08:05'
);

-- 16. Tabela de Blocos de Horário (time_blocks) - Editor de Horários
CREATE TABLE IF NOT EXISTS public.time_blocks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id UUID REFERENCES public.classes(id) ON DELETE CASCADE,
  start_time TEXT DEFAULT '07:15',
  end_time TEXT DEFAULT '08:05',
  is_interval BOOLEAN DEFAULT false
);

-- 4. TRIGGER PARA NOVO USUÁRIO DO SUPABASE AUTH
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role, department, is_active)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', SPLIT_PART(NEW.email, '@', 1), 'Novo Usuário'),
    COALESCE((NEW.raw_user_meta_data->>'role')::user_role, 'operador'::user_role),
    COALESCE(NEW.raw_user_meta_data->>'department', 'Geral'),
    true
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    full_name = COALESCE(EXCLUDED.full_name, profiles.full_name);
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 5. ROW LEVEL SECURITY (RLS) & POLÍTICAS PERMISSIVAS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.equipments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.emprestimos_equipamentos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.material_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.marketing_contents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.marketing_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tech_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.faq_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teachers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.schedule_slots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.time_blocks ENABLE ROW LEVEL SECURITY;

DO $$ 
DECLARE
  t text;
BEGIN
  FOR t IN SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' LOOP
    EXECUTE format('DROP POLICY IF EXISTS "Acesso_Geral_Permissivo" ON public.%I', t);
    EXECUTE format('DROP POLICY IF EXISTS "Acesso total perfis" ON public.%I', t);
    EXECUTE format('DROP POLICY IF EXISTS "Acesso total equipamentos" ON public.%I', t);
    EXECUTE format('DROP POLICY IF EXISTS "Acesso total emprestimos" ON public.%I', t);
    EXECUTE format('DROP POLICY IF EXISTS "Acesso total os" ON public.%I', t);
    EXECUTE format('DROP POLICY IF EXISTS "Acesso total materiais" ON public.%I', t);
    EXECUTE format('DROP POLICY IF EXISTS "Acesso total marketing" ON public.%I', t);
    EXECUTE format('DROP POLICY IF EXISTS "Acesso total metricas mkt" ON public.%I', t);
    EXECUTE format('DROP POLICY IF EXISTS "Acesso total chamados" ON public.%I', t);
    EXECUTE format('DROP POLICY IF EXISTS "Acesso total faq" ON public.%I', t);
    EXECUTE format('DROP POLICY IF EXISTS "Acesso total auditoria" ON public.%I', t);
    EXECUTE format('DROP POLICY IF EXISTS "Acesso total notificacoes" ON public.%I', t);
    EXECUTE format('DROP POLICY IF EXISTS "Acesso total push" ON public.%I', t);
    
    EXECUTE format('CREATE POLICY "Acesso_Geral_Permissivo" ON public.%I FOR ALL USING (true) WITH CHECK (true)', t);
  END LOOP;
END $$;

-- DADOS INICIAIS DE SEED PARA O COLEGIO REAÇÃO
INSERT INTO public.profiles (id, email, full_name, role, department, is_active)
VALUES 
('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'diretor@colegioreacaodf.com', 'Dra. Maria Lúcia Reação', 'super_admin', 'Direção Geral', true),
('b1ffcd11-8d1a-4fe9-aa7c-7cc0ce491b22', 'admin@colegioreacaodf.com', 'Carlos Eduardo (Admin)', 'admin', 'Coordenação Geral', true),
('c2aacc22-7e2b-4fa8-bb8d-8dd1df502c33', 'operador@colegioreacaodf.com', 'Prof. Ana Paula (Operador)', 'operador', 'Secretaria Acadêmica', true)
ON CONFLICT (email) DO NOTHING;

-- DADOS INICIAIS PARA TURMAS (CLASSES) — TOTALMENTE LIMPAS CONFORME REQUERIDO
-- (As turmas devem ser cadastradas manualmente pelo administrador no sistema para evitar erros de integridade)
`;

