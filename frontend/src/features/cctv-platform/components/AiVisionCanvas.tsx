"use client";

/**
 * GETRA AI Vision Canvas
 *
 * High-performance 60FPS Computer Vision Simulator & Neural Object Tracker.
 * Renders authentic urban CCTV perspectives with moving vehicles, TransJakarta buses,
 * motorcycles, pedestrians, and real-time YOLOv8x bounding box tracking.
 */

import { useEffect, useRef, useState, useCallback } from "react";
import type { CanonicalCamera } from "../../international/cctv-registry";

interface AiVisionCanvasProps {
  camera: CanonicalCamera;
  confidenceThreshold: number; // 50 - 95
  showBoundingBoxes: boolean;
  showLabels: boolean;
  showHeatmap: boolean;
  showTrajectories: boolean;
  isPaused: boolean;
  selectedModel: string;
  onStatsUpdate?: (stats: {
    cars: number;
    motorcycles: number;
    buses: number;
    pedestrians: number;
    trucks: number;
    bicycles: number;
    total: number;
    avgSpeed: number;
  }) => void;
}

interface TrackedEntity {
  id: string;
  type: "car" | "motorcycle" | "bus" | "pedestrian" | "truck" | "bicycle";
  x: number;
  y: number;
  vx: number;
  width: number;
  height: number;
  color: string;
  boxColor: string;
  label: string;
  confidence: number;
  speedKmH: number;
  lane: number;
  history: { x: number; y: number }[];
}

