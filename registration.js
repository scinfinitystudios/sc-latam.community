function enviarExito() {
  const msg = document.getElementById("successMessage");

  if (msg) {
    msg.style.display = "block";
    setTimeout(() => {
      msg.style.display = "none";
    }, 3000);
  }
}
