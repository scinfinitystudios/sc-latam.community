import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const form=document.getElementById("accountForm");
const emailInput=document.getElementById("accountEmail");
const passwordInput=document.getElementById("accountPassword");
const message=document.getElementById("accountMessage");
const title=document.getElementById("formTitle");
const intro=document.getElementById("formIntro");
const eyebrow=document.getElementById("formEyebrow");
const submit=document.getElementById("submitButton");
const googleButton=document.getElementById("googleSignInButton");
const togglePrompt=document.getElementById("togglePrompt");
const toggle=document.getElementById("toggleMode");
const accountCard=document.getElementById("accountCard");
const profileCard=document.getElementById("profileCard");
const profileEmail=document.getElementById("profileEmail");
const profileMiniAvatar=document.getElementById("profileMiniAvatar");
const profileWelcomeName=document.getElementById("profileWelcomeName");
const memberSince=document.getElementById("memberSince");
const profileMessage=document.getElementById("profileMessage");
const logoutButton=document.getElementById("logoutButton");
const profileForm=document.getElementById("profileForm");
const displayNameInput=document.getElementById("displayName");
const profileAvatar=document.getElementById("profileAvatar");
const photoInput=document.getElementById("profilePhotoInput");
const choosePhotoButton=document.getElementById("choosePhotoButton");
const removePhotoButton=document.getElementById("removePhotoButton");
const saveProfileButton=document.getElementById("saveProfileButton");

let supabase=null,supabaseHost=null,signUpMode=false,currentUser=null,currentAvatarUrl=null,removeAvatarRequested=false,pendingConfirmationEmail="",isCompletingRecovery=false;
const MAX_PHOTO_BYTES=3*1024*1024;
const ALLOWED_TYPES=["image/jpeg","image/png","image/webp"];

function setMode(signup){
  signUpMode=signup;title.textContent=signup?"Crear cuenta":"Inicia sesión";
  eyebrow.textContent=signup?"ÚNETE A LA COMUNIDAD":"BIENVENIDO A SC LATAM";
  intro.textContent=signup?"Usa tu correo y crea una contraseña única de al menos 8 caracteres.":"Entra con tu correo y contraseña.";
  submit.textContent=signup?"Crear mi cuenta":"Iniciar sesión";
  togglePrompt.firstChild.textContent=signup?"¿Ya tienes cuenta? ":"¿Aún no tienes cuenta? ";
  toggle.textContent=signup?"Iniciar sesión":"Crear una cuenta";message.textContent="";
}
function initialsFor(user){return (user?.email||"SC").slice(0,2).toUpperCase();}
function setAvatar(url,user=currentUser){
  profileAvatar.classList.toggle("profile-avatar-fallback",!url);
  profileAvatar.src=url||"logo.png";
  profileAvatar.onerror=()=>{profileAvatar.onerror=null;profileAvatar.src="logo.png";profileAvatar.classList.add("profile-avatar-fallback");};
  profileAvatar.alt=url?"Foto de perfil personalizada":"Logo de SC LATAM";
  if(profileMiniAvatar){profileMiniAvatar.src=url||"logo.png";profileMiniAvatar.onerror=()=>{profileMiniAvatar.onerror=null;profileMiniAvatar.src="logo.png";};}
  removePhotoButton.hidden=!url;
}
async function loadProfile(user){
  currentUser=user;accountCard.hidden=true;profileCard.hidden=false;
  profileEmail.textContent=user.email||"Cuenta SC LATAM";
  profileWelcomeName.textContent=user.user_metadata?.display_name||"Miembro SC LATAM";
  memberSince.textContent=user.created_at?new Intl.DateTimeFormat("es-PE",{year:"numeric",month:"short"}).format(new Date(user.created_at)):"—";
  profileMessage.textContent="Cargando tu perfil…";
  try{
    const {data,error}=await supabase.from("profiles").select("display_name,avatar_url,created_at").eq("id",user.id).maybeSingle();
    if(error)throw error;
    displayNameInput.value=data?.display_name||user.user_metadata?.display_name||"";
    profileWelcomeName.textContent=displayNameInput.value||"Miembro SC LATAM";
    memberSince.textContent=data?.created_at?new Intl.DateTimeFormat("es-PE",{year:"numeric",month:"short"}).format(new Date(data.created_at)):memberSince.textContent;
    currentAvatarUrl=data?.avatar_url||null;removeAvatarRequested=false;setAvatar(currentAvatarUrl,user);
    profileMessage.textContent=data?.display_name?"Tu perfil está actualizado.":"Elige tu nombre y, si quieres, una foto para personalizar tu cuenta.";
  }catch(error){
    console.error("Could not load SC profile",error);
    displayNameInput.value=user.user_metadata?.display_name||"";
    setAvatar(null,user);
    profileMessage.textContent="No se pudo cargar el perfil. Si es la primera vez, el administrador debe activar la configuración de perfiles en Supabase.";
  }
}
function showForm(){currentUser=null;accountCard.hidden=false;profileCard.hidden=true;}
toggle.addEventListener("click",e=>{e.preventDefault();setMode(!signUpMode);});

