# Stack implementado y desviaciones de la propuesta

Comparacion entre la seccion 6 de la propuesta ("Tecnologias escogidas") y lo
que esta construido. Cada diferencia lleva su motivo.

Estado al 24 de noviembre de 2026.

---

## 1. Resumen: que se mantuvo y que cambio

| Capa | Propuesta | Implementado | |
|---|---|---|---|
| App movil | React Native + Expo + TypeScript | Expo SDK 58 · RN 0.88 · TS 6 | **igual** |
| Backend | Python + FastAPI | Python 3.13 · FastAPI 0.156 | **igual** |
| Base de datos | PostgreSQL + PostGIS | PostgreSQL 16 + PostGIS 3.5 | **igual** |
| Cola asincrona | Redis + Celery | Redis 8.1 · Celery 5.6 | **igual** |
| IA | PyTorch/Ultralytics YOLO + OpenCV | igual, sin entrenar | **igual** |
| Panel web | React + TypeScript | React 19 · TS 6 · Vite 8 | **igual** |
| Mapas web | Leaflet | Leaflet 1.9 + react-leaflet 5 | **igual** |
| Contenedores | Docker + Docker Compose | igual | **igual** |
| Proxy | Nginx | Nginx 1.27 | **igual** |
| **Mapas movil** | **React Native Maps** | **MapLibre + OpenStreetMap** | **CAMBIO** |
| **Almacenamiento** | Objetos compatible con S3 | **SeaweedFS** | **sustitucion** |

**De once decisiones tecnologicas, nueve se mantienen exactamente.** Una cambio
por una barrera economica y otra por una sustitucion forzada del mercado.

---

## 2. El cambio que hay que defender: MapLibre en vez de React Native Maps

### Que dice la propuesta

> "Mapas: React Native Maps en movil y Leaflet en web. Cubren visualizacion de
> mapas, marcadores y capas geoespaciales (...) sin acoplar el dominio a un
> unico proveedor de mapas."

El objetivo declarado era **no acoplarse a un proveedor**. Ese objetivo se
mantiene; lo que cambio es el medio.

### Por que se cambio

`react-native-maps` usa **Google Maps** en Android. Al compilar se descubrio que:

1. Google **exige una cuenta de facturacion con tarjeta de credito valida**
   antes de entregar la primera API key, aunque el consumo nunca salga del
   tramo gratuito (10,000 cargas de mapa al mes, muy por encima de lo que
   consume esta tesis).
2. Sin esa llave el mapa no carga: queda en gris. Verificado en el APK, donde
   la llave era literalmente el texto de relleno.

Para un proyecto academico sin presupuesto, condicionar una funcionalidad
central a que un estudiante ponga su tarjeta personal es una barrera real.

### Que se hizo

| | Antes | Ahora |
|---|---|---|
| Libreria | react-native-maps | `@maplibre/maplibre-react-native` 11.5 |
| Licencia | Apache 2.0 (pero atada a Google Maps) | BSD |
| Cartografia | Google Maps | OpenStreetMap |
| Llave requerida | Si | **No** |
| Cuenta de facturacion | Si | **No** |
| Costo | 0 USD, con tarjeta en archivo | **0 USD, sin tarjeta** |

### Argumento para la defensa

El cambio **refuerza** el criterio que la propia propuesta declara. MapLibre con
OpenStreetMap:

- No ata el proyecto a ningun proveedor comercial.
- Usa cartografia abierta, coherente con un proyecto de interes publico.
- Elimina la dependencia de una cuenta de pago para una herramienta municipal.
- Mantiene las mismas capacidades: marcadores, capas, interaccion.

En el panel web **nunca hubo que cambiar nada**: Leaflet ya usaba OpenStreetMap
desde el principio. El cambio en movil **unifica** ambos clientes bajo la misma
cartografia, lo que antes no ocurria.

### Lo que hay que declarar honestamente

Se usa el **servidor publico de teselas de OpenStreetMap**, cuya politica de uso
desaconseja aplicaciones de volumen. Para la evaluacion en cuatro rutas alcanza,
pero un despliegue real exige un proveedor de teselas propio o contratado. Es un
cambio de una sola URL, documentado en `src/ui/mapa-estilo.ts`.

---

## 3. La sustitucion forzada: SeaweedFS

La propuesta pide "almacenamiento de objetos compatible con S3" sin nombrar
producto. La eleccion natural era **MinIO**, pero **sus imagenes publicas
dejaron de distribuirse en Docker Hub**.

