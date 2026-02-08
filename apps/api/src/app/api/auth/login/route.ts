import { loginSchema } from "@crm/shared";
import { withCors, handleCorsPreflight } from "@/lib/cors";
import { getSupabaseAdmin, getSupabaseAnon } from "@/lib/supabase";
import { checkRateLimit, getClientIp, hashEmail } from "@/lib/rate-limit";
import { fail, ok } from "@/lib/responses";

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const recordFailedLogin = async (emailHash: string) => {
  const now = new Date();
  const key = `login:fail:${emailHash}`;
  const { data } = await getSupabaseAdmin()
    .from("ops.rate_limits")
    .select("*")
    .eq("key", key)
    .maybeSingle();

  if (!data) {
    await getSupabaseAdmin().from("ops.rate_limits").insert({
      key,
      count: 1,
      window_start: now.toISOString(),
      window_seconds: 10 * 60,
      updated_at: now.toISOString(),
    });
    return 1;
  }

  const windowStart = new Date(data.window_start);
  const elapsedSeconds = Math.floor((now.getTime() - windowStart.getTime()) / 1000);
  if (elapsedSeconds >= data.window_seconds) {
    await getSupabaseAdmin()
      .from("ops.rate_limits")
      .update({
        count: 1,
        window_start: now.toISOString(),
        window_seconds: 10 * 60,
        updated_at: now.toISOString(),
      })
      .eq("key", key);
    return 1;
  }

  await getSupabaseAdmin()
    .from("ops.rate_limits")
    .update({ count: data.count + 1, updated_at: now.toISOString() })
    .eq("key", key);
  return data.count + 1;
};

const clearFailedLogin = async (emailHash: string) => {
  await getSupabaseAdmin()
    .from("ops.rate_limits")
    .delete()
    .eq("key", `login:fail:${emailHash}`);
};

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = loginSchema.safeParse(body);
  if (!parsed.success) {
    return withCors(
      request,
      fail("INVALID_INPUT", "Invalid login payload", 400, parsed.error)
    );
  }

  const ip = getClientIp(request.headers);
  const emailHash = hashEmail(parsed.data.email);

  const ipLimit = await checkRateLimit({
    key: `login:ip:${ip}`,
    limit: 20,
    windowSeconds: 10 * 60,
  });
  if (!ipLimit.allowed) {
    return withCors(request, fail("RATE_LIMITED", "Too many requests", 429, ipLimit));
  }

  const emailLimit = await checkRateLimit({
    key: `login:email:${emailHash}`,
    limit: 10,
    windowSeconds: 10 * 60,
  });
  if (!emailLimit.allowed) {
    return withCors(
      request,
      fail("RATE_LIMITED", "Too many requests", 429, emailLimit)
    );
  }

  const { data, error } = await getSupabaseAnon().auth.signInWithPassword({
    email: parsed.data.email,
    password: parsed.data.password,
  });

  if (error || !data.session) {
    const failCount = await recordFailedLogin(emailHash);
    const delayMs = Math.min(failCount, 6) * 400;
    if (delayMs > 0) {
      await sleep(delayMs);
    }
    return withCors(request, fail("INVALID_CREDENTIALS", "Invalid credentials", 401));
  }

  await clearFailedLogin(emailHash);
  return withCors(request, ok({ access_token: data.session.access_token }));
}

export async function OPTIONS(request: Request) {
  return handleCorsPreflight(request);
}
