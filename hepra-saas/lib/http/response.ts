import { NextResponse } from "next/server";

export type ApiError = {
  code: string;
  message: string;
  details?: Record<string, unknown>;
};

export function apiSuccess<T>(data: T, status = 200, headers?: HeadersInit) {
  return NextResponse.json({ success: true, data }, { status, headers });
}

export function apiError(
  code: string,
  message: string,
  status = 400,
  details?: Record<string, unknown>,
) {
  return NextResponse.json(
    { success: false, error: { code, message, ...(details ? { details } : {}) } },
    { status },
  );
}

export function apiMethodNotAllowed(allowed: string[]) {
  return new NextResponse(null, {
    status: 405,
    headers: { Allow: allowed.join(", ") },
  });
}
