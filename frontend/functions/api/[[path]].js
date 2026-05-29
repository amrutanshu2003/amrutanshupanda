export async function onRequest(context) {
  const { request, params, env } = context;

  const origin = (env.BACKEND_ORIGIN || "").replace(/\/$/, "");
  if (!origin) {
    return new Response(JSON.stringify({ ok: false, error: "BACKEND_ORIGIN not configured" }), {
      status: 500,
      headers: { "content-type": "application/json" },
    });
  }

  const path = Array.isArray(params.path)
    ? params.path.join("/")
    : (params.path || "");

  const target = `${origin}/api/${path}${new URL(request.url).search}`;

  const init = {
    method: request.method,
    headers: request.headers,
    body: request.method === "GET" || request.method === "HEAD" ? undefined : request.body,
    redirect: "follow",
  };

  const upstream = await fetch(target, init);
  return new Response(upstream.body, {
    status: upstream.status,
    headers: upstream.headers,
  });
}