Se usa **SeaweedFS**: misma API S3, Apache 2.0, y **cero cambios en el codigo**
porque el cliente sigue siendo `boto3` hablando S3. En el VPS se puede cambiar
por S3 de AWS, Cloudflare R2, DigitalOcean Spaces o MinIO autoalojado tocando
solo dos variables de entorno.

**Esto no contradice la propuesta**: cumple exactamente lo que pide.

---

## 4. Adiciones que la propuesta no nombra

La propuesta exige comportamientos sin especificar la herramienta. Estas
elecciones **llenan huecos**, no cambian decisiones:

| Herramienta | Que requerimiento cumple |
|---|---|
| **expo-sqlite** | RF-07/08: "borradores locales" y "cola de sincronizacion". La propuesta exige el comportamiento, no nombra motor |
| **Alembic** | RNF-07: "migraciones versionadas" |
| **expo-dev-client** | RF-13: grabar video con GPS continuo no funciona en Expo Go |
| **expo-build-properties** | Configurar el build de Android (minificacion, trafico HTTP) |
| **Argon2id** | RNF-01: "contrasenas con algoritmo adaptativo" |
| **slowapi** | RNF-01: limites de intentos en el login |

---

## 5. Dos pantallas que la propuesta no contempla

Ninguna de las dos aparece en los 21 requerimientos funcionales. Se agregaron
por necesidad operativa y conviene mencionarlas.

**Ajustes de servidor.** Un APK autonomo no puede deducir la IP de la
computadora que corre el backend, y esa IP cambia cada vez que el router reparte
direcciones. Sin esta pantalla, cada cambio de red obliga a recompilar 168 MB,
lo que es inviable en una salida de campo. La pantalla prueba la direccion
contra el endpoint de salud antes de guardarla.

**Modo demostracion.** Un build que responde desde datos de ejemplo en memoria,
sin backend. Permite enseñar la interfaz completa sin levantar la
infraestructura. Los 18 baches de ejemplo estan sobre las coordenadas reales de
los corredores de evaluacion.

> **Al presentar el modo demostracion hay que decir que son datos de ejemplo.**
> La interfaz esta completa; el modelo de deteccion es trabajo del Sprint 9-10.

---

## 6. Desviaciones en el alcance de los datos

| Punto | Propuesta | Realidad encontrada |
|---|---|---|
| **Ruta 4** | "Avenida Ecologica" | La avenida mide 25.61 km pero **se sale del municipio**. La evaluacion se limita a los **16.30 km dentro de Santo Domingo Este** |
| **Ruta 1** | "Avenida Espana" | **No existe en la cartografia abierta.** Hay que levantarla recorriendola con la app en modo tecnico |
| Limite municipal | implicito | Se tomo de la relacion administrativa de OpenStreetMap: lat 18.4547–18.5982, lon -69.8979–-69.7026 |

La Ruta 4 hay que describirla en la tesis como **el tramo municipal de la
Avenida Ecologica**, no como la avenida completa.

---

## 7. Deuda tecnica declarada

**Trafico HTTP sin cifrar habilitado en Android.** Desde Android 9 el sistema
bloquea `http://` salvo declaracion expresa, y el desarrollo en red local lo
necesita. **Esto contradice temporalmente el RNF-01** ("trafico cifrado con
TLS") y debe desactivarse en cuanto la API tenga HTTPS. Documentado en el
protocolo etico, seccion 10, y en `docs/ANDROID.md`.

**Minificacion R8 desactivada** en los builds de release. R8 recortaba clases
que React Native resuelve por reflexion y la app se cerraba al arrancar. Para un
prototipo no aporta nada.

---

## 8. Lo que no se ha tocado de la propuesta

- La arquitectura de tres canales: movil, API central, panel web.
- El principio de publicacion: ninguna deteccion de IA llega al mapa publico sin
  validacion humana.
- Los cuatro roles y la validacion de autorizacion en el servidor.
- La idempotencia extremo a extremo para el modo sin conexion.
- La deduplicacion por cercania espacial, ventana temporal y similitud visual.
- La prioridad explicable con su formula expuesta.
- La Ruta 4 como prueba final no vista.
- El alineamiento con OWASP ASVS y MASVS.
- Scrum con iteraciones de dos semanas.

---

## 9. Estado verificable

| | |
|---|---|
| Commits | 12 |
| Lineas propias | ~6,500 (Python, TypeScript) |
| Pruebas automatizadas | **29**, contra PostGIS real |
| Documentos | 9 |
| Sprints cubiertos en codigo | 1 al 11 |
| Pendiente | Modelo entrenado · trabajo de campo · Sprint 12 |

Desglose de pruebas: seguridad 8 · reportes 11 · dominio 6 · geoespacial 4.
