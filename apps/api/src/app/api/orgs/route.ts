import { requireBearerToken } from "@/lib/auth";
import { supabaseWithAuth } from "@/lib/supabase";
import { fail, ok } from "@/lib/responses";

export async function GET(request: Request) {
  const tokenOrResponse = requireBearerToken(request.headers);
  if (tokenOrResponse instanceof Response) return tokenOrResponse;

  const supabase = supabaseWithAuth(tokenOrResponse);
  const { data: orgs, error } = await supabase
    .from("crm.org_members")
    .select("role, organizations:org_id ( id, name, created_at )");

  if (error) {
    return fail("ORG_LOOKUP_FAILED", "Unable to load orgs", 500);
  }

  return ok({ orgs: orgs ?? [] });
}
