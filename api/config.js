// Public browser configuration only. Never expose SUPABASE_SECRET_KEY or SERVICE_ROLE keys here.
module.exports = (req, res) => {
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("Content-Type", "application/json; charset=utf-8");

  // Support both legacy Supabase names and the current publishable-key names
  // commonly provisioned by the Vercel/Supabase integration.
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey =
    process.env.SUPABASE_PUBLISHABLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    process.env.SUPABASE_ANON_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    return res.status(503).json({
      error: "Supabase no está configurado. Configura SUPABASE_URL y una clave pública (SUPABASE_PUBLISHABLE_KEY o SUPABASE_ANON_KEY) en Vercel."
    });
  }

  return res.status(200).json({ url, anonKey });
};