function authRedirectUrl(){
  return window.AndroidAuth&&typeof window.AndroidAuth.openAuthUrl==="function"
    ?"sclatam://auth/callback"
    :new URL("/cuenta.html",window.location.origin).toString();
}

document.getElementById("forgotPasswordButton").addEventListener("click",async()=>{
  if(!supabase){message.textContent="El sistema de cuentas no está configurado.";return;}
  const email=emailInput.value.trim();
  if(!email){message.textContent="Escribe tu correo para enviarte el enlace.";emailInput.focus();return;}
  const button=document.getElementById("forgotPasswordButton");
  button.disabled=true;message.textContent="Enviando enlace de recuperación…";
  try{
    const {error}=await supabase.auth.resetPasswordForEmail(email,{redirectTo:authRedirectUrl()});
    if(error)throw error;
    message.textContent="Te enviamos un enlace para restablecer tu contraseña. Abre el correo desde este dispositivo y pulsa «Reset password». Si no aparece, revisa Spam.";
  }catch(error){message.textContent=error.message||"No se pudo enviar el enlace.";}
  finally{button.disabled=false;}
});

document.getElementById("resendConfirmationButton").addEventListener("click",async()=>{
  if(!supabase||!pendingConfirmationEmail)return;
  const button=document.getElementById("resendConfirmationButton");
  button.disabled=true;
  try{
    const {error}=await supabase.auth.resend({type:"signup",email:pendingConfirmationEmail,options:{emailRedirectTo:authRedirectUrl()}});
    if(error)throw error;
    message.textContent="Si la cuenta necesita confirmación, enviaremos otro correo. Revisa Spam.";
  }catch(error){message.textContent=error.message||"No se pudo reenviar el correo.";}
  finally{button.disabled=false;}
});

document.getElementById("recoveryForm").addEventListener("submit",async(event)=>{
  event.preventDefault();
  const password=document.getElementById("recoveryPassword").value;
  const feedback=document.getElementById("recoveryMessage");
  const button=event.currentTarget.querySelector('button[type="submit"]');
  if(password.length<8){feedback.textContent="La contraseña debe tener al menos 8 caracteres.";return;}
  button.disabled=true;button.textContent="Actualizando contraseña…";isCompletingRecovery=true;
  try{
    const {error}=await supabase.auth.updateUser({password});
    if(error)throw error;
    isCompletingRecovery=false;
    document.getElementById("recoveryCard").hidden=true;
    document.getElementById("recoveryPassword").value="";
    await supabase.auth.signOut();
    showForm();setMode(false);
    message.textContent="Contraseña actualizada correctamente. Ya puedes iniciar sesión con tu nueva contraseña.";
  }catch(error){
    isCompletingRecovery=false;
    feedback.textContent=error.message||"No se pudo actualizar la contraseña. Solicita un nuevo enlace.";
  }finally{button.disabled=false;button.textContent="Guardar nueva contraseña";}
});

