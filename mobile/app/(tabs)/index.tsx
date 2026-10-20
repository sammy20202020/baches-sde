/** Inicio: resumen publico, estado de la cola offline y acceso rapido a reportar. */
import { useCallback, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';

import { api } from '@/api/client';
import { contarPendientes } from '@/db/outbox';
import { sincronizar } from '@/db/sync';
import { registrarParaPush } from '@/lib/notificaciones';
import { useAuth } from '@/store/auth';
import { Aviso, Boton, Tarjeta } from '@/ui/componentes';
import { colores, espacio } from '@/ui/theme';

type Resumen = { publicados: number; por_severidad: Record<string, number> };

export default function Inicio() {
  const usuario = useAuth((s) => s.usuario);
  const logout = useAuth((s) => s.logout);
  const router = useRouter();

  const [resumen, setResumen] = useState<Resumen | null>(null);
  const [cola, setCola] = useState(0);
  const [refrescando, setRefrescando] = useState(false);
  const [mensaje, setMensaje] = useState<string | null>(null);

  const cargar = useCallback(async () => {
    setCola(await contarPendientes());
    try {
      const { data } = await api.get<Resumen>('/mapa/resumen');
      setResumen(data);
    } catch {
      setResumen(null); // sin red se muestra solo la cola local
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      cargar();
    }, [cargar]),
  );

  async function sincronizarAhora() {
    setRefrescando(true);
    const r = await sincronizar();
    setMensaje(
      r.sinRed
        ? 'Sin conexion. Se intentara de nuevo cuando vuelva la red.'
        : r.enviados === 0 && r.fallidos === 0
          ? 'No hay reportes pendientes.'
          : `Enviados: ${r.enviados}. Pendientes con error: ${r.fallidos}.`,
    );
    await cargar();
    setRefrescando(false);
  }

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colores.fondo }}
      contentContainerStyle={{ padding: espacio.md }}
      refreshControl={<RefreshControl refreshing={refrescando} onRefresh={sincronizarAhora} />}
    >
      <Text style={e.saludo}>Hola, {usuario?.nombre?.split(' ')[0] ?? 'ciudadano'}</Text>
      <Text style={e.rol}>Rol: {usuario?.rol}</Text>

      {!!mensaje && <Aviso>{mensaje}</Aviso>}

      {cola > 0 && (
        <Aviso tono="info">
          Tienes {cola} {cola === 1 ? 'reporte' : 'reportes'} esperando conexion. Se envian solos
          cuando vuelva la red.
        </Aviso>
      )}

      <Tarjeta>
        <Text style={e.tituloTarjeta}>Reportes validados en el mapa</Text>
        <Text style={e.numeroGrande}>{resumen?.publicados ?? '—'}</Text>
        <View style={e.filaSeveridad}>
          {(['grave', 'moderada', 'leve'] as const).map((s) => (
            <View key={s} style={e.celdaSeveridad}>
              <Text style={e.numeroChico}>{resumen?.por_severidad?.[s] ?? 0}</Text>
              <Text style={e.etiquetaChica}>{s}</Text>
            </View>
          ))}
        </View>
        <Text style={e.nota}>
          Solo aparece lo que un revisor valido. Las detecciones automaticas no se publican solas.
        </Text>
      </Tarjeta>

      <View style={{ gap: espacio.sm, marginTop: espacio.md }}>
        <Boton titulo="Reportar un bache" onPress={() => router.push('/(tabs)/nuevo')} />
        <Boton titulo="Ver el mapa" variante="secundario" onPress={() => router.push('/(tabs)/mapa')} />
        <Boton
          titulo="Activar notificaciones"
          variante="secundario"
          onPress={async () => {
            const token = await registrarParaPush();
            setMensaje(
              token
                ? 'Notificaciones activadas para este dispositivo.'
                : 'No se activaron. Puedes seguir viendo el estado en "Mis reportes".',
            );
          }}
        />
        <Boton titulo="Cerrar sesion" variante="peligro" onPress={logout} />
      </View>
    </ScrollView>
  );
}

const e = StyleSheet.create({
  saludo: { fontSize: 24, fontWeight: '800', color: colores.primario },
  rol: { color: colores.textoSuave, marginBottom: espacio.md },
  tituloTarjeta: { fontSize: 14, fontWeight: '700', color: colores.textoSuave },
  numeroGrande: { fontSize: 44, fontWeight: '800', color: colores.primario },
  filaSeveridad: { flexDirection: 'row', gap: espacio.lg, marginTop: espacio.sm },
  celdaSeveridad: { alignItems: 'center' },
  numeroChico: { fontSize: 20, fontWeight: '700', color: colores.texto },
  etiquetaChica: { fontSize: 12, color: colores.textoSuave },
  nota: { fontSize: 12, color: colores.textoSuave, marginTop: espacio.sm, lineHeight: 17 },
});
