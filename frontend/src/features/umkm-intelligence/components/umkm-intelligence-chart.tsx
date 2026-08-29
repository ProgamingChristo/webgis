"use client";

import { useEffect, useRef } from "react";
import type { EChartsOption, EChartsType } from "echarts";

export function UmkmIntelligenceChart({ option, label }: { option: EChartsOption; label: string }) {
  const element = useRef<HTMLDivElement | null>(null);
  const chart = useRef<EChartsType | null>(null);
  const latest = useRef(option);
  useEffect(() => { latest.current = option; chart.current?.setOption(option, true); }, [option]);
  useEffect(() => {
    let disposed = false;
    let observer: ResizeObserver | null = null;
    void import("echarts").then((echarts) => {
      if (disposed || !element.current) return;
      chart.current = echarts.init(element.current, undefined, { renderer: "canvas" });
      chart.current.setOption(latest.current, true);
      observer = new ResizeObserver(() => chart.current?.resize());
      observer.observe(element.current);
      chart.current.on("finished", () => element.current?.setAttribute("data-rendered", "true"));
    });
    return () => { disposed = true; observer?.disconnect(); chart.current?.dispose(); chart.current = null; };
  }, []);
  return <div ref={element} className="umkm-intelligence-chart" role="img" aria-label={label} />;
}
