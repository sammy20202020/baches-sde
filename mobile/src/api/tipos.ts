export type Rol = 'ciudadano' | 'operador' | 'revisor' | 'admin';

export type EstadoReporte =
  | 'recibido'
  | 'en_revision'
  | 'validado'
  | 'rechazado'
  | 'programado'
  | 'resuelto'
  | 'fusionado';

export type Severidad = 'leve' | 'moderada' | 'grave';

export type Usuario = {
  id: string;
  nombre: string;
  email: string;
  rol: Rol;
  email_verificado: boolean;
};

export type Reporte = {
  id: string;
  estado: EstadoReporte;
  origen: 'ciudadano' | 'recorrido';
  descripcion: string | null;
  lat: number;
  lon: number;
  precision_gps_m: number | null;
  severidad_ia: Severidad | null;
  severidad_validada: Severidad | null;
  prioridad: number | null;
  veces_reportado: number;
  creado_en: string;
  publicado_en: string | null;
  requiere_correccion_gps: boolean;
};

export type PuntoMapa = {
  type: 'Feature';
  geometry: { type: 'Point'; coordinates: [number, number] };
  properties: {
    id: string;
    estado: EstadoReporte;
    severidad: Severidad | null;
    prioridad: number | null;
    veces_reportado: number;
    fecha: string;
  };
};

export type GeoJson = { type: 'FeatureCollection'; features: PuntoMapa[] };
