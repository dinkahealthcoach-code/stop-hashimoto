import crypto from "crypto";

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SECRET_KEY;

async function supabase(method, table, body = null, match = null) {
  let url = `${SUPABASE_URL}/rest/v1/${table}`;
  if (match) url += `?${match}`;
  const res = await fetch(url, {
    method,
    headers: {
      "Content-Type": "application/json",
      "apikey": SUPABASE_KEY,
      "Authorization": `Bearer ${SUPABASE_KEY}`,
      "Prefer": method === "POST" ? "resolution=merge-duplicates" : "",
    },
    body: body ? JSON.stringify(body) : null,
  });
  return res;
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const secret = process.env.LEMON_WEBHOOK_SECRET;
  const signature = req.headers["x-signature"];
  const body = JSON.stringify(req.body);
  const hmac = crypto.createHmac("sha256", secret).update(body).digest("hex");

  if (hmac !== signature) {
    return res.status(401).json({ error: "Invalid signature" });
  }

  const event = req.body;
  const eventName = event.meta?.event_name;
  const email = event.data?.attributes?.user_email;

  if (!email) return res.status(200).json({ received: true });

  const activos = ["subscription_created", "subscription_resumed", "subscription_unpaused"];
  const inactivos = ["subscription_cancelled", "subscription_expired", "subscription_paused"];

  if (activos.includes(eventName)) {
    await supabase("POST", "profiles", {
      email,
      membership: "premium",
      updated_at: new Date().toISOString(),
    }, "email=eq." + email);
    console.log(`✅ Premium activado: ${email}`);
  }

  if (inactivos.includes(eventName)) {
    await supabase("POST", "profiles", {
      email,
      membership: "free",
      updated_at: new Date().toISOString(),
    }, "email=eq." + email);
    console.log(`❌ Premium cancelado: ${email}`);
  }

  return res.status(200).json({ received: true });
}
