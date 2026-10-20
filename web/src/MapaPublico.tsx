/** RF-11: el mismo mapa publico que ve la app movil, con los mismos datos. */
import { useEffect, useState } from 'react';
import { CircleMarker, MapContainer, Popup, TileLayer } from 'react-leaflet';

import { api, mensajeDeError } from './api';

type Punto = {
  geometry: { coordinates: [number, number] };
  properties: {
    id: string;
    estado: string;
    severidad: string | null;
    prioridad: number | null;
    veces_reportado: number;
    fecha: string;
  };
};

const COLOR: Record<string, string> = { leve: '#2e7d32', moderada: '#ed8b00', grave: '#c62828' };

export default function MapaPublico() {
  const [puntos, setPuntos] = useState<Punto[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .get<{ features: Punto[] }>('/mapa/publico', { params: { limite: 2000 } })
      .then(({ data }) => setPuntos(data.features))
      .catch((e) => setError(mensajeDeError(e)));
  }, []);

  return (
    <div>
      <h2>Mapa publico ({puntos.length} validados)</h2>
      {error && <div className="aviso error">{error}</div>}
      <p className="suave">
        Solo reportes validados por un revisor. Sin nombres, correos ni identificadores de personas.
      </p>

      <div style={{ height: '65vh', borderRadius: 12, overflow: 'hidden' }}>
        <MapContainer center={[18.4886, -69.857]} zoom={12} style={{ height: '100%', width: '100%' }}>
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution="&copy; OpenStreetMap"
          />
          {puntos.map((p) => (
            <CircleMarker
              key={p.properties.id}
              center={[p.geometry.coordinates[1], p.geometry.coordinates[0]]}
              radius={7}
              pathOptions={{
                color: COLOR[p.properties.severidad ?? ''] ?? '#5a6775',
                fillOpacity: 0.75,
              }}
            >
              <Popup>
                <strong>{p.properties.severidad ?? 'sin clasificar'}</strong>
                <br />
                Estado: {p.properties.estado}
                <br />
                Prioridad: {p.properties.prioridad ?? '—'}
                <br />
                Reportado {p.properties.veces_reportado} vez(ces)
                <br />
                {new Date(p.properties.fecha).toLocaleDateString('es-DO')}
              </Popup>
            </CircleMarker>
          ))}
        </MapContainer>
      </div>
    </div>
  );
}
