/* UTILIDADES + VALIDACIONES + ICONOS */

window.App = window.App || { modulos: {} };
App.registrarModulo = function (nombre, config) {
    App.modulos[nombre] = config;
};

/* VALIDADORES */
const Validar = {
    nombre(valor) {
        const v = (valor || "").trim();
        if (v.length < 3) return "Debe tener al menos 3 caracteres.";
        if (!/^[A-Za-zÁÉÍÓÚáéíóúÑñÜü\s'-]+$/.test(v)) return "Solo se permiten letras, espacios y guiones.";
        return null;
    },
    correo(valor) {
        const v = (valor || "").trim();
        if (!v) return "El correo es obligatorio.";
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v)) return "El correo no es válido.";
        return null;
    },
    telefono(valor) {
        const v = (valor || "").replace(/\D/g, "");
        if (!v) return "El teléfono es obligatorio.";
        if (v.length !== 10) return "Debe tener exactamente 10 dígitos.";
        return null;
    },
    password(valor) {
        const v = valor || "";
        if (v.length < 8) return "Mínimo 8 caracteres.";
        if (!/[A-Z]/.test(v)) return "Debe incluir al menos una mayúscula.";
        if (!/[a-z]/.test(v)) return "Debe incluir al menos una minúscula.";
        if (!/[0-9]/.test(v)) return "Debe incluir al menos un número.";
        return null;
    },
    passwordConfirm(valor, original) {
        if (valor !== original) return "Las contraseñas no coinciden.";
        return null;
    },
    fechaNacimiento(valor) {
        if (!valor) return "La fecha es obligatoria.";
        const f = new Date(valor + "T00:00:00");
        const hoy = new Date();
        if (f > hoy) return "La fecha no puede ser futura.";
        const edad = hoy.getFullYear() - f.getFullYear();
        if (edad > 120) return "Fecha no válida.";
        return null;
    },
    requerido(valor) {
        if (!valor || !String(valor).trim()) return "Este campo es obligatorio.";
        return null;
    }
};

/* ICONO SVG (Lucide) */
const Icono = (nombre, tamaño = 18) =>
    `<i data-lucide="${nombre}" style="width:${tamaño}px;height:${tamaño}px"></i>`;

