-- ==============================================================================
-- SCHEMA SQL COMPLETO PARA O SUPABASE — SISTEMA COLÉGIO REAÇÃO (RECANTO DAS EMAS - DF)
-- ==============================================================================
-- Este script cria todas as tabelas, chaves estrangeiras, índices e políticas RLS
-- necessárias para o funcionamento completo do sistema em nuvem com Supabase.
-- ==============================================================================

-- 1. Extensão UUID
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. Tabela de Perfis de Usuários (profiles)
CREATE TABLE IF NOT EXISTS profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email TEXT UNIQUE NOT NULL,
    full_name TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('super_admin', 'admin', 'operador')),
    department TEXT NOT NULL DEFAULT 'Geral',
    avatar_url TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. Tabela de Equipamentos / Patrimônio (equipments)
CREATE TABLE IF NOT EXISTS equipments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    type TEXT NOT NULL,
    asset_number TEXT UNIQUE NOT NULL,
    room_location TEXT NOT NULL,
    acquisition_date DATE DEFAULT CURRENT_DATE,
    warranty_until DATE,
    status TEXT NOT NULL DEFAULT 'ativo' CHECK (status IN ('ativo', 'emprestado', 'manutencao', 'baixado')),
    notes TEXT,
    foto_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 4. Tabela de Empréstimos de Equipamentos (emprestimos_equipamentos)
