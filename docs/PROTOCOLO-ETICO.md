# Protocolo etico y de tratamiento de datos

**Proyecto:** Sistema movil inteligente para la deteccion, geolocalizacion,
reporte y priorizacion de baches en Santo Domingo Este

**Equipo:** David de la Rosa (2024-0145) · Samuel Roa (2024-0102) ·
Anyelys Torres Castillo (2024-0110)

**Version:** 1.0 — borrador para revision del asesor
**Entregable:** 0.8 del Sprint 0

> **Este documento debe estar revisado y firmado antes de grabar el primer
> video en la via publica.** Ninguna actividad de campo comienza sin el.

---

## 1. Objeto

Establecer como se recogen, tratan, protegen y eliminan los datos personales en
este proyecto, y bajo que condiciones se graba la via publica.

El proyecto presenta una particularidad que obliga a este documento: **recoge
dos clases de datos muy distintas**.

1. **Datos de personas que aceptan participar.** El ciudadano que crea una
   cuenta y envia un reporte da su consentimiento de forma explicita.
2. **Datos de terceros que nunca aceptaron nada.** Al grabar un recorrido en
   video aparecen peatones, conductores, vehiculos con placa visible y fachadas
   de viviendas. Estas personas no consintieron y no se les puede pedir permiso.

La segunda clase es la que exige mayor cuidado, y es el motivo principal de este
protocolo.

---

## 2. Marco de referencia

| Fuente | Que aporta |
|---|---|
| **Ley No. 172-13** sobre Proteccion de Datos de Caracter Personal (Republica Dominicana) | Marco legal aplicable: consentimiento, finalidad, calidad del dato y derechos del titular |
| **Constitucion de la Republica Dominicana** | Derecho a la intimidad y al honor personal |
| Reglamento interno de investigacion de la universidad | Requisitos academicos de etica en investigacion |
| **OWASP MASVS / ASVS** | Controles tecnicos de proteccion, ya citados en la propuesta |

> **Nota para el asesor:** los articulos especificos de la Ley 172-13 y del
> reglamento universitario que aplican a este caso deben confirmarse en la
> revision. El equipo no cuenta con asesoria legal y no los cita de memoria.

---

## 3. Datos que se recogen

### 3.1 Del usuario registrado

| Dato | Para que | Se publica |
|---|---|---|
| Nombre | Identificar al autor ante el revisor | **No** |
| Correo electronico | Autenticacion y aviso de cambios de estado | **No** |
| Contrasena | Autenticacion | **Nunca**, se guarda cifrada con Argon2id |
| Fecha de aceptacion de la politica | Evidencia del consentimiento | No |
| Token del dispositivo | Enviar notificaciones push | No |

### 3.2 Del reporte

| Dato | Para que | Se publica |
|---|---|---|
| Fotografia del bache | Evidencia y analisis automatico | **No.** Solo el revisor la ve |
| Coordenadas GPS | Ubicar el dano | **Si**, sin asociarlas a la persona |
| Precision del GPS | Permitir correccion del revisor | No |
| Descripcion escrita | Contexto para el revisor | **Si**, si el revisor la valida |
| Fecha y hora | Trazabilidad y deduplicacion | **Si**, solo la fecha |

### 3.3 Del recorrido tecnico en video

| Dato | Para que | Se publica |
|---|---|---|
| Video del recorrido | Extraer fotogramas para analisis | **Nunca** |
| Muestras de GPS | Georreferenciar los fotogramas | No |
| Identidad del operador | Trazabilidad de la captura | No |
| **Rostros y placas captados incidentalmente** | **Ninguna. Son un subproducto no deseado** | **Nunca** |

### 3.4 Datos que NO se recogen

Por principio de minimizacion, el sistema **no pide ni guarda**: cedula,
telefono, direccion, fecha de nacimiento, sexo, datos biometricos, ni ningun
dato sensible.

Lo que no se recoge no se puede filtrar.

---

## 4. Finalidad

Los datos se tratan **unicamente** para:

1. Autenticar al usuario y protegerle su cuenta.
2. Registrar, analizar, validar y priorizar danos en el pavimento.
3. Informar al ciudadano del estado de su reporte.
4. Producir las metricas de evaluacion de la investigacion.

**No se usan para ningun otro fin.** En particular, no se perfila a usuarios, no
se comparten datos con terceros, no se usan con fines comerciales ni
publicitarios, y no se entregan a ninguna autoridad salvo requerimiento legal
formal.

---

## 5. Consentimiento

### 5.1 Como se obtiene

El consentimiento se solicita **al crear la cuenta**, mediante una casilla que
el usuario debe marcar activamente. No viene marcada por defecto, y el registro
no avanza sin ella. El sistema guarda la fecha y hora de aceptacion.

