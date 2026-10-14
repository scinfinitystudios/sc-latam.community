# SC Gaming Bets — plan de datos para los seis juegos

## Objetivo

Mostrar enfrentamientos y resultados reales en SC Gaming Bets usando una fuente verificable por juego. Los puntos son virtuales; esta integración no habilita apuestas ni dinero real.

## Estado de cobertura (no asumir que hay datos hasta probar credenciales y respuestas)

| Juego | Fuente candidata | Qué verificar antes de activarlo |
|---|---|---|
| Valorant | Riot Esports Data / GRID; PandaScore como alternativa de fixtures | Acceso autorizado, ligas cubiertas, calendario/resultados y permisos de uso |
| League of Legends | Riot Esports Data / GRID; PandaScore como alternativa de fixtures | Acceso autorizado, ligas cubiertas, calendario/resultados y permisos de uso |
| Counter-Strike 2 | PandaScore para fixtures; GRID para datos oficiales en directo | Cuotas del plan, límites, cobertura regional y derechos de redistribución |
| Dota 2 | PandaScore para fixtures; GRID para datos oficiales en directo | Cuotas del plan, límites, cobertura regional y derechos de redistribución |
| Free Fire | Proveedor especializado o calendario oficial de torneos; verificar caso por caso | Que ofrezca partidas de esports y resultados, no solo perfiles/estadísticas de jugadores |
| Minecraft | Calendarios/resultados de organizadores y comunidades; evaluar Liquipedia u otra fuente autorizada | Cobertura real de torneos, identificadores estables, frecuencia y permiso de reutilización |

Fuentes oficiales/candidatas para revisar:
- Riot Esports Data: https://riotesportsdata.com/
- GRID Live Esports Data: https://grid.gg/products/live-data/
- PandaScore planes y cobertura: https://developers.pandascore.co/docs/plan-reference
- Liquipedia API: https://liquipedia.net/api

La disponibilidad, precio y permiso comercial deben confirmarse directamente con cada proveedor. Una API de estadísticas de jugadores de Free Fire no implica que tenga calendario/resultados de esports.

## Arquitectura de integración

1. Los secretos de API se guardan solo en variables de entorno del servidor/Vercel, nunca en HTML ni en el navegador.
2. Cada proveedor se conecta mediante un adaptador separado.
3. Todos los adaptadores normalizan los datos a un formato común:
   - `provider`, `provider_match_id`, `game_id`
   - `team_a`, `team_b`
   - `starts_at` en UTC
   - `status`: `upcoming`, `live`, `finished`, `cancelled`
   - `score_a`, `score_b`, `last_synced_at`
4. Sin credenciales o sin respuesta válida, el juego aparece como “Datos en preparación”; nunca se rellena con partidas inventadas.
5. Cada registro importado conserva proveedor e ID externo para evitar duplicados.
6. Los resultados solo se consideran oficiales si la fuente lo confirma; los cambios se registran con fecha de sincronización.
7. La sincronización corre en servidor mediante tarea programada/worker, respetando límites de API. La página lee de Supabase y no llama directamente a APIs con secretos.
8. Los mercados y cuotas de demostración son una capa separada de los datos de partidos. No deben presentarse como cuotas reales ni calcularse automáticamente desde datos incompletos.

## Fases

- [ ] Revisar las credenciales de Supabase y probar lectura de las tablas en el proyecto correcto.
- [ ] Seleccionar proveedor y plan después de verificar términos, precio y cobertura.
- [ ] Crear adaptador inicial para LoL, Valorant, CS2 y Dota 2, si el proveedor elegido los permite.
- [ ] Investigar e integrar Free Fire y Minecraft con fuentes verificables; mantenerlos desactivados hasta pasar las pruebas.
- [ ] Añadir tarea de sincronización con reintentos, límites y logs.
- [ ] Añadir estado visible “Actualizado hace…” y aviso cuando los datos estén desactualizados.
- [ ] Conectar el frontend a datos sincronizados; eliminar la apariencia de “en directo” para datos ficticios.
- [ ] Ejecutar pruebas de duplicados, cambios de horario, partidas canceladas y resultados corregidos.

## Reglas de seguridad y honestidad

- No colocar claves privadas en archivos frontend, commits o respuestas HTTP públicas.
- No afirmar que una partida está en directo si el proveedor no lo indica.
- No inventar equipos, horarios, marcadores ni resultados en el modo de datos reales.
- El prototipo permanece en puntos virtuales. No habilitar depósitos, retiros ni dinero real.
- Revisar las condiciones de uso y derechos de redistribución de cada proveedor antes de publicar datos.
