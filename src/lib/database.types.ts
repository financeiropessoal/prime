export type Profile = {
  id: string;
  email: string;
  name: string | null;
  role: 'admin' | 'customer';
  created_at: string;
};

export type Supplier = {
  id: string;
  company_name: string;
  trade_name: string;
  cnpj: string;
  phone: string | null;
  email: string | null;
  payment_terms: string | null;
  delivery_lead_time: number;
  created_at: string;
};

export type Product = {
  id: string;
  name: string;
  sku: string;
  barcode: string | null;
  category: string;
  brand: string;
  description: string;
  images: string[];
  cost_price: number;
  sale_price: number;
  package_qty: number | null;
  package_discount_pct: number | null;
  stock_current: number;
  stock_minimum: number;
  supplier_id: string | null;
  vehicle_compatibility: {
    brand: string;
    model: string;
    year: string;
  }[];
  status: 'active' | 'inactive';
  created_at: string;
  updated_at: string;
};

export type StockMovement = {
  id: string;
  product_id: string;
  type: 'input' | 'output_sale' | 'manual_adjustment';
  quantity: number;
  justification: string | null;
  user_id: string | null;
  created_at: string;
};

export type Client = {
  id: string;
  profile_id: string | null;
  type: 'pf' | 'pj';
  name: string;
  document: string;
  phone: string | null;
  email: string | null;
  addresses: {
    street: string;
    number: string;
    complement?: string;
    neighborhood: string;
    city: string;
    state: string;
    zip_code: string;
    is_default: boolean;
  }[];
  created_at: string;
};

export type Order = {
  id: string;
  client_id: string;
  status: 'waiting_payment' | 'paid' | 'shipped' | 'delivered' | 'cancelled';
  total_amount: number;
  shipping_cost: number;
  shipping_address: {
    street: string;
    number: string;
    complement?: string;
    neighborhood: string;
    city: string;
    state: string;
    zip_code: string;
  };
  payment_method: 'pix' | 'card' | 'boleto' | 'faturado';
  created_at: string;
  updated_at: string;
};

export type OrderItem = {
  id: string;
  order_id: string;
  product_id: string;
  quantity: number;
  unit_price: number;
  created_at: string;
};

export type BankAccount = {
  id: string;
  bank_name: string;
  agency: string | null;
  account_number: string | null;
  type: 'corrente' | 'poupanca' | 'caixa_interno';
  initial_balance: number;
  current_balance: number;
  created_at: string;
};

export type AccountPayable = {
  id: string;
  supplier_id: string | null;
  description: string;
  category: string;
  amount: number;
  issue_date: string; // YYYY-MM-DD
  due_date: string;    // YYYY-MM-DD
  payment_method: string;
  bank_account_id: string | null;
  status: 'pending' | 'paid' | 'overdue' | 'cancelled';
  payment_date: string | null;
  attachment_url: string | null;
  recurrence_id: string | null;
  created_at: string;
};

export type AccountReceivable = {
  id: string;
  client_id: string | null;
  order_id: string | null;
  description: string;
  category: string;
  amount: number;
  issue_date: string; // YYYY-MM-DD
  due_date: string;    // YYYY-MM-DD
  payment_method: string;
  bank_account_id: string | null;
  status: 'pending' | 'paid' | 'overdue' | 'cancelled';
  payment_date: string | null;
  created_at: string;
};

export type BankTransaction = {
  id: string;
  bank_account_id: string;
  type: 'income' | 'expense' | 'transfer_in' | 'transfer_out';
  amount: number;
  date: string; // YYYY-MM-DD
  description: string;
  reconciled: boolean;
  related_payable_id: string | null;
  related_receivable_id: string | null;
  created_at: string;
};

export type CrmStage =
  | 'novo_lead'
  | 'contato_feito'
  | 'negociacao'
  | 'aguardando_retorno'
  | 'cliente'
  | 'pedido';

export type CrmLead = {
  id: string;
  company_name: string;
  contact_name: string;
  city: string;
  state: string;
  phone?: string;
  whatsapp?: string;
  email?: string;
  stage: CrmStage;
  is_client: boolean;
  notes?: string;
  interactions: number;
  created_at: string;
  updated_at: string;
};

export type Banner = {
  id: string;
  title: string;
  subtitle: string;
  badge: string;
  button_text: string;
  button_link: string;
  image_url: string;
  is_active: boolean;
  updated_at: string;
};

export type TripSettlement = {
  id: string;
  description: string;
  start_date: string;
  end_date: string;
  sales_amount: number;
  expenses_amount: number;
  parts_amount: number;
  reinvestment_pct: number;
  reinvestment_amount: number;
  net_profit: number;
  status: 'pending_transfer' | 'transferred';
  expenses_details?: { description: string; amount: number }[];
  transferred_amount: number;
  created_at: string;
  updated_at: string;
};

