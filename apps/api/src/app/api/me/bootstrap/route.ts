import { requireBearerToken } from "@/lib/auth";
import { getSupabaseAdmin, supabaseWithAuth } from "@/lib/supabase";
import { fail, ok } from "@/lib/responses";

export async function POST(request: Request) {
  const tokenOrResponse = requireBearerToken(request.headers);
  if (tokenOrResponse instanceof Response) return tokenOrResponse;

  const supabase = supabaseWithAuth(tokenOrResponse);
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user) {
    return fail("UNAUTHORIZED", "Invalid token", 401);
  }

  const admin = getSupabaseAdmin();
  const { data: membership, error: membershipError } = await admin
    .from("crm.org_members")
    .select("org_id, role")
    .eq("user_id", userData.user.id)
    .limit(1)
    .maybeSingle();

  if (membershipError) {
    return fail("BOOTSTRAP_FAILED", "Unable to read membership", 500);
  }

  if (membership) {
    return ok({ org_id: membership.org_id, role: membership.role });
  }

  const { data: org, error: orgError } = await admin
    .from("crm.organizations")
    .insert({ name: "My Workspace" })
    .select("id")
    .single();

  if (orgError || !org) {
    return fail("BOOTSTRAP_FAILED", "Unable to create org", 500);
  }

  const { data: member, error: memberError } = await admin
    .from("crm.org_members")
    .insert({
      org_id: org.id,
      user_id: userData.user.id,
      role: "owner",
    })
    .select("org_id, role")
    .single();

  if (memberError || !member) {
    return fail("BOOTSTRAP_FAILED", "Unable to create membership", 500);
  }

  return ok({ org_id: member.org_id, role: member.role });
}
