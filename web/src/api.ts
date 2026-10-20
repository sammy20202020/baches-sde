/** Cliente del panel web. Reusa los mismos contratos que la app movil. */
import axios, { AxiosError, type InternalAxiosRequestConfig } from 'axios';

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:8000/api/v1';

const CLAVE_ACCESS = 'baches.access';
const CLAVE_REFRESH = 'baches.refresh';

export const sesion = {
  guardar(access: string, refresh: string) {
    localStorage.setItem(CLAVE_ACCESS, access);
    localStorage.setItem(CLAVE_REFRESH, refresh);
  },
  access: () => localStorage.getItem(CLAVE_ACCESS),
  refresh: () => localStorage.getItem(CLAVE_REFRESH),
  borrar() {
    localStorage.removeItem(CLAVE_ACCESS);
    localStorage.removeItem(CLAVE_REFRESH);
  },
};

export const api = axios.create({ baseURL: API_URL, timeout: 20_000 });

api.interceptors.request.use((config) => {
  const token = sesion.access();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (r) => r,
  async (error: AxiosError) => {
    const original = error.config as InternalAxiosRequestConfig & { _reintentado?: boolean };
    if (error.response?.status === 401 && original && !original._reintentado) {
      original._reintentado = true;
      const refresh = sesion.refresh();
      if (refresh) {
        try {
          const { data } = await axios.post(`${API_URL}/auth/refresh`, { refresh_token: refresh });
          sesion.guardar(data.access_token, data.refresh_token);
          original.headers.Authorization = `Bearer ${data.access_token}`;
          return api.request(original);
        } catch {
          sesion.borrar();
        }
      }
    }
    return Promise.reject(error);
  },
);

export function mensajeDeError(error: unknown): string {
  if (axios.isAxiosError(error)) {
    if (!error.response) return 'Sin conexion con la API';
    const d = error.response.data?.detail;
    if (typeof d === 'string') return d;
    if (Array.isArray(d)) return d.map((x: { msg: string }) => x.msg).join('. ');
    return `Error ${error.response.status}`;
  }
  return 'Error inesperado';
}

export type Severidad = 'leve' | 'moderada' | 'grave';

export type Reporte = {
  id: string;
  estado: string;
  origen: string;
  descripcion: string | null;
  lat: number;
  lon: number;
  precision_gps_m: number | null;
  severidad_ia: Severidad | null;
  confianza_ia: number | null;
  severidad_validada: Severidad | null;
  prioridad: number | null;
  veces_reportado: number;
  creado_en: string;
  publicado_en: string | null;
  requiere_correccion_gps: boolean;
};

export type Candidato = {
  reporte_id: string;
  distancia_m: number;
  dias_diferencia: number;
  hamming_phash: number | null;
  puntaje: number;
};

export type Usuario = { id: string; nombre: string; email: string; rol: string };
