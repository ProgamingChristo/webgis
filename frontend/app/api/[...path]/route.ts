import { NextRequest, NextResponse } from "next/server";

const HOP_BY_HOP = ["connection", "keep-alive", "proxy-authenticate", "proxy-authorization", "te", "trailer", "transfer-encoding", "upgrade"];

function backendOrigin(): string | null {
  try {
    const url = new URL(process.env.GETRA_BACKEND_INTERNAL_URL ?? "");
    if (!["http:", "https:"].includes(url.protocol) || url.username || url.password || url.pathname !== "/" || url.search || url.hash) return null;
    return url.origin;
  } catch {
    return null;
  }
}

function forwardHeaders(source: Headers, excluded: string[]) {
  const headers = new Headers(source);
  const connectionHeaders = (source.get("connection") ?? "").split(",").map((header) => header.trim().toLowerCase()).filter(Boolean);
  for (const name of [...HOP_BY_HOP, ...connectionHeaders, ...excluded]) headers.delete(name);
  return headers;
}

function isSameOriginRequest(req: NextRequest): boolean {
  const origin = req.headers.get("origin");
  if (!origin) return true;

  try {
    return new URL(origin).origin === req.nextUrl.origin;
  } catch {
    return false;
  }
}

async function proxy(req: NextRequest, params: Promise<{ path: string[] }>) {
  if (!isSameOriginRequest(req)) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "PROXY_ORIGIN_DENIED",
          message: "Origin frontend tidak diizinkan.",
        },
      },
      { status: 403 },
    );
  }

  const backend = backendOrigin();
  if (!backend) {
    return NextResponse.json({ success: false, error: { code: "BACKEND_PROXY_UNCONFIGURED", message: "Proxy backend belum dikonfigurasi." } }, { status: 503 });
  }
  const { path } = await params;
  if (!path.length || path.some((segment) => !segment || segment === "." || segment === ".." || /[\\/]/.test(segment))) {
    return NextResponse.json({ success: false, error: { code: "INVALID_API_PATH", message: "Path API tidak valid." } }, { status: 400 });
  }
  const search = req.nextUrl.search;
  const targetUrl = `${backend}/api/${path.map(encodeURIComponent).join("/")}${search}`;
  // This is a same-origin BFF hop. The bearer token is forwarded, while browser-only
  // origin/cookie metadata never changes the backend's explicit public CORS policy.
  const headers = forwardHeaders(req.headers, [
    "host",
    "content-length",
    "origin",
    "referer",
    "cookie",
  ]);

  const init: RequestInit = {
    method: req.method,
    headers,
    redirect: "manual",
    cache: "no-store",
    signal: req.signal,
  };

  if (!["GET", "HEAD"].includes(req.method)) {
    init.body = await req.arrayBuffer();
  }

  try {
    const res = await fetch(targetUrl, init);
    // fetch decompresses responses, so upstream encoding/length are no longer valid.
    const responseHeaders = forwardHeaders(res.headers, ["content-encoding", "content-length"]);

    return new NextResponse(res.body, {
      status: res.status,
      headers: responseHeaders,
    });
  } catch {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "BACKEND_UNREACHABLE",
          message: "Layanan GETRA belum dapat dihubungi. Coba lagi.",
        },
      },
      { status: 502 },
    );
  }
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  return proxy(req, params);
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  return proxy(req, params);
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  return proxy(req, params);
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  return proxy(req, params);
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  return proxy(req, params);
}

export async function HEAD(req: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  return proxy(req, params);
}

export async function OPTIONS(req: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  return proxy(req, params);
}
