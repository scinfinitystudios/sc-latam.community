# Configurar Google Sign-In en SC LATAM

El código de Google Sign-In ya está integrado en la página de cuenta y en la app Android. Para que funcione, hay que activar el proveedor en el proyecto Supabase usado por producción.

## 1. Google Cloud

1. En Google Cloud Console, crea o selecciona un proyecto.
2. Configura la pantalla de consentimiento OAuth y completa los datos requeridos de la aplicación.
3. Crea credenciales de tipo **OAuth client ID** para aplicación web.
4. En **Authorized redirect URIs**, agrega exactamente la URL de callback que muestra Supabase en Authentication → Providers → Google. Suele tener el formato `https://kagyykeslcirzorohoqu.supabase.co/auth/v1/callback`; esta es la URL del proyecto Supabase conectado a SC LATAM.
5. Guarda el **Client ID** y el **Client Secret**.

No guardes el Client Secret en el repositorio ni en el frontend.

## 2. Supabase

En el proyecto Supabase `kagyykeslcirzorohoqu` (el proyecto activo visible en la conexión Supabase):

1. Abre Authentication → Providers → Google y activa Google.
2. Pega el Client ID y Client Secret de Google Cloud y guarda.
3. En Authentication → URL Configuration, configura:
   - **Site URL:** `https://sc-latam-community.vercel.app`
   - **Redirect URLs:** `https://sc-latam-community.vercel.app/cuenta.html`
   - **Redirect URLs:** `sclatam://auth/callback`

Los enlaces de confirmación de correo y recuperación de contraseña también regresan a `https://sc-latam-community.vercel.app/cuenta.html` en la web o a `sclatam://auth/callback` en el APK. Mantén ambas direcciones permitidas.

La URL personalizada `sclatam://auth/callback` debe estar permitida exactamente para que Supabase pueda devolver el inicio de sesión a la app Android.

## 3. Compilar e instalar la app Android

El cambio en AndroidManifest y MainActivity activa el callback profundo. El workflow de GitHub Actions que compila el APK de depuración se ejecuta con estos cambios Android. Instala el APK generado por el workflow después de que termine correctamente.

## 4. Prueba

- Web: abre `https://sc-latam-community.vercel.app/cuenta.html`, pulsa **Continuar con Google** y comprueba que vuelve a la página de cuenta con la sesión iniciada.
- Android: instala el APK nuevo, abre Mi cuenta, pulsa **Continuar con Google**, completa el acceso en el navegador externo y comprueba que regresa a la app y muestra el perfil.

El acceso tradicional con correo y contraseña permanece disponible. La página también incluye recuperación de contraseña por correo y reenvío del mensaje de confirmación. Los enlaces de confirmación y recuperación usan el mismo destino web o el enlace profundo de Android según desde dónde se soliciten.

## Notas de seguridad

- El Client Secret de Google se configura solo en Supabase.
- La app usa un esquema Android personalizado (`sclatam://`). Para una protección superior contra la apropiación del esquema por otra app, se puede migrar más adelante a Android App Links verificados con dominio HTTPS y `assetlinks.json`.


## Recuperación de contraseña mediante código de 6 dígitos

Para evitar que los sistemas de previsualización de correo consuman el enlace de un solo uso antes de que la persona lo abra, SC LATAM usa verificación OTP para recuperar contraseñas.

En Supabase Dashboard abre **Authentication → Email Templates → Reset Password** y sustituye el contenido por:

```html
<h2>Restablece tu contraseña de SC LATAM</h2>
<p>Recibimos una solicitud para cambiar la contraseña de tu cuenta.</p>
<p>Introduce este código de 6 dígitos en la página de recuperación de SC LATAM:</p>
<p style="font-size:32px;font-weight:bold;letter-spacing:8px">{{ .Token }}</p>
<p>Si no solicitaste este cambio, ignora este correo.</p>
```

Asunto recomendado: `Código para restablecer tu contraseña de SC LATAM`.

El usuario solicita el correo desde `cuenta.html`, escribe el código de 6 dígitos y su nueva contraseña en el formulario. El código se verifica con `supabase.auth.verifyOtp({ email, token, type: "recovery" })` antes de actualizar la contraseña. No uses `{{ .ConfirmationURL }}` en esta plantilla OTP.
