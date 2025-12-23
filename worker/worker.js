export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // CORS (讓 GitHub Pages 可呼叫)
    const corsHeaders = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type,Accept",
    };
    if (request.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders });
    }

    try {
      if (url.pathname === "/count" && request.method === "GET") {
        const proposal = url.searchParams.get("proposal");
        if (!proposal) return json({ error: "missing proposal" }, 400, corsHeaders);

        const row = await env.DB.prepare(
          "SELECT count FROM petitions WHERE proposal = ?1"
        ).bind(proposal).first();

        const count = row?.count ?? 0;
        return json({ count }, 200, corsHeaders);
      }

      if (url.pathname === "/sign" && request.method === "POST") {
        const body = await request.json().catch(() => ({}));
        const proposal = body.proposal;
        if (!proposal) return json({ error: "missing proposal" }, 400, corsHeaders);

        // 確保存在
        await env.DB.prepare(
          "INSERT INTO petitions (proposal, count) VALUES (?1, 0) ON CONFLICT(proposal) DO NOTHING"
        ).bind(proposal).run();

        // 計數 +1（原子更新）
        await env.DB.prepare(
          "UPDATE petitions SET count = count + 1 WHERE proposal = ?1"
        ).bind(proposal).run();

        const row = await env.DB.prepare(
          "SELECT count FROM petitions WHERE proposal = ?1"
        ).bind(proposal).first();

        return json({ count: row?.count ?? 0 }, 200, corsHeaders);
      }

      return json({ error: "not found" }, 404, corsHeaders);
    } catch (e) {
      return json({ error: "server error" }, 500, corsHeaders);
    }
  },
};

function json(obj, status = 200, headers = {}) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8", ...headers },
  });
}
