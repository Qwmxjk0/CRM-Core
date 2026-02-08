import { NextResponse } from "next/server";

const DEFAULT_ALLOWED_ORIGINS = [
  "https://trueprofit.vercel.app",
  "http://localhost:3000",
];

const allowedOrigins = new Set(
  (process.env.CORS_ALLOWED_ORIGINS ?? "")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean)
    .concat(DEFAULT_ALLOWED_ORIGINS)
);

export const isAllowedOrigin = (origin: string | null): origin is string =>
  Boolean(origin && allowedOrigins.has(origin));

const isLocalhost = (hostname: string): boolean =>
  hostname === "localhost" || hostname === "127.0.0.1";

export const isAllowedRedirectUrl = (
  redirectTo: string,
  allowLocalhost: boolean
): boolean => {
  try {
    const url = new URL(redirectTo);
    const isHttp = url.protocol === "https:" || url.protocol === "http:";
    if (!isHttp) {
      return false;
    }
    if (!allowLocalhost && isLocalhost(url.hostname)) {
      return false;
    }
    return isAllowedOrigin(url.origin);
  } catch {
    return false;
  }
};

const buildCorsHeaders = (origin: string | null): Headers => {
  const headers = new Headers({
    Vary: "Origin",
    "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type,Authorization",
    "Access-Control-Max-Age": "86400",
  });

  if (isAllowedOrigin(origin)) {
    headers.set("Access-Control-Allow-Origin", origin);
  }

  return headers;
};

export const withCors = (request: Request, response: Response): Response => {
  const origin = request.headers.get("origin");
  const corsHeaders = buildCorsHeaders(origin);
  corsHeaders.forEach((value, key) => {
    response.headers.set(key, value);
  });
  return response;
};

export const handleCorsPreflight = (request: Request): Response =>
  new NextResponse(null, {
    status: 204,
    headers: buildCorsHeaders(request.headers.get("origin")),
  });
