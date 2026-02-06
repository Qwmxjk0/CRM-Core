import { z } from "zod";
import {
  contactCreateSchema,
  contactStatusSchema,
  paginationSchema,
} from "@crm/shared";
import { requireBearerToken } from "@/lib/auth";
import { supabaseWithAuth } from "@/lib/supabase";
import { fail, ok } from "@/lib/responses";

const orgIdSchema = z.string().uuid();

export async function GET(
  request: Request,
  { params }: { params: { orgId: string } }
) {
  const tokenOrResponse = requireBearerToken(request.headers);
  if (tokenOrResponse instanceof Response) return tokenOrResponse;
  const { orgId } = params;

  const orgIdParsed = orgIdSchema.safeParse(orgId);
  if (!orgIdParsed.success) {
    return fail("INVALID_ORG", "Invalid org id", 400);
  }

  const url = new URL(request.url);
  const q = url.searchParams.get("q");
  const status = url.searchParams.get("status");
  const tag = url.searchParams.get("tag");

  const pagination = paginationSchema.safeParse({
    limit: url.searchParams.get("limit"),
    cursor: url.searchParams.get("cursor"),
  });
  if (!pagination.success) {
    return fail("INVALID_PAGINATION", "Invalid pagination params", 400);
  }

  const statusParsed = status ? contactStatusSchema.safeParse(status) : null;
  if (status && statusParsed && !statusParsed.success) {
    return fail("INVALID_STATUS", "Invalid contact status", 400);
  }

  const supabase = supabaseWithAuth(tokenOrResponse);
  let query = supabase
    .from("crm.contacts")
    .select("*")
    .eq("org_id", orgId)
    .is("deleted_at", null)
    .order("created_at", { ascending: false })
    .limit(pagination.data.limit ?? 50);

  if (q) {
    query = query.ilike("display_name", `%${q}%`);
  }
  if (statusParsed?.success) {
    query = query.eq("status", statusParsed.data);
  }
  if (tag) {
    query = query.contains("tags", [tag]);
  }
  if (pagination.data.cursor) {
    query = query.lt("created_at", pagination.data.cursor);
  }

  const { data, error } = await query;
  if (error) {
    return fail("CONTACTS_LOOKUP_FAILED", "Unable to load contacts", 500);
  }

  return ok({ contacts: data ?? [] });
}

export async function POST(
  request: Request,
  { params }: { params: { orgId: string } }
) {
  const tokenOrResponse = requireBearerToken(request.headers);
  if (tokenOrResponse instanceof Response) return tokenOrResponse;
  const { orgId } = params;

  const orgIdParsed = orgIdSchema.safeParse(orgId);
  if (!orgIdParsed.success) {
    return fail("INVALID_ORG", "Invalid org id", 400);
  }

  const body = await request.json().catch(() => null);
  const parsed = contactCreateSchema.safeParse(body);
  if (!parsed.success) {
    return fail("INVALID_INPUT", "Invalid contact payload", 400, parsed.error);
  }

  const supabase = supabaseWithAuth(tokenOrResponse);
  const { data, error } = await supabase
    .from("crm.contacts")
    .insert({
      org_id: orgId,
      display_name: parsed.data.display_name,
      phone: parsed.data.phone ?? null,
      email: parsed.data.email ?? null,
      tags: parsed.data.tags ?? null,
      status: parsed.data.status ?? "lead",
      external_ref: parsed.data.external_ref ?? null,
    })
    .select("*")
    .single();

  if (error) {
    return fail("CONTACT_CREATE_FAILED", "Unable to create contact", 500);
  }

  return ok({ contact: data }, 201);
}
