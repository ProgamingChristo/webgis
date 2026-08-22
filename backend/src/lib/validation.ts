import { NextRequest } from "next/server";
import { z } from "zod";
import { ApplicationError } from "@/src/lib/errors";
import { readBoundedJsonBody } from "@/src/lib/request-body";
import { loadApiSecurityConfig } from "@/src/lib/api-security/config";

export async function validateBody<T>(
  req: NextRequest,
  schema: z.ZodType<T>,
  maximumBytes: number,
): Promise<T> {
  const globalMaximum = loadApiSecurityConfig().maxJsonBodyBytes;
  const body = await readBoundedJsonBody(
    req,
    Math.min(maximumBytes, globalMaximum),
  );
  const parseResult = schema.safeParse(body);
  
  if (!parseResult.success) {
    console.error("[ZOD ERROR]", parseResult.error.issues);
    const errorMsg = parseResult.error.issues[0]?.message || "Validation failed";
    throw new ApplicationError("VALIDATION_ERROR", errorMsg);
  }
  
  return parseResult.data;
}

export function validateQuery<T>(req: NextRequest | URL, schema: z.ZodType<T>): T {
  const url = req instanceof NextRequest ? req.nextUrl : req;
  const searchParams = Object.fromEntries(url.searchParams.entries());
  
  const parseResult = schema.safeParse(searchParams);
  
  if (!parseResult.success) {
    const errorMsg = parseResult.error.issues[0]?.message || "Validation failed";
    throw new ApplicationError("VALIDATION_ERROR", errorMsg);
  }
  
  return parseResult.data;
}

export function validateParams<T>(params: Record<string, string | string[]>, schema: z.ZodType<T>): T {
  const parseResult = schema.safeParse(params);
  
  if (!parseResult.success) {
    const errorMsg = parseResult.error.issues[0]?.message || "Validation failed";
    throw new ApplicationError("VALIDATION_ERROR", errorMsg);
  }
  
  return parseResult.data;
}
