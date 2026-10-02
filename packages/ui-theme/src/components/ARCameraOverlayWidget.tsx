import React, { useState, useEffect } from 'react';

export interface ARTargetPin {
  id: string;
  name: string;
  type: 'OBJECTIVE' | 'HOSTILE' | 'FRIENDLY' | 'RALLY';
  distanceMeters: number;
  azimuthDeg: number; // 0-360 relative to north
  elevationDeg: number; // vertical angle -30 to +30
  status?: string;
}

export interface ARCameraOverlayWidgetProps {
  initialHeading?: number;
  targets?: ARTargetPin[];
  onPinClick?: (pin: ARTargetPin) => void;
  onClose?: () => void;
}

const DEFAULT_TARGETS: ARTargetPin[] = [
  { id: 'obj_moraine', name: 'OBJ FALCON (Radar Mast)', type: 'OBJECTIVE', distanceMeters: 310, azimuthDeg: 345, elevationDeg: 2, status: 'ACTIVE' },
  { id: 'opfor_patrol', name: 'OPFOR SENTRY (2x BOTS)', type: 'HOSTILE', distanceMeters: 460, azimuthDeg: 12, elevationDeg: -1, status: 'ENGAGING' },
  { id: 'peer_doc', name: 'DOC-1 (SQUAD ALPHA)', type: 'FRIENDLY', distanceMeters: 85, azimuthDeg: 290, elevationDeg: 0, status: 'ACTIVE' },
  { id: 'rally_point', name: 'RALLY POINT CHARLIE', type: 'RALLY', distanceMeters: 620, azimuthDeg: 75, elevationDeg: -3, status: 'SECURE' },
];

