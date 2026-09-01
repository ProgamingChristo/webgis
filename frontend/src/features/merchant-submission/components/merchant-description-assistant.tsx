"use client";

import {
  useEffect,
  useId,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
} from "react";
import { LoaderCircle, Sparkles } from "lucide-react";

import {
  AiService,
  type MerchantDescriptionMode,
} from "@/src/services/ai.service";

const DESCRIPTION_PLACEHOLDER =
  "Contoh: Warung kopi lokal yang menyediakan kopi susu, teh, dan camilan dengan harga terjangkau. Cocok untuk mahasiswa, pekerja, dan pengunjung sekitar.";

const PRICE_RANGE_LABELS = {
  BUDGET: "Terjangkau",
  STANDARD: "Menengah",
  PREMIUM: "Premium",
} as const;

export const MERCHANT_DESCRIPTION_ACTIONS: ReadonlyArray<{
  label: string;
  mode: Exclude<MerchantDescriptionMode, "generate">;
}> = [
  { mode: "improve", label: "Perbaiki tulisan" },
  { mode: "engaging", label: "Buat lebih menarik" },
  { mode: "shorten", label: "Buat lebih singkat" },
  { mode: "proofread", label: "Rapikan bahasa" },
];

export function getMerchantDescriptionAssistantLabel(value: string): string {
  return value.trim() ? "Perbaiki dengan AI" : "Bantu tulis dengan AI";
}

interface MerchantDescriptionAssistantProps {
  businessName: string;
  category: string;
  disabled?: boolean;
  id: string;
  onChange(value: string): void;
  priceRange: keyof typeof PRICE_RANGE_LABELS | null;
  value: string;
}

