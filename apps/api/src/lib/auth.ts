import { fail } from "./responses";

export const getBearerToken = (headers: Headers): string | null => {
  const authHeader = headers.get("authorization") ?? headers.get("Authorization");
  if (!authHeader) return null;
  const [scheme, token] = authHeader.split(" ");
  if (scheme?.toLowerCase() !== "bearer" || !token) return null;
  return token;
};

export const requireBearerToken = (headers: Headers): string | Response => {
  const token = getBearerToken(headers);
  if (!token) {
    return fail("UNAUTHORIZED", "Missing or invalid token", 401);
  }
  return token;
};
