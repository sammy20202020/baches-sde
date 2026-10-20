/** RF-09: historial personal, mas el estado de la cola local (RF-07/08). */
import { useCallback, useState } from 'react';
import { FlatList, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from 'expo-router';

import { api, mensajeDeError } from '@/api/client';
import type { Reporte } from '@/api/tipos';
import { limpiarEnviados, todos, type Borrador } from '@/db/outbox';
import { sincronizar } from '@/db/sync';
import { Aviso, Boton, Insignia, Tarjeta } from '@/ui/componentes';
import { colorSeveridad, colores, espacio, etiquetaEstado } from '@/ui/theme';

const COLOR_ESTADO: Record<string, string> = {
  recibido: colores.textoSuave,
  en_revision: colores.aviso,
  validado: colores.exito,
  rechazado: colores.error,
  programado: colores.primarioClaro,
  resuelto: colores.exito,
  fusionado: colores.textoSuave,
};

export default function MisReportes() {
  const [reportes, setReportes] = useState<Reporte[]>([]);
  const [locales, setLocales] = useState<Borrador[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [refrescando, setRefrescando] = useState(false);

  const cargar = useCallback(async () => {
    setLocales((await todos()).filter((b) => b.estado !== 'enviado'));
    try {
      const { data } = await api.get<Reporte[]>('/reportes/mios');
      setReportes(data);
      setError(null);
    } catch (e) {
      setError(mensajeDeError(e));
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      cargar();
    }, [cargar]),
  );

  async function refrescar() {
    setRefrescando(true);
    await sincronizar();
    await limpiarEnviados();
    await cargar();
    setRefrescando(false);
  }

  return (
    <FlatList
      style={{ flex: 1, backgroundColor: colores.fondo }}
      contentContainerStyle={{ padding: espacio.md }}
      data={reportes}
      keyExtractor={(r) => r.id}
      refreshControl={<RefreshControl refreshing={refrescando} onRefresh={refrescar} />}
      ListHeaderComponent={
        <View>
          {!!error && <Aviso tono="error">{error}</Aviso>}

          {locales.length > 0 && (
            <View style={{ marginBottom: espacio.md }}>
              <Text style={e.encabezado}>Pendientes de envio</Text>
              {locales.map((b) => (
                <Tarjeta key={b.id}>
                  <View style={e.fila}>
                    <Insignia
                      texto={b.estado === 'error' ? `Error (${b.intentos})` : 'En espera'}
                      color={b.estado === 'error' ? colores.error : colores.aviso}
                    />
                    <Text style={e.fecha}>{new Date(b.capturado_en).toLocaleString('es-DO')}</Text>
                  </View>
                  <Text style={e.coordenadas}>
                    {b.lat.toFixed(5)}, {b.lon.toFixed(5)}
                  </Text>
                  {!!b.descripcion && <Text style={e.descripcion}>{b.descripcion}</Text>}
                  {!!b.ultimo_error && <Text style={e.errorTexto}>{b.ultimo_error}</Text>}
                </Tarjeta>
              ))}
              <Boton titulo="Intentar enviar ahora" variante="secundario" onPress={refrescar} />
            </View>
          )}

          <Text style={e.encabezado}>Enviados</Text>
        </View>
      }
      ListEmptyComponent={
        <Text style={e.vacio}>Aun no has enviado reportes. Usa la pestana "Reportar".</Text>
      }
      renderItem={({ item }) => (
        <Tarjeta>
          <View style={e.fila}>
            <Insignia
              texto={etiquetaEstado[item.estado] ?? item.estado}
              color={COLOR_ESTADO[item.estado] ?? colores.textoSuave}
            />
            {!!(item.severidad_validada ?? item.severidad_ia) && (
              <Insignia
                texto={(item.severidad_validada ?? item.severidad_ia) as string}
                color={colorSeveridad(item.severidad_validada ?? item.severidad_ia)}
              />
            )}
            <Text style={e.fecha}>{new Date(item.creado_en).toLocaleDateString('es-DO')}</Text>
          </View>

          {!!item.descripcion && <Text style={e.descripcion}>{item.descripcion}</Text>}
          <Text style={e.coordenadas}>
            {item.lat.toFixed(5)}, {item.lon.toFixed(5)}
          </Text>

          {item.severidad_validada == null && item.severidad_ia != null && (
            <Text style={e.nota}>
              Severidad sugerida por el analisis automatico. Falta la confirmacion de un revisor.
            </Text>
          )}
          {item.requiere_correccion_gps && (
            <Text style={e.nota}>
              El GPS marco poca precision; un revisor puede ajustar la ubicacion.
            </Text>
          )}
          {item.veces_reportado > 1 && (
            <Text style={e.nota}>Este bache fue reportado {item.veces_reportado} veces.</Text>
          )}
        </Tarjeta>
      )}
    />
  );
}

const e = StyleSheet.create({
  encabezado: { fontSize: 13, fontWeight: '700', color: colores.textoSuave, marginBottom: espacio.sm, textTransform: 'uppercase' },
  fila: { flexDirection: 'row', alignItems: 'center', gap: espacio.sm, flexWrap: 'wrap' },
  fecha: { marginLeft: 'auto', color: colores.textoSuave, fontSize: 12 },
  descripcion: { color: colores.texto, marginTop: espacio.sm, lineHeight: 20 },
  coordenadas: { fontFamily: 'Courier', color: colores.textoSuave, fontSize: 12, marginTop: espacio.xs },
  nota: { fontSize: 12, color: colores.textoSuave, marginTop: espacio.sm, fontStyle: 'italic', lineHeight: 17 },
  errorTexto: { fontSize: 12, color: colores.error, marginTop: espacio.xs },
  vacio: { color: colores.textoSuave, textAlign: 'center', marginTop: espacio.lg },
});
