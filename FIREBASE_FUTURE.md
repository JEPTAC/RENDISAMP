# Evolución futura con Firebase

## Servicios recomendados

### Firebase Authentication
Para inicio de sesión seguro y roles:

- `super_admin`
- `admin`
- `editor`
- `moderador_ideas`
- `visitante`

### Cloud Firestore
Colecciones propuestas:

- `years`
- `resources`
- `ideas`
- `idea_responses`
- `commitments`
- `participations`
- `news`
- `custom_modules`
- `portal_settings`
- `users`
- `audit_log`

### Firebase Storage
Para almacenar:

- PDF
- Excel
- presentaciones
- fotografías
- videos cortos
- imágenes de noticias
- anexos

## Reglas esenciales

- Solo administradores pueden modificar la configuración.
- Editores pueden crear contenido, pero no administrar usuarios.
- Moderadores pueden responder ideas ciudadanas.
- Visitantes solo pueden leer y registrar participaciones.
- Toda modificación debe guardar autor, fecha y versión.
- Las ideas deben contar con control de contenido antes de publicarse cuando sea necesario.

## Flujo de ideas ciudadanas

1. Ciudadano registra idea.
2. La idea queda en estado `received`.
3. Moderador valida contenido.
4. Dependencia asignada revisa la propuesta.
5. Se publica respuesta institucional.
6. El estado cambia a:
   - `analysis`
   - `accepted`
   - `resolved`
   - `not_viable`
7. Se conserva el historial completo.

## Despliegue

Puede mantenerse GitHub Pages como frontend y usar Firebase como backend.
También puede migrarse a Firebase Hosting si se requiere control integrado de despliegues.
