import { QRCodeSVG } from 'qrcode.react';

interface QRCodePanelProps {
  url?: string;
}

/**
 * QR Code Panel - Desktop only
 * Displays a QR code for mobile users to scan and open the app
 */
export function QRCodePanel({ url }: QRCodePanelProps) {
  const qrUrl = url || window.location.href;

  return (
    <div className="hidden md:flex flex-col items-center justify-center gap-6 bg-gradient-to-br from-film to-darkroom p-8 sticky top-0 h-screen">
      <div className="bg-paper p-8 rounded-2xl shadow-xl">
        <QRCodeSVG
          value={qrUrl}
          size={256}
          level="H"
        />
      </div>
      <div className="font-mono-stamp text-[11px] tracking-[0.18em] uppercase text-paper-dim">
        Scan to join the roll
      </div>
    </div>
  );
}
