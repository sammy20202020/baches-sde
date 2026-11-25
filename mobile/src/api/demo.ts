/**
 * Modo demostracion: la app funciona sola, sin backend.
 *
 * Reemplaza el adaptador de axios por uno que responde desde memoria, asi que
 * ninguna pantalla cambia: siguen haciendo sus mismas peticiones y reciben la
 * misma forma de datos. Sirve para enseñar el prototipo sin levantar Docker ni
 * depender de la red.
 *
 * Los baches de ejemplo estan sobre las coordenadas reales de las rutas de
 * evaluacion, para que el mapa se vea como se vera en campo.
 */
import type { AxiosAdapter, AxiosRequestConfig, AxiosResponse } from 'axios';

import type { Reporte, Severidad, Usuario } from './tipos';

export const USUARIO_DEMO: Usuario = {
  id: 'demo-0000-0000-0000-000000000001',
  nombre: 'Usuario Demostracion',
  email: 'demo@baches.example.com',
  rol: 'ciudadano',
  email_verificado: true,
};

type PuntoDemo = { lat: number; lon: number; sev: Severidad; via: string; veces: number };

/** Puntos sobre los corredores reales de evaluacion (ver docs/RUTAS.md). */
const BACHES: PuntoDemo[] = [
  { lat: 18.509742, lon: -69.875646, sev: 'grave', via: 'Av. San Vicente de Paul', veces: 4 },
  { lat: 18.509878, lon: -69.864797, sev: 'moderada', via: 'Av. San Vicente de Paul', veces: 1 },
  { lat: 18.507566, lon: -69.858998, sev: 'leve', via: 'Av. San Vicente de Paul', veces: 1 },
  { lat: 18.503584, lon: -69.855312, sev: 'grave', via: 'Av. San Vicente de Paul', veces: 3 },
  { lat: 18.499337, lon: -69.852592, sev: 'moderada', via: 'Av. San Vicente de Paul', veces: 2 },
  { lat: 18.49384, lon: -69.851057, sev: 'leve', via: 'Av. San Vicente de Paul', veces: 1 },
  { lat: 18.545448, lon: -69.897766, sev: 'grave', via: 'Av. Charles de Gaulle', veces: 5 },
  { lat: 18.546767, lon: -69.879751, sev: 'moderada', via: 'Av. Charles de Gaulle', veces: 2 },
  { lat: 18.543629, lon: -69.863682, sev: 'grave', via: 'Av. Charles de Gaulle', veces: 3 },
  { lat: 18.534908, lon: -69.847337, sev: 'leve', via: 'Av. Charles de Gaulle', veces: 1 },
  { lat: 18.526736, lon: -69.839574, sev: 'moderada', via: 'Av. Charles de Gaulle', veces: 2 },
  { lat: 18.50949, lon: -69.829483, sev: 'grave', via: 'Av. Charles de Gaulle', veces: 4 },
  { lat: 18.484629, lon: -69.844009, sev: 'moderada', via: 'Av. Ecologica', veces: 1 },
  { lat: 18.483854, lon: -69.832244, sev: 'leve', via: 'Av. Ecologica', veces: 1 },
  { lat: 18.484166, lon: -69.816172, sev: 'grave', via: 'Av. Ecologica', veces: 2 },
  { lat: 18.482951, lon: -69.797613, sev: 'moderada', via: 'Av. Ecologica', veces: 1 },
  { lat: 18.48345, lon: -69.771858, sev: 'leve', via: 'Av. Ecologica', veces: 1 },
  { lat: 18.484104, lon: -69.753215, sev: 'grave', via: 'Av. Ecologica', veces: 3 },
];

const PESO: Record<Severidad, number> = { leve: 0.3, moderada: 0.65, grave: 1.0 };

function diasAtras(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString();
}

/** Misma formula que services/priority.py, para que el numero sea coherente. */
function prioridad(sev: Severidad, veces: number): number {
  const f = PESO[sev] * 0.4 + (Math.min(veces, 5) / 5) * 0.25 + 1.0 * 0.2 + 0.75 * 0.15;
  return Math.round(f * 100 * 100) / 100;
}