### 5.2 Texto que debe mostrar la aplicacion

> **Politica de privacidad — Baches SDE**
>
> Al crear tu cuenta aceptas que guardemos tu nombre y tu correo para
> identificarte y avisarte del estado de tus reportes.
>
> **Lo que se hace publico:** la ubicacion del bache, su severidad y la fecha.
> Nada mas.
>
> **Lo que nunca se hace publico:** tu nombre, tu correo y tu fotografia. La
> foto solo la ve el personal autorizado que revisa el reporte.
>
> **Tu ubicacion** se lee una sola vez, cuando tu decides reportar. La
> aplicacion no te sigue ni registra por donde andas.
>
> **Puedes pedir** que te mostremos tus datos, que los corrijamos o que
> borremos tu cuenta y tus reportes, escribiendo a <correo del proyecto>.
> Respondemos en un plazo maximo de 15 dias habiles.
>
> Este sistema es un prototipo de investigacion academica. No sustituye los
> canales oficiales del ayuntamiento ni garantiza la reparacion del dano.

La ultima frase es importante: **no se puede dar a entender que reportar un
bache implica que lo van a arreglar.** Seria una expectativa falsa creada por un
trabajo academico.

### 5.3 Consentimiento en la prueba de usabilidad

Los participantes de la prueba de usabilidad del Sprint 12 firman un
consentimiento informado aparte, que indica: objetivo del estudio, duracion,
que se registra, que la participacion es voluntaria, que pueden retirarse en
cualquier momento sin consecuencia, y que los resultados se reportan de forma
agregada y anonima.

---

## 6. Rostros, placas y terceros en el video

Esta es la seccion mas delicada del protocolo.

### 6.1 Principio

Las personas que aparecen incidentalmente en un recorrido **no son sujetos de
la investigacion**. Su imagen es un subproducto tecnico, no un dato que
interese. Se trata como contaminacion a eliminar, no como informacion a
conservar.

### 6.2 Reglas

1. **El video original nunca es publico.** Se guarda cifrado, con acceso
   restringido a revisores autorizados mediante enlaces que caducan en minutos.
2. **Se graba la via, no a las personas.** La camara apunta al pavimento. No se
   graba deliberadamente a peatones, viviendas ni interiores de vehiculos.
3. **Difuminado obligatorio antes de cualquier salida del sistema.** Todo
   fotograma que se use en la tesis, una presentacion, un articulo o una demo
   lleva rostros y placas difuminados. Sin excepcion.
4. **Si alguien pide no ser grabado**, se detiene la grabacion y se elimina el
   tramo correspondiente.
5. **No se graba en zonas sensibles:** escuelas en horario de entrada o salida,
   centros de salud, estaciones policiales o militares, ni propiedad privada.
6. **No se usa reconocimiento facial ni lectura de placas**, ni siquiera como
   prueba. El modelo detecta danos en el pavimento y nada mas.

### 6.3 Verificacion

Antes de usar cualquier fotograma fuera del sistema, **dos integrantes del
equipo** revisan que el difuminado se aplico. Queda registrado quien reviso y
cuando.

---

## 7. Quien accede a que

| Rol | Puede ver |
|---|---|
| **Ciudadano** | Solo sus propios reportes y el mapa publico anonimizado |
| **Operador tecnico** | Sus propios recorridos. No accede a datos de ciudadanos |
| **Revisor** | Reportes pendientes con su evidencia, para validarlos. No ve contrasenas |
| **Administrador** | Gestion de usuarios, roles y auditoria. No ve contrasenas |
| **Publico sin cuenta** | Solo el mapa de reportes validados, sin dato personal alguno |

Toda consulta de evidencia, validacion, fusion y exportacion **queda registrada
en la auditoria** con usuario, fecha y motivo.

---

## 8. Retencion y eliminacion

| Dato | Se conserva | Despues |
|---|---|---|
| Video original del recorrido | Hasta terminar la evaluacion de su ruta | **Se elimina de forma permanente** |
| Fotogramas sin deteccion validada | 90 dias | Se eliminan |
| Fotogramas con deteccion validada | Duracion del proyecto | Se conservan difuminados, sin GPS asociado a persona |
| Fotografia de un reporte ciudadano | Mientras el reporte este activo | Se elimina al eliminarse el reporte |
| Datos de cuenta | Mientras la cuenta exista | Se eliminan a los 30 dias de la solicitud de baja |
| Registro de auditoria | Duracion del proyecto mas un ano | Se conserva para trazabilidad academica |
| Reportes publicados en el mapa | Indefinido | Quedan anonimos: no hay forma de volver a la persona |

Al cerrar el proyecto se elimina toda la evidencia original y se conserva
unicamente el conjunto de datos anonimizado que sustenta los resultados.

