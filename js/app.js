/* APP SHELL + ROUTER */

const NAV_ITEMS = [
    { grupo: "Principal", items: [
        { id: "dashboard", icono: "layout-dashboard", texto: "Inicio" }
    ]},
    { grupo: "Gestión médica", items: [
        { id: "pacientes", icono: "users",          texto: "Pacientes", roles: ["Administrador", "Usuario"] },
        { id: "citas",     icono: "calendar",       texto: "Citas",     roles: ["Administrador", "Usuario", "Paciente"] },
        { id: "consultas", icono: "stethoscope",    texto: "Consultas", roles: ["Administrador", "Usuario", "Paciente"] },
        { id: "recetas",   icono: "pill",           texto: "Recetas",   roles: ["Administrador", "Usuario", "Paciente"] },
        { id: "historia",  icono: "clipboard-list", texto: "Historia",  roles: ["Administrador", "Usuario", "Paciente"] }
    ]},
    { grupo: "Administración", items: [
        { id: "configuracion", icono: "settings", texto: "Configuración", roles: ["Administrador"] }
    ]}
];

App.moduloActual = null;

App.iniciar = function () {
    if (!Auth.activo()) {
        window.location.href = "login.html";
        return;
    }

    this.aplicarTema(DB.obtenerTema());
    this.renderSidebar();
    this.renderHeader();
    this.conectarModales();
    this.conectarBusquedaGlobal();

    window.addEventListener("hashchange", () => this.aplicarHash());
    Utils.el("sidebarOverlay").addEventListener("click", () => this.cerrarSidebar());

    document.addEventListener("keydown", (e) => {
        if ((e.ctrlKey || e.metaKey) && e.key === "k") {
            e.preventDefault();
            this.abrirBusqueda();
        }
        if (e.key === "Escape") {
            Utils.qsa(".dropdown").forEach(d => d.classList.remove("activo"));
        }
    });

    if (!window.location.hash) {
        window.location.hash = "#dashboard";
    } else {
        this.aplicarHash();
    }
};

App.aplicarTema = function (tema) {
    document.documentElement.setAttribute("data-tema", tema === "oscuro" ? "oscuro" : "");
};

App.toggleTema = function () {
    const actual = DB.obtenerTema();
    const nuevo = actual === "oscuro" ? "claro" : "oscuro";
    DB.guardarTema(nuevo);
    this.aplicarTema(nuevo);
    this.renderHeader();
    Utils.toast(`Modo ${nuevo} activado`, "success");
};

App.aplicarHash = function () {
    const ruta = (window.location.hash || "#dashboard").slice(1);
    this.navegar(ruta, false);
};

App.navegar = function (id, cambiarHash = true) {
    if (!Auth.puedeModulo(id)) {
        Utils.el("modalDenegado").classList.add("activo");
        if (cambiarHash) window.location.hash = "#dashboard";
        return;
    }

    if (!App.modulos[id]) {
        Utils.toast("Módulo no disponible.", "error");
        return;
    }

    this.moduloActual = id;
    Utils.qsa(".nav-item").forEach(n => n.classList.toggle("activo", n.dataset.modulo === id));

    const contenido = Utils.el("contenido");
    contenido.innerHTML = `<div class="vista" style="padding:20px 0">
        <div class="skeleton-line" style="width:30%;height:24px;margin-bottom:18px"></div>
        <div class="skeleton-line short" style="margin-bottom:26px"></div>
        <div class="skeleton-line" style="width:100%;height:80px;margin-bottom:12px"></div>
        <div class="skeleton-line" style="width:100%;height:80px"></div>
    </div>`;

    setTimeout(() => {
        contenido.innerHTML = "";
        App.modulos[id].render(contenido);

        const config = App.modulos[id];
        Utils.el("headerTitulo").textContent = config.titulo;
        Utils.el("headerSubtitulo").textContent = config.sub || "";
        Utils.refrescarIconos();
    }, 100);

    this.cerrarSidebar();
    if (cambiarHash && window.location.hash !== "#" + id) {
        window.location.hash = "#" + id;
    }
    window.scrollTo({ top: 0, behavior: "smooth" });
};

