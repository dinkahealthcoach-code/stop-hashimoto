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
    // 1) Buscar el perfil normal
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

    // 2) Auto-reparación: si el webhook de Hotmart falló y no se creó el perfil,
    // verificar si el email está en alumnas_autorizadas (fuente de verdad server-side)
    console.log("No profile found for:", cleanEmail, "- checking alumnas_autorizadas");
    const alumnas = await supabaseGet(
      `alumnas_autorizadas?email=eq.${encodeURIComponent(cleanEmail)}&select=email`
    );
    const esAlumna = Array.isArray(alumnas) && alumnas.length > 0;

    if (esAlumna) {
      console.log("Email autorizado en alumnas_autorizadas, creando perfil:", cleanEmail);
      const upsertRes = await fetch(`${SUPABASE_URL}/rest/v1/profiles?on_conflict=email`, {
        method: "POST",
        headers: {
          "apikey": SUPABASE_KEY,
          "Authorization": `Bearer ${SUPABASE_KEY}`,
          "Content-Type": "application/json",
          "Prefer": "resolution=merge-duplicates,return=representation",
        },
        body: JSON.stringify({
          email: cleanEmail,
          membership: "premium",
          plan_type: "community",
          updated_at: new Date().toISOString(),
        }),
      });
      const upsertText = await upsertRes.text();
      console.log("Auto-repair upsert result:", upsertRes.status, upsertText);

      return res.status(200).json({ membership: "premium", plan_type: "community" });
    }

    // 3) No tiene perfil ni está en alumnas_autorizadas -> free real
    console.log("Email no encontrado en ninguna fuente:", cleanEmail);
    return res.status(200).json({ membership: "free", plan_type: "general" });
  } catch (err) {
    console.error("Error verify-membership:", err);
    return res.status(500).json({ error: "Error verificando membresía" });
  }
}
