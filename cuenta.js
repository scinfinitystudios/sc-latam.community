import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const form=document.getElementById("accountForm");
const emailInput=document.getElementById("accountEmail");
const passwordInput=document.getElementById("accountPassword");
const message=document.getElementById("accountMessage");
const title=document.getElementById("formTitle");
const intro=document.getElementById("formIntro");
const eyebrow=document.getElementById("formEyebrow");
const submit=document.getElementById("submitButton");
const togglePrompt=document.getElementById("togglePrompt");
const toggle=document.getElementById("toggleMode");
const accountCard=document.getElementById("accountCard");
const profileCard=document.getElementById("profileCard");
const profileEmail=document.getElementById("profileEmail");
const profileMessage=document.getElementById("profileMessage");
const logoutButton=document.getElementById("logoutButton");
const profileForm=document.getElementById("profileForm");
const displayNameInput=document.getElementById("displayName");
const profileAvatar=document.getElementById("profileAvatar");
const photoInput=document.getElementById("profilePhotoInput");
const choosePhotoButton=document.getElementById("choosePhotoButton");
const removePhotoButton=document.getElementById("removePhotoButton");
const saveProfileButton=document.getElementById("saveProfileButton");

let supabase=null,signUpMode=false,currentUser=null,currentAvatarUrl=null,removeAvatarRequested=false;
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
  removePhotoButton.hidden=!url;
}
async function loadProfile(user){
  currentUser=user;accountCard.hidden=true;profileCard.hidden=false;
  profileEmail.textContent=user.email||"Cuenta SC LATAM";
  profileMessage.textContent="Cargando tu perfil…";
  try{
    const {data,error}=await supabase.from("profiles").select("display_name,avatar_url").eq("id",user.id).maybeSingle();
    if(error)throw error;
    displayNameInput.value=data?.display_name||user.user_metadata?.display_name||"";
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
form.addEventListener("submit",async e=>{
  e.preventDefault();if(!supabase){message.textContent="El sistema de cuentas aún no está configurado. Inténtalo más tarde.";return;}
  submit.disabled=true;submit.textContent=signUpMode?"Creando cuenta…":"Iniciando sesión…";message.textContent="";
  try{
    const email=emailInput.value.trim(),password=passwordInput.value;
    if(signUpMode){
      const {data,error}=await supabase.auth.signUp({email,password});if(error)throw error;
      if(data.session){await loadProfile(data.user);return;}
      message.textContent="Cuenta creada. Revisa tu correo para confirmar la dirección y luego inicia sesión.";
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
    supabase=createClient(config.url,config.anonKey,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});
    const {data,error}=await supabase.auth.getSession();if(error)throw error;
    if(data.session)await loadProfile(data.session.user);
    supabase.auth.onAuthStateChange((event,session)=>{
      if(event==="SIGNED_OUT"||!session)showForm();
      else if(event==="SIGNED_IN"||event==="USER_UPDATED")setTimeout(()=>loadProfile(session.user),0);
    });
  }catch(e){console.error("SC account initialization failed",e);message.textContent="El sistema de cuentas aún no está configurado. El administrador debe completar la configuración de Supabase.";}
}
init();
