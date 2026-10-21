# Hoja de ruta desarrollada — Sprint 0 al 12

Desarrollo detallado de la seccion 5 de la propuesta ("Hoja de ruta inicial").
Scrum con iteraciones de dos semanas, 26 semanas en total.

Cada sprint lista: objetivo, entregables concretos, requerimientos funcionales
cubiertos con sus horas, criterios de aceptacion, y **que parte ya existe en
esta demo**.

---

## Resumen de la linea de tiempo

| Sprint | Semanas | Resultado principal | RF cubiertos | Horas | Estado |
|---|---|---|---|---|---|
| 0 | 1–2 | Arquitectura, riesgos, etica, rutas, entornos | — | — | **Parcial** |
| 1–2 | 3–6 | Autenticacion, roles, datos, API, navegacion | 01, 02, 03 | 116 | **Hecho** |
| 3–4 | 7–10 | Reporte con foto/GPS, offline, sincronizacion | 04, 05, 07, 08 | 194 | **Hecho** |
| 5–6 | 11–14 | Mapa publico, seguimiento, notificaciones | 09, 10, 11, 12 | 166 | **Hecho** (push sin credenciales) |
| 7–8 | 15–18 | Video/GPS tecnico y proceso en segundo plano | 13, 14, 15 | 156 | **Hecho** (requiere dev build) |
| 9–10 | 19–22 | IA, deduplicacion, revision, prioridad | 06, 16, 17, 18 | 184 | **Parcial** (falta entrenar) |
| 11 | 23–24 | Panel admin, auditoria, exportaciones | 19, 20, 21 | 114 | **Hecho** |
| 12 | 25–26 | Prueba final ruta 4, analisis, tesis | — | — | **Pendiente** |
| | | | **TOTAL** | **930 h** | |

Las horas de los 21 RF de la propuesta suman exactamente 930 y se reparten sin
sobras entre los sprints 1 y 11. Los sprints 0 y 12 no tienen RF: son montaje y
evaluacion.

**Carga por persona:** 930 h / 3 integrantes / 26 semanas = **11.9 h por semana
cada uno**. Realista para estudiantes con carga academica. Los sprints mas
pesados son el 3–4 (194 h) y el 9–10 (184 h): ahi conviene no acumular otras
materias fuertes.

---

## Sprint 0 — Semanas 1 y 2
### Arquitectura, riesgos, protocolo etico, rutas y entornos reproducibles

**Objetivo:** que los tres puedan levantar el sistema completo con un comando y
que las decisiones de diseño esten escritas antes de programar.

**Entregables**

| # | Entregable | Donde vive | Estado |
|---|---|---|---|
| 0.1 | Diagrama de arquitectura y flujo de datos | [ARQUITECTURA.md](ARQUITECTURA.md) | Hecho |
| 0.2 | Modelo de datos con decisiones justificadas | ARQUITECTURA.md §2 | Hecho |
| 0.3 | Entorno reproducible en contenedores | `infra/docker-compose.yml` | Hecho |
| 0.4 | Versiones fijadas de todas las dependencias | `requirements.txt`, `package-lock.json` | Hecho |
| 0.5 | Repositorio con rama protegida y CI | `.github/workflows/ci.yml` | Hecho |
| 0.6 | Tabla de riesgos con tratamiento | ANALISIS-PROYECTO.md §1 | Hecho |
| 0.7 | **Archivos GPX de las 4 rutas** | `datos/rutas/*.gpx` | **Pendiente** |
| 0.8 | **Protocolo etico y consentimiento** | `docs/PROTOCOLO-ETICO.md` | **Pendiente** |
| 0.9 | Protocolo de campo (horarios, clima, seguridad) | `docs/PROTOCOLO-CAMPO.md` | **Pendiente** |

**Criterios de aceptacion**
- Un integrante que clona el repositorio levanta todo con `make up` y `make seed`
  sin pedir ayuda.
- `make test` pasa en la maquina de los tres.
- Las 4 rutas tienen limites, sentido y longitud fijados por escrito.
- El protocolo etico esta firmado por el asesor antes de grabar un solo video.

