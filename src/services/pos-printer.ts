import { Capacitor } from '@capacitor/core';
/**
 * Wrapper para os plugins nativos de impressão POS (Sunmi, PAX, Gertec, Q2I).
 * Cada plugin expõe um método `print` que aceita conteúdo em string ou Uint8Array.
 */
class PosPrinter {
  /**
   * Imprime o recibo usando o plugin nativo disponível.
   * @param content Texto ou dados ESC/POS a serem enviados à impressora.
   */
  async print(content: string | Uint8Array): Promise<void> {
    if (!Capacitor.isNativePlatform()) {
      console.warn('PosPrinter: execução não nativa – impressão ignorada.');
      return;
    }
    const possiblePlugins = ['SunmiPrinter', 'PaxPrinter', 'GertecPrinter', 'Q2IPrinter'];
    for (const name of possiblePlugins) {
      try {
        const nativePlugin = ((Capacitor as any).Plugins as any)[name];
        if (nativePlugin && typeof nativePlugin.print === 'function') {
          await nativePlugin.print({ content } as any).catch(() => nativePlugin.print({ data: content } as any));
          console.log(`PosPrinter: impressão realizada via ${name}`);
          return;
        }
      } catch (_) {
        // Plugin not available – continue to next.
      }
    }
    console.error('PosPrinter: nenhum plugin de impressão POS compatível encontrado.');
  }

  /** Imprime o recibo recebendo um objeto; converte para string JSON antes de enviar ao plugin. */
  async printReceipt(receipt: any): Promise<void> {
    const content = typeof receipt === 'string' ? receipt : JSON.stringify(receipt);
    await this.print(content);
  }
}

const posPrinter = new PosPrinter();
export default posPrinter;
