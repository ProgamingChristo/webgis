"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import {
  Camera,
  Eye,
  Maximize2,
  Minimize2,
  Pause,
  Play,
  RefreshCw,
  Crosshair,
  ShieldCheck,
  Download,
} from "lucide-react";
import type { CctvFeed } from "../types";

type VisionMode = "normal" | "night" | "thermal";

interface Vehicle {
  id: number;
  type: "car" | "bus" | "taxi" | "motorcycle";
  x: number;
  y: number;
  speed: number;
  lane: number;
  color: string;
  width: number;
  height: number;
  label: string;
  confidence: number;
}

interface Pedestrian {
  id: number;
  x: number;
  y: number;
  speedX: number;
  speedY: number;
  direction: number;
  color: string;
  radius: number;
  label: string;
  confidence: number;
}

interface CctvLivePlayerProps {
  feed: CctvFeed;
  aiDetection: boolean;
  onToggleAi: () => void;
}

export function CctvLivePlayer({ feed, aiDetection, onToggleAi }: CctvLivePlayerProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  // Stream controls
  const [isPlaying, setIsPlaying] = useState(true);
  const [visionMode, setVisionMode] = useState<VisionMode>("normal");
  const [zoomLevel, setZoomLevel] = useState<1 | 2 | 4>(1);
  const [panOffset, setPanOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [snapshotUrl, setSnapshotUrl] = useState<string | null>(null);
  const [snapshotFilename, setSnapshotFilename] = useState("cctv-capture.png");
  const [isFullscreen, setIsFullscreen] = useState(false);
  const playerContainerRef = useRef<HTMLDivElement | null>(null);

  // Live telemetry
  const [fps, setFps] = useState(feed.fps || 30);
  const [bitrate, setBitrate] = useState("4.8 Mbps");
  const [currentTimeStr, setCurrentTimeStr] = useState("");

  // Simulation Entities stored in ref to maintain continuity between renders
  const entitiesRef = useRef<{
    vehicles: Vehicle[];
    pedestrians: Pedestrian[];
    trafficLight: "green" | "yellow" | "red";
    lightTimer: number;
  }>({
    vehicles: [],
    pedestrians: [],
    trafficLight: "green",
    lightTimer: 0,
  });

  // Re-seed entities whenever the camera feed changes
  useEffect(() => {
    const isTokyo = feed.city === "tokyo";
    const isLondon = feed.city === "london";
    const isNewYork = feed.city === "new-york";
    const isJakarta = feed.city === "jakarta";

    const initialVehicles: Vehicle[] = [];
    const vehicleCount = isTokyo ? 10 : isJakarta ? 14 : 12;

    const colors = [
      "#e0e7ff", "#94a3b8", "#1e293b", "#ef4444", "#3b82f6", "#10b981", "#f59e0b"
    ];

    for (let i = 0; i < vehicleCount; i++) {
      const lane = i % 4;
      const isBus = (isJakarta && i % 4 === 0) || (isLondon && i % 3 === 0);
      const isTaxi = isNewYork && i % 3 === 1;
      const isMotor = isJakarta && i % 2 === 1;

      let type: Vehicle["type"] = "car";
      let width = 54;
      let height = 26;
      let color = colors[i % colors.length];

      if (isBus) {
        type = "bus";
        width = 96;
        height = 34;
        color = isJakarta ? "#0284c7" : isLondon ? "#dc2626" : "#2563eb";
      } else if (isTaxi) {
        type = "taxi";
        width = 56;
        height = 26;
        color = "#eab308";
      } else if (isMotor) {
        type = "motorcycle";
        width = 28;
        height = 14;
        color = "#10b981";
      }

      initialVehicles.push({
        id: 100 + i,
        type,
        x: (i * 120) % 960,
        y: 190 + lane * 42,
        speed: (lane < 2 ? 1 : -1) * (1.2 + (i % 3) * 0.4),
        lane,
        color,
        width,
        height,
        label: type.toUpperCase(),
        confidence: 0.91 + (i % 8) * 0.01,
      });
    }

    const initialPedestrians: Pedestrian[] = [];
    const pedCount = isTokyo ? 38 : isNewYork ? 28 : isJakarta ? 20 : 16;
    for (let i = 0; i < pedCount; i++) {
      initialPedestrians.push({
        id: 300 + i,
        x: 40 + (i * 26) % 880,
        y: 390 + (i % 3) * 24 + ((i * 13) % 20),
        speedX: (i % 2 === 0 ? 0.6 : -0.6) * (0.8 + (i % 4) * 0.2),
        speedY: (Math.sin(i) * 0.2),
        direction: i % 2 === 0 ? 1 : -1,
        color: colors[i % colors.length],
        radius: 7,
        label: "PEDESTRIAN",
        confidence: 0.93 + (i % 6) * 0.01,
      });
    }

    entitiesRef.current = {
      vehicles: initialVehicles,
      pedestrians: initialPedestrians,
      trafficLight: "green",
      lightTimer: 0,
    };
  }, [feed.city]);

  // Main Canvas Rendering Loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let lastTimestamp = performance.now();
    let frameCount = 0;
    let lastFpsUpdate = performance.now();

    const render = (now: number) => {
      // Calculate real FPS
      frameCount++;
      if (now - lastFpsUpdate >= 1000) {
        const computedFps = Math.round((frameCount * 1000) / (now - lastFpsUpdate));
        setFps(computedFps);
        frameCount = 0;
        lastFpsUpdate = now;
        setBitrate(`${(4.4 + Math.random() * 0.7).toFixed(1)} Mbps`);
      }

      // Live UTC Timestamp
      const dt = new Date();
      const datePart = dt.toISOString().slice(0, 10);
      const timePart = dt.toTimeString().slice(0, 8);
      const msPart = String(dt.getMilliseconds()).padStart(3, "0");
      setCurrentTimeStr(`${datePart} ${timePart}.${msPart} UTC`);

      const width = canvas.width;
      const height = canvas.height;

      // Update simulation physics if playing
      if (isPlaying) {
        const delta = Math.min((now - lastTimestamp) / 1000, 0.1);
        const { vehicles, pedestrians } = entitiesRef.current;

        // Traffic light cycle
        entitiesRef.current.lightTimer += delta;
        if (entitiesRef.current.lightTimer > 12) {
          entitiesRef.current.trafficLight =
            entitiesRef.current.trafficLight === "green" ? "yellow" :
            entitiesRef.current.trafficLight === "yellow" ? "red" : "green";
          entitiesRef.current.lightTimer = 0;
        }

        const isRed = entitiesRef.current.trafficLight === "red";

        // Move Vehicles
        vehicles.forEach((v) => {
          let speedMultiplier = 1;
          if (isRed && ((v.speed > 0 && v.x > 380 && v.x < 460) || (v.speed < 0 && v.x < 580 && v.x > 500))) {
            speedMultiplier = 0.05; // Slow down for red light
          }
          v.x += v.speed * 60 * delta * speedMultiplier;
          if (v.speed > 0 && v.x > width + 100) v.x = -100;
          if (v.speed < 0 && v.x < -100) v.x = width + 100;
        });

        // Move Pedestrians
        pedestrians.forEach((p) => {
          p.x += p.speedX * 60 * delta;
          p.y += p.speedY * 60 * delta;
          if (p.x > width + 40) p.x = -20;
          if (p.x < -40) p.x = width + 20;
          if (p.y < 370) p.speedY = Math.abs(p.speedY);
          if (p.y > 470) p.speedY = -Math.abs(p.speedY);
        });
      }
      lastTimestamp = now;

      // 1. Clear Canvas with Background Base
      ctx.save();

      // Digital Pan & Zoom Matrix
      if (zoomLevel > 1) {
        ctx.translate(width / 2 + panOffset.x, height / 2 + panOffset.y);
        ctx.scale(zoomLevel, zoomLevel);
        ctx.translate(-width / 2, -height / 2);
      }

      // Draw Sky & City Horizon Backdrop
      const skyGrad = ctx.createLinearGradient(0, 0, 0, 180);
      if (visionMode === "night") {
        skyGrad.addColorStop(0, "#021208");
        skyGrad.addColorStop(1, "#062814");
      } else if (visionMode === "thermal") {
        skyGrad.addColorStop(0, "#10002b");
        skyGrad.addColorStop(1, "#240046");
      } else {
        skyGrad.addColorStop(0, "#0f172a");
        skyGrad.addColorStop(1, "#1e293b");
      }
      ctx.fillStyle = skyGrad;
      ctx.fillRect(0, 0, width, 180);

      // Distant City Skyline Silhouettes
      ctx.fillStyle = visionMode === "night" ? "#0a3a1f" : visionMode === "thermal" ? "#3c096c" : "#334155";
      const skylineBuildings = [
        { x: 30, w: 60, h: 90 },
        { x: 100, w: 45, h: 120 },
        { x: 155, w: 80, h: 70 },
        { x: 250, w: 70, h: 140 },
        { x: 330, w: 90, h: 110 },
        { x: 440, w: 55, h: 130 },
        { x: 510, w: 100, h: 80 },
        { x: 630, w: 65, h: 150 },
        { x: 710, w: 85, h: 100 },
        { x: 810, w: 110, h: 135 },
      ];
      skylineBuildings.forEach((b) => {
        ctx.fillRect(b.x, 180 - b.h, b.w, b.h);
        if (visionMode !== "night") {
          ctx.fillStyle = "#ffd166";
          for (let wy = 180 - b.h + 10; wy < 170; wy += 14) {
            for (let wx = b.x + 8; wx < b.x + b.w - 8; wx += 12) {
              if ((wx + wy) % 5 !== 0) {
                ctx.fillRect(wx, wy, 4, 6);
              }
            }
          }
          ctx.fillStyle = visionMode === "thermal" ? "#3c096c" : "#334155";
        }
      });

      // Landmark Feature if Jakarta
      if (feed.city === "jakarta") {
        ctx.fillStyle = visionMode === "night" ? "#15803d" : "#0284c7";
        ctx.fillRect(470, 70, 20, 110);
        ctx.beginPath();
        ctx.arc(480, 70, 14, 0, Math.PI * 2);
        ctx.fill();
      }

      // 2. Asphalt Road Surfaces
      const roadColor = visionMode === "night" ? "#041d0e" : visionMode === "thermal" ? "#1e0538" : "#1e293b";
      ctx.fillStyle = roadColor;
      ctx.fillRect(0, 180, width, 180);

      // Road Median / Divider
      ctx.fillStyle = visionMode === "night" ? "#166534" : "#475569";
      ctx.fillRect(0, 268, width, 6);

      // Dashed Lane Markings
      ctx.strokeStyle = visionMode === "night" ? "#22c55e" : visionMode === "thermal" ? "#ff9e00" : "#ffffff";
      ctx.lineWidth = 3;
      ctx.setLineDash([24, 18]);

      ctx.beginPath();
      ctx.moveTo(0, 224);
      ctx.lineTo(width, 224);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(0, 312);
      ctx.lineTo(width, 312);
      ctx.stroke();
      ctx.setLineDash([]);

      // Zebra Crossings
      ctx.fillStyle = visionMode === "night" ? "rgba(34, 197, 94, 0.4)" : "rgba(255, 255, 255, 0.55)";
      for (let zx = 420; zx < 540; zx += 16) {
        ctx.fillRect(zx, 182, 9, 176);
      }

      // 3. Sidewalk / Pedestrian Promenade Area
      const sidewalkColor = visionMode === "night" ? "#052e16" : visionMode === "thermal" ? "#2d004b" : "#334155";
      ctx.fillStyle = sidewalkColor;
      ctx.fillRect(0, 360, width, 180);

      // Pavement Tiles Grid Pattern
      ctx.strokeStyle = visionMode === "night" ? "rgba(34, 197, 94, 0.15)" : "rgba(255, 255, 255, 0.08)";
      ctx.lineWidth = 1;
      for (let px = 0; px < width; px += 32) {
        ctx.beginPath();
        ctx.moveTo(px, 360);
        ctx.lineTo(px, height);
        ctx.stroke();
      }
      for (let py = 360; py < height; py += 30) {
        ctx.beginPath();
        ctx.moveTo(0, py);
        ctx.lineTo(width, py);
        ctx.stroke();
      }

      // Traffic Signal Light Pole
      const signalX = 400;
      ctx.fillStyle = "#1e293b";
      ctx.fillRect(signalX, 130, 8, 50);
      ctx.fillRect(signalX - 6, 120, 20, 36);

      const lightState = entitiesRef.current.trafficLight;
      ctx.fillStyle = lightState === "red" ? "#ef4444" : "#374151";
      ctx.beginPath();
      ctx.arc(signalX + 4, 126, 4, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = lightState === "yellow" ? "#eab308" : "#374151";
      ctx.beginPath();
      ctx.arc(signalX + 4, 138, 4, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = lightState === "green" ? "#22c55e" : "#374151";
      ctx.beginPath();
      ctx.arc(signalX + 4, 150, 4, 0, Math.PI * 2);
      ctx.fill();

      // 4. Render Vehicles
      const { vehicles, pedestrians } = entitiesRef.current;
      vehicles.forEach((v) => {
        ctx.save();
        ctx.translate(v.x, v.y);

        ctx.fillStyle = "rgba(0, 0, 0, 0.4)";
        ctx.fillRect(-v.width / 2 + 3, -v.height / 2 + 4, v.width, v.height);

        let bodyColor = v.color;
        if (visionMode === "night") bodyColor = "#15803d";
        if (visionMode === "thermal") bodyColor = "#ff0054";

        ctx.fillStyle = bodyColor;
        ctx.beginPath();
        const r = 5;
        const x = -v.width / 2;
        const y = -v.height / 2;
        const w = v.width;
        const h = v.height;
        ctx.moveTo(x + r, y);
        ctx.lineTo(x + w - r, y);
        ctx.quadraticCurveTo(x + w, y, x + w, y + r);
        ctx.lineTo(x + w, y + h - r);
        ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
        ctx.lineTo(x + r, y + h);
        ctx.quadraticCurveTo(x, y + h, x, y + h - r);
        ctx.lineTo(x, y + r);
        ctx.quadraticCurveTo(x, y, x + r, y);
        ctx.closePath();
        ctx.fill();

        ctx.fillStyle = visionMode === "night" ? "#052e16" : visionMode === "thermal" ? "#7b2cbf" : "#0f172a";
        if (v.type === "bus") {
          for (let wx = -v.width / 2 + 8; wx < v.width / 2 - 8; wx += 14) {
            ctx.fillRect(wx, -v.height / 2 + 4, 10, v.height - 8);
          }
        } else if (v.type !== "motorcycle") {
          ctx.fillRect(-v.width / 4, -v.height / 2 + 4, v.width / 2, v.height - 8);
        }

        const isRight = v.speed > 0;
        ctx.fillStyle = visionMode === "night" ? "#4ade80" : "#fef08a";
        const frontX = isRight ? v.width / 2 - 3 : -v.width / 2;
        ctx.fillRect(frontX, -v.height / 2 + 2, 3, 5);
        ctx.fillRect(frontX, v.height / 2 - 7, 3, 5);

        ctx.fillStyle = "#ef4444";
        const backX = isRight ? -v.width / 2 : v.width / 2 - 3;
        ctx.fillRect(backX, -v.height / 2 + 2, 3, 4);
        ctx.fillRect(backX, v.height / 2 - 6, 3, 4);

        ctx.restore();

        if (aiDetection) {
          ctx.save();
          const boxPadding = 6;
          const bx = v.x - v.width / 2 - boxPadding;
          const by = v.y - v.height / 2 - boxPadding;
          const bw = v.width + boxPadding * 2;
          const bh = v.height + boxPadding * 2;

          ctx.strokeStyle = visionMode === "thermal" ? "#ff9e00" : "#22c55e";
          ctx.lineWidth = 1.8;
          ctx.strokeRect(bx, by, bw, bh);

          ctx.fillStyle = "#22c55e";
          const cornerLen = 5;
          ctx.fillRect(bx, by, cornerLen, 2);
          ctx.fillRect(bx, by, 2, cornerLen);
          ctx.fillRect(bx + bw - cornerLen, by, cornerLen, 2);
          ctx.fillRect(bx + bw - 2, by, 2, cornerLen);

          ctx.fillStyle = "rgba(0, 0, 0, 0.85)";
          ctx.fillRect(bx, by - 16, 102, 15);
          ctx.fillStyle = "#22c55e";
          ctx.font = "bold 9px monospace";
          ctx.fillText(`${v.label} ${(v.confidence * 100).toFixed(0)}% #${v.id}`, bx + 4, by - 5);
          ctx.restore();
        }
      });

      // 5. Render Pedestrians
      pedestrians.forEach((p) => {
        ctx.save();
        ctx.translate(p.x, p.y);

        ctx.fillStyle = "rgba(0, 0, 0, 0.35)";
        ctx.beginPath();
        ctx.ellipse(0, 5, p.radius, p.radius * 0.5, 0, 0, Math.PI * 2);
        ctx.fill();

        let bodyColor = p.color;
        if (visionMode === "night") bodyColor = "#86efac";
        if (visionMode === "thermal") bodyColor = "#ff5400";

        ctx.fillStyle = bodyColor;
        ctx.beginPath();
        ctx.arc(0, 0, p.radius, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = visionMode === "night" ? "#052e16" : "#0f172a";
        ctx.beginPath();
        ctx.arc(0, 0, p.radius * 0.45, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();

        if (aiDetection) {
          ctx.save();
          const bx = p.x - p.radius - 4;
          const by = p.y - p.radius - 4;
          const bw = (p.radius + 4) * 2;
          const bh = (p.radius + 4) * 2;

          ctx.strokeStyle = "#38bdf8";
          ctx.lineWidth = 1.4;
          ctx.strokeRect(bx, by, bw, bh);

          ctx.fillStyle = "rgba(0, 0, 0, 0.8)";
          ctx.fillRect(bx, by - 14, 82, 13);
          ctx.fillStyle = "#38bdf8";
          ctx.font = "bold 8px monospace";
          ctx.fillText(`PED ${(p.confidence * 100).toFixed(0)}% #${p.id}`, bx + 3, by - 4);
          ctx.restore();
        }
      });

      // 6. Camera Scanlines & Filters
      if (visionMode === "night") {
        ctx.fillStyle = "rgba(34, 197, 94, 0.12)";
        ctx.fillRect(0, 0, width, height);

        const vig = ctx.createRadialGradient(width / 2, height / 2, 200, width / 2, height / 2, width * 0.7);
        vig.addColorStop(0, "rgba(0,0,0,0)");
        vig.addColorStop(1, "rgba(2, 44, 20, 0.7)");
        ctx.fillStyle = vig;
        ctx.fillRect(0, 0, width, height);
      } else if (visionMode === "thermal") {
        const vig = ctx.createRadialGradient(width / 2, height / 2, 200, width / 2, height / 2, width * 0.7);
        vig.addColorStop(0, "rgba(255, 0, 84, 0.05)");
        vig.addColorStop(1, "rgba(16, 0, 43, 0.7)");
        ctx.fillStyle = vig;
        ctx.fillRect(0, 0, width, height);
      }

      ctx.fillStyle = "rgba(0, 0, 0, 0.08)";
      for (let sl = 0; sl < height; sl += 4) {
        ctx.fillRect(0, sl, width, 1.5);
      }

      ctx.restore();
      animationFrameRef.current = requestAnimationFrame(render);
    };

    animationFrameRef.current = requestAnimationFrame(render);

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [isPlaying, visionMode, zoomLevel, panOffset, aiDetection, feed]);

  // Snapshot capture handler
  const handleCaptureSnapshot = useCallback(() => {
    if (!canvasRef.current) return;
    const url = canvasRef.current.toDataURL("image/png");
    setSnapshotFilename(`cctv-${feed.id}-${Date.now()}.png`);
    setSnapshotUrl(url);
  }, [feed.id]);

  const handlePan = (dx: number, dy: number) => {
    setPanOffset((prev) => ({
      x: Math.max(-200, Math.min(200, prev.x + dx)),
      y: Math.max(-150, Math.min(150, prev.y + dy)),
    }));
  };

  const handleResetView = () => {
    setZoomLevel(1);
    setPanOffset({ x: 0, y: 0 });
  };

  const toggleFullscreen = () => {
    if (!playerContainerRef.current) return;
    if (!document.fullscreenElement) {
      playerContainerRef.current.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    }
  };

  return (
    <div
      ref={playerContainerRef}
      className="group relative overflow-hidden rounded-3xl border border-[#464b71]/15 bg-slate-950 shadow-[0_12px_32px_rgba(70,75,113,0.12)]"
    >
      {/* Top Stream Status OSD Bar */}
      <div className="absolute left-0 right-0 top-0 z-20 flex flex-wrap items-center justify-between gap-2 bg-gradient-to-b from-black/85 via-black/50 to-transparent p-4 font-mono text-xs text-white">
        <div className="flex items-center gap-3">
          <div className="inline-flex items-center gap-2 rounded-full bg-emerald-500/20 px-3 py-1 font-bold text-emerald-400 border border-emerald-500/40 backdrop-blur-md">
            <span className={`inline-block h-2.5 w-2.5 rounded-full bg-emerald-400 ${isPlaying ? "animate-pulse" : "opacity-40"}`} />
            {isPlaying ? "LIVE STREAM" : "PAUSED"}
          </div>
          <span className="hidden text-slate-300 sm:inline">|</span>
          <span className="text-emerald-300 font-bold">{fps} FPS</span>
          <span className="text-slate-400">·</span>
          <span className="text-slate-300">{bitrate}</span>
          <span className="text-slate-400">·</span>
          <span className="text-cyan-300 font-bold">{feed.latencyMs}ms LAT</span>
        </div>

        <div className="flex items-center gap-2">
          <div className="rounded-lg bg-black/60 px-3 py-1 text-slate-200 border border-white/10 backdrop-blur-md">
            {currentTimeStr || "2026-09-19 --:--:-- UTC"}
          </div>
          <div className="hidden sm:inline-block rounded-lg bg-[#118ab2]/20 px-2.5 py-1 text-[11px] font-bold text-[#62d6c8] border border-[#118ab2]/30">
            {feed.resolution}
          </div>
        </div>
      </div>

      {/* Main High-Performance Canvas */}
      <div className="relative aspect-video w-full bg-slate-950 flex items-center justify-center">
        <canvas
          ref={canvasRef}
          width={960}
          height={540}
          className="h-full w-full object-cover select-none"
        />

        {/* Live OSD Crosshairs / Lens Target */}
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center opacity-30">
          <Crosshair size={48} className="text-white" />
        </div>

        {/* Camera Info Watermark Lower-Left */}
        <div className="pointer-events-none absolute bottom-16 left-4 z-20 font-mono text-xs text-white drop-shadow-md">
          <p className="font-black text-white text-sm tracking-wide">{feed.name}</p>
          <p className="text-slate-300 text-[11px]">{feed.location} · {feed.protocol}</p>
          <p className="text-emerald-400 text-[10px] mt-0.5 font-bold">
            CAM_ID: {feed.id.toUpperCase()} · EDGE_GW: ONLINE
          </p>
        </div>

        {/* AI Counter Pill Lower-Right */}
        <div className="pointer-events-none absolute bottom-16 right-4 z-20 flex flex-col items-end gap-1 font-mono text-xs">
          <div className="rounded-xl bg-black/75 px-3 py-1.5 border border-white/10 backdrop-blur-md text-right">
            <div className="flex items-center gap-2">
              <ShieldCheck size={14} className="text-[#62d6c8]" />
              <span className="font-bold text-white">GETRA Vision Engine 2.0</span>
            </div>
            <div className="mt-1 flex gap-3 text-[11px]">
              <span className="text-emerald-400 font-bold">🚗 Mobilitas: Aktif</span>
              <span className="text-cyan-300 font-bold">🚶 Scramble: Terpantau</span>
            </div>
          </div>
        </div>
      </div>

      {/* Interactive Bottom Control Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[#464b71]/20 bg-slate-900/95 px-4 py-3 text-white backdrop-blur-md">
        {/* Play/Pause & AI Detection Toggle */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setIsPlaying((p) => !p)}
            className="flex items-center gap-1.5 rounded-xl bg-[#118ab2] px-3.5 py-1.5 text-xs font-bold text-white hover:bg-[#0d7495] transition"
            title={isPlaying ? "Jeda Stream" : "Mulai Stream"}
          >
            {isPlaying ? <Pause size={14} /> : <Play size={14} />}
            <span>{isPlaying ? "Jeda" : "Putar"}</span>
          </button>

          <button
            type="button"
            onClick={onToggleAi}
            className={`flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-bold transition border ${
              aiDetection
                ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/40"
                : "bg-slate-800 text-slate-400 border-slate-700"
            }`}
          >
            <Eye size={14} />
            <span>AI Box: {aiDetection ? "ON" : "OFF"}</span>
          </button>

          {/* Vision Mode Filter */}
          <div className="flex items-center rounded-xl bg-slate-800 p-0.5 border border-slate-700">
            {(["normal", "night", "thermal"] as VisionMode[]).map((mode) => (
              <button
                key={mode}
                type="button"
                onClick={() => setVisionMode(mode)}
                className={`rounded-lg px-2.5 py-1 text-[11px] font-bold uppercase transition ${
                  visionMode === mode
                    ? "bg-[#118ab2] text-white shadow-sm"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                {mode === "normal" ? "RGB" : mode === "night" ? "IR/Night" : "Thermal"}
              </button>
            ))}
          </div>
        </div>

        {/* PTZ Zoom & Pan Controls */}
        <div className="flex items-center gap-1.5">
          <span className="text-[11px] font-mono text-slate-400 mr-1 hidden sm:inline">PTZ:</span>
          <button
            type="button"
            onClick={() => handlePan(-30, 0)}
            className="rounded-lg bg-slate-800 px-2 py-1 text-xs text-slate-300 hover:bg-slate-700 hover:text-white"
            title="Pan Kiri"
          >
            ◀
          </button>
          <button
            type="button"
            onClick={() => handlePan(30, 0)}
            className="rounded-lg bg-slate-800 px-2 py-1 text-xs text-slate-300 hover:bg-slate-700 hover:text-white"
            title="Pan Kanan"
          >
            ▶
          </button>
          <button
            type="button"
            onClick={() => handlePan(0, -25)}
            className="rounded-lg bg-slate-800 px-2 py-1 text-xs text-slate-300 hover:bg-slate-700 hover:text-white"
            title="Tilt Atas"
          >
            ▲
          </button>
          <button
            type="button"
            onClick={() => handlePan(0, 25)}
            className="rounded-lg bg-slate-800 px-2 py-1 text-xs text-slate-300 hover:bg-slate-700 hover:text-white"
            title="Tilt Bawah"
          >
            ▼
          </button>

          {/* Zoom Buttons */}
          <div className="flex items-center ml-2 rounded-xl bg-slate-800 p-0.5 border border-slate-700">
            {([1, 2, 4] as const).map((z) => (
              <button
                key={z}
                type="button"
                onClick={() => setZoomLevel(z)}
                className={`rounded-lg px-2 py-1 text-[11px] font-bold transition ${
                  zoomLevel === z
                    ? "bg-[#62d6c8] text-slate-950"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                {z}x
              </button>
            ))}
          </div>

          {(zoomLevel > 1 || panOffset.x !== 0 || panOffset.y !== 0) && (
            <button
              type="button"
              onClick={handleResetView}
              className="ml-1 rounded-lg bg-slate-800 p-1.5 text-xs text-slate-400 hover:text-white hover:bg-slate-700"
              title="Reset Sudut Pandang"
            >
              <RefreshCw size={12} />
            </button>
          )}

          {/* Snapshot Button */}
          <button
            type="button"
            onClick={handleCaptureSnapshot}
            className="ml-2 flex items-center gap-1 rounded-xl bg-emerald-600/80 px-2.5 py-1.5 text-xs font-bold text-white hover:bg-emerald-500 transition"
            title="Ambil Tangkapan Layar CCTV"
          >
            <Camera size={13} />
            <span className="hidden md:inline">Snapshot</span>
          </button>

          {/* Fullscreen Button */}
          <button
            type="button"
            onClick={toggleFullscreen}
            className="rounded-xl bg-slate-800 p-1.5 text-slate-300 hover:bg-slate-700 hover:text-white transition"
            title="Layar Penuh"
          >
            {isFullscreen ? <Minimize2 size={15} /> : <Maximize2 size={15} />}
          </button>
        </div>
      </div>

      {/* Snapshot Preview Modal */}
      {snapshotUrl && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
          <div className="w-full max-w-2xl rounded-3xl border border-[#464b71]/20 bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between pb-4 border-b border-[#464b71]/10">
              <div className="flex items-center gap-2 text-[#464b71] font-black text-lg">
                <Camera size={20} className="text-[#118ab2]" />
                <span>Tangkapan Layar CCTV — {feed.name}</span>
              </div>
              <button
                type="button"
                onClick={() => setSnapshotUrl(null)}
                className="rounded-full bg-slate-100 p-2 text-slate-500 hover:bg-slate-200"
              >
                ✕
              </button>
            </div>
            <div className="mt-4 overflow-hidden rounded-2xl border border-slate-200 shadow-inner">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={snapshotUrl} alt="CCTV Snapshot" className="w-full object-cover" />
            </div>
            <div className="mt-4 flex items-center justify-between">
              <span className="text-xs font-mono text-[#66708d]">{currentTimeStr}</span>
              <div className="flex gap-2">
                <a
                  href={snapshotUrl}
                  download={snapshotFilename}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-[#118ab2] px-4 py-2 text-xs font-bold text-white hover:bg-[#0d7495]"
                >
                  <Download size={14} /> Unduh Gambar
                </a>
                <button
                  type="button"
                  onClick={() => setSnapshotUrl(null)}
                  className="rounded-xl bg-slate-100 px-4 py-2 text-xs font-bold text-[#464b71] hover:bg-slate-200"
                >
                  Tutup
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