/** Los reportes del usuario demo, en varios estados para enseñar el ciclo. */
let misReportes: Reporte[] = [
  {
    id: 'demo-rep-01',
    estado: 'validado',
    origen: 'ciudadano',
    descripcion: 'Bache profundo en el carril derecho, frente al colmado',
    lat: 18.509742,
    lon: -69.875646,
    precision_gps_m: 6.2,
    severidad_ia: 'grave',
    severidad_validada: 'grave',
    prioridad: prioridad('grave', 4),
    veces_reportado: 4,
    creado_en: diasAtras(12),
    publicado_en: diasAtras(10),
    requiere_correccion_gps: false,
  },
  {
    id: 'demo-rep-02',
    estado: 'en_revision',
    origen: 'ciudadano',
    descripcion: 'Hundimiento despues del semaforo',
    lat: 18.534908,
    lon: -69.847337,
    precision_gps_m: 9.8,
    severidad_ia: 'moderada',
    severidad_validada: null,
    prioridad: null,
    veces_reportado: 1,
    creado_en: diasAtras(3),
    publicado_en: null,
    requiere_correccion_gps: false,
  },
  {
    id: 'demo-rep-03',
    estado: 'recibido',
    origen: 'ciudadano',
    descripcion: 'Varios baches seguidos cerca de la parada',
    lat: 18.484166,
    lon: -69.816172,
    precision_gps_m: 78,
    severidad_ia: null,
    severidad_validada: null,
    prioridad: null,
    veces_reportado: 1,
    creado_en: diasAtras(1),
    publicado_en: null,
    requiere_correccion_gps: true,
  },
];

const ok = (config: AxiosRequestConfig, data: unknown, status = 200): AxiosResponse => ({
  data,
  status,
  statusText: status === 201 ? 'Created' : 'OK',
  headers: {},
  config: config as AxiosResponse['config'],
});

/** Latencia simulada: sin ella la interfaz parece rota, todo aparece de golpe. */
const esperar = (ms = 320) => new Promise((r) => setTimeout(r, ms));

export const adaptadorDemo: AxiosAdapter = async (config) => {
  await esperar();

  const url = (config.url ?? '').replace(/^\/+/, '');
  const metodo = (config.method ?? 'get').toLowerCase();

  if (url.startsWith('auth/login')) {
    return ok(config, {
      access_token: 'demo.access.token',
      refresh_token: 'demo.refresh.token',
      token_type: 'bearer',
      expires_in: 900,
    });
  }
  if (url.startsWith('auth/registro')) return ok(config, USUARIO_DEMO, 201);
  if (url.startsWith('auth/refresh')) {
    return ok(config, {
      access_token: 'demo.access.token',
      refresh_token: 'demo.refresh.token',
      token_type: 'bearer',
      expires_in: 900,
    });
  }
  if (url.startsWith('auth/yo')) return ok(config, USUARIO_DEMO);
  if (url.startsWith('auth/logout') || url.startsWith('auth/dispositivo')) {
    return ok(config, {}, 204);
  }

  if (url.startsWith('mapa/resumen')) {
    const por: Record<string, number> = { grave: 0, moderada: 0, leve: 0 };
    BACHES.forEach((b) => (por[b.sev] += 1));
    return ok(config, { publicados: BACHES.length, por_severidad: por });
  }

  if (url.startsWith('mapa/publico')) {
    const sev = (config.params as { severidad?: Severidad } | undefined)?.severidad;
    const lista = sev ? BACHES.filter((b) => b.sev === sev) : BACHES;
    return ok(config, {
      type: 'FeatureCollection',
      features: lista.map((b, i) => ({
        type: 'Feature',
        geometry: { type: 'Point', coordinates: [b.lon, b.lat] },
        properties: {
          id: `demo-pt-${i}`,
          estado: 'validado',
          severidad: b.sev,
          prioridad: prioridad(b.sev, b.veces),
          veces_reportado: b.veces,
          fecha: diasAtras(5 + i),
          publicado_en: diasAtras(4 + i),
        },
      })),
    });
  }

  if (url.startsWith('reportes/mios')) return ok(config, misReportes);

  if (url === 'reportes' && metodo === 'post') {
    const form = config.data as FormData | undefined;
    const leer = (k: string) => {
      const v = (form as unknown as { _parts?: [string, unknown][] })?._parts?.find(
        (p) => p[0] === k,
      )?.[1];
      return v == null ? null : String(v);
    };
    const nuevo: Reporte = {
      id: `demo-rep-${Date.now()}`,
      estado: 'recibido',
      origen: 'ciudadano',
      descripcion: leer('descripcion'),
      lat: Number(leer('lat') ?? 18.4886),
      lon: Number(leer('lon') ?? -69.857),
      precision_gps_m: leer('precision_gps_m') ? Number(leer('precision_gps_m')) : null,
      severidad_ia: null,
      severidad_validada: null,
      prioridad: null,
      veces_reportado: 1,
      creado_en: new Date().toISOString(),
      publicado_en: null,
      requiere_correccion_gps: false,
    };
    misReportes = [nuevo, ...misReportes];
    return ok(config, nuevo, 201);
  }

  // Cualquier otra ruta: respuesta vacia en vez de un error que rompa la pantalla.
  return ok(config, {});
};
