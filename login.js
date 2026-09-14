/* ==========================================
   LOGIN
========================================== */
const btnAdministrador   = document.getElementById("btnAdministrador");
const btnUsuario         = document.getElementById("btnUsuario");
const btnPaciente        = document.getElementById("btnPaciente");
const rolSeleccionado    = document.getElementById("rolSeleccionado");
const formLogin          = document.getElementById("formLogin");
const password           = document.getElementById("password");
const mostrarPassword    = document.getElementById("mostrarPassword");
const recordarme         = document.getElementById("recordarme");
const crearUsuario       = document.getElementById("crearUsuario");
const crearPaciente      = document.getElementById("crearPaciente");
const recuperarPassword  = document.getElementById("recuperarPassword");

const modalRegistro      = document.getElementById("modalRegistro");
const formRegistro       = document.getElementById("formRegistro");
const tituloRegistro     = document.getElementById("tituloRegistro");
const cerrarRegistro     = document.getElementById("cerrarRegistro");
const cancelarRegistro   = document.getElementById("cancelarRegistro");

let rolParaRegistro = "Usuario";

/* ==========================================
   INIT
========================================== */
window.addEventListener("DOMContentLoaded", () => {
    DB.inicializar();

    if (Auth.activo()) {
        window.location.href = "app.html";
        return;
    }

    const correoGuardado = localStorage.getItem("correoAgendaMedica");
    if (correoGuardado) {
        document.getElementById("correo").value = correoGuardado;
        recordarme.checked = true;
    }

    Utils.refrescarIconos();

    // Validaciones en vivo en el registro
    Utils.activarValidacion("regNombre", Validar.nombre);
    Utils.activarValidacion("regCorreo", Validar.correo);
    Utils.activarValidacion("regTelefono", Validar.telefono);
});

/* ==========================================
   SELECCIÓN DE ROL
========================================== */
function seleccionarRol(rol) {
    rolSeleccionado.value = rol;
    btnAdministrador.classList.toggle("activo", rol === "Administrador");
    btnUsuario.classList.toggle("activo", rol === "Usuario");
    btnPaciente.classList.toggle("activo", rol === "Paciente");
}
btnAdministrador.addEventListener("click", () => seleccionarRol("Administrador"));
btnUsuario.addEventListener("click", () => seleccionarRol("Usuario"));
btnPaciente.addEventListener("click", () => seleccionarRol("Paciente"));

/* ==========================================
   MOSTRAR CONTRASEÑA (login)
========================================== */
mostrarPassword.addEventListener("click", () => {
    const esPass = password.type === "password";
    password.type = esPass ? "text" : "password";
    mostrarPassword.textContent = esPass ? "🙈" : "👁";
});

/* ==========================================
   LOGIN
========================================== */
formLogin.addEventListener("submit", (e) => {
    e.preventDefault();
    const correo = document.getElementById("correo").value.trim();
    const contra = password.value;
    const rol = rolSeleccionado.value;

    if (!correo || !contra) {
        Utils.toast("Completa todos los campos.", "warning");
        return;
    }
    if (Validar.correo(correo)) {
        Utils.toast("El correo no es válido.", "error");
        return;
    }

    const resultado = Auth.iniciarSesion(correo, contra, rol);

    if (!resultado.ok) {
        Utils.toast(resultado.error, "error");
        password.value = "";
        password.focus();
        return;
    }

    if (recordarme.checked) localStorage.setItem("correoAgendaMedica", correo);
    else localStorage.removeItem("correoAgendaMedica");

    Utils.toast(`Bienvenido, ${resultado.usuario.nombre}`, "success");
    setTimeout(() => { window.location.href = "app.html"; }, 600);
});

/* ==========================================
   REGISTRO
========================================== */
function abrirRegistro(rol) {
    rolParaRegistro = rol;
    tituloRegistro.textContent = `Crear cuenta como ${rol === "Usuario" ? "Médico" : rol}`;
    formRegistro.reset();
    Utils.qsa(".campo", formRegistro).forEach(c => c.classList.remove("campo-error", "campo-ok"));
    Utils.qsa(".error-msg", formRegistro).forEach(e => e.textContent = "");
    modalRegistro.classList.add("activo");
    setTimeout(() => document.getElementById("regNombre").focus(), 100);
}

crearUsuario.addEventListener("click", () => abrirRegistro("Usuario"));
crearPaciente.addEventListener("click", () => abrirRegistro("Paciente"));

function cerrarModalRegistro() { modalRegistro.classList.remove("activo"); }
cerrarRegistro.addEventListener("click", cerrarModalRegistro);
cancelarRegistro.addEventListener("click", cerrarModalRegistro);
modalRegistro.addEventListener("click", (e) => {
    if (e.target === modalRegistro) cerrarModalRegistro();
});

/* Autoformato de teléfono */
document.getElementById("regTelefono").addEventListener("input", (e) => {
    e.target.value = Utils.formatoTelefono(e.target.value);
});

formRegistro.addEventListener("submit", (e) => {
    e.preventDefault();

    const nombre = document.getElementById("regNombre").value.trim();
    const correo = document.getElementById("regCorreo").value.trim();
    const telefono = document.getElementById("regTelefono").value.trim();

    // Validar todos los campos
    const vNombre = Utils.validarCampo("regNombre", Validar.nombre);
    const vCorreo = Utils.validarCampo("regCorreo", Validar.correo);
    const vTel = Utils.validarCampo("regTelefono", Validar.telefono);

    if (!vNombre || !vCorreo || !vTel) {
        Utils.toast("Corrige los campos marcados en rojo.", "error");
        return;
    }

    const usuarios = DB.obtener("usuarios");
    if (usuarios.some(u => u.correo.toLowerCase() === correo.toLowerCase())) {
        Utils.validarCampo("regCorreo", () => "Este correo ya está registrado.");
        Utils.toast("Ya existe una cuenta con ese correo.", "error");
        return;
    }

    // Contraseña por defecto para todos los nuevos usuarios
    const passwordPorDefecto = "12345678";

    let idPacienteVinculado = null;

    // Si es Paciente, crear también su registro de paciente
    if (rolParaRegistro === "Paciente") {
        const partes = nombre.split(" ");
        const nombrePila = partes[0] || nombre;
        const apellidos = partes.slice(1).join(" ") || "";
        const nuevoPacId = Utils.generarId("PAC", "pacientes");

        DB.agregar("pacientes", {
            id: nuevoPacId,
            nombre: nombrePila,
            apellidos: apellidos,
            fechaNacimiento: "",
            sexo: "",
            telefono: telefono,
            correo: correo,
            direccion: "",
            alergias: "",
            antecedentes: "",
            contactoEmergencia: "",
            estado: "Activo",
            fechaRegistro: Utils.hoy()
        });
        idPacienteVinculado = nuevoPacId;
    }

    DB.agregar("usuarios", {
        id: Utils.generarId("USR", "usuarios"),
        nombre, correo, telefono,
        password: passwordPorDefecto,
        rol: rolParaRegistro,
        estado: "Activo",
        fechaRegistro: Utils.hoy(),
        idPaciente: idPacienteVinculado
    });

    Utils.toast(`Cuenta creada. Tu contraseña temporal es: ${passwordPorDefecto}`, "success");
    document.getElementById("correo").value = correo;
    seleccionarRol(rolParaRegistro);
    cerrarModalRegistro();
});

recuperarPassword.addEventListener("click", () => {
    Utils.toast("La recuperación se gestiona con el administrador del sistema.", "info");
});