import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const loginCard = document.getElementById("loginCard");
const dashboard = document.getElementById("dashboard");
const loginForm = document.getElementById("loginForm");
const loginButton = document.getElementById("loginButton");
const loginMessage = document.getElementById("loginMessage");
const dashboardMessage = document.getElementById("dashboardMessage");
const logoutButton = document.getElementById("logoutButton");
const signedInAs = document.getElementById("signedInAs");

let supabase;

function showLogin(message = "") {
  loginCard.hidden = false;
  dashboard.hidden = true;
  loginMessage.textContent = message;
  dashboardMessage.textContent = "";
}

function showDashboard(user) {
  loginCard.hidden = true;
  dashboard.hidden = false;
  signedInAs.textContent = user.email || "Cuenta autorizada";
  loginMessage.textContent = "";
}

async function isAdmin(user) {
  const { data, error } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  if (error) throw error;
  return data?.role === "admin";
}

async function verifySession(session) {
  if (!session?.user) {
    showLogin();
    return;
  }

  try {
    if (await isAdmin(session.user)) {
      showDashboard(session.user);
    } else {
      await supabase.auth.signOut();
      showLogin("Esta cuenta no tiene permisos de administrador.");
    }
  } catch (error) {
    console.error("No se pudo verificar el rol administrativo.", error);
    await supabase.auth.signOut();
    showLogin("No se pudo verificar tu permiso. Comprueba la configuración de Supabase e inténtalo de nuevo.");
  }
}

async function start() {
  try {
    const response = await fetch("/api/config", { cache: "no-store" });
    const config = await response.json();
    if (!response.ok || !config.url || !config.anonKey) {
      throw new Error(config.error || "Falta la configuración de Supabase.");
    }

    supabase = createClient(config.url, config.anonKey, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
    });

    const { data, error } = await supabase.auth.getSession();
    if (error) throw error;
    await verifySession(data.session);

    supabase.auth.onAuthStateChange((_event, session) => {
      // Defer database work so it does not run inside the auth callback.
      queueMicrotask(() => verifySession(session));
    });
  } catch (error) {
    console.error("SC Admin initialization failed.", error);
    showLogin(error.message || "No se pudo iniciar el panel. Revisa la configuración.");
  }
}

loginForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!supabase) {
    loginMessage.textContent = "Supabase aún no está configurado.";
    return;
  }

  loginButton.disabled = true;
  loginButton.textContent = "Verificando…";
  loginMessage.textContent = "";

  const email = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value;

  try {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;

    if (!(await isAdmin(data.user))) {
      await supabase.auth.signOut();
      throw new Error("Esta cuenta no tiene permisos de administrador.");
    }
    showDashboard(data.user);
  } catch (error) {
    loginMessage.textContent = error.message === "Invalid login credentials"
      ? "Correo o contraseña incorrectos."
      : (error.message || "No se pudo iniciar sesión.");
  } finally {
    loginButton.disabled = false;
    loginButton.textContent = "Iniciar sesión";
  }
});

logoutButton.addEventListener("click", async () => {
  logoutButton.disabled = true;
  const { error } = await supabase.auth.signOut();
  logoutButton.disabled = false;
  if (error) {
    dashboardMessage.textContent = "No se pudo cerrar la sesión. Inténtalo de nuevo.";
    return;
  }
  showLogin("Sesión cerrada.");
});

start();
