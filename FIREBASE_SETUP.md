# Firebase + Google Drive — Rendición de Cuentas V8

## Función de cada servicio

### Firebase Authentication
Controla el inicio de sesión y los roles administrativos.

### Cloud Firestore
Guarda:

- vigencias;
- indicadores y dashboards;
- recursos y enlaces;
- ideas ciudadanas;
- compromisos;
- solicitudes y respuestas;
- configuración visual;
- contenido editable;
- auditoría.

### Google Drive
Guarda:

- PDF;
- Excel y CSV;
- presentaciones;
- imágenes;
- actas;
- evidencias;
- videos y otros anexos.

Firebase Storage ya no se utiliza.

## Publicar reglas de Firestore

```bash
npm install -g firebase-tools
firebase login
firebase use rendicion-de-cuentas-6aceb
firebase deploy --only firestore:rules
```

`firebase.json` fue actualizado para desplegar únicamente las reglas de Firestore.

## Authentication

1. Active Correo electrónico/contraseña.
2. Opcionalmente active Google.
3. Autorice el dominio de GitHub Pages.
4. Cree el documento `users/UID` con rol `super_admin`, `admin` o `editor`.

Ejemplo:

```json
{
  "displayName": "Administrador principal",
  "email": "administrador@sanpedro-valle.gov.co",
  "role": "super_admin",
  "active": true
}
```

## Nota

El archivo `storage.rules` de versiones anteriores puede permanecer en el repositorio, pero ya no es utilizado por `firebase.json` ni por el código del portal.
