const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SECRET_KEY;

async function query(method, table, body = null, filter = null) {
  let url = `${SUPABASE_URL}/rest/v1/${table}`;
  if (filter) url += `?${filter}`;
  const res = await fetch(url, {
    method,
    headers: {
      "Content-Type": "application/json",
      "apikey": SUPABASE_KEY,
      "Authorization": `Bearer ${SUPABASE_KEY}`,
      "Prefer": "resolution=merge-duplicates,return=representation",
    },
    body: body ? JSON.stringify(body) : null,
  });
  return res.json();
}

export default async function handler(req, res) {
  const { table, email, data } = req.body || {};
  if (!email || !table) return res.status(400).json({ error: "Missing params" });

  if (req.method === "GET" || req.query.action === "get") {
    const result = await query("GET", table, null, `email=eq.${email}`);
    return res.status(200).json(result?.[0] || null);
  }

  if (req.method === "POST") {
    const result = await query("POST", table, { email, ...data, updated_at: new Date().toISOString() });
    return res.status(200).json(result?.[0] || null);
  }

  return res.status(405).json({ error: "Method not allowed" });
}
