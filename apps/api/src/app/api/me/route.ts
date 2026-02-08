import { requireBearerToken } from "@/lib/auth";
import { withCors, handleCorsPreflight } from "@/lib/cors";
import { supabaseWithAuth } from "@/lib/supabase";
import { fail, ok } from "@/lib/responses";

export async function GET(request: Request) {
  const tokenOrResponse = requireBearerToken(request.headers);
  if (tokenOrResponse instanceof Response) return withCors(request, tokenOrResponse);

  const supabase = supabaseWithAuth(tokenOrResponse);
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user) {
    return withCors(request, fail("UNAUTHORIZED", "Invalid token", 401));
  }

  const { data: orgs, error: orgError } = await supabase
    .from("crm.org_members")
    .select("role, organizations:org_id ( id, name, created_at )")
    .eq("user_id", userData.user.id);

  if (orgError) {
    return withCors(request, fail("ORG_LOOKUP_FAILED", "Unable to load orgs", 500));
  }

  return withCors(
    request,
    ok({
      user: {
        id: userData.user.id,
        email: userData.user.email,
      },
      orgs: orgs ?? [],
    })
  );
}

export async function OPTIONS(request: Request) {
  return handleCorsPreflight(request);
}
