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
    <div className="fixed inset-0 z-50 flex flex-col justify-between bg-[#0b0f0b]/95 p-4 font-mono select-none">
      <div className="flex justify-between items-center text-xs">
        <div className="text-[#f5b700] font-bold">OPTICAL / NFC SENSOR SCANNER</div>
        <button
          onClick={onClose}
          className="w-10 h-10 border border-[#2e3d2e] rounded text-[#9ba89b] font-bold bg-[#141c14]"
        >
          ✕
        </button>
      </div>

      {/* Target Reticle Viewport */}
      <div className="flex-1 flex flex-col items-center justify-center relative my-4 border-2 border-dashed border-[#a67c52]/60 rounded-lg bg-[#141c14] p-6 overflow-hidden">
        {/* Pulsing targeting frame */}
        <div
          className={`w-64 h-64 border-4 rounded-xl relative flex items-center justify-center transition-all ${
            success
              ? 'border-[#4e9b4e] bg-[#4e9b4e]/20'
              : scanning
                ? 'border-[#f5b700] animate-pulse'
                : 'border-[#f5b700] reticle-pulse'
          }`}
        >
          <div className="absolute top-2 left-2 text-[10px] text-[#f5b700] font-bold">NTAG215 / QR</div>
          <div className="absolute bottom-2 right-2 text-[10px] text-[#9ba89b]">ED25519 VERIFY</div>

          {/* Crosshair */}
          <div className="w-12 h-0.5 bg-[#f5b700]/70 absolute" />
          <div className="h-12 w-0.5 bg-[#f5b700]/70 absolute" />

          {scanning && (
            <div className="text-center">
              <div className="text-xs text-[#f5b700] font-black animate-bounce">READING NFC/BASE45...</div>
            </div>
          )}

          {success && (
            <div className="text-center">
              <div className="text-sm text-[#68d391] font-black">SIGNATURE MATCH!</div>
            </div>
          )}

          {!scanning && !success && (
            <div className="text-center px-4">
              <div className="text-xs text-[#c7a76c]">ALIGN QR CODE OR TAP NFC TOKEN TO BACK OF DEVICE</div>
            </div>
          )}
        </div>

        <div className="mt-4 text-center">
          <div className="text-xs text-[#9ba89b]">TARGET OBJECTIVE:</div>
          <div className="text-sm font-bold text-[#f5b700]">{objectiveName}</div>
        </div>
      </div>

      {/* Actions */}
      <div className="space-y-2">
        <TacticalButton
          variant="olive"
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
