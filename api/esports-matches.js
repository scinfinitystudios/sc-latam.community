// Server-side esports fixture adapter for SC Gaming Bets.
// Configure PANDASCORE_API_TOKEN in Vercel environment variables.
// Never expose the token to browser code. Unsupported titles are intentionally omitted.
module.exports = async (req, res) => {
  res.setHeader("Cache-Control", "s-maxage=60, stale-while-revalidate=120");
  res.setHeader("Content-Type", "application/json; charset=utf-8");

  const token = process.env.PANDASCORE_API_TOKEN;
  if (!token) {
    return res.status(503).json({
      ok: false,
      provider: "PandaScore",
      error: "provider_not_configured",
      message: "Los datos de esports están en preparación. El proveedor aún no está configurado."
    });
  }

  const allowedGames = {
    "valorant": "Valorant",
    "cs-go": "Counter-Strike 2",
    "lol": "League of Legends",
    "dota-2": "Dota 2"
  };
  const statusFilter = String(req.query.status || "upcoming");
  const endpointByStatus = {
    upcoming: "upcoming",
    live: "running",
    past: "past"
  };
  if (!endpointByStatus[statusFilter]) {
    return res.status(400).json({ ok: false, error: "invalid_status" });
  }

  try {
    const url = new URL("https://api.pandascore.co/matches/" + endpointByStatus[statusFilter]);
    url.searchParams.set("per_page", "100");
    url.searchParams.set("sort", "begin_at");
    url.searchParams.set("token", token);

    const response = await fetch(url.toString(), {
      headers: { Accept: "application/json" }
    });
    if (!response.ok) {
      return res.status(response.status === 429 ? 503 : 502).json({
        ok: false,
        provider: "PandaScore",
        error: response.status === 401 || response.status === 403 ? "provider_auth_or_plan_error" : "provider_request_failed",
        message: "No se pudieron verificar los datos del proveedor."
      });
    }

    const rows = await response.json();
    if (!Array.isArray(rows)) {
      return res.status(502).json({ ok: false, error: "invalid_provider_response" });
    }

    const matches = rows.flatMap((m) => {
      const slug = String(m.videogame && m.videogame.slug || "").toLowerCase();
      const game = allowedGames[slug];
      if (!game) return [];
      const opponents = Array.isArray(m.opponents) ? m.opponents : [];
      const teamA = opponents[0] && opponents[0].opponent && opponents[0].opponent.name;
      const teamB = opponents[1] && opponents[1].opponent && opponents[1].opponent.name;
      if (!teamA || !teamB) return [];
      const results = Array.isArray(m.results) ? m.results : [];
      const scoreFor = (opponent) => {
        const found = results.find((r) => r.team && r.team.id === opponent.id);
        return found && Number.isFinite(Number(found.score)) ? Number(found.score) : null;
      };
      return [{
        provider: "PandaScore",
        providerMatchId: String(m.id),
        game,
        tournament: m.tournament && m.tournament.name || null,
        teamA,
        teamB,
        startsAt: m.begin_at || null,
        status: m.status === "running" ? "live" : m.status === "finished" ? "finished" : m.status === "canceled" ? "cancelled" : "upcoming",
        scoreA: scoreFor(opponents[0].opponent),
        scoreB: scoreFor(opponents[1].opponent),
        updatedAt: m.modified_at || null,
        isDemo: false
      }];
    });

    return res.status(200).json({
      ok: true,
      provider: "PandaScore",
      status: statusFilter,
      matches,
      unsupportedGames: ["Free Fire", "Minecraft"],
      note: "Solo partidos devueltos por el proveedor. La cobertura depende del plan y de los torneos disponibles."
    });
  } catch (_) {
    return res.status(502).json({
      ok: false,
      provider: "PandaScore",
      error: "provider_unreachable",
      message: "No fue posible contactar al proveedor de datos."
    });
  }
};
