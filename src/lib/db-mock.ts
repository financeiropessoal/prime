import {
  Profile,
  Product,
  Supplier,
  Client,
  Order,
  OrderItem,
  BankAccount,
  AccountPayable,
  AccountReceivable,
  BankTransaction,
  StockMovement,
  CrmLead,
  CrmStage,
  Banner,
  TripSettlement
} from './database.types';

// Helper to generate UUID-like strings in mock environment
const generateId = () => Math.random().toString(36).substring(2, 9);

// Default Seed Data
const defaultProfiles: Profile[] = [
  {
    id: 'user-admin-id',
    email: 'admin@chaveiroauto.com.br',
    name: 'Denys (Administrador)',
    role: 'admin',
    created_at: new Date().toISOString()
  },
  {
    id: 'user-customer-id',
    email: 'cliente@gmail.com',
    name: 'Carlos Silva',
    role: 'customer',
    created_at: new Date().toISOString()
  }
];

const defaultSuppliers: Supplier[] = [
  {
    id: 'sup-1',
    company_name: 'Distribuidora de Chaves Aliança Ltda',
    trade_name: 'Chaves Aliança',
    cnpj: '12.345.678/0001-90',
    phone: '(11) 98765-4321',
    email: 'comercial@chavesalianca.com.br',
    payment_terms: '30/60 dias no boleto',
    delivery_lead_time: 5,
    created_at: new Date().toISOString()
  },
  {
    id: 'sup-2',
    company_name: 'Importadora Gold Auto Componentes S.A.',
    trade_name: 'Gold Auto',
    cnpj: '98.765.432/0001-10',
    phone: '(21) 2543-9800',
    email: 'vendas@goldauto.com.br',
    payment_terms: 'À vista com 5% desconto',
    delivery_lead_time: 3,
    created_at: new Date().toISOString()
  }
];

const defaultProducts: Product[] = [
  {
    id: 'prod-1',
    name: 'Chave Codificada Completa Chevrolet Onix / Prisma 2013-2019',
    sku: 'CHV-GM-ONX-01',
    barcode: '7891234567890',
    category: 'Chaves Codificadas',
    brand: 'Chevrolet',
    description: 'Chave canivete codificada completa para Chevrolet Onix, Prisma, Cobalt e Spin. Acompanha placa de circuito telecomando (315 Mhz), chip transponder ID46 e lâmina virgem. Necessário levar ao chaveiro profissional para corte e programação.',
    images: ['/prod_onix.jpg'],
    cost_price: 65.00,
    sale_price: 180.00,
    package_qty: 10,
    package_discount_pct: 10,
    stock_current: 24,
    stock_minimum: 5,
    supplier_id: 'sup-1',
    vehicle_compatibility: [
      { brand: 'Chevrolet', model: 'Onix', year: '2013-2019' },
      { brand: 'Chevrolet', model: 'Prisma', year: '2013-2019' },
      { brand: 'Chevrolet', model: 'Cobalt', year: '2013-2019' },
      { brand: 'Chevrolet', model: 'Spin', year: '2013-2019' }
    ],
    status: 'active',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: 'prod-2',
    name: 'Carcaça Chave Canivete Fiat Toro / Cronos / Argo 3 Botões',
    sku: 'CAR-FT-TR-03',
    barcode: '7891234567891',
    category: 'Carcaças de Chave',
    brand: 'Fiat',
    description: 'Carcaça de reposição para chave canivete Fiat Toro, Argo, Cronos e Mobi. Ideal para substituir botões gastos ou carcaça quebrada. Acompanha lâmina virgem pantográfica e emblema Fiat. Não acompanha circuito eletrônico nem chip.',
    images: ['/prod_fiat.jpg'],
    cost_price: 15.00,
    sale_price: 45.00,
    package_qty: 20,
    package_discount_pct: 15,
    stock_current: 40,
    stock_minimum: 10,
    supplier_id: 'sup-1',
    vehicle_compatibility: [
      { brand: 'Fiat', model: 'Toro', year: '2016-2023' },
      { brand: 'Fiat', model: 'Argo', year: '2017-2023' },
      { brand: 'Fiat', model: 'Cronos', year: '2018-2023' }
    ],
    status: 'active',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: 'prod-3',
    name: 'Bateria de Lítio CR2032 3V Maxell (Cartela com 5 unidades)',
    sku: 'BAT-MX-CR2032',
    barcode: '7891234567892',
    category: 'Baterias',
    brand: 'Maxell',
    description: 'Bateria de alta durabilidade CR2032 Maxell 3V. Ideal para controles de alarme automotivo, chaves presenciais (keyless), placas-mãe e dispositivos diversos. Alta densidade de energia e excelente resistência a vazamentos.',
    images: ['/prod_battery.jpg'],
    cost_price: 6.50,
    sale_price: 25.00,
    package_qty: 5,
    package_discount_pct: 5,
    stock_current: 3, // abaixo do mínimo para testar alerta visual!
    stock_minimum: 15,
    supplier_id: 'sup-2',
    vehicle_compatibility: [
      { brand: 'Todas', model: 'Todos com controle CR2032', year: 'Todos' }
    ],
    status: 'active',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: 'prod-4',
    name: 'Controle Remoto de Alarme Pósitron PX40 Duplo Canal',
    sku: 'CTR-PST-PX40',
    barcode: '7891234567893',
    category: 'Controles de Alarme',
    brand: 'Pósitron',
    description: 'Controle remoto PX40 Pósitron compatível com alarmes da linha Cyber FX, PX, TX, Exact, Keyless e DuoBlock. Possui 4 botões (liga, desliga, auxiliar, residencial). Design moderno com acabamento em grafite.',
    images: ['/prod_onix.jpg'],
    cost_price: 22.00,
    sale_price: 60.00,
    package_qty: 10,
    package_discount_pct: 12,
    stock_current: 18,
    stock_minimum: 5,
    supplier_id: 'sup-2',
    vehicle_compatibility: [
      { brand: 'Universal', model: 'Equipado com Alarme Pósitron', year: 'Todos' }
    ],
    status: 'active',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: 'prod-5',
    name: 'Chave Canivete Completa VW Jetta / Golf Flex Huf 3 Botões',
    sku: 'CHV-VW-GOL-03',
    barcode: '7891234567894',
    category: 'Chaves Codificadas',
    brand: 'Volkswagen',
    description: 'Chave canivete completa de alta qualidade para veículos Volkswagen (Jetta, Golf, Passat). Frequência de 434 Mhz com placa integrada Huf. Acompanha chip transponder Megamos Crypto ID48.',
    images: ['/prod_onix.jpg'],
    cost_price: 75.00,
    sale_price: 195.00,
    package_qty: 10,
    package_discount_pct: 12,
    stock_current: 15,
    stock_minimum: 4,
    supplier_id: 'sup-1',
    vehicle_compatibility: [
      { brand: 'Volkswagen', model: 'Golf', year: '2014-2019' },
      { brand: 'Volkswagen', model: 'Jetta', year: '2011-2018' }
    ],
    status: 'active',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: 'prod-6',
    name: 'Carcaça de Chave de Presença Ford Fusion 5 Botões',
    sku: 'CAR-FD-FS-05',
    barcode: '7891234567895',
    category: 'Carcaças de Chave',
    brand: 'Ford',
    description: 'Carcaça de reposição para chave de presença inteligente Ford Fusion de 5 botões. Modelo com encaixe perfeito para a placa original.',
    images: ['/prod_fiat.jpg'],
    cost_price: 32.00,
    sale_price: 85.00,
    package_qty: 15,
    package_discount_pct: 10,
    stock_current: 25,
    stock_minimum: 5,
    supplier_id: 'sup-2',
    vehicle_compatibility: [
      { brand: 'Ford', model: 'Fusion', year: '2013-2019' }
    ],
    status: 'active',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }
];

