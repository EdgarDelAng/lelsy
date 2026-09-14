const Historia = { pacienteId: null };

App.registrarModulo("historia", {
    titulo: "Historia clínica",
    sub: "Consulta el historial completo de un paciente",

    render(c) {
        const sesion = Auth.sesion();
        const esPaciente = sesion.rol === "Paciente";

        let pacientes = DB.obtener("pacientes").filter(p => (p.estado || "Activo") === "Activo");
        if (esPaciente) {
            pacientes = pacientes.filter(p => p.id === sesion.idPaciente);
        }

        if (!pacientes.length) {
            c.innerHTML = `
                <div class="vista">
                    <div class="vista-enc">
                        <div>
                            <h2 class="vista-titulo">Historia clínica</h2>
                            <p class="vista-sub">Consulta el historial completo de un paciente</p>
                        </div>
                    </div>
                    ${Utils.vacio(esPaciente ? "No hay datos disponibles" : "No hay pacientes registrados", "users")}
                </div>`;
            Utils.refrescarIconos();
            return;
        }

        let pid;
        if (esPaciente) {
            pid = sesion.idPaciente;
        } else {
            pid = Historia.pacienteId || pacientes[0].id;
        }

        const p = DB.porId("pacientes", pid);
        if (!p) {
            c.innerHTML = `<div class="vista">${Utils.vacio("Paciente no encontrado", "user-x")}</div>`;
            Utils.refrescarIconos();
            return;
        }

        const consultas = DB.obtener("consultas").filter(x => x.idPaciente === pid);
        const recetas = DB.obtener("recetas").filter(x => x.idPaciente === pid);
        const citas = DB.obtener("citas").filter(x => x.idPaciente === pid);
        const ultimaConsulta = [...consultas].sort((a, b) => b.fecha.localeCompare(a.fecha))[0];
        const proximaCita = [...citas].filter(x => x.fecha >= Utils.hoy() && x.estado !== "Cancelada")
            .sort((a, b) => a.fecha.localeCompare(b.fecha))[0];

        c.innerHTML = `
        <div class="vista">
            <div class="vista-enc">
                <div>
                    <h2 class="vista-titulo">${esPaciente ? "Mi historia clínica" : "Historia clínica"}</h2>
                    <p class="vista-sub">${esPaciente ? "Consulta tu historial médico" : "Consulta el historial completo de un paciente"}</p>
                </div>
                ${!esPaciente ? `<div class="vista-acciones">
                    <select class="filtro-select" id="selPacienteHist" style="min-width:240px">
                        ${pacientes.map(x => `
                            <option value="${x.id}" ${x.id === pid ? "selected" : ""}>
                                ${Utils.esc(x.nombre)} ${Utils.esc(x.apellidos)}
                            </option>`).join("")}
                    </select>
                </div>` : ""}
            </div>

            <div class="historia-paciente">
                <div class="historia-paciente-avatar">${Utils.iniciales(p.nombre + " " + p.apellidos)}</div>
                <div class="historia-paciente-info">
                    <h2>${Utils.esc(p.nombre)} ${Utils.esc(p.apellidos)}</h2>
                    <p>${Utils.esc(p.telefono || "")} ${Auth.puedeVerCampo("paciente", "correo", pid) && p.correo ? "· " + Utils.esc(p.correo) : ""}</p>
                    <div class="historia-paciente-datos">
                        <div class="historia-paciente-dato"><strong>${Utils.edad(p.fechaNacimiento)} años</strong>Edad</div>
                        <div class="historia-paciente-dato"><strong>${Utils.esc(p.sexo || "—")}</strong>Sexo</div>
                        <div class="historia-paciente-dato"><strong>${Auth.puedeVerCampo("paciente", "alergias", pid) ? Utils.esc(p.alergias || "Ninguna") : "Restringido"}</strong>Alergias</div>
                    </div>
                </div>
            </div>

            <div class="historia-stats">
                <div class="historia-stat"><strong>${consultas.length}</strong><span>Consultas</span></div>
                <div class="historia-stat"><strong>${recetas.length}</strong><span>Recetas</span></div>
                <div class="historia-stat"><strong>${ultimaConsulta ? Utils.fechaCorta(ultimaConsulta.fecha) : "—"}</strong><span>Última consulta</span></div>
                <div class="historia-stat"><strong>${proximaCita ? Utils.fechaCorta(proximaCita.fecha) : "—"}</strong><span>Próxima cita</span></div>
            </div>

            <div class="tabs">
                <button class="tab activo" data-tab="info">${Icono("user", 14)} Datos</button>
                <button class="tab" data-tab="timeline">${Icono("history", 14)} Línea de tiempo</button>
                <button class="tab" data-tab="consultas">${Icono("stethoscope", 14)} Consultas</button>
                <button class="tab" data-tab="recetas">${Icono("pill", 14)} Recetas</button>
            </div>

            <div id="tabContenido"></div>
        </div>`;

        const selPac = Utils.el("selPacienteHist");
        if (selPac) {
            selPac.addEventListener("change", e => {
                Historia.pacienteId = e.target.value;
                this.render(c);
            });
        }

        Utils.qsa(".tab", c).forEach(t => t.addEventListener("click", () => {
            Utils.qsa(".tab", c).forEach(x => x.classList.remove("activo"));
            t.classList.add("activo");
            this.pintarTab(t.dataset.tab, p);
        }));

        this.pintarTab("info", p);
        Utils.refrescarIconos();
    },

    pintarTab(tab, p) {
        const cont = Utils.el("tabContenido");

        if (tab === "info") {
            cont.innerHTML = `<div class="card"><div class="card-body">
                <div class="info-grid">
                    <div class="info-item"><label>Nombre completo</label><span>${Utils.esc(p.nombre)} ${Utils.esc(p.apellidos)}</span></div>
                    <div class="info-item"><label>Fecha de nacimiento</label><span>${Utils.fecha(p.fechaNacimiento)}</span></div>
                    <div class="info-item"><label>Edad</label><span>${Utils.edad(p.fechaNacimiento)} años</span></div>
                    <div class="info-item"><label>Sexo</label><span>${Utils.esc(p.sexo || "—")}</span></div>
                    <div class="info-item"><label>Teléfono</label><span>${Utils.esc(p.telefono || "—")}</span></div>
                    <div class="info-item"><label>Correo</label><span>${Auth.verCampo("paciente", "correo", p.correo, p.id)}</span></div>
                    <div class="info-item"><label>Dirección</label><span>${Auth.verCampo("paciente", "direccion", p.direccion, p.id)}</span></div>
                    <div class="info-item"><label>Contacto de emergencia</label><span>${Auth.verCampo("paciente", "contactoEmergencia", p.contactoEmergencia, p.id)}</span></div>
                    <div class="info-item"><label>Alergias</label><span>${Auth.verCampo("paciente", "alergias", p.alergias, p.id)}</span></div>
                    <div class="info-item"><label>Antecedentes</label><span>${Auth.verCampo("paciente", "antecedentes", p.antecedentes, p.id)}</span></div>
                </div>
            </div></div>`;
            Utils.refrescarIconos();
            return;
        }

        if (tab === "timeline") {
            const consultas = DB.obtener("consultas").filter(c => c.idPaciente === p.id);
            const recetas = DB.obtener("recetas").filter(r => r.idPaciente === p.id);

            const eventos = [
                ...consultas.map(c => ({ tipo: "consulta", fecha: c.fecha, data: c })),
                ...recetas.map(r => ({ tipo: "receta", fecha: r.fecha, data: r }))
            ].sort((a, b) => b.fecha.localeCompare(a.fecha));

            if (!eventos.length) {
                cont.innerHTML = `<div class="card"><div class="card-body">${Utils.vacio("Sin eventos registrados", "history")}</div></div>`;
                Utils.refrescarIconos();
                return;
            }

            cont.innerHTML = `<div class="card"><div class="card-body">
                <div class="timeline">${eventos.map(ev => {
                    if (ev.tipo === "consulta") {
                        const c = ev.data;
                        return `<div class="timeline-item">
                            <div class="timeline-item-header">
                                <strong>${Icono("stethoscope", 14)} ${Utils.esc(c.motivo)}</strong>
                                <span>${Utils.fecha(c.fecha)}</span>
                            </div>
                            <div class="timeline-card">
                                <div><span class="tag">Consulta</span></div>
                                ${c.diagnostico ? `<div style="margin-top:6px"><b>Diagnóstico:</b> ${Utils.esc(c.diagnostico)}</div>` : ""}
                                ${c.tratamiento ? `<div><b>Tratamiento:</b> ${Utils.esc(c.tratamiento)}</div>` : ""}
                                ${c.observaciones ? `<div><b>Obs:</b> ${Utils.esc(c.observaciones)}</div>` : ""}
                            </div>
                        </div>`;
                    } else {
                        const r = ev.data;
                        return `<div class="timeline-item">
                            <div class="timeline-item-header">
                                <strong>${Icono("pill", 14)} Receta ${Utils.esc(r.id)}</strong>
                                <span>${Utils.fecha(r.fecha)}</span>
                            </div>
                            <div class="timeline-card">
                                <div><span class="tag">Receta</span></div>
                                ${(r.medicamentos || []).map(m => `
                                    <div style="margin-top:4px">💊 <b>${Utils.esc(m.medicamento)}</b> · ${Utils.esc(m.dosis)} · ${Utils.esc(m.frecuencia)} · ${Utils.esc(m.duracion)}</div>
                                `).join("")}
                            </div>
                        </div>`;
                    }
                }).join("")}</div>
            </div></div>`;
            Utils.refrescarIconos();
            return;
        }

        if (tab === "consultas") {
            const cons = DB.obtener("consultas")
                .filter(c => c.idPaciente === p.id)
                .sort((a, b) => b.fecha.localeCompare(a.fecha));

            if (!cons.length) {
                cont.innerHTML = `<div class="card"><div class="card-body">${Utils.vacio("Sin consultas registradas", "stethoscope")}</div></div>`;
                Utils.refrescarIconos();
                return;
            }

            cont.innerHTML = `<div class="card"><div class="card-body">
                <div class="timeline">${cons.map(c => `
                    <div class="timeline-item">
                        <div class="timeline-item-header">
                            <strong>${Utils.esc(c.motivo)}</strong>
                            <span>${Utils.fecha(c.fecha)}</span>
                        </div>
                        <div class="timeline-card">
                            ${c.diagnostico ? `<div><b>Diagnóstico:</b> ${Utils.esc(c.diagnostico)}</div>` : ""}
                            ${c.tratamiento ? `<div><b>Tratamiento:</b> ${Utils.esc(c.tratamiento)}</div>` : ""}
                            ${c.observaciones ? `<div><b>Observaciones:</b> ${Utils.esc(c.observaciones)}</div>` : ""}
                        </div>
                    </div>`).join("")}</div>
            </div></div>`;
            Utils.refrescarIconos();
            return;
        }

        if (tab === "recetas") {
            const recs = DB.obtener("recetas")
                .filter(r => r.idPaciente === p.id)
                .sort((a, b) => b.fecha.localeCompare(a.fecha));

            if (!recs.length) {
                cont.innerHTML = `<div class="card"><div class="card-body">${Utils.vacio("Sin recetas emitidas", "pill")}</div></div>`;
                Utils.refrescarIconos();
                return;
            }

            cont.innerHTML = `<div class="card"><div class="card-body">
                <div class="timeline">${recs.map(r => `
                    <div class="timeline-item">
                        <div class="timeline-item-header">
                            <strong>Receta ${Utils.esc(r.id)}</strong>
                            <span>${Utils.fecha(r.fecha)}</span>
                        </div>
                        <div class="timeline-card">
                            ${(r.medicamentos || []).map(m => `
                                <div>💊 <b>${Utils.esc(m.medicamento)}</b> · ${Utils.esc(m.dosis)} · ${Utils.esc(m.frecuencia)} · ${Utils.esc(m.duracion)}</div>
                            `).join("")}
                            ${r.indicaciones ? `<div style="margin-top:6px"><b>Indicaciones:</b> ${Utils.esc(r.indicaciones)}</div>` : ""}
                        </div>
                    </div>`).join("")}</div>
            </div></div>`;
            Utils.refrescarIconos();
        }
    }
});