CREATE TABLE IF NOT EXISTS emprestimos_equipamentos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    equipment_id UUID REFERENCES equipments(id) ON DELETE CASCADE NOT NULL,
    equipment_name TEXT,
    funcionario_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    funcionario_nome TEXT NOT NULL,
    data_retirada TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    observacao_retirada TEXT,
    assinatura_retirada_url TEXT,
    data_devolucao TIMESTAMP WITH TIME ZONE,
    observacao_devolucao TEXT,
    assinatura_devolucao_url TEXT,
    status TEXT NOT NULL DEFAULT 'em_aberto' CHECK (status IN ('em_aberto', 'concluido')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 5. Tabela de Ordens de Serviço (service_orders)
CREATE TABLE IF NOT EXISTS service_orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    category TEXT NOT NULL CHECK (category IN ('eletrica', 'hidraulica', 'TI', 'predial', 'mobiliario', 'outro')),
    priority TEXT NOT NULL CHECK (priority IN ('baixa', 'media', 'alta', 'urgente')),
    status TEXT NOT NULL DEFAULT 'aberta' CHECK (status IN ('aberta', 'em_andamento', 'aguardando_peca', 'concluida', 'cancelada')),
    sector TEXT NOT NULL,
    location TEXT,
    observation TEXT,
    equipment_id UUID REFERENCES equipments(id) ON DELETE SET NULL,
    equipment_name TEXT,
    assigned_to UUID REFERENCES profiles(id) ON DELETE SET NULL,
    assigned_to_name TEXT,
    created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
    created_by_name TEXT NOT NULL,
    photo_url TEXT,
    foto_abertura_url TEXT,
    foto_conclusao_url TEXT,
    concluded_at TIMESTAMP WITH TIME ZONE,
    concluded_notes TEXT,
    comments JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 6. Tabela de Requisição de Materiais (material_requests)
CREATE TABLE IF NOT EXISTS material_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title TEXT NOT NULL,
    requested_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
    requested_by_name TEXT NOT NULL,
    sector TEXT NOT NULL,
    turma TEXT,
    request_date TEXT,
    requester_signature_url TEXT,
    urgency TEXT NOT NULL DEFAULT 'media',
    justification TEXT NOT NULL,
    items JSONB DEFAULT '[]'::jsonb,
    status TEXT NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente', 'aprovado', 'reprovado', 'entregue')),
    reviewed_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
    reviewed_by_name TEXT,
    director_name TEXT,
    director_signature_url TEXT,
    director_approval_date TEXT,
    review_notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 7. Tabela de Marketing & Conteúdo (marketing_content)
CREATE TABLE IF NOT EXISTS marketing_content (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title TEXT NOT NULL,
    content_type TEXT NOT NULL CHECK (content_type IN ('carrossel', 'story', 'reels', 'post_estatico')),
    scheduled_date DATE NOT NULL,
    status TEXT NOT NULL DEFAULT 'ideia' CHECK (status IN ('ideia', 'producao', 'aprovacao', 'publicado')),
    responsible_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    responsible_name TEXT,
    asset_link TEXT,
    has_image_authorization BOOLEAN NOT NULL DEFAULT false,
    notes TEXT,
    category TEXT,
    script TEXT,
    caption TEXT,
    hashtags TEXT[],
    target_audience TEXT,
    hook TEXT,
    audio_suggestion TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 8. Tabela de Métricas de Marketing (marketing_metrics)
CREATE TABLE IF NOT EXISTS marketing_metrics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    period_label TEXT NOT NULL,
    instagram_reach INT NOT NULL DEFAULT 0,
    engagement_rate NUMERIC(5,2) NOT NULL DEFAULT 0.00,
    followers_gained INT NOT NULL DEFAULT 0,
    leads_generated INT NOT NULL DEFAULT 0,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 9. Tabela de Chamados de Suporte Técnico / TI (tech_tickets)
CREATE TABLE IF NOT EXISTS tech_tickets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    category TEXT NOT NULL CHECK (category IN ('hardware', 'software', 'rede', 'acesso_login', 'outro')),
    priority TEXT NOT NULL CHECK (priority IN ('baixa', 'media', 'alta', 'urgente')),
    status TEXT NOT NULL DEFAULT 'aberto' CHECK (status IN ('aberto', 'em_atendimento', 'resolvido', 'fechado')),
    requester_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    requester_name TEXT NOT NULL,
    sector TEXT NOT NULL,
    assigned_to UUID REFERENCES profiles(id) ON DELETE SET NULL,
    assigned_to_name TEXT,
    attachment_url TEXT,
    resolution_notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 10. Tabela de Base de Conhecimento FAQ (faq)
CREATE TABLE IF NOT EXISTS faq (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    question TEXT NOT NULL,
    answer TEXT NOT NULL,
    category TEXT NOT NULL,
    tags TEXT[]
);

-- 11. Tabela de Logs de Auditoria (audit_logs)
CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    user_name TEXT NOT NULL,
    user_email TEXT NOT NULL,
    action TEXT NOT NULL,
    module TEXT NOT NULL,
    target_record TEXT NOT NULL,
    old_value TEXT,
    new_value TEXT,
    ip_address TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 12. Tabela de Notificações do Sistema (app_notifications)
CREATE TABLE IF NOT EXISTS app_notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    title TEXT NOT NULL,
    body TEXT NOT NULL,
    module TEXT NOT NULL,
    target_id TEXT,
    is_read BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 13. Tabela de Professores (teachers) - Editor de Horários
CREATE TABLE IF NOT EXISTS teachers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT DEFAULT 'Professor',
    subjects TEXT[] DEFAULT '{}',
    groups TEXT[] DEFAULT '{}',
    workload_hours INT DEFAULT 0,
    available_days TEXT[] DEFAULT '{}',
    availability_shift TEXT DEFAULT 'ambos' CHECK (availability_shift IN ('matutino', 'vespertino', 'ambos')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 14. Tabela de Turmas (classes) - Editor de Horários
CREATE TABLE IF NOT EXISTS classes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT DEFAULT 'Turma',
    "group" TEXT DEFAULT 'anos_iniciais' CHECK ("group" IN ('infantil', 'anos_iniciais', 'anos_finais', 'ensino_medio')),
    subject_workloads JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 15. Tabela de Slots de Grade Horária (schedule_slots) - Editor de Horários
CREATE TABLE IF NOT EXISTS schedule_slots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    class_id UUID REFERENCES classes(id) ON DELETE CASCADE,
    teacher_id UUID REFERENCES teachers(id) ON DELETE SET NULL,
    subject TEXT DEFAULT 'Aula',
    day_of_week TEXT DEFAULT 'segunda' CHECK (day_of_week IN ('segunda', 'terca', 'quarta', 'quinta', 'sexta', 'sabado')),
    start_time TEXT DEFAULT '07:20',
    end_time TEXT DEFAULT '08:10'
);

-- 16. Tabela de Blocos de Horário (time_blocks) - Editor de Horários
CREATE TABLE IF NOT EXISTS time_blocks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    class_id UUID REFERENCES classes(id) ON DELETE CASCADE,
    start_time TEXT DEFAULT '07:20',
    end_time TEXT DEFAULT '08:10',
    is_interval BOOLEAN DEFAULT false
);

-- ==============================================================================
-- ROW LEVEL SECURITY (RLS) — POLICIAIS DE ACESSO ABERTAS PARA O CLIENTE PWA
-- ==============================================================================
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE equipments ENABLE ROW LEVEL SECURITY;
ALTER TABLE emprestimos_equipamentos ENABLE ROW LEVEL SECURITY;
ALTER TABLE service_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE material_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE marketing_content ENABLE ROW LEVEL SECURITY;
ALTER TABLE marketing_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE tech_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE faq ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE teachers ENABLE ROW LEVEL SECURITY;
ALTER TABLE classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE schedule_slots ENABLE ROW LEVEL SECURITY;
ALTER TABLE time_blocks ENABLE ROW LEVEL SECURITY;

-- Políticas universais de acesso para o aplicativo PWA interno
CREATE POLICY "Permitir acesso completo a profiles" ON profiles FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Permitir acesso completo a equipments" ON equipments FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Permitir acesso completo a emprestimos_equipamentos" ON emprestimos_equipamentos FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Permitir acesso completo a service_orders" ON service_orders FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Permitir acesso completo a material_requests" ON material_requests FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Permitir acesso completo a marketing_content" ON marketing_content FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Permitir acesso completo a marketing_metrics" ON marketing_metrics FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Permitir acesso completo a tech_tickets" ON tech_tickets FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Permitir acesso completo a faq" ON faq FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Permitir acesso completo a audit_logs" ON audit_logs FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Permitir acesso completo a app_notifications" ON app_notifications FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Permitir acesso completo a teachers" ON teachers FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Permitir acesso completo a classes" ON classes FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Permitir acesso completo a schedule_slots" ON schedule_slots FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Permitir acesso completo a time_blocks" ON time_blocks FOR ALL USING (true) WITH CHECK (true);

-- ==============================================================================
-- DADOS INICIAIS (SEED) PARA O COLEGIO REAÇÃO
-- ==============================================================================
INSERT INTO profiles (id, email, full_name, role, department, is_active)
VALUES 
('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'diretor@colegioreacaodf.com', 'Dra. Maria Lúcia Reação', 'super_admin', 'Direção Geral', true),
('b1ffcd11-8d1a-4fe9-aa7c-7cc0ce491b22', 'admin@colegioreacaodf.com', 'Carlos Eduardo (Admin)', 'admin', 'Coordenação Geral', true),
('c2aacc22-7e2b-4fa8-bb8d-8dd1df502c33', 'operador@colegioreacaodf.com', 'Prof. Ana Paula (Operador)', 'operador', 'Secretaria Acadêmica', true)
ON CONFLICT (email) DO NOTHING;

-- DADOS INICIAIS PARA TURMAS (CLASSES) — TOTALMENTE LIMPAS CONFORME REQUERIDO
-- (As turmas devem ser cadastradas manualmente pelo administrador no sistema para evitar erros de integridade)

-- DADOS INICIAIS PARA PROFESSORES (TEACHERS) — TOTALMENTE LIMPOS/VAZIOS CONFORME REQUERIDO
-- (Os professores devem ser cadastrados manualmente pelo administrador no sistema)