---

## 9. Derechos del titular

Cualquier persona registrada puede pedir:

| Derecho | Que significa |
|---|---|
| **Acceso** | Que le digamos que datos suyos tenemos |
| **Rectificacion** | Que corrijamos un dato equivocado |
| **Supresion** | Que borremos su cuenta y sus reportes |
| **Oposicion** | Que dejemos de tratar sus datos |

**Como se ejerce:** escribiendo al correo del proyecto. El equipo responde en un
maximo de **15 dias habiles**, y deja constancia de la solicitud y la respuesta.

**Limite tecnico que hay que decir con honestidad:** un reporte ya validado y
publicado en el mapa queda sin vinculo con su autor. Se puede borrar la cuenta y
el vinculo, pero el punto geografico anonimo del bache permanece como parte del
conjunto de datos de la investigacion. Esto se le explica al usuario al momento
de la solicitud.

---

## 10. Seguridad

Los controles tecnicos estan detallados en [ARQUITECTURA.md](ARQUITECTURA.md)
seccion 6. Lo relevante para este protocolo:

- Contrasenas con Argon2id. El equipo **no puede** leer la contrasena de nadie.
- Todo el trafico cifrado con HTTPS en el despliegue definitivo.
- El mapa publico se construye con una consulta que **nunca toca la tabla de
  usuarios**: el dato personal no entra al camino, no es que se oculte al final.
- Evidencia en almacenamiento separado, con enlaces temporales.
- Copias de seguridad cifradas.

**Deuda tecnica declarada:** durante el desarrollo en red local la aplicacion
acepta trafico HTTP sin cifrar. Esto **debe desactivarse** antes de cualquier uso
con datos reales de ciudadanos fuera del equipo.

---

## 11. Publicacion de resultados

- Ningun dato personal aparece en la tesis, presentaciones o anexos.
- Las imagenes llevan rostros y placas difuminados.
- Las metricas se reportan de forma agregada.
- El conjunto de datos que se publique, si se publica, va anonimizado.
- No se identifica a ningun ciudadano por su reporte, ni siquiera de forma
  indirecta mediante la combinacion de fecha y ubicacion exacta.

---

## 12. Riesgos eticos

| Riesgo | Como se trata |
|---|---|
| Identificar a una persona por su reporte | El mapa no expone autor; la fecha se publica sin hora |
| Grabar a un tercero sin consentimiento | Camara al pavimento, difuminado obligatorio, video nunca publico |
| Crear expectativa falsa de reparacion | Se declara explicitamente que es un prototipo academico |
| Senalar negativamente un sector | Se publica el dano, no juicios sobre la zona ni sus habitantes |
| Un falso positivo de la IA como informacion publica | Validacion humana obligatoria antes de publicar |
| Accidente durante un recorrido | El operador no manipula el telefono conduciendo |
| Filtracion de evidencia | Acceso por rol, enlaces temporales, auditoria de accesos |

---

## 13. Incidentes

Si ocurre una filtracion o acceso no autorizado:

1. Cortar el acceso y preservar los registros.
2. Avisar al asesor en un plazo maximo de **24 horas**.
3. Determinar que datos y de cuantas personas se vieron afectados.
4. Notificar a las personas afectadas si su dato personal quedo expuesto.
5. Documentar causa, impacto y correccion en el registro de incidentes.

---

## 14. Responsables

| Funcion | Responsable |
|---|---|
| Custodia de la evidencia y copias de seguridad | *(asignar)* |
| Verificacion del difuminado antes de publicar | *(dos integrantes)* |
| Atencion a solicitudes de los titulares | *(asignar)* |
| Seguridad vial durante los recorridos | *(asignar — no puede ser quien conduce)* |

**Correo de contacto del proyecto:** *(pendiente de crear)*

---

## 15. Aprobacion

Este protocolo entra en vigor cuando esta firmado. **Hasta entonces no se graba
ningun video en la via publica.**

| | Nombre | Firma | Fecha |
|---|---|---|---|
| Integrante | David de la Rosa | | |
| Integrante | Samuel Roa | | |
| Integrante | Anyelys Torres Castillo | | |
| Asesor | | | |

---

## Anexo A — Pendientes antes de firmar

1. Crear el **correo de contacto del proyecto** para las solicitudes.
2. **Asignar los responsables** de la seccion 14.
3. Confirmar con el asesor los **articulos aplicables** de la Ley 172-13 y del
   reglamento de investigacion de la universidad.
4. Redactar el **formato de consentimiento informado** de la prueba de
   usabilidad (Sprint 12).
5. Incorporar a la aplicacion la **pantalla con el texto completo** de la
   seccion 5.2: hoy la casilla de registro remite a una politica que el usuario
   todavia no puede leer.
