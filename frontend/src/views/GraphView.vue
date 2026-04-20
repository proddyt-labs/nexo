<template>
  <div class="flex flex-col h-full">
    <div class="flex items-center gap-3 px-6 py-3 border-b border-slate-800">
      <h2 class="font-semibold text-white text-sm">Grafo de conexões</h2>
      <span class="text-xs text-slate-500">{{ nodes.length }} notas · {{ edges.length }} conexões</span>
      <div class="ml-auto flex items-center gap-2">
        <input v-model="search" class="input text-xs py-1 w-36" placeholder="Buscar nota…" />
        <button @click="resetView" class="btn-ghost text-xs">Centralizar</button>
      </div>
    </div>

    <div class="flex-1 relative overflow-hidden bg-slate-950" ref="container">
      <canvas ref="canvas" class="w-full h-full" @mousedown="onMouseDown" @mousemove="onMouseMove" @mouseup="onMouseUp" @wheel="onWheel" />

      <!-- Tooltip ao hover -->
      <div
        v-if="hovered"
        class="absolute pointer-events-none bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white shadow-xl"
        :style="{ left: tooltipPos.x + 'px', top: tooltipPos.y + 'px' }"
      >
        <span class="text-lg mr-1">{{ hovered.emoji ?? "📄" }}</span>{{ hovered.label }}
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, watch, computed } from "vue";
import { useRoute, useRouter } from "vue-router";
import { api } from "@/lib/api";

const route  = useRoute();
const router = useRouter();
const wsId   = route.params.workspaceId as string;

interface GraphNode { id: string; label: string; emoji?: string; collectionId?: string; tags: any[]; x: number; y: number; vx: number; vy: number }
interface GraphEdge { source: string; target: string }

const nodes     = ref<GraphNode[]>([]);
const edges     = ref<GraphEdge[]>([]);
const search    = ref("");
const hovered   = ref<GraphNode | null>(null);
const tooltipPos = ref({ x: 0, y: 0 });
const canvas    = ref<HTMLCanvasElement>();
const container = ref<HTMLDivElement>();

// Camera
let camX = 0, camY = 0, camZ = 1;
let dragging = false, dragLast = { x: 0, y: 0 };
let dragNode: GraphNode | null = null;
let animFrame = 0;

const highlightedNodes = computed(() => {
  if (!search.value) return new Set<string>();
  const q = search.value.toLowerCase();
  return new Set(nodes.value.filter(n => n.label.toLowerCase().includes(q)).map(n => n.id));
});

async function load() {
  const { data } = await api.get<{ nodes: any[]; edges: GraphEdge[] }>(`/workspaces/${wsId}/graph`);
  const W = container.value?.clientWidth ?? 800;
  const H = container.value?.clientHeight ?? 600;
  nodes.value = data.nodes.map(n => ({
    ...n,
    x: W / 2 + (Math.random() - .5) * 400,
    y: H / 2 + (Math.random() - .5) * 400,
    vx: 0, vy: 0,
  }));
  edges.value = data.edges;
  startSimulation();
}

// Force-directed layout (simples, sem biblioteca)
function startSimulation() {
  let iter = 0;
  function tick() {
    if (iter++ > 300) { draw(); return; }
    const ns = nodes.value;
    const K = 80, REPEL = 3000, DAMP = 0.8;

    // Reset forces
    ns.forEach(n => { n.vx = 0; n.vy = 0; });

    // Repulsão entre todos
    for (let i = 0; i < ns.length; i++) {
      for (let j = i + 1; j < ns.length; j++) {
        const dx = ns[j].x - ns[i].x || 0.01;
        const dy = ns[j].y - ns[i].y || 0.01;
        const d2 = dx * dx + dy * dy || 1;
        const f  = REPEL / d2;
        ns[i].vx -= f * dx; ns[i].vy -= f * dy;
        ns[j].vx += f * dx; ns[j].vy += f * dy;
      }
    }

    // Atração por arestas
    const nodeMap = new Map(ns.map(n => [n.id, n]));
    edges.value.forEach(e => {
      const a = nodeMap.get(e.source), b = nodeMap.get(e.target);
      if (!a || !b) return;
      const dx = b.x - a.x, dy = b.y - a.y;
      const d  = Math.sqrt(dx * dx + dy * dy) || 1;
      const f  = (d - K) * 0.05;
      a.vx += f * dx / d; a.vy += f * dy / d;
      b.vx -= f * dx / d; b.vy -= f * dy / d;
    });

    ns.forEach(n => {
      n.x += n.vx * DAMP;
      n.y += n.vy * DAMP;
    });

    draw();
    animFrame = requestAnimationFrame(tick);
  }
  tick();
}

