const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SECRET_KEY;

async function query(method, table, body = null, filter = null, extraHeaders = {}) {
  let url = `${SUPABASE_URL}/rest/v1/${table}`;
  if (filter) url += `?${filter}`;
  const res = await fetch(url, {
    method,
    headers: {
      "Content-Type": "application/json",
      "apikey": SUPABASE_KEY,
      "Authorization": `Bearer ${SUPABASE_KEY}`,
      "Prefer": "return=representation",
      ...extraHeaders,
    },
    body: body ? JSON.stringify(body) : null,
  });
  return res.json();
}

export default async function handler(req, res) {
  const { table, email, data, action } = req.body || {};
  if (!email || !table) return res.status(400).json({ error: "Missing params" });

  // FIX 1: "action" viaja en el body (no en query string). Antes esta condición
  // nunca era verdadera para las peticiones del frontend, así que un "get" caía
  // en el bloque POST de abajo y terminaba insertando una fila vacía.
  if (req.method === "GET" || action === "get") {
    // Ordenamos por updated_at desc por seguridad, en caso de que queden filas
    // duplicadas antiguas: siempre devolvemos la más reciente.
    const result = await query(
      "GET",
      table,
      null,
      `email=eq.${email}&order=updated_at.desc&limit=1`
    );
    return res.status(200).json(result?.[0] || null);
  }

  if (req.method === "POST") {
    // FIX 2: agregamos on_conflict=email para que "merge-duplicates" sepa sobre
    // qué columna hacer el upsert. Sin esto, Postgrest ignora el conflicto y
    // simplemente inserta una fila nueva cada vez.
    const result = await query(
      "POST",
      table,
      { email, ...data, updated_at: new Date().toISOString() },
      "on_conflict=email",
      { "Prefer": "resolution=merge-duplicates,return=representation" }
    );
    return res.status(200).json(result?.[0] || null);
  }

  return res.status(405).json({ error: "Method not allowed" });
}
