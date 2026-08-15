-- Habilitar a extensão de UUID se não estiver ativa
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 0. DROPS DE CONVENIÊNCIA (Limpeza de tabelas existentes para instalação limpa)
DROP TABLE IF EXISTS public.banners CASCADE;
DROP TABLE IF EXISTS public.crm_leads CASCADE;
DROP TABLE IF EXISTS public.bank_transactions CASCADE;
DROP TABLE IF EXISTS public.accounts_receivable CASCADE;
DROP TABLE IF EXISTS public.accounts_payable CASCADE;
DROP TABLE IF EXISTS public.bank_accounts CASCADE;
DROP TABLE IF EXISTS public.order_items CASCADE;
DROP TABLE IF EXISTS public.orders CASCADE;
DROP TABLE IF EXISTS public.clients CASCADE;
DROP TABLE IF EXISTS public.stock_movements CASCADE;
DROP TABLE IF EXISTS public.products CASCADE;
DROP TABLE IF EXISTS public.suppliers CASCADE;
DROP TABLE IF EXISTS public.profiles CASCADE;

-- 1. Tabela de Perfis de Usuário (vinculada ao auth.users do Supabase)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  email TEXT NOT NULL,
  name TEXT,
  role TEXT NOT NULL CHECK (role IN ('admin', 'customer')),
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Habilitar Row Level Security (RLS) para profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Políticas de RLS para profiles
CREATE POLICY "Qualquer um pode visualizar perfis"
  ON public.profiles FOR SELECT
  USING (true);

CREATE POLICY "Usuários podem atualizar seus próprios perfis"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

-- (Trigger para criar perfil movido para o final do arquivo para evitar interrupções de execução)

-- 2. Tabela de Fornecedores (ERP)
CREATE TABLE IF NOT EXISTS public.suppliers (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  company_name TEXT NOT NULL, -- Razão Social
  trade_name TEXT NOT NULL,   -- Nome Fantasia
  cnpj TEXT NOT NULL UNIQUE,
  phone TEXT,
  email TEXT,
  payment_terms TEXT,
  delivery_lead_time INTEGER DEFAULT 0, -- em dias
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Acesso completo de fornecedores apenas para admin"
  ON public.suppliers FOR ALL
  USING (EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
  ));

-- 3. Tabela de Produtos (ERP e E-commerce)
CREATE TABLE IF NOT EXISTS public.products (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  sku TEXT NOT NULL UNIQUE,
  barcode TEXT,
  category TEXT,
  brand TEXT,
  description TEXT,
  images TEXT[] DEFAULT '{}'::TEXT[],
  cost_price NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
  sale_price NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
  package_qty INTEGER DEFAULT NULL,
  package_discount_pct NUMERIC(5, 2) DEFAULT NULL,
  stock_current INTEGER NOT NULL DEFAULT 0,
  stock_minimum INTEGER NOT NULL DEFAULT 0,
  supplier_id UUID REFERENCES public.suppliers(id) ON DELETE SET NULL,
  vehicle_compatibility JSONB DEFAULT '[]'::JSONB, -- ex: [{"brand": "Fiat", "model": "Uno", "year": "2010-2015"}]
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Qualquer um pode visualizar produtos ativos"
  ON public.products FOR SELECT
  USING (status = 'active' OR EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
  ));

CREATE POLICY "Acesso de escrita de produtos apenas para admin"
  ON public.products FOR ALL
  USING (EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
  ));

-- 4. Histórico de Movimentações de Estoque (ERP)
CREATE TABLE IF NOT EXISTS public.stock_movements (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id UUID REFERENCES public.products(id) ON DELETE CASCADE NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('input', 'output_sale', 'manual_adjustment')),
  quantity INTEGER NOT NULL,
  justification TEXT,
  user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

ALTER TABLE public.stock_movements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Acesso completo de movimentacoes de estoque apenas para admin"
  ON public.stock_movements FOR ALL
  USING (EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
  ));

-- 5. Tabela de Clientes (ERP e E-commerce)
CREATE TABLE IF NOT EXISTS public.clients (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  profile_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL, -- nulo se cadastrado via ERP manualmente
  type TEXT NOT NULL CHECK (type IN ('pf', 'pj')),
  name TEXT NOT NULL,
  document TEXT NOT NULL UNIQUE, -- CPF/CNPJ
  phone TEXT,
  email TEXT,
  addresses JSONB DEFAULT '[]'::JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin tem acesso total aos clientes"
  ON public.clients FOR ALL
  USING (EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
  ));

CREATE POLICY "Clientes podem visualizar/editar seu próprio cadastro"
  ON public.clients FOR ALL
  USING (profile_id = auth.uid());

