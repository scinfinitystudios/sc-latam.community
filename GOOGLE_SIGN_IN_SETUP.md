# Configurar Google Sign-In en SC LATAM

El código de Google Sign-In ya está integrado en la página de cuenta y en la app Android. Para que funcione, hay que activar el proveedor en el proyecto Supabase usado por producción.

## 1. Google Cloud

1. En Google Cloud Console, crea o selecciona un proyecto.
2. Configura la pantalla de consentimiento OAuth y completa los datos requeridos de la aplicación.
3. Crea credenciales de tipo **OAuth client ID** para aplicación web.
4. En **Authorized redirect URIs**, agrega exactamente la URL de callback que muestra Supabase en Authentication → Providers → Google. Suele tener el formato `https://<project-ref>.supabase.co/auth/v1/callback`; copia la URL real de tu proyecto, no uses literalmente el ejemplo.
5. Guarda el **Client ID** y el **Client Secret**.

No guardes el Client Secret en el repositorio ni en el frontend.

## 2. Supabase

En el mismo proyecto Supabase que utiliza la web:

1. Abre Authentication → Providers → Google y activa Google.
2. Pega el Client ID y Client Secret de Google Cloud y guarda.
3. En Authentication → URL Configuration, configura:
   - **Site URL:** `https://sc-latam-community.vercel.app`
   - **Redirect URLs:** `https://sc-latam-community.vercel.app/cuenta.html`
   - **Redirect URLs:** `sclatam://auth/callback`

La URL personalizada `sclatam://auth/callback` debe estar permitida exactamente para que Supabase pueda devolver el inicio de sesión a la app Android.

## 3. Compilar e instalar la app Android

El cambio en AndroidManifest y MainActivity activa el callback profundo. El workflow de GitHub Actions que compila el APK de depuración se ejecuta con estos cambios Android. Instala el APK generado por el workflow después de que termine correctamente.

## 4. Prueba

- Web: abre `https://sc-latam-community.vercel.app/cuenta.html`, pulsa **Continuar con Google** y comprueba que vuelve a la página de cuenta con la sesión iniciada.
- Android: instala el APK nuevo, abre Mi cuenta, pulsa **Continuar con Google**, completa el acceso en el navegador externo y comprueba que regresa a la app y muestra el perfil.

El acceso tradicional con correo y contraseña permanece disponible.

## Notas de seguridad

- El Client Secret de Google se configura solo en Supabase.
- La app usa un esquema Android personalizado (`sclatam://`). Para una protección superior contra la apropiación del esquema por otra app, se puede migrar más adelante a Android App Links verificados con dominio HTTPS y `assetlinks.json`.
