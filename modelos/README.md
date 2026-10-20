# Modelos de deteccion

Los pesos del modelo (`.pt`) **no se versionan en Git**: son binarios grandes que
cambian en cada entrenamiento.

- Nombre esperado por el worker: `baches-yolo.pt` (configurable con `YOLO_MODELO_PATH`).
- El servicio `worker-ia` monta esta carpeta en `/app/models` en solo lectura.
- Punto de partida sugerido: fine-tuning de un YOLO sobre **RDD2022**
  (referencia [3] de la propuesta), ajustado luego con las rutas 1 a 3.
- La **ruta 4 (Av. Ecologica) no se usa nunca** para entrenar ni ajustar: es la
  prueba final no vista.

Si no hay modelo presente, `app/services/vision.py` devuelve cero detecciones y
el reporte pasa igual a revision humana: el sistema completo es probable sin
pesos entrenados.

Registra cada version entrenada en `docs/REGISTRO-MODELOS.md` con fecha, datos
usados, hiperparametros y metricas por ruta.
