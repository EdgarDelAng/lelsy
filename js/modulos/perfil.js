App.registrarModulo("perfil", {
    titulo: "Mi perfil",
    sub: "Administra tu información personal",

    render(c) {
        const sesion = Auth.sesion();
        const u = DB.porId("usuarios", sesion.id);

        if (!u) {
            c.innerHTML = `<div class="vista">${Utils.vacio("No se encontró tu usuario", "user")}</div>`;
            Utils.refrescarIconos();
            return;
        }

        c.innerHTML = `
        <div class="vista">
            <div class="vista-enc">
                <div>
                    <h2 class="vista-titulo">Mi perfil</h2>
                    <p class="vista-sub">Administra tu información personal</p>
                </div>
            </div>

            <div class="grid-2">
                <div class="card">
                    <div class="card-header"><h3>👤 Datos personales</h3></div>
                    <div class="card-body">
                        <div class="form-grid">
                            ${Utils.campo({
                                id: "pNombre",
                                label: "Nombre completo",
                                valor: u.nombre,
                                requerido: true,
                                ancho: "completo",
                                maxlength: 60,
                                placeholder: "Ej. Ana López García"
                            })}
                            ${Utils.campo({
                                id: "pCorreo",
                                label: "Correo",
                                tipo: "email",
                                valor: u.correo,
                                requerido: true,
                                ancho: "completo",
                                placeholder: "correo@ejemplo.com"
                            })}
                            ${Utils.campo({
                                id: "pTelefono",
                                label: "Teléfono",
                                valor: u.telefono || "",
                                ancho: "completo",
                                placeholder: "81-1234-5678",
                                maxlength: 12
                            })}
                        </div>
                        <div style="display:flex;justify-content:flex-end;margin-top:10px">
                            <button class="btn btn-primario" id="btnSavePerfil">💾 Guardar cambios</button>
                        </div>
                    </div>
                </div>

                <div class="card">
                    <div class="card-header"><h3>🔐 Cambiar contraseña</h3></div>
                    <div class="card-body">
                        ${Utils.campoPassword({
                            id: "pPassActual",
                            label: "Contraseña actual",
                            placeholder: "Tu contraseña actual",
                            ayuda: ""
                        })}
                        ${Utils.campoPassword({
                            id: "pPassNueva",
                            label: "Nueva contraseña",
                            placeholder: "Mínimo 8 caracteres"
                        })}
                        ${Utils.campoPassword({
                            id: "pPassNueva2",
                            label: "Confirmar nueva contraseña",
                            placeholder: "Repite la nueva contraseña",
                            ayuda: ""
                        })}
                        <div style="display:flex;justify-content:flex-end;margin-top:10px">
                            <button class="btn btn-primario" id="btnCambiarPass">🔑 Cambiar contraseña</button>
                        </div>
                    </div>
                </div>
            </div>

            <div class="card">
                <div class="card-header"><h3>ℹ️ Información de la cuenta</h3></div>
                <div class="card-body">
                    <div class="info-grid">
                        <div class="info-item"><label>ID de usuario</label><span>${Utils.esc(u.id)}</span></div>
                        <div class="info-item"><label>Rol</label><span>${Utils.esc(u.rol)}</span></div>
                        <div class="info-item"><label>Estado</label><span>${Utils.esc(u.estado)}</span></div>
                        <div class="info-item"><label>Fecha de registro</label><span>${Utils.fecha(u.fechaRegistro)}</span></div>
                    </div>
                </div>
            </div>
        </div>`;

        /* ==========================================
           ACTIVAR OJOS DE CONTRASEÑA
        ========================================== */
        Utils.activarOjosPassword(c);

        /* ==========================================
           VALIDACIONES EN VIVO
        ========================================== */
        Utils.activarValidacion("pNombre", (v) => v ? Validar.nombre(v) : "El nombre es obligatorio.");
        Utils.activarValidacion("pCorreo", Validar.correo);
        Utils.activarValidacion("pTelefono", (v) => v ? Validar.telefono(v) : null);
        Utils.activarValidacion("pPassNueva", (v) => v ? Validar.password(v) : null);
        Utils.activarValidacion("pPassNueva2", (v) =>
            v ? Validar.passwordConfirm(v, Utils.el("pPassNueva").value) : null);

        /* Autoformato de teléfono */
        const telPerfil = Utils.el("pTelefono");
        if (telPerfil) {
            telPerfil.addEventListener("input", (e) => {
                e.target.value = Utils.formatoTelefono(e.target.value);
            });
        }

        Utils.refrescarIconos();

        /* ==========================================
           GUARDAR DATOS PERSONALES
        ========================================== */
        Utils.el("btnSavePerfil").addEventListener("click", () => {
            const nombre = Utils.el("pNombre").value.trim();
            const correo = Utils.el("pCorreo").value.trim();
            const telefono = Utils.el("pTelefono").value.trim();

            const vNombre = Utils.validarCampo("pNombre", (v) => v ? Validar.nombre(v) : "El nombre es obligatorio.");
            const vCorreo = Utils.validarCampo("pCorreo", Validar.correo);
            const vTelefono = Utils.validarCampo("pTelefono", (v) => v ? Validar.telefono(v) : null);

            if (!vNombre || !vCorreo || !vTelefono) {
                Utils.toast("Corrige los campos marcados en rojo.", "error");
                return;
            }

            const usuarios = DB.obtener("usuarios");
            if (usuarios.some(x => x.id !== u.id && x.correo.toLowerCase() === correo.toLowerCase())) {
                Utils.validarCampo("pCorreo", () => "Ese correo ya está en uso.");
                Utils.toast("Ese correo ya está en uso.", "error");
                return;
            }

            DB.actualizar("usuarios", u.id, { nombre, correo, telefono });
            Auth.actualizarSesion({ nombre, correo });
            Utils.toast("Perfil actualizado.", "success");

            App.renderSidebar();
            App.renderHeader();
            App.navegar("perfil");
        });

        /* ==========================================
           CAMBIAR CONTRASEÑA
        ========================================== */
        Utils.el("btnCambiarPass").addEventListener("click", () => {
            const actual = Utils.el("pPassActual").value;
            const nueva = Utils.el("pPassNueva").value;
            const nueva2 = Utils.el("pPassNueva2").value;

            if (!actual || !nueva || !nueva2) {
                Utils.toast("Completa todos los campos.", "warning");
                return;
            }

            if (actual !== u.password) {
                Utils.toast("La contraseña actual es incorrecta.", "error");
                return;
            }

            const vPass = Utils.validarCampo("pPassNueva", Validar.password);
            const vPass2 = Utils.validarCampo("pPassNueva2", (v) => Validar.passwordConfirm(v, nueva));

            if (!vPass || !vPass2) {
                Utils.toast("Revisa la nueva contraseña.", "error");
                return;
            }

            DB.actualizar("usuarios", u.id, { password: nueva });
            Utils.toast("Contraseña cambiada con éxito.", "success");

            Utils.el("pPassActual").value = "";
            Utils.el("pPassNueva").value = "";
            Utils.el("pPassNueva2").value = "";

            Utils.qsa(".campo-ok, .campo-error", c).forEach(el =>
                el.classList.remove("campo-ok", "campo-error"));
        });
    }
});