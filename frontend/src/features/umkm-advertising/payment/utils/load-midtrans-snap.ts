export interface SnapOptions {
  onSuccess?: (result: any) => void;
  onPending?: (result: any) => void;
  onError?: (result: any) => void;
  onClose?: () => void;
}

declare global {
  interface Window {
    snap?: {
      pay: (token: string, options?: SnapOptions) => void;
      embed?: (token: string, options: { embedId: string }) => void;
    };
  }
}

let snapScriptPromise: Promise<void> | null = null;

export function loadMidtransSnap(clientKey?: string): Promise<void> {
  if (typeof window === "undefined") {
    return Promise.resolve();
  }

  if (window.snap) {
    return Promise.resolve();
  }

  if (snapScriptPromise) {
    return snapScriptPromise;
  }

  snapScriptPromise = new Promise((resolve, reject) => {
    const scriptId = "midtrans-snap-sandbox-script";
    const existing = document.getElementById(scriptId);

    if (existing) {
      existing.addEventListener("load", () => resolve());
      existing.addEventListener("error", () =>
        reject(new Error("Gagal memuat script Midtrans Snap."))
      );
      return;
    }

    const script = document.createElement("script");
    script.id = scriptId;
    script.src = "https://app.sandbox.midtrans.com/snap/snap.js";
    const resolvedKey = clientKey || process.env.NEXT_PUBLIC_MIDTRANS_CLIENT_KEY || "";
    if (resolvedKey) {
      script.setAttribute("data-client-key", resolvedKey);
    }
    script.async = true;

    script.onload = () => resolve();
    script.onerror = () => {
      snapScriptPromise = null;
      reject(new Error("Gagal memuat script Midtrans Snap Sandbox."));
    };

    document.head.appendChild(script);
  });

  return snapScriptPromise;
}
