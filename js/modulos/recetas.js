const Recetas = {
    titulo: "Recetas",
    sub: "Emisión y consulta de recetas médicas",
    consultaId: null,
    _filtro: "",
    _pagina: 1,
    _porPagina: 10,

    render(c) {
        const esPaciente = Auth.sesion().rol === "Paciente";
        const puedeCrear = Auth.puede("recetas", "crear") && !esPaciente;

        c.innerHTML = `
        <div class="vista">
            <div class="vista-enc">
                <div>
                    <h2 class="vista-titulo">${esPaciente ? "Mis recetas" : "Recetas médicas"}</h2>
                    <p class="vista-sub">${esPaciente ? "Consulta tus recetas emitidas" : "Emite y consulta recetas"}</p>
                </div>
                <div class="vista-acciones">
                    ${puedeCrear ? `<button class="btn btn-primario" id="btnNuevaRec">＋ Nueva receta</button>` : ""}
                </div>
            </div>

            <div class="barra-filtros">
                <div class="buscador">
                    <span class="buscador-icono">${Icono("search", 15)}</span>
                    <input type="text" id="buscarRec" placeholder="Buscar por paciente o medicamento...">
                </div>
            </div>

            <div class="card"><div class="card-body sin-pad">
                <div class="tabla-contenedor"><table class="tabla">
                    <thead><tr>
                        <th>Folio</th><th>Paciente</th><th>Fecha</th><th>Medicamentos</th>
                        <th style="text-align:right">Acciones</th>
                    </tr></thead>
                    <tbody id="tablaRec">${Utils.skeletonTabla(5, 5)}</tbody>
                </table></div>
                <div id="pagRec"></div>
            </div></div>
        </div>`;

        const btn = Utils.el("btnNuevaRec");
        if (btn) btn.addEventListener("click", () => this.formulario());
        Utils.el("buscarRec").addEventListener("input", e => {
            this._filtro = e.target.value;
            this._pagina = 1;
            this.pintar();
        });

        setTimeout(() => this.pintar(), 150);
    },

    pintar() {
        const tbody = Utils.el("tablaRec");
        const q = this._filtro.toLowerCase();
        const sesion = Auth.sesion();
        let lista = DB.obtener("recetas");

        if (sesion.rol === "Paciente") {
            lista = lista.filter(r => r.idPaciente === sesion.idPaciente);
        }

        if (q) lista = lista.filter(r => {
            const p = DB.porId("pacientes", r.idPaciente);
            const meds = (r.medicamentos || []).map(m => m.medicamento).join(" ");
            return `${p?.nombre || ""} ${p?.apellidos || ""} ${meds}`.toLowerCase().includes(q);
        });
        lista.sort((a, b) => b.fecha.localeCompare(a.fecha));

        if (!lista.length) {
            tbody.innerHTML = `<tr><td colspan="5">${Utils.vacio("No hay recetas emitidas", "pill")}</td></tr>`;
            Utils.el("pagRec").innerHTML = "";
            return;
        }

        const info = Utils.paginar(lista, this._pagina, this._porPagina);
        this._pagina = info.pagina;

        const esPaciente = sesion.rol === "Paciente";
        const puedeEditar = Auth.puede("recetas", "editar") && !esPaciente;
        const puedeEliminar = Auth.puede("recetas", "eliminar") && !esPaciente;

        tbody.innerHTML = info.items.map(r => {
            const p = DB.porId("pacientes", r.idPaciente);
            return `<tr>
                <td><strong style="color:var(--primary)">${Utils.esc(r.id)}</strong></td>
                <td><div class="celda-nombre">
                    <div class="avatar-tabla">${Utils.iniciales(p ? p.nombre + " " + p.apellidos : "?")}</div>
                    <div class="celda-nombre-info">
                        <strong>${Utils.esc(p ? p.nombre + " " + p.apellidos : "Paciente eliminado")}</strong>
                        <span>${p ? Utils.edad(p.fechaNacimiento) + " años" : ""}</span>
                    </div>
                </div></td>
                <td>${Utils.fecha(r.fecha)}</td>
                <td>${(r.medicamentos || []).length} medicamento(s)</td>
                <td><div class="acciones-celda">
                    <button class="btn-accion" title="Ver / Imprimir" data-ver="${r.id}">${Icono("eye", 14)}</button>
                    ${puedeEditar ? `<button class="btn-accion" title="Editar" data-edit="${r.id}">${Icono("pencil", 14)}</button>` : ""}
                    ${puedeEliminar ? `<button class="btn-accion peligro" title="Eliminar" data-del="${r.id}">${Icono("trash-2", 14)}</button>` : ""}
                </div></td>
            </tr>`;
        }).join("");

        Utils.el("pagRec").innerHTML = Utils.controlesPaginacion(info, "pagRec");
        Utils.qsa("#pagRec .pag-btn").forEach(b => b.addEventListener("click", () => {
            this._pagina = parseInt(b.dataset.pag);
            this.pintar();
        }));

        Utils.refrescarIconos();

        tbody.querySelectorAll("[data-ver]").forEach(b => b.addEventListener("click", () => this.ver(b.dataset.ver)));
        tbody.querySelectorAll("[data-edit]").forEach(b => b.addEventListener("click", () => this.formulario(b.dataset.edit)));
        tbody.querySelectorAll("[data-del]").forEach(b => b.addEventListener("click", () => this.eliminar(b.dataset.del)));
    },

    ver(id) {
        const r = DB.porId("recetas", id);
        const p = DB.porId("pacientes", r.idPaciente);
        const conf = DB.config();

        const medicamentosHTML = (r.medicamentos || []).map((m, i) => `
            <div class="receta-medicamento">
                <div class="receta-med-nombre">
                    ${Icono("pill", 16)} Medicamento ${i + 1}
                </div>
                <div style="font-size:15px;font-weight:700;color:var(--text);margin-bottom:10px">${Utils.esc(m.medicamento)}</div>
                <div class="receta-med-detalle">
                    <div><label>Dosis</label><span>${Utils.esc(m.dosis || "—")}</span></div>
                    <div><label>Frecuencia</label><span>${Utils.esc(m.frecuencia || "—")}</span></div>
                    <div><label>Duración</label><span>${Utils.esc(m.duracion || "—")}</span></div>
                </div>
            </div>
        `).join("");

        const cuerpo = `
            <div class="receta-imprimible" id="recetaPrint">
                <div class="receta-header">
                    <h2>${Utils.esc(conf.nombreClinica)}</h2>
                    <p>${Utils.esc(conf.direccion)} · Tel: ${Utils.esc(conf.telefono)}</p>
                </div>
                <div class="receta-datos">
                    <div><b>Folio:</b> ${Utils.esc(r.id)}</div>
                    <div><b>Fecha:</b> ${Utils.fecha(r.fecha)}</div>
                    <div><b>Paciente:</b> ${Utils.esc(p ? p.nombre + " " + p.apellidos : "—")}</div>
                    <div><b>Edad:</b> ${p ? Utils.edad(p.fechaNacimiento) + " años" : "—"}</div>
                </div>
                ${medicamentosHTML}
                ${r.indicaciones ? `<div class="receta-indicaciones"><b>Indicaciones:</b><br>${Utils.esc(r.indicaciones)}</div>` : ""}
                <div class="receta-firma">
                    <div class="receta-firma-linea"></div>
                    <div>Firma del médico</div>
                </div>
            </div>`;

        Modal.abrir({
            titulo: "Receta médica", cuerpo, tamaño: "grande",
            footer: `
                <button class="btn btn-secundario" id="btnImprimirRec">${Icono("printer", 14)} Imprimir</button>
                <button class="btn btn-primario" onclick="Modal.cerrar()">Cerrar</button>`
        });

        Utils.el("btnImprimirRec").addEventListener("click", () => this.imprimir(r, p));
    },

    imprimir(r, p) {
        const conf = DB.config();
        const filas = (r.medicamentos || []).map(m => `
            <tr><td>${Utils.esc(m.medicamento)}</td><td>${Utils.esc(m.dosis)}</td>
                <td>${Utils.esc(m.frecuencia)}</td><td>${Utils.esc(m.duracion)}</td></tr>`).join("");

        const w = window.open("", "_blank", "width=800,height=900");
        w.document.write(`<!DOCTYPE html>
        <html><head><title>Receta ${r.id}</title>
        <style>
            body{font-family:Arial;padding:30px;color:#101f42;max-width:700px;margin:0 auto}
            .receta-header{text-align:center;border-bottom:2px solid #2d6cdf;padding-bottom:14px;margin-bottom:20px}
            .receta-header h2{color:#2d6cdf;margin:0 0 4px;font-size:22px}
            .receta-header p{font-size:12px;color:#53627d;margin:0}
            .receta-datos{display:grid;grid-template-columns:1fr 1fr;gap:10px;background:#f4f8ff;padding:12px;border-radius:8px;margin-bottom:20px;font-size:13px}
            .receta-tabla{width:100%;border-collapse:collapse;margin:16px 0}
            .receta-tabla th,.receta-tabla td{border:1px solid #cbd5e1;padding:10px;text-align:left;font-size:13px}
            .receta-tabla th{background:#edf3fe;color:#2d6cdf;font-size:12px;text-transform:uppercase}
            .receta-indicaciones{background:#fffbeb;border-left:4px solid #f59e0b;padding:12px;border-radius:6px;margin-top:14px;font-size:13px}
            .receta-firma{margin-top:70px;text-align:center;font-size:12px}
            .receta-firma-linea{border-top:1px solid #000;width:240px;margin:0 auto 5px;padding-top:4px}
            .receta-firma-info{font-size:11px;color:#53627d;margin-top:6px}
            @media print{body{padding:20px}}
        </style></head><body>
        <div class="receta-header">
            <h2>${Utils.esc(conf.nombreClinica)}</h2>
            <p>${Utils.esc(conf.direccion)} · Tel: ${Utils.esc(conf.telefono)} · ${Utils.esc(conf.correo)}</p>
        </div>
        <div class="receta-datos">
            <div><b>Folio:</b> ${Utils.esc(r.id)}</div>
            <div><b>Fecha:</b> ${Utils.fecha(r.fecha)}</div>
            <div><b>Paciente:</b> ${Utils.esc(p ? p.nombre + " " + p.apellidos : "—")}</div>
            <div><b>Edad:</b> ${p ? Utils.edad(p.fechaNacimiento) + " años" : "—"}</div>
        </div>
        <table class="receta-tabla">
            <thead><tr><th>Medicamento</th><th>Dosis</th><th>Frecuencia</th><th>Duración</th></tr></thead>
            <tbody>${filas}</tbody>
        </table>
        ${r.indicaciones ? `<div class="receta-indicaciones"><b>Indicaciones:</b><br>${Utils.esc(r.indicaciones)}</div>` : ""}
        <div class="receta-firma">
            <div class="receta-firma-linea"></div>
            <div>Firma del médico</div>
            <div class="receta-firma-info">Dr(a). _______________________<br>Especialidad: _______________<br>Cédula profesional: _______________</div>
        </div>
        </body></html>`);
        w.document.close();
        setTimeout(() => w.print(), 300);
    },

    formulario(id = null) {
        const sesion = Auth.sesion();
        if (sesion.rol === "Paciente") {
            Utils.toast("Los pacientes no pueden crear recetas.", "error");
            return;
        }

        const r = id ? DB.porId("recetas", id) : null;
        const pacientes = DB.obtener("pacientes").filter(p => (p.estado || "Activo") === "Activo");

        if (!pacientes.length) {
            Utils.toast("Primero registra un paciente activo.", "warning");
            return;
        }

        const consPrev = this.consultaId ? DB.porId("consultas", this.consultaId) : null;

        const cuerpo = `<div class="form-grid">
            ${Utils.campo({
                id: "rPaciente", label: "Paciente", tipo: "select", requerido: true,
                valor: r?.idPaciente || consPrev?.idPaciente || pacientes[0].id,
                opciones: pacientes.map(p => ({ valor: p.id, etiqueta: `${p.nombre} ${p.apellidos}` }))
            })}
            ${Utils.campo({ id: "rConsulta", label: "Consulta asociada", tipo: "select", valor: r?.idConsulta || this.consultaId || "" })}
            ${Utils.campo({ id: "rFecha", label: "Fecha", tipo: "date", valor: r?.fecha || Utils.hoy(), requerido: true })}
        </div>

        <label style="font-size:13px;font-weight:600;display:block;margin:14px 0 8px">Medicamentos</label>
        <div class="lista-medicamentos" id="listaMeds"></div>
        <button type="button" class="btn btn-secundario btn-sm" id="btnAddMed">＋ Añadir medicamento</button>

        <div style="margin-top:16px">
            ${Utils.campo({ id: "rIndicaciones", label: "Indicaciones generales", tipo: "textarea", valor: r?.indicaciones || "", ancho: "completo" })}
        </div>`;

        const footer = `
            <button class="btn btn-secundario" id="cancelRec">Cancelar</button>
            <button class="btn btn-primario" id="saveRec">${r ? "Guardar cambios" : "Emitir receta"}</button>`;

        Modal.abrir({ titulo: r ? "Editar receta" : "Nueva receta", cuerpo, footer, tamaño: "grande" });

        const pintarConsultas = () => {
            const pac = Utils.el("rPaciente").value;
            const cons = DB.obtener("consultas").filter(c => c.idPaciente === pac);
            Utils.el("rConsulta").innerHTML = `<option value="">— Sin consulta —</option>` +
                cons.map(c => `<option value="${c.id}" ${(r?.idConsulta || this.consultaId) === c.id ? "selected" : ""}>
                    ${Utils.fecha(c.fecha)} · ${Utils.esc(c.diagnostico || c.motivo)}
                </option>`).join("");
        };
        pintarConsultas();
        Utils.el("rPaciente").addEventListener("change", pintarConsultas);

        const contMeds = Utils.el("listaMeds");
        const nuevaFila = (m = { medicamento: "", dosis: "", frecuencia: "", duracion: "" }) => {
            const div = document.createElement("div");
            div.className = "fila-medicamento";
            div.innerHTML = `
                <input class="input" placeholder="Medicamento" value="${Utils.esc(m.medicamento)}" maxlength="60">
                <input class="input" placeholder="Dosis" value="${Utils.esc(m.dosis)}" maxlength="20">
                <input class="input" placeholder="Frecuencia" value="${Utils.esc(m.frecuencia)}" maxlength="30">
                <input class="input" placeholder="Duración" value="${Utils.esc(m.duracion)}" maxlength="20">
                <button type="button" class="btn-eliminar-med" title="Eliminar">${Icono("trash-2", 14)}</button>`;
            div.querySelector(".btn-eliminar-med").addEventListener("click", () => div.remove());
            contMeds.appendChild(div);
        };

        (r?.medicamentos?.length ? r.medicamentos : [{}]).forEach(nuevaFila);
        Utils.el("btnAddMed").addEventListener("click", () => nuevaFila());

        Utils.refrescarIconos();

        Utils.el("cancelRec").addEventListener("click", () => { this.consultaId = null; Modal.cerrar(); });

        Utils.el("saveRec").addEventListener("click", () => {
            const meds = [...contMeds.querySelectorAll(".fila-medicamento")].map(f => {
                const inputs = f.querySelectorAll("input");
                return {
                    medicamento: inputs[0].value.trim(),
                    dosis: inputs[1].value.trim(),
                    frecuencia: inputs[2].value.trim(),
                    duracion: inputs[3].value.trim()
                };
            }).filter(m => m.medicamento);

            if (!meds.length) {
                Utils.toast("Añade al menos un medicamento.", "warning");
                return;
            }

            const datos = {
                idPaciente: Utils.el("rPaciente").value,
                idConsulta: Utils.el("rConsulta").value || null,
                fecha: Utils.el("rFecha").value,
                indicaciones: Utils.el("rIndicaciones").value.trim(),
                medicamentos: meds
            };

            const p = DB.porId("pacientes", datos.idPaciente);
            const nombrePac = p ? `${p.nombre} ${p.apellidos}` : "Paciente";

            if (r) {
                DB.actualizar("recetas", r.id, datos);
                DB.registrarActividad("receta", `Receta actualizada: ${nombrePac}`, { id: r.id });
                Utils.toast("Receta actualizada.", "success");
            } else {
                const nuevoId = Utils.generarId("REC", "recetas");
                DB.agregar("recetas", {
                    id: nuevoId,
                    ...datos,
                    idUsuario: Auth.sesion().id
                });
                DB.registrarActividad("receta", `Nueva receta: ${nombrePac}`, { id: nuevoId });
                Utils.toast("Receta emitida.", "success");
            }

            this.consultaId = null;
            Modal.cerrar();
            this.pintar();
        });
    },

    async eliminar(id) {
        const r = DB.porId("recetas", id);
        const p = DB.porId("pacientes", r.idPaciente);
        const ok = await Utils.confirmar("¿Eliminar esta receta?", "Eliminar receta", "Eliminar");
        if (!ok) return;
        DB.eliminar("recetas", id);
        DB.registrarActividad("receta", `Receta eliminada: ${p ? p.nombre + " " + p.apellidos : "—"}`, { id });
        Utils.toast("Receta eliminada.", "success");
        this.pintar();
    }
};

App.registrarModulo("recetas", Recetas);