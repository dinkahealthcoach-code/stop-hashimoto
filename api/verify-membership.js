const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SECRET_KEY;

async function supabaseGet(path) {
  const response = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    headers: {
      "apikey": SUPABASE_KEY,
      "Authorization": `Bearer ${SUPABASE_KEY}`,
      "Accept": "application/json",
    },
  });
  const text = await response.text();
  try { return JSON.parse(text); } catch { return []; }
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { email } = req.body;
  if (!email) return res.status(400).json({ error: "Email requerido" });

  const cleanEmail = email.toLowerCase().trim();

  try {
    const profiles = await supabaseGet(
      `profiles?email=eq.${encodeURIComponent(cleanEmail)}&select=email,membership,plan_type`
    );
    const profile = Array.isArray(profiles) ? profiles[0] : null;

    if (profile) {
      console.log("Profile found:", profile);
      return res.status(200).json({
        membership: profile.membership || "free",
        plan_type: profile.plan_type || "general",
      });
    }

    // Sin perfil = sin acceso pagado. Ya NO se otorga membresía premium
    // automática solo por estar en alumnas_autorizadas. Esa tabla ahora es
    // únicamente para marketing/CRM (segmentación de campañas). El acceso
    // real solo se activa cuando el webhook de Hotmart confirma un pago.
    console.log("No profile found for:", cleanEmail, "- membership: free");
    return res.status(200).json({ membership: "free", plan_type: "general" });
  } catch (err) {
    console.error("Error verify-membership:", err);
    return res.status(500).json({ error: "Error verificando membresía" });
  }
}
