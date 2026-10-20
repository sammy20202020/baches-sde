# Roadmap por sprints

Scrum con iteraciones de dos semanas, tal como fija la propuesta. Marcado con
**[hecho]** lo que ya esta implementado y verificado en este repositorio.

| Sprint | Semanas | Resultado principal | Estado |
|---|---|---|---|
| 0 | 2 | Arquitectura, riesgos, entornos reproducibles, rutas | **[hecho]** salvo el protocolo etico y los GPX |
| 1–2 | 4 | Autenticacion, roles, modelo de datos, API base, navegacion movil | **[hecho]** |
| 3–4 | 4 | Reporte con foto/GPS, borradores offline, sincronizacion | **[hecho]** |
| 5–6 | 4 | Mapa publico, seguimiento personal, notificaciones push | **[hecho]** (push requiere credenciales FCM/APNs) |
| 7–8 | 4 | Captura de video/GPS y procesamiento en segundo plano | **[hecho]** (requiere development build) |
| 9–10 | 4 | IA, deduplicacion, revision humana, prioridad explicable | Deduplicacion, revision y prioridad **[hecho]**; falta entrenar el modelo |
| 11 | 2 | Panel administrativo, auditoria, exportaciones, endurecimiento | **[hecho]** |
| 12 | 2 | Prueba final en la ruta 4, analisis y documentacion de tesis | Pendiente: es trabajo de campo |

---

## Lo que queda, en orden

### 1. Entrenar el modelo (lo mas largo)

1. Descargar **RDD2022** (referencia [3] de la propuesta) y filtrar las clases de
   dano de pavimento relevantes.
2. Fine-tuning de un YOLO; guardar los pesos en `modelos/baches-yolo.pt`.
3. Recolectar datos propios en las rutas 1 a 3 con el modo tecnico de la app.
4. Reentrenar con los datos propios y medir precision, exhaustividad y F1
   **por ruta**.
5. Evaluacion final en la **ruta 4**, que no se toca hasta ese momento.

Registrar cada version en `docs/REGISTRO-MODELOS.md`: fecha, datos,
hiperparametros y metricas por ruta.

### 2. Notificaciones push reales

`expo-notifications` ya esta integrado y el backend guarda los tokens. Falta:

- Cuenta de Firebase y subir el `google-services.json` para Android.
- Llave de APNs en el perfil de Expo para iOS.
- Development build o build de EAS: Expo Go no entrega push en SDK recientes.

### 3. Trabajo de campo

- Fijar los GPX de las 4 rutas (sentido, limites, longitud).
- Protocolo etico y consentimiento para rostros y placas en el video.
- Prueba de usabilidad con participantes (criterio de exito de la propuesta).
- Matriz de dispositivos: versiones minimas de Android e iOS.

### 4. Despliegue

- VPS con Docker Compose y Nginx + certbot para TLS.
- Copias de seguridad cifradas de PostgreSQL y del almacenamiento, con prueba
  de restauracion.
- Rotar `JWT_SECRET` y las llaves de S3; nada de valores por defecto.

---

## Pruebas automatizadas que ya existen

26 pruebas de integracion contra PostGIS real:

| Archivo | Cubre |
|---|---|
| `tests/test_seguridad.py` | Registro, consentimiento, login, rotacion de refresh, roles |
| `tests/test_reportes.py` | Creacion, idempotencia, validacion de archivo y coordenadas, anonimato del mapa |
| `tests/test_dominio.py` | Deduplicacion espacial, fusion, prioridad explicable |
| `tests/test_geo.py` | Interpolacion GPS de los fotogramas |

Falta anadir, segun la propuesta: Playwright para el panel web y pruebas
automatizadas de flujos criticos del movil en emuladores.
