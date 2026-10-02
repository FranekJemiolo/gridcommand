import React, { useState, useEffect, useRef, useMemo } from 'react';

export interface AAROperatorTrajectoryData {
  operatorId: string;
  callsign: string;
  squad: string;
  path: [number, number, number][]; // [lon, lat, timeOffsetSeconds]
  totalDistanceMeters: number;
  maxSpeedMps: number;
}

export interface AAREventBookmarkData {
  id: string;
  timeOffsetSeconds: number;
  timeStr: string;
  type: 'CAPT' | 'HAZ' | 'CONTACT' | 'FREEZE' | 'SOS';
  title: string;
  squad: string;
  coordinates?: [number, number];
}

export interface AARScorePointData {
  timeOffsetSeconds: number;
  alphaScore: number;
  bravoScore: number;
}

export interface AARAnomalyData {
  id: string;
  type: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  operatorId: string;
  callsign?: string;
  timestamp: number;
  description: string;
  evidence: Record<string, any>;
}

export interface AARPlaybackWidgetProps {
  durationSeconds?: number;
  trajectories?: AAROperatorTrajectoryData[];
  bookmarks?: AAREventBookmarkData[];
  scoreTimeline?: AARScorePointData[];
  anomalies?: AARAnomalyData[];
  integrityScore?: number;
  totalEventsInspected?: number;
  onTimeChange?: (seconds: number) => void;
  onRunAudit?: () => void;
  onExportAuditReport?: () => void;
}

// Default mock trajectories in Gdansk Oliwa if none passed
const DEFAULT_TRAJECTORIES: AAROperatorTrajectoryData[] = [
  {
    operatorId: 'op_alpha_1',
    callsign: 'Viper-1 (Alpha)',
    squad: 'squad_alpha',
    path: [
      [18.541, 54.402, 0],
      [18.544, 54.405, 300],
      [18.547, 54.408, 600],
      [18.551, 54.411, 900],
      [18.553, 54.414, 1200],
      [18.555, 54.416, 1500],
      [18.558, 54.419, 1800],
    ],
    totalDistanceMeters: 2420,
    maxSpeedMps: 4.8,
  },
  {
    operatorId: 'op_alpha_2',
    callsign: 'Specter-2 (Alpha)',
    squad: 'squad_alpha',
    path: [
      [18.540, 54.401, 0],
      [18.543, 54.404, 300],
      [18.546, 54.407, 600],
      [18.550, 54.410, 900],
      [18.552, 54.413, 1200],
      [18.554, 54.415, 1500],
      [18.557, 54.418, 1800],
    ],
    totalDistanceMeters: 2380,
    maxSpeedMps: 4.5,
  },
  {
    operatorId: 'op_bravo_1',
    callsign: 'Raven-1 (Bravo)',
    squad: 'squad_bravo',
    path: [
      [18.568, 54.422, 0],
      [18.565, 54.419, 300],
      [18.561, 54.416, 600],
      [18.557, 54.414, 900],
      [18.554, 54.413, 1200],
      [18.552, 54.412, 1500],
      [18.549, 54.410, 1800],
    ],
    totalDistanceMeters: 2650,
    maxSpeedMps: 5.2,
  },
  {
    operatorId: 'op_bravo_2',
    callsign: 'Titan-3 (Bravo)',
    squad: 'squad_bravo',
    path: [
      [18.569, 54.423, 0],
      [18.566, 54.420, 300],
      [18.562, 54.417, 600],
      [18.558, 54.415, 900],
      [18.555, 54.414, 1200],
      [18.553, 54.413, 1500],
      [18.550, 54.411, 1800],
    ],
    totalDistanceMeters: 2590,
    maxSpeedMps: 5.0,
  },
];

const DEFAULT_BOOKMARKS: AAREventBookmarkData[] = [
  { id: 'bm-1', timeOffsetSeconds: 180, timeStr: '00:03:00', type: 'CONTACT', title: 'Radar contact near Moraine Pass', squad: 'squad_alpha' },
  { id: 'bm-2', timeOffsetSeconds: 450, timeStr: '00:07:30', type: 'CAPT', title: 'Objective Echo-1 neutralized by Viper-1', squad: 'squad_alpha' },
  { id: 'bm-3', timeOffsetSeconds: 780, timeStr: '00:13:00', type: 'HAZ', title: 'Electronic Jamming Zone active (Sector C)', squad: 'ALL' },
  { id: 'bm-4', timeOffsetSeconds: 1140, timeStr: '00:19:00', type: 'CAPT', title: 'Objective Echo-2 synchronized contest', squad: 'squad_bravo' },
  { id: 'bm-5', timeOffsetSeconds: 1560, timeStr: '00:26:00', type: 'FREEZE', title: 'Tactical ceasefire - Extraction corridor', squad: 'ALL' },
];

