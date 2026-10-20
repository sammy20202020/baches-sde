# Análisis del Proyecto Integrador G6 — enfoque móvil

Fuente: `Propuesta de Proyecto Integrador G6.pdf` (12 págs.)
Equipo: David de la Rosa (2024-0145), Samuel Roa (2024-0102), Anyelys Torres Castillo (2024-0110)
Fecha de análisis: 2026-10-20

---

## 1. Conclusión principal

**Sí se puede hacer en móvil, y de hecho la propuesta ya es nativamente móvil.**

La propuesta no describe una app web que haya que "portar": describe una **app móvil
multiplataforma (Android + iPhone) como producto principal** (sección "Alcance incluido",
pág. 3) construida con **React Native + Expo + TypeScript** (sección 6, pág. 8).
El panel web es un complemento reducido para revisión y administración, no el producto.

Por lo tanto el trabajo no es "convertir a móvil", sino **implementar el camino crítico
móvil primero** y respetar el mismo stack ya justificado en el documento. Eso es lo que
monta este repositorio.

### Lo que sí hay que verificar técnicamente (no es trivial)

| Riesgo móvil real | Por qué | Mitigación en este repo |
|---|---|---|
| Video georreferenciado largo (RF-13) | Expo Go **no** permite grabación en background ni muestreo GPS continuo con la pantalla apagada | Se requiere **development build** (`expo-dev-client`), no Expo Go. Grabación en primer plano + `expo-location` con `watchPositionAsync`, chunks de 60 s, subida resumible |
| Inferencia de IA | No se corre YOLO en el teléfono | La IA vive en el backend (Celery workers). El móvil solo sube evidencia. Coincide con la propuesta |
| Modo sin conexión (RF-07/08) | AsyncStorage no sirve para colas con integridad | **expo-sqlite** + cola de outbox con `idempotency_key` UUIDv4 generada en el dispositivo |
| Notificaciones push (RF-10) | Requiere credenciales FCM (Android) y APNs (iOS) | `expo-notifications` + Expo Push Service; el backend guarda `expo_push_token` por dispositivo |
| iOS sin cuenta de Apple Developer | Con un Apple ID gratis **sí** se instala en un iPhone físico (free provisioning), pero el perfil caduca a los **7 días** y la app deja de abrir | Para la tesis alcanza: se recompila desde Xcode antes de cada sesión de campo o de la defensa. Los $99/año solo hacen falta para TestFlight, App Store o perfiles de 1 año |
| Mapas | `react-native-maps` usa Google Maps en Android (API key) y Apple Maps en iOS | API key de Google Maps solo para Android; iOS funciona sin key |

---

## 2. Qué construye el sistema (resumen funcional)

Tres canales coordinados:

1. **App móvil ciudadana** — registro, reporte con foto + GPS confirmable, borradores
   offline, historial de estados, mapa público, notificaciones push.
2. **App móvil técnica** (mismo binario, rol distinto) — recorridos en video con muestras
   GPS, inicio/pausa/fin, subida en segundo plano.
3. **Backend + panel web** — API FastAPI, PostGIS, workers de IA (YOLO), deduplicación,
   revisión humana obligatoria antes de publicar, prioridad explicable, auditoría.

**Regla dura de la propuesta (pág. 7):** ninguna detección de IA se publica en el mapa
público hasta que un revisor autorizado la confirme. Esto es una restricción de datos, no
de UI: el modelo de datos la debe forzar (`estado` + `publicado_en` separados).

Alcance de evaluación: 4 rutas de Santo Domingo Este (España, San Vicente de Paúl,
Charles de Gaulle, Ecológica). La **Ruta 4 es holdout** — no se usa para entrenar ni ajustar.

---

## 3. El stack, tal como lo fija la propuesta

| Capa | Tecnología (propuesta) | Estado en este repo |
|---|---|---|
| App móvil | React Native + Expo + TypeScript | `mobile/` — Expo SDK 58, RN 0.88, TS |
| Mapas móvil | `react-native-maps` | instalado |
| Backend | Python + FastAPI | `backend/` — FastAPI + SQLAlchemy 2 + GeoAlchemy2 |
| Base de datos | PostgreSQL + PostGIS | `infra/docker-compose.yml` → `postgis/postgis:16-3.4` |
| Cola asíncrona | Redis + Celery | `backend/app/workers/` |
| IA | PyTorch / Ultralytics YOLO + OpenCV | `backend/app/services/vision.py` (stub conmutable) |
| Evidencia | Almacenamiento de objetos S3-compatible | MinIO en compose, cliente `boto3` |
| Panel web | React + TypeScript | `web/` — Vite + React + TS |
| Mapas web | Leaflet | `react-leaflet` |
| Contenedores | Docker + Docker Compose | `infra/` |
| Proxy | Nginx (HTTPS, rate limit) | `infra/nginx/` |
| Pruebas | Pytest, Vitest/Jest, Playwright | configurado en cada paquete |

**No se cambió ni una sola tecnología.** Las únicas adiciones son instrumentales y
compatibles con lo escrito: `expo-sqlite` (para RF-07, la propuesta exige borradores
locales pero no nombra el motor), `expo-dev-client` (requisito técnico para RF-13),
`Alembic` (la propuesta exige "migraciones versionadas" sin nombrar la herramienta),
`MinIO` (implementación local del "almacenamiento compatible con S3" que ya pide).

---

## 4. Arquitectura de referencia

