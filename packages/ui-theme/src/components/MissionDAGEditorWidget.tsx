import React, { useState } from 'react';

export interface DAGNodeData {
  id: string;
  name: string;
  prerequisites: string[];
  status: 'HIDDEN' | 'LOCKED' | 'ACTIVE' | 'RESOLVED';
  owner: string | null;
  points: number;
  lat?: number;
  lon?: number;
  geofenceRadiusMeters?: number;
  captureMechanism?: 'INSTANT_NFC' | 'TIMED_HOLD' | 'SYNC_CAPTURE';
  holdDurationSeconds?: number;
  requiredOperators?: number;
}

export interface DAGRosterEntryData {
  id: string;
  callsign: string;
  squad: 'squad_alpha' | 'squad_bravo';
  role: 'LEADER' | 'POINTMAN' | 'MEDIC' | 'RTO' | 'MARKSMAN';
  publicKey: string;
  revoked: boolean;
}

export interface MissionDAGEditorWidgetProps {
  nodes: Record<string, DAGNodeData>;
  roster?: DAGRosterEntryData[];
  onSelectNode?: (nodeId: string) => void;
  onAddDependency?: (parentId: string, childId: string) => void;
  onRemoveDependency?: (parentId: string, childId: string) => void;
  onToggleRevokeOperator?: (operatorId: string) => void;
  onExportManifest?: () => void;
  readOnly?: boolean;
}