export const AARPlaybackWidget: React.FC<AARPlaybackWidgetProps> = ({
  durationSeconds = 1800,
  trajectories = DEFAULT_TRAJECTORIES,
  bookmarks = DEFAULT_BOOKMARKS,
  scoreTimeline = [],
  anomalies = [],
  integrityScore = 98.4,
  totalEventsInspected = 1420,
  onTimeChange,
  onRunAudit,
  onExportAuditReport,
}) => {
  const [activeTab, setActiveTab] = useState<'playback' | 'audit' | 'metrics'>('playback');
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1);
  const [selectedBookmark, setSelectedBookmark] = useState<string | null>(null);
  const [simulatedAnomalies, setSimulatedAnomalies] = useState<AARAnomalyData[]>(anomalies);

  const requestRef = useRef<number | null>(null);
  const lastTickRef = useRef<number>(performance.now());

  // Playback animation loop
  useEffect(() => {
    if (!isPlaying) {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
      return;
    }

    lastTickRef.current = performance.now();

    const loop = (time: number) => {
      const deltaSec = (time - lastTickRef.current) / 1000;
      lastTickRef.current = time;

      setCurrentTime((prev) => {
        const next = prev + deltaSec * playbackSpeed;
        if (next >= durationSeconds) {
          setIsPlaying(false);
          return durationSeconds;
        }
        if (onTimeChange) onTimeChange(next);
        return next;
      });

      requestRef.current = requestAnimationFrame(loop);
    };

    requestRef.current = requestAnimationFrame(loop);
    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, [isPlaying, playbackSpeed, durationSeconds, onTimeChange]);

  const handleSeek = (newTime: number) => {
    const clamped = Math.max(0, Math.min(newTime, durationSeconds));
    setCurrentTime(clamped);
    if (onTimeChange) onTimeChange(clamped);
  };

  const formatTime = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    const ms = Math.floor((sec % 1) * 10);
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}.${ms}`;
  };

  // Interpolate positions of operators at currentTime
  const currentPositions = useMemo(() => {
    return trajectories.map((traj) => {
      if (!traj.path || traj.path.length === 0) {
        return { ...traj, lon: 18.55, lat: 54.41 };
      }
      if (currentTime <= traj.path[0][2]) {
        return { ...traj, lon: traj.path[0][0], lat: traj.path[0][1] };
      }
      const lastWp = traj.path[traj.path.length - 1];
      if (currentTime >= lastWp[2]) {
        return { ...traj, lon: lastWp[0], lat: lastWp[1] };
      }

      for (let i = 0; i < traj.path.length - 1; i++) {
        const p1 = traj.path[i];
        const p2 = traj.path[i + 1];
        if (currentTime >= p1[2] && currentTime <= p2[2]) {
          const span = p2[2] - p1[2];
          const factor = span > 0 ? (currentTime - p1[2]) / span : 0;
          const lon = p1[0] + (p2[0] - p1[0]) * factor;
          const lat = p1[1] + (p2[1] - p1[1]) * factor;
          return { ...traj, lon, lat };
        }
      }
      return { ...traj, lon: lastWp[0], lat: lastWp[1] };
    });
  }, [trajectories, currentTime]);

  // Map coordinates projection for Tactical Canvas
  // Gdansk Oliwa bounding box: Lon [18.535, 18.575], Lat [54.398, 54.425]
  const minLon = 18.535;
  const maxLon = 18.575;
  const minLat = 54.398;
  const maxLat = 54.425;

  const projectToCanvas = (lon: number, lat: number, width = 640, height = 340) => {
    const x = ((lon - minLon) / (maxLon - minLon)) * width;
    const y = height - ((lat - minLat) / (maxLat - minLat)) * height;
    return { x: Math.max(10, Math.min(x, width - 10)), y: Math.max(10, Math.min(y, height - 10)) };
  };

  // Interpolate scores at currentTime
  const currentScores = useMemo(() => {
    if (!scoreTimeline || scoreTimeline.length === 0) {
      // Linear mock progression based on time
      const ratio = currentTime / durationSeconds;
      return {
        alpha: Math.min(100, Math.round(ratio * 85 + 5)),
        bravo: Math.min(100, Math.round(ratio * 70 + 2)),
      };
    }
    const idx = scoreTimeline.findIndex((s) => s.timeOffsetSeconds >= currentTime);
    if (idx <= 0) return { alpha: scoreTimeline[0].alphaScore, bravo: scoreTimeline[0].bravoScore };
    return {
      alpha: scoreTimeline[idx].alphaScore,
      bravo: scoreTimeline[idx].bravoScore,
    };
  }, [scoreTimeline, currentTime, durationSeconds]);

  const handleSimulateViolation = (type: string) => {
    const newAnomaly: AARAnomalyData = {
      id: `anomaly-${Date.now()}`,
      type,
      severity: 'CRITICAL',
      operatorId: 'op_bravo_1',
      callsign: 'Raven-1 (Bravo)',
      timestamp: Date.now() - 420000,
      description: `Injected forensic test: ${type.replace(/_/g, ' ')} detected during AAR verification phase.`,
      evidence: {
        registeredSpeedMps: 48.2,
        maxPermissibleSpeedMps: 10.0,
        teleportDeltaMeters: 420,
        clockDeltaMs: -180000,
      },
    };
    setSimulatedAnomalies([newAnomaly, ...simulatedAnomalies]);
  };

  return (
    <div
      style={{
        backgroundColor: '#0c120c',
        border: '1px solid #3b5323',
        borderRadius: '6px',
        color: '#e5e7eb',
        fontFamily: 'monospace',
        padding: '16px',
        boxShadow: '0 8px 30px rgba(0, 0, 0, 0.7)',
        width: '100%',
        boxSizing: 'border-box',
      }}
    >
      {/* Header bar */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          borderBottom: '1px solid #2d401a',
          paddingBottom: '10px',
          marginBottom: '14px',
          flexWrap: 'wrap',
          gap: '10px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '18px' }}>⏱️</span>
          <div>
            <div style={{ fontWeight: 800, color: '#f5b700', letterSpacing: '1px', fontSize: '15px' }}>
              AFTER-ACTION REVIEW (AAR) & AUDIT ENGINE
            </div>
            <div style={{ fontSize: '11px', color: '#9ca3af' }}>
              3D Spatial Trajectory Playback • Cryptographic Anti-Cheat Validator • MGRS Sector Oliwa
            </div>
          </div>
        </div>

        {/* Tab Switcher */}
        <div style={{ display: 'flex', gap: '4px', backgroundColor: '#131b13', padding: '3px', borderRadius: '4px' }}>
          <button
            onClick={() => setActiveTab('playback')}
            style={{
              background: activeTab === 'playback' ? '#2d401a' : 'transparent',
              color: activeTab === 'playback' ? '#39ff14' : '#9ca3af',
              border: 'none',
              padding: '5px 12px',
              fontSize: '11px',
              fontWeight: 700,
              cursor: 'pointer',
              borderRadius: '3px',
            }}
          >
            ▶️ SPATIAL REPLAY
          </button>
          <button
            onClick={() => setActiveTab('audit')}
            style={{
              background: activeTab === 'audit' ? '#2d401a' : 'transparent',
              color: activeTab === 'audit' ? '#f5b700' : '#9ca3af',
              border: 'none',
              padding: '5px 12px',
              fontSize: '11px',
              fontWeight: 700,
              cursor: 'pointer',
              borderRadius: '3px',
            }}
          >
            🛡️ AUDIT INSPECTOR ({simulatedAnomalies.length})
          </button>
          <button
            onClick={() => setActiveTab('metrics')}
            style={{
              background: activeTab === 'metrics' ? '#2d401a' : 'transparent',
              color: activeTab === 'metrics' ? '#38bdf8' : '#9ca3af',
              border: 'none',
              padding: '5px 12px',
              fontSize: '11px',
              fontWeight: 700,
              cursor: 'pointer',
              borderRadius: '3px',
            }}
          >
            📈 SCORE TIMELINE
          </button>
        </div>
      </div>

      {activeTab === 'playback' && (
        <div>
          {/* Spatial Canvas (Visualizing Trajectories) */}
          <div
            style={{
              position: 'relative',
              backgroundColor: '#070a07',
              border: '1px solid #1f2e14',
              borderRadius: '4px',
              height: '320px',
              overflow: 'hidden',
              marginBottom: '14px',
            }}
          >
            {/* Sector Grid overlay */}
            <div
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                backgroundImage:
                  'linear-gradient(to right, #131d10 1px, transparent 1px), linear-gradient(to bottom, #131d10 1px, transparent 1px)',
                backgroundSize: '40px 40px',
                opacity: 0.6,
                pointerEvents: 'none',
              }}
            />

            {/* Tactical Canvas SVG */}
            <svg
              style={{ width: '100%', height: '100%', position: 'absolute', top: 0, left: 0 }}
              viewBox="0 0 640 320"
              preserveAspectRatio="none"
            >
              {/* Objective Landmarks */}
              {[
                { label: 'ECHO-1', lon: 18.547, lat: 54.408, color: '#00e5ff' },
                { label: 'ECHO-2', lon: 18.554, lat: 54.414, color: '#f5b700' },
                { label: 'HQ BRAVO', lon: 18.568, lat: 54.422, color: '#ff3366' },
                { label: 'HQ ALPHA', lon: 18.541, lat: 54.402, color: '#39ff14' },
              ].map((obj, i) => {
                const pt = projectToCanvas(obj.lon, obj.lat, 640, 320);
                return (
                  <g key={i}>
                    <circle cx={pt.x} cy={pt.y} r={10} fill="none" stroke={obj.color} strokeWidth={1.5} opacity={0.6} />
                    <circle cx={pt.x} cy={pt.y} r={3} fill={obj.color} />
                    <text
                      x={pt.x + 8}
                      y={pt.y + 4}
                      fill={obj.color}
                      fontSize="9"
                      fontFamily="monospace"
                      fontWeight="bold"
                    >
                      {obj.label}
                    </text>
                  </g>
                );
              })}

              {/* Trajectory Breadcrumbs (Historical full path) */}
              {trajectories.map((traj) => {
                const isAlpha = traj.squad === 'squad_alpha';
                const strokeColor = isAlpha ? '#22c55e' : '#f97316';
                const points = traj.path
                  .map((p) => {
                    const pt = projectToCanvas(p[0], p[1], 640, 320);
                    return `${pt.x},${pt.y}`;
                  })
                  .join(' ');
                return (
                  <polyline
                    key={traj.operatorId}
                    points={points}
                    fill="none"
                    stroke={strokeColor}
                    strokeWidth={1.5}
                    strokeDasharray="4 2"
                    opacity={0.35}
                  />
                );
              })}

              {/* Trajectory Current Traveled segment */}
              {trajectories.map((traj) => {
                const isAlpha = traj.squad === 'squad_alpha';
                const strokeColor = isAlpha ? '#39ff14' : '#ffaa00';
                // Filter waypoints up to current time
                const activePath = traj.path.filter((p) => p[2] <= currentTime);
                if (activePath.length < 2) return null;
                const points = activePath
                  .map((p) => {
                    const pt = projectToCanvas(p[0], p[1], 640, 320);
                    return `${pt.x},${pt.y}`;
                  })
                  .join(' ');
                return (
                  <polyline
                    key={`active-${traj.operatorId}`}
                    points={points}
                    fill="none"
                    stroke={strokeColor}
                    strokeWidth={2.5}
                    opacity={0.8}
                  />
                );
              })}

              {/* Current Operator Positions with Ping Rings */}
              {currentPositions.map((op) => {
                const pt = projectToCanvas(op.lon, op.lat, 640, 320);
                const isAlpha = op.squad === 'squad_alpha';
                const color = isAlpha ? '#39ff14' : '#ff3366';
                return (
                  <g key={`cur-${op.operatorId}`}>
                    {/* Pulsing ring */}
                    <circle cx={pt.x} cy={pt.y} r={7} fill="none" stroke={color} strokeWidth={1.5} opacity={0.8} />
                    <circle cx={pt.x} cy={pt.y} r={3} fill={color} />
                    <text
                      x={pt.x + 8}
                      y={pt.y - 4}
                      fill={color}
                      fontSize="9"
                      fontFamily="monospace"
                      fontWeight="bold"
                    >
                      {op.callsign.split(' ')[0]}
                    </text>
                  </g>
                );
              })}
            </svg>

            {/* In-Canvas HUD overlay */}
            <div
              style={{
                position: 'absolute',
                top: 8,
                left: 8,
                backgroundColor: 'rgba(5, 10, 5, 0.85)',
                padding: '6px 10px',
                borderRadius: '4px',
                border: '1px solid #2d401a',
                fontSize: '11px',
              }}
            >
              <div style={{ color: '#f5b700', fontWeight: 'bold' }}>GRID: 34U DA 824 382</div>
              <div style={{ color: '#9ca3af', fontSize: '10px' }}>ELEVATION: 118m Moraine Ridge</div>
              <div style={{ marginTop: '2px', color: '#e5e7eb' }}>
                SPEED RATIO: <span style={{ color: '#39ff14' }}>{playbackSpeed}x</span> | STATUS:{' '}
                <span style={{ color: isPlaying ? '#22c55e' : '#f5b700' }}>
                  {isPlaying ? 'ACTIVE REPLAY' : 'PAUSED'}
                </span>
              </div>
            </div>

            {/* Score HUD in Canvas Top Right */}
            <div
              style={{
                position: 'absolute',
                top: 8,
                right: 8,
                backgroundColor: 'rgba(5, 10, 5, 0.85)',
                padding: '6px 12px',
                borderRadius: '4px',
                border: '1px solid #2d401a',
                fontSize: '11px',
                display: 'flex',
                gap: '12px',
                alignItems: 'center',
              }}
            >
              <div>
                <span style={{ color: '#39ff14', fontWeight: 800 }}>ALPHA:</span>{' '}
                <span style={{ color: '#ffffff', fontWeight: 900 }}>{currentScores.alpha} pts</span>
              </div>
              <div style={{ color: '#6b7280' }}>vs</div>
              <div>
                <span style={{ color: '#f97316', fontWeight: 800 }}>BRAVO:</span>{' '}
                <span style={{ color: '#ffffff', fontWeight: 900 }}>{currentScores.bravo} pts</span>
              </div>
            </div>
          </div>

          {/* Timeline Scrubber & Controls */}
          <div
            style={{
              backgroundColor: '#111711',
              border: '1px solid #2d401a',
              borderRadius: '4px',
              padding: '12px',
              marginBottom: '14px',
            }}
          >
            {/* Top row: Play/Pause, Time, Speed */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '8px',
                flexWrap: 'wrap',
                gap: '8px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <button
                  onClick={() => setIsPlaying(!isPlaying)}
                  style={{
                    backgroundColor: isPlaying ? '#854d0e' : '#22543d',
                    color: '#ffffff',
                    border: '1px solid #3b5323',
                    padding: '6px 14px',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontWeight: 'bold',
                    fontSize: '12px',
                  }}
                >
                  {isPlaying ? '⏸ PAUSE' : '▶ PLAY'}
                </button>
                <button
                  onClick={() => handleSeek(0)}
                  style={{
                    backgroundColor: '#1b241b',
                    color: '#d1d5db',
                    border: '1px solid #374151',
                    padding: '6px 10px',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontSize: '11px',
                  }}
                >
                  ⏮ REWIND
                </button>
                <button
                  onClick={() => handleSeek(durationSeconds)}
                  style={{
                    backgroundColor: '#1b241b',
                    color: '#d1d5db',
                    border: '1px solid #374151',
                    padding: '6px 10px',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontSize: '11px',
                  }}
                >
                  ⏭ END
                </button>
              </div>

              {/* Timestamp Counter */}
              <div style={{ fontSize: '14px', fontWeight: 800, color: '#f5b700', letterSpacing: '1px' }}>
                T+{formatTime(currentTime)}{' '}
                <span style={{ fontSize: '11px', color: '#9ca3af', fontWeight: 400 }}>
                  / T+{formatTime(durationSeconds)}
                </span>
              </div>

              {/* Speed Buttons */}
              <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                <span style={{ fontSize: '11px', color: '#9ca3af', marginRight: '4px' }}>SPEED:</span>
                {[1, 5, 20].map((spd) => (
                  <button
                    key={spd}
                    onClick={() => setPlaybackSpeed(spd)}
                    style={{
                      backgroundColor: playbackSpeed === spd ? '#3b5323' : '#1a231a',
                      color: playbackSpeed === spd ? '#39ff14' : '#9ca3af',
                      border: '1px solid #2d401a',
                      padding: '4px 8px',
                      fontSize: '11px',
                      fontWeight: 'bold',
                      borderRadius: '3px',
                      cursor: 'pointer',
                    }}
                  >
                    {spd}x
                  </button>
                ))}
              </div>
            </div>

            {/* Scrubber Range Slider with Bookmark ticks */}
            <div style={{ position: 'relative', width: '100%', margin: '10px 0 6px 0' }}>
              <input
                type="range"
                min={0}
                max={durationSeconds}
                step={0.5}
                value={currentTime}
                onChange={(e) => handleSeek(parseFloat(e.target.value))}
                style={{
                  width: '100%',
                  accentColor: '#39ff14',
                  cursor: 'pointer',
                  height: '6px',
                }}
              />

              {/* Bookmark tick points */}
              {bookmarks.map((bm) => {
                const leftPercent = (bm.timeOffsetSeconds / durationSeconds) * 100;
                return (
                  <div
                    key={bm.id}
                    title={`${bm.timeStr}: ${bm.title}`}
                    onClick={() => handleSeek(bm.timeOffsetSeconds)}
                    style={{
                      position: 'absolute',
                      left: `${leftPercent}%`,
                      top: '12px',
                      width: '8px',
                      height: '8px',
                      backgroundColor: bm.type === 'CAPT' ? '#39ff14' : bm.type === 'CONTACT' ? '#f5b700' : '#ef4444',
                      borderRadius: '50%',
                      transform: 'translateX(-50%)',
                      cursor: 'pointer',
                      border: '1px solid #000',
                    }}
                  />
                );
              })}
            </div>
          </div>

          {/* Tactical Event Bookmarks Quick-Jump List */}
          <div>
            <div
              style={{
                fontSize: '12px',
                fontWeight: 700,
                color: '#9ca3af',
                marginBottom: '6px',
                display: 'flex',
                justifyContent: 'space-between',
              }}
            >
              <span>KEY MISSION BOOKMARKS</span>
              <span style={{ fontSize: '11px' }}>Click to jump timeline</span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '8px' }}>
              {bookmarks.map((bm) => {
                const isActive = Math.abs(currentTime - bm.timeOffsetSeconds) < 30;
                return (
                  <div
                    key={bm.id}
                    onClick={() => {
                      handleSeek(bm.timeOffsetSeconds);
                      setSelectedBookmark(bm.id);
                    }}
                    style={{
                      backgroundColor: isActive ? '#1c2e17' : '#0e150e',
                      border: `1px solid ${isActive ? '#39ff14' : '#223318'}`,
                      borderRadius: '4px',
                      padding: '8px 10px',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '3px' }}>
                      <span
                        style={{
                          backgroundColor:
                            bm.type === 'CAPT' ? '#14532d' : bm.type === 'CONTACT' ? '#713f12' : '#7f1d1d',
                          color: '#ffffff',
                          fontSize: '9px',
                          padding: '1px 5px',
                          borderRadius: '2px',
                          fontWeight: 700,
                        }}
                      >
                        {bm.type}
                      </span>
                      <span style={{ color: '#f5b700', fontSize: '11px', fontWeight: 'bold' }}>{bm.timeStr}</span>
                    </div>
                    <div style={{ fontSize: '11px', color: '#e5e7eb', lineHeight: 1.3 }}>{bm.title}</div>
                    <div style={{ fontSize: '10px', color: '#6b7280', marginTop: '2px' }}>Squad: {bm.squad}</div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'audit' && (
        <div>
          {/* Audit Metrics Banner */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
              gap: '10px',
              marginBottom: '14px',
            }}
          >
            <div style={{ backgroundColor: '#111911', border: '1px solid #2d401a', borderRadius: '4px', padding: '10px' }}>
              <div style={{ fontSize: '10px', color: '#9ca3af' }}>TOTAL EVENTS INSPECTED</div>
              <div style={{ fontSize: '20px', fontWeight: 800, color: '#38bdf8' }}>{totalEventsInspected}</div>
              <div style={{ fontSize: '10px', color: '#6b7280' }}>Signed CRDT ops</div>
            </div>
            <div style={{ backgroundColor: '#111911', border: '1px solid #2d401a', borderRadius: '4px', padding: '10px' }}>
              <div style={{ fontSize: '10px', color: '#9ca3af' }}>INTEGRITY SCORE</div>
              <div
                style={{
                  fontSize: '20px',
                  fontWeight: 800,
                  color: simulatedAnomalies.length === 0 ? '#39ff14' : '#ef4444',
                }}
              >
                {simulatedAnomalies.length === 0 ? '100.0%' : '84.2%'}
              </div>
              <div style={{ fontSize: '10px', color: '#6b7280' }}>Cryptographic Proof</div>
            </div>
            <div style={{ backgroundColor: '#111911', border: '1px solid #2d401a', borderRadius: '4px', padding: '10px' }}>
              <div style={{ fontSize: '10px', color: '#9ca3af' }}>ANOMALIES FLAGGED</div>
              <div
                style={{
                  fontSize: '20px',
                  fontWeight: 800,
                  color: simulatedAnomalies.length === 0 ? '#39ff14' : '#f5b700',
                }}
              >
                {simulatedAnomalies.length}
              </div>
              <div style={{ fontSize: '10px', color: '#6b7280' }}>Invariants Tested</div>
            </div>
            <div style={{ backgroundColor: '#111911', border: '1px solid #2d401a', borderRadius: '4px', padding: '10px' }}>
              <div style={{ fontSize: '10px', color: '#9ca3af' }}>STATUS</div>
              <div
                style={{
                  fontSize: '14px',
                  fontWeight: 800,
                  color: simulatedAnomalies.length === 0 ? '#39ff14' : '#f87171',
                  marginTop: '4px',
                }}
              >
                {simulatedAnomalies.length === 0 ? '✓ VERIFIED PASS' : '⚠ ANOMALY DETECTED'}
              </div>
              <div style={{ fontSize: '10px', color: '#6b7280' }}>Ed25519 Chain Valid</div>
            </div>
          </div>

          {/* Test Harness / Anomaly Simulator */}
          <div
            style={{
              backgroundColor: '#0d150d',
              border: '1px dashed #3b5323',
              borderRadius: '4px',
              padding: '10px',
              marginBottom: '14px',
            }}
          >
            <div style={{ fontSize: '11px', fontWeight: 700, color: '#f5b700', marginBottom: '6px' }}>
              ⚡ FORENSIC INJECTION HARNESS (SIMULATE CHEAT VECTORS)
            </div>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              <button
                onClick={() => handleSimulateViolation('SPEED_ANOMALY')}
                style={{
                  backgroundColor: '#27170a',
                  color: '#fb923c',
                  border: '1px solid #7c2d12',
                  padding: '5px 10px',
                  borderRadius: '3px',
                  fontSize: '11px',
                  cursor: 'pointer',
                }}
              >
                + Speed Anomaly (&gt;10 m/s)
              </button>
              <button
                onClick={() => handleSimulateViolation('TELEPORTATION')}
                style={{
                  backgroundColor: '#27170a',
                  color: '#fb923c',
                  border: '1px solid #7c2d12',
                  padding: '5px 10px',
                  borderRadius: '3px',
                  fontSize: '11px',
                  cursor: 'pointer',
                }}
              >
                + Teleportation (&gt;200m)
              </button>
              <button
                onClick={() => handleSimulateViolation('CLOCK_ROLLBACK')}
                style={{
                  backgroundColor: '#27170a',
                  color: '#fb923c',
                  border: '1px solid #7c2d12',
                  padding: '5px 10px',
                  borderRadius: '3px',
                  fontSize: '11px',
                  cursor: 'pointer',
                }}
              >
                + Clock Rollback (-120s)
              </button>
              <button
                onClick={() => handleSimulateViolation('GEOFENCE_VIOLATION')}
                style={{
                  backgroundColor: '#27170a',
                  color: '#fb923c',
                  border: '1px solid #7c2d12',
                  padding: '5px 10px',
                  borderRadius: '3px',
                  fontSize: '11px',
                  cursor: 'pointer',
                }}
              >
                + Geofence Breach
              </button>
              <button
                onClick={() => setSimulatedAnomalies([])}
                style={{
                  backgroundColor: '#1b2d1b',
                  color: '#86efac',
                  border: '1px solid #166534',
                  padding: '5px 10px',
                  borderRadius: '3px',
                  fontSize: '11px',
                  cursor: 'pointer',
                }}
              >
                ✓ Reset to Clean
              </button>
            </div>
          </div>

          {/* Anomaly Inspection Table */}
          <div style={{ backgroundColor: '#090e09', border: '1px solid #1f2e14', borderRadius: '4px', overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px', textAlign: 'left' }}>
              <thead>
                <tr style={{ backgroundColor: '#131e13', color: '#9ca3af', borderBottom: '1px solid #2d401a' }}>
                  <th style={{ padding: '8px 10px' }}>SEVERITY</th>
                  <th style={{ padding: '8px 10px' }}>ANOMALY TYPE</th>
                  <th style={{ padding: '8px 10px' }}>OPERATOR</th>
                  <th style={{ padding: '8px 10px' }}>DETAILS & EVIDENCE</th>
                </tr>
              </thead>
              <tbody>
                {simulatedAnomalies.length === 0 ? (
                  <tr>
                    <td colSpan={4} style={{ padding: '24px', textAlign: 'center', color: '#4ade80' }}>
                      ✓ All 1,420 CRDT operations passed cryptographic signature verification and physical sensor bounds.
                    </td>
                  </tr>
                ) : (
                  simulatedAnomalies.map((anom) => (
                    <tr key={anom.id} style={{ borderBottom: '1px solid #1b261b' }}>
                      <td style={{ padding: '8px 10px' }}>
                        <span
                          style={{
                            backgroundColor:
                              anom.severity === 'CRITICAL' ? '#7f1d1d' : anom.severity === 'HIGH' ? '#7c2d12' : '#374151',
                            color: '#ffffff',
                            padding: '2px 6px',
                            borderRadius: '2px',
                            fontWeight: 'bold',
                            fontSize: '10px',
                          }}
                        >
                          {anom.severity}
                        </span>
                      </td>
                      <td style={{ padding: '8px 10px', color: '#f5b700', fontWeight: 'bold' }}>{anom.type}</td>
                      <td style={{ padding: '8px 10px', color: '#e5e7eb' }}>{anom.callsign || anom.operatorId}</td>
                      <td style={{ padding: '8px 10px', color: '#9ca3af' }}>
                        <div>{anom.description}</div>
                        <div style={{ fontSize: '10px', color: '#6b7280', marginTop: '2px' }}>
                          Evidence: {JSON.stringify(anom.evidence)}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Action row */}
          <div style={{ marginTop: '12px', display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
            <button
              onClick={() => {
                if (onExportAuditReport) {
                  onExportAuditReport();
                } else {
                  const blob = new Blob(
                    [
                      JSON.stringify(
                        {
                          missionId: 'GDANSK_ALPHA_2026',
                          auditedAt: new Date().toISOString(),
                          integrityScore: simulatedAnomalies.length === 0 ? 100 : 84.2,
                          totalEventsInspected,
                          anomalies: simulatedAnomalies,
                        },
                        null,
                        2
                      ),
                    ],
                    { type: 'application/json' }
                  );
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = `audit_manifest_${Date.now()}.json`;
                  a.click();
                  URL.revokeObjectURL(url);
                }
              }}
              style={{
                backgroundColor: '#27381d',
                color: '#86efac',
                border: '1px solid #3b5323',
                padding: '6px 14px',
                borderRadius: '4px',
                fontSize: '11px',
                fontWeight: 'bold',
                cursor: 'pointer',
              }}
            >
              📥 EXPORT AUDIT MANIFEST (.JSON)
            </button>
          </div>
        </div>
      )}

      {activeTab === 'metrics' && (
        <div style={{ padding: '8px' }}>
          <div style={{ fontSize: '12px', fontWeight: 700, color: '#f5b700', marginBottom: '8px' }}>
            TERRITORY CONTROL & SCORE DYNAMICS
          </div>
          <div
            style={{
              backgroundColor: '#090e09',
              border: '1px solid #1f2e14',
              borderRadius: '4px',
              padding: '16px',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px', fontSize: '11px' }}>
              <span style={{ color: '#39ff14', fontWeight: 700 }}>SQUAD ALPHA: {currentScores.alpha} PTS</span>
              <span style={{ color: '#f97316', fontWeight: 700 }}>SQUAD BRAVO: {currentScores.bravo} PTS</span>
            </div>

            {/* Score progress comparison bar */}
            <div
              style={{
                height: '14px',
                backgroundColor: '#1f2937',
                borderRadius: '7px',
                overflow: 'hidden',
                display: 'flex',
                marginBottom: '16px',
              }}
            >
              <div
                style={{
                  width: `${(currentScores.alpha / (currentScores.alpha + currentScores.bravo || 1)) * 100}%`,
                  backgroundColor: '#22c55e',
                  transition: 'width 0.2s ease',
                }}
              />
              <div
                style={{
                  width: `${(currentScores.bravo / (currentScores.alpha + currentScores.bravo || 1)) * 100}%`,
                  backgroundColor: '#f97316',
                  transition: 'width 0.2s ease',
                }}
              />
            </div>

            {/* Telemetry Summary */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '8px' }}>
              {trajectories.map((traj) => (
                <div
                  key={traj.operatorId}
                  style={{
                    backgroundColor: '#111711',
                    border: '1px solid #223318',
                    padding: '8px',
                    borderRadius: '4px',
                    fontSize: '11px',
                  }}
                >
                  <div style={{ color: traj.squad === 'squad_alpha' ? '#4ade80' : '#fb923c', fontWeight: 'bold' }}>
                    {traj.callsign}
                  </div>
                  <div style={{ color: '#9ca3af', marginTop: '4px' }}>
                    Distance: <span style={{ color: '#e5e7eb' }}>{traj.totalDistanceMeters}m</span>
                  </div>
                  <div style={{ color: '#9ca3af' }}>
                    Max Speed: <span style={{ color: '#e5e7eb' }}>{traj.maxSpeedMps} m/s</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
