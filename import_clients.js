const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

// 1. Read env variables from .env.local
const envPath = path.join(__dirname, '.env.local');
let supabaseUrl = '';
let supabaseAnonKey = '';

try {
  const envContent = fs.readFileSync(envPath, 'utf8');
  const lines = envContent.split('\n');
  for (const line of lines) {
    if (line.startsWith('NEXT_PUBLIC_SUPABASE_URL=')) {
      supabaseUrl = line.split('=')[1].trim();
    }
    if (line.startsWith('NEXT_PUBLIC_SUPABASE_ANON_KEY=')) {
      supabaseAnonKey = line.split('=')[1].trim();
    }
  }
} catch (e) {
  console.error('Erro ao ler .env.local:', e.message);
  process.exit(1);
}

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Chaves do Supabase não encontradas no .env.local');
  process.exit(1);
}

console.log('Conectando ao Supabase:', supabaseUrl);
const supabase = createClient(supabaseUrl, supabaseAnonKey);

// 2. Read and parse CSV
const csvPath = path.join(__dirname, 'Relacao_Clientes_Completa.csv');
let csvContent = '';

try {
  csvContent = fs.readFileSync(csvPath, 'utf8');
} catch (e) {
  console.error('Erro ao ler Relacao_Clientes_Completa.csv:', e.message);
  process.exit(1);
}

const lines = csvContent.split('\n');
const headers = lines[0].split(';');

console.log('Colunas detectadas:', headers);

const clientsToInsert = [];
let generatedDocIndex = 1;

for (let i = 1; i < lines.length; i++) {
  const line = lines[i].trim();
  if (!line) continue;

  const values = line.split(';');
  if (values.length < headers.length) continue;

  const nomeFantasia = values[0] ? values[0].trim() : '';
  const razaoSocial = values[1] ? values[1].trim() : '';
  const cnpjCpfRaw = values[2] ? values[2].trim() : '';
  const telefone = values[3] ? values[3].trim() : '';
  const email = values[4] ? values[4].trim() : '';
  const cidade = values[5] ? values[5].trim() : '';
  const estado = values[6] ? values[6].trim() : '';
  const endereco = values[7] ? values[7].trim() : '';
  const numero = values[8] ? values[8].trim() : '';
  const bairro = values[9] ? values[9].trim() : '';
  const cep = values[10] ? values[10].trim() : '';

  const name = nomeFantasia || razaoSocial || 'Cliente Importado';

  let document = cnpjCpfRaw.replace(/[^0-9]/g, '');
  if (!document || cnpjCpfRaw === '-' || cnpjCpfRaw === '') {
    document = `SEM-CNPJ-${String(generatedDocIndex++).padStart(4, '0')}`;
  }

  const type = document.length === 11 ? 'pf' : 'pj';

  const addresses = [];
  if (endereco && endereco !== '-') {
    addresses.push({
      street: endereco,
      number: numero === '-' ? '' : numero,
      complement: null,
      neighborhood: bairro === '-' ? '' : bairro,
      city: cidade === '-' ? '' : cidade,
      state: estado === '-' ? 'SP' : estado,
      zip_code: cep === '-' ? '' : cep,
      is_default: true
    });
  }

  clientsToInsert.push({
    name,
    type,
    document,
    phone: (telefone && telefone !== '-') ? telefone : null,
    email: (email && email !== '-') ? email : null,
    addresses: JSON.stringify(addresses),
    created_at: new Date().toISOString()
  });
}

console.log(`Total de ${clientsToInsert.length} clientes prontos para importação.`);

async function importData() {
  let countSuccess = 0;
  let countFail = 0;

  for (const client of clientsToInsert) {
    console.log(`Inserindo: ${client.name} (${client.document})...`);
    const { data, error } = await supabase
      .from('clients')
      .insert({
        name: client.name,
        type: client.type,
        document: client.document,
        phone: client.phone,
        email: client.email,
        addresses: JSON.parse(client.addresses)
      })
      .select();

    if (error) {
      console.error(`Erro ao inserir ${client.name}:`, error.message);
      countFail++;
    } else {
      console.log(`Sucesso: ${client.name} inserido.`);
      countSuccess++;
    }
  }
  console.log(`Importação concluída! Sucesso: ${countSuccess}, Erros: ${countFail}`);
}

importData();
