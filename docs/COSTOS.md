# Que cuesta dinero y que no

Revisado en octubre de 2026. Resumen: **el proyecto se puede terminar y defender
gastando 0 USD**. Lo unico que obliga a sacar la tarjeta es opcional o tiene
sustituto gratis.

---

## 1. Todo el stack del repositorio: gratis

| Componente | Licencia | Costo |
|---|---|---|
| React Native, Expo SDK, TypeScript | MIT | 0 |
| expo-camera, location, notifications, sqlite, secure-store | MIT | 0 |
| FastAPI, SQLAlchemy, GeoAlchemy2, Alembic, Pydantic | MIT / BSD | 0 |
| PostgreSQL + PostGIS | PostgreSQL License / GPL-2 | 0 |
| Redis, Celery | BSD | 0 |
| SeaweedFS (almacenamiento S3) | Apache 2.0 | 0 |
| Docker + Docker Compose | Gratis para uso personal y academico | 0 |
| React, Vite, Leaflet | MIT / BSD | 0 |
| PyTorch, OpenCV | BSD / Apache 2.0 | 0 |
| Dataset RDD2022 | Abierto, academico | 0 |
| GitHub + GitHub Actions | Gratis (ilimitado en repos publicos) | 0 |
| Expo Push Notifications | Servicio gratuito de Expo | 0 |
| Firebase Cloud Messaging (push Android) | Plan Spark, gratis | 0 |
| Let's Encrypt (certificado HTTPS) | Gratis | 0 |

---

## 2. Lo que puede costar, y como evitarlo

### 2.1 Cuenta de Apple Developer — 99 USD/ano · **opcional**

Con un **Apple ID gratis** ya se instala la app en un iPhone fisico
("free provisioning"). El perfil **caduca a los 7 dias** y hay que recompilar
desde Xcode. Para la tesis alcanza: se recompila antes de cada salida de campo
y antes de la defensa.

Los 99 USD solo hacen falta para TestFlight, publicar en la App Store o tener
perfiles de un ano.

> Apple **exime la cuota a instituciones educativas acreditadas**. Antes de
> pagarla, pregunten en la universidad si tiene membresia institucional.

### 2.2 Google Maps API en Android — **evitable, y conviene evitarlo**

`react-native-maps` usa Google Maps en Android. El problema no es el precio
(10,000 cargas de mapa al mes gratis, muy por encima de lo que consume una
tesis) sino que **Google exige una cuenta de facturacion con tarjeta valida
antes de darte la primera API key**, aunque nunca pases del tramo gratis.

En iOS no aplica: usa Apple Maps y no pide llave.

**Sustituto sin tarjeta:** cambiar `react-native-maps` por
`@maplibre/maplibre-react-native` con teselas de OpenStreetMap. MapLibre es
BSD, no pide llave ni cuenta de facturacion, y funciona igual en Android e iOS.
El cambio toca solo tres pantallas (`nuevo.tsx`, `mapa.tsx` y el mapa del
panel ya usa Leaflet + OSM, que no necesita llave).

Decision pendiente del equipo: poner una tarjeta en Google Cloud, o migrar a
MapLibre. Si nadie quiere poner tarjeta, MapLibre es el camino.

### 2.3 Servidor (VPS) — 0 a 12 USD/mes · **opcional durante la tesis**

La propuesta plantea un VPS. Para desarrollar y defender **no hace falta**: todo
corre en la laptop con `make up`.

Si quieren un servidor real:

| Opcion | Costo |
|---|---|
| Oracle Cloud Always Free (4 nucleos ARM, 24 GB RAM) | 0, permanente |
| GitHub Student Developer Pack → credito DigitalOcean | 0 durante el credito |
| Azure for Students | 0 durante el credito |
| Hetzner / Contabo / DigitalOcean | ~5–12 USD/mes |

El Always Free de Oracle sobra para este sistema, incluido el worker de video.

### 2.4 Dominio — 0 a 12 USD/ano · **opcional**

Solo hace falta para HTTPS con certificado valido. Gratis: DuckDNS o similar +
Let's Encrypt. El **GitHub Student Pack** regala un dominio `.me` por un ano.

### 2.5 GPU para entrenar el YOLO — **gratis**

- **Google Colab** gratis: suficiente para fine-tuning de un YOLO pequeno.
- **Kaggle**: ~30 h de GPU por semana, gratis.

Colab Pro (~10 USD/mes) solo acelera, no es necesario.

### 2.6 Google Play Console — 25 USD una sola vez · **no lo necesitan**

Solo para publicar en la Play Store. Para la tesis se instala el APK directo en
el telefono, gratis.

---

## 3. Un detalle de licencia que conviene saber

**Ultralytics YOLO es AGPL-3.0.** Para una tesis academica no hay problema. Pero
la AGPL tiene clausula de red: si el sistema se despliega como servicio publico,
hay que ofrecer el codigo fuente. Si algun dia el ayuntamiento quisiera operarlo
cerrado, necesitaria la licencia comercial de Ultralytics (precio por cotizacion).

Sustitutos con licencia permisiva, por si quieren dejarlo abierto desde ya:

- `torchvision` (Faster R-CNN / RetinaNet) — BSD
- YOLOX — Apache 2.0

Mencionarlo en la tesis suma: muestra que se evaluo el marco legal del modelo.

---

## 4. Costo total realista

| Escenario | Costo |
|---|---|
| **Tesis completa, todo local, MapLibre, free provisioning** | **0 USD** |
| Tesis + VPS Oracle Always Free + dominio DuckDNS | **0 USD** |
| Con Apple Developer para TestFlight | 99 USD/ano |
| Con VPS pago y dominio propio | +5–12 USD/mes y ~12 USD/ano |

---

## 5. Lo que de verdad falta, y no es dinero

1. **Los archivos GPX de las 4 rutas** — limites, sentido y longitud. La
   propuesta dice que se fijan en el Sprint 0 y todavia no existen.
2. **El protocolo etico y de consentimiento** para rostros y placas en el video.
   Esto es requisito de la propuesta y hay que firmarlo antes de grabar.
3. **Un telefono Android** para el development build. Es el camino mas barato y
   rapido: no pide cuenta de pago ni recompilar cada 7 dias.
4. **Un acompanante en el carro** durante los recorridos. La propuesta lo exige:
   el operador no toca el telefono manejando.
5. **Las sesiones de recoleccion** en las rutas 1 a 3, en condiciones variadas
   (dia, tarde, despues de lluvia) para que el dataset no quede sesgado.
6. **Los participantes de la prueba de usabilidad** — es uno de los criterios de
   exito que fija la propuesta.
7. **Credenciales FCM** (Android) para que el push salga del emulador. Gratis,
   pero hay que crear el proyecto en Firebase y bajar el `google-services.json`.

De esta lista, lo unico que bloquea trabajo tecnico hoy son los GPX y el telefono
Android. Lo demas es trabajo de campo y papeleo.

---

## 6. Recomendacion

Saquen los tres el **GitHub Student Developer Pack** (son estudiantes con
matricula activa): trae credito de servidor, dominio gratis por un ano y varias
herramientas de pago liberadas. Con eso, el proyecto completo sale en **0 USD**.
