/** RF-11 + RF-12: mapa publico de reportes validados, con filtros. */
import { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Camera, GeoJSONSource, Layer, Map } from '@maplibre/maplibre-react-native';
import { useFocusEffect } from 'expo-router';

import { api, mensajeDeError } from '@/api/client';
import type { GeoJson, PuntoMapa, Severidad } from '@/api/tipos';
import { CENTRO, ESTILO_OSM } from '@/ui/mapa-estilo';
import { Aviso } from '@/ui/componentes';
import { colorSeveridad, colores, espacio, etiquetaEstado, radio, TOQUE_MINIMO } from '@/ui/theme';

type FiltroSeveridad = Severidad | 'todas';
const FILTROS: FiltroSeveridad[] = ['todas', 'grave', 'moderada', 'leve'];

export default function Mapa() {
  const [puntos, setPuntos] = useState<PuntoMapa[]>([]);
  const [filtro, setFiltro] = useState<FiltroSeveridad>('todas');
  const [cargando, setCargando] = useState(true);
  const [seleccionado, setSeleccionado] = useState<PuntoMapa | null>(null);
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
        // Sin esto el ScrollView se estira y los chips ocupan media pantalla:
        // dentro de un contenedor flex, un ScrollView crece por defecto.
        style={e.barraFiltros}
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

      <Map style={{ flex: 1 }} mapStyle={ESTILO_OSM} attribution>
        <Camera initialViewState={{ center: CENTRO, zoom: 10.5 }} />

        {/* Una sola capa para todos los puntos: con cientos de marcadores
            individuales el mapa se arrastra; asi lo dibuja el motor nativo. */}
        <GeoJSONSource
          id="baches"
          data={{
            type: 'FeatureCollection',
            features: puntos.map((p) => ({
              type: 'Feature',
              geometry: p.geometry,
              properties: {
                color: colorSeveridad(p.properties.severidad),
                radio: p.properties.severidad === 'grave' ? 9 : p.properties.severidad === 'moderada' ? 7 : 5,
              },
            })),
          }}
          onPress={(ev) => {
            const f = (ev as { features?: { properties?: Record<string, unknown> }[] }).features?.[0];
            if (f) setSeleccionado(puntos.find((p) => p.properties.id === f.properties?.id) ?? null);
          }}
        >
          <Layer
            id="baches-circulo"
            type="circle"
            style={{
              circleColor: ['get', 'color'],
              circleRadius: ['get', 'radio'],
              circleStrokeWidth: 2,
              circleStrokeColor: '#FFFFFF',
              circleOpacity: 0.9,
            }}
          />
        </GeoJSONSource>
      </Map>

      {seleccionado && (
        <View style={e.detalle}>
          <Text style={e.detalleTitulo}>
            {seleccionado.properties.severidad
              ? `Severidad ${seleccionado.properties.severidad}`
              : 'Sin clasificar'}
          </Text>
          <Text style={e.detalleLinea}>
            Estado: {etiquetaEstado[seleccionado.properties.estado] ?? seleccionado.properties.estado}
            {seleccionado.properties.prioridad != null && ` · Prioridad ${seleccionado.properties.prioridad}`}
          </Text>
          <Text style={e.detalleLinea}>
            Reportado {seleccionado.properties.veces_reportado} vez(ces) ·{' '}
            {new Date(seleccionado.properties.fecha).toLocaleDateString('es-DO')}
          </Text>
        </View>
      )}

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
  barraFiltros: { flexGrow: 0, flexShrink: 0 },
  filtros: { gap: espacio.sm, padding: espacio.sm, alignItems: 'center' },
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
  detalle: {
    backgroundColor: colores.superficie,
    borderTopWidth: 1,
    borderTopColor: colores.borde,
    padding: espacio.md,
  },
  detalleTitulo: { fontSize: 16, fontWeight: '700', color: colores.texto, textTransform: 'capitalize' },
  detalleLinea: { color: colores.textoSuave, marginTop: 2 },
});
