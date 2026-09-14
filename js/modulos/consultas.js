const Consultas = {
    titulo: "Consultas",
    sub: "Registro de atenciones médicas",
    citaId: null,
    _filtro: "",
    _pagina: 1,
    _porPagina: 10,

    render(c) {
        const esPaciente = Auth.sesion().rol === "Paciente";
        const puedeCrear = Auth.puede("consultas", "crear") && !esPaciente;

        c.innerHTML = `
        <div class="vista">
            <div class="vista-enc">
                <div>
                    <h2 class="vista-titulo">${esPaciente ? "Mis consultas" : "Consultas médicas"}</h2>
                    <p class="vista-sub">${esPaciente ? "Consulta tus atenciones médicas" : "Registra y consulta las atenciones médicas"}</p>
                </div>
                <div class="vista-acciones">
                    ${puedeCrear ? `<button class="btn btn-primario" id="btnNuevaCons">＋ Nueva consulta</button>` : ""}
                </div>
            </div>

            <div class="barra-filtros">
                <div class="buscador">
                    <span class="buscador-icono">${Icono("search", 15)}</span>
                    <input type="text" id="buscarCons" placeholder="Buscar por paciente, diagnóstico o motivo...">
                </div>
            </div>

            <div class="card"><div class="card-body sin-pad">
                <div class="tabla-contenedor"><table class="tabla">
                    <thead><tr>
                        <th>Paciente</th><th>Fecha</th><th>Motivo</th><th>Diagnóstico</th>
                        <th style="text-align:right">Acciones</th>
                    </tr></thead>
                    <tbody id="tablaCons">${Utils.skeletonTabla(5, 5)}</tbody>
                </table></div>
                <div id="pagCons"></div>
            </div></div>
        </div>`;

        const btn = Utils.el("btnNuevaCons");
        if (btn) btn.addEventListener("click", () => this.formulario());
        Utils.el("buscarCons").addEventListener("input", e => {
            this._filtro = e.target.value;
            this._pagina = 1;
            this.pintar();
        });

        setTimeout(() => this.pintar(), 150);
    },

    pintar() {
        const tbody = Utils.el("tablaCons");
        const q = this._filtro.toLowerCase();
        const sesion = Auth.sesion();
        let lista = DB.obtener("consultas");

        if (sesion.rol === "Paciente") {
            lista = lista.filter(c => c.idPaciente === sesion.idPaciente);
        }

        if (q) lista = lista.filter(c => {
            const p = DB.porId("pacientes", c.idPaciente);
            const texto = `${p?.nombre || ""} ${p?.apellidos || ""} ${c.motivo} ${c.diagnostico || ""}`.toLowerCase();
            return texto.includes(q);
        });
        lista.sort((a, b) => b.fecha.localeCompare(a.fecha));

        if (!lista.length) {
            tbody.innerHTML = `<tr><td colspan="5">${Utils.vacio("No hay consultas registradas", "stethoscope")}</td></tr>`;
            Utils.el("pagCons").innerHTML = "";
            return;
        }

        const info = Utils.paginar(lista, this._pagina, this._porPagina);
        this._pagina = info.pagina;

        const esPaciente = sesion.rol === "Paciente";
        const puedeEditar = Auth.puede("consultas", "editar") && !esPaciente;
        const puedeEliminar = Auth.puede("consultas", "eliminar") && !esPaciente;
        const puedeRecetar = Auth.puede("recetas", "crear") && !esPaciente;

        tbody.innerHTML = info.items.map(c => {
            const p = DB.porId("pacientes", c.idPaciente);
            return `<tr>
                <td><div class="celda-nombre">
                    <div class="avatar-tabla">${Utils.iniciales(p ? p.nombre + " " + p.apellidos : "?")}</div>
                    <div class="celda-nombre-info">
                        <strong>${Utils.esc(p ? p.nombre + " " + p.apellidos : "Paciente eliminado")}</strong>
                        <span>${p ? Utils.edad(p.fechaNacimiento) + " años" : ""}</span>
                    </div>
                </div></td>
                <td>${Utils.fecha(c.fecha)}</td>
                <td>${Utils.esc(c.motivo)}</td>
                <td>${Utils.esc(c.diagnostico || "—")}</td>
                <td><div class="acciones-celda">
                    <button class="btn-accion" title="Ver detalle" data-ver="${c.id}">${Icono("eye", 14)}</button>
                    ${puedeRecetar ? `<button class="btn-accion exito" title="Crear receta" data-rec="${c.id}">${Icono("pill", 14)}</button>` : ""}
                    ${puedeEditar ? `<button class="btn-accion" title="Editar" data-edit="${c.id}">${Icono("pencil", 14)}</button>` : ""}
                    ${puedeEliminar ? `<button class="btn-accion peligro" title="Eliminar" data-del="${c.id}">${Icono("trash-2", 14)}</button>` : ""}
                </div></td>
            </tr>`;
        }).join("");

        Utils.el("pagCons").innerHTML = Utils.controlesPaginacion(info, "pagCons");
        Utils.qsa("#pagCons .pag-btn").forEach(b => b.addEventListener("click", () => {
            this._pagina = parseInt(b.dataset.pag);
            this.pintar();
        }));

        Utils.refrescarIconos();

        tbody.querySelectorAll("[data-ver]").forEach(b => b.addEventListener("click", () => this.ver(b.dataset.ver)));
        tbody.querySelectorAll("[data-rec]").forEach(b => b.addEventListener("click", () => {
            Recetas.consultaId = b.dataset.rec;
            App.navegar("recetas");
            setTimeout(() => Recetas.formulario(), 200);
        }));
        tbody.querySelectorAll("[data-edit]").forEach(b => b.addEventListener("click", () => this.formulario(b.dataset.edit)));
        tbody.querySelectorAll("[data-del]").forEach(b => b.addEventListener("click", () => this.eliminar(b.dataset.del)));
    },

    ver(id) {
        const c = DB.porId("consultas", id);
        const p = DB.porId("pacientes", c.idPaciente);
        const recetas = DB.obtener("recetas").filter(r => r.idConsulta === id);
        const sesion = Auth.sesion();
        const esPaciente = sesion.rol === "Paciente";

        const cuerpo = `
            <div class="form-seccion">
                <div class="form-seccion-titulo">${Icono("user", 14)} Paciente</div>
                <div class="info-grid">
                    <div class="info-item"><label>Nombre</label><span>${Utils.esc(p ? p.nombre + " " + p.apellidos : "—")}</span></div>
                    <div class="info-item"><label>Edad</label><span>${p ? Utils.edad(p.fechaNacimiento) + " años" : "—"}</span></div>
                </div>
            </div>

            <div class="form-seccion">
                <div class="form-seccion-titulo">${Icono("clipboard-list", 14)} Información de la consulta</div>
                <div class="info-grid">
                    <div class="info-item"><label>Fecha</label><span>${Utils.fecha(c.fecha)}</span></div>
                    <div class="info-item"><label>Motivo</label><span>${Utils.esc(c.motivo)}</span></div>
                </div>
            </div>

            ${(c.presion || c.temperatura || c.peso || c.altura) ? `
            <div class="form-seccion">
                <div class="form-seccion-titulo">${Icono("activity", 14)} Signos vitales</div>
                <div class="info-grid">
                    ${c.presion ? `<div class="info-item"><label>Presión arterial</label><span>${Utils.esc(c.presion)}</span></div>` : ""}
                    ${c.temperatura ? `<div class="info-item"><label>Temperatura</label><span>${Utils.esc(c.temperatura)}</span></div>` : ""}
                    ${c.peso ? `<div class="info-item"><label>Peso</label><span>${Utils.esc(c.peso)}</span></div>` : ""}
                    ${c.altura ? `<div class="info-item"><label>Altura</label><span>${Utils.esc(c.altura)}</span></div>` : ""}
                </div>
            </div>` : ""}

            <div class="form-seccion">
                <div class="form-seccion-titulo">${Icono("activity", 14)} Evaluación</div>
                <div class="info-item" style="margin-bottom:12px"><label>Síntomas</label><span>${Utils.esc(c.sintomas || "—")}</span></div>
                <div class="info-item"><label>Diagnóstico</label><span>${Utils.esc(c.diagnostico || "—")}</span></div>
            </div>

            <div class="form-seccion">
                <div class="form-seccion-titulo">${Icono("pill", 14)} Tratamiento</div>
                <div class="info-item" style="margin-bottom:12px"><label>Tratamiento</label><span>${Utils.esc(c.tratamiento || "—")}</span></div>
                <div class="info-item"><label>Observaciones</label><span>${Utils.esc(c.observaciones || "—")}</span></div>
            </div>

            ${recetas.length ? `
                <div class="form-seccion">
                    <div class="form-seccion-titulo">${Icono("file-text", 14)} Recetas asociadas (${recetas.length})</div>
                    ${recetas.map(r => `
                        <div style="background:var(--surface-2);padding:10px 14px;border-radius:8px;margin-bottom:8px;font-size:13px">
                            <b>${Utils.esc(r.id)}</b> · ${Utils.fecha(r.fecha)} · ${(r.medicamentos || []).length} medicamento(s)
                        </div>
                    `).join("")}
                </div>
            ` : ""}
        `;

        Modal.abrir({
            titulo: "Detalle de consulta",
            cuerpo, tamaño: "grande",
            footer: `<button class="btn btn-secundario" onclick="Modal.cerrar()">Cerrar</button>`
        });
    },

    formulario(id = null, idPaciente = null, citaId = null) {
        const sesion = Auth.sesion();
        if (sesion.rol === "Paciente") {
            Utils.toast("Los pacientes no pueden crear consultas.", "error");
            return;
        }

        const c = id ? DB.porId("consultas", id) : null;
        const pacientes = DB.obtener("pacientes").filter(p => (p.estado || "Activo") === "Activo");

        if (!pacientes.length) {
            Utils.toast("Primero registra un paciente activo.", "warning");
            return;
        }

        if (citaId) this.citaId = citaId;
        const citaPrev = this.citaId ? DB.porId("citas", this.citaId) : null;

        const cuerpo = `
            <div class="form-seccion">
                <div class="form-seccion-titulo">${Icono("user", 14)} Información general</div>
                <div class="form-grid">
                    ${Utils.campo({
                        id: "coPaciente", label: "Paciente", tipo: "select", requerido: true,
                        valor: c?.idPaciente || citaPrev?.idPaciente || idPaciente || pacientes[0].id,
                        opciones: pacientes.map(p => ({ valor: p.id, etiqueta: `${p.nombre} ${p.apellidos}` }))
                    })}
                    ${Utils.campo({ id: "coFecha", label: "Fecha", tipo: "date", valor: c?.fecha || Utils.hoy(), requerido: true })}
                    ${Utils.campo({
                        id: "coMotivo", label: "Motivo de consulta", requerido: true,
                        valor: c?.motivo || citaPrev?.motivo || "",
                        placeholder: "Dolor de cabeza, fiebre, etc.", ancho: "completo"
                    })}
                </div>
            </div>

            <div class="form-seccion">
                <div class="form-seccion-titulo">${Icono("activity", 14)} Signos vitales</div>
                <div class="form-grid">
                    ${Utils.campo({ id: "coPresion", label: "Presión arterial", valor: c?.presion || "", placeholder: "120/80" })}
                    ${Utils.campo({ id: "coTemperatura", label: "Temperatura (°C)", valor: c?.temperatura || "", placeholder: "36.5" })}
                    ${Utils.campo({ id: "coPeso", label: "Peso (kg)", valor: c?.peso || "", placeholder: "70" })}
                    ${Utils.campo({ id: "coAltura", label: "Altura (m)", valor: c?.altura || "", placeholder: "1.70" })}
                </div>
            </div>

            <div class="form-seccion">
                <div class="form-seccion-titulo">${Icono("activity", 14)} Evaluación</div>
                <div class="form-grid">
                    ${Utils.campo({ id: "coSintomas", label: "Síntomas", tipo: "textarea", valor: c?.sintomas || "", ancho: "completo" })}
                    ${Utils.campo({ id: "coDiagnostico", label: "Diagnóstico", valor: c?.diagnostico || "", ancho: "completo" })}
                </div>
            </div>

            <div class="form-seccion">
                <div class="form-seccion-titulo">${Icono("pill", 14)} Tratamiento y observaciones</div>
                <div class="form-grid">
                    ${Utils.campo({ id: "coTratamiento", label: "Tratamiento", tipo: "textarea", valor: c?.tratamiento || "", ancho: "completo" })}
                    ${Utils.campo({ id: "coObs", label: "Observaciones", tipo: "textarea", valor: c?.observaciones || "", ancho: "completo" })}
                </div>
            </div>
        `;

        const footer = `
            <button class="btn btn-secundario" id="cancelCons">Cancelar</button>
            <button class="btn btn-primario" id="saveCons">${c ? "Guardar cambios" : "Registrar consulta"}</button>`;

        Modal.abrir({ titulo: c ? "Editar consulta" : "Nueva consulta", cuerpo, footer, tamaño: "grande" });

        Utils.activarValidacion("coMotivo", Validar.requerido);

        Utils.el("cancelCons").addEventListener("click", () => { this.citaId = null; Modal.cerrar(); });

        Utils.el("saveCons").addEventListener("click", () => {
            const datos = {
                idPaciente: Utils.el("coPaciente").value,
                fecha: Utils.el("coFecha").value,
                motivo: Utils.el("coMotivo").value.trim(),
                sintomas: Utils.el("coSintomas").value.trim(),
                diagnostico: Utils.el("coDiagnostico").value.trim(),
                tratamiento: Utils.el("coTratamiento").value.trim(),
                observaciones: Utils.el("coObs").value.trim(),
                presion: Utils.el("coPresion").value.trim(),
                temperatura: Utils.el("coTemperatura").value.trim(),
                peso: Utils.el("coPeso").value.trim(),
                altura: Utils.el("coAltura").value.trim()
            };

            const vMotivo = Utils.validarCampo("coMotivo", Validar.requerido);
            if (!vMotivo) {
                Utils.toast("El motivo es obligatorio.", "warning");
                return;
            }

            const p = DB.porId("pacientes", datos.idPaciente);
            const nombrePac = p ? `${p.nombre} ${p.apellidos}` : "Paciente";

            if (c) {
                DB.actualizar("consultas", c.id, datos);
                DB.registrarActividad("consulta", `Consulta actualizada: ${nombrePac}`, { id: c.id });
                Utils.toast("Consulta actualizada.", "success");
            } else {
                const nuevoId = Utils.generarId("CON", "consultas");
                DB.agregar("consultas", {
                    id: nuevoId,
                    ...datos,
                    idCita: this.citaId || null,
                    idUsuario: Auth.sesion().id
                });
                if (this.citaId) DB.actualizar("citas", this.citaId, { estado: "Atendida" });
                DB.registrarActividad("consulta", `Nueva consulta: ${nombrePac}`, { id: nuevoId });
                Utils.toast("Consulta registrada.", "success");
            }

            this.citaId = null;
            Modal.cerrar();
            this.pintar();
        });
    },

    async eliminar(id) {
        const c = DB.porId("consultas", id);
        const p = DB.porId("pacientes", c.idPaciente);
        const ok = await Utils.confirmar(
            `¿Eliminar esta consulta? También se eliminarán las recetas asociadas.`,
            "Eliminar consulta", "Eliminar"
        );
        if (!ok) return;
        DB.eliminar("consultas", id);
        DB.guardar("recetas", DB.obtener("recetas").filter(r => r.idConsulta !== id));
        DB.registrarActividad("consulta", `Consulta eliminada: ${p ? p.nombre + " " + p.apellidos : "—"}`, { id });
        Utils.toast("Consulta eliminada.", "success");
        this.pintar();
    }
};

App.registrarModulo("consultas", Consultas);