export const MissionDAGEditorWidget: React.FC<MissionDAGEditorWidgetProps> = ({
  nodes,
  roster = [],
  onSelectNode,
  onAddDependency,
  onRemoveDependency,
  onToggleRevokeOperator,
  onExportManifest,
  readOnly = false,
}) => {
  const [activeTab, setActiveTab] = useState<'dag' | 'roster' | 'manifest'>('dag');
  const [selectedNodeId, setSelectedNodeId] = useState<string>(Object.keys(nodes)[0] || '');
  const [newPrereqParent, setNewPrereqParent] = useState<string>('');

  const selectedNode = nodes[selectedNodeId];
  const nodeList = Object.values(nodes);

  // Compute dependency links
  const links: Array<{ from: string; to: string }> = [];
  nodeList.forEach((n) => {
    n.prerequisites.forEach((p) => {
      links.push({ from: p, to: n.id });
    });
  });

  return (
    <div className="w-full bg-[#141c14] border-2 border-[#4e9b4e] rounded-lg p-4 font-mono text-xs select-none shadow-2xl text-[#e8ede8]">
      {/* Header & Sub-Navigation */}
      <div className="flex items-center justify-between border-b border-[#2e3d2e] pb-3 mb-4 flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 bg-[#f5b700] rounded-sm" />
          <h3 className="text-sm font-black text-[#f5b700] uppercase tracking-wider">
            MISSION BUILDER // DAG GRAPH &amp; SQUAD ROSTER
          </h3>
          <span className="text-[10px] px-2 py-0.5 rounded border border-[#4e9b4e] bg-[#4e9b4e]/20 text-[#68d391]">
            STAGE 3 DYNAMIC EDITOR
          </span>
        </div>

        <div className="flex items-center gap-1.5 bg-[#0b0f0b] p-1 rounded border border-[#2e3d2e]">
          <button
            onClick={() => setActiveTab('dag')}
            className={`px-2.5 py-1 rounded text-[11px] font-bold transition-all ${
              activeTab === 'dag'
                ? 'bg-[#3b5323] text-[#f5b700] border border-[#f5b700]'
                : 'text-[#9ba89b] hover:text-white'
            }`}
          >
            OBJECTIVE DAG GRAPH ({nodeList.length})
          </button>
          <button
            onClick={() => setActiveTab('roster')}
            className={`px-2.5 py-1 rounded text-[11px] font-bold transition-all ${
              activeTab === 'roster'
                ? 'bg-[#3b5323] text-[#f5b700] border border-[#f5b700]'
                : 'text-[#9ba89b] hover:text-white'
            }`}
          >
            SQUAD ROSTER ({roster.length})
          </button>
          <button
            onClick={() => setActiveTab('manifest')}
            className={`px-2.5 py-1 rounded text-[11px] font-bold transition-all ${
              activeTab === 'manifest'
                ? 'bg-[#3b5323] text-[#f5b700] border border-[#f5b700]'
                : 'text-[#9ba89b] hover:text-white'
            }`}
          >
            SIGNED MANIFEST
          </button>
        </div>
      </div>

      {/* Tab 1: DAG Objective Graph View */}
      {activeTab === 'dag' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Visual DAG Node Flow Chart */}
          <div className="lg:col-span-2 bg-[#0b0f0b] border border-[#2e3d2e] rounded-lg p-4 space-y-4">
            <div className="flex items-center justify-between text-[11px] text-[#9ba89b]">
              <span>MISSION DEPENDENCY PIPELINE (ROOTS ➔ UNLOCKED NODES)</span>
              <span className="text-[#f5b700]">{links.length} ACTIVE PREREQUISITE EDGES</span>
            </div>

            {/* Render Node Flow Columns */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {nodeList.map((n) => {
                const isSelected = n.id === selectedNodeId;
                const isRoot = n.prerequisites.length === 0;

                return (
                  <div
                    key={n.id}
                    onClick={() => {
                      setSelectedNodeId(n.id);
                      if (onSelectNode) onSelectNode(n.id);
                    }}
                    className={`p-3 rounded-lg border-2 cursor-pointer transition-all ${
                      isSelected
                        ? 'border-[#f5b700] bg-[#1c261c] shadow-lg shadow-[#f5b700]/10'
                        : 'border-[#2e3d2e] bg-[#141c14] hover:border-[#4e9b4e]'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="font-black text-white text-xs truncate">{n.name}</span>
                      <span
                        className={`text-[9px] px-1.5 py-0.5 rounded font-bold uppercase ${
                          n.status === 'RESOLVED'
                            ? 'bg-[#4e9b4e]/30 text-[#68d391] border border-[#4e9b4e]'
                            : n.status === 'ACTIVE'
                              ? 'bg-[#f5b700]/20 text-[#f5b700] border border-[#f5b700]'
                              : 'bg-[#2e3d2e] text-[#9ba89b]'
                        }`}
                      >
                        {n.status}
                      </span>
                    </div>

                    <div className="space-y-1 text-[10px] text-[#9ba89b]">
                      <div className="flex justify-between">
                        <span>Prerequisites:</span>
                        <span className="text-[#e8ede8] font-bold">
                          {isRoot ? 'None (Root Node)' : n.prerequisites.join(', ')}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>Capture Mechanism:</span>
                        <span className="text-[#f5b700] font-bold">
                          {n.captureMechanism || 'INSTANT_NFC'}
                          {n.holdDurationSeconds ? ` (${n.holdDurationSeconds}s)` : ''}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>Geofence Radius:</span>
                        <span className="text-[#68d391] font-bold">
                          {n.geofenceRadiusMeters || 50}m
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>Score Reward:</span>
                        <span className="text-white font-bold">{n.points} PTS</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Dependency Edge Visualizer List */}
            <div className="border-t border-[#2e3d2e] pt-3">
              <div className="text-[11px] font-bold text-[#c7a76c] mb-2 uppercase">
                Direct Acyclic Graph Dependency Edges
              </div>
              <div className="flex flex-wrap gap-2">
                {links.map((link, idx) => (
                  <div
                    key={idx}
                    className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#141c14] border border-[#3b5323] text-[10px]"
                  >
                    <span className="text-[#68d391] font-bold">{link.from}</span>
                    <span className="text-[#f5b700]">➔</span>
                    <span className="text-white font-bold">{link.to}</span>
                    {!readOnly && onRemoveDependency && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onRemoveDependency(link.from, link.to);
                        }}
                        className="text-[#ff4444] hover:text-white font-black ml-1.5"
                        title="Remove dependency link"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Node Inspector & Dependency Linker */}
          <div className="bg-[#0b0f0b] border border-[#2e3d2e] rounded-lg p-4 space-y-4">
            <div className="text-xs font-bold text-[#f5b700] uppercase border-b border-[#2e3d2e] pb-2">
              OBJECTIVE INSPECTOR
            </div>

            {selectedNode ? (
              <div className="space-y-3 text-xs">
                <div>
                  <div className="text-[10px] text-[#9ba89b]">OBJECTIVE IDENTIFIER</div>
                  <div className="font-black text-white text-sm">{selectedNode.id}</div>
                </div>

                <div>
                  <div className="text-[10px] text-[#9ba89b]">NAME</div>
                  <div className="font-bold text-[#e8ede8]">{selectedNode.name}</div>
                </div>

                <div className="grid grid-cols-2 gap-2 text-[11px]">
                  <div className="p-2 rounded bg-[#141c14] border border-[#2e3d2e]">
                    <div className="text-[10px] text-[#9ba89b]">GEOFENCE</div>
                    <div className="font-bold text-[#68d391]">{selectedNode.geofenceRadiusMeters || 50}m</div>
                  </div>
                  <div className="p-2 rounded bg-[#141c14] border border-[#2e3d2e]">
                    <div className="text-[10px] text-[#9ba89b]">POINTS</div>
                    <div className="font-bold text-[#f5b700]">{selectedNode.points} PTS</div>
                  </div>
                </div>

                {/* Add Dependency Control */}
                {!readOnly && onAddDependency && (
                  <div className="pt-3 border-t border-[#2e3d2e] space-y-2">
                    <div className="text-[10px] text-[#c7a76c] font-bold uppercase">
                      LINK NEW PREREQUISITE
                    </div>
                    <div className="text-[10px] text-[#9ba89b]">
                      Require another objective to be captured before &quot;{selectedNode.id}&quot; unlocks:
                    </div>
                    <div className="flex gap-2">
                      <select
                        value={newPrereqParent}
                        onChange={(e) => setNewPrereqParent(e.target.value)}
                        className="flex-1 bg-[#141c14] border border-[#2e3d2e] text-[#e8ede8] rounded px-2 py-1 text-xs"
                      >
                        <option value="">Select parent objective...</option>
                        {nodeList
                          .filter((n) => n.id !== selectedNode.id && !selectedNode.prerequisites.includes(n.id))
                          .map((n) => (
                            <option key={n.id} value={n.id}>
                              {n.name} ({n.id})
                            </option>
                          ))}
                      </select>
                      <button
                        disabled={!newPrereqParent}
                        onClick={() => {
                          if (newPrereqParent && onAddDependency) {
                            onAddDependency(newPrereqParent, selectedNode.id);
                            setNewPrereqParent('');
                          }
                        }}
                        className="px-3 py-1 bg-[#3b5323] hover:bg-[#4e9b4e] disabled:opacity-40 text-white font-bold rounded text-xs transition-colors"
                      >
                        LINK
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-[#9ba89b] text-xs">Select an objective on the left to inspect.</div>
            )}
          </div>
        </div>
      )}

      {/* Tab 2: Squad Roster & Role Registry */}
      {activeTab === 'roster' && (
        <div className="bg-[#0b0f0b] border border-[#2e3d2e] rounded-lg p-4 space-y-4">
          <div className="flex items-center justify-between text-[11px] text-[#9ba89b] border-b border-[#2e3d2e] pb-2">
            <span>TACTICAL OPERATORS REGISTERED IN CRDT SECURITY REGISTRY</span>
            <span className="text-[#68d391] font-bold">
              {roster.filter((r) => !r.revoked).length} ACTIVE / {roster.length} TOTAL
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-[#2e3d2e] text-[#9ba89b] text-[10px]">
                  <th className="py-2 px-3">CALLSIGN</th>
                  <th className="py-2 px-3">SQUAD</th>
                  <th className="py-2 px-3">SPECIALIST ROLE</th>
                  <th className="py-2 px-3">ED25519 PUBLIC KEY (FINGERPRINT)</th>
                  <th className="py-2 px-3 text-right">SECURITY STATUS</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1c261c]">
                {roster.map((op) => (
                  <tr key={op.id} className="hover:bg-[#141c14] transition-colors">
                    <td className="py-2.5 px-3 font-black text-white">{op.callsign}</td>
                    <td className="py-2.5 px-3">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${
                          op.squad === 'squad_alpha'
                            ? 'bg-[#4e9b4e]/20 text-[#68d391] border border-[#4e9b4e]'
                            : 'bg-[#8a6240]/25 text-[#d4a373] border border-[#a67c52]'
                        }`}
                      >
                        {op.squad === 'squad_alpha' ? 'ALPHA (OLIVE)' : 'BRAVO (COYOTE)'}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-[#f5b700] font-bold">{op.role}</td>
                    <td className="py-2.5 px-3 font-mono text-[10px] text-[#9ba89b]">
                      {op.publicKey.substring(0, 16)}...{op.publicKey.substring(op.publicKey.length - 8)}
                    </td>
                    <td className="py-2.5 px-3 text-right">
                      {onToggleRevokeOperator && !readOnly ? (
                        <button
                          onClick={() => onToggleRevokeOperator(op.id)}
                          className={`px-2 py-0.5 rounded text-[10px] font-bold border transition-colors ${
                            op.revoked
                              ? 'bg-[#c5221f]/20 text-[#ff6666] border-[#c5221f] hover:bg-[#c5221f]/40'
                              : 'bg-[#4e9b4e]/20 text-[#68d391] border-[#4e9b4e] hover:bg-[#c5221f]/20 hover:text-[#ff6666]'
                          }`}
                        >
                          {op.revoked ? 'REVOKED (REINSTATE)' : 'ACTIVE (REVOKE)'}
                        </button>
                      ) : (
                        <span
                          className={`text-[10px] font-bold ${
                            op.revoked ? 'text-[#ff6666]' : 'text-[#68d391]'
                          }`}
                        >
                          {op.revoked ? 'REVOKED' : 'AUTHORIZED'}
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 3: Signed Mission Manifest & Air-Gapped Export */}
      {activeTab === 'manifest' && (
        <div className="bg-[#0b0f0b] border border-[#2e3d2e] rounded-lg p-4 space-y-4">
          <div className="flex items-center justify-between border-b border-[#2e3d2e] pb-2">
            <div>
              <div className="font-black text-[#f5b700] text-sm">
                AIR-GAPPED CRYPTOGRAPHIC MISSION PACKAGE
              </div>
              <div className="text-[11px] text-[#9ba89b]">
                Canonical JSON specification signed with GM Ed25519 root authority key.
              </div>
            </div>
            {onExportManifest && (
              <button
                onClick={onExportManifest}
                className="px-3 py-1.5 bg-[#f5b700] hover:bg-[#e09f3e] text-black font-black text-xs rounded transition-colors"
              >
                DOWNLOAD SIGNED MANIFEST (.JSON)
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-3.5 rounded bg-[#141c14] border border-[#2e3d2e] space-y-2">
              <div className="text-[11px] font-bold text-[#68d391] uppercase">
                Base45 High-Density QR Payload Format
              </div>
              <p className="text-[10px] text-[#9ba89b] leading-relaxed">
                Mission manifests can be encoded directly into RFC 9285 Base45 strings and scanned via camera or optical bridge between air-gapped field devices without cellular connectivity.
              </p>
              <div className="p-2.5 rounded bg-[#0b0f0b] border border-[#3b5323] font-mono text-[9px] text-[#f5b700] break-all max-h-28 overflow-y-auto">
                %69VD-C70SHE/DF.1:DA70KL6*56%EC70$461D-C70GD-C709461D-C70WD-C70*56%EC70$461D-C70GD-C709461D-C70WD-C70*56%EC70$461D-C70GD-C709461D-C70WD-C70
              </div>
            </div>

            <div className="p-3.5 rounded bg-[#141c14] border border-[#2e3d2e] space-y-2">
              <div className="text-[11px] font-bold text-[#c7a76c] uppercase">
                Cryptographic Signature Safeguards
              </div>
              <ul className="text-[10px] text-[#9ba89b] space-y-1 list-disc list-inside">
                <li>Ed25519 non-repudiation signature on canonicalized objective DAG.</li>
                <li>Prevents unauthorized in-field objective tampering or rogue scoring.</li>
                <li>Operator public key registry embedded directly within manifest.</li>
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
