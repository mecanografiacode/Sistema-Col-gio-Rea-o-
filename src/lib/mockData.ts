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
-- SCRIPT COMPLETO DE BANCO DE DADOS (SUPABASE SQL EDITOR)
-- Sistema de Gestão Interna - Colégio Reação (Recanto das Emas, DF)
-- ============================================================

-- 1. EXTENSÕES & TIPOS ENUM
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

DO $$ BEGIN
    CREATE TYPE user_role AS ENUM ('super_admin', 'admin', 'operador');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE os_status AS ENUM ('aberta', 'em_andamento', 'aguardando_peca', 'concluida', 'cancelada');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE os_priority AS ENUM ('baixa', 'media', 'alta', 'urgente');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE os_category AS ENUM ('eletrica', 'hidraulica', 'TI', 'predial', 'mobiliario', 'outro');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE equipment_status AS ENUM ('ativo', 'emprestado', 'manutencao', 'baixado');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE material_status AS ENUM ('pendente', 'aprovado', 'reprovado', 'entregue');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE mkt_content_type AS ENUM ('carrossel', 'story', 'reels', 'post_estatico');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE mkt_status AS ENUM ('ideia', 'producao', 'aprovacao', 'publicado');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE ticket_category AS ENUM ('hardware', 'software', 'rede', 'acesso_login', 'outro');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE ticket_status AS ENUM ('aberto', 'em_atendimento', 'resolvido', 'fechado');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 2. TABELA DE PERFIS DE USUÁRIOS (PROFILES)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  full_name TEXT NOT NULL,
  role user_role NOT NULL DEFAULT 'operador',
  department TEXT NOT NULL DEFAULT 'Geral',
  avatar_url TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. EQUIPAMENTOS (EQUIPMENTS)
CREATE TABLE IF NOT EXISTS public.equipments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  type TEXT NOT NULL,
  asset_number TEXT UNIQUE NOT NULL,
  room_location TEXT NOT NULL,
  acquisition_date DATE NOT NULL,
  warranty_until DATE NOT NULL,
  status equipment_status NOT NULL DEFAULT 'ativo',
  notes TEXT,
  foto_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. EMPRÉSTIMOS DE EQUIPAMENTOS (EQUIPMENT LOANS)
CREATE TABLE IF NOT EXISTS public.emprestimos_equipamentos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  equipment_id UUID REFERENCES public.equipments(id) ON DELETE CASCADE,
  equipment_name TEXT,
  funcionario_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  funcionario_nome TEXT NOT NULL,
  data_retirada TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  observacao_retirada TEXT,
  assinatura_retirada_url TEXT,
  data_devolucao TIMESTAMPTZ,
  observacao_devolucao TEXT,
  assinatura_devolucao_url TEXT,
  status TEXT NOT NULL DEFAULT 'em_aberto',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. ORDENS DE SERVIÇO (SERVICE ORDERS)
CREATE TABLE IF NOT EXISTS public.service_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  category os_category NOT NULL DEFAULT 'outro',
  priority os_priority NOT NULL DEFAULT 'media',
  status os_status NOT NULL DEFAULT 'aberta',
  sector TEXT NOT NULL,
  equipment_id UUID REFERENCES public.equipments(id) ON DELETE SET NULL,
  equipment_name TEXT,
  assigned_to UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  assigned_to_name TEXT,
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_by_name TEXT,
  photo_url TEXT,
  foto_conclusao_url TEXT,
  concluded_at TIMESTAMPTZ,
  concluded_notes TEXT,
  comments JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 6. REQUISIÇÃO DE MATERIAIS (MATERIAL REQUESTS)
CREATE TABLE IF NOT EXISTS public.material_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  requested_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  requested_by_name TEXT,
  sector TEXT NOT NULL,
  urgency os_priority NOT NULL DEFAULT 'media',
  justification TEXT NOT NULL,
  items JSONB NOT NULL DEFAULT '[]'::jsonb,
  status material_status NOT NULL DEFAULT 'pendente',
  reviewed_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  reviewed_by_name TEXT,
  review_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 7. MARKETING & CONTEÚDO (MARKETING CONTENTS & METRICS)
