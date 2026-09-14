App.registrarModulo("dashboard", {
    titulo: "Inicio",
    sub: "Resumen general de la agenda médica",

    render(c) {
        const sesion = Auth.sesion();

        if (sesion.rol === "Paciente") {
            return this.renderPaciente(c);
        }

        const pacientes = DB.obtener("pacientes").filter(p => p.estado !== "Inactivo");
        const citas = DB.obtener("citas");
        const consultas = DB.obtener("consultas");
        const recetas = DB.obtener("recetas");
        const hoy = Utils.hoy();

        const citasHoy = citas.filter(x => x.fecha === hoy && x.estado !== "Cancelada");
        const consultasHoy = consultas.filter(x => x.fecha === hoy);

        const prox = citasHoy.filter(c => c.estado !== "Atendida")
                             .sort((a, b) => a.hora.localeCompare(b.hora)).slice(0, 5);

        const actividad = DB.obtenerActividad(6);

        const meses = [];
        for (let i = 5; i >= 0; i--) {
            const d = new Date();
            d.setMonth(d.getMonth() - i);
            const año = d.getFullYear();
            const mes = d.getMonth();
            const total = consultas.filter(c => {
                const cd = new Date(c.fecha + "T00:00:00");
                return cd.getFullYear() === año && cd.getMonth() === mes;
            }).length;
            meses.push({ mes: Utils.mesesCortos[mes], total });
        }
        const maxMes = Math.max(...meses.map(m => m.total), 1);

        const estadosCita = {};
        citas.forEach(c => { estadosCita[c.estado] = (estadosCita[c.estado] || 0) + 1; });
        const totalCitas = citas.length || 1;
        const coloresDona = {
            "Atendida": "#6b7280",
            "Confirmada": "#2ab17c",
            "Programada": "#2d6cdf",
            "Pendiente": "#f59e0b",
            "Cancelada": "#dc2626",
            "No asistió": "#f59e0b",
            "En espera": "#f59e0b",
            "En consulta": "#7c3aed"
        };
        let acumulado = 0;
        const donaSegmentos = Object.entries(estadosCita).map(([estado, cantidad]) => {
            const porcentaje = (cantidad / totalCitas) * 100;
            const inicio = acumulado;
            acumulado += porcentaje;
            return `${coloresDona[estado] || "#94a3b8"} ${inicio}% ${acumulado}%`;
        }).join(", ");
        const donaStyle = `background: conic-gradient(${donaSegmentos || "#e6ecf6 0% 100%"});`;

        c.innerHTML = `
        <div class="vista">
            <div class="vista-enc">
                <div>
                    <h2 class="vista-titulo">Hola, ${Utils.esc(sesion.nombre)} 👋</h2>
                    <p class="vista-sub">Resumen general del consultorio</p>
                </div>
            </div>

            <div class="grid-stats">
                <div class="stat-card">
                    <div class="stat-icono">${Icono("users", 22)}</div>
                    <div><div class="stat-valor">${pacientes.length}</div><div class="stat-etiqueta">Pacientes activos</div></div>
                </div>
                <div class="stat-card">
                    <div class="stat-icono success">${Icono("calendar", 22)}</div>
                    <div><div class="stat-valor">${citasHoy.length}</div><div class="stat-etiqueta">Citas hoy</div></div>
                </div>
                <div class="stat-card">
                    <div class="stat-icono warning">${Icono("stethoscope", 22)}</div>
                    <div><div class="stat-valor">${consultasHoy.length}</div><div class="stat-etiqueta">Consultas hoy</div></div>
                </div>
                <div class="stat-card">
                    <div class="stat-icono purple">${Icono("pill", 22)}</div>
                    <div><div class="stat-valor">${recetas.length}</div><div class="stat-etiqueta">Recetas totales</div></div>
                </div>
            </div>

            <div class="grid-2">
                <div class="card">
                    <div class="card-header">
                        <h3>Próximas citas de hoy</h3>
                        <button class="card-link" data-ir="citas">Ver agenda →</button>
                    </div>
                    <div class="card-body">
                        ${prox.length
                            ? `<ul class="lista-citas">${prox.map(ct => {
                                const p = DB.porId("pacientes", ct.idPaciente);
                                return `<li class="item-cita">
                                    <div class="item-cita-hora">${Utils.esc(ct.hora)}</div>
                                    <div class="item-cita-info">
                                        <strong>${Utils.esc(p ? p.nombre + " " + p.apellidos : "Paciente eliminado")}</strong>
                                        <span>${Utils.esc(ct.motivo)}</span>
                                    </div>
                                    <span class="badge ${Utils.badgeCita(ct.estado)}">${Utils.esc(ct.estado)}</span>
                                </li>`;
                            }).join("")}</ul>`
                            : Utils.vacio("No hay citas pendientes para hoy", "calendar")}
                    </div>
                </div>

                <div class="card">
                    <div class="card-header">
                        <h3>Actividad reciente</h3>
                    </div>
                    <div class="card-body">
                        ${actividad.length
                            ? `<ul class="lista-actividad">${actividad.map(a => {
                                const iconoPorTipo = {
                                    paciente: "user",
                                    cita: "calendar",
                                    consulta: "stethoscope",
                                    receta: "pill",
                                    usuario: "user-cog"
                                };
                                return `<li class="item-actividad">
                                    <div class="item-actividad-icono">${Icono(iconoPorTipo[a.tipo] || "activity", 16)}</div>
                                    <div class="item-actividad-info">
                                        <strong>${Utils.esc(a.descripcion)}</strong>
                                        <span>${Utils.esc(a.usuario)}</span>
                                    </div>
                                    <div class="item-actividad-fecha">${Utils.tiempoRelativo(a.fecha)}</div>
                                </li>`;
                            }).join("")}</ul>`
                            : Utils.vacio("Aún no hay actividad reciente", "activity")}
                    </div>
                </div>
            </div>

            <div class="grid-2">
                <div class="card">
                    <div class="card-header"><h3>Consultas por mes</h3></div>
                    <div class="card-body">
                        <div class="grafica-barras">
                            ${meses.map(m => `
                                <div class="grafica-barra-wrapper">
                                    <div class="grafica-barra" style="height:${Math.max(4, (m.total / maxMes) * 100)}%">
                                        <div class="grafica-barra-valor">${m.total}</div>
                                    </div>
                                    <div class="grafica-barra-label">${m.mes}</div>
                                </div>
                            `).join("")}
                        </div>
                    </div>
                </div>

                <div class="card">
                    <div class="card-header"><h3>Citas por estado</h3></div>
                    <div class="card-body">
                        ${citas.length ? `
                            <div class="grafica-dona-wrapper">
                                <div class="grafica-dona" style="${donaStyle}">
                                    <div class="grafica-dona-centro">
                                        <strong>${citas.length}</strong>
                                        <span>citas</span>
                                    </div>
                                </div>
                                <div class="grafica-leyenda">
                                    ${Object.entries(estadosCita).map(([estado, cant]) => `
                                        <div class="grafica-leyenda-item">
                                            <div class="grafica-leyenda-color" style="background:${coloresDona[estado] || '#94a3b8'}"></div>
                                            <span>${Utils.esc(estado)}</span>
                                            <strong>${cant}</strong>
                                        </div>
                                    `).join("")}
                                </div>
                            </div>
                        ` : Utils.vacio("Sin datos de citas todavía", "pie-chart")}
                    </div>
                </div>
            </div>
        </div>`;

        Utils.qsa("[data-ir]", c).forEach(b => b.addEventListener("click", () => App.navegar(b.dataset.ir)));
        Utils.refrescarIconos();
    },

    renderPaciente(c) {
        const sesion = Auth.sesion();
        const pacienteId = sesion.idPaciente;
        const p = DB.porId("pacientes", pacienteId);

        const citas = DB.obtener("citas").filter(x => x.idPaciente === pacienteId);
        const consultas = DB.obtener("consultas").filter(x => x.idPaciente === pacienteId);
        const recetas = DB.obtener("recetas").filter(x => x.idPaciente === pacienteId);

        const proximasCitas = citas
            .filter(c => c.fecha >= Utils.hoy() && c.estado !== "Cancelada")
            .sort((a, b) => a.fecha.localeCompare(b.fecha))
            .slice(0, 3);

        c.innerHTML = `
        <div class="vista">
            <div class="vista-enc">
                <div>
                    <h2 class="vista-titulo">Hola, ${Utils.esc(sesion.nombre)} 👋</h2>
                    <p class="vista-sub">Bienvenido a tu agenda médica personal</p>
                </div>
                <div class="vista-acciones">
                    <button class="btn btn-primario" id="btnAgendarPac">＋ Agendar nueva cita</button>
                </div>
            </div>

            <div class="grid-stats">
                <div class="stat-card">
                    <div class="stat-icono">${Icono("calendar", 22)}</div>
                    <div><div class="stat-valor">${citas.length}</div><div class="stat-etiqueta">Mis citas</div></div>
                </div>
                <div class="stat-card">
                    <div class="stat-icono success">${Icono("stethoscope", 22)}</div>
                    <div><div class="stat-valor">${consultas.length}</div><div class="stat-etiqueta">Mis consultas</div></div>
                </div>
                <div class="stat-card">
                    <div class="stat-icono warning">${Icono("pill", 22)}</div>
                    <div><div class="stat-valor">${recetas.length}</div><div class="stat-etiqueta">Mis recetas</div></div>
                </div>
                <div class="stat-card">
                    <div class="stat-icono purple">${Icono("clipboard-list", 22)}</div>
                    <div><div class="stat-valor">${p ? Utils.edad(p.fechaNacimiento) : "—"}</div><div class="stat-etiqueta">Mi edad</div></div>
                </div>
            </div>

            <div class="card">
                <div class="card-header">
                    <h3>Mis próximas citas</h3>
                    <button class="card-link" data-ir="citas">Ver todas →</button>
                </div>
                <div class="card-body">
                    ${proximasCitas.length ? proximasCitas.map(ct => `
                        <div class="item-cita">
                            <div class="item-cita-hora">${Utils.esc(ct.hora)}</div>
                            <div class="item-cita-info">
                                <strong>${Utils.fecha(ct.fecha)}</strong>
                                <span>${Utils.esc(ct.motivo)}</span>
                            </div>
                            <span class="badge ${Utils.badgeCita(ct.estado)}">${Utils.esc(ct.estado)}</span>
                        </div>
                    `).join("") : Utils.vacio("No tienes citas próximas", "calendar")}
                </div>
            </div>

            <div class="grid-2">
                <div class="card">
                    <div class="card-header">
                        <h3>Mis últimas consultas</h3>
                        <button class="card-link" data-ir="consultas">Ver todas →</button>
                    </div>
                    <div class="card-body">
                        ${consultas.length ? consultas
                            .sort((a, b) => b.fecha.localeCompare(a.fecha))
                            .slice(0, 3)
                            .map(ct => `
                                <div class="item-actividad">
                                    <div class="item-actividad-icono">${Icono("stethoscope", 16)}</div>
                                    <div class="item-actividad-info">
                                        <strong>${Utils.esc(ct.motivo)}</strong>
                                        <span>${Utils.esc(ct.diagnostico || "Sin diagnóstico")}</span>
                                    </div>
                                    <div class="item-actividad-fecha">${Utils.fecha(ct.fecha)}</div>
                                </div>
                            `).join("") : Utils.vacio("Sin consultas registradas", "stethoscope")}
                    </div>
                </div>

                <div class="card">
                    <div class="card-header">
                        <h3>Mis últimas recetas</h3>
                        <button class="card-link" data-ir="recetas">Ver todas →</button>
                    </div>
                    <div class="card-body">
                        ${recetas.length ? recetas
                            .sort((a, b) => b.fecha.localeCompare(a.fecha))
                            .slice(0, 3)
                            .map(r => `
                                <div class="item-actividad">
                                    <div class="item-actividad-icono">${Icono("pill", 16)}</div>
                                    <div class="item-actividad-info">
                                        <strong>Receta ${Utils.esc(r.id)}</strong>
                                        <span>${(r.medicamentos || []).length} medicamento(s)</span>
                                    </div>
                                    <div class="item-actividad-fecha">${Utils.fecha(r.fecha)}</div>
                                </div>
                            `).join("") : Utils.vacio("Sin recetas emitidas", "pill")}
                    </div>
                </div>
            </div>
        </div>`;

        Utils.el("btnAgendarPac").addEventListener("click", () => App.navegar("citas"));
        Utils.qsa("[data-ir]", c).forEach(b => b.addEventListener("click", () => App.navegar(b.dataset.ir)));
        Utils.refrescarIconos();
    }
});