-- 6. Tabela de Pedidos (E-commerce e ERP)
CREATE TABLE IF NOT EXISTS public.orders (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID REFERENCES public.clients(id) ON DELETE RESTRICT NOT NULL,
  status TEXT NOT NULL DEFAULT 'waiting_payment' CHECK (status IN ('waiting_payment', 'paid', 'shipped', 'delivered', 'cancelled')),
  total_amount NUMERIC(12, 2) NOT NULL CHECK (total_amount >= 0),
  shipping_cost NUMERIC(12, 2) NOT NULL CHECK (shipping_cost >= 0),
  shipping_address JSONB NOT NULL,
  payment_method TEXT NOT NULL CHECK (payment_method IN ('pix', 'card', 'boleto')),
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin gerencia todos os pedidos"
  ON public.orders FOR ALL
  USING (EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
  ));

CREATE POLICY "Clientes gerenciam seus próprios pedidos"
  ON public.orders FOR ALL
  USING (EXISTS (
    SELECT 1 FROM public.clients 
    WHERE clients.id = orders.client_id AND clients.profile_id = auth.uid()
  ));

-- 7. Itens do Pedido (E-commerce e ERP)
CREATE TABLE IF NOT EXISTS public.order_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id UUID REFERENCES public.orders(id) ON DELETE CASCADE NOT NULL,
  product_id UUID REFERENCES public.products(id) ON DELETE RESTRICT NOT NULL,
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  unit_price NUMERIC(12, 2) NOT NULL CHECK (unit_price >= 0),
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin gerencia todos os itens de pedido"
  ON public.order_items FOR ALL
  USING (EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
  ));

CREATE POLICY "Clientes visualizam itens dos seus proprios pedidos"
  ON public.order_items FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.orders o
    JOIN public.clients c ON c.id = o.client_id
    WHERE o.id = order_items.order_id AND c.profile_id = auth.uid()
  ));

-- 8. Contas Bancárias (ERP)
CREATE TABLE IF NOT EXISTS public.bank_accounts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  bank_name TEXT NOT NULL,
  agency TEXT,
  account_number TEXT,
  type TEXT NOT NULL CHECK (type IN ('corrente', 'poupanca', 'caixa_interno')),
  initial_balance NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
  current_balance NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

ALTER TABLE public.bank_accounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Acesso completo a contas bancarias apenas para admin"
  ON public.bank_accounts FOR ALL
  USING (EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
  ));

-- 9. Contas a Pagar (ERP)
CREATE TABLE IF NOT EXISTS public.accounts_payable (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  supplier_id UUID REFERENCES public.suppliers(id) ON DELETE SET NULL,
  description TEXT NOT NULL,
  category TEXT NOT NULL,
  amount NUMERIC(12, 2) NOT NULL CHECK (amount > 0),
  issue_date DATE NOT NULL,
  due_date DATE NOT NULL,
  payment_method TEXT NOT NULL,
  bank_account_id UUID REFERENCES public.bank_accounts(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'overdue', 'cancelled')),
  payment_date DATE,
  attachment_url TEXT,
  recurrence_id UUID, -- id do grupo para despesas parceladas ou recorrentes
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

ALTER TABLE public.accounts_payable ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Acesso completo a contas a pagar apenas para admin"
  ON public.accounts_payable FOR ALL
  USING (EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
  ));

-- 10. Contas a Receber (ERP)
CREATE TABLE IF NOT EXISTS public.accounts_receivable (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL,
  order_id UUID REFERENCES public.orders(id) ON DELETE SET NULL,
  description TEXT NOT NULL,
  category TEXT NOT NULL,
  amount NUMERIC(12, 2) NOT NULL CHECK (amount > 0),
  issue_date DATE NOT NULL,
  due_date DATE NOT NULL,
  payment_method TEXT NOT NULL,
  bank_account_id UUID REFERENCES public.bank_accounts(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'overdue', 'cancelled')),
  payment_date DATE,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

ALTER TABLE public.accounts_receivable ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Acesso completo a contas a receber apenas para admin"
  ON public.accounts_receivable FOR ALL
  USING (EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
  ));

-- 11. Transações Bancárias - Extrato (ERP)
CREATE TABLE IF NOT EXISTS public.bank_transactions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  bank_account_id UUID REFERENCES public.bank_accounts(id) ON DELETE CASCADE NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('income', 'expense', 'transfer_in', 'transfer_out')),
  amount NUMERIC(12, 2) NOT NULL CHECK (amount > 0),
  date DATE NOT NULL,
  description TEXT NOT NULL,
  reconciled BOOLEAN DEFAULT FALSE NOT NULL,
  related_payable_id UUID REFERENCES public.accounts_payable(id) ON DELETE SET NULL,
  related_receivable_id UUID REFERENCES public.accounts_receivable(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

ALTER TABLE public.bank_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Acesso completo a extrato bancario apenas para admin"
  ON public.bank_transactions FOR ALL
  USING (EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
  ));


