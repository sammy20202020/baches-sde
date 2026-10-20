# Guia de arranque

Probado en macOS (Apple Silicon) con Docker Desktop, Node 25 y Python 3.13.

---

## 1. Requisitos

| Herramienta | Version | Para que |
|---|---|---|
| Docker Desktop | 29+ | Base de datos, Redis, almacenamiento, API, workers |
| Node.js | 20+ (probado en 25.6) | App movil y panel web |
| Python | 3.13 | Backend fuera de Docker (opcional) |
| Expo Go | ultima | Pruebas rapidas en el telefono (sin video) |
| Android Studio / Xcode | — | Development build (necesario para RF-13) |

---

## 2. Backend, base de datos y almacenamiento

```bash
cd ~/Desktop/baches-sde
make up
make seed
```

`make up` crea `backend/.env` desde el ejemplo si no existe, levanta PostGIS,
Redis y el almacenamiento, aplica las migraciones y arranca la API con recarga.

Comprobacion:

```bash
curl http://localhost:8000/salud
```

Debe responder `{"estado":"ok","postgis":"3.5 ..."}`.

### Usuarios de desarrollo

`make seed` crea uno por rol, todos con la contrasena `desarrollo-local-2026`:

| Correo | Rol |
|---|---|
| `admin@baches.example.com` | admin |
| `revisor@baches.example.com` | revisor |
| `operador@baches.example.com` | operador |
| `ciudadano@baches.example.com` | ciudadano |

Son solo para desarrollo local. El dominio `example.com` esta reservado por la
IANA: ningun correo sale de ahi.

---

## 3. Panel web

```bash
make web   # http://localhost:5173
```

Entra con `revisor@baches.example.com`. El panel rechaza a ciudadanos y
operadores: es solo para revisores y administradores.

---

## 4. App movil

### 4.1 Apuntar la app a tu computadora

El telefono no resuelve `localhost`: hay que poner la IP de tu maquina en la red
local. Busca la tuya con:

```bash
ipconfig getifaddr en0
```

Y ponla en `mobile/app.json`, en `expo.extra.apiUrl`:

```json
"extra": { "apiUrl": "http://192.168.1.100:8000/api/v1" }
```

El telefono y la computadora deben estar en la misma red Wi-Fi.

### 4.2 Expo Go (rapido, sin video)

```bash
cd mobile
npm run start:go
```

Escanea el codigo QR con Expo Go. Sirve para registro, reporte con foto y GPS,
cola offline, mapa y notificaciones.

### 4.3 Development build (obligatorio para el recorrido en video)

La grabacion de video con muestreo GPS continuo (RF-13) necesita modulos nativos
que Expo Go no trae:

```bash
cd mobile
npx expo prebuild            # genera las carpetas ios/ y android/
npm run android              # o: npm run ios
```

Para Android hace falta una **API key de Google Maps** en
`mobile/app.json` → `android.config.googleMaps.apiKey`. En iOS no se necesita:
usa Apple Maps.

Para instalar en un **iPhone fisico** hace falta una cuenta de Apple Developer
(99 USD/ano). Sin ella la evaluacion en iOS se limita al simulador, y conviene
dejarlo escrito en la tesis.

---

## 5. Worker de vision artificial

El worker de IA va en una imagen aparte porque PyTorch pesa unos 3 GB:

```bash
make build-ia
docker compose -f infra/docker-compose.yml --profile ia up -d worker-ia
```

Coloca los pesos en `modelos/baches-yolo.pt`. Sin modelo, el sistema funciona
igual: no propone detecciones y todo pasa a revision humana.

---

## 6. Pruebas

```bash
make test          # backend (pytest) + typecheck de movil y web
make test-backend  # solo backend
```

Las pruebas del backend crean y destruyen una base `baches_test` aparte. Usan
PostGIS real porque todo el dominio depende de funciones espaciales.

---

## 7. Problemas comunes

**`npm error EACCES ... _cacache`** — la cache de npm tiene archivos de `root`
por un `sudo npm` anterior. Arreglo:

```bash
sudo chown -R $(whoami) ~/.npm
```

**La imagen de la base arranca emulada y va lenta** — se usa
`imresamu/postgis:16-3.5` porque la imagen oficial de PostGIS es solo amd64. Si
cambias de imagen en `infra/docker-compose.yml`, verifica que tenga arm64.

**El telefono no ve la API** — revisa `expo.extra.apiUrl`, que ambos esten en la
misma Wi-Fi, y que el firewall de macOS no bloquee el puerto 8000.

**`npx expo install` falla con ERESOLVE** — `react-dom` esta fijado a la misma
version que `react` en `mobile/package.json` (incluido `overrides`). No lo subas
de version por separado.
