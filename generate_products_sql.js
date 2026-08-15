const fs = require('fs');
const path = require('path');

const csvPath = path.join(__dirname, 'relatorio_estoque_temp.csv');
let csvContent = '';

try {
  // Read as latin1 to preserve Portuguese accentuation
  csvContent = fs.readFileSync(csvPath, 'latin1');
  // Replace the special em-dash \x97 if any exists
  csvContent = csvContent.replace(/\x97/g, '-');
} catch (e) {
  console.error('Erro ao ler relatorio_estoque_temp.csv:', e.message);
  process.exit(1);
}

const lines = csvContent.split('\n');
const headers = lines[0].split(';');

const sqlStatements = [];
sqlStatements.push('-- IMPORTAÇÃO DE PRODUTOS DO ESTOQUE');
sqlStatements.push('BEGIN;');

for (let i = 1; i < lines.length; i++) {
  const line = lines[i].trim();
  if (!line) continue;

  const values = line.split(';');
  if (values.length < headers.length) continue;

  const sku = values[0] ? values[0].trim() : '';
  const nameRaw = values[1] ? values[1].trim() : '';
  const estoqueRaw = values[2] ? values[2].trim() : '0';
  const custoRaw = values[3] ? values[3].trim() : '';
  const precoN1Raw = values[4] ? values[4].trim() : '';
  const precoN2Raw = values[5] ? values[5].trim() : '';
  const precoN3Raw = values[6] ? values[6].trim() : '';
  const statusRaw = values[7] ? values[7].trim() : 'Ativo';

  if (!sku || !nameRaw) continue;

  const name = nameRaw.replace(/'/g, "''");
  const stock = parseInt(estoqueRaw.replace(/[^0-9]/g, '')) || 0;

  // Parse prices
  const parsePrice = (raw) => {
    if (!raw || raw === '-') return null;
    const clean = raw.replace(',', '.').replace(/[^0-9.]/g, '');
    const val = parseFloat(clean);
    return isNaN(val) ? null : val;
  };

  const pCost = parsePrice(custoRaw);
  const p1 = parsePrice(precoN1Raw);
  const p2 = parsePrice(precoN2Raw);
  const p3 = parsePrice(precoN3Raw);

  const salePrice = p1 || p2 || p3 || 10.00;
  const costPrice = pCost !== null ? pCost : (p3 || p2 || Number((salePrice * 0.5).toFixed(2)));

  // Determine category
  let category = 'Carcaças de Chave';
  const upperName = nameRaw.toUpperCase();
  if (upperName.includes('CANIVETE') || upperName.includes('CODIFICADA') || upperName.includes('CHAVE COMPLETA')) {
    category = 'Chaves Codificadas';
  } else if (upperName.includes('CAPA CONTROLE') || upperName.includes('CARCAÇA')) {
    category = 'Carcaças de Chave';
  } else if (upperName.includes('CONTROLE') || upperName.includes('ALARME')) {
    category = 'Controles de Alarme';
  } else if (upperName.includes('BATERIA') || upperName.includes('PILA')) {
    category = 'Baterias';
  }

  // Determine brand
  let brand = 'Universal';
  if (upperName.includes('FIAT')) brand = 'Fiat';
  else if (upperName.includes('CHEVROLET') || upperName.includes(' ONIX ') || upperName.includes('PRISMA') || upperName.includes(' GM ')) brand = 'Chevrolet';
  else if (upperName.includes('VW') || upperName.includes('VOLKSWAGEN') || upperName.includes('GOL') || upperName.includes('FOX')) brand = 'Volkswagen';
  else if (upperName.includes('FORD') || upperName.includes('KA ') || upperName.includes('FUSION')) brand = 'Ford';
  else if (upperName.includes('HYUNDAI') || upperName.includes('HB20')) brand = 'Hyundai';
  else if (upperName.includes('HONDA') || upperName.includes('CIVIC')) brand = 'Honda';
  else if (upperName.includes('TOYOTA') || upperName.includes('COROLLA')) brand = 'Toyota';
  else if (upperName.includes('RENAULT') || upperName.includes('SANDERO')) brand = 'Renault';
  else if (upperName.includes('POSITRON') || upperName.includes('PÓSITRON')) brand = 'Pósitron';

  const status = statusRaw.toLowerCase() === 'ativo' ? 'active' : 'inactive';

  // Progress options for wholesale pricing tier
  const packageQty = 10;
  // Calculate discount percentage based on N1 vs N3 tier
  let packageDiscountPct = 10;
  if (p1 && p3 && p1 > p3) {
    packageDiscountPct = Math.round(((p1 - p3) / p1) * 100);
  }

  sqlStatements.push(`INSERT INTO public.products (name, sku, category, brand, description, cost_price, sale_price, package_qty, package_discount_pct, stock_current, stock_minimum, status) VALUES ('${name}', '${sku}', '${category}', '${brand}', 'Produto importado via planilha de estoque.', ${costPrice}, ${salePrice}, ${packageQty}, ${packageDiscountPct}, ${stock}, 5, '${status}') ON CONFLICT (sku) DO UPDATE SET stock_current = EXCLUDED.stock_current, sale_price = EXCLUDED.sale_price, cost_price = EXCLUDED.cost_price;`);
}

sqlStatements.push('COMMIT;');

const sqlContent = sqlStatements.join('\n');
fs.writeFileSync(path.join(__dirname, 'import_products.sql'), sqlContent, 'utf8');
fs.writeFileSync(path.join(__dirname, 'import_products.txt'), sqlContent, 'utf8');
console.log('SQL de importação de estoque gerado com sucesso!');
