import React, { useState } from 'react';
import { TacticalButton } from '@gridcommand/ui-theme';

export interface ScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onScanSuccess: (proof: string) => void;
  objectiveName: string;
}

export const ScannerModal: React.FC<ScannerModalProps> = ({
  isOpen,
  onClose,
  onScanSuccess,
  objectiveName,
}) => {
  const [scanning, setScanning] = useState(false);
  const [success, setSuccess] = useState(false);

  if (!isOpen) return null;

  const simulateScan = () => {
    setScanning(true);
    setTimeout(() => {
      setScanning(false);
      setSuccess(true);
      setTimeout(() => {
        onScanSuccess('ED25519_SIG_VALIDATED_TOKEN_B45');
        onClose();
        setSuccess(false);
      }, 600);
    }, 1200);
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-between bg-black/90 p-4 font-mono select-none">
      <div className="flex justify-between items-center text-xs">
        <div className="text-[#00f3ff] font-bold">OPTICAL / NFC SENSOR SCANNER</div>
        <button
          onClick={onClose}
          className="w-10 h-10 border border-[#1e2638] rounded text-[#8b949e] font-bold"
        >
          ✕
        </button>
      </div>

      {/* Target Reticle Viewport */}
      <div className="flex-1 flex flex-col items-center justify-center relative my-4 border-2 border-dashed border-[#00f3ff]/40 rounded-lg bg-[#0a0e14]/70 p-6 overflow-hidden">
        {/* Pulsing targeting frame */}
        <div
          className={`w-64 h-64 border-4 rounded-xl relative flex items-center justify-center transition-all ${
            success
              ? 'border-[#00ff66] bg-[#00ff66]/10'
              : scanning
                ? 'border-[#ffe600] animate-pulse'
                : 'border-[#00f3ff] reticle-pulse'
          }`}
        >
          <div className="absolute top-2 left-2 text-[10px] text-[#00f3ff] font-bold">NTAG215 / QR</div>
          <div className="absolute bottom-2 right-2 text-[10px] text-[#8b949e]">ED25519 VERIFY</div>

          {/* Crosshair */}
          <div className="w-12 h-0.5 bg-[#00f3ff]/60 absolute" />
          <div className="h-12 w-0.5 bg-[#00f3ff]/60 absolute" />

          {scanning && (
            <div className="text-center">
              <div className="text-xs text-[#ffe600] font-black animate-bounce">READING NFC/BASE45...</div>
            </div>
          )}

          {success && (
            <div className="text-center">
              <div className="text-sm text-[#00ff66] font-black">SIGNATURE MATCH!</div>
            </div>
          )}

          {!scanning && !success && (
            <div className="text-center px-4">
              <div className="text-xs text-[#8b949e]">ALIGN QR CODE OR TAP NFC TOKEN TO BACK OF DEVICE</div>
            </div>
          )}
        </div>

        <div className="mt-4 text-center">
          <div className="text-xs text-[#8b949e]">TARGET OBJECTIVE:</div>
          <div className="text-sm font-bold text-[#00f3ff]">{objectiveName}</div>
        </div>
      </div>

      {/* Actions */}
      <div className="space-y-2">
        <TacticalButton
          variant="cyan"
          fullWidth
          className="h-16 text-base font-black"
          onClick={simulateScan}
          disabled={scanning || success}
        >
          {scanning ? 'VERIFYING SENSORS...' : 'SCAN TOKEN (TAP NFC / CAPTURE QR)'}
        </TacticalButton>
      </div>
    </div>
  );
};
