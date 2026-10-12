# SC Admin: configuración segura

Esta primera versión añade la pantalla de acceso y verifica que la cuenta autenticada tenga `profiles.role = 'admin'`. Las tarjetas del panel son todavía una estructura inicial; los módulos CRUD se conectarán en fases posteriores.

## 1. Crear el proyecto de Supabase

1. Entra en https://supabase.com/ y crea un proyecto nuevo para SC LATAM Community.
2. Guarda la contraseña de la base de datos en un gestor de contraseñas. No la pongas en GitHub ni en el código.
3. Abre **Project Settings → API** (o la sección equivalente de API Keys) y copia el Project URL y la clave publicable/anon. La clave publicable está diseñada para el navegador; su seguridad depende de Auth y de las políticas RLS.
4. No uses nunca la clave `service_role` o una clave secreta en el navegador, HTML, JavaScript público ni GitHub.

## 2. Crear las tablas y políticas

1. En Supabase, abre **SQL Editor → New query**.
2. Copia el contenido de `supabase/schema.sql` del repositorio y ejecútalo.
3. Comprueba que las tablas aparecen en **Table Editor** y que RLS está habilitado.

## 3. Crear la primera cuenta administradora

1. En Supabase, abre **Authentication → Users → Add user** y crea el usuario con tu correo. Usa una contraseña única y segura; activa confirmación de correo si la opción está disponible y quieres exigirla.
2. Copia el UUID del usuario creado.
3. En SQL Editor, ejecuta esta sentencia reemplazando el UUID por el de tu usuario:

```sql
insert into public.profiles (id, email, role)
select id, email, 'admin'
from auth.users
where id = 'PEGA-AQUI-EL-UUID-DEL-USUARIO'
on conflict (id) do update
set email = excluded.email, role = 'admin';
```

No asignes el rol admin a cuentas públicas. No existe formulario público para crear administradores.

## 4. Configurar variables en Vercel

1. Abre el proyecto de SC en https://vercel.com/ y entra en **Settings → Environment Variables**.
2. Añade estas variables para Production (y Preview/Development si lo necesitas):

| Variable | Valor |
| --- | --- |
| `SUPABASE_URL` | Project URL de tu proyecto Supabase |
| `SUPABASE_ANON_KEY` | Clave publicable/anon de Supabase |

3. Guarda los cambios y ejecuta un nuevo deployment.

La función `/api/config` solo devuelve el URL y la clave publicable/anon para inicializar el cliente del navegador. No añadas `service_role`, contraseñas de base de datos, tokens privados ni secretos de Vercel a estas variables públicas o al frontend.

## 5. Probar el panel

1. Abre `https://TU-DOMINIO/admin.html`.
2. Inicia sesión con la cuenta creada.
3. Si el usuario no tiene un registro en `profiles` con rol `admin`, el panel debe denegar el acceso.
4. Comprueba que cerrar sesión devuelve a la pantalla de acceso.

## 6. Verificación de seguridad antes de usar datos reales

- En **Authentication → Policies / Settings**, limita los métodos de acceso que no uses y configura protección contra contraseñas filtradas si está disponible en tu plan.
- No habilites registro público de administradores.
- Revisa las políticas RLS de todas las tablas antes de almacenar datos personales.
- Usa MFA para cuentas administrativas si está disponible.
- No compartas contraseñas ni claves privadas por chat.
- La tabla `members` está restringida a administradores; el formulario público existente sigue enviando datos a Google Forms hasta que se implemente una integración de registro con backend.
- No publiques datos de conexión sensibles de servidores en tablas públicas.
- Las acciones administrativas aún no escriben en `admin_audit_log`; añade registro de auditoría cuando se implementen las operaciones de gestión.
