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
    <div className="hidden md:flex flex-col items-center justify-center gap-8 bg-acid/40 border-r-[1.5px] border-line p-8 sticky top-0 h-screen">
      <div className="mono-label flex items-center gap-2">
        <span className="w-[9px] h-[9px] rounded-full bg-acid-deep shadow-[0_0_0_3px_rgba(184,245,92,0.3)]" />
        scan to join the directory
      </div>
      <div className="bg-card p-8 rounded-[20px] border-[1.5px] border-line shadow-xl">
        <QRCodeSVG
          value={qrUrl}
          size={256}
          level="H"
        />
      </div>
    </div>
  );
}
