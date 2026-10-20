/**
 * RF-04 + RF-07: crear un reporte con foto, descripcion y ubicacion GPS
 * confirmable; si no hay red queda como borrador cifrado en el telefono.
 *
 * El flujo es: foto -> ubicacion (ajustable en el mapa) -> descripcion -> enviar.
 * La foto se comprime antes de guardarla: una foto de 12 MP en una red movil
 * lenta es la causa mas comun de que un reporte nunca llegue.
 */
import { useRef, useState } from 'react';
import { Alert, Image, Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as ImageManipulator from 'expo-image-manipulator';
import MapView, { Marker } from 'react-native-maps';
import { useRouter } from 'expo-router';

import { crearBorrador } from '@/db/outbox';
import { sincronizar } from '@/db/sync';
import { CENTRO_SDE, PRECISION_DUDOSA_M, PermisoUbicacionDenegado, posicionActual, type Posicion } from '@/lib/ubicacion';
import { Aviso, Boton, Campo, Tarjeta } from '@/ui/componentes';
import { colores, espacio, radio } from '@/ui/theme';

type Paso = 'foto' | 'ubicacion' | 'detalle';

const ANCHO_SUBIDA = 1280; // suficiente para que el modelo detecte el bache

export default function NuevoReporte() {
  const router = useRouter();
  const camara = useRef<CameraView>(null);
  const [permisoCamara, pedirPermisoCamara] = useCameraPermissions();

  const [paso, setPaso] = useState<Paso>('foto');
  const [fotoUri, setFotoUri] = useState<string | null>(null);
  const [posicion, setPosicion] = useState<Posicion | null>(null);
  const [descripcion, setDescripcion] = useState('');
  const [ocupado, setOcupado] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function tomarFoto() {
    if (!permisoCamara?.granted) {
      const r = await pedirPermisoCamara();
      if (!r.granted) {
        setError('Sin permiso de camara no se puede adjuntar la evidencia.');
        return;
      }
    }
    setOcupado(true);
    try {
      const captura = await camara.current?.takePictureAsync({ quality: 0.9 });
      if (!captura) throw new Error('No se pudo capturar la foto');

      const comprimida = await ImageManipulator.manipulateAsync(
        captura.uri,
        [{ resize: { width: ANCHO_SUBIDA } }],
        { compress: 0.75, format: ImageManipulator.SaveFormat.JPEG },
      );
      setFotoUri(comprimida.uri);
      setPaso('ubicacion');
      await obtenerUbicacion();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al tomar la foto');
    } finally {
      setOcupado(false);
    }
  }

  async function obtenerUbicacion() {
    setOcupado(true);
    setError(null);
    try {
      setPosicion(await posicionActual());
    } catch (e) {
      if (e instanceof PermisoUbicacionDenegado) {
        // RNF-05: si rechaza el permiso se ofrece alternativa, no un callejon sin salida.
        setError('Sin permiso de ubicacion. Puedes marcar el punto a mano en el mapa.');
        setPosicion({ lat: CENTRO_SDE.latitude, lon: CENTRO_SDE.longitude, precision_m: null });
      } else {
        setError('No se pudo leer el GPS. Marca el punto en el mapa.');
        setPosicion({ lat: CENTRO_SDE.latitude, lon: CENTRO_SDE.longitude, precision_m: null });
      }
    } finally {
      setOcupado(false);
    }
  }

  async function guardar() {
    if (!fotoUri || !posicion) return;
    setOcupado(true);
    setError(null);
    try {
      // Siempre se guarda primero en local: si el envio falla, el reporte existe.
      await crearBorrador({
        foto_uri: fotoUri,
        lat: posicion.lat,
        lon: posicion.lon,
        precision_gps_m: posicion.precision_m,
        descripcion: descripcion.trim() || null,
      });

      const r = await sincronizar();
      Alert.alert(
        r.enviados > 0 ? 'Reporte enviado' : 'Reporte guardado',
        r.enviados > 0
          ? 'Ya esta en revision. Te avisamos cuando cambie de estado.'
          : 'No hay conexion ahora. Se enviara solo cuando vuelva la red.',
        [{ text: 'Entendido', onPress: () => router.replace('/(tabs)/mis-reportes') }],
      );

      setFotoUri(null);
      setPosicion(null);
      setDescripcion('');
      setPaso('foto');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo guardar el reporte');
    } finally {
      setOcupado(false);
    }
  }

  if (paso === 'foto') {
    if (!permisoCamara) return <View style={{ flex: 1, backgroundColor: colores.fondo }} />;

    if (!permisoCamara.granted) {
      return (
        <View style={e.centrado}>
          <Aviso tono="info">
            La camara se usa solo para fotografiar el bache que vas a reportar. La foto se envia
            junto a la ubicacion y nada mas.
          </Aviso>
          <Boton titulo="Permitir camara" onPress={pedirPermisoCamara} />
          <View style={{ height: espacio.sm }} />
          <Boton
            titulo="Abrir ajustes del telefono"
            variante="secundario"
            onPress={() => Linking.openSettings()}
          />
        </View>
      );
    }

    return (
      <View style={{ flex: 1, backgroundColor: '#000' }}>
        <CameraView ref={camara} style={{ flex: 1 }} facing="back" />
        <View style={e.barraCamara}>
          {!!error && <Text style={e.errorCamara}>{error}</Text>}
          <Text style={e.ayudaCamara}>Encuadra el bache completo, con algo de la via alrededor.</Text>
          <Boton titulo={ocupado ? 'Procesando…' : 'Tomar foto'} onPress={tomarFoto} cargando={ocupado} />
        </View>
      </View>
    );
  }

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colores.fondo }}
      contentContainerStyle={{ padding: espacio.md }}
      keyboardShouldPersistTaps="handled"
    >
      {!!error && <Aviso tono="error">{error}</Aviso>}

      {!!fotoUri && <Image source={{ uri: fotoUri }} style={e.vistaPrevia} accessibilityLabel="Foto del bache" />}

      <Tarjeta>
        <Text style={e.tituloSeccion}>Confirma la ubicacion</Text>
        <Text style={e.ayuda}>Arrastra el marcador si el punto no cae exactamente sobre el bache.</Text>

        {!!posicion && (
          <MapView
            style={e.mapa}
            region={{
              latitude: posicion.lat,
              longitude: posicion.lon,
              latitudeDelta: 0.004,
              longitudeDelta: 0.004,
            }}
            onPress={(ev) =>
              setPosicion({
                lat: ev.nativeEvent.coordinate.latitude,
                lon: ev.nativeEvent.coordinate.longitude,
                precision_m: posicion.precision_m,
              })
            }
          >
            <Marker
              draggable
              coordinate={{ latitude: posicion.lat, longitude: posicion.lon }}
              onDragEnd={(ev) =>
                setPosicion({
                  lat: ev.nativeEvent.coordinate.latitude,
                  lon: ev.nativeEvent.coordinate.longitude,
                  precision_m: posicion.precision_m,
                })
              }
            />
          </MapView>
        )}

        <Text style={e.coordenadas}>
          {posicion ? `${posicion.lat.toFixed(6)}, ${posicion.lon.toFixed(6)}` : 'Buscando ubicacion…'}
        </Text>

        {posicion?.precision_m != null && (
          <Text
            style={[
              e.ayuda,
              posicion.precision_m > PRECISION_DUDOSA_M && { color: colores.aviso, fontWeight: '600' },
            ]}
          >
            Precision del GPS: ±{Math.round(posicion.precision_m)} m
            {posicion.precision_m > PRECISION_DUDOSA_M ? ' — conviene ajustar el marcador a mano' : ''}
          </Text>
        )}

        <Pressable onPress={obtenerUbicacion} style={{ marginTop: espacio.sm }}>
          <Text style={e.enlace}>Volver a leer el GPS</Text>
        </Pressable>
      </Tarjeta>

      <Campo
        etiqueta="Descripcion (opcional)"
        value={descripcion}
        onChangeText={setDescripcion}
        placeholder="Ej.: bache profundo en el carril derecho, frente al colmado"
        multiline
        numberOfLines={3}
        maxLength={1000}
        style={{ minHeight: 90, paddingTop: espacio.sm, textAlignVertical: 'top' }}
      />

      <Boton titulo="Enviar reporte" onPress={guardar} cargando={ocupado} deshabilitado={!posicion} />
      <View style={{ height: espacio.sm }} />
      <Boton
        titulo="Tomar otra foto"
        variante="secundario"
        onPress={() => {
          setFotoUri(null);
          setPaso('foto');
        }}
      />
    </ScrollView>
  );
}

const e = StyleSheet.create({
  centrado: { flex: 1, justifyContent: 'center', padding: espacio.lg, backgroundColor: colores.fondo },
  barraCamara: { padding: espacio.md, backgroundColor: 'rgba(0,0,0,0.85)' },
  ayudaCamara: { color: '#FFF', marginBottom: espacio.sm, textAlign: 'center' },
  errorCamara: { color: '#FFB4AB', marginBottom: espacio.sm, textAlign: 'center' },
  vistaPrevia: { width: '100%', height: 200, borderRadius: radio.md, marginBottom: espacio.sm },
  tituloSeccion: { fontSize: 16, fontWeight: '700', color: colores.texto },
  ayuda: { fontSize: 13, color: colores.textoSuave, marginTop: espacio.xs, lineHeight: 18 },
  mapa: { width: '100%', height: 220, borderRadius: radio.sm, marginTop: espacio.sm },
  coordenadas: { fontFamily: 'Courier', color: colores.texto, marginTop: espacio.sm },
  enlace: { color: colores.primarioClaro, fontWeight: '600' },
});
