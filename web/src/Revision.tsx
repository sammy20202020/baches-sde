/**
 * RF-17: unica puerta por la que un reporte llega al mapa publico.
 * RF-16: muestra los duplicados candidatos para que el revisor decida la fusion.
 */
import { useCallback, useEffect, useState } from 'react';
import { MapContainer, Marker, TileLayer, useMapEvents } from 'react-leaflet';
import type { LatLng } from 'leaflet';

import { api, mensajeDeError, type Candidato, type Reporte, type Severidad } from './api';

const COLOR_SEVERIDAD: Record<string, string> = {
  leve: 'var(--leve)',
  moderada: 'var(--moderada)',
  grave: 'var(--grave)',
};

function SelectorPunto({ onElegir }: { onElegir: (p: LatLng) => void }) {
  useMapEvents({ click: (ev) => onElegir(ev.latlng) });
  return null;
}

export default function Revision() {
  const [pendientes, setPendientes] = useState<Reporte[]>([]);
  const [activo, setActivo] = useState<Reporte | null>(null);
  const [candidatos, setCandidatos] = useState<Candidato[]>([]);
  const [evidencias, setEvidencias] = useState<{ id: string; tipo: string; url: string }[]>([]);
  const [severidad, setSeveridad] = useState<Severidad>('moderada');
  const [motivo, setMotivo] = useState('');
  const [punto, setPunto] = useState<{ lat: number; lon: number } | null>(null);
  const [mensaje, setMensaje] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [ocupado, setOcupado] = useState(false);

  const cargarPendientes = useCallback(async () => {
    try {
      const { data } = await api.get<Reporte[]>('/revision/pendientes');
      setPendientes(data);
      setError(null);
    } catch (e) {
      setError(mensajeDeError(e));
    }
  }, []);

  useEffect(() => {
    cargarPendientes();
  }, [cargarPendientes]);

  async function abrir(reporte: Reporte) {
    setActivo(reporte);
    setSeveridad(reporte.severidad_ia ?? 'moderada');
    setPunto({ lat: reporte.lat, lon: reporte.lon });
    setMotivo('');
    setMensaje(null);
    setCandidatos([]);
    setEvidencias([]);
    try {
      const [dup, ev] = await Promise.all([
        api.get<{ candidatos: Candidato[] }>(`/revision/${reporte.id}/duplicados`),
        api.get<{ evidencias: typeof evidencias }>(`/reportes/${reporte.id}/evidencia`),
      ]);
      setCandidatos(dup.data.candidatos);
      setEvidencias(ev.data.evidencias);
    } catch (e) {
      setError(mensajeDeError(e));
    }
  }

  async function decidir(decision: 'validar' | 'rechazar' | 'fusionar', fusionarEn?: string) {
    if (!activo) return;
    if (motivo.trim().length < 5) {
      setError('El motivo es obligatorio: queda en la auditoria junto a tu usuario y la fecha.');
      return;
    }
    setOcupado(true);
    setError(null);
    try {
      const movido =
        punto && (punto.lat !== activo.lat || punto.lon !== activo.lon)
          ? { punto_corregido: { lat: punto.lat, lon: punto.lon } }
          : {};

      const { data } = await api.post(`/revision/${activo.id}`, {
        decision,
        motivo: motivo.trim(),
        ...(decision === 'validar' ? { severidad_validada: severidad } : {}),
        ...(decision === 'fusionar' ? { fusionar_en_id: fusionarEn } : {}),
        ...movido,
      });

      setMensaje(
        decision === 'validar'
          ? `Validado y publicado. Prioridad calculada: ${data.prioridad}`
          : decision === 'fusionar'
            ? 'Reportes fusionados.'
            : 'Reporte rechazado.',
      );
      setActivo(null);
      await cargarPendientes();
    } catch (e) {
      setError(mensajeDeError(e));
    } finally {
      setOcupado(false);
    }
  }

  return (
    <div>
      {error && <div className="aviso error">{error}</div>}
      {mensaje && <div className="aviso exito">{mensaje}</div>}

      <div className="rejilla">
        <section>
          <h2>Cola de revision ({pendientes.length})</h2>
          {pendientes.length === 0 && <p className="suave">No hay nada pendiente.</p>}

          {pendientes.map((r) => (
            <article key={r.id} className="tarjeta">
              <div className="fila">
                <span className="insignia" style={{ background: 'var(--texto-suave)' }}>
                  {r.origen === 'recorrido' ? 'video tecnico' : 'ciudadano'}
                </span>
                {r.severidad_ia && (
                  <span className="insignia" style={{ background: COLOR_SEVERIDAD[r.severidad_ia] }}>
                    IA: {r.severidad_ia}
                    {r.confianza_ia != null && ` (${Math.round(r.confianza_ia * 100)}%)`}
                  </span>
                )}
                <span className="suave" style={{ marginLeft: 'auto' }}>
                  {new Date(r.creado_en).toLocaleString('es-DO')}
                </span>
              </div>

              {r.descripcion && <p style={{ margin: '8px 0' }}>{r.descripcion}</p>}
              <p className="mono">
                {r.lat.toFixed(6)}, {r.lon.toFixed(6)}
                {r.precision_gps_m != null && ` · ±${Math.round(r.precision_gps_m)} m`}
              </p>
              {r.requiere_correccion_gps && (
                <p className="suave" style={{ color: 'var(--aviso)' }}>
                  GPS poco preciso: conviene corregir el punto en el mapa.
                </p>
              )}

              <button className="secundario" onClick={() => abrir(r)}>
                Revisar
              </button>
            </article>
          ))}
        </section>

        <section>
          <h2>Detalle</h2>
          {!activo && <p className="suave">Elige un reporte de la cola.</p>}

          {activo && (
            <div className="tarjeta">
              {evidencias.map((ev) => (
                <img
                  key={ev.id}
                  src={ev.url}
                  alt={`Evidencia ${ev.tipo} del reporte`}
                  style={{ width: '100%', borderRadius: 8, marginBottom: 12 }}
                />
              ))}

              <div className="mapa">
                <MapContainer
                  center={[activo.lat, activo.lon]}
                  zoom={17}
                  style={{ height: '100%', width: '100%' }}
                >
                  <TileLayer
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    attribution="&copy; OpenStreetMap"
                  />
                  <SelectorPunto onElegir={(p) => setPunto({ lat: p.lat, lon: p.lng })} />
                  {punto && <Marker position={[punto.lat, punto.lon]} />}
                </MapContainer>
              </div>
              <p className="suave">Haz clic en el mapa para corregir la ubicacion.</p>
              {punto && (
                <p className="mono">
                  Punto a guardar: {punto.lat.toFixed(6)}, {punto.lon.toFixed(6)}
                </p>
              )}

              <label style={{ display: 'block', margin: '12px 0 4px', fontWeight: 600, fontSize: 14 }}>
                Severidad validada
              </label>
              <select value={severidad} onChange={(e) => setSeveridad(e.target.value as Severidad)}>
                <option value="leve">Leve</option>
                <option value="moderada">Moderada</option>
                <option value="grave">Grave</option>
              </select>

              <label style={{ display: 'block', margin: '12px 0 4px', fontWeight: 600, fontSize: 14 }}>
                Motivo (queda en la auditoria)
              </label>
              <textarea
                value={motivo}
                onChange={(e) => setMotivo(e.target.value)}
                rows={3}
                placeholder="Ej.: bache confirmado en la foto, carril derecho, profundidad notable"
              />

              <div className="fila" style={{ marginTop: 12 }}>
                <button onClick={() => decidir('validar')} disabled={ocupado}>
                  Validar y publicar
                </button>
                <button className="peligro" onClick={() => decidir('rechazar')} disabled={ocupado}>
                  Rechazar
                </button>
              </div>

              <h3 style={{ marginBottom: 4 }}>Duplicados candidatos ({candidatos.length})</h3>
              <p className="suave" style={{ marginTop: 0 }}>
                Propuestos por cercania espacial, ventana temporal y similitud visual. La fusion la
                decides tu.
              </p>
              {candidatos.length === 0 && <p className="suave">Ninguno.</p>}
              {candidatos.length > 0 && (
                <table>
                  <thead>
                    <tr>
                      <th>Reporte</th>
                      <th>Distancia</th>
                      <th>Dias</th>
                      <th>Puntaje</th>
                      <th />
                    </tr>
                  </thead>
                  <tbody>
                    {candidatos.map((c) => (
                      <tr key={c.reporte_id}>
                        <td className="mono">{c.reporte_id.slice(0, 8)}</td>
                        <td>{c.distancia_m} m</td>
                        <td>{c.dias_diferencia}</td>
                        <td>{c.puntaje}</td>
                        <td>
                          <button
                            className="secundario"
                            onClick={() => decidir('fusionar', c.reporte_id)}
                            disabled={ocupado}
                          >
                            Fusionar aqui
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
