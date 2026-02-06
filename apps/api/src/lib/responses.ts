import { NextResponse } from "next/server";
import type { ApiEnvelope } from "@shared/types";

export const ok = <T>(data: T, status = 200) =>
  NextResponse.json({ data } satisfies ApiEnvelope<T>, { status });

export const fail = (
  code: string,
  message: string,
  status = 400,
  details?: unknown
) =>
  NextResponse.json(
    { error: { code, message, details } } satisfies ApiEnvelope<never>,
    { status }
  );