App.renderSidebar = function () {
    const sesion = Auth.sesion();
    let html = `
        <div class="sidebar-logo">
            <div class="logo-circulo">+</div>
            <div class="logo-texto">
                <h2>Agenda Médica</h2>
                <p>Panel de gestión</p>
            </div>
        </div>
        <nav class="sidebar-nav">
    `;

    NAV_ITEMS.forEach(grupo => {
        const items = grupo.items.filter(it =>
            (!it.roles || it.roles.includes(sesion.rol))
        );
        if (!items.length) return;
        html += `<div class="nav-grupo">${grupo.grupo}</div>`;
        items.forEach(it => {
            html += `<button class="nav-item" data-modulo="${it.id}">
                <span class="nav-icono">${Icono(it.icono, 17)}</span>
                <span>${it.texto}</span>
            </button>`;
        });
    });

    html += `</nav>
        <div class="sidebar-pie">
            <div class="usuario-pie">
                <div class="usuario-pie-avatar">${Utils.iniciales(sesion.nombre)}</div>
                <div class="usuario-pie-info">
                    <strong>${Utils.esc(sesion.nombre)}</strong>
                    <span>${sesion.rol === "Usuario" ? "Médico" : Utils.esc(sesion.rol)}</span>
                </div>
            </div>
        </div>`;

    Utils.el("sidebar").innerHTML = html;
    Utils.qsa(".nav-item").forEach(n => n.addEventListener("click", () => this.navegar(n.dataset.modulo)));
    Utils.refrescarIconos();
};

App.renderHeader = function () {
    const sesion = Auth.sesion();
    const tema = DB.obtenerTema();
    const eventos = this.obtenerEventosNotificacion();

    Utils.el("header").innerHTML = `
        <div class="header-izq">
            <button class="hamburguesa" id="btnHamburguesa">${Icono("menu", 22)}</button>
            <div class="header-titulo">
                <h1 id="headerTitulo">Inicio</h1>
                <p id="headerSubtitulo">Bienvenido</p>
            </div>
        </div>

        <div class="header-buscador" onclick="App.abrirBusqueda()">
            <span class="header-buscador-icono">${Icono("search", 15)}</span>
            <input type="text" readonly placeholder="Buscar paciente, cita o consulta...">
            <kbd>Ctrl K</kbd>
        </div>

        <div class="header-der">
            <button class="header-btn" id="btnTema" title="Cambiar tema">
                ${Icono(tema === "oscuro" ? "sun" : "moon", 18)}
            </button>
            <button class="header-btn" id="btnNotif" title="Notificaciones">
                ${Icono("bell", 18)}
                ${eventos.length > 0 ? `<span class="badge-notif">${eventos.length}</span>` : ""}
            </button>
            <button class="header-perfil" id="btnPerfil">
                <div class="header-perfil-avatar">${Utils.iniciales(sesion.nombre)}</div>
                <span class="header-perfil-nombre">${Utils.esc(sesion.nombre)}</span>
                ${Icono("chevron-down", 14)}
            </button>

            <div class="dropdown dropdown-wide" id="dropNotif">
                <div class="dropdown-header">
                    <strong>Notificaciones</strong>
                    <span>${eventos.length} evento(s) reciente(s)</span>
                </div>
                ${eventos.length ? eventos.map(ev => `
                    <div class="notif-item">
                        <div class="notif-item-icono">${Icono(ev.icono, 14)}</div>
                        <div class="notif-item-info">
                            <strong>${Utils.esc(ev.titulo)}</strong>
                            <span>${Utils.esc(ev.detalle)}</span>
                            <span class="notif-item-tiempo">${Utils.tiempoRelativo(ev.fecha)}</span>
                        </div>
                    </div>
                `).join("") : `<div class="notif-vacia">Sin notificaciones</div>`}
            </div>

            <div class="dropdown" id="dropPerfil">
                <div class="dropdown-header">
                    <strong>${Utils.esc(sesion.nombre)}</strong>
                    <span>${Utils.esc(sesion.correo)}</span>
                </div>
                <button class="dropdown-item" data-ir="perfil">${Icono("user", 15)} Mi perfil</button>
                ${Auth.esAdmin() ? `<button class="dropdown-item" data-ir="configuracion">${Icono("settings", 15)} Configuración</button>` : ""}
                <div class="dropdown-div"></div>
                <button class="dropdown-item peligro" id="btnSalir">${Icono("log-out", 15)} Cerrar sesión</button>
            </div>
        </div>
    `;

    Utils.el("btnHamburguesa").addEventListener("click", () => this.abrirSidebar());
    Utils.el("btnTema").addEventListener("click", () => this.toggleTema());
    Utils.el("btnNotif").addEventListener("click", (e) => {
        e.stopPropagation();
        this.toggleDropdown("dropNotif");
    });
    Utils.el("btnPerfil").addEventListener("click", (e) => {
        e.stopPropagation();
        this.toggleDropdown("dropPerfil");
    });
    Utils.el("btnSalir").addEventListener("click", () => {
        Auth.cerrarSesion();
        window.location.href = "login.html";
    });
    Utils.qsa("[data-ir]").forEach(b => b.addEventListener("click", () => this.navegar(b.dataset.ir)));

    document.addEventListener("click", (e) => {
        if (!e.target.closest(".header-der")) {
            Utils.qsa(".dropdown").forEach(d => d.classList.remove("activo"));
        }
    });

    Utils.refrescarIconos();
};

