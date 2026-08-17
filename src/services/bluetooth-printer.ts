import { Capacitor } from '@capacitor/core';

/**
 * Serviço de Impressão Bluetooth para Impressoras Térmicas ESC/POS
 * Compatível com: Bematech, Epson, Elgin, e impressoras de maquininhas
 * 
 * COMO USAR:
 * 1. Chame BluetoothPrinter.scan() para listar dispositivos
 * 2. Chame BluetoothPrinter.connect(device) para conectar
 * 3. Chame BluetoothPrinter.printReceipt(data) para imprimir
 */

declare global {
  interface Window {
    BluetoothSerial?: {
      isEnabled: (success: () => void, error: (e: any) => void) => void;
      list: (success: (devices: BTDevice[]) => void, error: (e: any) => void) => void;
      connect: (address: string, success: () => void, error: (e: any) => void) => void;
      disconnect: (success: () => void, error: (e: any) => void) => void;
      write: (data: string, success: () => void, error: (e: any) => void) => void;
      isConnected: (success: () => void, error: (e: any) => void) => void;
    };
  }
}

export interface BTDevice {
  name: string;
  address: string;
}

export interface ReceiptData {
  storeName?: string;
  storeAddress?: string;
  orderNumber?: string;
  items: Array<{ name: string; qty: number; price: number }>;
  subtotal: number;
  discount?: number;
  total: number;
  paymentMethod?: string;
  customerName?: string;
  date?: string;
  pixKey?: string;
  pixQrUrl?: string;
}

// ESC/POS command helpers
const ESC = '\x1B';
const GS = '\x1D';
const CMD = {
  INIT: `${ESC}@`,
  ALIGN_CENTER: `${ESC}a\x01`,
  ALIGN_LEFT: `${ESC}a\x00`,
  BOLD_ON: `${ESC}E\x01`,
  BOLD_OFF: `${ESC}E\x00`,
  DOUBLE_SIZE: `${GS}!\x11`,
  NORMAL_SIZE: `${GS}!\x00`,
  LINE: '\n',
  CUT: `${GS}V\x42\x00`,
  FEED: `${ESC}d\x03`,
};

function padLine(left: string, right: string, width = 32): string {
  const spaces = width - left.length - right.length;
  return left + ' '.repeat(Math.max(1, spaces)) + right;
}

function formatCurrency(value: number): string {
  return `R$ ${value.toFixed(2).replace('.', ',')}`;
}

