import { useEffect, useState } from 'react';

import Administracion from './Administracion';
import Login from './Login';
import MapaPublico from './MapaPublico';
import Revision from './Revision';
import { api, sesion, type Usuario } from './api';

type Vista = 'revision' | 'mapa' | 'admin';

export default function App() {
  const [usuario, setUsuario] = useState<Usuario | null>(null);
  const [cargando, setCargando] = useState(true);
  const [vista, setVista] = useState<Vista>('revision');

  useEffect(() => {
    if (!sesion.access()) {
      setCargando(false);
      return;
    }
    api
      .get<Usuario>('/auth/yo')
      .then(({ data }) => setUsuario(data))
      .catch(() => sesion.borrar())
      .finally(() => setCargando(false));
  }, []);

  if (cargando) return <p style={{ padding: 24 }}>Cargando…</p>;
  if (!usuario) return <Login alEntrar={setUsuario} />;

  return (
    <>
      <header className="barra">
        <h1>Baches SDE</h1>
        <span className="suave" style={{ color: 'rgba(255,255,255,0.75)' }}>
          {usuario.nombre} · {usuario.rol}
        </span>
        <nav>
          <button aria-current={vista === 'revision' ? 'page' : undefined} onClick={() => setVista('revision')}>
            Revision
          </button>
          <button aria-current={vista === 'mapa' ? 'page' : undefined} onClick={() => setVista('mapa')}>
            Mapa
          </button>
          <button aria-current={vista === 'admin' ? 'page' : undefined} onClick={() => setVista('admin')}>
            Administracion
          </button>
          <button
            onClick={() => {
              sesion.borrar();
              setUsuario(null);
            }}
          >
            Salir
          </button>
        </nav>
      </header>

      <main className="contenido">
        {vista === 'revision' && <Revision />}
        {vista === 'mapa' && <MapaPublico />}
        {vista === 'admin' && <Administracion rol={usuario.rol} />}
      </main>
    </>
  );
}
