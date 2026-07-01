"use client";

import { useMemo } from "react";
import ReactFlow, {
  Background,
  Controls,
  MarkerType,
  type Node,
  type Edge,
  Position,
} from "reactflow";
import "reactflow/dist/style.css";
import type { ConceptWithMastery, MasteryStatus } from "@/types";
import { STATUS_META } from "@/lib/mastery";

// Couleurs de remplissage des nœuds selon le statut de maîtrise.
const NODE_STYLE: Record<
  MasteryStatus,
  { bg: string; border: string; text: string }
> = {
  maitrise: { bg: "#ecfdf5", border: "#10b981", text: "#065f46" },
  fragile: { bg: "#fffbeb", border: "#f59e0b", text: "#92400e" },
  misconception: { bg: "#fef2f2", border: "#ef4444", text: "#991b1b" },
  non_teste: { bg: "#f8fafc", border: "#cbd5e1", text: "#64748b" },
};

/**
 * Carte de maîtrise interactive (React Flow).
 * Chaque concept est un nœud coloré selon son statut ; se met à jour en
 * temps réel pendant le diagnostic. Les concepts sont reliés en séquence
 * pédagogique (ordre). Zoomable/scrollable → lisible sur mobile.
 */
export function MasteryMap({
  concepts,
  activeConceptId,
}: {
  concepts: ConceptWithMastery[];
  activeConceptId?: string | null;
}) {
  const { nodes, edges } = useMemo(() => {
    const sorted = [...concepts].sort((a, b) => a.ordre - b.ordre);

    // Disposition en grille responsive (max 2 colonnes visuelles en zigzag).
    const nodes: Node[] = sorted.map((c, i) => {
      const style = NODE_STYLE[c.statut as MasteryStatus];
      const isActive = c.id === activeConceptId;
      const col = i % 2;
      const row = Math.floor(i / 2);
      return {
        id: c.id,
        position: { x: col * 260, y: row * 130 },
        data: {
          label: (
            <div className="px-1 py-0.5 text-left">
              <div
                className="text-[11px] font-bold uppercase tracking-wide"
                style={{ color: style.border }}
              >
                {STATUS_META[c.statut as MasteryStatus].label}
                {c.statut === "misconception" && " ⚠"}
              </div>
              <div
                className="mt-0.5 text-sm font-semibold leading-tight"
                style={{ color: style.text }}
              >
                {c.nom}
              </div>
              {c.statut !== "non_teste" && (
                <div className="mt-1 text-[11px]" style={{ color: style.text }}>
                  Score : {c.score}%
                </div>
              )}
            </div>
          ),
        },
        sourcePosition: Position.Right,
        targetPosition: Position.Left,
        style: {
          width: 220,
          borderRadius: 14,
          border: `2px solid ${style.border}`,
          background: style.bg,
          padding: 8,
          boxShadow: isActive
            ? `0 0 0 4px ${style.border}44`
            : "0 1px 3px rgba(0,0,0,0.08)",
          transition: "box-shadow .3s, background .3s, border-color .3s",
        },
      };
    });

    const edges: Edge[] = sorted.slice(1).map((c, i) => ({
      id: `e-${sorted[i].id}-${c.id}`,
      source: sorted[i].id,
      target: c.id,
      animated: c.id === activeConceptId,
      style: { stroke: "#cbd5e1", strokeWidth: 1.5 },
      markerEnd: { type: MarkerType.ArrowClosed, color: "#cbd5e1" },
    }));

    return { nodes, edges };
  }, [concepts, activeConceptId]);

  return (
    <div className="h-[380px] w-full overflow-hidden rounded-xl border bg-card sm:h-[440px]">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        fitView
        fitViewOptions={{ padding: 0.2 }}
        minZoom={0.3}
        maxZoom={1.5}
        proOptions={{ hideAttribution: true }}
        nodesDraggable={false}
        nodesConnectable={false}
        panOnScroll
        zoomOnPinch
      >
        <Background color="#e2e8f0" gap={20} />
        <Controls showInteractive={false} className="!shadow-sm" />
      </ReactFlow>
    </div>
  );
}