export const BluetoothPrinter = {
  /** Verifica se o Bluetooth está habilitado */
  isEnabled(): Promise<boolean> {
    return new Promise((resolve) => {
      if (!window.BluetoothSerial) {
        resolve(false);
        return;
      }
      window.BluetoothSerial.isEnabled(
        () => resolve(true),
        () => resolve(false)
      );
    });
  },

  /** Lista dispositivos Bluetooth pareados */
  scan(): Promise<BTDevice[]> {
    return new Promise((resolve, reject) => {
      if (!window.BluetoothSerial) {
        reject(new Error('BluetoothSerial não disponível. Abra o app nativo.'));
        return;
      }
      window.BluetoothSerial.list(
        (devices) => resolve(devices),
        (err) => reject(err)
      );
    });
  },

  /** Conecta a um dispositivo Bluetooth pelo endereço MAC */
  connect(address: string): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!window.BluetoothSerial) {
        reject(new Error('BluetoothSerial não disponível. Abra o app nativo.'));
        return;
      }
      window.BluetoothSerial.connect(address, resolve, reject);
    });
  },

  /** Desconecta do dispositivo atual */
  disconnect(): Promise<void> {
    return new Promise((resolve) => {
      if (!window.BluetoothSerial) { resolve(); return; }
      window.BluetoothSerial.disconnect(resolve, resolve);
    });
  },

  /** Envia texto raw para a impressora */
  write(text: string): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!window.BluetoothSerial) {
        reject(new Error('BluetoothSerial não disponível.'));
        return;
      }
      window.BluetoothSerial.write(text, resolve, reject);
    });
  },

  /** Gera e imprime um comprovante de venda */
  async printReceipt(data: ReceiptData): Promise<void> {
    const date = data.date || new Date().toLocaleString('pt-BR');
    const separator = '-'.repeat(32);

    let receipt = '';
    receipt += CMD.INIT;
    receipt += CMD.ALIGN_CENTER;
    receipt += CMD.BOLD_ON;
    receipt += CMD.DOUBLE_SIZE;
    receipt += (data.storeName || 'PRIME CHAVES CODIFICADAS') + CMD.LINE;
    receipt += CMD.NORMAL_SIZE;
    receipt += CMD.BOLD_OFF;
    receipt += (data.storeAddress || 'www.primechavescodificadas.com.br') + CMD.LINE;
    receipt += CMD.LINE;
    receipt += separator + CMD.LINE;
    receipt += CMD.ALIGN_LEFT;

    if (data.orderNumber) {
      receipt += CMD.BOLD_ON;
      receipt += `PEDIDO: #${data.orderNumber}` + CMD.LINE;
      receipt += CMD.BOLD_OFF;
    }
    receipt += `DATA: ${date}` + CMD.LINE;
    if (data.customerName) {
      receipt += `CLIENTE: ${data.customerName}` + CMD.LINE;
    }
    receipt += separator + CMD.LINE;

    // Items
    receipt += CMD.BOLD_ON;
    receipt += padLine('ITEM', 'TOTAL') + CMD.LINE;
    receipt += CMD.BOLD_OFF;
    receipt += separator + CMD.LINE;

    for (const item of data.items) {
      const itemTotal = item.qty * item.price;
      receipt += item.name.substring(0, 24) + CMD.LINE;
      receipt += padLine(
        `  ${item.qty}x ${formatCurrency(item.price)}`,
        formatCurrency(itemTotal)
      ) + CMD.LINE;
    }

    receipt += separator + CMD.LINE;
    receipt += padLine('SUBTOTAL', formatCurrency(data.subtotal)) + CMD.LINE;

    if (data.discount && data.discount > 0) {
      receipt += padLine('DESCONTO', `-${formatCurrency(data.discount)}`) + CMD.LINE;
    }

    receipt += CMD.BOLD_ON;
    receipt += padLine('TOTAL', formatCurrency(data.total)) + CMD.LINE;
    receipt += CMD.BOLD_OFF;

    if (data.paymentMethod) {
      receipt += padLine('PAGAMENTO', data.paymentMethod) + CMD.LINE;
    }

    // PIX Section with native ESC/POS QR Code
    const pixKey = data.pixKey || 'pix.primeauto@gmail.com';
    receipt += separator + CMD.LINE;
    receipt += CMD.ALIGN_CENTER;
    receipt += CMD.BOLD_ON;
    receipt += '--- PAGAMENTO VIA PIX ---' + CMD.LINE;
    receipt += CMD.BOLD_OFF;

    // ESC/POS Native QR Code Commands
    try {
      const storeLen = pixKey.length + 3;
      const pL = storeLen % 256;
      const pH = Math.floor(storeLen / 256);
      receipt += '\x1D(k\x04\x001A2\x00';
      receipt += '\x1D(k\x03\x001C\x06';
      receipt += '\x1D(k\x03\x001E0';
      receipt += `\x1D(k${String.fromCharCode(pL)}${String.fromCharCode(pH)}1P0${pixKey}`;
      receipt += '\x1D(k\x03\x001Q0';
      receipt += CMD.LINE;
    } catch (_) {
      // Fallback if binary formatting fails
    }

    receipt += 'Chave PIX (E-mail):' + CMD.LINE;
    receipt += CMD.BOLD_ON;
    receipt += pixKey + CMD.LINE;
    receipt += CMD.BOLD_OFF;

    receipt += separator + CMD.LINE;
    receipt += CMD.ALIGN_CENTER;
    receipt += 'Obrigado pela preferencia!' + CMD.LINE;
    receipt += 'www.primechavescodificadas.com.br' + CMD.LINE;
    receipt += CMD.FEED;
    receipt += CMD.CUT;

    await this.write(receipt);
  },

  /** Verifica se está conectado */
  isConnected(): Promise<boolean> {
    return new Promise((resolve) => {
      if (!window.BluetoothSerial) { resolve(false); return; }
      window.BluetoothSerial.isConnected(() => resolve(true), () => resolve(false));
    });
  },

  /** Verifica se está rodando no app nativo (Capacitor) */
  isNativeApp(): boolean {
    return typeof window !== 'undefined' && Capacitor.isNativePlatform();
  },
};
