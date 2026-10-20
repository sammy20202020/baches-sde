import { useState } from 'react';

import { api, mensajeDeError, sesion, type Usuario } from './api';

export default function Login({ alEntrar }: { alEntrar: (u: Usuario) => void }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [cargando, setCargando] = useState(false);

  async function enviar(ev: React.FormEvent) {
    ev.preventDefault();
    setError(null);
    setCargando(true);
    try {
      const { data } = await api.post('/auth/login', { email: email.trim().toLowerCase(), password });
      sesion.guardar(data.access_token, data.refresh_token);
      const { data: usuario } = await api.get<Usuario>('/auth/yo');
      if (usuario.rol !== 'revisor' && usuario.rol !== 'admin') {
        sesion.borrar();
        setError('Este panel es solo para revisores y administradores.');
        return;
      }
      alEntrar(usuario);
    } catch (e) {
      setError(mensajeDeError(e));
    } finally {
      setCargando(false);
    }
  }

  return (
    <form className="login" onSubmit={enviar}>
      <h1 style={{ marginTop: 0 }}>Panel de revision</h1>
      <p className="suave">Baches de Santo Domingo Este</p>

      {error && <div className="aviso error">{error}</div>}

      <label>
        Correo
        <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="username" />
      </label>
      <label>
        Contrasena
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          autoComplete="current-password"
        />
      </label>

      <button type="submit" disabled={cargando} style={{ width: '100%' }}>
        {cargando ? 'Entrando…' : 'Entrar'}
      </button>
    </form>
  );
}