const defaultClients: Client[] = [
  {
    id: 'cli-1',
    profile_id: 'user-customer-id',
    type: 'pf',
    name: 'Carlos Silva',
    document: '123.456.789-00',
    phone: '(11) 99999-8888',
    email: 'cliente@gmail.com',
    addresses: [
      {
        street: 'Rua das Flores',
        number: '123',
        complement: 'Apto 42',
        neighborhood: 'Jardins',
        city: 'São Paulo',
        state: 'SP',
        zip_code: '01234-567',
        is_default: true
      }
    ],
    created_at: new Date().toISOString()
  },
  {
    id: 'cli-2',
    profile_id: null,
    type: 'pj',
    name: 'Mecânica e Autocenter Silva S/A',
    document: '45.678.901/0001-23',
    phone: '(11) 5555-4444',
    email: 'contato@mecanicasilva.com.br',
    addresses: [
      {
        street: 'Av. Principal',
        number: '1500',
        neighborhood: 'Distrito Industrial',
        city: 'Campinas',
        state: 'SP',
        zip_code: '13000-000',
        is_default: true
      }
    ],
    created_at: new Date().toISOString()
  }
];

const defaultBankAccounts: BankAccount[] = [
  {
    id: 'acc-1',
    bank_name: 'Caixa Interno (Dinheiro)',
    agency: '',
    account_number: '',
    type: 'caixa_interno',
    initial_balance: 1500.00,
    current_balance: 1500.00,
    created_at: new Date().toISOString()
  },
  {
    id: 'acc-2',
    bank_name: 'Banco Itaú S.A.',
    agency: '0300',
    account_number: '12345-6',
    type: 'corrente',
    initial_balance: 12450.00,
    current_balance: 12450.00,
    created_at: new Date().toISOString()
  }
];

// Helper to interact with storage safely
class MockDatabase {
  private getStorage<T>(key: string, defaultValue: T): T {
    if (typeof window === 'undefined') return defaultValue;
    const data = localStorage.getItem(`chaveiro_auto_${key}`);
    return data ? JSON.parse(data) : defaultValue;
  }

  private setStorage<T>(key: string, data: T): void {
    if (typeof window !== 'undefined') {
      localStorage.setItem(`chaveiro_auto_${key}`, JSON.stringify(data));
    }
  }