-- TRIGGERS AUTOMÁTICOS DE INTEGRAÇÃO (PEDIDO -> ESTOQUE & CONTAS A RECEBER)

-- 1. Ao finalizar um pedido na loja (status criado), cria o lançamento automático em Contas a Receber
CREATE OR REPLACE FUNCTION public.handle_new_order_receivable()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.accounts_receivable (
    client_id,
    order_id,
    description,
    category,
    amount,
    issue_date,
    due_date,
    payment_method,
    status
  )
  VALUES (
    new.client_id,
    new.id,
    'Venda Loja - Pedido #' || SUBSTRING(new.id::TEXT, 1, 8),
    'Vendas E-commerce',
    new.total_amount,
    new.created_at::DATE,
    (new.created_at + INTERVAL '1 day')::DATE,
    new.payment_method,
    CASE WHEN new.status = 'paid' THEN 'paid' ELSE 'pending' END
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_order_created ON public.orders;
CREATE TRIGGER on_order_created
  AFTER INSERT ON public.orders
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_order_receivable();

-- 2. Ao inserir cada item do pedido, dá baixa no estoque e registra movimentação
CREATE OR REPLACE FUNCTION public.handle_order_item_stock()
RETURNS TRIGGER AS $$
BEGIN
  -- Atualiza o estoque do produto
  UPDATE public.products
  SET stock_current = stock_current - new.quantity
  WHERE id = new.product_id;

  -- Registra a movimentação de saída
  INSERT INTO public.stock_movements (
    product_id,
    type,
    quantity,
    justification
  )
  VALUES (
    new.product_id,
    'output_sale',
    new.quantity,
    'Venda Loja - Item do Pedido #' || SUBSTRING(new.order_id::TEXT, 1, 8)
  );

  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_order_item_created ON public.order_items;
CREATE TRIGGER on_order_item_created
  AFTER INSERT ON public.order_items
  FOR EACH ROW EXECUTE PROCEDURE public.handle_order_item_stock();

-- 12. Tabela de Leads do CRM
CREATE TABLE IF NOT EXISTS public.crm_leads (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  company_name TEXT NOT NULL,
  contact_name TEXT NOT NULL,
  city TEXT NOT NULL,
  state TEXT NOT NULL,
  phone TEXT,
  whatsapp TEXT,
  email TEXT,
  stage TEXT NOT NULL DEFAULT 'novo_lead' CHECK (stage IN ('novo_lead', 'contato_feito', 'negociacao', 'aguardando_retorno', 'cliente', 'pedido')),
  is_client BOOLEAN DEFAULT FALSE NOT NULL,
  notes TEXT,
  interactions INTEGER DEFAULT 0 NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

ALTER TABLE public.crm_leads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Acesso completo a leads do CRM apenas para admin"
  ON public.crm_leads FOR ALL
  USING (EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
  ));

-- 13. Tabela de Banners Promocionais (E-commerce)
CREATE TABLE IF NOT EXISTS public.banners (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  subtitle TEXT,
  badge TEXT,
  button_text TEXT,
  button_link TEXT,
  image_url TEXT,
  is_active BOOLEAN DEFAULT TRUE NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

ALTER TABLE public.banners ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Qualquer um pode visualizar banners"
  ON public.banners FOR SELECT
  USING (true);

CREATE POLICY "Edicao de banners apenas para admin"
  ON public.banners FOR ALL
  USING (EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
  ));

-- 14. SEED DATA (Dados iniciais de demonstração)
-- Inserir Fornecedores
INSERT INTO public.suppliers (id, company_name, trade_name, cnpj, phone, email, payment_terms, delivery_lead_time) VALUES
('b2c125fa-085e-4bb8-868c-9c98cbcd8e01', 'Prime Automotive Peças e Componentes Ltda', 'Prime Automotive', '12.345.678/0001-90', '(34) 3211-5500', 'contato@primeautomotive.com.br', '30/60/90 dias', 5),
('b2c125fa-085e-4bb8-868c-9c98cbcd8e02', 'Importadora Gold Auto Componentes S.A.', 'Gold Auto', '98.765.432/0001-10', '(21) 2543-9800', 'vendas@goldauto.com.br', 'À vista com 5% desconto', 3)
ON CONFLICT (cnpj) DO NOTHING;

-- Inserir Contas Bancárias
INSERT INTO public.bank_accounts (id, bank_name, agency, account_number, type, initial_balance, current_balance) VALUES
('a5c125fa-085e-4bb8-868c-9c98cbcd8f01', 'Banco do Brasil', '0123-4', '56789-0', 'corrente', 25000.00, 25000.00),
('a5c125fa-085e-4bb8-868c-9c98cbcd8f02', 'Caixa Interno (Dinheiro)', NULL, NULL, 'caixa_interno', 1500.00, 1500.00)
ON CONFLICT (id) DO NOTHING;

-- Inserir Produtos
INSERT INTO public.products (id, name, sku, barcode, category, brand, description, cost_price, sale_price, package_qty, package_discount_pct, stock_current, stock_minimum, supplier_id, status) VALUES
('c7c125fa-085e-4bb8-868c-9c98cbcd8e01', 'Chave Codificada Completa Chevrolet Onix / Prisma 2013-2019', 'CHV-GM-ONX-01', '7891234567890', 'Chaves Codificadas', 'Chevrolet', 'Chave canivete codificada completa para Chevrolet Onix, Prisma, Cobalt e Spin.', 65.00, 180.00, 10, 10, 24, 5, 'b2c125fa-085e-4bb8-868c-9c98cbcd8e01', 'active'),
('c7c125fa-085e-4bb8-868c-9c98cbcd8e02', 'Carcaça Chave Canivete Fiat Toro / Cronos / Argo 3 Botões', 'CAR-FT-TR-03', '7891234567891', 'Carcaças de Chave', 'Fiat', 'Carcaça de reposição para chave canivete Fiat Toro, Argo, Cronos e Mobi.', 15.00, 45.00, 20, 15, 40, 10, 'b2c125fa-085e-4bb8-868c-9c98cbcd8e01', 'active'),
('c7c125fa-085e-4bb8-868c-9c98cbcd8e03', 'Bateria de Lítio CR2032 3V Maxell (Cartela com 5 unidades)', 'BAT-MX-CR2032', '7891234567892', 'Baterias', 'Maxell', 'Bateria de alta durabilidade CR2032 Maxell 3V.', 6.50, 25.00, 5, 5, 3, 15, 'b2c125fa-085e-4bb8-868c-9c98cbcd8e02', 'active'),
('c7c125fa-085e-4bb8-868c-9c98cbcd8e04', 'Controle Remoto de Alarme Pósitron PX40 Duplo Canal', 'CTR-PST-PX40', '7891234567893', 'Controles de Alarme', 'Pósitron', 'Controle remoto PX40 Pósitron compatível com alarmes da linha Cyber FX.', 22.00, 60.00, 10, 12, 18, 5, 'b2c125fa-085e-4bb8-868c-9c98cbcd8e02', 'active'),
('c7c125fa-085e-4bb8-868c-9c98cbcd8e05', 'Chave Canivete Completa VW Jetta / Golf Flex Huf 3 Botões', 'CHV-VW-GOL-03', '7891234567894', 'Chaves Codificadas', 'Volkswagen', 'Chave canivete completa para veículos Volkswagen (Jetta, Golf, Passat).', 75.00, 195.00, 10, 12, 15, 4, 'b2c125fa-085e-4bb8-868c-9c98cbcd8e01', 'active'),
('c7c125fa-085e-4bb8-868c-9c98cbcd8e06', 'Carcaça de Chave de Presença Ford Fusion 5 Botões', 'CAR-FD-FS-05', '7891234567895', 'Carcaças de Chave', 'Ford', 'Carcaça de reposição para chave de presença inteligente Ford Fusion.', 32.00, 85.00, 15, 10, 25, 5, 'b2c125fa-085e-4bb8-868c-9c98cbcd8e02', 'active')
ON CONFLICT (sku) DO NOTHING;

-- Inserir Banner Padrão
INSERT INTO public.banners (title, subtitle, badge, button_text, button_link, image_url, is_active) VALUES
('Hinor, Bravo e muito mais...', 'Preço de atacado para revendedores em todo o Brasil.', 'ATACADO AUTOMOTIVO', 'Entenda as três tabelas de desconto em 30 segundos.', '#catalogo', '/promo_banner_keys.jpg', TRUE);

-- 15. GESTÃO DE USUÁRIOS AUTH (Executado no fim para segurança de fluxo)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, name, role)
  VALUES (
    new.id,
    new.email,
    COALESCE(new.raw_user_meta_data->>'name', 'Usuário'),
    COALESCE(new.raw_user_meta_data->>'role', 'customer')
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();
