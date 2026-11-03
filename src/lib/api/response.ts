import { NextResponse } from "next/server";
import { ZodError } from "zod";
import type { ApiResponse } from "@/lib/shared/types";

export function jsonOk<T>(
  data: T,
  meta?: Record<string, unknown>,
  status = 200,
): NextResponse<ApiResponse<T>> {
  return NextResponse.json(
    {
      success: true,
      data,
      meta,
    },
    { status },
  );
}

export function jsonError(
  code: string,
  message: string,
  status = 400,
  details?: unknown,
): NextResponse<ApiResponse<never>> {
  return NextResponse.json(
    {
      success: false,
      error: {
        code,
        message,
        details,
      },
    },
    { status },
  );
}

export function jsonZodError(error: ZodError): NextResponse<ApiResponse<never>> {
  const issues = error.issues.map((i) => ({
    path: i.path.join("."),
    message: i.message,
  }));
  return jsonError(
    "VALIDATION_ERROR",
    error.issues[0]?.message ?? "Input validation failed",
    422,
    issues,
  );
}
