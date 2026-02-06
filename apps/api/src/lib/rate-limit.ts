import crypto from "crypto";
import { supabaseAdmin } from "./supabase";

type RateLimitConfig = {
  key: string;
  limit: number;
  windowSeconds: number;
};

type RateLimitResult = {
  allowed: boolean;
  remaining: number;
  retryAfterSeconds: number | null;
};

export const hashEmail = (email: string): string =>
  crypto.createHash("sha256").update(email.trim().toLowerCase()).digest("hex");

export const getClientIp = (headers: Headers): string => {
  const forwarded = headers.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0]?.trim() ?? "unknown";
  }
  return headers.get("x-real-ip") ?? "unknown";
};

export const checkRateLimit = async (
  config: RateLimitConfig
): Promise<RateLimitResult> => {
  const now = new Date();
  const { data, error } = await supabaseAdmin
    .from("ops.rate_limits")
    .select("*")
    .eq("key", config.key)
    .maybeSingle();

  if (error) {
    return { allowed: true, remaining: config.limit, retryAfterSeconds: null };
  }

  if (!data) {
    await supabaseAdmin.from("ops.rate_limits").insert({
      key: config.key,
      count: 1,
      window_start: now.toISOString(),
      window_seconds: config.windowSeconds,
      updated_at: now.toISOString(),
    });
    return {
      allowed: true,
      remaining: config.limit - 1,
      retryAfterSeconds: null,
    };
  }

  const windowStart = new Date(data.window_start);
  const elapsedSeconds = Math.floor((now.getTime() - windowStart.getTime()) / 1000);

  if (elapsedSeconds >= data.window_seconds) {
    await supabaseAdmin
      .from("ops.rate_limits")
      .update({
        count: 1,
        window_start: now.toISOString(),
        window_seconds: config.windowSeconds,
        updated_at: now.toISOString(),
      })
      .eq("key", config.key);

    return {
      allowed: true,
      remaining: config.limit - 1,
      retryAfterSeconds: null,
    };
  }

  if (data.count >= config.limit) {
    return {
      allowed: false,
      remaining: 0,
      retryAfterSeconds: Math.max(config.windowSeconds - elapsedSeconds, 0),
    };
  }

  await supabaseAdmin
    .from("ops.rate_limits")
    .update({ count: data.count + 1, updated_at: now.toISOString() })
    .eq("key", config.key);

  return {
    allowed: true,
    remaining: Math.max(config.limit - (data.count + 1), 0),
    retryAfterSeconds: null,
  };
};