**Lo que falta y bloquea:** sin los GPX no se puede empezar el Sprint 7, y sin el
protocolo etico no se puede grabar en la via publica. Son lo primero que hay que
cerrar.

---

## Sprints 1 y 2 — Semanas 3 a 6
### Autenticacion, roles, modelo de datos, API base y navegacion movil

**Objetivo:** que un usuario pueda crear cuenta, entrar y moverse por la app,
aunque todavia no pueda reportar nada. Es el esqueleto sobre el que cuelga todo.

**Requerimientos:** RF-01 (40 h) · RF-02 (40 h) · RF-03 (36 h) = **116 h**

**Entregables**

| # | Entregable | Donde vive | Estado |
|---|---|---|---|
| 1.1 | Esquema completo en PostGIS con migraciones | `backend/alembic/versions/` | Hecho |
| 1.2 | Registro con correo, contrasena y consentimiento | `api/v1/auth.py::registro` | Hecho |
| 1.3 | Hash Argon2id y verificacion de correo | `core/security.py` | Hecho |
| 1.4 | Login, logout y refresh rotativo | `api/v1/auth.py` | Hecho |
| 1.5 | Cuatro roles validados por operacion | `core/security.py::require_role` | Hecho |
| 1.6 | Tokens en el almacen seguro del sistema | `mobile/src/api/client.ts` | Hecho |
| 1.7 | Navegacion con pestanas segun rol | `mobile/app/(tabs)/_layout.tsx` | Hecho |
| 1.8 | Pantallas de login y registro | `mobile/app/(auth)/` | Hecho |
| 1.9 | Documentacion OpenAPI automatica | `/docs` de la API | Hecho |
| 1.10 | **Recuperacion de contrasena por correo** | — | **Pendiente** |

**Criterios de aceptacion**
- Un ciudadano no puede llamar a ningun endpoint de revisor (responde 403).
- Reusar un refresh token ya usado falla (rotacion efectiva).
- El mensaje de error del login es identico exista o no el correo.
- La contrasena nunca aparece en logs ni en respuestas.

**Verificado:** 8 pruebas en `tests/test_seguridad.py`.

**Lo que falta:** el envio real de correos (RF-02 lo pide). Hoy el token de
verificacion se imprime en el log en modo desarrollo. Hace falta un servicio SMTP
o similar; es trabajo de pocas horas pero necesita una cuenta de correo.

---

## Sprints 3 y 4 — Semanas 7 a 10
### Reporte ciudadano con foto/GPS, borradores sin conexion y sincronizacion

**Objetivo:** el corazon del proyecto. Un ciudadano reporta un bache con foto y
ubicacion, y el reporte **no se pierde** aunque no haya senal.

**Requerimientos:** RF-04 (58 h) · RF-05 (34 h) · RF-07 (54 h) · RF-08 (48 h) = **194 h**

Es el sprint mas cargado del proyecto. Conviene no solaparlo con examenes.

**Entregables**

| # | Entregable | Donde vive | Estado |
|---|---|---|---|
| 3.1 | Captura de foto con compresion a 1280 px | `mobile/app/(tabs)/nuevo.tsx` | Hecho |
| 3.2 | Lectura de GPS con precision reportada | `mobile/src/lib/ubicacion.ts` | Hecho |
| 3.3 | Mapa para confirmar o corregir el punto | `nuevo.tsx` (marcador arrastrable) | Hecho |
| 3.4 | Permisos pedidos en el momento de uso | `nuevo.tsx` | Hecho |
| 3.5 | Endpoint de creacion con multipart | `api/v1/reports.py` | Hecho |
| 3.6 | Validacion de tipo, tamano y coherencia geografica | `schemas/report.py` | Hecho |
| 3.7 | Subida de evidencia a almacenamiento S3 con sha256 | `services/storage.py` | Hecho |
| 3.8 | Cola de borradores en SQLite | `mobile/src/db/outbox.ts` | Hecho |
| 3.9 | Sincronizacion con reintentos y espera exponencial | `mobile/src/db/sync.ts` | Hecho |
| 3.10 | Idempotencia extremo a extremo | `api/deps.py` + header | Hecho |
| 3.11 | Reenvio automatico al recuperar la red | `sync.ts::observarRed` | Hecho |

