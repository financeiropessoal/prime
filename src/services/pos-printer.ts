import { Capacitor } from '@capacitor/core';

declare global {
  interface Window {
    sunmiPrinter?: {
      printerInit?: () => void;
      printText?: (t: string) => void;
      lineWrap?: (n: number) => void;
      printBarCode?: (code: string, symbology: number, height: number, width: number, textposition: number) => void;
      cutPaper?: () => void;
    };
    AndroidPrinter?: { print?: (t: string) => void; printText?: (t: string) => void };
    PrinterBridge?: { print?: (t: string) => void; printText?: (t: string) => void };
    Android?: { print?: (t: string) => void; printText?: (t: string) => void };
    PrimePrinter?: {
      isReady?: () => boolean;
      printText?: (text: string) => boolean | string | void;
      printReceipt?: (text: string, qr: string, footer: string) => boolean;
      printQr?: (text: string, size?: number) => boolean;
      status?: () => string;
    };
  }
}

const PRINT_METHODS = [
  'printReceipt',
  'printText',
  'print',
  'printString',
  'printStr',
  'printLine',
  'writeText',
  'write',
  'sendData',
  'imprimir',
] as const;

function findAndroidBridge(): { key: string; print: (t: string) => void } | null {
  if (typeof window === 'undefined') return null;
  const w = window as unknown as Record<string, any>;
  let keys: string[] = [];
  try {
    keys = Object.keys(w);
  } catch {
    return null;
  }
  for (const k of keys) {
    if (['window', 'self', 'top', 'parent', 'frames', 'document'].includes(k)) continue;
    try {
      const obj = w[k];
      if (obj && typeof obj === 'object') {
        for (const m of PRINT_METHODS) {
          if (typeof obj[m] === 'function') {
            return { key: k, print: (t: string) => obj[m](t) };
          }
        }
      }
    } catch (_) {}
  }
  return null;
}

function formatReceiptText(receipt: any): { text: string; qr: string } {
  if (typeof receipt === 'string') {
    return { text: receipt, qr: 'pix.primeauto@gmail.com' };
  }

  const storeName = receipt.storeName || 'PRIME CHAVES CODIFICADAS';
  const storeAddress = receipt.storeAddress || 'www.primechavescodificadas.com.br';
  const orderNumber = receipt.orderNumber ? `#${receipt.orderNumber}` : '';
  const date = receipt.date || new Date().toLocaleString('pt-BR');
  const customer = receipt.customerName || '';
  const items = receipt.items || [];
  const total = receipt.total ? `R$ ${Number(receipt.total).toFixed(2).replace('.', ',')}` : '';
  const payMethod = receipt.paymentMethod || '';
  const pixKey = receipt.pixKey || 'pix.primeauto@gmail.com';

  const line = '-'.repeat(32);
  const center = (s: string) => (s.length >= 32 ? s : ' '.repeat(Math.floor((32 - s.length) / 2)) + s);
  const pad = (l: string, r: string) => {
    const sp = 32 - l.length - r.length;
    return sp > 0 ? l + ' '.repeat(sp) + r : l + ' ' + r;
  };

  let t = '';
  t += center(storeName) + '\n';
  t += center(storeAddress) + '\n';
  t += line + '\n';
  if (orderNumber) t += `PEDIDO: ${orderNumber}\n`;
  t += `DATA: ${date}\n`;
  if (customer) t += `CLIENTE: ${customer}\n`;
  t += line + '\n';
  t += pad('ITEM', 'TOTAL') + '\n';
  t += line + '\n';

  for (const item of items) {
    const itemTot = item.qty * item.price;
    t += item.name.slice(0, 24) + '\n';
    t += pad(`  ${item.qty}x R$ ${Number(item.price).toFixed(2).replace('.', ',')}`, `R$ ${Number(itemTot).toFixed(2).replace('.', ',')}`) + '\n';
  }

  t += line + '\n';
  t += pad('TOTAL', total) + '\n';
  if (payMethod) t += pad('PAGAMENTO', payMethod) + '\n';
  t += line + '\n';
  t += center('--- PAGAMENTO VIA PIX ---') + '\n';
  t += center('Chave PIX (E-mail):') + '\n';
  t += center(pixKey) + '\n';
  t += line + '\n';
  t += center('Obrigado pela preferencia!') + '\n';
  t += center(storeAddress) + '\n\n';

  return { text: t, qr: pixKey };
}

class PosPrinter {
  async printReceipt(receipt: any): Promise<void> {
    const { text, qr } = formatReceiptText(receipt);

    // 1. Check Q2I Official Bridge (window.PrimePrinter)
    if (typeof window !== 'undefined' && window.PrimePrinter) {
      const p = window.PrimePrinter;
      if (typeof p.printReceipt === 'function') {
        const ok = p.printReceipt(text, qr, '');
        if (ok !== false) {
          console.log('PosPrinter: impresso via PrimePrinter.printReceipt');
          return;
        }
      }
      if (typeof p.printText === 'function') {
        p.printText(text);
        if (qr && typeof p.printQr === 'function') {
          p.printQr(qr, 6);
        }
        console.log('PosPrinter: impresso via PrimePrinter.printText');
        return;
      }
    }

    // 2. Check Sunmi Printer Bridge
    if (typeof window !== 'undefined' && window.sunmiPrinter?.printText) {
      window.sunmiPrinter.printerInit?.();
      window.sunmiPrinter.printText(text);
      window.sunmiPrinter.lineWrap?.(3);
      window.sunmiPrinter.cutPaper?.();
      console.log('PosPrinter: impresso via sunmiPrinter');
      return;
    }

    // 3. Check generic Android Webview Bridges (AndroidPrinter, PrinterBridge, Android, findAndroidBridge)
    const bridge = findAndroidBridge();
    if (bridge) {
      bridge.print(text);
      console.log(`PosPrinter: impresso via ${bridge.key}`);
      return;
    }

    // 4. Check Capacitor Native Plugins (SunmiPrinter, PaxPrinter, GertecPrinter, Q2IPrinter)
    if (Capacitor.isNativePlatform()) {
      const possiblePlugins = ['SunmiPrinter', 'PaxPrinter', 'GertecPrinter', 'Q2IPrinter'];
      for (const name of possiblePlugins) {
        try {
          const nativePlugin = ((Capacitor as any).Plugins as any)[name];
          if (nativePlugin) {
            if (typeof nativePlugin.print === 'function') {
              await nativePlugin.print({ content: text, qrCode: qr } as any).catch(() => nativePlugin.print({ data: text } as any));
            }
            console.log(`PosPrinter: impresso via plugin ${name}`);
            return;
          }
        } catch (_) {}
      }
    }

    // 5. Fallback for Web Browser (Chrome window.print)
    if (typeof window !== 'undefined' && typeof window.print === 'function') {
      window.print();
      return;
    }

    throw new Error('Nenhuma impressora POS embutida encontrada. Abra o aplicativo Prime Q2I.');
  }

  async print(content: string | Uint8Array, qrCodeText?: string): Promise<void> {
    await this.printReceipt({ storeName: 'PRIME CHAVES', date: new Date().toLocaleString(), items: [], total: 0, pixKey: qrCodeText });
  }
}

const posPrinter = new PosPrinter();
export default posPrinter;
