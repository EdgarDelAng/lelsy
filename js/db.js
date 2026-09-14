/* CAPA DE DATOS */
const DB = {
    claves: {
        usuarios:  "am_usuarios",
        pacientes: "am_pacientes",
        citas:     "am_citas",
        consultas: "am_consultas",
        recetas:   "am_recetas",
        actividad: "am_actividad",
        config:    "am_config",
        sesion:    "am_sesion",
        tema:      "am_tema"
    },

    obtener(c) {
        const d = localStorage.getItem(this.claves[c]);
        return d ? JSON.parse(d) : [];
    },
    guardar(c, d) {
        localStorage.setItem(this.claves[c], JSON.stringify(d));
    },
    agregar(c, item) {
        const arr = this.obtener(c);
        arr.push(item);
        this.guardar(c, arr);
        return item;
    },
    actualizar(c, id, cambios) {
        const arr = this.obtener(c);
        const i = arr.findIndex(x => x.id === id);
        if (i === -1) return null;
        arr[i] = { ...arr[i], ...cambios };
        this.guardar(c, arr);
        return arr[i];
    },
    eliminar(c, id) {
        this.guardar(c, this.obtener(c).filter(x => x.id !== id));
    },
    porId(c, id) {
        return this.obtener(c).find(x => x.id === id) || null;
    },

    /* ACTIVIDAD */
    registrarActividad(tipo, descripcion, meta = {}) {
        const sesion = Auth.sesion();
        const evento = {
            id: Utils.generarId("ACT", "actividad"),
            tipo,
            descripcion,
            usuario: sesion ? sesion.nombre : "Sistema",
            usuarioId: sesion ? sesion.id : null,
            fecha: new Date().toISOString(),
            meta
        };
        this.agregar("actividad", evento);
        const arr = this.obtener("actividad");
        if (arr.length > 200) {
            this.guardar("actividad", arr.slice(-200));
        }
        return evento;
    },

    obtenerActividad(limite = 10) {
        const arr = this.obtener("actividad");
        return arr.slice(-limite).reverse();
    },

    /* CONFIG */
    config() {
        const c = localStorage.getItem(this.claves.config);
        return c ? JSON.parse(c) : this.configDefault();
    },
    configDefault() {
        return {
            nombreClinica: "Agenda Médica",
            direccion: "Av. Principal 123, Monterrey, N.L.",
            telefono: "81-1234-5678",
            correo: "contacto@agendamedica.com",
            horaInicio: "09:00",
            horaFin: "18:00",
            duracionCita: 30,
            tema: "claro",
            notificaciones: true
        };
    },
    guardarConfig(c) {
        localStorage.setItem(this.claves.config, JSON.stringify(c));
    },

    /* TEMA */
    obtenerTema() {
        return localStorage.getItem(this.claves.tema) || "claro";
    },
    guardarTema(t) {
        localStorage.setItem(this.claves.tema, t);
    },

    hoyISO() { return new Date().toISOString().split("T")[0]; },

    inicializar() {
        if (!localStorage.getItem(this.claves.usuarios)) {
            this.guardar("usuarios", [
                {
                    id: "USR-0001", nombre: "Dr. Carlos García",
                    correo: "admin@agendamedica.com", password: "admin123",
                    telefono: "81-1234-5678", rol: "Administrador",
                    estado: "Activo", fechaRegistro: "2025-01-15"
                },
                {
                    id: "USR-0002", nombre: "Dra. Ana Martínez",
                    correo: "usuario@agendamedica.com", password: "usuario123",
                    telefono: "81-8765-4321", rol: "Usuario",
                    estado: "Activo", fechaRegistro: "2025-02-20"
                },
                {
                    id: "USR-0003", nombre: "Lesly Nieto",
                    correo: "paciente@agendamedica.com", password: "paciente123",
                    telefono: "81-2345-6789", rol: "Paciente",
                    estado: "Activo", fechaRegistro: "2025-09-12",
                    idPaciente: "PAC-0001"
                }
            ]);
        }
        if (!localStorage.getItem(this.claves.config)) {
            this.guardarConfig(this.configDefault());
        }
        if (!localStorage.getItem(this.claves.pacientes)) {
            this.guardar("pacientes", [
                {
                    id: "PAC-0001", nombre: "Lesly", apellidos: "Nieto",
                    fechaNacimiento: "1992-05-14", sexo: "Femenino", telefono: "81-2345-6789",
                    correo: "paciente@agendamedica.com", direccion: "Av. Juárez 123, Monterrey",
                    alergias: "Penicilina", antecedentes: "Migraña crónica",
                    contactoEmergencia: "José López - 81-1111-2222",
                    estado: "Activo", fechaRegistro: "2025-06-10"
                },
                {
                    id: "PAC-0002", nombre: "Juan", apellidos: "García Ruiz",
                    fechaNacimiento: "1985-11-02", sexo: "Masculino", telefono: "81-3456-7890",
                    correo: "juan.garcia@email.com", direccion: "Calle Hidalgo 45, San Pedro",
                    alergias: "Ninguna", antecedentes: "Hipertensión",
                    contactoEmergencia: "Laura Ruiz - 81-3333-4444",
                    estado: "Activo", fechaRegistro: "2025-07-22"
                },
                {
                    id: "PAC-0003", nombre: "Ana", apellidos: "Martínez Silva",
                    fechaNacimiento: "2001-03-25", sexo: "Femenino", telefono: "81-4567-8901",
                    correo: "ana.martinez@email.com", direccion: "Blvd. Constitución 800, Monterrey",
                    alergias: "Ninguna", antecedentes: "Ninguno",
                    contactoEmergencia: "Rosa Silva - 81-5555-6666",
                    estado: "Activo", fechaRegistro: "2025-08-15"
                }
            ]);
        }
        if (!localStorage.getItem(this.claves.citas)) {
            const h = this.hoyISO();
            this.guardar("citas", [
                { id: "CIT-0001", idPaciente: "PAC-0001", fecha: h, hora: "09:00", motivo: "Consulta general", estado: "Confirmada", observaciones: "" },
                { id: "CIT-0002", idPaciente: "PAC-0002", fecha: h, hora: "10:30", motivo: "Seguimiento", estado: "Pendiente", observaciones: "" },
                { id: "CIT-0003", idPaciente: "PAC-0003", fecha: h, hora: "12:00", motivo: "Control", estado: "Pendiente", observaciones: "" }
            ]);
        }
        if (!localStorage.getItem(this.claves.consultas)) {
            this.guardar("consultas", [
                {
                    id: "CON-0001", idPaciente: "PAC-0001", idCita: null, idUsuario: "USR-0001",
                    fecha: this.hoyISO(), motivo: "Dolor de cabeza",
                    sintomas: "Dolor pulsátil frontal, sensibilidad a la luz",
                    diagnostico: "Migraña", tratamiento: "Reposo, hidratación y medicamento",
                    observaciones: "Seguimiento en 2 semanas",
                    presion: "120/80", temperatura: "36.5", peso: "60", altura: "1.60"
                }
            ]);
        }
        if (!localStorage.getItem(this.claves.recetas)) {
            this.guardar("recetas", [
                {
                    id: "REC-0001", idPaciente: "PAC-0001", idConsulta: "CON-0001",
                    idUsuario: "USR-0001", fecha: this.hoyISO(),
                    indicaciones: "Tomar los medicamentos según las indicaciones. Regresar si los síntomas persisten.",
                    medicamentos: [
                        { medicamento: "Paracetamol", dosis: "500 mg", frecuencia: "Cada 8 horas", duracion: "5 días" },
                        { medicamento: "Loratadina", dosis: "10 mg", frecuencia: "Cada 24 horas", duracion: "7 días" }
                    ]
                }
            ]);
        }
        if (!localStorage.getItem(this.claves.actividad)) {
            this.guardar("actividad", []);
        }
    },

    restablecer() {
        Object.values(this.claves).forEach(c => localStorage.removeItem(c));
        this.inicializar();
    }
};