const required = (key) => {
  const value = process.env[key];
  if (!value) {
    throw new Error(`Missing env var: ${key}`);
  }
  return value;
};

const baseUrl = required("BASE_URL").replace(/\/$/, "");
const email = required("SMOKE_EMAIL");
const password = required("SMOKE_PASSWORD");

const request = async (path, options = {}) => {
  const res = await fetch(`${baseUrl}${path}`, {
    ...options,
    headers: {
      "content-type": "application/json",
      ...(options.headers || {}),
    },
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(
      `Request failed ${res.status} ${path}: ${JSON.stringify(json)}`
    );
  }
  return json;
};

const run = async () => {
  console.log("1) health");
  await request("/api/health");

  console.log("2) signup (idempotent)");
  await request("/api/auth/signup", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });

  console.log("3) login");
  const login = await request("/api/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
  const token = login?.data?.access_token;
  if (!token) {
    throw new Error("Missing access_token from login");
  }

  console.log("4) bootstrap");
  const bootstrap = await request("/api/me/bootstrap", {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
  });
  const orgId = bootstrap?.data?.org_id;
  if (!orgId) {
    throw new Error("Missing org_id from bootstrap");
  }

  console.log("5) create contact");
  const contact = await request(`/api/orgs/${orgId}/contacts`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify({
      display_name: "Smoke Test Contact",
      email: "smoke@example.com",
      status: "lead",
    }),
  });
  const contactId = contact?.data?.contact?.id;
  if (!contactId) {
    throw new Error("Missing contact id");
  }

  console.log("6) create interaction");
  await request(`/api/orgs/${orgId}/contacts/${contactId}/interactions`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify({
      type: "note",
      payload: { note: "smoke test" },
    }),
  });

  console.log("Smoke test OK");
};

run().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