function draw() {
  const c = canvas.value;
  if (!c) return;
  const ctx = c.getContext("2d")!;
  c.width  = container.value?.clientWidth ?? 800;
  c.height = container.value?.clientHeight ?? 600;
  ctx.clearRect(0, 0, c.width, c.height);
  ctx.save();
  ctx.translate(camX, camY);
  ctx.scale(camZ, camZ);

  const nodeMap   = new Map(nodes.value.map(n => [n.id, n]));
  const highlight = highlightedNodes.value;

  // Arestas
  edges.value.forEach(e => {
    const a = nodeMap.get(e.source), b = nodeMap.get(e.target);
    if (!a || !b) return;
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x, b.y);
    ctx.strokeStyle = "#334155";
    ctx.lineWidth   = 1;
    ctx.stroke();
  });

  // Nós
  nodes.value.forEach(n => {
    const isHighlight = highlight.size === 0 || highlight.has(n.id);
    const isHovered   = hovered.value?.id === n.id;
    const radius = isHovered ? 10 : 7;

    ctx.beginPath();
    ctx.arc(n.x, n.y, radius, 0, Math.PI * 2);
    ctx.fillStyle = isHovered ? "#60a5fa" : isHighlight ? "#3b82f6" : "#1e3a5f";
    ctx.fill();
    if (isHovered) {
      ctx.strokeStyle = "#93c5fd";
      ctx.lineWidth   = 2;
      ctx.stroke();
    }

    // Label
    if (camZ > 0.6 || isHovered) {
      ctx.fillStyle   = isHighlight ? "#e2e8f0" : "#475569";
      ctx.font        = `${isHovered ? 13 : 11}px Inter, sans-serif`;
      ctx.textAlign   = "center";
      ctx.fillText((n.emoji ?? "") + " " + (n.label.length > 20 ? n.label.slice(0, 18) + "…" : n.label), n.x, n.y + radius + 14);
    }
  });

  ctx.restore();
}

function worldPos(e: MouseEvent) {
  const rect = canvas.value!.getBoundingClientRect();
  return {
    x: (e.clientX - rect.left - camX) / camZ,
    y: (e.clientY - rect.top  - camY) / camZ,
  };
}

function nodeAt(e: MouseEvent): GraphNode | null {
  const { x, y } = worldPos(e);
  return nodes.value.find(n => Math.hypot(n.x - x, n.y - y) < 12) ?? null;
}

function onMouseDown(e: MouseEvent) {
  const n = nodeAt(e);
  if (n) { dragNode = n; return; }
  dragging = true;
  dragLast = { x: e.clientX, y: e.clientY };
}

function onMouseMove(e: MouseEvent) {
  const n = nodeAt(e);
  hovered.value = n;
  if (n) {
    tooltipPos.value = { x: e.offsetX + 15, y: e.offsetY - 10 };
  }

  if (dragNode) {
    const { x, y } = worldPos(e);
    dragNode.x = x; dragNode.y = y;
    draw();
    return;
  }
  if (dragging) {
    camX += e.clientX - dragLast.x;
    camY += e.clientY - dragLast.y;
    dragLast = { x: e.clientX, y: e.clientY };
    draw();
  }
}

function onMouseUp(e: MouseEvent) {
  if (dragNode && Math.hypot(e.movementX, e.movementY) < 3) {
    router.push(`/w/${wsId}/notes/${dragNode.id}`);
  }
  dragNode  = null;
  dragging  = false;
}

function onWheel(e: WheelEvent) {
  e.preventDefault();
  const factor = e.deltaY > 0 ? 0.9 : 1.1;
  camZ = Math.max(0.2, Math.min(3, camZ * factor));
  draw();
}

function resetView() {
  camX = 0; camY = 0; camZ = 1;
  draw();
}

watch(search, draw);

onMounted(load);
onBeforeUnmount(() => cancelAnimationFrame(animFrame));
</script>
