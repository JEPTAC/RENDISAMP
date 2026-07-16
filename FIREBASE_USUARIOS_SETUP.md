# Activación de cuentas y roles — V9

## Corrección del superadministrador

El portal ahora busca el perfil del usuario de dos formas:

1. `users/UID_DEL_USUARIO`
2. `users/CORREO_DEL_USUARIO` como compatibilidad con perfiles creados anteriormente usando el correo como ID.

También reconoce estas variantes:

- `super_admin`
- `super-admin`
- `super admin`
- `superadmin`
- `Super Admin`
- `super administrador`
- `administrador principal`

Cuando puede hacerlo, migra automáticamente el perfil al documento correcto `users/UID`.

## Requisito principal

Debe publicar `firestore.rules`. Mientras Firestore conserve reglas que bloqueen las lecturas, el portal no podrá reconocer el rol.

```bash
firebase login
firebase use rendicion-de-cuentas-6aceb
firebase deploy --only firestore:rules
```

También puede copiar las reglas desde el archivo y publicarlas en Firebase Console → Firestore Database → Rules.

## Activar registro con correo

Firebase Console:

1. Authentication.
2. Sign-in method.
3. Email/Password.
4. Habilitar.
5. Guardar.

## Perfil correcto del superadministrador

En Firestore debe existir uno de estos documentos:

```text
users/UID_REAL_DEL_USUARIO
```

o, como compatibilidad:

```text
users/correo@ejemplo.com
```

Contenido mínimo recomendado:

```json
{
  "uid": "UID_REAL_DEL_USUARIO",
  "displayName": "Juan Esteban Pérez",
  "email": "correo@ejemplo.com",
  "role": "super_admin",
  "active": true
}
```

El UID se encuentra en Firebase Console → Authentication → Users.

## Registro ciudadano

Una cuenta creada desde el portal genera automáticamente:

```json
{
  "role": "guest",
  "active": true
}
```

El usuario recibe un correo de verificación y puede:

- iniciar sesión;
- recuperar contraseña;
- actualizar nombre, teléfono y sector;
- participar en el portal.

## Gestión desde superadministrador

Después de ingresar como superadministrador:

```text
Editar página → Usuarios
```

Puede cambiar:

- Invitado.
- Editor.
- Administrador.
- Superadministrador.
- Cuenta activa o desactivada.

No es posible degradar ni desactivar la propia cuenta desde la interfaz.

## Limitación de una página estática

La aplicación web puede administrar los perfiles y permisos guardados en Firestore. No puede borrar directamente otras cuentas de Firebase Authentication ni cambiar sus contraseñas, porque esas operaciones requieren Firebase Admin SDK en un servidor o Cloud Function.

Desactivar un perfil impide que esa cuenta edite el portal, aunque el registro permanezca en Authentication.
