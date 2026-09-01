// ============================================================
//  API helpers for Next.js route handlers
// ============================================================
import { NextResponse } from "next/server";
import { getSessionUser } from "./auth";
import { commit } from "./db";

export function json(data, status = 200) {
  return NextResponse.json(data, { status });
}

export function error(message, status = 400) {
  return NextResponse.json({ ok: false, error: message }, { status });
}

export async function currentUser(req) {
  return await getSessionUser(req);
}

export async function requireUser(req) {
  const user = await currentUser(req);
  if (!user) return { error: error("Not authenticated.", 401) };
  return { user };
}

export async function requireAdmin(req) {
  const user = await currentUser(req);
  if (!user) return { error: error("Not authenticated.", 401) };
  if (!user.isAdmin) return { error: error("Admin only.", 403) };
  return { user };
}

export function memberOf(room, userId) {
  return room && room.members.includes(userId);
}

export function ownerOf(room, userId) {
  return room && room.ownerId === userId;
}

export async function withCommit(fn) {
  const result = await fn();
  await commit();
  return result;
}
