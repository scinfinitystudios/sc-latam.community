// Public browser configuration only. Never add the Supabase service_role key here.
module.exports = (req, res) => {
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("Content-Type", "application/json; charset=utf-8");

  const url = process.env.SUPABASE_URL;
  const anonKey = process.env.SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    return res.status(503).json({
      error: "Supabase no está configurado. Añade SUPABASE_URL y SUPABASE_ANON_KEY en Vercel."
    });
  }

  return res.status(200).json({ url, anonKey });
};