  constructor() {
    if (typeof window !== 'undefined') {
      // Initialize seed data if not present
      if (!localStorage.getItem('chaveiro_auto_profiles')) this.setStorage('profiles', defaultProfiles);
      if (!localStorage.getItem('chaveiro_auto_suppliers')) this.setStorage('suppliers', defaultSuppliers);
      if (!localStorage.getItem('chaveiro_auto_products')) this.setStorage('products', defaultProducts);
      if (!localStorage.getItem('chaveiro_auto_clients')) this.setStorage('clients', defaultClients);
      if (!localStorage.getItem('chaveiro_auto_bank_accounts')) this.setStorage('bank_accounts', defaultBankAccounts);
      if (!localStorage.getItem('chaveiro_auto_orders')) this.setStorage('orders', []);
      if (!localStorage.getItem('chaveiro_auto_order_items')) this.setStorage('order_items', []);
      if (!localStorage.getItem('chaveiro_auto_stock_movements')) this.setStorage('stock_movements', []);
      if (!localStorage.getItem('chaveiro_auto_accounts_payable')) this.setStorage('accounts_payable', []);
      if (!localStorage.getItem('chaveiro_auto_accounts_receivable')) this.setStorage('accounts_receivable', []);
      if (!localStorage.getItem('chaveiro_auto_bank_transactions')) this.setStorage('bank_transactions', []);
      if (!localStorage.getItem('chaveiro_auto_crm_leads')) this.setStorage('crm_leads', defaultLeads);
      if (!localStorage.getItem('chaveiro_auto_trip_settlements')) this.setStorage('trip_settlements', []);
    }
  }

  // Generic Tables Getters & Setters
  getProfiles() { return this.getStorage<Profile[]>('profiles', defaultProfiles); }
  getSuppliers() { return this.getStorage<Supplier[]>('suppliers', defaultSuppliers); }
  getProducts() {
    let products = this.getStorage<Product[]>('products', defaultProducts);
    let modified = false;
    
    // Auto-sync missing default products to existing localStorage
    defaultProducts.forEach(dp => {
      if (!products.some(p => p.id === dp.id)) {
        products.push(dp);
        modified = true;
      }
    });

    const updated = products.map(p => {
      const def = defaultProducts.find(dp => dp.id === p.id);
      if (def && (p.package_qty === undefined || p.package_discount_pct === undefined)) {
        modified = true;
        return {
          ...p,
          package_qty: def.package_qty,
          package_discount_pct: def.package_discount_pct
        };
      }
      return p;
    });

    if (modified) {
      this.setStorage('products', updated);
      return updated;
    }
    return products;
  }
  getClients() { return this.getStorage<Client[]>('clients', defaultClients); }
  getOrders() { return this.getStorage<Order[]>('orders', []); }
  getOrderItems() { return this.getStorage<OrderItem[]>('order_items', []); }
  getStockMovements() { return this.getStorage<StockMovement[]>('stock_movements', []); }
  getBankAccounts() { return this.getStorage<BankAccount[]>('bank_accounts', defaultBankAccounts); }
  getAccountsPayable() { return this.getStorage<AccountPayable[]>('accounts_payable', []); }
  getAccountsReceivable() { return this.getStorage<AccountReceivable[]>('accounts_receivable', []); }
  getBankTransactions() { return this.getStorage<BankTransaction[]>('bank_transactions', []); }
  getBanner(): Banner { return this.getStorage<Banner>('banner', defaultBanner); }
  updateBanner(data: Partial<Banner>): Banner {
    const current = this.getBanner();
    const updated = { ...current, ...data, updated_at: new Date().toISOString() };
    this.setStorage('banner', updated);
    return updated;
  }