export const ARCameraOverlayWidget: React.FC<ARCameraOverlayWidgetProps> = ({
  initialHeading = 350,
  targets = DEFAULT_TARGETS,
  onPinClick,
  onClose,
}) => {
  const [heading, setHeading] = useState<number>(initialHeading);
  const [pitch, setPitch] = useState<number>(1.2);
  const [visionMode, setVisionMode] = useState<'NVG' | 'FLIR' | 'OPTICAL'>('NVG');
  const [isSimulatedVideo, setIsSimulatedVideo] = useState<boolean>(true);
  const [rangefinderDistance, setRangefinderDistance] = useState<number>(310);
  const [zoomLevel, setZoomLevel] = useState<number>(1.0);

  // Subtle compass gyro drift simulation
  useEffect(() => {
    const interval = setInterval(() => {
      setHeading((prev) => (prev + (Math.random() * 0.4 - 0.2) + 360) % 360);
      setPitch((prev) => Math.max(-15, Math.min(15, prev + (Math.random() * 0.2 - 0.1))));
    }, 400);
    return () => clearInterval(interval);
  }, []);

  // Filter visible targets within camera horizontal FOV (approx 60 degrees)
  const fovDegrees = 65 / zoomLevel;
  const visibleTargets = targets.map((target) => {
    let diff = target.azimuthDeg - heading;
    while (diff < -180) diff += 360;
    while (diff > 180) diff -= 360;

    const screenX = 50 + (diff / (fovDegrees / 2)) * 50; // percentage from left
    const screenY = 50 - ((target.elevationDeg - pitch) / 30) * 40; // percentage from top
    const isVisible = screenX >= 5 && screenX <= 95 && Math.abs(diff) <= fovDegrees / 2;

    return {
      ...target,
      screenX,
      screenY,
      diff,
      isVisible,
    };
  });

  // Theme styling based on vision mode
  const getThemeFilter = () => {
    switch (visionMode) {
      case 'NVG':
        return 'brightness(1.1) contrast(1.4) hue-rotate(60deg) saturate(2.5)';
      case 'FLIR':
        return 'grayscale(1) contrast(2) invert(0.9)';
      default:
        return 'contrast(1.1) saturate(1.1)';
    }
  };

  const getThemeColor = () => {
    switch (visionMode) {
      case 'NVG':
        return '#4ade80'; // Tactical phosphor green
      case 'FLIR':
        return '#f3f4f6'; // FLIR white-hot
      default:
        return '#f59e0b'; // Tactical amber
    }
  };

  const themeColor = getThemeColor();

  return (
    <div className="relative w-full h-[620px] bg-black rounded-lg overflow-hidden border border-tactical-olive font-mono select-none flex flex-col">
      {/* Background camera viewport (simulated battlefield backdrop with scanlines) */}
      <div
        className="absolute inset-0 z-0 bg-cover bg-center transition-all duration-300"
        style={{
          backgroundImage:
            'radial-gradient(circle at 50% 60%, rgba(20, 35, 20, 0.7), rgba(5, 10, 5, 0.95)), linear-gradient(rgba(10, 25, 10, 0.8), rgba(0, 0, 0, 0.9))',
          filter: getThemeFilter(),
        }}
      >
        {/* Synthetic tactical terrain wireframe grid */}
        <div
          className="absolute inset-0 opacity-25"
          style={{
            backgroundImage:
              'linear-gradient(to right, rgba(74, 222, 128, 0.15) 1px, transparent 1px), linear-gradient(to bottom, rgba(74, 222, 128, 0.15) 1px, transparent 1px)',
            backgroundSize: '40px 40px',
            transform: `perspective(400px) rotateX(${40 + pitch * 2}deg) translateY(${pitch * 10}px)`,
          }}
        />

        {/* Tactical Scanlines */}
        <div
          className="absolute inset-0 pointer-events-none opacity-40"
          style={{
            backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0, 0, 0, 0.8) 3px)',
          }}
        />
      </div>

      {/* Top HUD: Azimuth Ribbon / Compass Tape */}
      <div className="relative z-10 bg-tactical-surface/90 border-b border-tactical-olive/60 px-4 py-2 flex flex-col items-center">
        <div className="w-full flex items-center justify-between text-xs mb-1">
          <div className="flex items-center gap-2">
            <span className="inline-block w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="font-bold text-tactical-parchment tracking-wider">AR FIELD SIGHT // STADIAMETRIC HUD</span>
            <span className="px-1.5 py-0.5 rounded bg-tactical-olive/50 text-[10px] text-tactical-muted">FOV: {Math.round(fovDegrees)}°</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setVisionMode('NVG')}
              className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                visionMode === 'NVG'
                  ? 'bg-emerald-900/60 border-emerald-400 text-emerald-300'
                  : 'bg-black/50 border-tactical-olive/40 text-tactical-muted'
              }`}
            >
              NVG
            </button>
            <button
              onClick={() => setVisionMode('FLIR')}
              className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                visionMode === 'FLIR'
                  ? 'bg-zinc-800 border-zinc-200 text-zinc-100'
                  : 'bg-black/50 border-tactical-olive/40 text-tactical-muted'
              }`}
            >
              FLIR
            </button>
            <button
              onClick={() => setVisionMode('OPTICAL')}
              className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                visionMode === 'OPTICAL'
                  ? 'bg-amber-900/60 border-amber-400 text-amber-300'
                  : 'bg-black/50 border-tactical-olive/40 text-tactical-muted'
              }`}
            >
              DAY
            </button>
            {onClose && (
              <button
                onClick={onClose}
                className="ml-2 px-2 py-0.5 bg-red-900/50 hover:bg-red-800 text-red-200 border border-red-700 rounded text-xs"
              >
                ✕
              </button>
            )}
          </div>
        </div>

        {/* Azimuth Ladder Indicator */}
        <div className="w-full max-w-lg h-9 relative overflow-hidden bg-black/60 rounded border border-tactical-olive/40 flex items-center justify-center">
          <div
            className="flex items-center gap-8 whitespace-nowrap transition-transform duration-100"
            style={{
              transform: `translateX(${-((heading % 360) * 6)}px)`,
            }}
          >
            {Array.from({ length: 72 }).map((_, i) => {
              const deg = i * 10;
              const isCard = deg % 90 === 0;
              let label = `${deg}°`;
              if (deg === 0) label = 'N';
              if (deg === 90) label = 'E';
              if (deg === 180) label = 'S';
              if (deg === 270) label = 'W';

              return (
                <div key={i} className="flex flex-col items-center w-8">
                  <span
                    className={`text-[10px] font-bold ${
                      isCard ? 'text-amber-400 text-xs' : 'text-tactical-muted'
                    }`}
                  >
                    {label}
                  </span>
                  <div
                    className={`w-0.5 ${
                      isCard ? 'h-3 bg-amber-400' : 'h-1.5 bg-tactical-muted/40'
                    }`}
                  />
                </div>
              );
            })}
          </div>

          {/* Central Azimuth Lubber Line Indicator */}
          <div className="absolute top-0 bottom-0 left-1/2 w-0.5 -translate-x-1/2 bg-amber-400 z-10 shadow-[0_0_8px_#f59e0b]" />
          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 px-1.5 py-0.2 bg-black/90 border border-amber-500 rounded text-[10px] font-bold text-amber-300">
            {Math.round(heading).toString().padStart(3, '0')}° M
          </div>
        </div>
      </div>

      {/* Main AR Canvas & Floating Pins */}
      <div className="relative flex-1 z-10 overflow-hidden">
        {/* Pitch & Artificial Horizon Ladder */}
        <div className="absolute inset-y-0 left-8 flex flex-col justify-between py-12 pointer-events-none opacity-60">
          <div className="flex items-center gap-1 text-[10px] text-tactical-muted">
            <span>+15°</span>
            <div className="w-4 h-0.5 bg-tactical-muted/60" />
          </div>
          <div className="flex items-center gap-1 text-[10px] text-amber-400 font-bold">
            <span>0° HORIZON</span>
            <div className="w-8 h-0.5 bg-amber-400 shadow-[0_0_6px_#f59e0b]" />
          </div>
          <div className="flex items-center gap-1 text-[10px] text-tactical-muted">
            <span>-15°</span>
            <div className="w-4 h-0.5 bg-tactical-muted/60" />
          </div>
        </div>

        {/* Center Crosshair & Rangefinder Reticle */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none flex flex-col items-center">
          <div
            className="w-16 h-16 rounded-full border border-dashed flex items-center justify-center"
            style={{ borderColor: themeColor }}
          >
            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: themeColor }} />
          </div>
          <div className="mt-2 px-2 py-0.5 rounded bg-black/80 border border-tactical-olive/60 text-[11px] text-tactical-parchment flex items-center gap-2">
            <span>RNG:</span>
            <span className="font-bold text-amber-400">{rangefinderDistance}m</span>
            <span className="text-[9px] text-tactical-muted">LASER LOCK</span>
          </div>
        </div>

        {/* Floating 3D Target Objective & Threat Pins */}
        {visibleTargets.map((target) => {
          if (!target.isVisible) return null;

          const isHostile = target.type === 'HOSTILE';
          const isObjective = target.type === 'OBJECTIVE';
          const isFriendly = target.type === 'FRIENDLY';

          const pinColor = isHostile ? '#ef4444' : isObjective ? '#38bdf8' : isFriendly ? '#22c55e' : '#eab308';

          return (
            <div
              key={target.id}
              onClick={() => onPinClick && onPinClick(target)}
              className="absolute -translate-x-1/2 -translate-y-1/2 cursor-pointer transition-transform hover:scale-110 active:scale-95 group"
              style={{
                left: `${target.screenX}%`,
                top: `${target.screenY}%`,
              }}
            >
              {/* Vertical connecting line to ground */}
              <div
                className="w-0.5 h-10 mx-auto"
                style={{
                  backgroundImage: `linear-gradient(to bottom, ${pinColor}, transparent)`,
                }}
              />

              {/* Tactical Marker Badge */}
              <div
                className="px-2.5 py-1 rounded shadow-lg border backdrop-blur-md flex flex-col items-center gap-0.5 whitespace-nowrap"
                style={{
                  backgroundColor: 'rgba(10, 15, 10, 0.85)',
                  borderColor: pinColor,
                }}
              >
                <div className="flex items-center gap-1.5">
                  <span
                    className="w-2 h-2 rounded-full animate-ping"
                    style={{ backgroundColor: pinColor }}
                  />
                  <span className="text-[11px] font-bold text-white tracking-wide">{target.name}</span>
                </div>
                <div className="flex items-center gap-2 text-[9px] text-tactical-parchment/80">
                  <span className="font-mono text-amber-400 font-bold">{target.distanceMeters}m</span>
                  <span>|</span>
                  <span>{target.azimuthDeg}°</span>
                  <span>|</span>
                  <span className="text-tactical-muted uppercase">{target.type}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Bottom Control Bar */}
      <div className="relative z-10 bg-tactical-surface/90 border-t border-tactical-olive/60 px-4 py-2 flex items-center justify-between text-xs">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1">
            <span className="text-tactical-muted">ZOOM:</span>
            {[1, 2, 4].map((z) => (
              <button
                key={z}
                onClick={() => setZoomLevel(z)}
                className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                  zoomLevel === z
                    ? 'bg-amber-500/30 border-amber-400 text-amber-300'
                    : 'bg-black/40 border-tactical-olive/40 text-tactical-muted'
                }`}
              >
                {z}x
              </button>
            ))}
          </div>

          <div className="hidden sm:flex items-center gap-2 text-[10px] text-tactical-muted">
            <span>PITCH: {pitch > 0 ? `+${pitch.toFixed(1)}°` : `${pitch.toFixed(1)}°`}</span>
            <span>ROLL: -0.4°</span>
            <span>GPS: 34U DA 3512 2894 (FIX 3D)</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setRangefinderDistance((prev) => (prev === 310 ? 460 : 310))}
            className="px-2.5 py-1 bg-tactical-olive/50 hover:bg-tactical-olive text-tactical-parchment border border-tactical-olive rounded text-[11px] font-bold flex items-center gap-1"
          >
            🎯 PULSE LRF
          </button>
          <button
            onClick={() => setIsSimulatedVideo(!isSimulatedVideo)}
            className="px-2 py-1 bg-black/60 hover:bg-black/80 text-tactical-muted border border-tactical-olive/40 rounded text-[10px]"
          >
            {isSimulatedVideo ? 'SYNTHETIC GRID' : 'PASSIVE FLIR'}
          </button>
        </div>
      </div>
    </div>
  );
};
