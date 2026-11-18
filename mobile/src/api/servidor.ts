/**
 * Direccion del servidor, configurable desde la app.
 *
 * Un APK autonomo no pasa por Metro, asi que no puede deducir la IP de la
 * computadora: queda fija la que se compilo. En la practica esa IP cambia cada
 * vez que el router reparte direcciones de nuevo, y recompilar un APK de 128 MB
 * por un cambio de IP no es viable en una salida de campo.
 *
 * Orden de precedencia:
 *   1. Lo que el usuario guarde en Ajustes (gana siempre).
 *   2. `extra.apiUrl` de app.json, para apuntar a un servidor desplegado.
 *   3. El host del que se cargo el bundle (desarrollo con Metro).
 *   4. localhost.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';

const CLAVE = 'baches.api_url';
const PUERTO_API = 8000;

let enMemoria: string | null = null;

function porDefecto(): string {
  const configurada = Constants.expoConfig?.extra?.apiUrl as string | undefined;
  if (configurada) return configurada;

  const host = Constants.expoConfig?.hostUri?.split(':')[0];
  if (host) return `http://${host}:${PUERTO_API}/api/v1`;

  return `http://localhost:${PUERTO_API}/api/v1`;
}

/** Normaliza lo que escriba el usuario: "10.0.0.95" -> url completa. */
export function normalizar(entrada: string): string {
  let v = entrada.trim();
  if (!v) return v;
  if (!/^https?:\/\//i.test(v)) v = `http://${v}`;
  v = v.replace(/\/+$/, '');
  if (!/:\d+/.test(v.replace(/^https?:\/\//i, ''))) v = `${v}:${PUERTO_API}`;
  if (!v.endsWith('/api/v1')) v = `${v}/api/v1`;
  return v;
}

export async function cargar(): Promise<string> {
  if (enMemoria) return enMemoria;
  try {
    const guardada = await AsyncStorage.getItem(CLAVE);
    enMemoria = guardada || porDefecto();
  } catch {
    enMemoria = porDefecto();
  }
  return enMemoria;
}

/** Lectura sincrona para el interceptor; `cargar()` la precalienta al arrancar. */
export function actual(): string {
  return enMemoria ?? porDefecto();
}

export async function guardar(url: string): Promise<string> {
  const limpia = normalizar(url);
  await AsyncStorage.setItem(CLAVE, limpia);
  enMemoria = limpia;
  return limpia;
}

export async function restablecer(): Promise<string> {
  await AsyncStorage.removeItem(CLAVE);
  enMemoria = porDefecto();
  return enMemoria;
}

/** Comprueba que haya una API viva en esa direccion antes de guardarla. */
export async function probar(url: string): Promise<{ ok: boolean; detalle: string }> {
  const base = normalizar(url).replace(/\/api\/v1$/, '');
  try {
    const control = new AbortController();
    const corte = setTimeout(() => control.abort(), 6000);
    const r = await fetch(`${base}/salud`, { signal: control.signal });
    clearTimeout(corte);
    if (!r.ok) return { ok: false, detalle: `El servidor respondio ${r.status}` };
    const d = await r.json();
    return d?.estado === 'ok'
      ? { ok: true, detalle: `Conectado. PostGIS ${d.postgis ?? ''}`.trim() }
      : { ok: false, detalle: `Responde pero degradado: ${d?.detalle ?? ''}` };
  } catch {
    return { ok: false, detalle: 'No responde. Revisa la IP y que estes en la misma Wi-Fi.' };
  }
}
