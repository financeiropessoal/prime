const fs = require('fs');
const path = require('path');

const csvPath = path.join(__dirname, 'Relacao_Clientes_Completa.csv');
let csvContent = '';

try {
  // Read with latin1 to preserve accentuation
  csvContent = fs.readFileSync(csvPath, 'latin1');
  // Replace the special em-dash \x97 with standard dash
  csvContent = csvContent.replace(/\x97/g, '-');
} catch (e) {
  console.error('Erro ao ler Relacao_Clientes_Completa.csv:', e.message);
  process.exit(1);
}

const lines = csvContent.split('\n');
const headers = lines[0].split(';');

const sqlStatements = [];
sqlStatements.push('-- IMPORTAÇÃO DE CLIENTES DA PLANILHA');
sqlStatements.push('BEGIN;');

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

  const name = (nomeFantasia || razaoSocial || 'Cliente Importado').replace(/'/g, "''");

  let document = cnpjCpfRaw.replace(/[^0-9]/g, '');
  if (!document || cnpjCpfRaw === '-' || cnpjCpfRaw === '') {
    document = `SEM-CNPJ-${String(generatedDocIndex++).padStart(4, '0')}`;
  }

  const type = document.length === 11 ? 'pf' : 'pj';

  const addresses = [];
  if (endereco && endereco !== '-') {
    addresses.push({
      street: endereco.replace(/'/g, "''"),
      number: (numero === '-' ? '' : numero).replace(/'/g, "''"),
      complement: null,
      neighborhood: (bairro === '-' ? '' : bairro).replace(/'/g, "''"),
      city: (cidade === '-' ? '' : cidade).replace(/'/g, "''"),
      state: (estado === '-' ? 'SP' : estado).replace(/'/g, "''"),
      zip_code: (cep === '-' ? '' : cep).replace(/'/g, "''"),
      is_default: true
    });
  }

  const phoneVal = (telefone && telefone !== '-') ? `'${telefone.replace(/'/g, "''")}'` : 'NULL';
  const emailVal = (email && email !== '-') ? `'${email.replace(/'/g, "''")}'` : 'NULL';
  const addressesJson = JSON.stringify(addresses);

  sqlStatements.push(`INSERT INTO public.clients (name, type, document, phone, email, addresses) VALUES ('${name}', '${type}', '${document}', ${phoneVal}, ${emailVal}, '${addressesJson}') ON CONFLICT (document) DO NOTHING;`);
}

sqlStatements.push('COMMIT;');

// Write in utf8 so it imports correctly in Supabase Dashboard
const sqlContent = sqlStatements.join('\n');
fs.writeFileSync(path.join(__dirname, 'import_clients.sql'), sqlContent, 'utf8');
fs.writeFileSync(path.join(__dirname, 'import_clients.txt'), sqlContent, 'utf8');
console.log('SQL de importação gerado com sucesso!');