export function AiVisionCanvas({
  camera,
  confidenceThreshold,
  showBoundingBoxes,
  showLabels,
  showHeatmap,
  showTrajectories,
  isPaused,
  selectedModel,
  onStatsUpdate,
}: AiVisionCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const entitiesRef = useRef<TrackedEntity[]>([]);
  const nextIdRef = useRef(100);
  const frameIdRef = useRef<number>(0);
  const lastTimeRef = useRef<number>(0);

  // Determine site profile from camera name
  const isParkSite = camera.district.includes("Selatan") && (camera.camera_name.includes("Taman") || camera.camera_name.includes("Senayan"));
  const isIntersection = camera.camera_name.toLowerCase().includes("simpang") || camera.camera_name.toLowerCase().includes("flyover");

  // Initialize or reset entities when camera changes
  useEffect(() => {
    const initialEntities: TrackedEntity[] = [];
    const entityTypes: TrackedEntity["type"][] = isParkSite
      ? ["pedestrian", "pedestrian", "bicycle", "pedestrian", "car", "motorcycle", "pedestrian"]
      : ["car", "motorcycle", "car", "bus", "motorcycle", "truck", "motorcycle", "pedestrian", "car"];

    for (let i = 0; i < entityTypes.length; i++) {
      const type = entityTypes[i];
      const idNum = nextIdRef.current++;
      const conf = Math.floor(88 + Math.random() * 10);
      const lane = Math.floor(Math.random() * 4);
      const yBase = 180 + lane * 75;

      let width = 64;
      let height = 36;
      let label = "Mobil";
      let boxColor = "#059669";
      let color = "#3b82f6";
      let speed = 35 + Math.random() * 15;

      if (type === "motorcycle") {
        width = 38;
        height = 24;
        label = "Motor";
        boxColor = "#2563eb";
        color = "#1d4ed8";
        speed = 42 + Math.random() * 12;
      } else if (type === "bus") {
        width = 110;
        height = 48;
        label = "Bus TransJkt";
        boxColor = "#d97706";
        color = "#ea580c";
        speed = 28 + Math.random() * 8;
      } else if (type === "truck") {
        width = 95;
        height = 44;
        label = "Truk";
        boxColor = "#e11d48";
        color = "#475569";
        speed = 26 + Math.random() * 6;
      } else if (type === "pedestrian") {
        width = 24;
        height = 36;
        label = "Pedestrian";
        boxColor = "#9333ea";
        color = "#a855f7";
        speed = 4 + Math.random() * 2;
      } else if (type === "bicycle") {
        width = 36;
        height = 24;
        label = "Sepeda";
        boxColor = "#0891b2";
        color = "#06b6d4";
        speed = 15 + Math.random() * 5;
      }

      const x = 50 + i * 120 + Math.random() * 40;
      const y = type === "pedestrian" ? 110 + Math.random() * 30 : yBase + (lane === 0 ? 10 : 0);

      initialEntities.push({
        id: `${type.toUpperCase().slice(0, 3)}-${idNum}`,
        type,
        x,
        y,
        vx: type === "pedestrian" ? (Math.random() > 0.5 ? 0.8 : -0.8) : 1.8 + (speed / 20),
        width,
        height,
        color,
        boxColor,
        label,
        confidence: conf,
        speedKmH: Math.round(speed),
        lane,
        history: [{ x, y }],
      });
    }

    entitiesRef.current = initialEntities;
  }, [camera.camera_id, isParkSite]);

  // Main 60FPS animation & rendering loop
  const renderLoop = useCallback((time: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const w = canvas.width;
    const h = canvas.height;

    // Delta time
    if (!lastTimeRef.current) lastTimeRef.current = time;
    const dt = Math.min((time - lastTimeRef.current) / 1000, 0.1);
    lastTimeRef.current = time;

    // -----------------------------------------------------------------------
    // 1. Draw Environment & Road Background
    // -----------------------------------------------------------------------
    // Sky / City Skyline Backdrop
    const skyGrad = ctx.createLinearGradient(0, 0, 0, 150);
    skyGrad.addColorStop(0, "#0f172a");
    skyGrad.addColorStop(0.6, "#1e293b");
    skyGrad.addColorStop(1, "#334155");
    ctx.fillStyle = skyGrad;
    ctx.fillRect(0, 0, w, 150);

    // City Silhouette (Buildings in distance)
    ctx.fillStyle = "#1e293b";
    const bldgs = [
      { x: 30, w: 70, h: 90 },
      { x: 120, w: 90, h: 120 },
      { x: 230, w: 50, h: 70 },
      { x: 300, w: 110, h: 140 },
      { x: 430, w: 60, h: 80 },
      { x: 510, w: 130, h: 130 },
      { x: 660, w: 80, h: 100 },
      { x: 760, w: 140, h: 145 },
      { x: 920, w: 90, h: 115 },
      { x: 1030, w: 120, h: 135 },
      { x: 1170, w: 100, h: 85 },
    ];
    for (const b of bldgs) {
      ctx.fillRect(b.x, 150 - b.h, b.w, b.h);
      // Window lights
      ctx.fillStyle = "#fbbf2433";
      for (let wy = 150 - b.h + 10; wy < 140; wy += 14) {
        for (let wx = b.x + 8; wx < b.x + b.w - 10; wx += 12) {
          if ((wx + wy) % 5 === 0) ctx.fillRect(wx, wy, 4, 6);
        }
      }
      ctx.fillStyle = "#1e293b";
    }

    // Sidewalk & Trees Barrier
    ctx.fillStyle = "#64748b";
    ctx.fillRect(0, 140, w, 35);
    // Sidewalk tiles
    ctx.strokeStyle = "#475569";
    ctx.lineWidth = 1;
    for (let sx = 0; sx < w; sx += 40) {
      ctx.beginPath();
      ctx.moveTo(sx, 140);
      ctx.lineTo(sx, 175);
      ctx.stroke();
    }

    // Pedestrian Zebra Crossings
    ctx.fillStyle = "#f8fafc";
    for (let zx = 240; zx < 360; zx += 18) {
      ctx.fillRect(zx, 175, 10, 310);
    }
    for (let zx = 880; zx < 1000; zx += 18) {
      ctx.fillRect(zx, 175, 10, 310);
    }

    // Road Asphalt (Main Carriage Way)
    ctx.fillStyle = "#1e2430";
    ctx.fillRect(0, 175, w, 310);

    // Dedicated TransJakarta Busway Lane (Top Lane 0)
    ctx.fillStyle = "#7f1d1d88";
    ctx.fillRect(0, 175, w, 75);
    ctx.fillStyle = "#fecaca66";
    ctx.font = "bold 20px monospace";
    ctx.fillText("BUSWAY — KHUSUS TRANSJAKARTA", 400, 220);

    // Lane Dividers (Dashed White Lines)
    ctx.strokeStyle = "#ffffffbb";
    ctx.lineWidth = 2.5;
    ctx.setLineDash([20, 18]);
    for (let ly = 250; ly <= 400; ly += 75) {
      ctx.beginPath();
      ctx.moveTo(0, ly);
      ctx.lineTo(w, ly);
      ctx.stroke();
    }
    ctx.setLineDash([]); // Reset dash

    // Yellow Double Center / Median Line
    ctx.strokeStyle = "#eab308";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(0, 485);
    ctx.lineTo(w, 485);
    ctx.stroke();

    // Road Curb Bottom
    ctx.fillStyle = "#475569";
    ctx.fillRect(0, 488, w, 32);

    // -----------------------------------------------------------------------
    // 2. Update & Draw Moving Entities
    // -----------------------------------------------------------------------
    const entities = entitiesRef.current;
    const currentCounts = {
      cars: 0,
      motorcycles: 0,
      buses: 0,
      pedestrians: 0,
      trucks: 0,
      bicycles: 0,
      total: 0,
      speedSum: 0,
    };

    for (let i = 0; i < entities.length; i++) {
      const e = entities[i];

      // Update position if not paused
      if (!isPaused) {
        e.x += e.vx * 40 * dt;
        // Wrap around screen
        if (e.vx > 0 && e.x > w + 80) {
          e.x = -e.width - 40;
          e.confidence = Math.floor(88 + Math.random() * 11);
        } else if (e.vx < 0 && e.x < -80) {
          e.x = w + 40;
        }

        // Record history for trajectory trails
        if (showTrajectories && (e.history.length === 0 || Math.abs(e.x - e.history[e.history.length - 1].x) > 12)) {
          e.history.push({ x: e.x, y: e.y });
          if (e.history.length > 8) e.history.shift();
        }
      }

      // Count only if confidence >= threshold
      const isDetected = e.confidence >= confidenceThreshold;
      if (isDetected) {
        if (e.type === "car") currentCounts.cars++;
        else if (e.type === "motorcycle") currentCounts.motorcycles++;
        else if (e.type === "bus") currentCounts.buses++;
        else if (e.type === "pedestrian") currentCounts.pedestrians++;
        else if (e.type === "truck") currentCounts.trucks++;
        else if (e.type === "bicycle") currentCounts.bicycles++;
        currentCounts.total++;
        currentCounts.speedSum += e.speedKmH;
      }

      // ── Trajectory Trail Line ──
      if (showTrajectories && isDetected && e.history.length > 1) {
        ctx.strokeStyle = e.boxColor + "88";
        ctx.lineWidth = 2;
        ctx.setLineDash([4, 4]);
        ctx.beginPath();
        ctx.moveTo(e.history[0].x + e.width / 2, e.history[0].y + e.height / 2);
        for (let hIdx = 1; hIdx < e.history.length; hIdx++) {
          ctx.lineTo(e.history[hIdx].x + e.width / 2, e.history[hIdx].y + e.height / 2);
        }
        ctx.stroke();
        ctx.setLineDash([]);
      }

      // ── Draw Physical Vehicle / Pedestrian Body ──
      ctx.save();
      if (e.type === "car") {
        // Car shadow
        ctx.fillStyle = "rgba(0,0,0,0.45)";
        ctx.fillRect(e.x + 3, e.y + e.height - 4, e.width, 8);
        // Car body
        ctx.fillStyle = e.color;
        ctx.beginPath();
        ctx.roundRect(e.x, e.y, e.width, e.height, 6);
        ctx.fill();
        // Windshield & windows
        ctx.fillStyle = "#1e293b";
        ctx.fillRect(e.x + 12, e.y + 4, e.width - 24, e.height - 8);
        // Headlights
        ctx.fillStyle = "#fef08a";
        ctx.fillRect(e.x + e.width - 4, e.y + 3, 4, 7);
        ctx.fillRect(e.x + e.width - 4, e.y + e.height - 10, 4, 7);
        // Taillights
        ctx.fillStyle = "#ef4444";
        ctx.fillRect(e.x, e.y + 3, 3, 6);
        ctx.fillRect(e.x, e.y + e.height - 9, 3, 6);
      } else if (e.type === "motorcycle") {
        // Motorcycle Body & Rider
        ctx.fillStyle = "rgba(0,0,0,0.4)";
        ctx.fillRect(e.x, e.y + e.height - 3, e.width, 5);
        ctx.fillStyle = e.color;
        ctx.fillRect(e.x + 4, e.y + 7, e.width - 8, 10);
        // Wheels
        ctx.fillStyle = "#0f172a";
        ctx.beginPath();
        ctx.arc(e.x + 6, e.y + 12, 6, 0, Math.PI * 2);
        ctx.arc(e.x + e.width - 6, e.y + 12, 6, 0, Math.PI * 2);
        ctx.fill();
        // Rider helmet
        ctx.fillStyle = "#f59e0b";
        ctx.beginPath();
        ctx.arc(e.x + e.width / 2, e.y + 8, 6, 0, Math.PI * 2);
        ctx.fill();
        // Headlight
        ctx.fillStyle = "#fef08a";
        ctx.fillRect(e.x + e.width - 2, e.y + 9, 3, 6);
      } else if (e.type === "bus") {
        // TransJakarta Bus Body (Blue/Orange Livery)
        ctx.fillStyle = "rgba(0,0,0,0.5)";
        ctx.fillRect(e.x + 4, e.y + e.height - 4, e.width, 9);
        // Lower blue body
        ctx.fillStyle = "#1d4ed8";
        ctx.fillRect(e.x, e.y + 16, e.width, e.height - 16);
        // Upper white body
        ctx.fillStyle = "#f8fafc";
        ctx.fillRect(e.x, e.y, e.width, 18);
        // TransJakarta orange stripe
        ctx.fillStyle = "#f97316";
        ctx.fillRect(e.x, e.y + 16, e.width, 4);
        // Windows
        ctx.fillStyle = "#0f172a";
        for (let wx = e.x + 10; wx < e.x + e.width - 12; wx += 16) {
          ctx.fillRect(wx, e.y + 4, 12, 10);
        }
        // Headlights
        ctx.fillStyle = "#fef08a";
        ctx.fillRect(e.x + e.width - 4, e.y + 22, 4, 8);
        ctx.fillRect(e.x + e.width - 4, e.y + e.height - 12, 4, 8);
      } else if (e.type === "truck") {
        // Cargo Truck
        ctx.fillStyle = "rgba(0,0,0,0.45)";
        ctx.fillRect(e.x + 2, e.y + e.height - 4, e.width, 8);
        // Container
        ctx.fillStyle = "#475569";
        ctx.fillRect(e.x, e.y, e.width - 22, e.height);
        // Cabin
        ctx.fillStyle = "#e11d48";
        ctx.fillRect(e.x + e.width - 20, e.y + 4, 20, e.height - 8);
        // Headlight
        ctx.fillStyle = "#fef08a";
        ctx.fillRect(e.x + e.width - 3, e.y + 8, 3, 7);
      } else if (e.type === "pedestrian") {
        // Pedestrian Silhouette with Head & Body
        ctx.fillStyle = "rgba(0,0,0,0.3)";
        ctx.beginPath();
        ctx.ellipse(e.x + e.width / 2, e.y + e.height - 2, 8, 3, 0, 0, Math.PI * 2);
        ctx.fill();
        // Head
        ctx.fillStyle = "#fed7aa";
        ctx.beginPath();
        ctx.arc(e.x + e.width / 2, e.y + 7, 5, 0, Math.PI * 2);
        ctx.fill();
        // Torso
        ctx.fillStyle = e.color;
        ctx.fillRect(e.x + 5, e.y + 13, e.width - 10, 14);
        // Legs
        ctx.fillStyle = "#1e293b";
        ctx.fillRect(e.x + 6, e.y + 27, 4, 9);
        ctx.fillRect(e.x + e.width - 10, e.y + 27, 4, 9);
      } else if (e.type === "bicycle") {
        // Bicycle Rider
        ctx.fillStyle = "#0891b2";
        ctx.fillRect(e.x + 6, e.y + 8, e.width - 12, 8);
        ctx.fillStyle = "#0f172a";
        ctx.beginPath();
        ctx.arc(e.x + 8, e.y + 16, 6, 0, Math.PI * 2);
        ctx.arc(e.x + e.width - 8, e.y + 16, 6, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();

      // ---------------------------------------------------------------------
      // 3. Draw YOLOv8x AI Bounding Box & HUD Tags
      // ---------------------------------------------------------------------
      if (showBoundingBoxes && isDetected) {
        const pad = 5;
        const bx = e.x - pad;
        const by = e.y - pad;
        const bw = e.width + pad * 2;
        const bh = e.height + pad * 2;

        ctx.save();
        // Bounding Box Frame
        ctx.strokeStyle = e.boxColor;
        ctx.lineWidth = 2;
        ctx.strokeRect(bx, by, bw, bh);

        // Corner Targeting Reticles
        const rLen = 6;
        ctx.strokeStyle = "#ffffff";
        ctx.lineWidth = 2;
        // Top-left
        ctx.beginPath();
        ctx.moveTo(bx, by + rLen);
        ctx.lineTo(bx, by);
        ctx.lineTo(bx + rLen, by);
        ctx.stroke();
        // Top-right
        ctx.beginPath();
        ctx.moveTo(bx + bw - rLen, by);
        ctx.lineTo(bx + bw, by);
        ctx.lineTo(bx + bw, by + rLen);
        ctx.stroke();
        // Bottom-left
        ctx.beginPath();
        ctx.moveTo(bx, by + bh - rLen);
        ctx.lineTo(bx, by + bh);
        ctx.lineTo(bx + rLen, by + bh);
        ctx.stroke();
        // Bottom-right
        ctx.beginPath();
        ctx.moveTo(bx + bw - rLen, by + bh);
        ctx.lineTo(bx + bw, by + bh);
        ctx.lineTo(bx + bw, by + bh - rLen);
        ctx.stroke();

        // Class Label & Confidence Pill
        if (showLabels) {
          const labelText = `${e.label} #${e.id.split("-")[1]}`;
          const confText = `${e.confidence}%`;
          ctx.font = "bold 10px monospace";
          const tw = ctx.measureText(`${labelText} ${confText}`).width;

          // Pill Background
          ctx.fillStyle = e.boxColor;
          ctx.fillRect(bx, by - 16, tw + 8, 16);

          // Pill Text
          ctx.fillStyle = "#ffffff";
          ctx.fillText(`${labelText} `, bx + 4, by - 4);
          ctx.fillStyle = "#fef08a";
          ctx.fillText(confText, bx + ctx.measureText(`${labelText} `).width + 2, by - 4);

          // Speed & Heading Sub-tag
          if (e.speedKmH > 5) {
            ctx.fillStyle = "rgba(0,0,0,0.75)";
            ctx.fillRect(bx, by + bh, 56, 13);
            ctx.fillStyle = "#38bdf8";
            ctx.font = "bold 9px monospace";
            ctx.fillText(`${e.speedKmH} km/h`, bx + 3, by + bh + 10);
          }
        }
        ctx.restore();
      }
    }

    // -----------------------------------------------------------------------
    // 4. Density Heatmap Overlay (if enabled)
    // -----------------------------------------------------------------------
    if (showHeatmap) {
      ctx.save();
      const heatGrad = ctx.createLinearGradient(0, 180, 0, 480);
      heatGrad.addColorStop(0, "rgba(239, 68, 68, 0.45)");
      heatGrad.addColorStop(0.4, "rgba(249, 115, 22, 0.35)");
      heatGrad.addColorStop(0.8, "rgba(34, 197, 94, 0.25)");
      heatGrad.addColorStop(1, "transparent");
      ctx.fillStyle = heatGrad;
      ctx.fillRect(0, 180, w, 300);
      ctx.restore();
    }

    // -----------------------------------------------------------------------
    // 5. Professional CCTV HUD Overlay (Header & Telemetry Bar)
    // -----------------------------------------------------------------------
    ctx.save();
    // Top HUD Bar Background
    ctx.fillStyle = "rgba(15, 23, 42, 0.85)";
    ctx.fillRect(0, 0, w, 36);
    ctx.strokeStyle = "rgba(56, 189, 248, 0.3)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, 36);
    ctx.lineTo(w, 36);
    ctx.stroke();

    // Top HUD Text
    ctx.font = "bold 12px monospace";
    // Pulsing REC status
    const isBlink = Math.floor(time / 500) % 2 === 0;
    ctx.fillStyle = isBlink ? "#22c55e" : "#16a34a";
    ctx.beginPath();
    ctx.arc(16, 18, 5, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#4ade80";
    ctx.fillText("LIVE_INFERENCE", 28, 22);

    ctx.fillStyle = "#94a3b8";
    ctx.fillText("|", 145, 22);

    ctx.fillStyle = "#ffffff";
    ctx.fillText(`CAM: ${camera.camera_name.toUpperCase()} (${camera.district.toUpperCase()})`, 160, 22);

    // Right Side Telemetry
    const rightStr = `MODEL: YOLOv8x-TensorRT | RES: 1080P@60Hz | DETECTED: ${currentCounts.total}`;
    ctx.fillStyle = "#38bdf8";
    ctx.fillText(rightStr, w - ctx.measureText(rightStr).width - 16, 22);

    // Bottom Watermark Timestamp
    const dateStr = new Date().toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
    ctx.fillStyle = "rgba(15, 23, 42, 0.8)";
    ctx.fillRect(10, h - 28, 340, 22);
    ctx.fillStyle = "#cbd5e1";
    ctx.font = "bold 11px monospace";
    ctx.fillText(`GETRA-AI • 2026-09-20 ${dateStr} WIB • CONF >= ${confidenceThreshold}%`, 16, h - 13);
    ctx.restore();

    // Report stats back to parent
    if (onStatsUpdate && currentCounts.total > 0) {
      const avgSpeed = currentCounts.total > 0 ? Math.round(currentCounts.speedSum / currentCounts.total) : 34;
      onStatsUpdate({
        cars: currentCounts.cars,
        motorcycles: currentCounts.motorcycles,
        buses: currentCounts.buses,
        pedestrians: currentCounts.pedestrians,
        trucks: currentCounts.trucks,
        bicycles: currentCounts.bicycles,
        total: currentCounts.total,
        avgSpeed,
      });
    }

    // Schedule next frame
    frameIdRef.current = requestAnimationFrame(renderLoop);
  }, [
    camera,
    confidenceThreshold,
    showBoundingBoxes,
    showLabels,
    showHeatmap,
    showTrajectories,
    isPaused,
    onStatsUpdate,
  ]);

  useEffect(() => {
    frameIdRef.current = requestAnimationFrame(renderLoop);
    return () => {
      if (frameIdRef.current) cancelAnimationFrame(frameIdRef.current);
    };
  }, [renderLoop]);

  return (
    <div className="relative w-full h-full min-h-[380px] sm:min-h-[460px] xl:min-h-[520px] bg-slate-950 flex items-center justify-center overflow-hidden">
      <canvas
        ref={canvasRef}
        width={1280}
        height={520}
        className="w-full h-full object-cover select-none"
      />
    </div>
  );
}