export function MerchantDescriptionAssistant({
  businessName,
  category,
  disabled = false,
  id,
  onChange,
  priceRange,
  value,
}: MerchantDescriptionAssistantProps) {
  const popoverId = useId();
  const containerRef = useRef<HTMLDivElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const valueRef = useRef(value);
  const loadingRef = useRef(false);
  const abortRef = useRef<AbortController | null>(null);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [products, setProducts] = useState("");
  const [supplementaryPrice, setSupplementaryPrice] = useState("");
  const [advantages, setAdvantages] = useState("");

  const hasDescription = Boolean(value.trim());
  const triggerLabel = getMerchantDescriptionAssistantLabel(value);

  useEffect(() => {
    valueRef.current = value;
  }, [value]);

  useEffect(() => () => abortRef.current?.abort(), []);

  useEffect(() => {
    if (!open) return;

    const focusTimer = window.setTimeout(() => {
      popoverRef.current
        ?.querySelector<HTMLElement>("input:not([disabled]), button:not([disabled])")
        ?.focus();
    }, 0);

    const handlePointerDown = (event: PointerEvent) => {
      if (!loadingRef.current && !containerRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    const handleKeyDown = (event: globalThis.KeyboardEvent) => {
      if (event.key === "Escape" && !loadingRef.current) {
        setOpen(false);
        triggerRef.current?.focus();
      }
    };

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      window.clearTimeout(focusTimer);
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  const runAssistant = async (mode: MerchantDescriptionMode) => {
    if (loadingRef.current) return;
    if (mode === "generate" && products.trim().length < 2) {
      setError("Isi produk atau layanan unggulan terlebih dahulu.");
      return;
    }

    const originalDescription = valueRef.current;
    const controller = new AbortController();
    abortRef.current = controller;
    loadingRef.current = true;
    setLoading(true);
    setError(null);

    try {
      const result = await AiService.assistMerchantDescription(
        {
          mode,
          businessName: businessName.trim() || undefined,
          category: category.trim() || undefined,
          products: products.trim() || undefined,
          priceRange:
            (priceRange ? PRICE_RANGE_LABELS[priceRange] : supplementaryPrice.trim()) ||
            undefined,
          advantages: advantages.trim() || undefined,
          description: originalDescription,
        },
        { signal: controller.signal },
      );

      if (valueRef.current !== originalDescription) {
        setError("Deskripsi berubah saat AI memproses. Coba lagi agar tulisan Anda tidak tertimpa.");
        return;
      }

      onChange(result.description);
      setOpen(false);
    } catch (requestError) {
      if (requestError instanceof DOMException && requestError.name === "AbortError") return;
      setError("Gagal membuat deskripsi. Coba lagi.");
    } finally {
      if (abortRef.current === controller) abortRef.current = null;
      loadingRef.current = false;
      setLoading(false);
    }
  };

  const handleTriggerKeyDown = (event: ReactKeyboardEvent<HTMLButtonElement>) => {
    if (event.key === "ArrowDown" && !open) {
      event.preventDefault();
      setOpen(true);
    }
  };

  return (
    <div className="relative min-w-0" ref={containerRef}>
      <textarea
        aria-label="Deskripsi Usaha & Produk/Layanan Unggulan"
        className="w-full resize-y rounded-xl border border-slate-800 bg-slate-950 px-3.5 pb-12 pt-2.5 pr-14 text-sm leading-6 text-white outline-none transition-all placeholder-slate-500 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
        disabled={disabled}
        id={id}
        maxLength={1_500}
        onChange={(event) => onChange(event.target.value)}
        placeholder={DESCRIPTION_PLACEHOLDER}
        rows={4}
        value={value}
      />

      <button
        aria-controls={popoverId}
        aria-expanded={open}
        aria-haspopup={hasDescription ? "menu" : "dialog"}
        aria-label={triggerLabel}
        className="absolute bottom-3 right-6 inline-flex h-8 w-8 items-center justify-center rounded-lg border border-cyan-500/35 bg-slate-900 text-cyan-300 shadow-sm transition-colors hover:border-cyan-400/70 hover:bg-cyan-950/40 hover:text-cyan-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 disabled:cursor-not-allowed disabled:opacity-50"
        disabled={disabled || loading}
        onClick={() => {
          setError(null);
          setOpen((current) => !current);
        }}
        onKeyDown={handleTriggerKeyDown}
        ref={triggerRef}
        title={triggerLabel}
        type="button"
      >
        {loading ? (
          <LoaderCircle aria-hidden="true" className="animate-spin" size={16} />
        ) : (
          <Sparkles aria-hidden="true" size={16} />
        )}
      </button>

      {open ? (
        <div
          aria-label={hasDescription ? "Pilihan perbaikan deskripsi" : "Bantu tulis deskripsi"}
          className="absolute right-0 top-full z-50 mt-2 w-[min(22rem,calc(100vw-2rem))] max-w-[calc(100vw-2rem)] rounded-2xl border border-slate-700 bg-slate-900 p-4 shadow-2xl shadow-slate-950/70"
          id={popoverId}
          ref={popoverRef}
          role={hasDescription ? "menu" : "dialog"}
        >
          {hasDescription ? (
            <div className="space-y-1">
              <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.16em] text-cyan-300">
                Perbaiki dengan AI
              </p>
              {MERCHANT_DESCRIPTION_ACTIONS.map((action) => (
                <button
                  className="flex min-h-10 w-full items-center rounded-lg px-3 text-left text-sm text-slate-200 transition-colors hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 disabled:opacity-50"
                  disabled={loading}
                  key={action.mode}
                  onClick={() => void runAssistant(action.mode)}
                  role="menuitem"
                  type="button"
                >
                  {action.label}
                </button>
              ))}
            </div>
          ) : (
            <div className="space-y-3">
              <div>
                <p className="text-sm font-semibold text-white">Bantu tulis deskripsi</p>
                <p className="mt-1 text-[11px] leading-4 text-slate-400">
                  Nama usaha dan kategori digunakan otomatis. AI hanya memakai informasi yang Anda berikan.
                </p>
              </div>

              <label className="block text-xs font-semibold text-slate-200">
                Produk/menu unggulan <span className="text-rose-400">*</span>
                <input
                  className="mt-1.5 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white outline-none placeholder-slate-600 focus:border-cyan-500"
                  disabled={loading}
                  maxLength={500}
                  onChange={(event) => setProducts(event.target.value)}
                  placeholder="Contoh: kopi susu, roti bakar"
                  value={products}
                />
              </label>

              {!priceRange ? (
                <label className="block text-xs font-semibold text-slate-200">
                  Kisaran harga <span className="font-normal text-slate-500">(opsional)</span>
                  <input
                    className="mt-1.5 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white outline-none placeholder-slate-600 focus:border-cyan-500"
                    disabled={loading}
                    maxLength={100}
                    onChange={(event) => setSupplementaryPrice(event.target.value)}
                    placeholder="Contoh: Rp10.000 - Rp25.000"
                    value={supplementaryPrice}
                  />
                </label>
              ) : null}

              <label className="block text-xs font-semibold text-slate-200">
                Keunggulan usaha <span className="font-normal text-slate-500">(opsional)</span>
                <input
                  className="mt-1.5 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white outline-none placeholder-slate-600 focus:border-cyan-500"
                  disabled={loading}
                  maxLength={500}
                  onChange={(event) => setAdvantages(event.target.value)}
                  placeholder="Contoh: dekat kampus, harga terjangkau"
                  value={advantages}
                />
              </label>

              <button
                className="inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 text-xs font-semibold text-white transition-colors hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-50"
                disabled={loading}
                onClick={() => void runAssistant("generate")}
                type="button"
              >
                {loading ? <LoaderCircle aria-hidden="true" className="animate-spin" size={15} /> : null}
                {loading ? "Menyusun..." : "Buat Deskripsi"}
              </button>
            </div>
          )}

          {error ? (
            <p aria-live="polite" className="mt-3 text-xs leading-5 text-rose-300" role="status">
              {error}
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
