/** Estado de sesion. Los tokens viven en SecureStore, nunca en memoria persistida. */
import { create } from 'zustand';

import { api, tokens } from '../api/client';
import type { Usuario } from '../api/tipos';

type EstadoAuth = {
  usuario: Usuario | null;
  cargando: boolean;
  iniciar: () => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  registro: (nombre: string, email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
};

export const useAuth = create<EstadoAuth>((set) => ({
  usuario: null,
  cargando: true,

  /** Al abrir la app: si hay token guardado, se recupera la sesion. */
  async iniciar() {
    const access = await tokens.leerAccess();
    if (!access) {
      set({ usuario: null, cargando: false });
      return;
    }
    try {
      const { data } = await api.get<Usuario>('/auth/yo');
      set({ usuario: data, cargando: false });
    } catch {
      await tokens.borrar();
      set({ usuario: null, cargando: false });
    }
  },

  async login(email, password) {
    const { data } = await api.post('/auth/login', { email, password });
    await tokens.guardar(data.access_token, data.refresh_token);
    const { data: usuario } = await api.get<Usuario>('/auth/yo');
    set({ usuario });
  },

  async registro(nombre, email, password) {
    await api.post('/auth/registro', {
      nombre,
      email,
      password,
      acepta_privacidad: true, // la pantalla no deja enviar sin marcar la casilla
    });
    await useAuth.getState().login(email, password);
  },

  async logout() {
    const refresh = await tokens.leerRefresh();
    try {
      if (refresh) await api.post('/auth/logout', { refresh_token: refresh });
    } catch {
      // Cerrar sesion local aunque el servidor no responda.
    }
    await tokens.borrar();
    set({ usuario: null });
  },
}));
