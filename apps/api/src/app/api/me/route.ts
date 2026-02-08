import { requireBearerToken } from "@/lib/auth";
import { withCors, handleCorsPreflight } from "@/lib/cors";
import { getSupabaseAdmin, supabaseWithAuth } from "@/lib/supabase";
import { fail, ok } from "@/lib/responses";

export async function GET(request: Request) {
  const tokenOrResponse = requireBearerToken(request.headers);
  if (tokenOrResponse instanceof Response) return withCors(request, tokenOrResponse);

  const supabase = supabaseWithAuth(tokenOrResponse);
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user) {
    return withCors(request, fail("UNAUTHORIZED", "Invalid token", 401));
  }

  const admin = getSupabaseAdmin();
  const { data: memberships, error: membershipError } = await admin
    .from("crm.org_members")
    .select("org_id, role")
    .eq("user_id", userData.user.id);

  // Do not block authentication when org lookup fails.
  const safeMemberships = membershipError ? [] : (memberships ?? []);

  const orgIds = safeMemberships.map((membership) => membership.org_id);
  let orgMap = new Map<string, { id: string; name: string; created_at: string }>();
  if (orgIds.length > 0) {
    const { data: organizations, error: organizationsError } = await admin
      .from("crm.organizations")
      .select("id, name, created_at")
      .in("id", orgIds);
    if (!organizationsError) {
      orgMap = new Map((organizations ?? []).map((org) => [org.id, org]));
    }
  }

  return withCors(
    request,
    ok({
      user: {
        id: userData.user.id,
        email: userData.user.email,
      },
      orgs: safeMemberships.map((membership) => ({
        role: membership.role,
        organizations: orgMap.get(membership.org_id) ?? null,
      })),
    })
  );
}

export async function OPTIONS(request: Request) {
  return handleCorsPreflight(request);
}
