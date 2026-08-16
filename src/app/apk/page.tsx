import React from 'react';

export const metadata = {
  title: 'Baixar App PDV | Prime Chaves Codificadas',
  description: 'Baixe o aplicativo PDV Mobile da Prime Chaves Codificadas para Android.',
};

export default function ApkDownloadPage() {
  return (
    <html lang="pt-BR">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;900&display=swap" rel="stylesheet" />
        <style>{`
          * { box-sizing: border-box; margin: 0; padding: 0; }
          body {
            font-family: 'Inter', sans-serif;
            background: #1a1008;
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 24px;
          }
          .card {
            background: #faf8f5;
            border-radius: 28px;
            padding: 40px 32px;
            max-width: 420px;
            width: 100%;
            text-align: center;
            box-shadow: 0 32px 80px rgba(0,0,0,0.5);
          }
          .logo { height: 56px; width: auto; margin-bottom: 24px; }
          .badge {
            display: inline-block;
            background: #c9a96e22;
            color: #c9a96e;
            font-size: 11px;
            font-weight: 700;
            letter-spacing: 2px;
            text-transform: uppercase;
            padding: 4px 12px;
            border-radius: 100px;
            margin-bottom: 12px;
            border: 1px solid #c9a96e44;
          }
          h1 {
            font-size: 26px;
            font-weight: 900;
            color: #3d2b1f;
            line-height: 1.2;
            margin-bottom: 8px;
          }
          .subtitle {
            font-size: 14px;
            color: #8b7355;
            margin-bottom: 32px;
            line-height: 1.5;
          }
          .steps {
            text-align: left;
            background: white;
            border-radius: 16px;
            padding: 20px;
            margin-bottom: 28px;
            border: 1px solid #e8e2d8;
          }
          .steps-title {
            font-size: 11px;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 1.5px;
            color: #8b7355;
            margin-bottom: 14px;
          }
          .step {
            display: flex;
            align-items: flex-start;
            gap: 12px;
            margin-bottom: 12px;
          }
          .step:last-child { margin-bottom: 0; }
          .step-num {
            background: #c9a96e;
            color: white;
            width: 22px;
            height: 22px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 11px;
            font-weight: 900;
            flex-shrink: 0;
            margin-top: 1px;
          }
          .step-text {
            font-size: 13px;
            color: #5a4633;
            line-height: 1.4;
          }
          .step-text strong { color: #3d2b1f; }
          .btn-download {
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 10px;
            width: 100%;
            background: #c9a96e;
            color: white;
            text-decoration: none;
            font-size: 15px;
            font-weight: 900;
            letter-spacing: 0.5px;
            padding: 18px 24px;
            border-radius: 100px;
            transition: opacity 0.2s, transform 0.1s;
            margin-bottom: 12px;
            box-shadow: 0 8px 24px #c9a96e44;
          }
          .btn-download:hover { opacity: 0.9; transform: translateY(-1px); }
          .btn-download:active { transform: scale(0.98); }
          .btn-icon { font-size: 20px; }
          .file-info {
            font-size: 11px;
            color: #8b7355;
            margin-bottom: 28px;
          }
          .warning {
            background: #fff8ec;
            border: 1px solid #f0d090;
            border-radius: 12px;
            padding: 12px 16px;
            font-size: 12px;
            color: #7a5a00;
            text-align: left;
            line-height: 1.5;
          }
          .warning strong { color: #5a3d00; }
          .footer {
            margin-top: 24px;
            font-size: 11px;
            color: #8b7355;
          }
          @media (prefers-color-scheme: dark) {
            body { background: #0d0804; }
          }
        `}</style>
      </head>
      <body>
        <div className="card">
          <img src="/logo.png" alt="Prime Chaves" className="logo" />

          <div className="badge">📱 App Android</div>

          <h1>PDV Mobile<br />Prime Chaves</h1>
          <p className="subtitle">
            Sistema de vendas e impressão direta<br />na sua maquininha via Bluetooth.
          </p>

          <div className="steps">
            <div className="steps-title">Como instalar</div>
            <div className="step">
              <div className="step-num">1</div>
              <div className="step-text">Clique em <strong>Baixar APK</strong> abaixo</div>
            </div>
            <div className="step">
              <div className="step-num">2</div>
              <div className="step-text">Abra o arquivo baixado no celular</div>
            </div>
            <div className="step">
              <div className="step-num">3</div>
              <div className="step-text">Se pedir permissão, vá em <strong>Configurações → Instalar apps desconhecidos → Permitir</strong></div>
            </div>
            <div className="step">
              <div className="step-num">4</div>
              <div className="step-text">Toque em <strong>Instalar</strong> e aguarde</div>
            </div>
          </div>

          <a href="/prime-pdv.apk" download="PrimePDV.apk" className="btn-download">
            <span className="btn-icon">⬇️</span>
            Baixar APK — Prime PDV
          </a>
          <p className="file-info">PrimePDV.apk · 5.1 MB · Android 7.0+</p>

          <div className="warning">
            ⚠️ <strong>Apenas para Android.</strong> Este app é exclusivo para uso interno da Prime Chaves Codificadas. Não disponível na Play Store.
          </div>

          <p className="footer">© Prime Chaves Codificadas · primechavescodificadas.com.br</p>
        </div>
      </body>
    </html>
  );
}