/* UTILS */
const Utils = {
    el(id) { return document.getElementById(id); },
    qs(s, c = document) { return c.querySelector(s); },
    qsa(s, c = document) { return [...c.querySelectorAll(s)]; },

    esc(str) {
        if (str === null || str === undefined) return "";
        return String(str).replace(/[&<>"']/g, c => ({
            "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
        }[c]));
    },

    generarId(prefijo, coleccion) {
        const arr = DB.obtener(coleccion);
        const nums = arr.map(x => parseInt(String(x.id).replace(/\D/g, "")) || 0);
        const max = nums.length ? Math.max(...nums) : 0;
        return `${prefijo}-${String(max + 1).padStart(4, "0")}`;
    },

    hoy() { return new Date().toISOString().split("T")[0]; },

    fecha(f) {
        if (!f) return "—";
        const d = new Date(f + "T00:00:00");
        return d.toLocaleDateString("es-MX", { day: "2-digit", month: "2-digit", year: "numeric" });
    },

    fechaLarga(f) {
        if (!f) return "—";
        const d = new Date(f + "T00:00:00");
        const s = d.toLocaleDateString("es-MX", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
        return s.charAt(0).toUpperCase() + s.slice(1);
    },

    fechaCorta(f) {
        if (!f) return "—";
        const d = new Date(f + "T00:00:00");
        return d.toLocaleDateString("es-MX", { day: "numeric", month: "short" });
    },

    edad(fechaNac) {
        if (!fechaNac) return "—";
        const hoy = new Date(), nac = new Date(fechaNac);
        let e = hoy.getFullYear() - nac.getFullYear();
        const m = hoy.getMonth() - nac.getMonth();
        if (m < 0 || (m === 0 && hoy.getDate() < nac.getDate())) e--;
        return e;
    },

    iniciales(nombre) {
        if (!nombre) return "?";
        const p = nombre.trim().split(/\s+/);
        if (p.length === 1) return p[0].charAt(0).toUpperCase();
        return (p[0].charAt(0) + p[p.length - 1].charAt(0)).toUpperCase();
    },

    formatoTelefono(valor) {
        const v = String(valor || "").replace(/\D/g, "").slice(0, 10);
        if (v.length <= 2) return v;
        if (v.length <= 6) return `${v.slice(0, 2)}-${v.slice(2)}`;
        return `${v.slice(0, 2)}-${v.slice(2, 6)}-${v.slice(6)}`;
    },

    /* Tiempo relativo: "hace 5 min", "hace 2h", "hace 3 días" */
    tiempoRelativo(fechaISO) {
        const fecha = new Date(fechaISO);
        const ahora = new Date();
        const seg = Math.floor((ahora - fecha) / 1000);
        if (seg < 60) return "hace unos segundos";
        const min = Math.floor(seg / 60);
        if (min < 60) return `hace ${min} min`;
        const horas = Math.floor(min / 60);
        if (horas < 24) return `hace ${horas}h`;
        const dias = Math.floor(horas / 24);
        if (dias < 7) return `hace ${dias} día${dias > 1 ? "s" : ""}`;
        return fecha.toLocaleDateString("es-MX", { day: "2-digit", month: "short" });
    },

    toast(msg, tipo = "info") {
        const cont = Utils.el("toastContainer");
        if (!cont) return alert(msg);
        const ic = { success: "✓", error: "✕", warning: "⚠", info: "ℹ" };
        const d = document.createElement("div");
        d.className = `toast toast-${tipo}`;
        d.innerHTML = `<span class="toast-icono">${ic[tipo] || "ℹ"}</span><span>${Utils.esc(msg)}</span>`;
        cont.appendChild(d);
        setTimeout(() => {
            d.classList.add("toast-salir");
            setTimeout(() => d.remove(), 300);
        }, 3200);
    },

    confirmar(msg, titulo = "Confirmar", textoBoton = "Confirmar") {
        return new Promise(resolve => {
            const m = Utils.el("modalConfirmar");
            Utils.el("confirmarTitulo").textContent = titulo;
            Utils.el("confirmarMensaje").textContent = msg;
            const btnSi = Utils.el("confirmarSi");
            btnSi.textContent = textoBoton;
            m.classList.add("activo");
            const si = Utils.el("confirmarSi");
            const no = Utils.el("confirmarNo");
            const cerrar = (r) => {
                m.classList.remove("activo");
                si.removeEventListener("click", onSi);
                no.removeEventListener("click", onNo);
                resolve(r);
            };
            const onSi = () => cerrar(true);
            const onNo = () => cerrar(false);
            si.addEventListener("click", onSi);
            no.addEventListener("click", onNo);
        });
    },

    vacio(msg, icono = "inbox", accion = "") {
        return `<div class="estado-vacio">
            <div class="estado-vacio-icono">${Icono(icono, 44)}</div>
            <p>${Utils.esc(msg)}</p>
            ${accion}
        </div>`;
    },

    /* SKELETON */
    skeletonTabla(columnas = 5, filas = 6) {
        return Array(filas).fill(0).map(() =>
            `<tr>${Array(columnas).fill(0).map((_, i) =>
                `<td><div class="skeleton-line ${i === 0 ? "" : "short"}"></div></td>`
            ).join("")}</tr>`
        ).join("");
    },

    /* PAGINACIÓN */
    paginar(lista, pagina, porPagina = 10) {
        const total = lista.length;
        const paginas = Math.max(1, Math.ceil(total / porPagina));
        const p = Math.min(Math.max(1, pagina), paginas);
        const inicio = (p - 1) * porPagina;
        return {
            items: lista.slice(inicio, inicio + porPagina),
            total, paginas, pagina: p,
            inicio: total === 0 ? 0 : inicio + 1,
            fin: Math.min(inicio + porPagina, total)
        };
    },

    controlesPaginacion(info, idContenedor) {
        if (info.total === 0) return "";
        const btn = (n, texto = n, activo = false, disabled = false) =>
            `<button class="pag-btn ${activo ? "activo" : ""}" data-pag="${n}" ${disabled ? "disabled" : ""}>${texto}</button>`;

        let botones = "";
        for (let i = 1; i <= info.paginas; i++) {
            if (i === 1 || i === info.paginas || Math.abs(i - info.pagina) <= 1) {
                botones += btn(i, i, i === info.pagina);
            } else if (Math.abs(i - info.pagina) === 2) {
                botones += `<span style="padding:0 6px;color:var(--text-3)">…</span>`;
            }
        }

        return `<div class="paginacion" id="${idContenedor}">
            <div class="paginacion-info">Mostrando <b>${info.inicio}-${info.fin}</b> de <b>${info.total}</b></div>
            <div class="paginacion-controles">
                ${btn(info.pagina - 1, "‹", false, info.pagina === 1)}
                ${botones}
                ${btn(info.pagina + 1, "›", false, info.pagina === info.paginas)}
            </div>
        </div>`;
    },

    /* SLOTS DE HORA según configuración */
    slotsHorarios() {
        const conf = DB.config();
        const [hIni, mIni] = (conf.horaInicio || "09:00").split(":").map(Number);
        const [hFin, mFin] = (conf.horaFin || "18:00").split(":").map(Number);
        const duracion = conf.duracionCita || 30;

        const slots = [];
        let t = hIni * 60 + mIni;
        const fin = hFin * 60 + mFin;

        while (t < fin) {
            const h = String(Math.floor(t / 60)).padStart(2, "0");
            const m = String(t % 60).padStart(2, "0");
            slots.push(`${h}:${m}`);
            t += duracion;
        }
        return slots;
    },

    /* Genera fechas de la semana (lunes a domingo) */
    semanaDe(fechaISO) {
        const f = new Date(fechaISO + "T00:00:00");
        const dia = f.getDay();
        const offsetLunes = dia === 0 ? -6 : 1 - dia;
        const lunes = new Date(f);
        lunes.setDate(f.getDate() + offsetLunes);

        const dias = [];
        for (let i = 0; i < 7; i++) {
            const d = new Date(lunes);
            d.setDate(lunes.getDate() + i);
            dias.push(d.toISOString().split("T")[0]);
        }
        return dias;
    },

    /* Genera la cuadrícula de un mes (42 días incluyendo relleno) */
    mesDe(fechaISO) {
        const f = new Date(fechaISO + "T00:00:00");
        const año = f.getFullYear();
        const mes = f.getMonth();

        const primerDia = new Date(año, mes, 1);
        const ultimoDia = new Date(año, mes + 1, 0);

        const offsetInicio = primerDia.getDay() === 0 ? 6 : primerDia.getDay() - 1;
        const inicio = new Date(primerDia);
        inicio.setDate(primerDia.getDate() - offsetInicio);

        const dias = [];
        for (let i = 0; i < 42; i++) {
            const d = new Date(inicio);
            d.setDate(inicio.getDate() + i);
            dias.push({
                fecha: d.toISOString().split("T")[0],
                dia: d.getDate(),
                esDelMes: d.getMonth() === mes,
                esHoy: d.toISOString().split("T")[0] === Utils.hoy()
            });
        }
        return { dias, año, mes };
    },

    nombreMes(fechaISO) {
        const d = new Date(fechaISO + "T00:00:00");
        const s = d.toLocaleDateString("es-MX", { month: "long", year: "numeric" });
        return s.charAt(0).toUpperCase() + s.slice(1);
    },

    /* ¿Hay conflicto de horario? */
    hayConflictoHorario(fecha, hora, idExcluir = null) {
        return DB.obtener("citas").some(c =>
            c.fecha === fecha &&
            c.hora === hora &&
            c.id !== idExcluir &&
            c.estado !== "Cancelada" &&
            c.estado !== "No asistió"
        );
    },

    /* Campos de formulario */
    campoPassword({ id, label, valor = "", requerido = true, placeholder = "Mínimo 8 caracteres", ayuda = "" }) {
        return `<div class="campo campo-completo" data-campo="${id}">
            <label for="${id}">${Utils.esc(label)}${requerido ? ' <span class="req">*</span>' : ""}</label>
            <div class="input-pass-wrapper">
                <input type="password" id="${id}" class="input" value="${Utils.esc(valor)}"
                       placeholder="${Utils.esc(placeholder)}" ${requerido ? "required" : ""} autocomplete="new-password">
                <button type="button" class="btn-toggle-pass" data-target="${id}" title="Mostrar contraseña">
                    ${Icono("eye", 16)}
                </button>
            </div>
            <small class="ayuda">${Utils.esc(ayuda || "Mínimo 8 caracteres, con mayúscula, minúscula y número.")}</small>
            <small class="error-msg"></small>
        </div>`;
    },

    campo({ id, label, tipo = "text", valor = "", requerido = false, placeholder = "", opciones = null, ancho = "completo", ayuda = "", maxlength = "", soloLectura = false, min = "", max = "" }) {
        let input;
        const readonly = soloLectura ? "readonly" : "";
        if (tipo === "select" && opciones) {
            input = `<select id="${id}" class="input" ${requerido ? "required" : ""}>
                ${opciones.map(o => `<option value="${Utils.esc(o.valor)}" ${String(o.valor) === String(valor) ? "selected" : ""} ${o.disabled ? "disabled" : ""}>${Utils.esc(o.etiqueta)}</option>`).join("")}
            </select>`;
        } else if (tipo === "textarea") {
            input = `<textarea id="${id}" class="input" placeholder="${Utils.esc(placeholder)}" ${requerido ? "required" : ""} rows="3">${Utils.esc(valor)}</textarea>`;
        } else {
            input = `<input type="${tipo}" id="${id}" class="input" value="${Utils.esc(valor)}" placeholder="${Utils.esc(placeholder)}" ${requerido ? "required" : ""} ${maxlength ? `maxlength="${maxlength}"` : ""} ${min ? `min="${min}"` : ""} ${max ? `max="${max}"` : ""} ${readonly}>`;
        }
        return `<div class="campo campo-${ancho}" data-campo="${id}">
            <label for="${id}">${Utils.esc(label)}${requerido ? ' <span class="req">*</span>' : ""}</label>
            ${input}
            ${ayuda ? `<small class="ayuda">${Utils.esc(ayuda)}</small>` : ""}
            <small class="error-msg"></small>
        </div>`;
    },

    validarCampo(id, validador) {
        const input = Utils.el(id);
        if (!input) return true;
        const contenedor = input.closest(".campo");
        const errorEl = contenedor.querySelector(".error-msg");
        const error = validador ? validador(input.value) : null;

        contenedor.classList.remove("campo-error", "campo-ok");
        errorEl.textContent = "";

        if (error) {
            contenedor.classList.add("campo-error");
            errorEl.textContent = error;
            return false;
        }
        if (input.value.trim()) contenedor.classList.add("campo-ok");
        return true;
    },

    activarValidacion(id, validador) {
        const input = Utils.el(id);
        if (!input) return;
        input.addEventListener("blur", () => Utils.validarCampo(id, validador));
        input.addEventListener("input", () => {
            if (input.closest(".campo").classList.contains("campo-error")) {
                Utils.validarCampo(id, validador);
            }
        });
    },

    activarOjosPassword(scope = document) {
        Utils.qsa(".btn-toggle-pass", scope).forEach(btn => {
            if (btn.dataset.activado) return;
            btn.dataset.activado = "1";
            btn.addEventListener("click", () => {
                const input = Utils.el(btn.dataset.target);
                if (!input) return;
                const mostrar = input.type === "password";
                input.type = mostrar ? "text" : "password";
                btn.innerHTML = mostrar ? Icono("eye-off", 16) : Icono("eye", 16);
                btn.title = mostrar ? "Ocultar contraseña" : "Mostrar contraseña";
                if (window.lucide) lucide.createIcons();
            });
        });
    },

    campoBloqueado(texto = "Información restringida") {
        return `<span class="campo-bloqueado" title="${Utils.esc(texto)}">
            ${Icono("lock", 14)} <em>${Utils.esc(texto)}</em>
        </span>`;
    },

    badgeCita(estado) {
        const mapa = {
            "Pendiente": "badge-en-espera",
            "Programada": "badge-programada",
            "Confirmada": "badge-confirmada",
            "En espera": "badge-en-espera",
            "En consulta": "badge-en-consulta",
            "Atendida": "badge-atendida",
            "Cancelada": "badge-cancelada",
            "No asistió": "badge-no-asistio"
        };
        return mapa[estado] || "badge-activo";
    },

    refrescarIconos() {
        if (window.lucide) lucide.createIcons();
    },

    /* Nombre del mes abreviado */
    mesesCortos: ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"],
    diasCortos: ["L", "M", "M", "J", "V", "S", "D"]
};

/* MODAL GENÉRICO */
const Modal = {
    abrir({ titulo, cuerpo, footer = "", tamaño = "" }) {
        const m = Utils.el("modal");
        const mc = Utils.el("modalContenido");
        mc.className = "modal-contenido" + (tamaño ? " modal-" + tamaño : "");
        Utils.el("modalTitulo").textContent = titulo;
        Utils.el("modalBody").innerHTML = cuerpo;
        const f = Utils.el("modalFooter");
        f.innerHTML = footer;
        f.style.display = footer ? "flex" : "none";
        m.classList.add("activo");
        Utils.refrescarIconos();
    },
    cerrar() {
        const m = Utils.el("modal");
        m.classList.remove("activo");
        Utils.el("modalBody").innerHTML = "";
        Utils.el("modalFooter").innerHTML = "";
    }
};