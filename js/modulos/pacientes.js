App.registrarModulo("pacientes", {
    titulo: "Pacientes",
    sub: "Administra la información de tus pacientes",
    _filtro: "",
    _estado: "Activo",
    _sexo: "",
    _pagina: 1,
    _porPagina: 10,

    render(c) {
        // ✅ BLOQUEO: Pacientes no pueden acceder a este módulo
        if (Auth.sesion().rol === "Paciente") {
            c.innerHTML = `<div class="vista">${Utils.vacio("No tienes acceso a este módulo", "ban")}</div>`;
            Utils.refrescarIconos();
            return;
        }

        c.innerHTML = `
        <div class="vista">
            <div class="vista-enc">
                <div>
                    <h2 class="vista-titulo">Pacientes</h2>
                    <p class="vista-sub">Administra la información de tus pacientes</p>
                </div>
                <div class="vista-acciones">
                    ${Auth.puede("pacientes", "crear")
                        ? `<button class="btn btn-primario" id="btnNuevoPac">＋ Nuevo paciente</button>` : ""}
                </div>
            </div>

            <div class="barra-filtros">
                <div class="buscador">
                    <span class="buscador-icono">${Icono("search", 15)}</span>
                    <input type="text" id="buscarPac" placeholder="Buscar por nombre, correo o teléfono...">
                </div>
                <select class="filtro-select" id="filtroEstado">
                    <option value="">Todos los estados</option>
                    <option value="Activo">Activos</option>
                    <option value="Inactivo">Inactivos</option>
                </select>
                <select class="filtro-select" id="filtroSexo">
                    <option value="">Todos los sexos</option>
                    <option value="Femenino">Femenino</option>
                    <option value="Masculino">Masculino</option>
                    <option value="Otro">Otro</option>
                </select>
            </div>

            <div class="card"><div class="card-body sin-pad">
                <div class="tabla-contenedor"><table class="tabla">
                    <thead><tr>
                        <th>Paciente</th><th>Edad</th><th>Sexo</th><th>Teléfono</th><th>Estado</th>
                        <th style="text-align:right">Acciones</th>
                    </tr></thead>
                    <tbody id="tablaPac">
                        ${Utils.skeletonTabla(6, 5)}
                    </tbody>
                </table></div>
                <div id="pagPac"></div>
            </div></div>
        </div>`;

        const btn = Utils.el("btnNuevoPac");
        if (btn) btn.addEventListener("click", () => this.formulario());

        Utils.el("buscarPac").addEventListener("input", e => {
            this._filtro = e.target.value;
            this._pagina = 1;
            this.pintar();
        });
        Utils.el("filtroEstado").addEventListener("change", e => {
            this._estado = e.target.value;
            this._pagina = 1;
            this.pintar();
        });
        Utils.el("filtroSexo").addEventListener("change", e => {
            this._sexo = e.target.value;
            this._pagina = 1;
            this.pintar();
        });

        setTimeout(() => this.pintar(), 150);
    },

    pintar() {
        const tbody = Utils.el("tablaPac");
        const q = this._filtro.toLowerCase();
        let lista = DB.obtener("pacientes");

        if (q) lista = lista.filter(p =>
            `${p.nombre} ${p.apellidos}`.toLowerCase().includes(q) ||
            (p.telefono || "").includes(q) ||
            (p.correo || "").toLowerCase().includes(q)
        );
        if (this._estado) lista = lista.filter(p => (p.estado || "Activo") === this._estado);
        if (this._sexo) lista = lista.filter(p => p.sexo === this._sexo);

        if (!lista.length) {
            tbody.innerHTML = `<tr><td colspan="6">${Utils.vacio(
                this._filtro ? "Sin resultados" : "No hay pacientes registrados", "users",
                !this._filtro && Auth.puede("pacientes", "crear")
                    ? `<button class="btn btn-primario" onclick="App.modulos.pacientes.formulario()">＋ Registrar primer paciente</button>` : ""
            )}</td></tr>`;
            Utils.el("pagPac").innerHTML = "";
            return;
        }

        const info = Utils.paginar(lista, this._pagina, this._porPagina);
        this._pagina = info.pagina;

        const puedeEditar = Auth.puede("pacientes", "editar");
        const puedeDesactivar = Auth.puede("pacientes", "editar");
        const puedeVerCorreo = Auth.puedeVerCampo("paciente", "correo");

        tbody.innerHTML = info.items.map(p => {
            const activo = (p.estado || "Activo") === "Activo";
            return `<tr style="${activo ? "" : "opacity:.6"}">
                <td><div class="celda-nombre">
                    <div class="avatar-tabla">${Utils.iniciales(p.nombre + " " + p.apellidos)}</div>
                    <div class="celda-nombre-info">
                        <strong>${Utils.esc(p.nombre)} ${Utils.esc(p.apellidos)}</strong>
                        <span>${puedeVerCorreo ? Utils.esc(p.correo || "—") : Utils.campoBloqueado("Correo restringido")}</span>
                    </div>
                </div></td>
                <td>${Utils.edad(p.fechaNacimiento)} años</td>
                <td>${Utils.esc(p.sexo || "—")}</td>
                <td>${Utils.esc(p.telefono || "—")}</td>
                <td><span class="badge ${activo ? "badge-activo" : "badge-inactivo"}">${activo ? "Activo" : "Inactivo"}</span></td>
                <td><div class="acciones-celda">
                    <button class="btn-accion" title="Ver perfil" data-perfil="${p.id}">${Icono("user", 14)}</button>
                    <button class="btn-accion" title="Ver historia" data-ver="${p.id}">${Icono("clipboard-list", 14)}</button>
                    ${puedeEditar ? `<button class="btn-accion" title="Editar" data-edit="${p.id}">${Icono("pencil", 14)}</button>` : ""}
                    ${puedeDesactivar
                        ? (activo
                            ? `<button class="btn-accion peligro" title="Desactivar" data-toggle="${p.id}">${Icono("user-x", 14)}</button>`
                            : `<button class="btn-accion exito" title="Reactivar" data-toggle="${p.id}">${Icono("user-check", 14)}</button>`)
                        : ""}
                </div></td>
            </tr>`;
        }).join("");

        Utils.el("pagPac").innerHTML = Utils.controlesPaginacion(info, "pagPac");
        this.conectarControlesPaginacion();
        Utils.refrescarIconos();

        tbody.querySelectorAll("[data-perfil]").forEach(b => b.addEventListener("click", () => this.verPerfil(b.dataset.perfil)));
        tbody.querySelectorAll("[data-ver]").forEach(b => b.addEventListener("click", () => {
            Historia.pacienteId = b.dataset.ver;
            App.navegar("historia");
        }));
        tbody.querySelectorAll("[data-edit]").forEach(b => b.addEventListener("click", () => this.formulario(b.dataset.edit)));
        tbody.querySelectorAll("[data-toggle]").forEach(b => b.addEventListener("click", () => this.toggleEstado(b.dataset.toggle)));
    },

    conectarControlesPaginacion() {
        Utils.qsa("#pagPac .pag-btn").forEach(b => {
            b.addEventListener("click", () => {
                this._pagina = parseInt(b.dataset.pag);
                this.pintar();
                window.scrollTo({ top: 0, behavior: "smooth" });
            });
        });
    },

    verPerfil(id) {
        const p = DB.porId("pacientes", id);
        if (!p) return;

        const consultas = DB.obtener("consultas").filter(c => c.idPaciente === id);
        const recetas = DB.obtener("recetas").filter(r => r.idPaciente === id);
        const citas = DB.obtener("citas").filter(c => c.idPaciente === id && c.fecha >= Utils.hoy()).sort((a, b) => a.fecha.localeCompare(b.fecha));
        const ultimaConsulta = [...consultas].sort((a, b) => b.fecha.localeCompare(a.fecha))[0];
        const proximaCita = citas[0];
        const activo = (p.estado || "Activo") === "Activo";

        const cuerpo = `
            <div style="display:flex;align-items:center;gap:16px;margin-bottom:22px">
                <div class="avatar-tabla" style="width:64px;height:64px;font-size:20px;background:var(--primary);color:white">${Utils.iniciales(p.nombre + " " + p.apellidos)}</div>
                <div style="flex:1">
                    <h2 style="font-size:22px;font-weight:800;color:var(--text);margin-bottom:3px">${Utils.esc(p.nombre)} ${Utils.esc(p.apellidos)}</h2>
                    <p style="font-size:13px;color:var(--text-2)">${Utils.esc(p.id)} · ${Utils.edad(p.fechaNacimiento)} años · ${Utils.esc(p.sexo || "—")}</p>
                    <span class="badge ${activo ? "badge-activo" : "badge-inactivo"}" style="margin-top:6px">${activo ? "Activo" : "Inactivo"}</span>
                </div>
            </div>

            <div class="historia-stats">
                <div class="historia-stat"><strong>${consultas.length}</strong><span>Consultas</span></div>
                <div class="historia-stat"><strong>${recetas.length}</strong><span>Recetas</span></div>
                <div class="historia-stat"><strong>${ultimaConsulta ? Utils.fechaCorta(ultimaConsulta.fecha) : "—"}</strong><span>Última consulta</span></div>
                <div class="historia-stat"><strong>${proximaCita ? Utils.fechaCorta(proximaCita.fecha) : "—"}</strong><span>Próxima cita</span></div>
            </div>

            <div class="info-grid" style="margin-bottom:16px">
                <div class="info-item"><label>Teléfono</label><span>${Utils.esc(p.telefono || "—")}</span></div>
                <div class="info-item"><label>Correo</label><span>${Auth.verCampo("paciente", "correo", p.correo, p.id)}</span></div>
                <div class="info-item" style="grid-column:1/-1"><label>Dirección</label><span>${Auth.verCampo("paciente", "direccion", p.direccion, p.id)}</span></div>
                <div class="info-item" style="grid-column:1/-1"><label>Contacto de emergencia</label><span>${Auth.verCampo("paciente", "contactoEmergencia", p.contactoEmergencia, p.id)}</span></div>
            </div>

            ${Auth.puedeVerCampo("paciente", "alergias", p.id) ? `
                <div style="background:var(--danger-light);border-left:4px solid var(--danger);padding:12px 16px;border-radius:8px;margin-bottom:12px">
                    <div style="font-size:11.5px;font-weight:700;color:var(--danger);text-transform:uppercase;letter-spacing:.04em;margin-bottom:4px">Alergias</div>
                    <div style="font-size:13.5px;color:var(--text)">${Utils.esc(p.alergias || "Ninguna")}</div>
                </div>` : ""}

            ${Auth.puedeVerCampo("paciente", "antecedentes", p.id) && p.antecedentes ? `
                <div style="background:var(--surface-2);border-left:4px solid var(--text-3);padding:12px 16px;border-radius:8px">
                    <div style="font-size:11.5px;font-weight:700;color:var(--text-2);text-transform:uppercase;letter-spacing:.04em;margin-bottom:4px">Antecedentes</div>
                    <div style="font-size:13.5px;color:var(--text)">${Utils.esc(p.antecedentes)}</div>
                </div>` : ""}
        `;

        Modal.abrir({
            titulo: "Perfil del paciente",
            cuerpo, tamaño: "grande",
            footer: `
                <button class="btn btn-secundario" onclick="Modal.cerrar()">Cerrar</button>
                <button class="btn btn-primario" onclick="Modal.cerrar(); Historia.pacienteId='${p.id}'; App.navegar('historia')">Ver historia clínica</button>`
        });
    },

    formulario(id = null) {
        const p = id ? DB.porId("pacientes", id) : null;

        const cuerpo = `<div class="form-grid">
            ${Utils.campo({ id: "fNombre", label: "Nombre(s)", valor: p?.nombre || "", requerido: true,
                placeholder: "Ej. María Fernanda", maxlength: 40 })}
            ${Utils.campo({ id: "fApellidos", label: "Apellidos", valor: p?.apellidos || "", requerido: true,
                placeholder: "Ej. López Hernández", maxlength: 40 })}
            ${Utils.campo({ id: "fFechaNac", label: "Fecha de nacimiento", tipo: "date", valor: p?.fechaNacimiento || "", requerido: true })}
            ${Utils.campo({ id: "fSexo", label: "Sexo", tipo: "select", valor: p?.sexo || "", opciones: [
                { valor: "", etiqueta: "— Seleccionar —" },
                { valor: "Femenino", etiqueta: "Femenino" },
                { valor: "Masculino", etiqueta: "Masculino" },
                { valor: "Otro", etiqueta: "Otro" }
            ] })}
            ${Utils.campo({ id: "fTelefono", label: "Teléfono", valor: p?.telefono || "",
                placeholder: "81-1234-5678", maxlength: 12 })}
            ${Utils.campo({ id: "fCorreo", label: "Correo", tipo: "email", valor: p?.correo || "",
                placeholder: "correo@ejemplo.com" })}
            ${Utils.campo({ id: "fDireccion", label: "Dirección", valor: p?.direccion || "",
                ancho: "completo", maxlength: 120 })}
            ${Utils.campo({ id: "fContacto", label: "Contacto de emergencia", valor: p?.contactoEmergencia || "",
                ancho: "completo", placeholder: "Nombre - Teléfono" })}
            ${Utils.campo({ id: "fAlergias", label: "Alergias", valor: p?.alergias || "",
                placeholder: "Ninguna" })}
            ${Utils.campo({ id: "fAntecedentes", label: "Antecedentes médicos", tipo: "textarea",
                valor: p?.antecedentes || "", ancho: "completo" })}
        </div>`;

        const footer = `
            <button class="btn btn-secundario" id="cancelPac">Cancelar</button>
            <button class="btn btn-primario" id="savePac">${p ? "Guardar cambios" : "Registrar paciente"}</button>`;

        Modal.abrir({ titulo: p ? "Editar paciente" : "Nuevo paciente", cuerpo, footer, tamaño: "grande" });

        Utils.el("fTelefono").addEventListener("input", (e) => {
            e.target.value = Utils.formatoTelefono(e.target.value);
        });

        Utils.activarValidacion("fNombre", Validar.nombre);
        Utils.activarValidacion("fApellidos", Validar.nombre);
        Utils.activarValidacion("fFechaNac", Validar.fechaNacimiento);
        Utils.activarValidacion("fTelefono", Validar.telefono);
        Utils.activarValidacion("fCorreo", (v) => v ? Validar.correo(v) : null);

        Utils.el("cancelPac").addEventListener("click", () => Modal.cerrar());
        Utils.el("savePac").addEventListener("click", () => {
            const datos = {
                nombre: Utils.el("fNombre").value.trim(),
                apellidos: Utils.el("fApellidos").value.trim(),
                fechaNacimiento: Utils.el("fFechaNac").value,
                sexo: Utils.el("fSexo").value,
                telefono: Utils.el("fTelefono").value.trim(),
                correo: Utils.el("fCorreo").value.trim(),
                direccion: Utils.el("fDireccion").value.trim(),
                contactoEmergencia: Utils.el("fContacto").value.trim(),
                alergias: Utils.el("fAlergias").value.trim(),
                antecedentes: Utils.el("fAntecedentes").value.trim()
            };

            const vNombre = Utils.validarCampo("fNombre", Validar.nombre);
            const vApellidos = Utils.validarCampo("fApellidos", Validar.nombre);
            const vFecha = Utils.validarCampo("fFechaNac", Validar.fechaNacimiento);
            const vTel = Utils.validarCampo("fTelefono", Validar.telefono);
            const vCorreo = Utils.validarCampo("fCorreo", (v) => v ? Validar.correo(v) : null);

            if (!vNombre || !vApellidos || !vFecha || !vTel || !vCorreo) {
                Utils.toast("Corrige los campos marcados en rojo.", "error");
                return;
            }

            if (p) {
                DB.actualizar("pacientes", p.id, datos);
                DB.registrarActividad("paciente", `Paciente actualizado: ${datos.nombre} ${datos.apellidos}`, { id: p.id });
                Utils.toast("Paciente actualizado.", "success");
            } else {
                const nuevoId = Utils.generarId("PAC", "pacientes");
                DB.agregar("pacientes", {
                    id: nuevoId,
                    ...datos,
                    estado: "Activo",
                    fechaRegistro: Utils.hoy()
                });
                DB.registrarActividad("paciente", `Paciente registrado: ${datos.nombre} ${datos.apellidos}`, { id: nuevoId });
                Utils.toast("Paciente registrado.", "success");
            }
            Modal.cerrar();
            this.pintar();
        });
    },

    async toggleEstado(id) {
        const p = DB.porId("pacientes", id);
        const activo = (p.estado || "Activo") === "Activo";

        const ok = await Utils.confirmar(
            activo
                ? `¿Desactivar a "${p.nombre} ${p.apellidos}"? Su historial clínico se conservará.`
                : `¿Reactivar a "${p.nombre} ${p.apellidos}"?`,
            activo ? "Desactivar paciente" : "Reactivar paciente",
            activo ? "Desactivar" : "Reactivar"
        );
        if (!ok) return;

        const nuevoEstado = activo ? "Inactivo" : "Activo";
        DB.actualizar("pacientes", id, { estado: nuevoEstado });
        DB.registrarActividad("paciente", `Paciente ${nuevoEstado.toLowerCase()}: ${p.nombre} ${p.apellidos}`, { id });
        Utils.toast(`Paciente ${nuevoEstado.toLowerCase()}.`, "success");
        this.pintar();
    }
});