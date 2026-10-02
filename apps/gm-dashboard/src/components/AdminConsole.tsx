import React, { useState } from 'react';
import { TacticalButton } from '@gridcommand/ui-theme';
import { MissionGraph } from '@gridcommand/crdt-core';

export interface AdminConsoleProps {
  graph: MissionGraph;
  globalFreeze: boolean;
  onToggleFreeze: () => void;
  onForceResolve: (nodeId: string, squad: 'squad_alpha' | 'squad_bravo') => void;
  onInjectHazard: (name: string, durationSeconds: number) => void;
}

export const AdminConsole: React.FC<AdminConsoleProps> = ({
  graph,
  globalFreeze,
  onToggleFreeze,
  onForceResolve,
  onInjectHazard,
}) => {
  const [selectedNode, setSelectedNode] = useState('bunker_02');
  const [targetSquad, setTargetSquad] = useState<'squad_alpha' | 'squad_bravo'>('squad_alpha');
  const [hazardName, setHazardName] = useState('Sector C - Artillery Strike');
  const [hazardTime, setHazardTime] = useState(180);

  return (
    <div className="w-full bg-[#0a0e14] border-b-2 border-[#1e2638] p-3 font-mono text-xs select-none">
      <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-4">
        {/* God Mode: Force Resolve Objective */}
        <div className="flex items-center gap-2 bg-[#121820] p-2 rounded border border-[#1e2638]">
          <span className="text-[#ffe600] font-black uppercase text-[10px]">GOD-MODE OVERRIDE:</span>
          <select
            value={selectedNode}
            onChange={(e) => setSelectedNode(e.target.value)}
            className="bg-[#000000] border border-[#1e2638] text-[#00f3ff] rounded px-2 py-1 text-xs"
          >
            {Object.values(graph.nodes).map((n) => (
              <option key={n.id} value={n.id}>
                {n.name} ({n.status})
              </option>
            ))}
          </select>

          <select
            value={targetSquad}
            onChange={(e) => setTargetSquad(e.target.value as 'squad_alpha' | 'squad_bravo')}
            className="bg-[#000000] border border-[#1e2638] text-[#e6edf3] rounded px-2 py-1 text-xs"
          >
            <option value="squad_alpha">Squad Alpha (Blue)</option>
            <option value="squad_bravo">Squad Bravo (Red)</option>
          </select>

          <TacticalButton
            size="compact"
            variant="cyan"
            onClick={() => onForceResolve(selectedNode, targetSquad)}
          >
            FORCE RESOLVE
          </TacticalButton>
        </div>

        {/* Hazard Inject Tool */}
        <div className="flex items-center gap-2 bg-[#121820] p-2 rounded border border-[#1e2638]">
          <span className="text-[#ff5500] font-black uppercase text-[10px]">INJECT HAZARD:</span>
          <input
            type="text"
            value={hazardName}
            onChange={(e) => setHazardName(e.target.value)}
            className="bg-[#000000] border border-[#1e2638] text-[#e6edf3] rounded px-2 py-1 text-xs w-44"
          />
          <TacticalButton
            size="compact"
            variant="yellow"
            onClick={() => onInjectHazard(hazardName, hazardTime)}
          >
            DISPATCH HAZARD
          </TacticalButton>
        </div>

        {/* Emergency Safety Global Freeze */}
        <div className="flex items-center gap-2">
          <TacticalButton
            variant="red"
            size="compact"
            className={`font-black text-xs ${globalFreeze ? 'animate-bounce' : ''}`}
            onClick={onToggleFreeze}
          >
            {globalFreeze ? '⚠️ LIFT GLOBAL FREEZE' : '🚨 EMERGENCY GLOBAL FREEZE'}
          </TacticalButton>
        </div>
      </div>
    </div>
  );
};
