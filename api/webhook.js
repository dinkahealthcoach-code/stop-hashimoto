import crypto from "crypto";

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SECRET_KEY;

// IDs de productos Hotmart
const PLAN_COMUNIDAD_ID = "7960502";
const PLAN_GENERAL_ID = "7960716";

async function supabase(method, table, body = null, match = null) {
  let url = `${SUPABASE_URL}/rest/v1/${table}`;
  if (match) url += `?${match}`;
  const res = await fetch(url, {
    method,
    headers: {
      "Content-Type": "application/json",
      "apikey": SUPABASE_KEY,
      "Authorization": `Bearer ${SUPABASE_KEY}`,
      "Prefer": "resolution=merge-duplicates",
    },
    body: body ? JSON.stringify(body) : null,
  });
  return res;
}

function getPlanType(productId) {
  if (String(productId) === PLAN_COMUNIDAD_ID) return "community";
  if (String(productId) === PLAN_GENERAL_ID) return "general";
  return "general";
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  // Verificación de firma Hotmart
  const secret = process.env.HOTMART_WEBHOOK_SECRET;
  const signature = req.headers["x-hotmart-hottok"];

  if (!signature || signature !== secret) {
    return res.status(401).json({ error: "Invalid signature" });
  }

  const event = req.body;
  const eventName = event.event;
  const email = event.data?.buyer?.email;
  const productId = event.data?.product?.id;

  if (!email) return res.status(200).json({ received: true });

  const plan_type = getPlanType(productId);

  const activos = [
    "PURCHASE_APPROVED",
    "PURCHASE_COMPLETE",
    "SUBSCRIPTION_REACTIVATED",
  ];

  const inactivos = [
    "PURCHASE_CANCELED",
    "PURCHASE_REFUNDED",
    "SUBSCRIPTION_CANCELLATION",
    "PURCHASE_EXPIRED",
  ];

  if (activos.includes(eventName)) {
    await supabase("POST", "profiles", {
      email,
      membership: "premium",
      plan_type,
      updated_at: new Date().toISOString(),
    });
    console.log(`✅ Premium activado [${plan_type}]: ${email}`);
  }

  if (inactivos.includes(eventName)) {
    await supabase("POST", "profiles", {
      email,
      membership: "free",
      plan_type: "general",
      updated_at: new Date().toISOString(),
    });
    console.log(`❌ Premium cancelado: ${email}`);
  }

  return res.status(200).json({ received: true });
}
