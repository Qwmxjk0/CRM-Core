import { getEnv } from "@/lib/env";
import { isAllowedRedirectUrl } from "@/lib/cors";

const escapeHtml = (value: string): string =>
  value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");

const isProduction = process.env.NODE_ENV === "production";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const error = url.searchParams.get("error");
  const errorDescription = url.searchParams.get("error_description");
  const requestedNext = url.searchParams.get("next");

  const env = getEnv();
  const allowLocalhostRedirect = !isProduction;

  const targetFromNext =
    requestedNext &&
    isAllowedRedirectUrl(requestedNext, allowLocalhostRedirect)
      ? requestedNext
      : undefined;
  const targetFromEnv =
    env.authCallbackForwardUrl &&
    isAllowedRedirectUrl(env.authCallbackForwardUrl, allowLocalhostRedirect)
      ? env.authCallbackForwardUrl
      : undefined;
  const forwardTo = targetFromNext ?? targetFromEnv;

  const title = error ? "Email Confirmation Failed" : "Email Confirmed";
  const subtitle = error
    ? errorDescription ?? error
    : "Your email has been verified successfully.";
  const actionText = forwardTo ? "Continue" : "Close";
  const actionHref = forwardTo ?? "#";

  const html = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width,initial-scale=1" />
    <title>${escapeHtml(title)}</title>
    <style>
      :root { color-scheme: light dark; }
      body {
        margin: 0;
        min-height: 100vh;
        display: grid;
        place-items: center;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
        background: #111827;
        color: #f3f4f6;
      }
      .card {
        width: min(560px, calc(100vw - 32px));
        border: 1px solid #374151;
        border-radius: 12px;
        background: #1f2937;
        padding: 24px;
      }
      h1 { margin: 0 0 8px; font-size: 24px; }
      p { margin: 0 0 16px; line-height: 1.5; color: #d1d5db; word-break: break-word; }
      .button {
        display: inline-block;
        padding: 10px 16px;
        border-radius: 8px;
        text-decoration: none;
        background: #10b981;
        color: #052e16;
        font-weight: 600;
      }
      .hint { margin-top: 14px; font-size: 13px; color: #9ca3af; }
    </style>
  </head>
  <body>
    <main class="card">
      <h1>${escapeHtml(title)}</h1>
      <p>${escapeHtml(subtitle)}</p>
      <a class="button" id="continue-link" href="${escapeHtml(actionHref)}">${escapeHtml(
    actionText
  )}</a>
      <p class="hint">This page can safely close after confirmation.</p>
    </main>
    <script>
      (function () {
        var forwardTo = ${JSON.stringify(forwardTo ?? "")};
        if (!forwardTo) {
          var fallbackLink = document.getElementById("continue-link");
          if (fallbackLink) {
            fallbackLink.addEventListener("click", function (event) {
              event.preventDefault();
              window.close();
            });
          }
          return;
        }
        var hash = window.location.hash;
        var target = new URL(forwardTo);
        if (hash && hash.length > 1) {
          target.hash = hash.slice(1);
        }
        var link = document.getElementById("continue-link");
        if (link) link.setAttribute("href", target.toString());
        window.setTimeout(function () {
          window.location.assign(target.toString());
        }, 1200);
      })();
    </script>
  </body>
</html>`;

  return new Response(html, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}
