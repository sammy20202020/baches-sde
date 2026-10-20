/**
 * Cliente HTTP. Guarda los tokens en el almacen seguro del sistema operativo
 * (Keychain en iOS, Keystore en Android) y renueva el access token solo (RNF-01).
 */
import axios, { AxiosError, type InternalAxiosRequestConfig } from 'axios';
import Constants from 'expo-constants';
import * as SecureStore from 'expo-secure-store';

/** Puerto donde escucha la API (docker-compose la publica en el 8000). */
const PUERTO_API = 8000;

/**
 * Deduce la URL de la API sin que nadie tenga que editar la IP a mano.
 *
 * Durante el desarrollo, Expo expone en `hostUri` la direccion desde la que el
 * telefono cargo el bundle (p. ej. "10.0.0.77:8081"). Esa es, por definicion,
 * la IP de la computadora alcanzable desde el telefono: en el simulador sale
 * localhost y en un telefono fisico sale la IP de la Wi-Fi. Reusarla evita el
 * error mas comun del equipo, que es olvidar actualizar la IP en app.json.
 *
 * `extra.apiUrl` manda si esta definido, para apuntar a un servidor real.
 */
function resolverApiUrl(): string {
  const configurada = Constants.expoConfig?.extra?.apiUrl as string | undefined;
  if (configurada) return configurada;

  const hostUri = Constants.expoConfig?.hostUri;
  const host = hostUri?.split(':')[0];
  if (host) return `http://${host}:${PUERTO_API}/api/v1`;

  return `http://localhost:${PUERTO_API}/api/v1`;
}

const API_URL = resolverApiUrl();

const CLAVE_ACCESS = 'baches.access_token';
const CLAVE_REFRESH = 'baches.refresh_token';

export const tokens = {
  async guardar(access: string, refresh: string) {
    await SecureStore.setItemAsync(CLAVE_ACCESS, access);
    await SecureStore.setItemAsync(CLAVE_REFRESH, refresh);
  },
  leerAccess: () => SecureStore.getItemAsync(CLAVE_ACCESS),
  leerRefresh: () => SecureStore.getItemAsync(CLAVE_REFRESH),
  async borrar() {
    await SecureStore.deleteItemAsync(CLAVE_ACCESS);
    await SecureStore.deleteItemAsync(CLAVE_REFRESH);
  },
};

export const api = axios.create({ baseURL: API_URL, timeout: 20_000 });

api.interceptors.request.use(async (config) => {
  const access = await tokens.leerAccess();
  if (access) config.headers.Authorization = `Bearer ${access}`;
  return config;
});

// Una sola renovacion en vuelo: varias pantallas pueden recibir 401 a la vez.
let renovacionEnCurso: Promise<string | null> | null = null;

async function renovar(): Promise<string | null> {
  const refresh = await tokens.leerRefresh();
  if (!refresh) return null;
  try {
    const { data } = await axios.post(`${API_URL}/auth/refresh`, { refresh_token: refresh });
    await tokens.guardar(data.access_token, data.refresh_token);
    return data.access_token as string;
  } catch {
    await tokens.borrar();
    return null;
  }
}

api.interceptors.response.use(
  (r) => r,
  async (error: AxiosError) => {
    const original = error.config as InternalAxiosRequestConfig & { _reintentado?: boolean };
    const esRefresh = original?.url?.includes('/auth/refresh');

    if (error.response?.status === 401 && original && !original._reintentado && !esRefresh) {
      original._reintentado = true;
      renovacionEnCurso ??= renovar().finally(() => {
        renovacionEnCurso = null;
      });
      const nuevo = await renovacionEnCurso;
      if (nuevo) {
        original.headers.Authorization = `Bearer ${nuevo}`;
        return api.request(original);
      }
    }
    return Promise.reject(error);
  },
);

/** Traduce los errores de la API a algo legible para el usuario. */
export function mensajeDeError(error: unknown): string {
  if (axios.isAxiosError(error)) {
    if (!error.response) return 'Sin conexion con el servidor. Tu reporte queda guardado en el telefono.';
    const detalle = error.response.data?.detail;
    if (typeof detalle === 'string') return detalle;
    if (Array.isArray(detalle)) return detalle.map((d: { msg: string }) => d.msg).join('. ');
    return `Error ${error.response.status}`;
  }
  return 'Ocurrio un error inesperado';
}

export { API_URL };
