import { z } from "zod";
import { interactionCreateSchema } from "@shared/schemas";
import { requireBearerToken } from "@/lib/auth";
import { supabaseWithAuth } from "@/lib/supabase";
import { fail, ok } from "@/lib/responses";

const idSchema = z.string().uuid();

export async function POST(
  request: Request,
  { params }: { params: { orgId: string; contactId: string } }
) {
  const tokenOrResponse = requireBearerToken(request.headers);
  if (tokenOrResponse instanceof Response) return tokenOrResponse;
  const { orgId, contactId } = params;

  if (!idSchema.safeParse(orgId).success || !idSchema.safeParse(contactId).success) {
    return fail("INVALID_ID", "Invalid org or contact id", 400);
  }

  const body = await request.json().catch(() => null);
  const parsed = interactionCreateSchema.safeParse(body);
  if (!parsed.success) {
    return fail("INVALID_INPUT", "Invalid interaction payload", 400, parsed.error);
  }

  const supabase = supabaseWithAuth(tokenOrResponse);
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user) {
    return fail("UNAUTHORIZED", "Invalid token", 401);
  }

  const { data, error } = await supabase
    .from("crm.interactions")
    .insert({
      org_id: orgId,
      contact_id: contactId,
      type: parsed.data.type,
      payload: parsed.data.payload ?? null,
      occurred_at: parsed.data.occurred_at ?? null,
      created_by: userData.user.id,
    })
    .select("*")
    .single();

  if (error) {
    return fail("INTERACTION_CREATE_FAILED", "Unable to create interaction", 500);
  }

  return ok({ interaction: data }, 201);
}
