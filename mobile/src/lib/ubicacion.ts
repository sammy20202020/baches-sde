/**
 * Captura de ubicacion. RNF-02: se pide en el momento de uso y NO hay
 * seguimiento continuo del ciudadano; solo una lectura puntual al reportar.
 */
import * as Location from 'expo-location';

export type Posicion = { lat: number; lon: number; precision_m: number | null };

export class PermisoUbicacionDenegado extends Error {
  constructor() {
    super('Sin permiso de ubicacion');
    this.name = 'PermisoUbicacionDenegado';
  }
}

export async function posicionActual(): Promise<Posicion> {
  const { status } = await Location.requestForegroundPermissionsAsync();
  if (status !== 'granted') throw new PermisoUbicacionDenegado();

  const p = await Location.getCurrentPositionAsync({
    accuracy: Location.Accuracy.High,
  });
  return {
    lat: p.coords.latitude,
    lon: p.coords.longitude,
    precision_m: p.coords.accuracy ?? null,
  };
}

/** Centro aproximado de Santo Domingo Este, para el estado inicial del mapa. */
export const CENTRO_SDE = { latitude: 18.4886, longitude: -69.857 } as const;

/** Umbral sobre el cual se advierte al usuario que confirme el punto en el mapa. */
export const PRECISION_DUDOSA_M = 50;
