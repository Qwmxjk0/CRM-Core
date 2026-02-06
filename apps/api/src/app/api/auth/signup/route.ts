import { signupSchema } from "@crm/shared";
import { getSupabaseAnon } from "@/lib/supabase";
import { checkRateLimit, getClientIp, hashEmail } from "@/lib/rate-limit";
import { fail, ok } from "@/lib/responses";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = signupSchema.safeParse(body);
  if (!parsed.success) {
    return fail("INVALID_INPUT", "Invalid signup payload", 400, parsed.error);
  }

  const ip = getClientIp(request.headers);
  const emailHash = hashEmail(parsed.data.email);

  const ipLimit = await checkRateLimit({
    key: `signup:ip:${ip}`,
    limit: 5,
    windowSeconds: 10 * 60,
  });
  if (!ipLimit.allowed) {
    return fail("RATE_LIMITED", "Too many requests", 429, ipLimit);
  }

  const emailLimit = await checkRateLimit({
    key: `signup:email:${emailHash}`,
    limit: 3,
    windowSeconds: 60 * 60,
  });
  if (!emailLimit.allowed) {
    return fail("RATE_LIMITED", "Too many requests", 429, emailLimit);
  }

  const { error } = await getSupabaseAnon().auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
  });

  if (error) {
    return ok({ success: true });
  }

  return ok({ success: true }, 201);
}