App.obtenerEventosNotificacion = function () {
    const eventos = [];
    const hoy = Utils.hoy();
    const ahora = new Date();
    const sesion = Auth.sesion();

    let citas = DB.obtener("citas").filter(c => c.fecha === hoy && c.estado !== "Cancelada" && c.estado !== "No asistió");
    if (sesion.rol === "Paciente") {
        citas = citas.filter(c => c.idPaciente === sesion.idPaciente);
    }

    citas.forEach(c => {
        const minutosRestantes = (parseInt(c.hora.split(":")[0]) * 60 + parseInt(c.hora.split(":")[1])) -
                                 (ahora.getHours() * 60 + ahora.getMinutes());
        const p = DB.porId("pacientes", c.idPaciente);
        if (minutosRestantes >= 0 && minutosRestantes <= 120) {
            eventos.push({
                icono: "clock",
                titulo: `Cita en ${minutosRestantes} min`,
                detalle: `${p ? p.nombre + " " + p.apellidos : "Paciente"} · ${c.motivo}`,
                fecha: new Date().toISOString()
            });
        }
    });

    if (sesion.rol !== "Paciente") {
        const actividad = DB.obtenerActividad(5);
        actividad.forEach(a => {
            const iconoPorTipo = {
                paciente: "user",
                cita: "calendar",
                consulta: "stethoscope",
                receta: "pill",
                usuario: "user-cog"
            };
            eventos.push({
                icono: iconoPorTipo[a.tipo] || "activity",
                titulo: a.descripcion,
                detalle: `por ${a.usuario}`,
                fecha: a.fecha
            });
        });
    }

    return eventos.slice(0, 8);
};

App.conectarBusquedaGlobal = function () {
    const modal = Utils.el("modalBusqueda");
    const input = Utils.el("busquedaGlobalInput");
    const cont = Utils.el("resultadosBusqueda");

    input.addEventListener("input", (e) => {
        const q = e.target.value.trim();
        if (q.length < 2) {
            cont.innerHTML = `<div style="text-align:center;padding:30px;color:var(--text-3);font-size:13px">
                Escribe al menos 2 caracteres para buscar
            </div>`;
            return;
        }
        cont.innerHTML = this.buscarGlobal(q);
        this.conectarResultadosBusqueda();
    });

    document.addEventListener("keydown", (e) => {
        if (e.key === "Escape" && modal.classList.contains("activo")) {
            modal.classList.remove("activo");
        }
    });

    modal.addEventListener("click", (e) => {
        if (e.target === modal) modal.classList.remove("activo");
    });
};

App.abrirBusqueda = function () {
    Utils.el("modalBusqueda").classList.add("activo");
    Utils.el("resultadosBusqueda").innerHTML = `<div style="text-align:center;padding:30px;color:var(--text-3);font-size:13px">
        Escribe al menos 2 caracteres para buscar
    </div>`;
    setTimeout(() => {
        Utils.el("busquedaGlobalInput").value = "";
        Utils.el("busquedaGlobalInput").focus();
    }, 100);
    Utils.refrescarIconos();
};

