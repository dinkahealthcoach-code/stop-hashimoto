import crypto from "crypto";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const secret = process.env.LEMON_WEBHOOK_SECRET;
  const signature = req.headers["x-signature"];

  // Verificar firma del webhook
  const body = JSON.stringify(req.body);
  const hmac = crypto.createHmac("sha256", secret).update(body).digest("hex");

  if (hmac !== signature) {
    return res.status(401).json({ error: "Invalid signature" });
  }

  const event = req.body;
  const eventName = event.meta?.event_name;
  const email = event.data?.attributes?.user_email;
  const status = event.data?.attributes?.status;

  // Eventos que activan o desactivan membresía premium
  const eventosActivos = [
    "subscription_created",
    "subscription_resumed",
    "subscription_unpaused",
  ];

  const eventosInactivos = [
    "subscription_cancelled",
    "subscription_expired",
    "subscription_paused",
  ];

  if (!email) {
    return res.status(200).json({ received: true });
  }

  if (eventosActivos.includes(eventName)) {
    // Guardar membresía activa — el cliente la leerá desde localStorage
    // En producción real conectar con una base de datos
    console.log(`✅ Membresía ACTIVADA para: ${email}`);
    return res.status(200).json({ 
      received: true, 
      action: "activated",
      email 
    });
  }

  if (eventosInactivos.includes(eventName)) {
    console.log(`❌ Membresía CANCELADA para: ${email}`);
    return res.status(200).json({ 
      received: true, 
      action: "deactivated",
      email 
    });
  }

  return res.status(200).json({ received: true });
}
