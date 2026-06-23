const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SECRET_KEY;

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { email } = req.body;
  if (!email) return res.status(400).json({ error: "Email requerido" });

  try {
    const response = await fetch(
      `${SUPABASE_URL}/rest/v1/profiles?email=eq.${encodeURIComponent(email)}&select=email,membership,plan_type`,
      {
        headers: {
          "apikey": SUPABASE_KEY,
          "Authorization": `Bearer ${SUPABASE_KEY}`,
        },
      }
    );

    const data = await response.json();
    const profile = data?.[0];

    if (!profile) {
      return res.status(200).json({ membership: "free", plan_type: "general" });
    }

    return res.status(200).json({
      membership: profile.membership || "free",
      plan_type: profile.plan_type || "general"
    });
  } catch (err) {
    return res.status(500).json({ error: "Error verificando membresía" });
  }
}
