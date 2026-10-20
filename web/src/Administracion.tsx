/** RF-19, RF-20, RF-21: usuarios, auditoria, metricas y exportaciones. */
import { useCallback, useEffect, useState } from 'react';

import { api, mensajeDeError, type Usuario } from './api';

type FilaAuditoria = {
  id: string;
  accion: string;
  entidad: string;
  entidad_id: string | null;
  motivo: string | null;
  fecha: string;
};

type Metricas = {
  total_reportes: number;
  publicados: number;
  por_ruta: { ruta: string | null; estado: string | null; conteo: number }[];
};

export default function Administracion({ rol }: { rol: string }) {
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [auditoria, setAuditoria] = useState<FilaAuditoria[]>([]);
  const [metricas, setMetricas] = useState<Metricas | null>(null);
  const [error, setError] = useState<string | null>(null);

  const cargar = useCallback(async () => {
    try {
      const [a, m] = await Promise.all([
        api.get<FilaAuditoria[]>('/admin/auditoria', { params: { limite: 40 } }),
        api.get<Metricas>('/admin/metricas'),
      ]);
      setAuditoria(a.data);
      setMetricas(m.data);

      if (rol === 'admin') {
        const u = await api.get<Usuario[]>('/admin/usuarios');
        setUsuarios(u.data);
      }
    } catch (e) {
      setError(mensajeDeError(e));
    }
  }, [rol]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  async function descargar(formato: 'csv' | 'geojson') {
    try {
      const { data } = await api.get(`/admin/export/${formato}`, {
        responseType: formato === 'csv' ? 'blob' : 'json',
      });
      const contenido =
        formato === 'csv' ? data : new Blob([JSON.stringify(data, null, 2)], { type: 'application/geo+json' });
      const url = URL.createObjectURL(contenido as Blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `reportes-validados.${formato === 'csv' ? 'csv' : 'geojson'}`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      setError(mensajeDeError(e));
    }
  }

  return (
    <div>
      {error && <div className="aviso error">{error}</div>}

      <h2>Metricas</h2>
      <div className="tarjeta">
        <p>
          Reportes totales: <strong>{metricas?.total_reportes ?? '—'}</strong> · publicados:{' '}
          <strong>{metricas?.publicados ?? '—'}</strong>
        </p>
        <div className="fila">
          <button className="secundario" onClick={() => descargar('csv')}>
            Exportar CSV
          </button>
          <button className="secundario" onClick={() => descargar('geojson')}>
            Exportar GeoJSON
          </button>
        </div>
        <p className="suave">Las exportaciones no incluyen datos personales y quedan auditadas.</p>
      </div>

      {rol === 'admin' && (
        <>
          <h2>Usuarios ({usuarios.length})</h2>
          <div className="tarjeta">
            <table>
              <thead>
                <tr>
                  <th>Nombre</th>
                  <th>Correo</th>
                  <th>Rol</th>
                </tr>
              </thead>
              <tbody>
                {usuarios.map((u) => (
                  <tr key={u.id}>
                    <td>{u.nombre}</td>
                    <td>{u.email}</td>
                    <td>{u.rol}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      <h2>Auditoria</h2>
      <div className="tarjeta">
        <table>
          <thead>
            <tr>
              <th>Fecha</th>
              <th>Accion</th>
              <th>Entidad</th>
              <th>Motivo</th>
            </tr>
          </thead>
          <tbody>
            {auditoria.map((a) => (
              <tr key={a.id}>
                <td className="mono">{new Date(a.fecha).toLocaleString('es-DO')}</td>
                <td>{a.accion}</td>
                <td className="mono">{a.entidad_id?.slice(0, 8) ?? a.entidad}</td>
                <td>{a.motivo ?? '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
