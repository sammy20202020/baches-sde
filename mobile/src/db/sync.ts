/**
 * RF-08: sincroniza la cola de borradores con reintentos y espera exponencial.
 *
 * Se ejecuta al abrir la app, al recuperar la red y al pulsar "Sincronizar".
 * Nunca corre dos veces a la vez: un doble envio es exactamente el duplicado
 * que la clave de idempotencia existe para evitar.
 */
import { File } from 'expo-file-system';
import NetInfo from '@react-native-community/netinfo';

import { api, mensajeDeError } from '../api/client';
import { marcar, pendientes, type Borrador } from './outbox';

export type ResultadoSync = { enviados: number; fallidos: number; sinRed?: boolean };

let enCurso = false;

/** Espera exponencial con techo: 2 s, 4 s, 8 s, 16 s, 30 s. */
const esperaMs = (intentos: number) => Math.min(2 ** (intentos + 1) * 1000, 30_000);

async function enviar(borrador: Borrador): Promise<void> {
  // expo-file-system 58 retiro getInfoAsync: ahora se consulta con `File`.
  // Llamar a la funcion vieja lanzaba y el reporte quedaba en error sin decir
  // por que, que es justo lo que no debe pasar con la cola sin conexion.
  const foto = new File(borrador.foto_uri);
  if (!foto.exists) {
    // La foto ya no esta (cache limpiada): no tiene sentido reintentar para siempre.
    await marcar(borrador.id, 'error', { error: 'La foto ya no esta disponible en el telefono' });
    return;
  }

  const formulario = new FormData();
  formulario.append('foto', {
    uri: borrador.foto_uri,
    name: 'bache.jpg',
    type: 'image/jpeg',
  } as unknown as Blob);
  formulario.append('lat', String(borrador.lat));
  formulario.append('lon', String(borrador.lon));
  if (borrador.precision_gps_m != null) {
    formulario.append('precision_gps_m', String(borrador.precision_gps_m));
  }
  if (borrador.descripcion) formulario.append('descripcion', borrador.descripcion);
  formulario.append('capturado_en', borrador.capturado_en);

  const { data } = await api.post('/reportes', formulario, {
    headers: {
      'Content-Type': 'multipart/form-data',
      // La misma clave en cada reintento: el backend devuelve el reporte original.
      'Idempotency-Key': borrador.idempotency_key,
    },
  });

  await marcar(borrador.id, 'enviado', { reporte_id: data.id, error: null });
}

export async function sincronizar(): Promise<ResultadoSync> {
  if (enCurso) return { enviados: 0, fallidos: 0 };

  const red = await NetInfo.fetch();
  if (!red.isConnected) return { enviados: 0, fallidos: 0, sinRed: true };

  enCurso = true;
  let enviados = 0;
  let fallidos = 0;

  try {
    for (const borrador of await pendientes()) {
      if (borrador.estado === 'error' && borrador.intentos > 0) {
        await new Promise((r) => setTimeout(r, esperaMs(borrador.intentos)));
      }
      await marcar(borrador.id, 'enviando');
      try {
        await enviar(borrador);
        enviados += 1;
      } catch (error) {
        await marcar(borrador.id, 'error', { error: mensajeDeError(error) });
        fallidos += 1;
      }
    }
  } finally {
    enCurso = false;
  }

  return { enviados, fallidos };
}

/** Dispara una sincronizacion cada vez que vuelve la conexion. */
export function observarRed(alSincronizar?: (r: ResultadoSync) => void) {
  return NetInfo.addEventListener(async (estado) => {
    if (estado.isConnected) {
      const resultado = await sincronizar();
      if (resultado.enviados > 0 || resultado.fallidos > 0) alSincronizar?.(resultado);
    }
  });
}
