const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SECRET_KEY;

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { email } = req.body;
  if (!email) return res.status(400).json({ error: "Email requerido" });

  const cleanEmail = email.toLowerCase().trim();

  try {
    const response = await fetch(
      `${SUPABASE_URL}/rest/v1/alumnas_autorizadas?email=eq.${encodeURIComponent(cleanEmail)}&select=email`,
      {
        headers: {
          "apikey": SUPABASE_KEY,
          "Authorization": `Bearer ${SUPABASE_KEY}`,
          "Accept": "application/json",
        },
      }
    );

    const text = await response.text();
    console.log("verify-alumna response:", text);
    
    let data;
    try { data = JSON.parse(text); } catch { data = []; }
    
    const isAlumna = Array.isArray(data) && data.length > 0;
    console.log("Email:", cleanEmail, "-> autorizada:", isAlumna);

    return res.status(200).json({ autorizada: isAlumna });
  } catch (err) {
    console.error("Error verify-alumna:", err);
    return res.status(500).json({ error: "Error verificando alumna" });
  }
}
