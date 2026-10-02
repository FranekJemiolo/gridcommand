import React, { useState, useEffect } from 'react';

export interface WearableSubHUDProps {
  targetName?: string;
  targetCode?: string;
  distanceMeters?: number;
  relativeBearingDegrees?: number; // 0 to 360
  clockPosition?: number; // 1 to 12
  cardinal?: string;
  objectiveStatus?: 'LOCKED' | 'ACTIVE' | 'CONTESTING' | 'RESOLVED';
  operatorCallsign?: string;
  squad?: string;
  heartRateBpm?: number;
  loraRssiDbm?: number;
  onClaimObjective?: (pin: string) => void;
  onAckWarning?: () => void;
}

export const WearableSubHUDWidget: React.FC<WearableSubHUDProps> = ({
  targetName = 'Bunker Pachołek (01)',
  targetCode = 'ECHO-1',
  distanceMeters = 142,
  relativeBearingDegrees = 330, // 11 o'clock
  clockPosition = 11,
  cardinal = 'NW',
  objectiveStatus = 'ACTIVE',
  operatorCallsign = 'Viper-1',
  squad = 'ALPHA',
  heartRateBpm = 134,
  loraRssiDbm = -106,
  onClaimObjective,
  onAckWarning,
}) => {
  const [pinInput, setPinInput] = useState<string>('');
  const [showPinPad, setShowPinPad] = useState<boolean>(false);
  const [claimed, setClaimed] = useState<boolean>(false);
  const [hapticPing, setHapticPing] = useState<boolean>(false);
  const [themeMode, setThemeMode] = useState<'standard' | 'red' | 'amber'>('standard');

  // Trigger simulated haptic pulse on close proximity (<25m)
  useEffect(() => {
    if (distanceMeters <= 25 && !claimed) {
      setHapticPing(true);
      const timer = setTimeout(() => setHapticPing(false), 800);
      return () => clearTimeout(timer);
    }
  }, [distanceMeters, claimed]);

  const handleKeypadPress = (digit: string) => {
    if (pinInput.length < 4) {
      const next = pinInput + digit;
      setPinInput(next);
      if (next.length === 4) {
        setTimeout(() => {
          setClaimed(true);
          setShowPinPad(false);
          if (onClaimObjective) onClaimObjective(next);
        }, 300);
      }
    }
  };

  // Color mappings based on theme mode
  const colors = {
    standard: {
      bg: '#050805',
      bezel: '#1f2e14',
      primary: '#39ff14',
      accent: '#f5b700',
      text: '#e5e7eb',
      muted: '#6b7280',
      danger: '#ef4444',
    },
    red: {
      bg: '#0a0000',
      bezel: '#3b0000',
      primary: '#ff3333',
      accent: '#ff6666',
      text: '#ff9999',
      muted: '#802020',
      danger: '#ff1111',
    },
    amber: {
      bg: '#0a0800',
      bezel: '#3b2f00',
      primary: '#f5b700',
      accent: '#fbbf24',
      text: '#fef3c7',
      muted: '#785b14',
      danger: '#ea580c',
    },
  }[themeMode];

  const formattedDistance =
    distanceMeters >= 1000
      ? `${(distanceMeters / 1000).toFixed(1)}km`
      : `${distanceMeters}m`;

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        padding: '12px',
        backgroundColor: '#0c120c',
        borderRadius: '8px',
        border: '1px solid #2d401a',
        fontFamily: 'monospace',
        userSelect: 'none',
        width: '100%',
        maxWidth: '340px',
        margin: '0 auto',
        boxSizing: 'border-box',
      }}
    >
      {/* Device frame header */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          width: '100%',
          fontSize: '11px',
          color: '#9ca3af',
          marginBottom: '8px',
          padding: '0 4px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <span style={{ fontSize: '13px' }}>⌚</span>
          <span style={{ fontWeight: 800, color: colors.accent }}>WEARABLE SUB-HUD</span>
        </div>
        <div style={{ display: 'flex', gap: '4px' }}>
          {(['standard', 'red', 'amber'] as const).map((mode) => (
            <button
              key={mode}
              onClick={() => setThemeMode(mode)}
              style={{
                background: themeMode === mode ? colors.primary : '#1a231a',
                color: themeMode === mode ? '#000000' : '#9ca3af',
                border: 'none',
                borderRadius: '2px',
                padding: '1px 5px',
                fontSize: '9px',
                fontWeight: 800,
                cursor: 'pointer',
              }}
            >
              {mode[0].toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      {/* Smartwatch Circular / Rounded-Square Screen Bezel */}
      <div
        style={{
          position: 'relative',
          width: '280px',
          height: '280px',
          backgroundColor: colors.bg,
          border: `3px solid ${colors.bezel}`,
          borderRadius: '50%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '16px 20px',
          boxSizing: 'border-box',
          boxShadow: hapticPing
            ? `0 0 25px ${colors.primary}`
            : '0 8px 30px rgba(0, 0, 0, 0.8), inset 0 0 15px rgba(0,0,0,0.9)',
          transition: 'box-shadow 0.3s ease',
          overflow: 'hidden',
        }}
      >
        {/* Subtle circular compass tick marks */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            borderRadius: '50%',
            border: `1px dashed ${colors.bezel}`,
            pointerEvents: 'none',
            opacity: 0.5,
          }}
        />

        {/* Top Header: Objective Code & Telemetry */}
        <div style={{ textAlign: 'center', zIndex: 2, marginTop: '2px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
            <span
              style={{
                fontSize: '10px',
                fontWeight: 900,
                color: colors.accent,
                letterSpacing: '1px',
              }}
            >
              {targetCode}
            </span>
            <span
              style={{
                fontSize: '9px',
                padding: '1px 4px',
                borderRadius: '2px',
                backgroundColor:
                  objectiveStatus === 'ACTIVE'
                    ? '#14532d'
                    : objectiveStatus === 'CONTESTING'
                    ? '#854d0e'
                    : '#374151',
                color: colors.primary,
                fontWeight: 800,
              }}
            >
              {claimed ? 'CLAIMED ✓' : objectiveStatus}
            </span>
          </div>
          <div
            style={{
              fontSize: '11px',
              color: colors.text,
              fontWeight: 700,
              maxWidth: '180px',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              marginTop: '1px',
            }}
          >
            {targetName}
          </div>
        </div>

        {/* Center: Large Target Direction Needle & Distance */}
        {!showPinPad ? (
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 2,
              margin: 'auto 0',
            }}
          >
            {/* Compass Needle (Rotated by relativeBearingDegrees) */}
            <div
              style={{
                width: '64px',
                height: '64px',
                position: 'relative',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'transform 0.4s cubic-bezier(0.2, 0.9, 0.3, 1)',
                transform: `rotate(${relativeBearingDegrees}deg)`,
              }}
            >
              <svg width="60" height="60" viewBox="0 0 60 60">
                {/* Outer ring */}
                <circle cx="30" cy="30" r="28" fill="none" stroke={colors.bezel} strokeWidth="1.5" />
                {/* North needle tip */}
                <polygon points="30,4 37,28 30,24 23,28" fill={colors.primary} />
                {/* South needle tail */}
                <polygon points="30,56 35,32 30,36 25,32" fill={colors.muted} />
                {/* Center pivot */}
                <circle cx="30" cy="30" r="3" fill={colors.accent} />
              </svg>
            </div>

            {/* Glanceable Large Distance Counter */}
            <div
              style={{
                fontSize: '28px',
                fontWeight: 900,
                color: colors.primary,
                letterSpacing: '-0.5px',
                lineHeight: 1,
                marginTop: '4px',
                textShadow: `0 0 10px ${colors.primary}44`,
              }}
            >
              {formattedDistance}
            </div>

            {/* Clock Position & Cardinal Direction */}
            <div style={{ fontSize: '10px', color: colors.accent, fontWeight: 800, marginTop: '2px' }}>
              ▲ {clockPosition} O'CLOCK • {cardinal} ({relativeBearingDegrees}°)
            </div>
          </div>
        ) : (
          /* Mini Glove-Friendly 4-Digit Keypad */
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              zIndex: 2,
              margin: 'auto 0',
            }}
          >
            <div style={{ fontSize: '11px', color: colors.accent, fontWeight: 800, marginBottom: '4px' }}>
              ENTER 4-DIGIT NFC PIN
            </div>
            <div
              style={{
                display: 'flex',
                gap: '8px',
                marginBottom: '8px',
              }}
            >
              {[0, 1, 2, 3].map((i) => (
                <div
                  key={i}
                  style={{
                    width: '16px',
                    height: '16px',
                    borderRadius: '50%',
                    border: `1.5px solid ${colors.primary}`,
                    backgroundColor: pinInput.length > i ? colors.primary : 'transparent',
                  }}
                />
              ))}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '4px', width: '150px' }}>
              {['1', '2', '3', '4', '5', '6', '7', '8', '9', 'CLR', '0', '✕'].map((key) => (
                <button
                  key={key}
                  onClick={() => {
                    if (key === 'CLR') setPinInput('');
                    else if (key === '✕') setShowPinPad(false);
                    else handleKeypadPress(key);
                  }}
                  style={{
                    backgroundColor: '#162216',
                    color: colors.text,
                    border: `1px solid ${colors.bezel}`,
                    borderRadius: '4px',
                    padding: '6px 0',
                    fontSize: '11px',
                    fontWeight: 800,
                    cursor: 'pointer',
                  }}
                >
                  {key}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Bottom Bar: Glove-Friendly Action & Telemetry Sub-Dials */}
        <div style={{ width: '100%', zIndex: 2, marginBottom: '2px' }}>
          {!showPinPad ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', alignItems: 'center' }}>
              <button
                onClick={() => {
                  if (claimed) {
                    setClaimed(false);
                    setPinInput('');
                  } else {
                    setShowPinPad(true);
                  }
                }}
                style={{
                  backgroundColor: claimed ? '#1f381f' : '#2d401a',
                  color: claimed ? '#86efac' : colors.primary,
                  border: `1px solid ${colors.primary}`,
                  borderRadius: '16px',
                  padding: '5px 16px',
                  fontSize: '10px',
                  fontWeight: 900,
                  cursor: 'pointer',
                  letterSpacing: '0.5px',
                  boxShadow: `0 2px 8px ${colors.primary}22`,
                }}
              >
                {claimed ? 'OBJECTIVE CLAIMED ✓' : '⚡ 1-TAP GLOVE CLAIM'}
              </button>

              {/* Sub-Dial: Heart Rate & LoRa RSSI */}
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  width: '90%',
                  fontSize: '9px',
                  color: colors.muted,
                  paddingTop: '2px',
                }}
              >
                <span>❤️ {heartRateBpm} BPM</span>
                <span>📡 {loraRssiDbm} dBm</span>
              </div>
            </div>
          ) : null}
        </div>
      </div>

      {/* Footer Info */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          width: '100%',
          fontSize: '10px',
          color: '#6b7280',
          marginTop: '8px',
          padding: '0 4px',
        }}
      >
        <span>OP: {operatorCallsign} [{squad}]</span>
        <span>BLE / COMPANION LINK</span>
      </div>
    </div>
  );
};
