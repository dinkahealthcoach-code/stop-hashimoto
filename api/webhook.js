import crypto from "crypto";

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SECRET_KEY;

const PLAN_COMUNIDAD_ID = "7960502";
const PLAN_GENERAL_ID = "7960716";

const ACTIVATION_EVENTS = ["PURCHASE_APPROVED", "PURCHASE_COMPLETE"];
const DEACTIVATION_EVENTS = [
  "PURCHASE_CANCELED",
  "PURCHASE_REFUNDED",
  "PURCHASE_CHARGEBACK",
  "SUBSCRIPTION_CANCELLATION",
];

async function supabase(method, path, body = null) {
  const url = `${SUPABASE_URL}/rest/v1/${path}`;
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

  const secret = process.env.HOTMART_WEBHOOK_SECRET;
  const signature = req.headers["x-hotmart-hottok"];

  if (!signature || signature !== secret) {
    return res.status(401).json({ error: "Invalid signature" });
  }

  const event = req.body;
  const eventName = event.event;
  const email = event.data?.buyer?.email;
  const productId = event.data?.product?.id;

  if (!email) {
    return res.status(200).json({ received: true, processed: false, reason: "no email" });
  }

  const normalizedEmail = email.toLowerCase();

  if (ACTIVATION_EVENTS.includes(eventName)) {
    const planType = getPlanType(productId);

    const upsertRes = await supabase("POST", "profiles?on_conflict=email", {
      email: normalizedEmail,
      membership: "premium",
      plan_type: planType,
    });

    if (!upsertRes.ok) {
      const errText = await upsertRes.text();
      console.error("Supabase upsert failed:", errText);
      return res.status(200).json({ received: true, processed: false, error: errText });
    }

    return res.status(200).json({
      received: true,
      processed: true,
      action: "activated",
      email: normalizedEmail,
      planType,
    });
  }

  if (DEACTIVATION_EVENTS.includes(eventName)) {
    const updateRes = await supabase(
      "PATCH",
      `profiles?email=eq.${encodeURIComponent(normalizedEmail)}`,
      { membership: "free", plan_type: "general" }
    );

    if (!updateRes.ok) {
      const errText = await updateRes.text();
      console.error("Supabase deactivation failed:", errText);
      return res.status(200).json({ received: true, processed: false, error: errText });
    }

    return res.status(200).json({
      received: true,
      processed: true,
      action: "deactivated",
      email: normalizedEmail,
    });
  }

  return res.status(200).json({
    received: true,
    processed: false,
    reason: "event not handled",
    event: eventName,
  });
}