CREATE TABLE IF NOT EXISTS public.marketing_contents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  content_type mkt_content_type NOT NULL DEFAULT 'post_estatico',
  scheduled_date DATE NOT NULL,
  status mkt_status NOT NULL DEFAULT 'ideia',
  responsible_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  responsible_name TEXT,
  asset_link TEXT,
  has_image_authorization BOOLEAN NOT NULL DEFAULT true,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.marketing_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  period_label TEXT NOT NULL,
  instagram_reach INT NOT NULL DEFAULT 0,
  engagement_rate NUMERIC(4,2) NOT NULL DEFAULT 0.0,
  followers_gained INT NOT NULL DEFAULT 0,
  leads_generated INT NOT NULL DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 8. SUPORTE TÉCNICO (TI)
CREATE TABLE IF NOT EXISTS public.tech_tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  category ticket_category NOT NULL DEFAULT 'outro',
  priority os_priority NOT NULL DEFAULT 'media',
  status ticket_status NOT NULL DEFAULT 'aberto',
  requester_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  requester_name TEXT,
  sector TEXT NOT NULL,
  assigned_to UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  assigned_to_name TEXT,
  attachment_url TEXT,
  resolution_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.faq_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question TEXT NOT NULL,
  answer TEXT NOT NULL,
  category TEXT NOT NULL,
  tags TEXT[] NOT NULL DEFAULT '{}'
);

-- 9. AUDITORIA
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  user_name TEXT NOT NULL,
  user_email TEXT NOT NULL,
  action TEXT NOT NULL,
  module TEXT NOT NULL,
  target_record TEXT NOT NULL,
  old_value TEXT,
  new_value TEXT,
  ip_address TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 10. NOTIFICAÇÕES & PUSH SUBSCRIPTIONS
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  module TEXT NOT NULL,
  target_id TEXT,
  is_read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.push_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  endpoint TEXT UNIQUE NOT NULL,
  p256dh TEXT NOT NULL,
  auth TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 11. AUTOCRIAR PERFIL APÓS REGISTRO NO SUPABASE AUTH (TRIGGER)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role, department, is_active)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', SPLIT_PART(NEW.email, '@', 1)),
    COALESCE((NEW.raw_user_meta_data->>'role')::user_role, 'operador'::user_role),
    COALESCE(NEW.raw_user_meta_data->>'department', 'Geral'),
    true
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    full_name = EXCLUDED.full_name;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 12. ROW LEVEL SECURITY (RLS) & POLÍTICAS
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

-- POLÍTICAS PERMISSIVAS PARA SUPABASE AUTHENTICATED
DROP POLICY IF EXISTS "Acesso total perfis" ON public.profiles;
CREATE POLICY "Acesso total perfis" ON public.profiles FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Acesso total equipamentos" ON public.equipments;
CREATE POLICY "Acesso total equipamentos" ON public.equipments FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Acesso total emprestimos" ON public.emprestimos_equipamentos;
CREATE POLICY "Acesso total emprestimos" ON public.emprestimos_equipamentos FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Acesso total ordens servico" ON public.service_orders;
CREATE POLICY "Acesso total ordens servico" ON public.service_orders FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Acesso total material requests" ON public.material_requests;
CREATE POLICY "Acesso total material requests" ON public.material_requests FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Acesso total marketing" ON public.marketing_contents;
CREATE POLICY "Acesso total marketing" ON public.marketing_contents FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Acesso total marketing metrics" ON public.marketing_metrics;
CREATE POLICY "Acesso total marketing metrics" ON public.marketing_metrics FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Acesso total tech tickets" ON public.tech_tickets;
CREATE POLICY "Acesso total tech tickets" ON public.tech_tickets FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Acesso total faq" ON public.faq_items;
CREATE POLICY "Acesso total faq" ON public.faq_items FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Acesso total audit" ON public.audit_logs;
CREATE POLICY "Acesso total audit" ON public.audit_logs FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Acesso total notifications" ON public.notifications;
CREATE POLICY "Acesso total notifications" ON public.notifications FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Acesso total push" ON public.push_subscriptions;
CREATE POLICY "Acesso total push" ON public.push_subscriptions FOR ALL USING (true) WITH CHECK (true);
`;
