import { z } from "zod";
import { requireBearerToken } from "@/lib/auth";
import { supabaseWithAuth } from "@/lib/supabase";
import { fail, ok } from "@/lib/responses";

const idSchema = z.string().uuid();

export async function GET(
  request: Request,
  { params }: { params: Promise<{ orgId: string; contactId: string }> }
) {
  const tokenOrResponse = requireBearerToken(request.headers);
  if (tokenOrResponse instanceof Response) return tokenOrResponse;
  const { orgId, contactId } = await params;

  if (!idSchema.safeParse(orgId).success || !idSchema.safeParse(contactId).success) {
    return fail("INVALID_ID", "Invalid org or contact id", 400);
  }

  const supabase = supabaseWithAuth(tokenOrResponse);
  const { data, error } = await supabase
    .from("crm.contacts")
    .select("*")
    .eq("org_id", orgId)
    .eq("id", contactId)
    .is("deleted_at", null)
    .maybeSingle();

  if (error) {
    return fail("CONTACT_LOOKUP_FAILED", "Unable to load contact", 500);
  }

  if (!data) {
    return fail("NOT_FOUND", "Contact not found", 404);
  }

  return ok({ contact: data });
}
