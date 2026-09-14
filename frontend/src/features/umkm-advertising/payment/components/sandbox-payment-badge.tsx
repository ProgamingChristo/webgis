import React from "react";
import { ShieldCheck } from "lucide-react";

export function SandboxPaymentBadge({
  size = "md",
}: {
  size?: "sm" | "md";
}) {
  const isSm = size === "sm";

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 font-medium text-amber-800 ${
        isSm ? "px-2 py-0.5 text-[10px]" : "px-3 py-1 text-xs"
      }`}
      title="Mode Uji Coba: Pembayaran disimulasikan menggunakan Midtrans Sandbox dan tidak menarik dana riil."
    >
      <ShieldCheck className={isSm ? "w-3 h-3 text-amber-400" : "w-3.5 h-3.5 text-amber-400"} />
      <span>MIDTRANS SANDBOX</span>
    </span>
  );
}
