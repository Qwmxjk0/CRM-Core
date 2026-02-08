import { requireBearerToken } from "@/lib/auth";
import { getSupabaseAdmin, supabaseWithAuth } from "@/lib/supabase";
import { fail, ok } from "@/lib/responses";

export async function GET(request: Request) {
  const tokenOrResponse = requireBearerToken(request.headers);
  if (tokenOrResponse instanceof Response) return tokenOrResponse;

  const supabase = supabaseWithAuth(tokenOrResponse);
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user) {
    return fail("UNAUTHORIZED", "Invalid token", 401);
  }

  const admin = getSupabaseAdmin();
  const { data: memberships, error: membershipError } = await admin
    .from("crm.org_members")
    .select("org_id, role")
    .eq("user_id", userData.user.id);

  if (membershipError) {
    return fail("ORG_LOOKUP_FAILED", "Unable to load orgs", 500);
  }

  const orgIds = (memberships ?? []).map((membership) => membership.org_id);
  let orgMap = new Map<string, { id: string; name: string; created_at: string }>();
  if (orgIds.length > 0) {
    const { data: organizations, error: organizationsError } = await admin
      .from("crm.organizations")
      .select("id, name, created_at")
      .in("id", orgIds);
    if (organizationsError) {
      return fail("ORG_LOOKUP_FAILED", "Unable to load orgs", 500);
    }
    orgMap = new Map((organizations ?? []).map((org) => [org.id, org]));
  }

  return ok({
    orgs: (memberships ?? []).map((membership) => ({
      role: membership.role,
      organizations: orgMap.get(membership.org_id) ?? null,
    })),
  });
}