  getTripSettlements() { return this.getStorage<TripSettlement[]>('trip_settlements', []); }
  createTripSettlement(data: Omit<TripSettlement, 'id' | 'created_at' | 'updated_at'>, bankAccountId?: string): TripSettlement {
    const settlements = this.getTripSettlements();
    const newS: TripSettlement = {
      ...data,
      id: 'settle-' + generateId(),
      transferred_amount: data.status === 'transferred' ? data.net_profit : 0.00,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    settlements.push(newS);
    this.setStorage('trip_settlements', settlements);

    if (data.status === 'transferred' && bankAccountId) {
      this.registerTransaction({
        bank_account_id: bankAccountId,
        type: 'expense',
        amount: data.net_profit,
        description: `Retirada de Pró-labore: ${data.description}`,
        date: new Date().toISOString().substring(0, 10)
      });
    }

    return newS;
  }
  updateTripSettlementStatus(id: string, status: 'pending_transfer' | 'transferred'): TripSettlement {
    const settlements = this.getTripSettlements();
    const idx = settlements.findIndex(s => s.id === id);
    if (idx !== -1) {
      settlements[idx].status = status;
      settlements[idx].transferred_amount = status === 'transferred' ? settlements[idx].net_profit : 0.00;
      settlements[idx].updated_at = new Date().toISOString();
      this.setStorage('trip_settlements', settlements);
      return settlements[idx];
    }
    throw new Error('Acerto de viagem não encontrado');
  }
  withdrawTripSettlement(id: string, amount: number, bankAccountId?: string): TripSettlement {
    const settlements = this.getTripSettlements();
    const idx = settlements.findIndex(s => s.id === id);
    if (idx !== -1) {
      const s = settlements[idx];
      const newTransferred = Number((s.transferred_amount + amount).toFixed(2));
      s.transferred_amount = Math.min(s.net_profit, newTransferred);
      s.status = s.transferred_amount >= s.net_profit ? 'transferred' : 'pending_transfer';
      s.updated_at = new Date().toISOString();
      this.setStorage('trip_settlements', settlements);

      if (bankAccountId) {
        this.registerTransaction({
          bank_account_id: bankAccountId,
          type: 'expense',
          amount: amount,
          description: `Retirada de Pró-labore: ${s.description}`,
          date: new Date().toISOString().substring(0, 10)
        });
      }

      return s;
    }
    throw new Error('Acerto de viagem não encontrado');
  }

  // ----------------------------------------------------
  // PRODUCTS / STOCK SERVICES
  // ----------------------------------------------------
  createProduct(data: Omit<Product, 'id' | 'created_at' | 'updated_at'>): Product {
    const products = this.getProducts();
    const newProduct: Product = {
      ...data,
      id: 'prod-' + generateId(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    products.push(newProduct);
    this.setStorage('products', products);

    // Initial stock movement if stock > 0
    if (newProduct.stock_current > 0) {
      this.createStockMovement(newProduct.id, 'input', newProduct.stock_current, 'Estoque inicial do produto');
    }
    return newProduct;
  }

  updateProduct(id: string, data: Partial<Product>): Product {
    const products = this.getProducts();
    const index = products.findIndex(p => p.id === id);
    if (index === -1) throw new Error('Produto não encontrado');

    const oldStock = products[index].stock_current;
    const newProduct = {
      ...products[index],
      ...data,
      updated_at: new Date().toISOString()
    };
    products[index] = newProduct;
    this.setStorage('products', products);

    // If stock changed manually, create a stock movement
    if (data.stock_current !== undefined && data.stock_current !== oldStock) {
      const diff = data.stock_current - oldStock;
      const type = diff > 0 ? 'input' : 'manual_adjustment'; // Negative or positive manual adjustment
      this.createStockMovement(
        id,
        type,
        Math.abs(diff),
        data.description ? `Ajuste de estoque: ${data.description.substring(0, 50)}` : 'Ajuste manual de estoque'
      );
    }

    return newProduct;
  }

  deleteProduct(id: string): void {
    const products = this.getProducts();
    const filtered = products.filter(p => p.id !== id);
    this.setStorage('products', filtered);
  }

  createStockMovement(productId: string, type: 'input' | 'output_sale' | 'manual_adjustment', quantity: number, justification: string | null): StockMovement {
    const movements = this.getStockMovements();
    const newMovement: StockMovement = {
      id: 'stk-' + generateId(),
      product_id: productId,
      type,
      quantity,
      justification,
      user_id: 'user-admin-id',
      created_at: new Date().toISOString()
    };
    movements.push(newMovement);
    this.setStorage('stock_movements', movements);
    return newMovement;
  }

  // ----------------------------------------------------
  // CLIENTS & SUPPLIERS SERVICES
  // ----------------------------------------------------
  createClient(data: Omit<Client, 'id' | 'created_at'>): Client {
    const clients = this.getClients();
    const newClient: Client = {
      ...data,
      id: 'cli-' + generateId(),
      created_at: new Date().toISOString()
    };
    clients.push(newClient);
    this.setStorage('clients', clients);
    return newClient;
  }

  updateClient(id: string, data: Partial<Client>): Client {
    const clients = this.getClients();
    const index = clients.findIndex(c => c.id === id);
    if (index === -1) throw new Error('Cliente não encontrado');
    const updatedClient = { ...clients[index], ...data };
    clients[index] = updatedClient;
    this.setStorage('clients', clients);
    return updatedClient;
  }

  deleteClient(id: string): void {
    const clients = this.getClients();
    this.setStorage('clients', clients.filter(c => c.id !== id));
  }

  createSupplier(data: Omit<Supplier, 'id' | 'created_at'>): Supplier {
    const suppliers = this.getSuppliers();
    const newSupplier: Supplier = {
      ...data,
      id: 'sup-' + generateId(),
      created_at: new Date().toISOString()
    };
    suppliers.push(newSupplier);
    this.setStorage('suppliers', suppliers);
    return newSupplier;
  }

  updateSupplier(id: string, data: Partial<Supplier>): Supplier {
    const suppliers = this.getSuppliers();
    const index = suppliers.findIndex(s => s.id === id);
    if (index === -1) throw new Error('Fornecedor não encontrado');
    const updated = { ...suppliers[index], ...data };
    suppliers[index] = updated;
    this.setStorage('suppliers', suppliers);
    return updated;
  }

  deleteSupplier(id: string): void {
    const suppliers = this.getSuppliers();
    this.setStorage('suppliers', suppliers.filter(s => s.id !== id));
  }

  // ----------------------------------------------------
  // ORDER & CHECKOUT SERVICES (Loja -> ERP Integration)
  // ----------------------------------------------------
  createOrder(data: {
    client_id: string;
    total_amount: number;
    shipping_cost: number;
    shipping_address: Order['shipping_address'];
    payment_method: Order['payment_method'];
    items: { product_id: string; quantity: number; unit_price: number }[];
    status?: Order['status'];
    bank_account_id?: string;
  }): Order {
    const orders = this.getOrders();
    const orderItems = this.getOrderItems();
    const orderId = 'ord-' + generateId();
    const todayStr = new Date().toISOString();

    // 1. Create Order
    const newOrder: Order = {
      id: orderId,
      client_id: data.client_id,
      status: data.status || 'waiting_payment',
      total_amount: data.total_amount,
      shipping_cost: data.shipping_cost,
      shipping_address: data.shipping_address,
      payment_method: data.payment_method,
      created_at: todayStr,
      updated_at: todayStr
    };
    orders.push(newOrder);
    this.setStorage('orders', orders);

    // 2. Create Order Items and decrease stock
    data.items.forEach(item => {
      const newItem: OrderItem = {
        id: 'itm-' + generateId(),
        order_id: orderId,
        product_id: item.product_id,
        quantity: item.quantity,
        unit_price: item.unit_price,
        created_at: todayStr
      };
      orderItems.push(newItem);

      // Decrement product stock & save stock movement
      const products = this.getProducts();
      const pIndex = products.findIndex(p => p.id === item.product_id);
      if (pIndex !== -1) {
        products[pIndex].stock_current -= item.quantity;
        products[pIndex].updated_at = todayStr;
        this.setStorage('products', products);

        this.createStockMovement(
          item.product_id,
          'output_sale',
          item.quantity,
          `Venda E-commerce - Item do Pedido #${orderId.substring(4)}`
        );
      }
    });
    this.setStorage('order_items', orderItems);

    // 3. Trigger: Create Accounts Receivable
    const isPaid = newOrder.status === 'paid';
    const receivable: AccountReceivable = {
      id: 'rec-' + generateId(),
      client_id: newOrder.client_id,
      order_id: newOrder.id,
      description: `Venda Loja - Pedido #${newOrder.id.substring(4)}`,
      category: 'Vendas E-commerce',
      amount: newOrder.total_amount,
      issue_date: todayStr.substring(0, 10),
      due_date: isPaid ? todayStr.substring(0, 10) : new Date(Date.now() + 86400000).toISOString().substring(0, 10),
      payment_method: newOrder.payment_method === 'pix' ? 'Pix' : newOrder.payment_method === 'card' ? 'Cartão de Crédito' : 'Boleto',
      bank_account_id: isPaid ? 'acc-2' : null, // Default Itaú for auto-payments
      status: isPaid ? 'paid' : 'pending',
      payment_date: isPaid ? todayStr.substring(0, 10) : null,
      created_at: todayStr
    };

    const receivables = this.getAccountsReceivable();
    receivables.push(receivable);
    this.setStorage('accounts_receivable', receivables);

    // If order was already paid (e.g. approved credit card / instant Pix), register transaction and update bank balance
    if (isPaid) {
      const targetBankAccountId = data.bank_account_id || 'acc-2'; // Use specified account or default Itaú
      receivable.bank_account_id = targetBankAccountId;
      this.registerTransaction({
        bank_account_id: targetBankAccountId,
        type: 'income',
        amount: newOrder.total_amount,
        description: `Venda PDV/Loja - Pedido #${newOrder.id.substring(4)}`,
        related_receivable_id: receivable.id
      });
    }

    return newOrder;
  }

  // ----------------------------------------------------
  // FINANCIAL SERVICES
  // ----------------------------------------------------
  createBankAccount(data: Omit<BankAccount, 'id' | 'current_balance' | 'created_at'>): BankAccount {
    const accounts = this.getBankAccounts();
    const newAcc: BankAccount = {
      ...data,
      id: 'acc-' + generateId(),
      current_balance: data.initial_balance,
      created_at: new Date().toISOString()
    };
    accounts.push(newAcc);
    this.setStorage('bank_accounts', accounts);
    return newAcc;
  }

  updateBankAccount(id: string, data: Partial<BankAccount>): BankAccount {
    const accounts = this.getBankAccounts();
    const index = accounts.findIndex(a => a.id === id);
    if (index === -1) throw new Error('Conta não encontrada');
    const updated = { ...accounts[index], ...data };
    accounts[index] = updated;
    this.setStorage('bank_accounts', accounts);
    return updated;
  }

  deleteBankAccount(id: string): void {
    const accounts = this.getBankAccounts();
    this.setStorage('bank_accounts', accounts.filter(a => a.id !== id));
  }

  // Accounts Payable
  createAccountPayable(data: Omit<AccountPayable, 'id' | 'status' | 'payment_date' | 'created_at'> & { installments?: number }): AccountPayable[] {
    const payables = this.getAccountsPayable();
    const createdPayables: AccountPayable[] = [];
    const recurrenceId = data.recurrence_id || 'rec-group-' + generateId();
    const todayStr = new Date().toISOString();
    const installmentsCount = data.installments || 1;

    for (let i = 0; i < installmentsCount; i++) {
      const dueDate = new Date(data.due_date);
      dueDate.setMonth(dueDate.getMonth() + i); // increment month for each installment

      const installmentPayable: AccountPayable = {
        id: 'pay-' + generateId(),
        supplier_id: data.supplier_id,
        description: installmentsCount > 1 ? `${data.description} (${i + 1}/${installmentsCount})` : data.description,
        category: data.category,
        amount: Number((data.amount / installmentsCount).toFixed(2)),
        issue_date: data.issue_date,
        due_date: dueDate.toISOString().substring(0, 10),
        payment_method: data.payment_method,
        bank_account_id: null,
        status: 'pending',
        payment_date: null,
        attachment_url: data.attachment_url || null,
        recurrence_id: installmentsCount > 1 ? recurrenceId : null,
        created_at: todayStr
      };

      payables.push(installmentPayable);
      createdPayables.push(installmentPayable);
    }

    this.setStorage('accounts_payable', payables);
    return createdPayables;
  }

  payAccountPayable(id: string, bankAccountId: string, paymentDate: string): AccountPayable {
    const payables = this.getAccountsPayable();
    const index = payables.findIndex(p => p.id === id);
    if (index === -1) throw new Error('Título a pagar não encontrado');
    if (payables[index].status === 'paid') throw new Error('Título já está pago');

    const payable = payables[index];
    payable.status = 'paid';
    payable.payment_date = paymentDate;
    payable.bank_account_id = bankAccountId;

    this.setStorage('accounts_payable', payables);

    // Register banking transaction (expense)
    this.registerTransaction({
      bank_account_id: bankAccountId,
      type: 'expense',
      amount: payable.amount,
      description: `Pagamento: ${payable.description}`,
      related_payable_id: payable.id,
      date: paymentDate
    });

    return payable;
  }

  // Accounts Receivable
  createAccountReceivable(data: Omit<AccountReceivable, 'id' | 'status' | 'payment_date' | 'created_at'>): AccountReceivable {
    const receivables = this.getAccountsReceivable();
    const newRec: AccountReceivable = {
      ...data,
      id: 'rec-' + generateId(),
      status: 'pending',
      payment_date: null,
      created_at: new Date().toISOString()
    };
    receivables.push(newRec);
    this.setStorage('accounts_receivable', receivables);
    return newRec;
  }

  receiveAccountReceivable(id: string, bankAccountId: string, paymentDate: string, actualAmount?: number): AccountReceivable {
    const receivables = this.getAccountsReceivable();
    const index = receivables.findIndex(r => r.id === id);
    if (index === -1) throw new Error('Título a receber não encontrado');
    if (receivables[index].status === 'paid') throw new Error('Título já está recebido');

    const receivable = receivables[index];
    const finalAmount = actualAmount !== undefined ? actualAmount : receivable.amount;
    const discount = receivable.amount - finalAmount;
    const descriptionSuffix = discount > 0 ? ` (c/ Desc. R$ ${discount.toFixed(2)})` : '';

    receivable.status = 'paid';
    receivable.payment_date = paymentDate;
    receivable.bank_account_id = bankAccountId;
    receivable.description = receivable.description + descriptionSuffix;

    this.setStorage('accounts_receivable', receivables);

    // Register banking transaction (income) using the actual amount received
    this.registerTransaction({
      bank_account_id: bankAccountId,
      type: 'income',
      amount: finalAmount,
      description: `Recebimento: ${receivable.description}`,
      related_receivable_id: receivable.id,
      date: paymentDate
    });

    // Also update order status if linked to an order
    if (receivable.order_id) {
      const orders = this.getOrders();
      const oIndex = orders.findIndex(o => o.id === receivable.order_id);
      if (oIndex !== -1) {
        orders[oIndex].status = 'paid';
        orders[oIndex].updated_at = new Date().toISOString();
        this.setStorage('orders', orders);
      }
    }

    return receivable;
  }

  // Register Transaction helper
  private registerTransaction(data: {
    bank_account_id: string;
    type: 'income' | 'expense' | 'transfer_in' | 'transfer_out';
    amount: number;
    description: string;
    related_payable_id?: string | null;
    related_receivable_id?: string | null;
    date?: string;
  }): BankTransaction {
    const transactions = this.getBankTransactions();
    const accounts = this.getBankAccounts();
    const accIndex = accounts.findIndex(a => a.id === data.bank_account_id);

    if (accIndex === -1) throw new Error('Conta bancária não encontrada');

    const newTx: BankTransaction = {
      id: 'tx-' + generateId(),
      bank_account_id: data.bank_account_id,
      type: data.type,
      amount: data.amount,
      date: data.date || new Date().toISOString().substring(0, 10),
      description: data.description,
      reconciled: false,
      related_payable_id: data.related_payable_id || null,
      related_receivable_id: data.related_receivable_id || null,
      created_at: new Date().toISOString()
    };

    transactions.push(newTx);
    this.setStorage('bank_transactions', transactions);

    // Update account balance
    const currentBalance = accounts[accIndex].current_balance;
    if (data.type === 'income' || data.type === 'transfer_in') {
      accounts[accIndex].current_balance = Number((currentBalance + data.amount).toFixed(2));
    } else {
      accounts[accIndex].current_balance = Number((currentBalance - data.amount).toFixed(2));
    }
    this.setStorage('bank_accounts', accounts);

    return newTx;
  }

  transferBetweenAccounts(fromId: string, toId: string, amount: number, date: string, description: string): void {
    const accounts = this.getBankAccounts();
    const fromAcc = accounts.find(a => a.id === fromId);
    const toAcc = accounts.find(a => a.id === toId);

    if (!fromAcc || !toAcc) throw new Error('Contas bancárias inválidas');
    if (fromAcc.current_balance < amount) throw new Error('Saldo insuficiente na conta de origem');

    // Register Expense (Transfer Out) from source account
    this.registerTransaction({
      bank_account_id: fromId,
      type: 'transfer_out',
      amount,
      description: `Transf. para ${toAcc.bank_name}: ${description}`,
      date
    });

    // Register Income (Transfer In) to destination account
    this.registerTransaction({
      bank_account_id: toId,
      type: 'transfer_in',
      amount,
      description: `Transf. de ${fromAcc.bank_name}: ${description}`,
      date
    });
  }

  reconcileTransaction(txId: string, status: boolean): void {
    const transactions = this.getBankTransactions();
    const index = transactions.findIndex(t => t.id === txId);
    if (index !== -1) {
      transactions[index].reconciled = status;
      this.setStorage('bank_transactions', transactions);
    }
  }

  // CRM LEADS
  getLeads(): CrmLead[] {
    return this.getStorage<CrmLead[]>('crm_leads', defaultLeads);
  }

  createLead(data: Omit<CrmLead, 'id' | 'created_at' | 'updated_at'>): CrmLead {
    const leads = this.getLeads();
    const newLead: CrmLead = {
      ...data,
      id: `lead-${generateId()}`,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    leads.push(newLead);
    this.setStorage('crm_leads', leads);
    return newLead;
  }

  updateLead(id: string, data: Partial<CrmLead>): CrmLead {
    const leads = this.getLeads();
    const index = leads.findIndex(l => l.id === id);
    if (index === -1) throw new Error('Lead não encontrado');
    leads[index] = { ...leads[index], ...data, updated_at: new Date().toISOString() };
    this.setStorage('crm_leads', leads);
    return leads[index];
  }

  deleteLead(id: string): void {
    const leads = this.getLeads();
    this.setStorage('crm_leads', leads.filter(l => l.id !== id));
  }
}

const defaultLeads: CrmLead[] = [
  {
    id: 'lead-001',
    company_name: 'Chaveiro Tradição',
    contact_name: 'Marcos Tradição',
    city: 'Ribeirão Preto',
    state: 'SP',
    phone: '(16) 3333-1111',
    whatsapp: '(16) 99333-1111',
    stage: 'novo_lead',
    is_client: false,
    interactions: 0,
    created_at: new Date(Date.now() - 86400000 * 2).toISOString(),
    updated_at: new Date(Date.now() - 86400000 * 2).toISOString()
  },
  {
    id: 'lead-002',
    company_name: 'Casas & Apartamentos SP',
    contact_name: 'Ana Lima',
    city: 'Ribeirão Preto',
    state: 'SP',
    phone: '(16) 3344-5566',
    whatsapp: '(16) 99344-5566',
    stage: 'novo_lead',
    is_client: false,
    interactions: 1,
    created_at: new Date(Date.now() - 86400000 * 3).toISOString(),
    updated_at: new Date(Date.now() - 86400000 * 3).toISOString()
  },
  {
    id: 'lead-003',
    company_name: 'Chaveiro Móvel Santa Mônica',
    contact_name: 'Roberto Santa Mônica',
    city: 'Uberlândia',
    state: 'MG',
    phone: '(34) 3232-4545',
    whatsapp: '(34) 99232-4545',
    stage: 'novo_lead',
    is_client: false,
    interactions: 0,
    created_at: new Date(Date.now() - 86400000 * 1).toISOString(),
    updated_at: new Date(Date.now() - 86400000 * 1).toISOString()
  },
  {
    id: 'lead-004',
    company_name: 'Chaveiro Líder',
    contact_name: 'Fernando Líder',
    city: 'Uberlândia',
    state: 'MG',
    phone: '(34) 3210-9090',
    whatsapp: '(34) 99210-9090',
    stage: 'novo_lead',
    is_client: false,
    interactions: 2,
    created_at: new Date(Date.now() - 86400000 * 5).toISOString(),
    updated_at: new Date(Date.now() - 86400000 * 5).toISOString()
  },
  {
    id: 'lead-005',
    company_name: 'Alfredo Chaveiro 24H',
    contact_name: 'Alfredo Costa',
    city: 'Ribeirão Preto',
    state: 'SP',
    phone: '(16) 3555-7788',
    whatsapp: '(16) 99555-7788',
    stage: 'contato_feito',
    is_client: false,
    interactions: 3,
    created_at: new Date(Date.now() - 86400000 * 7).toISOString(),
    updated_at: new Date(Date.now() - 86400000 * 1).toISOString()
  },
  {
    id: 'lead-006',
    company_name: 'Chaveiro Mogiana',
    contact_name: 'Paulo Mogiana',
    city: 'Ribeirão Preto',
    state: 'SP',
    phone: '(16) 3666-2233',
    whatsapp: '(16) 99666-2233',
    stage: 'contato_feito',
    is_client: false,
    interactions: 2,
    created_at: new Date(Date.now() - 86400000 * 4).toISOString(),
    updated_at: new Date(Date.now() - 86400000 * 2).toISOString()
  },
  {
    id: 'lead-007',
    company_name: 'Chaveiro Santa Cruz',
    contact_name: 'Carlos Santa Cruz',
    city: 'Ribeirão Preto',
    state: 'SP',
    phone: '(16) 3777-4455',
    whatsapp: '(16) 99777-4455',
    stage: 'aguardando_retorno',
    is_client: false,
    interactions: 5,
    created_at: new Date(Date.now() - 86400000 * 10).toISOString(),
    updated_at: new Date(Date.now() - 86400000 * 3).toISOString()
  },
  {
    id: 'lead-008',
    company_name: 'Port Chaves',
    contact_name: 'Sérgio Port',
    city: 'Ribeirão Preto',
    state: 'SP',
    phone: '(16) 3888-6677',
    whatsapp: '(16) 99888-6677',
    stage: 'aguardando_retorno',
    is_client: false,
    interactions: 4,
    created_at: new Date(Date.now() - 86400000 * 8).toISOString(),
    updated_at: new Date(Date.now() - 86400000 * 2).toISOString()
  },
  {
    id: 'lead-009',
    company_name: 'Chaveiro Ribeirânia',
    contact_name: 'Luiz Ribeirânia',
    city: 'Ribeirão Preto',
    state: 'SP',
    phone: '(16) 3999-8800',
    whatsapp: '(16) 99999-8800',
    stage: 'aguardando_retorno',
    is_client: false,
    interactions: 3,
    created_at: new Date(Date.now() - 86400000 * 6).toISOString(),
    updated_at: new Date(Date.now() - 86400000 * 4).toISOString()
  },
  {
    id: 'lead-010',
    company_name: 'Duran & Spagnol Chaves',
    contact_name: 'Duran Spagnol',
    city: 'Ribeirão Preto',
    state: 'SP',
    phone: '(16) 3111-2222',
    whatsapp: '(16) 99111-2222',
    stage: 'cliente',
    is_client: true,
    interactions: 12,
    created_at: new Date(Date.now() - 86400000 * 30).toISOString(),
    updated_at: new Date(Date.now() - 86400000 * 5).toISOString()
  },
  {
    id: 'lead-011',
    company_name: 'Chaveiro Ribeirão 24H',
    contact_name: 'Marcos Ribeirão',
    city: 'Ribeirão Preto',
    state: 'SP',
    phone: '(16) 3222-3333',
    whatsapp: '(16) 99222-3333',
    stage: 'cliente',
    is_client: true,
    interactions: 8,
    created_at: new Date(Date.now() - 86400000 * 25).toISOString(),
    updated_at: new Date(Date.now() - 86400000 * 7).toISOString()
  },
  {
    id: 'lead-012',
    company_name: 'Chaveiro Mário',
    contact_name: 'Mário Silva',
    city: 'Ribeirão Preto',
    state: 'SP',
    phone: '(16) 3333-4444',
    whatsapp: '(16) 99333-4444',
    stage: 'cliente',
    is_client: true,
    interactions: 6,
    created_at: new Date(Date.now() - 86400000 * 20).toISOString(),
    updated_at: new Date(Date.now() - 86400000 * 10).toISOString()
  },
  {
    id: 'lead-013',
    company_name: 'Chaveiro Maiami',
    contact_name: 'João Maiami',
    city: 'Ribeirão Preto',
    state: 'SP',
    phone: '(16) 3444-5555',
    whatsapp: '(16) 99444-5555',
    stage: 'pedido',
    is_client: true,
    interactions: 15,
    created_at: new Date(Date.now() - 86400000 * 45).toISOString(),
    updated_at: new Date(Date.now() - 86400000 * 1).toISOString()
  },
  {
    id: 'lead-014',
    company_name: 'Chaveiro Casa Nova',
    contact_name: 'Pedro Casa Nova',
    city: 'Uberaba',
    state: 'MG',
    phone: '(34) 3555-6666',
    whatsapp: '(34) 99555-6666',
    stage: 'pedido',
    is_client: true,
    interactions: 9,
    created_at: new Date(Date.now() - 86400000 * 35).toISOString(),
    updated_at: new Date(Date.now() - 86400000 * 2).toISOString()
  },
  {
    id: 'lead-015',
    company_name: 'LB Chaves',
    contact_name: 'Leandro Borges',
    city: 'Ribeirão Preto',
    state: 'SP',
    phone: '(16) 3666-7777',
    whatsapp: '(16) 99666-7777',
    stage: 'pedido',
    is_client: true,
    interactions: 11,
    created_at: new Date(Date.now() - 86400000 * 40).toISOString(),
    updated_at: new Date(Date.now() - 86400000 * 3).toISOString()
  }
];

const defaultBanner: Banner = {
  id: 'banner-main',
  title: 'Quanto mais você leva, mais barato fica',
  subtitle: 'Entenda as três tabelas de desconto em 30 segundos.',
  badge: 'DESCONTO PROGRESSIVO',
  button_text: 'Ver tabelas de desconto',
  button_link: '/descontos',
  image_url: '/promo_banner_keys.jpg',
  is_active: true,
  updated_at: new Date().toISOString()
};

export const mockDb = new MockDatabase();
export default mockDb;

