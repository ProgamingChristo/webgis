import { NextRequest, NextResponse } from "next/server";

const BACKEND_URL = process.env.GETRA_BACKEND_INTERNAL_URL || "http://127.0.0.1:3002";
const FORWARDED_ORIGIN = process.env.GETRA_LOCAL_FORWARDED_ORIGIN || "http://localhost:3003";

async function proxy(req: NextRequest, params: Promise<{ path: string[] }>) {
  const { path } = await params;
  const search = req.nextUrl.search;
  const targetUrl = `${BACKEND_URL}/api/${path.join("/")}${search}`;
  const headers = new Headers();
  req.headers.forEach((value, key) => {
    // Exclude hop-by-hop headers
    if (!["host", "connection", "content-length"].includes(key.toLowerCase())) {
      headers.set(key, value);
    }
  });
  headers.set("host", new URL(BACKEND_URL).host);
  headers.set("origin", FORWARDED_ORIGIN);

  const init: RequestInit = {
    method: req.method,
    headers,
    redirect: "manual",
  };

  if (!["GET", "HEAD"].includes(req.method)) {
    init.body = await req.arrayBuffer();
  }

  try {
    const res = await fetch(targetUrl, init);
    const responseHeaders = new Headers();
    res.headers.forEach((value, key) => {
      if (!["content-encoding", "transfer-encoding"].includes(key.toLowerCase())) {
        responseHeaders.set(key, value);
      }
    });

    return new NextResponse(res.body, {
      status: res.status,
      headers: responseHeaders,
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "ROUTING_PROVIDER_UNREACHABLE",
          message: error instanceof Error ? error.message : "Backend unreachable",
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

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS",
      "Access-Control-Allow-Headers": "*",
    },
  });
}