App.buscarGlobal = function (query) {
    const q = query.toLowerCase();
    const sesion = Auth.sesion();
    const resultados = { pacientes: [], consultas: [], recetas: [] };

    let pacientes = DB.obtener("pacientes");
    let consultas = DB.obtener("consultas");
    let recetas = DB.obtener("recetas");

    if (sesion.rol === "Paciente") {
        pacientes = pacientes.filter(p => p.id === sesion.idPaciente);
        consultas = consultas.filter(c => c.idPaciente === sesion.idPaciente);
        recetas = recetas.filter(r => r.idPaciente === sesion.idPaciente);
    }

    resultados.pacientes = pacientes.filter(p =>
        `${p.nombre} ${p.apellidos}`.toLowerCase().includes(q) ||
        (p.telefono || "").includes(q)
    ).slice(0, 4);

    resultados.consultas = consultas.filter(c => {
        const p = DB.porId("pacientes", c.idPaciente);
        return `${p?.nombre || ""} ${p?.apellidos || ""} ${c.motivo} ${c.diagnostico || ""}`.toLowerCase().includes(q);
    }).slice(0, 4);

    resultados.recetas = recetas.filter(r => {
        const p = DB.porId("pacientes", r.idPaciente);
        const meds = (r.medicamentos || []).map(m => m.medicamento).join(" ");
        return `${p?.nombre || ""} ${p?.apellidos || ""} ${meds}`.toLowerCase().includes(q);
    }).slice(0, 4);

    const total = resultados.pacientes.length + resultados.consultas.length + resultados.recetas.length;

    if (!total) {
        return `<div style="text-align:center;padding:30px;color:var(--text-3);font-size:13px">
            No se encontraron resultados para "<b>${Utils.esc(query)}</b>"
        </div>`;
    }

    let html = "";

    if (resultados.pacientes.length) {
        html += `<div class="resultado-grupo">
            <div class="resultado-grupo-titulo">👥 Pacientes (${resultados.pacientes.length})</div>
            ${resultados.pacientes.map(p => `
                <div class="resultado-item" data-tipo="paciente" data-id="${p.id}">
                    <div class="resultado-item-icono">${Icono("user", 16)}</div>
                    <div class="resultado-item-info">
                        <strong>${Utils.esc(p.nombre)} ${Utils.esc(p.apellidos)}</strong>
                        <span>${Utils.edad(p.fechaNacimiento)} años · ${Utils.esc(p.telefono || "—")}</span>
                    </div>
                </div>`).join("")}
        </div>`;
    }

    if (resultados.consultas.length) {
        html += `<div class="resultado-grupo">
            <div class="resultado-grupo-titulo">🩺 Consultas (${resultados.consultas.length})</div>
            ${resultados.consultas.map(c => {
                const p = DB.porId("pacientes", c.idPaciente);
                return `<div class="resultado-item" data-tipo="consulta" data-id="${c.id}">
                    <div class="resultado-item-icono">${Icono("stethoscope", 16)}</div>
                    <div class="resultado-item-info">
                        <strong>${Utils.esc(p ? p.nombre + " " + p.apellidos : "—")}</strong>
                        <span>${Utils.fecha(c.fecha)} · ${Utils.esc(c.motivo)}</span>
                    </div>
                </div>`;
            }).join("")}
        </div>`;
    }

    if (resultados.recetas.length) {
        html += `<div class="resultado-grupo">
            <div class="resultado-grupo-titulo">💊 Recetas (${resultados.recetas.length})</div>
            ${resultados.recetas.map(r => {
                const p = DB.porId("pacientes", r.idPaciente);
                return `<div class="resultado-item" data-tipo="receta" data-id="${r.id}">
                    <div class="resultado-item-icono">${Icono("pill", 16)}</div>
                    <div class="resultado-item-info">
                        <strong>${Utils.esc(p ? p.nombre + " " + p.apellidos : "—")}</strong>
                        <span>${Utils.fecha(r.fecha)} · ${(r.medicamentos || []).length} medicamento(s)</span>
                    </div>
                </div>`;
            }).join("")}
        </div>`;
    }

    return html;
};

App.conectarResultadosBusqueda = function () {
    Utils.qsa(".resultado-item").forEach(item => {
        item.addEventListener("click", () => {
            const tipo = item.dataset.tipo;
            const id = item.dataset.id;
            Utils.el("modalBusqueda").classList.remove("activo");

            if (tipo === "paciente") {
                Historia.pacienteId = id;
                App.navegar("historia");
            } else if (tipo === "consulta") {
                App.navegar("consultas");
                setTimeout(() => Consultas.ver(id), 200);
            } else if (tipo === "receta") {
                App.navegar("recetas");
                setTimeout(() => Recetas.ver(id), 200);
            }
        });
    });
};

App.toggleDropdown = function (idDrop) {
    const drop = Utils.el(idDrop);
    const estabaActivo = drop.classList.contains("activo");
    Utils.qsa(".dropdown").forEach(d => d.classList.remove("activo"));
    if (!estabaActivo) drop.classList.add("activo");
};

App.abrirSidebar = function () {
    Utils.el("sidebar").classList.add("abierto");
    Utils.el("sidebarOverlay").classList.add("activo");
};

App.cerrarSidebar = function () {
    Utils.el("sidebar").classList.remove("abierto");
    Utils.el("sidebarOverlay").classList.remove("activo");
};

App.conectarModales = function () {
    Utils.el("modalCerrar").addEventListener("click", () => Modal.cerrar());
    Utils.el("modal").addEventListener("click", (e) => {
        if (e.target === Utils.el("modal")) Modal.cerrar();
    });
};

window.addEventListener("DOMContentLoaded", () => App.iniciar());