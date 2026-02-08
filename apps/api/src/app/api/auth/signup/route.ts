import { signupSchema } from "@crm/shared";
import { withCors, handleCorsPreflight, isAllowedOrigin } from "@/lib/cors";
import { getSupabaseAnon } from "@/lib/supabase";
import { checkRateLimit, getClientIp, hashEmail } from "@/lib/rate-limit";
import { fail, ok } from "@/lib/responses";
import { getEnv } from "@/lib/env";

const isExistingUserError = (error: { code?: string; message?: string }) => {
  const code = error.code?.toLowerCase() ?? "";
  const message = error.message?.toLowerCase() ?? "";

  return (
    code === "user_already_exists" ||
    code === "email_exists" ||
    message.includes("already registered") ||
    message.includes("already exists")
  );
};

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = signupSchema.safeParse(body);
  if (!parsed.success) {
    return withCors(
      request,
      fail("INVALID_INPUT", "Invalid signup payload", 400, parsed.error)
    );
  }

  const ip = getClientIp(request.headers);
  const emailHash = hashEmail(parsed.data.email);

  const ipLimit = await checkRateLimit({
    key: `signup:ip:${ip}`,
    limit: 5,
    windowSeconds: 10 * 60,
  });
  if (!ipLimit.allowed) {
    return withCors(request, fail("RATE_LIMITED", "Too many requests", 429, ipLimit));
  }

  const emailLimit = await checkRateLimit({
    key: `signup:email:${emailHash}`,
    limit: 3,
    windowSeconds: 60 * 60,
  });
  if (!emailLimit.allowed) {
    return withCors(
      request,
      fail("RATE_LIMITED", "Too many requests", 429, emailLimit)
    );
  }

  const env = getEnv();
  const requestOrigin = request.headers.get("origin");
  const emailRedirectTo =
    env.authEmailRedirectUrl ??
    (isAllowedOrigin(requestOrigin) ? requestOrigin : undefined);

  const { error } = await getSupabaseAnon().auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    ...(emailRedirectTo ? { options: { emailRedirectTo } } : {}),
  });

  if (error) {
    if (isExistingUserError(error)) {
      return withCors(request, ok({ success: true }));
    }

    return withCors(
      request,
      fail("SIGNUP_FAILED", "Unable to create user", 400, {
        code: error.code,
        message: error.message,
      })
    );
  }

  return withCors(request, ok({ success: true }, 201));
}

export async function OPTIONS(request: Request) {
  return handleCorsPreflight(request);
}
