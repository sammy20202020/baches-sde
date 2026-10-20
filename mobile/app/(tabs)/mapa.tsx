/** RF-11 + RF-12: mapa publico de reportes validados, con filtros. */
import { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import MapView, { Callout, Marker } from 'react-native-maps';
import { useFocusEffect } from 'expo-router';

import { api, mensajeDeError } from '@/api/client';
import type { GeoJson, PuntoMapa, Severidad } from '@/api/tipos';
import { CENTRO_SDE } from '@/lib/ubicacion';
import { Aviso } from '@/ui/componentes';
import { colorSeveridad, colores, espacio, etiquetaEstado, radio, TOQUE_MINIMO } from '@/ui/theme';

type FiltroSeveridad = Severidad | 'todas';
const FILTROS: FiltroSeveridad[] = ['todas', 'grave', 'moderada', 'leve'];

export default function Mapa() {
  const [puntos, setPuntos] = useState<PuntoMapa[]>([]);
  const [filtro, setFiltro] = useState<FiltroSeveridad>('todas');
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const cargar = useCallback(async (severidad: FiltroSeveridad) => {
    setCargando(true);
    setError(null);
    try {
      const { data } = await api.get<GeoJson>('/mapa/publico', {
        params: { limite: 1000, ...(severidad !== 'todas' ? { severidad } : {}) },
      });
      setPuntos(data.features);
    } catch (e) {
      setError(mensajeDeError(e));
    } finally {
      setCargando(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      cargar(filtro);
    }, [cargar, filtro]),
  );

  return (
    <View style={{ flex: 1, backgroundColor: colores.fondo }}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={e.filtros}
      >
        {FILTROS.map((f) => {
          const activo = filtro === f;
          return (
            <Pressable
              key={f}
              accessibilityRole="button"
              accessibilityState={{ selected: activo }}
              onPress={() => setFiltro(f)}
              style={[e.chip, activo && { backgroundColor: colores.primario, borderColor: colores.primario }]}
            >
              <Text style={[e.chipTexto, activo && { color: '#FFFFFF' }]}>{f}</Text>
            </Pressable>
          );
        })}
      </ScrollView>

      {!!error && (
        <View style={{ paddingHorizontal: espacio.md }}>
          <Aviso tono="error">{error}</Aviso>
        </View>
      )}

      <MapView
        style={{ flex: 1 }}
        initialRegion={{ ...CENTRO_SDE, latitudeDelta: 0.09, longitudeDelta: 0.09 }}
      >
        {puntos.map((p) => (
          <Marker
            key={p.properties.id}
            coordinate={{ latitude: p.geometry.coordinates[1], longitude: p.geometry.coordinates[0] }}
            pinColor={colorSeveridad(p.properties.severidad)}
          >
            <Callout>
              <View style={{ padding: 4, minWidth: 180 }}>
                <Text style={{ fontWeight: '700' }}>
                  {p.properties.severidad ? `Severidad ${p.properties.severidad}` : 'Sin clasificar'}
                </Text>
                <Text>Estado: {etiquetaEstado[p.properties.estado] ?? p.properties.estado}</Text>
                {p.properties.prioridad != null && <Text>Prioridad: {p.properties.prioridad}</Text>}
                <Text>Reportado {p.properties.veces_reportado} vez(ces)</Text>
                <Text style={{ color: colores.textoSuave, fontSize: 12 }}>
                  {new Date(p.properties.fecha).toLocaleDateString('es-DO')}
                </Text>
              </View>
            </Callout>
          </Marker>
        ))}
      </MapView>

      <View style={e.pie}>
        {cargando ? (
          <ActivityIndicator color={colores.primario} />
        ) : (
          <Text style={e.pieTexto}>
            {puntos.length} {puntos.length === 1 ? 'bache validado' : 'baches validados'}
          </Text>
        )}
      </View>
    </View>
  );
}

const e = StyleSheet.create({
  filtros: { gap: espacio.sm, padding: espacio.sm },
  chip: {
    minHeight: 36,
    justifyContent: 'center',
    paddingHorizontal: espacio.md,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colores.borde,
    backgroundColor: colores.superficie,
  },
  chipTexto: { color: colores.texto, fontWeight: '600', textTransform: 'capitalize' },
  pie: {
    minHeight: TOQUE_MINIMO,
    justifyContent: 'center',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: colores.borde,
    backgroundColor: colores.superficie,
  },
  pieTexto: { color: colores.textoSuave },
});