**Criterios de aceptacion**
- Enviar dos veces la misma clave de idempotencia devuelve **un solo** reporte.
- Con el avion activado, el reporte queda guardado y la app lo dice claramente.
- Al volver la red, el borrador se envia solo, sin que el usuario haga nada.
- Una coordenada fuera de Santo Domingo Este se rechaza con 422.
- Un archivo que no es imagen se rechaza con 415.

**Verificado:** 7 pruebas en `tests/test_reportes.py`.

**Decision clave de este sprint:** la clave de idempotencia la genera **el
telefono al crear el borrador**, no al enviarlo. Si se generara al enviar, cada
reintento crearia un reporte nuevo y el RF-08 no se cumpliria.

---

## Sprints 5 y 6 — Semanas 11 a 14
### Mapa publico, seguimiento personal y notificaciones push

**Objetivo:** cerrar el circulo con el ciudadano. Que vea el mapa, siga sus
reportes y se entere cuando cambian de estado.

**Requerimientos:** RF-09 (34 h) · RF-10 (46 h) · RF-11 (52 h) · RF-12 (34 h) = **166 h**

**Entregables**

| # | Entregable | Donde vive | Estado |
|---|---|---|---|
| 5.1 | Endpoint publico en GeoJSON, sin datos personales | `api/v1/map.py` | Hecho |
| 5.2 | Mapa con marcadores por severidad | `mobile/app/(tabs)/mapa.tsx` | Hecho |
| 5.3 | Filtros por severidad, estado, fecha y proximidad | `map.py` + chips en la app | Hecho |
| 5.4 | Busqueda por radio con indice espacial | `ST_DWithin` sobre GiST | Hecho |
| 5.5 | Historial personal con estados | `mobile/app/(tabs)/mis-reportes.tsx` | Hecho |
| 5.6 | Registro del token de dispositivo | `api/v1/auth.py::registrar_dispositivo` | Hecho |
| 5.7 | Envio de push al cambiar de estado | `services/push.py` | Hecho |
| 5.8 | Preferencias de notificacion | `Dispositivo.notificaciones_activas` | Hecho |
| 5.9 | **Credenciales FCM (Android) y APNs (iOS)** | — | **Pendiente** |

**Criterios de aceptacion**
- El mapa publico **no** devuelve correo, nombre ni identificador de autor.
- Un reporte sin validar **no** aparece en el mapa.
- El ciudadano ve el estado de su reporte aunque rechace las notificaciones.
- El mapa responde en menos de 2 s con 500 puntos (RNF-03).

**Verificado:** `test_mapa_publico_no_expone_datos_personales` comprueba que la
respuesta no contiene ni `@` ni la palabra `autor`.

**Lo que falta:** el codigo de push esta completo, pero para que llegue a un
telefono real hacen falta las credenciales de Firebase (Android) y la llave APNs
(iOS). Ambas son gratis; la de iOS necesita la cuenta de Apple Developer.

---

## Sprints 7 y 8 — Semanas 15 a 18
### Captura tecnica de video con GPS y procesamiento en segundo plano

**Objetivo:** que un operador recorra una ruta grabando, y que el servidor saque
fotogramas georreferenciados de ese video.

**Requerimientos:** RF-13 (70 h) · RF-14 (46 h) · RF-15 (40 h) = **156 h**

RF-13 es el requerimiento mas caro de toda la propuesta (70 h) y con razon: es
donde aparecen los problemas de bateria, almacenamiento y seguridad vial.

**Entregables**

| # | Entregable | Donde vive | Estado |
|---|---|---|---|
| 7.1 | Pantalla de recorrido con inicio/pausa/fin | `mobile/app/recorrido.tsx` | Hecho |
| 7.2 | Muestreo de GPS a 1 Hz durante la grabacion | `watchPositionAsync` | Hecho |
| 7.3 | Advertencia de seguridad vial antes de grabar | `mobile/app/(tabs)/tecnico.tsx` | Hecho |
| 7.4 | Subida del video y del track GPS | `api/v1/surveys.py` | Hecho |
| 7.5 | Extraccion de fotogramas con OpenCV | `services/vision.py::extraer_frames` | Hecho |
| 7.6 | Interpolacion lineal de posicion por fotograma | `services/geo.py::interpolar_posicion` | Hecho |
| 7.7 | Cola Celery con reintentos y estados consultables | `workers/tasks.py` | Hecho |
| 7.8 | **Development build instalado en el telefono** | — | **En curso** |
| 7.9 | **Prueba de recorrido real en la Ruta 1** | — | **Pendiente** |