googleButton.addEventListener("click",async()=>{
  if(!supabase){message.textContent="El sistema de cuentas aún no está configurado. Inténtalo más tarde.";return;}
  googleButton.disabled=true;
  googleButton.textContent="Conectando con Google…";
  message.textContent="";
  try{
    const isAndroidApp=!!(window.AndroidAuth&&typeof window.AndroidAuth.openAuthUrl==="function");
    const redirectTo=isAndroidApp?"sclatam://auth/callback":new URL("/cuenta.html",window.location.origin).toString();
    const {data,error}=await supabase.auth.signInWithOAuth({
      provider:"google",
      options:{redirectTo,skipBrowserRedirect:true}
    });
    if(error)throw error;
    if(!data?.url)throw new Error("Supabase no devolvió la dirección de acceso de Google.");
    if(isAndroidApp){window.AndroidAuth.openAuthUrl(data.url,supabaseHost);googleButton.disabled=false;googleButton.textContent="Continuar con Google";}
    else window.location.assign(data.url);
  }catch(error){
    console.error("Google sign-in failed",error);
    message.textContent=error.message||"No se pudo iniciar sesión con Google. Inténtalo de nuevo.";
    googleButton.disabled=false;
    googleButton.textContent="Continuar con Google";
  }
});
form.addEventListener("submit",async e=>{
  e.preventDefault();if(!supabase){message.textContent="El sistema de cuentas aún no está configurado. Inténtalo más tarde.";return;}
  submit.disabled=true;submit.textContent=signUpMode?"Creando cuenta…":"Iniciando sesión…";message.textContent="";
  try{
    const email=emailInput.value.trim(),password=passwordInput.value;
    if(signUpMode){
      const {data,error}=await supabase.auth.signUp({email,password,options:{emailRedirectTo:window.AndroidAuth&&typeof window.AndroidAuth.openAuthUrl==="function"?"sclatam://auth/callback":new URL("/cuenta.html",window.location.origin).toString()}});if(error)throw error;
      if(data.session){await loadProfile(data.user);return;}
      pendingConfirmationEmail=email;document.getElementById("resendConfirmationButton").hidden=false;message.textContent="Cuenta creada. Confirma tu correo desde el enlace que te enviamos y luego inicia sesión.";
    }else{const {data,error}=await supabase.auth.signInWithPassword({email,password});if(error)throw error;await loadProfile(data.user);}
  }catch(err){message.textContent=err.message==="Invalid login credentials"?"Correo o contraseña incorrectos.":(err.message||"No se pudo completar la operación.");}
  finally{submit.disabled=false;submit.textContent=signUpMode?"Crear mi cuenta":"Iniciar sesión";}
});
choosePhotoButton.addEventListener("click",()=>photoInput.click());
photoInput.addEventListener("change",()=>{
  const file=photoInput.files?.[0];if(!file)return;
  if(!ALLOWED_TYPES.includes(file.type)){profileMessage.textContent="Elige una imagen JPG, PNG o WebP.";photoInput.value="";return;}
  if(file.size>MAX_PHOTO_BYTES){profileMessage.textContent="La foto debe pesar 3 MB o menos.";photoInput.value="";return;}
  const previewUrl=URL.createObjectURL(file);setAvatar(previewUrl);removePhotoButton.hidden=false;removeAvatarRequested=false;profileMessage.textContent="Vista previa lista. Pulsa “Guardar perfil” para aplicar los cambios.";
});
removePhotoButton.addEventListener("click",()=>{
  photoInput.value="";currentAvatarUrl=null;removeAvatarRequested=true;setAvatar(null);profileMessage.textContent="Se quitará tu foto cuando guardes el perfil.";
});
profileForm.addEventListener("submit",async e=>{
  e.preventDefault();if(!supabase||!currentUser)return;
  const displayName=displayNameInput.value.trim();
  if(displayName.length<2||displayName.length>32){profileMessage.textContent="El nombre debe tener entre 2 y 32 caracteres.";return;}
  const file=photoInput.files?.[0];if(file&&(!ALLOWED_TYPES.includes(file.type)||file.size>MAX_PHOTO_BYTES)){profileMessage.textContent="La imagen debe ser JPG, PNG o WebP y pesar 3 MB o menos.";return;}
  saveProfileButton.disabled=true;saveProfileButton.textContent="Guardando…";profileMessage.textContent="Guardando los cambios…";
  try{
    let avatarUrl=currentAvatarUrl;
    if(file){
      const ext=file.type==="image/png"?"png":file.type==="image/webp"?"webp":"jpg";
      const path=currentUser.id+"/avatar."+ext;
      const {error:uploadError}=await supabase.storage.from("profile-photos").upload(path,file,{upsert:true,contentType:file.type,cacheControl:"3600"});
      if(uploadError)throw uploadError;
      const {data}=supabase.storage.from("profile-photos").getPublicUrl(path);
      avatarUrl=data.publicUrl+(data.publicUrl.includes("?")?"&":"?")+"v="+Date.now();
    }else if(removeAvatarRequested){
      const {data:files}=await supabase.storage.from("profile-photos").list(currentUser.id);
      if(files?.length){const {error:removeError}=await supabase.storage.from("profile-photos").remove(files.map(item=>currentUser.id+"/"+item.name));if(removeError)throw removeError;}
      avatarUrl=null;
    }
    const {error:updateError}=await supabase.from("profiles").update({display_name:displayName,avatar_url:avatarUrl}).eq("id",currentUser.id);
    if(updateError)throw updateError;
    currentAvatarUrl=avatarUrl;removeAvatarRequested=false;photoInput.value="";setAvatar(currentAvatarUrl,currentUser);
    profileWelcomeName.textContent=displayName;
    profileMessage.textContent="¡Perfil guardado! Tu nombre y foto se actualizaron correctamente.";
    window.dispatchEvent(new CustomEvent("sc-profile-updated",{detail:{displayName,avatarUrl}}));
  }catch(error){
    console.error("Could not save SC profile",error);
    profileMessage.textContent=error.message||"No se pudo guardar. Comprueba la configuración de perfiles y fotos en Supabase.";
  }finally{saveProfileButton.disabled=false;saveProfileButton.textContent="GUARDAR PERFIL";}
});
logoutButton.addEventListener("click",async()=>{
  logoutButton.disabled=true;profileMessage.textContent="";
  const {error}=await supabase.auth.signOut();logoutButton.disabled=false;
  if(error){profileMessage.textContent="No se pudo cerrar sesión. Inténtalo de nuevo.";return;}
  showForm();setMode(false);
});
async function init(){
  try{
    const response=await fetch("/api/config",{cache:"no-store"}),config=await response.json();
    if(!response.ok||!config.url||!config.anonKey)throw new Error("CONFIG_MISSING");
    supabaseHost=new URL(config.url).host;
    supabase=createClient(config.url,config.anonKey,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});
    const isRecoveryCallback=new URLSearchParams(window.location.hash.slice(1)).get("type")==="recovery";
    supabase.auth.onAuthStateChange((event,session)=>{
      if(event==="PASSWORD_RECOVERY"){
        accountCard.hidden=true;profileCard.hidden=true;document.getElementById("recoveryCard").hidden=false;
        document.getElementById("recoveryMessage").textContent="Crea una contraseña nueva para tu cuenta SC LATAM.";
      }else if(event==="SIGNED_OUT"||!session){
        document.getElementById("recoveryCard").hidden=true;showForm();
      }else if((event==="SIGNED_IN"||event==="USER_UPDATED")&&!isCompletingRecovery){
        document.getElementById("recoveryCard").hidden=true;setTimeout(()=>loadProfile(session.user),0);
      }
    });
    const {data,error}=await supabase.auth.getSession();if(error)throw error;
    if(isRecoveryCallback){
      accountCard.hidden=true;profileCard.hidden=true;document.getElementById("recoveryCard").hidden=false;
      document.getElementById("recoveryMessage").textContent="Crea una contraseña nueva para tu cuenta SC LATAM.";
    }else if(data.session){await loadProfile(data.session.user);}
  }catch(e){console.error("SC account initialization failed",e);message.textContent="El sistema de cuentas aún no está configurado. El administrador debe completar la configuración de Supabase.";}
}
init();
