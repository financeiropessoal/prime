'use client';

import React, { useState, useEffect } from 'react';
import { BluetoothPrinter, BTDevice } from '@/services/bluetooth-printer';
import { Button } from '@/components/ui/button';
import { Bluetooth, BluetoothConnected, BluetoothOff, Printer, RefreshCw, CheckCircle, XCircle } from 'lucide-react';

interface PrinterSetupProps {
  onPrinterConnected?: (device: BTDevice) => void;
}

export default function PrinterSetup({ onPrinterConnected }: PrinterSetupProps) {
  const [isNative, setIsNative] = useState(false);
  const [devices, setDevices] = useState<BTDevice[]>([]);
  const [connected, setConnected] = useState<BTDevice | null>(null);
  const [scanning, setScanning] = useState(false);
  const [connecting, setConnecting] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setIsNative(BluetoothPrinter.isNativeApp());
    // Tenta recuperar impressora salva
    const saved = localStorage.getItem('printer_device');
    if (saved) {
      try {
        const device = JSON.parse(saved) as BTDevice;
        setConnected(device);
      } catch {}
    }
  }, []);

  const handleScan = async () => {
    setScanning(true);
    setError(null);
    try {
      const enabled = await BluetoothPrinter.isEnabled();
      if (!enabled) {
        setError('Bluetooth está desligado. Ligue o Bluetooth e tente novamente.');
        return;
      }
      const found = await BluetoothPrinter.scan();
      setDevices(found);
      if (found.length === 0) {
        setError('Nenhum dispositivo encontrado. Certifique-se que a impressora está ligada e pareada.');
      }
    } catch (e: any) {
      setError(e?.message || 'Erro ao escanear dispositivos.');
    } finally {
      setScanning(false);
    }
  };

  const handleConnect = async (device: BTDevice) => {
    setConnecting(device.address);
    setError(null);
    try {
      await BluetoothPrinter.connect(device.address);
      setConnected(device);
      localStorage.setItem('printer_device', JSON.stringify(device));
      onPrinterConnected?.(device);
    } catch (e: any) {
      setError(`Falha ao conectar em ${device.name}: ${e?.message || 'Erro desconhecido'}`);
    } finally {
      setConnecting(null);
    }
  };

  const handleDisconnect = async () => {
    await BluetoothPrinter.disconnect();
    setConnected(null);
    localStorage.removeItem('printer_device');
  };

  const handleTestPrint = async () => {
    try {
      await BluetoothPrinter.printReceipt({
        storeName: 'PRIME AUTOMOTIVE',
        storeAddress: 'Teste de Impressão',
        orderNumber: 'TESTE',
        items: [{ name: 'Chave Canivete VW', qty: 1, price: 48.00 }],
        subtotal: 48.00,
        total: 48.00,
        paymentMethod: 'TESTE',
      });
    } catch (e: any) {
      setError(`Erro ao imprimir: ${e?.message}`);
    }
  };

  // Se não está no app nativo, mostra aviso
  if (!isNative) {
    return (
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
        <BluetoothOff className="h-5 w-5 text-amber-500 mt-0.5 flex-shrink-0" />
        <div>
          <p className="text-sm font-bold text-amber-800">Impressão Bluetooth indisponível no navegador</p>
          <p className="text-xs text-amber-700 mt-1">
            Para imprimir, instale o app <strong>Prime Automotive</strong> no seu celular Android.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white border rounded-xl p-4 space-y-4" style={{ borderColor: '#e8e2d8' }}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Printer className="h-5 w-5" style={{ color: '#c9a96e' }} />
          <h3 className="font-bold text-sm" style={{ color: '#3d2b1f' }}>Impressora Bluetooth</h3>
        </div>
        {connected && (
          <div className="flex items-center gap-1 text-emerald-600 text-xs font-bold">
            <CheckCircle className="h-4 w-4" />
            CONECTADO
          </div>
        )}
      </div>

      {/* Dispositivo conectado */}
      {connected && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BluetoothConnected className="h-4 w-4 text-emerald-600" />
            <div>
              <p className="text-sm font-bold text-emerald-800">{connected.name}</p>
              <p className="text-xs text-emerald-600">{connected.address}</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={handleTestPrint}
              className="text-xs border-emerald-300 text-emerald-700 hover:bg-emerald-100"
            >
              Testar
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={handleDisconnect}
              className="text-xs border-red-200 text-red-600 hover:bg-red-50"
            >
              Desconectar
            </Button>
          </div>
        </div>
      )}

      {/* Botão de scan */}
      {!connected && (
        <Button
          onClick={handleScan}
          disabled={scanning}
          className="w-full text-white font-bold text-xs h-10 rounded-lg"
          style={{ backgroundColor: '#c9a96e' }}
        >
          {scanning ? (
            <><RefreshCw className="h-4 w-4 mr-2 animate-spin" /> Escaneando...</>
          ) : (
            <><Bluetooth className="h-4 w-4 mr-2" /> Buscar Impressoras Pareadas</>
          )}
        </Button>
      )}

      {/* Lista de dispositivos */}
      {devices.length > 0 && !connected && (
        <div className="space-y-2">
          <p className="text-xs font-bold uppercase tracking-wide" style={{ color: '#8b7355' }}>
            Dispositivos encontrados
          </p>
          {devices.map((device) => (
            <button
              key={device.address}
              onClick={() => handleConnect(device)}
              disabled={!!connecting}
              className="w-full flex items-center justify-between p-3 border rounded-lg hover:bg-stone-50 transition text-left"
              style={{ borderColor: '#e8e2d8' }}
            >
              <div className="flex items-center gap-2">
                <Bluetooth className="h-4 w-4" style={{ color: '#c9a96e' }} />
                <div>
                  <p className="text-sm font-bold" style={{ color: '#3d2b1f' }}>{device.name}</p>
                  <p className="text-xs text-stone-500">{device.address}</p>
                </div>
              </div>
              {connecting === device.address ? (
                <RefreshCw className="h-4 w-4 animate-spin text-stone-400" />
              ) : (
                <span className="text-xs font-bold" style={{ color: '#c9a96e' }}>Conectar →</span>
              )}
            </button>
          ))}
        </div>
      )}

      {/* Erro */}
      {error && (
        <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-lg p-3">
          <XCircle className="h-4 w-4 text-red-500 mt-0.5 flex-shrink-0" />
          <p className="text-xs text-red-700">{error}</p>
        </div>
      )}
    </div>
  );
}