**Criterios de aceptacion**
- Un recorrido de 20 minutos se sube sin perder muestras GPS.
- Cada fotograma queda con coordenadas, tiempo y ruta asociados.
- Reprocesar el mismo video no duplica candidatos.
- El operador no manipula el telefono mientras conduce.

**Verificado:** 4 pruebas en `tests/test_geo.py` cubren la interpolacion,
incluidos los bordes (antes de la primera muestra y despues de la ultima).

**Restriccion tecnica:** esta pantalla **no funciona en Expo Go**. Requiere un
development build. Es la razon por la que el Sprint 7 depende de tener resuelta
la instalacion en un telefono fisico.

---

## Sprints 9 y 10 — Semanas 19 a 22
### IA, deduplicacion, revision humana y prioridad explicable

**Objetivo:** que el sistema proponga, que un humano decida, y que la prioridad
se pueda explicar ante la autoridad municipal.

**Requerimientos:** RF-06 (46 h) · RF-16 (58 h) · RF-17 (40 h) · RF-18 (40 h) = **184 h**

**Entregables**

| # | Entregable | Donde vive | Estado |
|---|---|---|---|
| 9.1 | Tarea de analisis de foto en segundo plano | `workers/tasks.py::analizar_foto` | Hecho |
| 9.2 | Interfaz de inferencia desacoplada del modelo | `services/vision.py` | Hecho |
| 9.3 | Deduplicacion espacial + temporal + visual | `services/dedupe.py` | Hecho |
| 9.4 | Puntaje de similitud explicable | `dedupe.py::candidatos_duplicados` | Hecho |
| 9.5 | Fusion con acumulacion de frecuencia | `dedupe.py::fusionar` | Hecho |
| 9.6 | Panel de revision con evidencia y mapa | `web/src/Revision.tsx` | Hecho |
| 9.7 | Correccion de ubicacion y severidad por el revisor | `api/v1/review.py` | Hecho |
| 9.8 | Motivo obligatorio en cada decision | `schemas/report.py::RevisionIn` | Hecho |
| 9.9 | Prioridad con formula y factores expuestos | `services/priority.py` | Hecho |
| 9.10 | **Dataset propio de las rutas 1 a 3** | — | **Pendiente** |
| 9.11 | **Modelo YOLO entrenado** | `modelos/baches-yolo.pt` | **Pendiente** |
| 9.12 | **Metricas precision/exhaustividad/F1 por ruta** | — | **Pendiente** |

**Criterios de aceptacion**
- Ninguna deteccion automatica llega al mapa sin que un revisor la confirme.
- Dos reportes a menos de 15 m y dentro de 30 dias salen como candidatos.
- La prioridad devuelve siempre su formula y el valor de cada factor.
- Toda fusion queda auditada con usuario, fecha y motivo.

**Verificado:** 6 pruebas en `tests/test_dominio.py`.

**El trabajo real de este sprint es el modelo**, y es el unico que no se puede
adelantar escribiendo codigo. Secuencia sugerida:

1. Descargar **RDD2022** y filtrar las clases de dano de pavimento utiles.
2. Fine-tuning de un YOLO pequeno en Colab o Kaggle (gratis).
3. Recolectar video propio en rutas 1 a 3, en condiciones variadas: de dia, al
   atardecer y despues de lluvia. Si todo el dataset es de un solo tipo de luz,
   el modelo queda sesgado y se nota en la ruta 4.
4. Etiquetar los fotogramas propios.
5. Reentrenar y medir **por ruta**, no en conjunto.
6. Guardar los pesos en `modelos/` y registrar la version.

**Importante:** la **Ruta 4 no se toca** en ningun paso de este sprint.

---

## Sprint 11 — Semanas 23 y 24
### Panel administrativo, auditoria, exportaciones y endurecimiento

