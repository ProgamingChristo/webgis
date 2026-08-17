import { NextRequest } from "next/server";
import {
  getRequestSupabaseClient,
  getServerSupabaseClient,
} from "@/src/lib/supabase/server";
import { ApplicationError } from "@/src/lib/errors";
import type { UserRole } from "@/src/schemas/auth.schema";
import { ProfileRepository } from "@/src/repositories/profile.repository";
import { ProfileService } from "@/src/services/profile.service";

const MAX_BEARER_TOKEN_CHARACTERS = 8_192;

function getBearerToken(req: NextRequest): string {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader || authHeader.length > MAX_BEARER_TOKEN_CHARACTERS) {
    throw new ApplicationError("UNAUTHORIZED");
  }

  const match = /^Bearer ([^\s]+)$/i.exec(authHeader);
  if (!match?.[1]) {
    throw new ApplicationError("UNAUTHORIZED");
  }

  return match[1];
}

export async function requireAuthenticatedUser(req: NextRequest): Promise<string> {
  const token = getBearerToken(req);
  const supabase = getServerSupabaseClient();
  
  const { data: { user }, error } = await supabase.auth.getUser(token);
  
  if (error || !user) {
    throw new ApplicationError("UNAUTHORIZED", "Invalid token or user not found");
  }

  return user.id;
}

export async function getAuthenticatedUser(req: NextRequest): Promise<string | null> {
  try {
    return await requireAuthenticatedUser(req);
  } catch {
    return null;
  }
}

export async function requireAnyRole(req: NextRequest, allowedRoles: UserRole[]): Promise<{ userId: string; role: UserRole }> {
  const userId = await requireAuthenticatedUser(req);
  const authorization = req.headers.get("Authorization");

  if (!authorization) {
    throw new ApplicationError("UNAUTHORIZED");
  }

  const profileService = new ProfileService(
    new ProfileRepository(getRequestSupabaseClient(authorization)),
  );
  const profile = await profileService.getProfile(userId);
  const role = profile.role;
  
  if (!allowedRoles.includes(role)) {
    throw new ApplicationError("FORBIDDEN", `Access denied for role: ${role}. Requires one of: ${allowedRoles.join(", ")}`);
  }

  return { userId, role };
}

export async function requireRole(req: NextRequest, role: UserRole): Promise<{ userId: string; role: UserRole }> {
  return requireAnyRole(req, [role]);
}
