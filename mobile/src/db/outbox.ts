/**
 * RF-07 + RF-08: borradores locales y cola de sincronizacion.
 *
 * Se usa SQLite y no AsyncStorage porque la cola necesita transacciones y
 * estados por fila: con una sola clave JSON, un cierre de la app a medio
 * camino puede perder o duplicar reportes.
 *
 * La `idempotency_key` se genera AQUI, al crear el borrador, no al enviarlo:
 * asi un reintento tras una red caida reusa la misma clave y el backend
 * devuelve el reporte original en lugar de crear otro.
 */
import * as SQLite from 'expo-sqlite';
import * as Crypto from 'expo-crypto';

export type EstadoBorrador = 'pendiente' | 'enviando' | 'enviado' | 'error';

export type Borrador = {
  id: string;
  idempotency_key: string;
  foto_uri: string;
  lat: number;
  lon: number;
  precision_gps_m: number | null;
  descripcion: string | null;
  capturado_en: string;
  estado: EstadoBorrador;
  intentos: number;
  ultimo_error: string | null;
  reporte_id: string | null;
};

let bd: SQLite.SQLiteDatabase | null = null;

export async function abrir(): Promise<SQLite.SQLiteDatabase> {
  if (bd) return bd;
  bd = await SQLite.openDatabaseAsync('baches.db');
  await bd.execAsync(`
    PRAGMA journal_mode = WAL;
    CREATE TABLE IF NOT EXISTS borradores (
      id               TEXT PRIMARY KEY NOT NULL,
      idempotency_key  TEXT NOT NULL UNIQUE,
      foto_uri         TEXT NOT NULL,
      lat              REAL NOT NULL,
      lon              REAL NOT NULL,
      precision_gps_m  REAL,
      descripcion      TEXT,
      capturado_en     TEXT NOT NULL,
      estado           TEXT NOT NULL DEFAULT 'pendiente',
      intentos         INTEGER NOT NULL DEFAULT 0,
      ultimo_error     TEXT,
      reporte_id       TEXT
    );
    CREATE INDEX IF NOT EXISTS ix_borradores_estado ON borradores (estado);
  `);
  return bd;
}

export async function crearBorrador(datos: {
  foto_uri: string;
  lat: number;
  lon: number;
  precision_gps_m: number | null;
  descripcion: string | null;
}): Promise<Borrador> {
  const db = await abrir();
  const id = Crypto.randomUUID();
  const clave = Crypto.randomUUID();
  const capturado = new Date().toISOString();

  await db.runAsync(
    `INSERT INTO borradores
       (id, idempotency_key, foto_uri, lat, lon, precision_gps_m, descripcion, capturado_en)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    id,
    clave,
    datos.foto_uri,
    datos.lat,
    datos.lon,
    datos.precision_gps_m,
    datos.descripcion,
    capturado,
  );

  return {
    id,
    idempotency_key: clave,
    capturado_en: capturado,
    estado: 'pendiente',
    intentos: 0,
    ultimo_error: null,
    reporte_id: null,
    ...datos,
  };
}

export async function pendientes(): Promise<Borrador[]> {
  const db = await abrir();
  return db.getAllAsync<Borrador>(
    `SELECT * FROM borradores WHERE estado IN ('pendiente', 'error') ORDER BY capturado_en`,
  );
}

export async function todos(): Promise<Borrador[]> {
  const db = await abrir();
  return db.getAllAsync<Borrador>(`SELECT * FROM borradores ORDER BY capturado_en DESC`);
}

export async function contarPendientes(): Promise<number> {
  const db = await abrir();
  const fila = await db.getFirstAsync<{ n: number }>(
    `SELECT COUNT(*) AS n FROM borradores WHERE estado IN ('pendiente', 'error')`,
  );
  return fila?.n ?? 0;
}

export async function marcar(
  id: string,
  estado: EstadoBorrador,
  extra?: { error?: string | null; reporte_id?: string | null },
) {
  const db = await abrir();
  await db.runAsync(
    `UPDATE borradores
        SET estado = ?,
            ultimo_error = ?,
            reporte_id = COALESCE(?, reporte_id),
            intentos = intentos + CASE WHEN ? = 'error' THEN 1 ELSE 0 END
      WHERE id = ?`,
    estado,
    extra?.error ?? null,
    extra?.reporte_id ?? null,
    estado,
    id,
  );
}

export async function eliminar(id: string) {
  const db = await abrir();
  await db.runAsync(`DELETE FROM borradores WHERE id = ?`, id);
}

/** Limpia los enviados para que la base del telefono no crezca sin control. */
export async function limpiarEnviados() {
  const db = await abrir();
  await db.runAsync(`DELETE FROM borradores WHERE estado = 'enviado'`);
}