**Objetivo:** que el sistema sea administrable y auditable, y que resista una
revision de seguridad.

**Requerimientos:** RF-19 (52 h) · RF-20 (34 h) · RF-21 (28 h) = **114 h**

**Entregables**

| # | Entregable | Donde vive | Estado |
|---|---|---|---|
| 11.1 | Gestion de usuarios y roles | `api/v1/admin.py` + `web/src/Administracion.tsx` | Hecho |
| 11.2 | Administracion de rutas y catalogos | `admin.py::crear_ruta` | Hecho |
| 11.3 | Registro de auditoria consultable | `models/audit.py` + `/admin/auditoria` | Hecho |
| 11.4 | Exportacion CSV y GeoJSON sin datos personales | `/admin/export/*` | Hecho |
| 11.5 | Metricas por ruta y estado | `/admin/metricas` | Hecho |
| 11.6 | Rate limiting en el proxy | `infra/nginx/nginx.conf` | Hecho |
| 11.7 | Cabeceras de seguridad y TLS | `nginx.conf` | Hecho |
| 11.8 | **Copias de seguridad cifradas y prueba de restauracion** | — | **Pendiente** |
| 11.9 | **Revision contra OWASP ASVS y MASVS** | — | **Pendiente** |

**Criterios de aceptacion**
- Cada cambio de estado, validacion, fusion y exportacion queda en auditoria con
  usuario, fecha y motivo.
- Las exportaciones no contienen ningun dato personal.
- Una restauracion desde copia de seguridad se prueba y se documenta.
- El login soporta un intento de fuerza bruta sin caerse (5 por minuto).

---

## Sprint 12 — Semanas 25 y 26
### Prueba final en la Ruta 4, analisis de resultados y documentacion

**Objetivo:** medir el sistema contra datos que nunca vio y escribir la tesis.

**Entregables**

| # | Entregable | Estado |
|---|---|---|
| 12.1 | Recorrido completo de la Avenida Ecologica | **Pendiente** |
| 12.2 | Metricas de deteccion: precision, exhaustividad, F1 | **Pendiente** |
| 12.3 | Error mediano de geolocalizacion y % dentro de tolerancia | **Pendiente** |
| 12.4 | Tiempos de procesamiento y tasa de sincronizacion | **Pendiente** |
| 12.5 | Prueba de usabilidad con participantes | **Pendiente** |
| 12.6 | Comparacion ruta 4 contra rutas 1–3 | **Pendiente** |
| 12.7 | Documento de tesis y defensa | **Pendiente** |

**Criterios de aceptacion**
- La ruta 4 no se uso en ningun momento para entrenar ni ajustar.
- Cada metrica se reporta por separado para foto ciudadana y fotograma de video.
- La prueba de usabilidad reporta tasa de finalizacion del reporte.
- Toda sustitucion de ruta por seguridad queda documentada.

**Este sprint no se puede acelerar con codigo.** Es salir a la calle, medir y
escribir.

---

## Donde esta la demo actual en esta linea de tiempo

Lo construido cubre el **camino critico completo de los sprints 1 a 11** en
codigo verificado: 26 pruebas de integracion contra PostGIS real, la app movil
corriendo con datos reales y el panel de revision operativo.

Lo que **no** esta, y no es programable:

| Falta | Sprint | Por que no se puede adelantar |
|---|---|---|
| GPX de las 4 rutas | 0 | Decision del equipo sobre limites y sentido |
| Protocolo etico firmado | 0 | Requiere al asesor |
| Envio real de correos | 1–2 | Necesita cuenta SMTP |
| Credenciales FCM / APNs | 5–6 | Necesita cuenta Firebase y Apple |
| Dataset propio etiquetado | 9–10 | Hay que salir a grabar |
| Modelo YOLO entrenado | 9–10 | Depende del dataset |
| Copias de seguridad probadas | 11 | Necesita el servidor definitivo |
| Toda la evaluacion de campo | 12 | Es el trabajo de tesis |

La demo demuestra que **la arquitectura funciona de extremo a extremo**. Lo que
queda es el trabajo de campo y el modelo, que es exactamente donde esta el aporte
investigativo de la tesis.
