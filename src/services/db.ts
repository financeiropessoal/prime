import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { mockDb } from '@/lib/db-mock';
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
} from '@/lib/database.types';

// Generic delay helper to simulate network latency for mock db
const delay = (ms = 150) => new Promise(resolve => setTimeout(resolve, ms));

export const dbService = {
  // ----------------------------------------------------
  // PROFILES & AUTH SERVICE
  // ----------------------------------------------------
  async getProfile(userId: string): Promise<Profile | null> {
    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();
      if (error) return null;
      return data;
    }
    await delay();
    const profiles = mockDb.getProfiles();
    return profiles.find(p => p.id === userId) || null;
  },

  async getProfileByEmail(email: string): Promise<Profile | null> {
    await delay();
    const profiles = mockDb.getProfiles();
    return profiles.find(p => p.email.toLowerCase() === email.toLowerCase()) || null;
  },

  // ----------------------------------------------------
  // PRODUCTS & STOCK SERVICES
  // ----------------------------------------------------
  async getProducts(): Promise<Product[]> {
    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase
        .from('products')
        .select('id, name, sku, barcode, category, brand, description, cost_price, sale_price, package_qty, package_discount_pct, stock_current, stock_minimum, status, created_at, updated_at, supplier_id, vehicle_compatibility, images')
        .order('name', { ascending: true });
      if (error) {
        // Fallback: retry without images column if column doesn't exist yet
        const { data: data2, error: err2 } = await supabase
          .from('products')
          .select('id, name, sku, barcode, category, brand, description, cost_price, sale_price, package_qty, package_discount_pct, stock_current, stock_minimum, status, created_at, updated_at, supplier_id, vehicle_compatibility')
          .order('name', { ascending: true });
        if (err2) throw err2;
        return (data2 || []).map(p => ({ ...p, images: [] }));
      }
      return (data || []).map(p => ({ ...p, images: (p as any).images || [] }));
    }
    await delay();
    return mockDb.getProducts().sort((a, b) => a.name.localeCompare(b.name));
  },

  async getProductById(id: string): Promise<Product | null> {
    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase
        .from('products')
        .select('id, name, sku, barcode, category, brand, description, cost_price, sale_price, package_qty, package_discount_pct, stock_current, stock_minimum, status, created_at, updated_at, supplier_id, vehicle_compatibility, images')
        .eq('id', id)
        .single();
      if (error) {
        // Fallback without images column
        const { data: data2, error: err2 } = await supabase
          .from('products')
          .select('id, name, sku, barcode, category, brand, description, cost_price, sale_price, package_qty, package_discount_pct, stock_current, stock_minimum, status, created_at, updated_at, supplier_id, vehicle_compatibility')
          .eq('id', id)
          .single();
        if (err2) return null;
        return data2 ? { ...data2, images: [] } : null;
      }
      return data ? { ...data, images: (data as any).images || [] } : null;
    }
    await delay();
    return mockDb.getProducts().find(p => p.id === id) || null;
  },


  async getProductImages(id: string): Promise<string[]> {
    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase
        .from('products')
        .select('images')
        .eq('id', id)
        .single();
      if (error) return [];
      return data?.images || [];
    }
    await delay();
    const prod = mockDb.getProducts().find(p => p.id === id);
    return prod?.images || [];
  },

  async createProduct(data: Omit<Product, 'id' | 'created_at' | 'updated_at'>): Promise<Product> {
    if (isSupabaseConfigured && supabase) {
      const { data: newProd, error } = await supabase
        .from('products')
        .insert(data)
        .select()
        .single();
      if (error) throw error;
      return newProd;
    }
    await delay();
    return mockDb.createProduct(data);
  },

  async updateProduct(id: string, data: Partial<Product>): Promise<Product> {
    if (isSupabaseConfigured && supabase) {
      const { data: updatedProd, error } = await supabase
        .from('products')
        .update({ ...data, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return updatedProd;
    }
    await delay();
    return mockDb.updateProduct(id, data);
  },

  async deleteProduct(id: string): Promise<void> {
    if (isSupabaseConfigured && supabase) {
      // 1. Delete associated stock movements
      await supabase.from('stock_movements').delete().eq('product_id', id);

      // 2. Try to delete the product
      const { error } = await supabase
        .from('products')
        .delete()
        .eq('id', id);
      
      if (error) {
        // Code 23503 is foreign key violation (e.g. order_items)
        if (error.code === '23503') {
          const { error: updateErr } = await supabase
            .from('products')
            .update({ status: 'inactive' })
            .eq('id', id);
          if (updateErr) throw updateErr;
          throw new Error('REFERENCED_BY_SALES');
        }
        throw error;
      }
      return;
    }
    await delay();
    mockDb.deleteProduct(id);
  },

  async getStockMovements(): Promise<StockMovement[]> {
    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase
        .from('stock_movements')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    }
    await delay();
    return mockDb.getStockMovements().sort((a, b) => b.created_at.localeCompare(a.created_at));
  },

  async createStockMovement(
    productId: string,
    type: 'input' | 'output_sale' | 'manual_adjustment',
    quantity: number,
    justification: string | null
  ): Promise<StockMovement> {
    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase
        .from('stock_movements')
        .insert({ product_id: productId, type, quantity, justification })
        .select()
        .single();
      if (error) throw error;
      return data;
    }
    await delay();
    return mockDb.createStockMovement(productId, type, quantity, justification);
  },

  // ----------------------------------------------------
  // CLIENTS SERVICES
  // ----------------------------------------------------
  async getClients(): Promise<Client[]> {
    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase
        .from('clients')
        .select('*')
        .order('name', { ascending: true });
      if (error) throw error;
      return data || [];
    }
    await delay();
    return mockDb.getClients().sort((a, b) => a.name.localeCompare(b.name));
  },

  async createClient(data: Omit<Client, 'id' | 'created_at'>): Promise<Client> {
    if (isSupabaseConfigured && supabase) {
      const { data: newClient, error } = await supabase
        .from('clients')
        .insert(data)
        .select()
        .single();
      if (error) throw error;
      return newClient;
    }
    await delay();
    return mockDb.createClient(data);
  },

  async updateClient(id: string, data: Partial<Client>): Promise<Client> {
    if (isSupabaseConfigured && supabase) {
      const { data: updatedClient, error } = await supabase
        .from('clients')
        .update(data)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return updatedClient;
    }
    await delay();
    return mockDb.updateClient(id, data);
  },

  async deleteClient(id: string): Promise<void> {
    if (isSupabaseConfigured && supabase) {
      const { error } = await supabase
        .from('clients')
        .delete()
        .eq('id', id);
      if (error) throw error;
      return;
    }
    await delay();
    mockDb.deleteClient(id);
  },

  // ----------------------------------------------------
  // SUPPLIERS SERVICES
  // ----------------------------------------------------
  async getSuppliers(): Promise<Supplier[]> {
    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase
        .from('suppliers')
        .select('*')
        .order('company_name', { ascending: true });
      if (error) throw error;
      return data || [];
    }
    await delay();
    return mockDb.getSuppliers().sort((a, b) => a.company_name.localeCompare(b.company_name));
  },

  async createSupplier(data: Omit<Supplier, 'id' | 'created_at'>): Promise<Supplier> {
    if (isSupabaseConfigured && supabase) {
      const { data: newSupplier, error } = await supabase
        .from('suppliers')
        .insert(data)
        .select()
        .single();
      if (error) throw error;
      return newSupplier;
    }
    await delay();
    return mockDb.createSupplier(data);
  },

  async updateSupplier(id: string, data: Partial<Supplier>): Promise<Supplier> {
    if (isSupabaseConfigured && supabase) {
      const { data: updated, error } = await supabase
        .from('suppliers')
        .update(data)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return updated;
    }
    await delay();
    return mockDb.updateSupplier(id, data);
  },

  async deleteSupplier(id: string): Promise<void> {
    if (isSupabaseConfigured && supabase) {
      const { error } = await supabase
        .from('suppliers')
        .delete()
        .eq('id', id);
      if (error) throw error;
      return;
    }
    await delay();
    mockDb.deleteSupplier(id);
  },

  // ----------------------------------------------------
  // ORDERS & ITEMS
  // ----------------------------------------------------
  async getOrders(): Promise<Order[]> {
    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    }
    await delay();
    return mockDb.getOrders().sort((a, b) => b.created_at.localeCompare(a.created_at));
  },

  async getOrderItems(orderId?: string): Promise<OrderItem[]> {
    if (isSupabaseConfigured && supabase) {
      const query = supabase.from('order_items').select('*');
      if (orderId) query.eq('order_id', orderId);
      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    }
    await delay();
    const items = mockDb.getOrderItems();
    return orderId ? items.filter(i => i.order_id === orderId) : items;
  },

  async createOrder(data: {
    client_id: string;
    total_amount: number;
    shipping_cost: number;
    shipping_address: Order['shipping_address'];
    payment_method: Order['payment_method'];
    items: { product_id: string; quantity: number; unit_price: number }[];
    status?: Order['status'];
    bank_account_id?: string;
  }): Promise<Order> {
    if (isSupabaseConfigured && supabase) {
      // In Supabase, we would call an RPC to do this transactionally
      // Or we insert order, then items, since triggers handle the stock & receivables
      const validPaymentMethods = ['pix', 'card', 'boleto', 'faturado'];
      let pm = (data.payment_method || '').toLowerCase();
      if (!validPaymentMethods.includes(pm)) {
        if (pm.includes('dinheiro') || pm.includes('cash')) pm = 'pix';
        else if (pm.includes('cart') || pm.includes('card') || pm.includes('credito') || pm.includes('debito')) pm = 'card';
        else if (pm.includes('fat') || pm.includes('prazo')) pm = 'faturado';
        else pm = 'pix';
      }

      const { data: newOrder, error: oErr } = await supabase
        .from('orders')
        .insert({
          client_id: data.client_id,
          total_amount: data.total_amount,
          shipping_cost: data.shipping_cost,
          shipping_address: data.shipping_address,
          payment_method: pm,
          status: data.status || 'waiting_payment'
        })
        .select()
        .single();

      if (oErr) throw oErr;

      const itemsToInsert = data.items.map(item => ({
        order_id: newOrder.id,
        product_id: item.product_id,
        quantity: item.quantity,
        unit_price: item.unit_price
      }));

      const { error: iErr } = await supabase
        .from('order_items')
        .insert(itemsToInsert);

      if (iErr) throw iErr;

      return newOrder;
    }
    await delay();
    return mockDb.createOrder(data);
  },

  // ----------------------------------------------------
  // BANK ACCOUNTS
  // ----------------------------------------------------
  async getBankAccounts(): Promise<BankAccount[]> {
    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase
        .from('bank_accounts')
        .select('*')
        .order('bank_name', { ascending: true });
      if (error) throw error;
      return data || [];
    }
    await delay();
    return mockDb.getBankAccounts();
  },

  async createBankAccount(data: Omit<BankAccount, 'id' | 'current_balance' | 'created_at'>): Promise<BankAccount> {
    if (isSupabaseConfigured && supabase) {
      const { data: newAcc, error } = await supabase
        .from('bank_accounts')
        .insert({ ...data, current_balance: data.initial_balance })
        .select()
        .single();
      if (error) throw error;
      return newAcc;
    }
    await delay();
    return mockDb.createBankAccount(data);
  },

  async updateBankAccount(id: string, data: Partial<BankAccount>): Promise<BankAccount> {
    if (isSupabaseConfigured && supabase) {
      const { data: updated, error } = await supabase
        .from('bank_accounts')
        .update(data)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return updated;
    }
    await delay();
    return mockDb.updateBankAccount(id, data);
  },

  async deleteBankAccount(id: string): Promise<void> {
    if (isSupabaseConfigured && supabase) {
      const { error } = await supabase
        .from('bank_accounts')
        .delete()
        .eq('id', id);
      if (error) throw error;
      return;
    }
    await delay();
    return mockDb.deleteBankAccount(id);
  },

  // ----------------------------------------------------
  // ACCOUNTS PAYABLE (Contas a Pagar)
  // ----------------------------------------------------
  async getAccountsPayable(): Promise<AccountPayable[]> {
    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase
        .from('accounts_payable')
        .select('*')
        .order('due_date', { ascending: true });
      if (error) throw error;
      return data || [];
    }
    await delay();
    return mockDb.getAccountsPayable().sort((a, b) => a.due_date.localeCompare(b.due_date));
  },

  async createAccountPayable(data: Omit<AccountPayable, 'id' | 'status' | 'payment_date' | 'created_at'> & { installments?: number }): Promise<AccountPayable[]> {
    if (isSupabaseConfigured && supabase) {
      // In Supabase, if it is multi-installment, we do it in a loop
      const created: AccountPayable[] = [];
      const recurrenceId = data.recurrence_id || (data.installments && data.installments > 1 ? 'rec-group-' + Math.random().toString(36).substring(2, 9) : null);
      const installmentsCount = data.installments || 1;

      for (let i = 0; i < installmentsCount; i++) {
        const dueDate = new Date(data.due_date);
        dueDate.setMonth(dueDate.getMonth() + i);

        const { data: payable, error } = await supabase
          .from('accounts_payable')
          .insert({
            supplier_id: data.supplier_id,
            description: installmentsCount > 1 ? `${data.description} (${i + 1}/${installmentsCount})` : data.description,
            category: data.category,
            amount: Number((data.amount / installmentsCount).toFixed(2)),
            issue_date: data.issue_date,
            due_date: dueDate.toISOString().substring(0, 10),
            payment_method: data.payment_method,
            attachment_url: data.attachment_url,
            recurrence_id: recurrenceId,
            status: 'pending'
          })
          .select()
          .single();

        if (error) throw error;
        created.push(payable);
      }
      return created;
    }
    await delay();
    return mockDb.createAccountPayable(data);
  },

  async payAccountPayable(id: string, bankAccountId: string, paymentDate: string): Promise<AccountPayable> {
    if (isSupabaseConfigured && supabase) {
      // 1. Get payable to know amount
      const { data: payable, error: getErr } = await supabase
        .from('accounts_payable')
        .select('*')
        .eq('id', id)
        .single();
      if (getErr) throw getErr;
      if (payable.status === 'paid') throw new Error('Título já está pago');

      // 2. Update status of payable
      const { data: updatedPayable, error: updErr } = await supabase
        .from('accounts_payable')
        .update({
          status: 'paid',
          payment_date: paymentDate,
          bank_account_id: bankAccountId
        })
        .eq('id', id)
        .select()
        .single();
      if (updErr) throw updErr;

      // 3. Register transaction (expense)
      const { error: txErr } = await supabase
        .from('bank_transactions')
        .insert({
          bank_account_id: bankAccountId,
          type: 'expense',
          amount: payable.amount,
          description: `Pagamento: ${payable.description}`,
          related_payable_id: payable.id,
          date: paymentDate
        });
      if (txErr) throw txErr;

      // 4. Update bank account balance
      const { data: bankAcc, error: bankErr } = await supabase
        .from('bank_accounts')
        .select('current_balance')
        .eq('id', bankAccountId)
        .single();
      if (bankErr) throw bankErr;

      const newBalance = Number((bankAcc.current_balance - payable.amount).toFixed(2));
      const { error: bankUpdErr } = await supabase
        .from('bank_accounts')
        .update({ current_balance: newBalance })
        .eq('id', bankAccountId);
      if (bankUpdErr) throw bankUpdErr;

      return updatedPayable;
    }
    await delay();
    return mockDb.payAccountPayable(id, bankAccountId, paymentDate);
  },

  // ----------------------------------------------------
  // ACCOUNTS RECEIVABLE (Contas a Receber)
  // ----------------------------------------------------
  async getAccountsReceivable(): Promise<AccountReceivable[]> {
    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase
        .from('accounts_receivable')
        .select('*')
        .order('due_date', { ascending: true });
      if (error) throw error;
      return data || [];
    }
    await delay();
    return mockDb.getAccountsReceivable().sort((a, b) => a.due_date.localeCompare(b.due_date));
  },

  async createAccountReceivable(data: Omit<AccountReceivable, 'id' | 'status' | 'payment_date' | 'created_at'>): Promise<AccountReceivable> {
    if (isSupabaseConfigured && supabase) {
      const { data: newRec, error } = await supabase
        .from('accounts_receivable')
        .insert({ ...data, status: 'pending' })
        .select()
        .single();
      if (error) throw error;
      return newRec;
    }
    await delay();
    return mockDb.createAccountReceivable(data);
  },

  async receiveAccountReceivable(id: string, bankAccountId: string, paymentDate: string, actualAmount?: number): Promise<AccountReceivable> {
    if (isSupabaseConfigured && supabase) {
      // 1. Get receivable
      const { data: receivable, error: getErr } = await supabase
        .from('accounts_receivable')
        .select('*')
        .eq('id', id)
        .single();
      if (getErr) throw getErr;
      if (receivable.status === 'paid') throw new Error('Título já recebido');

      const finalAmount = actualAmount !== undefined ? actualAmount : receivable.amount;
      const discount = receivable.amount - finalAmount;
      const descriptionSuffix = discount > 0 ? ` (c/ Desc. R$ ${discount.toFixed(2)})` : '';

      // 2. Update receivable
      const { data: updatedRec, error: updErr } = await supabase
        .from('accounts_receivable')
        .update({
          status: 'paid',
          payment_date: paymentDate,
          bank_account_id: bankAccountId,
          description: receivable.description + descriptionSuffix
        })
        .eq('id', id)
        .select()
        .single();
      if (updErr) throw updErr;

      // 3. Register transaction (income)
      const { error: txErr } = await supabase
        .from('bank_transactions')
        .insert({
          bank_account_id: bankAccountId,
          type: 'income',
          amount: finalAmount,
          description: `Recebimento: ${receivable.description}${descriptionSuffix}`,
          related_receivable_id: receivable.id,
          date: paymentDate
        });
      if (txErr) throw txErr;

      // 4. Update bank account balance
      const { data: bankAcc, error: bankErr } = await supabase
        .from('bank_accounts')
        .select('current_balance')
        .eq('id', bankAccountId)
        .single();
      if (bankErr) throw bankErr;

      const newBalance = Number((bankAcc.current_balance + finalAmount).toFixed(2));
      const { error: bankUpdErr } = await supabase
        .from('bank_accounts')
        .update({ current_balance: newBalance })
        .eq('id', bankAccountId);
      if (bankUpdErr) throw bankUpdErr;

      // 5. If linked to order, mark order as paid
      if (receivable.order_id) {
        const { error: ordErr } = await supabase
          .from('orders')
          .update({ status: 'paid', updated_at: new Date().toISOString() })
          .eq('id', receivable.order_id);
        if (ordErr) throw ordErr;
      }

      return updatedRec;
    }
    await delay();
    return mockDb.receiveAccountReceivable(id, bankAccountId, paymentDate, actualAmount);
  },

  // ----------------------------------------------------
  // BANK TRANSACTIONS (Extrato e Conciliação)
  // ----------------------------------------------------
  async getBankTransactions(): Promise<BankTransaction[]> {
    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase
        .from('bank_transactions')
        .select('*')
        .order('date', { ascending: false });
      if (error) throw error;
      return data || [];
    }
    await delay();
    return mockDb.getBankTransactions().sort((a, b) => b.date.localeCompare(a.date));
  },

  async transferBetweenAccounts(fromId: string, toId: string, amount: number, date: string, description: string): Promise<void> {
    if (isSupabaseConfigured && supabase) {
      // In Supabase we do this via transaction, subtracting and adding, inserting two transactions
      // Get bank accounts
      const { data: fromAcc, error: fErr } = await supabase.from('bank_accounts').select('*').eq('id', fromId).single();
      const { data: toAcc, error: tErr } = await supabase.from('bank_accounts').select('*').eq('id', toId).single();
      if (fErr || tErr) throw new Error('Contas bancárias inválidas');

      if (fromAcc.current_balance < amount) throw new Error('Saldo insuficiente');

      // Update fromAcc
      const { error: fUpd } = await supabase.from('bank_accounts').update({ current_balance: fromAcc.current_balance - amount }).eq('id', fromId);
      // Update toAcc
      const { error: tUpd } = await supabase.from('bank_accounts').update({ current_balance: toAcc.current_balance + amount }).eq('id', toId);
      if (fUpd || tUpd) throw new Error('Erro ao atualizar saldos');

      // Insert transaction logs
      await supabase.from('bank_transactions').insert([
        {
          bank_account_id: fromId,
          type: 'transfer_out',
          amount,
          description: `Transf. para ${toAcc.bank_name}: ${description}`,
          date
        },
        {
          bank_account_id: toId,
          type: 'transfer_in',
          amount,
          description: `Transf. de ${fromAcc.bank_name}: ${description}`,
          date
        }
      ]);
      return;
    }
    await delay();
    mockDb.transferBetweenAccounts(fromId, toId, amount, date, description);
  },

  async reconcileTransaction(txId: string, status: boolean): Promise<void> {
    if (isSupabaseConfigured && supabase) {
      const { error } = await supabase
        .from('bank_transactions')
        .update({ reconciled: status })
        .eq('id', txId);
      if (error) throw error;
      return;
    }
    await delay();
    mockDb.reconcileTransaction(txId, status);
  },

  // ----------------------------------------------------
  // CRM LEADS SERVICES
  // ----------------------------------------------------
  async getLeads(): Promise<CrmLead[]> {
    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase
        .from('crm_leads')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    }
    await delay();
    return mockDb.getLeads();
  },

  async createLead(leadData: Omit<CrmLead, 'id' | 'created_at' | 'updated_at'>): Promise<CrmLead> {
    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase
        .from('crm_leads')
        .insert([leadData])
        .select()
        .single();
      if (error) throw error;
      return data;
    }
    await delay();
    return mockDb.createLead(leadData);
  },

  async updateLead(id: string, leadData: Partial<CrmLead>): Promise<CrmLead> {
    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase
        .from('crm_leads')
        .update(leadData)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    }
    await delay();
    return mockDb.updateLead(id, leadData);
  },

  async deleteLead(id: string): Promise<void> {
    if (isSupabaseConfigured && supabase) {
      const { error } = await supabase
        .from('crm_leads')
        .delete()
        .eq('id', id);
      if (error) throw error;
      return;
    }
    await delay();
    mockDb.deleteLead(id);
  },

  // ----------------------------------------------------
  // BANNER PROMO SERVICES
  // ----------------------------------------------------
  async getBanner(): Promise<Banner> {
    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase
        .from('banners')
        .select('*')
        .single();
      if (error) {
        if (error.code === 'PGRST116') {
          return mockDb.getBanner();
        }
        throw error;
      }
      return data;
    }
    await delay();
    return mockDb.getBanner();
  },

  async updateBanner(data: Partial<Banner>): Promise<Banner> {
    if (isSupabaseConfigured && supabase) {
      const { data: current, error: getErr } = await supabase
        .from('banners')
        .select('id')
        .single();
      
      if (getErr && getErr.code === 'PGRST116') {
        const { data: inserted, error: insErr } = await supabase
          .from('banners')
          .insert(data)
          .select()
          .single();
        if (insErr) throw insErr;
        return inserted;
      } else if (getErr) {
        throw getErr;
      }

      const { data: updated, error: updErr } = await supabase
        .from('banners')
        .update({ ...data, updated_at: new Date().toISOString() })
        .eq('id', current.id)
        .select()
        .single();
      if (updErr) throw updErr;
      return updated;
    }
    await delay();
    return mockDb.updateBanner(data);
  },

  async getTripSettlements(): Promise<TripSettlement[]> {
    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase
        .from('trip_settlements')
        .select('*')
        .order('start_date', { ascending: false });
      if (error) throw error;
      return data || [];
    }
    await delay();
    return mockDb.getTripSettlements().sort((a, b) => b.start_date.localeCompare(a.start_date));
  },

  async createTripSettlement(data: Omit<TripSettlement, 'id' | 'created_at' | 'updated_at'>, bankAccountId?: string): Promise<TripSettlement> {
    if (isSupabaseConfigured && supabase) {
      const { data: newS, error } = await supabase
        .from('trip_settlements')
        .insert(data)
        .select()
        .single();
      if (error) throw error;

      if (data.status === 'transferred' && bankAccountId) {
        // Register transaction
        const { error: txErr } = await supabase
          .from('bank_transactions')
          .insert({
            bank_account_id: bankAccountId,
            type: 'expense',
            amount: data.net_profit,
            description: `Retirada de Pró-labore: ${data.description}`,
            date: new Date().toISOString().substring(0, 10)
          });
        if (txErr) throw txErr;

        // Fetch balance
        const { data: bankAcc, error: bankErr } = await supabase
          .from('bank_accounts')
          .select('current_balance')
          .eq('id', bankAccountId)
          .single();
        if (bankErr) throw bankErr;

        const newBalance = Number((bankAcc.current_balance - data.net_profit).toFixed(2));
        const { error: bankUpdErr } = await supabase
          .from('bank_accounts')
          .update({ current_balance: newBalance })
          .eq('id', bankAccountId);
        if (bankUpdErr) throw bankUpdErr;
      }

      return newS;
    }
    await delay();
    return mockDb.createTripSettlement(data, bankAccountId);
  },

  async updateTripSettlementStatus(id: string, status: 'pending_transfer' | 'transferred'): Promise<TripSettlement> {
    if (isSupabaseConfigured && supabase) {
      const { data: updatedS, error } = await supabase
        .from('trip_settlements')
        .update({ status, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return updatedS;
    }
    await delay();
    return mockDb.updateTripSettlementStatus(id, status);
  },

  async withdrawTripSettlement(id: string, amount: number, bankAccountId?: string): Promise<TripSettlement> {
    if (isSupabaseConfigured && supabase) {
      const { data: current, error: getErr } = await supabase
        .from('trip_settlements')
        .select('*')
        .eq('id', id)
        .single();
      if (getErr) throw getErr;

      const newTransferred = Number((Number(current.transferred_amount || 0) + amount).toFixed(2));
      const finalTransferred = Math.min(Number(current.net_profit), newTransferred);
      const newStatus = finalTransferred >= Number(current.net_profit) ? 'transferred' : 'pending_transfer';

      const { data: updatedS, error } = await supabase
        .from('trip_settlements')
        .update({ 
          transferred_amount: finalTransferred, 
          status: newStatus,
          updated_at: new Date().toISOString() 
        })
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;

      if (bankAccountId) {
        // Register transaction
        const { error: txErr } = await supabase
          .from('bank_transactions')
          .insert({
            bank_account_id: bankAccountId,
            type: 'expense',
            amount: amount,
            description: `Retirada de Pró-labore: ${current.description}`,
            date: new Date().toISOString().substring(0, 10)
          });
        if (txErr) throw txErr;

        // Fetch balance
        const { data: bankAcc, error: bankErr } = await supabase
          .from('bank_accounts')
          .select('current_balance')
          .eq('id', bankAccountId)
          .single();
        if (bankErr) throw bankErr;

        const newBalance = Number((bankAcc.current_balance - amount).toFixed(2));
        const { error: bankUpdErr } = await supabase
          .from('bank_accounts')
          .update({ current_balance: newBalance })
          .eq('id', bankAccountId);
        if (bankUpdErr) throw bankUpdErr;
      }

      return updatedS;
    }
    await delay();
    return mockDb.withdrawTripSettlement(id, amount, bankAccountId);
  }
};

export default dbService;

