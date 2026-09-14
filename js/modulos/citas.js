App.registrarModulo("citas", {
    titulo: "Citas",
    sub: "Agenda de citas médicas",
    _vista: "mes",
    _fecha: null,
    _estado: "",

    render(c) {
        if (!this._fecha) this._fecha = Utils.hoy();
        const esPaciente = Auth.sesion().rol === "Paciente";

        c.innerHTML = `
        <div class="vista">
            <div class="vista-enc">
                <div>
                    <h2 class="vista-titulo">${esPaciente ? "Mis citas" : "Agenda de citas"}</h2>
                    <p class="vista-sub">${esPaciente ? "Agenda y consulta tus citas médicas" : "Consulta y programa citas"}</p>
                </div>
                <div class="vista-acciones">
                    <select class="filtro-select" id="filtroEstado">
                        <option value="">Todos los estados</option>
                        <option value="Pendiente">Pendiente</option>
                        <option value="Confirmada">Confirmada</option>
                        <option value="En espera">En espera</option>
                        <option value="En consulta">En consulta</option>
                        <option value="Atendida">Atendida</option>
                        <option value="Cancelada">Cancelada</option>
                        <option value="No asistió">No asistió</option>
                    </select>
                    ${Auth.puede("citas", "crear")
                        ? `<button class="btn btn-primario" id="btnNuevaCita">＋ ${esPaciente ? "Agendar cita" : "Nueva cita"}</button>` : ""}
                </div>
            </div>

            <div class="calendario-controles">
                <div class="calendario-vistas">
                    <button class="vista-btn" data-vista="dia">Día</button>
                    <button class="vista-btn" data-vista="semana">Semana</button>
                    <button class="vista-btn activo" data-vista="mes">Mes</button>
                </div>
                <div class="calendario-nav">
                    <button class="calendario-btn-nav" id="navPrev">${Icono("chevron-left", 16)}</button>
                    <div class="calendario-titulo" id="calTitulo"></div>
                    <button class="calendario-btn-nav" id="navNext">${Icono("chevron-right", 16)}</button>
                    <button class="calendario-btn-nav" id="navHoy" title="Ir a hoy">${Icono("calendar-check", 16)}</button>
                </div>
            </div>

            <div id="calContenido"></div>
        </div>`;

        Utils.qsa(".vista-btn").forEach(b => b.addEventListener("click", () => {
            this._vista = b.dataset.vista;
            Utils.qsa(".vista-btn").forEach(x => x.classList.toggle("activo", x === b));
            this.pintar();
        }));

        Utils.el("navPrev").addEventListener("click", () => this.navegarFecha(-1));
        Utils.el("navNext").addEventListener("click", () => this.navegarFecha(1));
        Utils.el("navHoy").addEventListener("click", () => { this._fecha = Utils.hoy(); this.pintar(); });
        Utils.el("filtroEstado").addEventListener("change", e => { this._estado = e.target.value; this.pintar(); });

        const btn = Utils.el("btnNuevaCita");
        if (btn) btn.addEventListener("click", () => this.formulario());

        this.pintar();
    },

    citasVisibles() {
        let citas = DB.obtener("citas");
        const sesion = Auth.sesion();
        if (sesion.rol === "Paciente") {
            citas = citas.filter(c => c.idPaciente === sesion.idPaciente);
        }
        if (this._estado) citas = citas.filter(c => c.estado === this._estado);
        return citas;
    },

    navegarFecha(delta) {
        const f = new Date(this._fecha + "T00:00:00");
        if (this._vista === "dia") f.setDate(f.getDate() + delta);
        else if (this._vista === "semana") f.setDate(f.getDate() + delta * 7);
        else f.setMonth(f.getMonth() + delta);
        this._fecha = f.toISOString().split("T")[0];
        this.pintar();
    },

    pintar() {
        const cont = Utils.el("calContenido");
        if (this._vista === "mes") {
            Utils.el("calTitulo").textContent = Utils.nombreMes(this._fecha);
            cont.innerHTML = this.renderMes();
        } else if (this._vista === "semana") {
            const dias = Utils.semanaDe(this._fecha);
            Utils.el("calTitulo").textContent = `Semana del ${Utils.fechaCorta(dias[0])} al ${Utils.fechaCorta(dias[6])}`;
            cont.innerHTML = this.renderTiempo(dias);
        } else {
            Utils.el("calTitulo").textContent = Utils.fechaLarga(this._fecha);
            cont.innerHTML = this.renderTiempo([this._fecha]);
        }
        this.conectarCalendario();
        Utils.refrescarIconos();
    },

    renderMes() {
        const { dias } = Utils.mesDe(this._fecha);
        const citas = this.citasVisibles();

        let html = `<div class="cal-mes">
            ${Utils.diasCortos.map(d => `<div class="cal-mes-header">${d}</div>`).join("")}
        `;

        dias.forEach(d => {
            const citasDelDia = citas.filter(c => c.fecha === d.fecha).sort((a, b) => a.hora.localeCompare(b.hora));
            const clases = ["cal-mes-dia"];
            if (!d.esDelMes) clases.push("otro-mes");
            if (d.esHoy) clases.push("hoy");
            if (d.fecha === this._fecha) clases.push("seleccionado");

            html += `<div class="${clases.join(" ")}" data-fecha="${d.fecha}">
                <div class="cal-mes-numero">${d.dia}</div>
                <div class="cal-mes-citas">
                    ${citasDelDia.slice(0, 3).map(c => {
                        const p = DB.porId("pacientes", c.idPaciente);
                        return `<div class="cal-mes-cita" title="${Utils.esc(p ? p.nombre + " " + p.apellidos : "")} · ${Utils.esc(c.motivo)}">${Utils.esc(c.hora)} ${Utils.esc(p ? p.nombre : "—")}</div>`;
                    }).join("")}
                    ${citasDelDia.length > 3 ? `<div class="cal-mes-mas">+${citasDelDia.length - 3} más</div>` : ""}
                </div>
            </div>`;
        });

        html += `</div>`;
        return html;
    },

    renderTiempo(fechas) {
        const esDia = fechas.length === 1;
        const slots = Utils.slotsHorarios();
        const citas = this.citasVisibles();

        let header = `<div class="cal-tiempo-header ${esDia ? "dia" : "semana"}">
            <div class="cal-tiempo-header-celda"></div>
            ${fechas.map(f => {
                const d = new Date(f + "T00:00:00");
                const esHoy = f === Utils.hoy();
                const diaSemana = d.toLocaleDateString("es-MX", { weekday: "short" });
                return `<div class="cal-tiempo-header-celda ${esHoy ? "hoy" : ""}">
                    ${Utils.esc(diaSemana.charAt(0).toUpperCase() + diaSemana.slice(1))}
                    <small>${d.getDate()}</small>
                </div>`;
            }).join("")}
        </div>`;

        let body = `<div class="cal-tiempo-body ${esDia ? "dia" : "semana"}">`;

        slots.forEach(slot => {
            body += `<div class="cal-hora">${slot}</div>`;
            fechas.forEach(fecha => {
                const citasSlot = citas.filter(c => c.fecha === fecha && c.hora === slot);
                const ocupado = citasSlot.length > 0;
                body += `<div class="cal-slot ${ocupado ? "ocupado" : ""}" data-fecha="${fecha}" data-hora="${slot}">`;
                citasSlot.forEach(c => {
                    const p = DB.porId("pacientes", c.idPaciente);
                    const estadoClase = "estado-" + c.estado.toLowerCase().replace(/\s+/g, "-").normalize("NFD").replace(/[\u0300-\u036f]/g, "");
                    body += `<div class="cal-cita ${estadoClase}" data-cita="${c.id}" title="${Utils.esc(p ? p.nombre + " " + p.apellidos : "")} · ${Utils.esc(c.motivo)}">
                        ${Utils.esc(p ? p.nombre : "Paciente")}
                        <small>${Utils.esc(c.motivo)}</small>
                    </div>`;
                });
                body += `</div>`;
            });
        });

        body += `</div>`;
        return `<div class="cal-tiempo">${header}${body}</div>`;
    },

    conectarCalendario() {
        Utils.qsa(".cal-mes-dia").forEach(d => {
            d.addEventListener("click", () => {
                this._fecha = d.dataset.fecha;
                this._vista = "dia";
                Utils.qsa(".vista-btn").forEach(x => x.classList.toggle("activo", x.dataset.vista === "dia"));
                this.pintar();
            });
        });

        Utils.qsa(".cal-cita").forEach(el => {
            el.addEventListener("click", (e) => {
                e.stopPropagation();
                const cita = DB.porId("citas", el.dataset.cita);
                this.verDetalleCita(cita);
            });
        });

        Utils.qsa(".cal-slot").forEach(s => {
            if (s.classList.contains("ocupado")) return;
            s.addEventListener("click", () => {
                if (!Auth.puede("citas", "crear")) return;
                this.formulario(null, s.dataset.fecha, s.dataset.hora);
            });
        });
    },

    verDetalleCita(cita) {
        if (!cita) return;
        const p = DB.porId("pacientes", cita.idPaciente);
        const sesion = Auth.sesion();
        const esPaciente = sesion.rol === "Paciente";
        const puedeEditar = Auth.puede("citas", "editar") && !esPaciente;
        const puedeConfirmar = (sesion.rol === "Administrador" || sesion.rol === "Usuario");
        const puedeIniciarConsulta = puedeConfirmar && (cita.estado === "Confirmada" || cita.estado === "En espera");

        const cuerpo = `
            <div class="form-seccion">
                <div class="form-seccion-titulo">${Icono("user", 14)} Información de la cita</div>
                <div class="info-grid">
                    <div class="info-item"><label>Paciente</label><span>${Utils.esc(p ? p.nombre + " " + p.apellidos : "—")}</span></div>
                    <div class="info-item"><label>Estado</label><span class="badge ${Utils.badgeCita(cita.estado)}">${Utils.esc(cita.estado)}</span></div>
                    <div class="info-item"><label>Fecha</label><span>${Utils.fecha(cita.fecha)}</span></div>
                    <div class="info-item"><label>Hora</label><span>${Utils.esc(cita.hora)}</span></div>
                    <div class="info-item" style="grid-column:1/-1"><label>Motivo</label><span>${Utils.esc(cita.motivo)}</span></div>
                    ${cita.observaciones ? `<div class="info-item" style="grid-column:1/-1"><label>Observaciones</label><span>${Utils.esc(cita.observaciones)}</span></div>` : ""}
                </div>
            </div>`;

        let footer = `<button class="btn btn-secundario" onclick="Modal.cerrar()">Cerrar</button>`;

        if (puedeIniciarConsulta) {
            footer += `<button class="btn btn-primario" id="btnIniciarCons">${Icono("play", 14)} Iniciar consulta</button>`;
        }

        Modal.abrir({ titulo: "Detalle de la cita", cuerpo, footer });

        if (puedeIniciarConsulta) {
            Utils.el("btnIniciarCons").addEventListener("click", () => {
                Modal.cerrar();
                App.navegar("consultas");
                setTimeout(() => Consultas.formulario(null, cita.idPaciente, cita.id), 250);
            });
        }
    },

    formulario(id = null, fechaSugerida = null, horaSugerida = null) {
        const ct = id ? DB.porId("citas", id) : null;
        const sesion = Auth.sesion();
        const esPaciente = sesion.rol === "Paciente";

        let pacientes = DB.obtener("pacientes").filter(p => (p.estado || "Activo") === "Activo");
        if (esPaciente) {
            pacientes = pacientes.filter(p => p.id === sesion.idPaciente);
        }

        if (!pacientes.length) {
            Utils.toast("Primero registra un paciente activo.", "warning");
            return;
        }

        let medicos = [];
        if (esPaciente) {
            medicos = DB.obtener("usuarios").filter(u => (u.rol === "Usuario" || u.rol === "Administrador") && u.estado === "Activo");
        }

        const estados = esPaciente
            ? ["Pendiente"]
            : ["Pendiente", "Confirmada", "En espera", "En consulta", "Atendida", "Cancelada", "No asistió"];

        const slots = Utils.slotsHorarios();
        const conf = DB.config();

        const opcionesHora = slots.map(h => ({ valor: h, etiqueta: h }));

        const cuerpo = `<div class="form-seccion">
            <div class="form-seccion-titulo">${Icono("calendar", 14)} Información de la cita</div>
            <div class="form-grid">
                ${Utils.campo({
                    id: "cPaciente", label: "Paciente", tipo: "select", requerido: true,
                    valor: ct?.idPaciente || pacientes[0].id,
                    opciones: pacientes.map(p => ({ valor: p.id, etiqueta: `${p.nombre} ${p.apellidos}` })),
                    ancho: "completo"
                })}
                ${esPaciente ? Utils.campo({
                    id: "cMedico", label: "Médico", tipo: "select", requerido: true,
                    valor: ct?.idMedico || (medicos[0]?.id || ""),
                    opciones: medicos.length
                        ? medicos.map(m => ({ valor: m.id, etiqueta: m.nombre }))
                        : [{ valor: "", etiqueta: "— Sin médicos disponibles —", disabled: true }],
                    ancho: "completo",
                    ayuda: "Selecciona al médico que te atenderá"
                }) : ""}
                ${!esPaciente ? Utils.campo({
                    id: "cEstado", label: "Estado", tipo: "select", valor: ct?.estado || "Pendiente",
                    opciones: estados.map(e => ({ valor: e, etiqueta: e }))
                }) : `<input type="hidden" id="cEstado" value="Pendiente">`}
                ${Utils.campo({ id: "cFecha", label: "Fecha", tipo: "date", valor: ct?.fecha || fechaSugerida || this._fecha, requerido: true })}
                ${Utils.campo({
                    id: "cHora", label: "Hora", tipo: "select", requerido: true,
                    valor: ct?.hora || horaSugerida || slots[0],
                    opciones: opcionesHora,
                    ayuda: `Horario: ${conf.horaInicio} - ${conf.horaFin} (${conf.duracionCita} min por cita)`
                })}
                ${Utils.campo({ id: "cMotivo", label: "Motivo", valor: ct?.motivo || "", requerido: true, placeholder: "Consulta general, seguimiento...", ancho: "completo" })}
                ${Utils.campo({ id: "cObs", label: "Observaciones", tipo: "textarea", valor: ct?.observaciones || "", ancho: "completo" })}
            </div>
            <div id="avisoConflicto" style="display:none;background:var(--warning-light);border-left:4px solid var(--warning);padding:10px 14px;border-radius:8px;font-size:13px;color:#78350f;margin-top:8px">
                ⚠️ Este horario ya está ocupado por otra cita.
            </div>
        </div>`;

        const footer = `
            <button class="btn btn-secundario" id="cancelCita">Cancelar</button>
            <button class="btn btn-primario" id="saveCita">${ct ? "Guardar cambios" : (esPaciente ? "Solicitar cita" : "Agendar cita")}</button>`;

        Modal.abrir({ titulo: ct ? "Editar cita" : (esPaciente ? "Solicitar cita" : "Nueva cita"), cuerpo, footer });

        Utils.activarValidacion("cMotivo", Validar.requerido);

        const verificarConflicto = () => {
            const fecha = Utils.el("cFecha").value;
            const hora = Utils.el("cHora").value;
            const aviso = Utils.el("avisoConflicto");
            if (fecha && hora && Utils.hayConflictoHorario(fecha, hora, ct?.id)) {
                aviso.style.display = "block";
            } else {
                aviso.style.display = "none";
            }
        };
        Utils.el("cFecha").addEventListener("change", verificarConflicto);
        Utils.el("cHora").addEventListener("change", verificarConflicto);
        verificarConflicto();

        Utils.el("cancelCita").addEventListener("click", () => Modal.cerrar());
        Utils.el("saveCita").addEventListener("click", () => {
            const medicoEl = Utils.el("cMedico");
            const datos = {
                idPaciente: Utils.el("cPaciente").value,
                idMedico: medicoEl ? medicoEl.value : (ct?.idMedico || null),
                fecha: Utils.el("cFecha").value,
                hora: Utils.el("cHora").value,
                estado: Utils.el("cEstado").value,
                motivo: Utils.el("cMotivo").value.trim(),
                observaciones: Utils.el("cObs").value.trim()
            };

            const vMotivo = Utils.validarCampo("cMotivo", Validar.requerido);
            if (!datos.fecha || !datos.hora || !vMotivo) {
                Utils.toast("Completa los campos obligatorios.", "warning");
                return;
            }

            if (Utils.hayConflictoHorario(datos.fecha, datos.hora, ct?.id)) {
                Utils.toast("Ya existe otra cita en ese horario. Elige otra hora.", "error");
                Utils.el("avisoConflicto").style.display = "block";
                return;
            }

            const p = DB.porId("pacientes", datos.idPaciente);
            const nombrePac = p ? `${p.nombre} ${p.apellidos}` : "Paciente";

            if (ct) {
                DB.actualizar("citas", ct.id, datos);
                DB.registrarActividad("cita", `Cita actualizada: ${nombrePac}`, { id: ct.id });
                Utils.toast("Cita actualizada.", "success");
            } else {
                const nuevoId = Utils.generarId("CIT", "citas");
                DB.agregar("citas", { id: nuevoId, ...datos });
                if (esPaciente) {
                    DB.registrarActividad("cita", `Solicitud de cita: ${nombrePac}`, { id: nuevoId });
                    Utils.toast("Solicitud enviada. Espera confirmación del médico.", "success");
                } else {
                    DB.registrarActividad("cita", `Nueva cita: ${nombrePac}`, { id: nuevoId });
                    Utils.toast("Cita agendada.", "success");
                }
            }

            Modal.cerrar();
            this._fecha = datos.fecha;
            this.pintar();
        });
    },

    async eliminar(id) {
        const c = DB.porId("citas", id);
        const p = DB.porId("pacientes", c.idPaciente);
        const ok = await Utils.confirmar(
            `¿Eliminar la cita de ${p ? p.nombre + " " + p.apellidos : "este paciente"}?`,
            "Eliminar cita", "Eliminar"
        );
        if (!ok) return;
        DB.eliminar("citas", id);
        DB.registrarActividad("cita", `Cita eliminada: ${p ? p.nombre + " " + p.apellidos : "—"}`, { id });
        Utils.toast("Cita eliminada.", "success");
        this.pintar();
    }
});