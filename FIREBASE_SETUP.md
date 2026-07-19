# Configuración Firebase — `rendicion-de-cuentas-6aceb`

**Número del proyecto:** `509564686428`

## 1. Activar los servicios

En Firebase Console:

1. **Authentication → Sign-in method:** habilite `Email/Password`.
2. Habilite también `Google` cuando vaya a utilizar ese botón.
3. **Authentication → Settings → Authorized domains:** agregue `jeptac.github.io` y cualquier dominio personalizado desde el que se publique el portal.
4. **Firestore Database:** cree la base de datos si todavía no existe.

## 2. Publicar reglas y Hosting

Desde la raíz del proyecto:

```bash
npm install -g firebase-tools
firebase login
firebase use rendicion-de-cuentas-6aceb
firebase deploy --only firestore:rules,hosting
```

El proyecto ya incluye `.firebaserc`, `.firebaseignore`, `firebase.json` y `firestore.rules`.

## 3. Crear el primer superadministrador

1. Registre o inicie sesión en el portal con el correo administrativo.
2. Firebase Console → **Authentication → Users** → copie el `UID` exacto.
3. Firestore Database → colección `users` → cree un documento cuyo ID sea ese UID.
4. Agregue los campos:

```json
{
  "uid": "UID_REAL",
  "displayName": "Administrador principal",
  "email": "correo-real@dominio.gov.co",
  "role": "super_admin",
  "active": true
}
```

Cierre sesión y vuelva a ingresar. El portal mostrará los controles de edición. Para documentos nuevos no use el correo como ID: use siempre el UID de Authentication.

## 4. Verificar desde el navegador

Después de iniciar sesión, abra la consola del navegador y ejecute:

```js
await FirebasePortal.diagnose()
```

El resultado esperado incluye:

```js
{
  projectId: "rendicion-de-cuentas-6aceb",
  authReady: true,
  firestoreReady: true,
  signedIn: true,
  role: "super_admin",
  canWrite: true,
  profileRead: true
}
```

Cuando `signedIn` sea verdadero pero `canWrite` sea falso, revise el documento `users/{UID}` y confirme que `role` sea uno de `super_admin`, `admin` o `editor`, y que `active` sea `true`.

## 5. Despliegue automático desde GitHub

El workflow `.github/workflows/firebase-deploy.yml` publica reglas y Hosting al hacer `push` a `main`.

En GitHub → **Settings → Secrets and variables → Actions**, cree el secret:

`FIREBASE_SERVICE_ACCOUNT_RENDICION_DE_CUENTAS_6ACEB`

El valor debe ser el JSON completo de una cuenta de servicio autorizada para desplegar Firebase Hosting y reglas de Firestore.

## Seguridad aplicada

- No existe contraseña administrativa escrita en el frontend.
- `sessionStorage` y `localStorage` no conceden roles.
- Las cuentas nuevas solo pueden crear su perfil como `guest`.
- Solo roles editoriales activos pueden modificar contenido.
- Solo `super_admin` puede listar usuarios o cambiar roles.
- Las reglas rechazan cualquier colección no declarada expresamente.
