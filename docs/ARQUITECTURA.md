# Arquitectura

## 1. Flujo completo

```
CIUDADANO                          OPERADOR TECNICO
   │ foto + GPS                       │ video + muestras GPS (1 Hz)
   ▼                                  ▼
┌──────────────────────────────────────────────┐
│  App movil (Expo + RN + TS)                  │
│  SQLite outbox → idempotency_key por reporte │
└───────────────────┬──────────────────────────┘
                    │ HTTPS · Idempotency-Key
                    ▼
            ┌───────────────┐
            │ Nginx (TLS)   │ rate limit: 5/min en /auth/login
            └───────┬───────┘
                    ▼
       ┌────────────────────────────┐
       │ FastAPI /api/v1            │
       │ JWT · roles · validacion   │
       │ idempotencia · auditoria   │
       └──┬───────────┬─────────┬───┘
          ▼           ▼         ▼
   ┌───────────┐ ┌────────┐ ┌─────────┐
   │ PostGIS   │ │  S3    │ │ Redis   │
   │ dominio   │ │ fotos  │ │ cola    │
   │ + geo     │ │ videos │ └────┬────┘
   └───────────┘ └────────┘      ▼
                          ┌──────────────────┐
                          │ Celery workers   │
                          │ frames → YOLO    │
                          │ phash → dedupe   │
                          └────────┬─────────┘
                                   ▼
                          estado = en_revision
                                   │
                    ┌──────────────┴──────────────┐
                    │  PANEL WEB — revisor humano │
                    │  validar / corregir / fusionar
                    └──────────────┬──────────────┘
                                   ▼
                        publicado_en = ahora
                                   │
                    ┌──────────────┴──────────────┐
                    │ Mapa publico anonimizado    │
                    │ Notificacion push al autor  │
                    └─────────────────────────────┘
```

---

## 2. Modelo de datos

| Tabla | Para que |
|---|---|
| `usuarios` | Cuenta, rol, consentimiento de privacidad |
| `dispositivos` | Token de Expo Push por dispositivo (RF-10) |
| `refresh_tokens` | Rotacion y revocacion de sesiones |
| `reportes` | Punto `geography(POINT,4326)`, estado, severidad, prioridad |
| `evidencias` | Referencia a S3 + `sha256` + `phash` |
| `rutas` | Las 4 rutas; `es_holdout` marca la Ruta 4 |
| `recorridos` | Sesion de video tecnico |
| `muestras_gps` | Track a 1 Hz; base de la interpolacion (RF-15) |
| `auditoria` | Quien cambio que, cuando y por que (RF-20) |
| `respuestas_idempotentes` | Respuesta guardada por clave (RF-08) |

### Por que `geography` y no `geometry`

Con `geography(POINT,4326)`, `ST_DWithin` y `ST_Distance` trabajan en **metros**
sobre el elipsoide, sin reproyectar a UTM a mano. El radio de deduplicacion
(15 m) y el de busqueda del mapa son metros reales, no grados.

El indice GiST se declara explicitamente en `__table_args__` y el parametro
`spatial_index=False` desactiva el que GeoAlchemy2 crea solo: sin eso, Alembic
genera un `CREATE INDEX` duplicado que falla al migrar.

---

## 3. Las cuatro decisiones que sostienen el sistema

### 3.1 Idempotencia desde el dispositivo

La `idempotency_key` es un UUIDv4 que genera **el telefono al crear el
borrador**, no al enviarlo. Si la red se cae a mitad del POST, el reintento usa
la misma clave; el backend encuentra la respuesta guardada y la devuelve tal
cual. El resultado es un unico reporte, no dos.

La alternativa (deduplicar por "misma foto, misma hora") es fragil: dos personas
pueden reportar el mismo bache en el mismo minuto, y eso **si** son dos reportes.

### 3.2 La publicacion es una columna, no un estado

`publicado_en` existe aparte de `estado`. El mapa publico exige
`publicado_en IS NOT NULL`. Asi, un bug que ponga `estado = 'validado'` por
accidente sigue sin publicar nada: harian falta dos errores independientes.

### 3.3 El mapa publico no conoce la tabla de usuarios

`GET /mapa/publico` selecciona columnas explicitas y no hace JOIN con
`usuarios`. No es que el serializador oculte el correo: es que el dato nunca
entra en la consulta. Una prueba automatizada verifica que la respuesta no
contenga `@` ni `autor`.

### 3.4 La IA propone, el humano dispone

`analizar_foto` escribe `severidad_ia` y `confianza_ia`, y deja el reporte en
`en_revision`. No puede escribir `publicado_en` ni `severidad_validada`: esas
columnas solo las toca el endpoint de revision, que exige rol de revisor y un
motivo de al menos 5 caracteres que queda en la auditoria.

---

## 4. Prioridad explicable (RF-18)

```
prioridad = severidad×0.40 + frecuencia×0.25 + tipo_via×0.20 + exposicion×0.15
```

Se guarda junto al puntaje un JSON `prioridad_detalle` con la formula, cada
factor y su valor. El revisor ve **por que** un bache quedo en 62.5 y no en 80.
Un modelo opaco aqui seria peor: la prioridad la tiene que poder defender una
persona ante la autoridad municipal.

La frecuencia satura a los 5 reportes: mas alla de eso deja de discriminar.

---

## 5. Deduplicacion (RF-16)

Tres senales, ninguna decisoria por si sola:

1. **Espacial** — `ST_DWithin` sobre el indice GiST, radio 15 m configurable.
2. **Temporal** — ventana de 30 dias; un bache reparado y vuelto a abrir es un
   caso nuevo.
3. **Visual** — distancia de Hamming entre `phash` de las fotos.

El puntaje (70% proximidad, 30% visual) **ordena** candidatos. La fusion la
ejecuta un revisor y queda auditada con motivo.

---

## 6. Seguridad

| Control | Implementacion |
|---|---|
| Contrasenas | Argon2id (`argon2-cffi`), con `check_needs_rehash` |
| Sesiones | JWT de 15 min + refresh rotativo de 30 dias, revocable |
| Secretos en el movil | `expo-secure-store` (Keychain / Keystore) |
| Autorizacion | `require_role(...)` por operacion, validada en el servidor |
| Subidas | Tipo, tamano y contenido validados antes de tocar S3 |
| Evidencia | URLs firmadas de 10 minutos; nunca publica |
| Rate limiting | Nginx: 20 r/s general, 5 r/min en login |
| Auditoria | Accesos sensibles, validaciones, fusiones y exportaciones |

Alineado con OWASP ASVS (API y web) y MASVS (movil), como pide la propuesta.

---

## 7. Lo que corre en el telefono y lo que no

| En el telefono | En el servidor |
|---|---|
| Camara, GPS, mapa | Inferencia YOLO |
| Cola SQLite y reintentos | Extraccion de fotogramas |
| Compresion de la foto a 1280 px | Deduplicacion y prioridad |
| Confirmacion del punto por el usuario | Interpolacion GPS de los frames |

Comprimir la foto en el telefono no es un detalle: una foto de 12 MP en una red
movil lenta es la causa mas comun de que un reporte nunca llegue.
