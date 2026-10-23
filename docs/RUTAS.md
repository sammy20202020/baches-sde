# Rutas de evaluacion

Entregable 0.7 del Sprint 0. Corredores de Santo Domingo Este sobre los que se
mide el sistema, segun la seccion 2 de la propuesta.

Archivos: [`datos/rutas/`](../datos/rutas/) en formato GPX.

---

## Las cuatro rutas

| Ruta | Corredor | Largo en SDE | Puntos | Uso en la investigacion |
|---|---|---|---|---|
| **R1** | Avenida Espana | *por levantar* | — | Levantamiento inicial, entrenamiento y pruebas funcionales |
| **R2** | Avenida San Vicente de Paul | **9.10 km** | 111 | Levantamiento y validacion del modelo y del flujo movil |
| **R3** | Avenida Charles de Gaulle | **14.17 km** | 291 | Validacion cruzada y pruebas de carga operativa |
| **R4** | Avenida Ecologica | **16.30 km** | 310 | **Prueba final no vista.** No se usa para entrenar ni ajustar |

Longitudes medidas sobre el eje central, no sobre una sola calzada.

---

## De donde salen estas geometrias

Se tomaron de **OpenStreetMap** (licencia ODbL) y se procesaron en tres pasos:

1. **Descarga por nombre** dentro de la caja de Santo Domingo Este, descartando
   homonimos: elevados, respaldos y calles con el mismo nombre.
2. **Eje central.** Cada avenida tiene las dos calzadas mapeadas por separado.
   Unirlas tal cual produce un zigzag que sube por un sentido y baja por el otro:
   la Charles de Gaulle daba 40 km y la Ecologica 61 km, ambas imposibles. Se
   calcula la direccion dominante del corredor, se proyectan todos los puntos
   sobre ese eje y se promedian las calzadas cada 25 m.
3. **Recorte al municipio.** Se conserva solo el tramo continuo mas largo dentro
   del limite administrativo de Santo Domingo Este.

---

## Dos hallazgos del levantamiento

### La Avenida Espana no esta en la cartografia abierta

De las cuatro, es la unica sin geometria utilizable: solo aparecen dos tramos
residenciales sueltos y fuera del municipio.

**Consecuencia:** la Ruta 1 hay que levantarla recorriendola con la app en modo
tecnico, grabando el track GPS, y exportarlo como `R1.gpx`. Como es la ruta de
levantamiento inicial, encaja en el plan sin mover el cronograma — pero es una
salida de campo que hay que agendar y no estaba prevista.

### La Avenida Ecologica se sale de Santo Domingo Este

El trazado completo mide 25.61 km, pero **el 30% queda fuera del municipio**: la
avenida continua hacia el este hacia Boca Chica y San Antonio de Guerra. La
evaluacion se limita a los **16.30 km dentro de SDE**, que es el alcance que
declara la propuesta.

Esto hay que decirlo en la tesis: la Ruta 4 no es "la Avenida Ecologica
completa" sino su tramo municipal.

---

## El limite municipal y la validacion de reportes

El limite de Santo Domingo Este se tomo de la relacion administrativa de
OpenStreetMap (admin_level 6, 2343 nodos):

```
lat  18.4547 .. 18.5982
lon -69.8979 .. -69.7026
```

La API rechaza reportes fuera de esa caja mas un margen de 550 m, que absorbe el
error del GPS en los bordes (RF-05, coherencia geografica).

**Correccion aplicada:** la caja original cortaba la latitud en 18.58, dejando
fuera los **2 km mas al norte del municipio**. Un ciudadano que reportara ahi
recibia un error de validacion. Hay tres pruebas automatizadas que cubren los
bordes norte y este, y una que confirma que el tramo de la Ecologica fuera de SDE
se sigue rechazando.

La caja es una aproximacion rectangular y el municipio no es un rectangulo, asi
que acepta algo de territorio vecino. Apretarlo requeriria validar contra el
poligono con `ST_Contains`, a cambio de una consulta a la base en cada reporte.
Para el alcance de la tesis la caja es suficiente.

---

## Lo que falta

| Pendiente | Por que |
|---|---|
| Levantar `R1.gpx` recorriendo la Avenida Espana | No existe en la cartografia abierta |
| Verificar en campo limites, sentido y longitud de R2, R3 y R4 | OSM es referencia, no verdad de campo |
| Definir puntos de inicio y fin exactos de cada recorrido | El protocolo de campo los necesita |
| Documentar cualquier sustitucion por seguridad o accesibilidad | Lo exige la nota metodologica de la propuesta |

Recordatorio: ninguna sustitucion puede usar la **Ruta 4** para entrenar o
ajustar el modelo.
