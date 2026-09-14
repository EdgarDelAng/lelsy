/* ==========================================
   AUTENTICACIÓN Y PERMISOS
========================================== */
const Auth = {

    permisos: {
        Administrador: {
            modulos: ["dashboard", "pacientes", "citas", "consultas", "recetas", "historia", "configuracion", "perfil"],
            acciones: {
                pacientes:  ["ver", "crear", "editar", "eliminar"],
                citas:      ["ver", "crear", "editar", "eliminar", "confirmar"],
                consultas:  ["ver", "crear", "editar", "eliminar"],
                recetas:    ["ver", "crear", "editar", "eliminar"],
                configuracion: ["ver", "editar"],
                historia:   ["ver", "ver_completa"]
            }
        },
        Usuario: {
            modulos: ["dashboard", "pacientes", "citas", "consultas", "recetas", "historia", "perfil"],
            acciones: {
                pacientes:  ["ver", "crear", "editar"],
                citas:      ["ver", "crear", "editar", "confirmar"],
                consultas:  ["ver", "crear", "editar"],
                recetas:    ["ver", "crear", "editar"],
                historia:   ["ver"]
            }
        },
        Paciente: {
            modulos: ["dashboard", "citas", "consultas", "recetas", "historia", "perfil"],
            acciones: {
                citas:     ["ver", "crear"],
                consultas: ["ver"],
                recetas:   ["ver"],
                historia:  ["ver"]
            }
        }
    },

    /* Campos sensibles — solo Administrador y dueño */
    camposSensibles: {
        paciente: ["correo", "direccion", "contactoEmergencia", "alergias", "antecedentes"],
        consulta: [],
        receta:   [],
        usuario:  ["correo", "telefono"]
    },

    /* ¿El rol actual puede ver X campo? */
    puedeVerCampo(categoria, campo, idPropietario = null) {
        const s = this.sesion();
        if (!s) return false;
        if (s.rol === "Administrador") return true;

        // Paciente puede ver sus propios datos
        if (s.rol === "Paciente" && s.idPaciente && idPropietario === s.idPaciente) {
            return true;
        }

        // Médico (Usuario) ve todo excepto campos bloqueados
        if (s.rol === "Usuario") return true;

        return !(this.camposSensibles[categoria] || []).includes(campo);
    },

    /* Helper: devuelve el valor o un placeholder bloqueado */
    verCampo(categoria, campo, valor, idPropietario = null) {
        if (this.puedeVerCampo(categoria, campo, idPropietario)) {
            return Utils.esc(valor || "—");
        }
        return Utils.campoBloqueado("Solo administrador");
    },

    iniciarSesion(correo, password, rol) {
        const usuarios = DB.obtener("usuarios");
        const usuario = usuarios.find(u =>
            u.correo.toLowerCase() === correo.toLowerCase() &&
            u.password === password &&
            u.rol === rol &&
            u.estado === "Activo"
        );

        if (!usuario) {
            const existe = usuarios.find(u => u.correo.toLowerCase() === correo.toLowerCase());
            if (existe && existe.password === password && existe.rol !== rol) {
                const etiquetaRol = existe.rol === "Usuario" ? "Médico" : existe.rol;
                return { ok: false, error: `Esta cuenta es de tipo "${etiquetaRol}". Cambia el rol seleccionado.` };
            }
            if (existe && existe.estado !== "Activo")
                return { ok: false, error: "Tu cuenta está inactiva. Contacta al administrador." };
            return { ok: false, error: "Correo o contraseña incorrectos." };
        }

        const sesion = {
            id: usuario.id,
            nombre: usuario.nombre,
            correo: usuario.correo,
            rol: usuario.rol,
            idPaciente: usuario.idPaciente || null,
            fecha: new Date().toISOString()
        };
        localStorage.setItem(DB.claves.sesion, JSON.stringify(sesion));
        return { ok: true, usuario: sesion };
    },

    cerrarSesion() { localStorage.removeItem(DB.claves.sesion); },
    sesion() { const s = localStorage.getItem(DB.claves.sesion); return s ? JSON.parse(s) : null; },
    activo() { return !!this.sesion(); },
    esAdmin() { const s = this.sesion(); return s && s.rol === "Administrador"; },
    esPaciente() { const s = this.sesion(); return s && s.rol === "Paciente"; },
    esMedico() { const s = this.sesion(); return s && s.rol === "Usuario"; },

    puedeModulo(modulo) {
        const s = this.sesion();
        if (!s) return false;
        return (this.permisos[s.rol]?.modulos || []).includes(modulo);
    },

    puede(modulo, accion = "ver") {
        const s = this.sesion();
        if (!s) return false;
        const acc = this.permisos[s.rol]?.acciones?.[modulo] || [];
        return acc.includes(accion);
    },

    actualizarSesion(cambios) {
        const s = this.sesion();
        if (!s) return;
        const nueva = { ...s, ...cambios };
        localStorage.setItem(DB.claves.sesion, JSON.stringify(nueva));
    }
};