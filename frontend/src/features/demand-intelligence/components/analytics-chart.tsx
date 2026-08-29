"use client";

import { useEffect, useRef } from "react";
import type { EChartsOption, EChartsType } from "echarts";

export function AnalyticsChart({
  option,
  label,
}: {
  option: EChartsOption;
  label: string;
}) {
  const elementRef = useRef<HTMLDivElement | null>(null);
  const chartRef = useRef<EChartsType | null>(null);
  const optionRef = useRef(option);

  useEffect(() => {
    optionRef.current = option;
    chartRef.current?.setOption(option, true);
  }, [option]);

  useEffect(() => {
    let disposed = false;
    let observer: ResizeObserver | null = null;
    const resize = () => chartRef.current?.resize();
    void import("echarts").then((echarts) => {
      if (disposed || !elementRef.current) return;
      const chart = echarts.init(elementRef.current, undefined, { renderer: "canvas" });
      chartRef.current = chart;
      chart.setOption(optionRef.current, true);
      window.addEventListener("resize", resize);
      observer = new ResizeObserver(resize);
      observer.observe(elementRef.current);
      chart.on("finished", () => elementRef.current?.setAttribute("data-rendered", "true"));
    });
    return () => {
      disposed = true;
      window.removeEventListener("resize", resize);
      observer?.disconnect();
      chartRef.current?.dispose();
      chartRef.current = null;
    };
  }, []);

  return <div ref={elementRef} className="analytics-chart" role="img" aria-label={label} />;
}