```
┌──────────────────────────────┐
│  mobile/  Expo + RN + TS     │
│  ciudadano · operador        │
│  ├ cámara + GPS              │
│  ├ SQLite outbox (offline)   │
│  └ expo-notifications        │
└───────────┬──────────────────┘
            │ HTTPS  (Idempotency-Key)
            ▼
┌──────────────────────────────┐        ┌───────────────────┐
│  Nginx  (TLS · rate limit)   │◄───────┤ web/ React+Leaflet│
└───────────┬──────────────────┘        │ panel revisión    │
            ▼                           └───────────────────┘
┌──────────────────────────────┐
│  FastAPI  /api/v1            │
│  auth · roles · validación   │
│  idempotencia · auditoría    │
└──┬──────────┬────────────┬───┘
   ▼          ▼            ▼
┌────────┐ ┌──────┐ ┌─────────────┐
│PostGIS │ │MinIO │ │ Redis queue │
│dominio │ │fotos │ └──────┬──────┘
│  geo   │ │video │        ▼
└────────┘ └──────┘ ┌──────────────────────┐
                    │ Celery workers       │
                    │ ├ extracción frames  │
                    │ ├ YOLO (detección)   │
                    │ ├ dedupe espacial    │
                    │ └ prioridad          │
                    └──────────────────────┘
```

Flujo de publicación (obligatorio):
`candidato IA` → `en_revision` → **revisor humano confirma** → `validado` → visible en mapa público.

---

## 5. Mapeo de los 21 requerimientos funcionales → código

| RF | Dónde vive | Prioridad sprint |
|---|---|---|
| RF-01, 02 | `backend/app/api/v1/auth.py`, `mobile/app/(auth)/` | 1–2 |
| RF-03 | `backend/app/core/security.py` (`require_role`) | 1–2 |
| RF-04 | `mobile/app/(tabs)/nuevo.tsx` + `POST /reportes` | 3–4 |
| RF-05 | `backend/app/schemas/report.py` (validación Pydantic) | 3–4 |
| RF-06 | `backend/app/workers/tasks.py::analizar_foto` | 9–10 |
| RF-07, 08 | `mobile/src/db/outbox.ts` + header `Idempotency-Key` | 3–4 |
| RF-09 | `mobile/app/(tabs)/mis-reportes.tsx` | 5–6 |
| RF-10 | `expo-notifications` + `backend/app/services/push.py` | 5–6 |
| RF-11, 12 | `GET /mapa/publico` (GeoJSON) + `mobile/app/(tabs)/mapa.tsx` | 5–6 |
| RF-13, 14, 15 | `mobile/app/recorrido.tsx` + `tasks.py::procesar_video` | 7–8 |
| RF-16 | `backend/app/services/dedupe.py` (ST_DWithin + hash visual) | 9–10 |
| RF-17 | `web/src/pages/Revision.tsx` | 9–10 |
| RF-18 | `backend/app/services/priority.py` | 9–10 |
| RF-19, 20 | `web/src/pages/Admin.tsx`, `models/audit.py` | 11 |
| RF-21 | `GET /export/geojson`, `GET /export/csv` | 11 |

Total estimado por la propuesta: **930 h** (644 desarrollo + 286 pruebas) para 3 personas.

---

## 6. Decisiones que la propuesta deja abiertas y aquí se resuelven

1. **Expo Go vs development build** → *development build obligatorio* desde el Sprint 7
   (video + GPS continuo). Antes de eso Expo Go alcanza.
2. **Motor de borradores offline** → `expo-sqlite` con tabla `outbox` y estados
   `pendiente / enviando / enviado / error`.
3. **Idempotencia** → UUIDv4 generado en el dispositivo al crear el borrador, enviado como
   header `Idempotency-Key`; el backend guarda la respuesta y la reemite en reintentos.
4. **Anonimato del mapa público** → vista SQL separada que solo expone
   `id, geom, severidad, estado, fecha`. Nunca JOIN con `usuarios` en ese endpoint.
5. **Precisión GPS** → se persiste `accuracy_m` del dispositivo; reportes con
   `accuracy_m > 50` se marcan para corrección manual del revisor.
6. **Dataset** → RDD2022 (ref. [3] de la propuesta) para pre-entrenamiento + recolección
   propia en rutas 1–3.

---

## 7. Qué falta decidir con el equipo / asesor

- Proveedor del VPS y región (afecta latencia y RNF-03: p95 < 2 s).
- ¿Se paga la cuenta Apple Developer ($99/año) o se trabaja con free provisioning
  recompilando cada 7 días? Con free provisioning la evaluación en iPhone físico es
  posible; sin ella NO queda limitada a simulador, como se pensó al inicio.
  Verificar además si la universidad tiene membresía institucional: Apple exime la
  cuota a instituciones educativas acreditadas.
- Protocolo ético / consentimiento para rostros y placas en el video (la propuesta lo
  menciona; falta el documento firmado).
- Archivos GPX definitivos de las 4 rutas (la propuesta dice que se fijan en Sprint 0).

---

## 8. Siguiente paso inmediato

```bash
cd ~/Desktop/baches-sde
make up        # levanta postgis + redis + minio + api + worker
make mobile    # abre Expo en el teléfono
```

Ver [`GUIA-ARRANQUE.md`](GUIA-ARRANQUE.md) para el detalle y
[`ROADMAP-SPRINTS.md`](ROADMAP-SPRINTS.md) para el orden de trabajo.
