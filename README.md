# Baches SDE

Sistema movil para la deteccion, geolocalizacion, reporte y priorizacion de baches
en Santo Domingo Este.

Implementacion del **Proyecto Integrador G6** — David de la Rosa (2024-0145),
Samuel Roa (2024-0102), Anyelys Torres Castillo (2024-0110).

El producto principal es la **aplicacion movil** (Android + iPhone). El panel web
es un complemento para revision y administracion.

---

## Como arrancar

```bash
make up      # base de datos PostGIS, Redis, almacenamiento S3, API y worker
make seed    # crea las 4 rutas de evaluacion y los usuarios de desarrollo
make mobile  # abre Expo
make web     # abre el panel de revision
```

Detalle completo en [`docs/GUIA-ARRANQUE.md`](docs/GUIA-ARRANQUE.md).

| Servicio | URL |
|---|---|
| API (documentacion OpenAPI) | http://localhost:8000/docs |
| Panel de revision | http://localhost:5173 |
| Consola del almacenamiento | http://localhost:9333 |

---

## Estructura

```
baches-sde/
├── mobile/     App Expo + React Native + TypeScript  ← producto principal
├── backend/    API FastAPI + PostGIS + Celery + YOLO
├── web/        Panel de revision React + TypeScript + Leaflet
├── infra/      Docker Compose, Nginx, almacenamiento
├── modelos/    Pesos del modelo (fuera de Git)
└── docs/       Analisis, arquitectura, guia y roadmap
```

---

## El stack (el mismo de la propuesta)

| Capa | Tecnologia |
|---|---|
| App movil | React Native 0.88 · Expo SDK 58 · TypeScript · expo-router |
| Mapas movil | react-native-maps |
| Offline | expo-sqlite (cola de borradores con clave de idempotencia) |
| Backend | Python 3.13 · FastAPI · SQLAlchemy 2 · GeoAlchemy2 |
| Base de datos | PostgreSQL 16 + PostGIS 3.5 |
| Cola | Redis + Celery |
| IA | PyTorch / Ultralytics YOLO + OpenCV (solo en el servidor) |
| Evidencia | Almacenamiento de objetos compatible con S3 |
| Panel web | React 19 · TypeScript · Vite · Leaflet |
| Contenedores | Docker + Docker Compose |
| Proxy | Nginx (TLS, rate limiting) |

---

## La regla que no se negocia

> Ninguna deteccion de inteligencia artificial aparece en el mapa publico hasta
> que un revisor autorizado la confirma. Los datos personales nunca se publican.

Esto esta forzado por el modelo de datos: `GET /mapa/publico` exige
`publicado_en IS NOT NULL`, selecciona columnas explicitas y jamas hace JOIN con
la tabla de usuarios. Hay pruebas automatizadas que lo verifican.

---

## Documentacion

| Documento | Contenido |
|---|---|
| [ANALISIS-PROYECTO.md](docs/ANALISIS-PROYECTO.md) | Analisis de la propuesta, viabilidad movil y riesgos reales |
| [GUIA-ARRANQUE.md](docs/GUIA-ARRANQUE.md) | Puesta en marcha paso a paso, incluido el telefono fisico |
| [ARQUITECTURA.md](docs/ARQUITECTURA.md) | Flujo de datos, modelo de datos y decisiones tecnicas |
| [ROADMAP-SPRINTS.md](docs/ROADMAP-SPRINTS.md) | Los 13 sprints y que queda hecho ya |

---

## Estado actual

Lo que ya funciona de extremo a extremo (verificado contra PostGIS real):

- Registro, inicio de sesion, roles y rotacion de tokens.
- Reporte ciudadano con foto, GPS confirmable y validacion de la evidencia.
- Cola offline con clave de idempotencia: un reintento no duplica reportes.
- Revision humana con correccion de ubicacion, severidad y motivo auditado.
- Mapa publico anonimizado, deduplicacion espacial y prioridad explicable.
- Recorrido tecnico en video con muestras GPS e interpolacion de posicion.
- Exportaciones CSV/GeoJSON y registro de auditoria.

Lo que falta: entrenar el modelo YOLO con datos propios y la evaluacion de campo
en las 4 rutas. Ver [ROADMAP-SPRINTS.md](docs/ROADMAP-SPRINTS.md).
