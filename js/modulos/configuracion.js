App.registrarModulo("configuracion", {
    titulo: "Configuración",
    sub: "Ajustes generales del sistema",

    render(c) {
        if (!Auth.esAdmin()) {
            c.innerHTML = `<div class="vista">${Utils.vacio("No tienes permisos para acceder a este módulo", "ban")}</div>`;
            Utils.refrescarIconos();
            return;
        }

        const conf = DB.config();
        const tema = DB.obtenerTema();

        c.innerHTML = `
        <div class="vista">
            <div class="vista-enc">
                <div>
                    <h2 class="vista-titulo">Configuración</h2>
                    <p class="vista-sub">Ajustes generales de la clínica</p>
                </div>
            </div>

            <div class="card">
                <div class="card-header"><h3>${Icono("building-2", 16)} Información de la clínica</h3></div>
                <div class="card-body">
                    <div class="form-grid">
                        ${Utils.campo({ id: "cNombre", label: "Nombre de la clínica", valor: conf.nombreClinica, requerido: true, ancho: "completo" })}
                        ${Utils.campo({ id: "cDireccion", label: "Dirección", valor: conf.direccion, ancho: "completo" })}
                        ${Utils.campo({ id: "cTelefono", label: "Teléfono", valor: conf.telefono })}
                        ${Utils.campo({ id: "cCorreo", label: "Correo de contacto", tipo: "email", valor: conf.correo })}
                    </div>
                </div>
            </div>

            <div class="card">
                <div class="card-header"><h3>${Icono("clock", 16)} Horario de atención</h3></div>
                <div class="card-body">
                    <div class="form-grid">
                        ${Utils.campo({ id: "cHoraInicio", label: "Hora de apertura", tipo: "time", valor: conf.horaInicio })}
                        ${Utils.campo({ id: "cHoraFin", label: "Hora de cierre", tipo: "time", valor: conf.horaFin })}
                        ${Utils.campo({
                            id: "cDuracion", label: "Duración de cada cita", tipo: "select",
                            valor: String(conf.duracionCita),
                            opciones: [
                                { valor: "15", etiqueta: "15 minutos" },
                                { valor: "30", etiqueta: "30 minutos" },
                                { valor: "45", etiqueta: "45 minutos" },
                                { valor: "60", etiqueta: "60 minutos" }
                            ],
                            ayuda: "Esta configuración define los horarios disponibles al agendar citas."
                        })}
                    </div>
                </div>
            </div>

            <div class="card">
                <div class="card-header"><h3>${Icono("palette", 16)} Apariencia</h3></div>
                <div class="card-body">
                    <label style="display:block;font-size:13px;font-weight:600;color:var(--text);margin-bottom:10px">Tema de la interfaz</label>
                    <div style="display:flex;gap:10px;flex-wrap:wrap">
                        <button class="btn ${tema === "claro" ? "btn-primario" : "btn-secundario"}" data-tema-btn="claro">
                            ${Icono("sun", 14)} Claro
                        </button>
                        <button class="btn ${tema === "oscuro" ? "btn-primario" : "btn-secundario"}" data-tema-btn="oscuro">
                            ${Icono("moon", 14)} Oscuro
                        </button>
                    </div>
                </div>
            </div>

            <div class="card">
                <div class="card-header"><h3>${Icono("alert-triangle", 16)} Zona de riesgo</h3></div>
                <div class="card-body">
                    <p style="font-size:13.5px;color:var(--text-2);margin-bottom:14px">
                        Restablecer el sistema elimina TODOS los datos (pacientes, citas, consultas, recetas, usuarios, actividad) y vuelve al estado inicial de demostración.
                    </p>
                    <button class="btn btn-peligro" id="btnReset">${Icono("trash-2", 14)} Restablecer el sistema</button>
                </div>
            </div>

            <div style="display:flex;justify-content:flex-end;gap:10px">
                <button class="btn btn-secundario" id="btnCancel">Descartar cambios</button>
                <button class="btn btn-primario" id="btnSaveConf">${Icono("save", 14)} Guardar configuración</button>
            </div>
        </div>`;

        Utils.refrescarIconos();

        Utils.qsa("[data-tema-btn]").forEach(b => b.addEventListener("click", () => {
            const t = b.dataset.temaBtn;
            DB.guardarTema(t);
            App.aplicarTema(t);
            this.render(c);
            App.renderHeader();
            Utils.toast(`Modo ${t} activado`, "success");
        }));

        Utils.el("btnSaveConf").addEventListener("click", () => {
            const horaInicio = Utils.el("cHoraInicio").value;
            const horaFin = Utils.el("cHoraFin").value;
            if (horaInicio >= horaFin) {
                Utils.toast("La hora de cierre debe ser mayor a la de apertura.", "warning");
                return;
            }

            const nueva = {
                nombreClinica: Utils.el("cNombre").value.trim() || "Agenda Médica",
                direccion: Utils.el("cDireccion").value.trim(),
                telefono: Utils.el("cTelefono").value.trim(),
                correo: Utils.el("cCorreo").value.trim(),
                horaInicio,
                horaFin,
                duracionCita: parseInt(Utils.el("cDuracion").value) || 30,
                tema: DB.obtenerTema(),
                notificaciones: true
            };
            DB.guardarConfig(nueva);
            DB.registrarActividad("usuario", "Configuración del sistema actualizada", {});
            Utils.toast("Configuración guardada.", "success");
        });

        Utils.el("btnCancel").addEventListener("click", () => this.render(c));

        Utils.el("btnReset").addEventListener("click", async () => {
            const ok = await Utils.confirmar(
                "¿Seguro que quieres restablecer el sistema? Esta acción no se puede deshacer.",
                "Restablecer el sistema", "Restablecer"
            );
            if (!ok) return;

            DB.restablecer();
            Auth.cerrarSesion();
            Utils.toast("Sistema restablecido. Redirigiendo...", "success");
            setTimeout(() => window.location.href = "login.html", 800);
        });
    }
});