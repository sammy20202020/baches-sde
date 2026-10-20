/**
 * RF-13 + RF-14: grabacion de video con muestras GPS y subida posterior.
 *
 * Esta pantalla NO funciona en Expo Go: la grabacion de video y el muestreo
 * continuo de GPS necesitan modulos nativos, asi que hace falta un development
 * build (`npx expo run:android` / `run:ios`). Ver docs/GUIA-ARRANQUE.md.
 *
 * El muestreo de GPS corre en primer plano, con la pantalla encendida: es una
 * decision consciente del alcance, no una limitacion por resolver mas tarde.
 */
import { useEffect, useRef, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { CameraView, useCameraPermissions, useMicrophonePermissions } from 'expo-camera';
import * as Location from 'expo-location';
import * as Crypto from 'expo-crypto';
import { useRouter } from 'expo-router';

import { api, mensajeDeError } from '@/api/client';
import { Aviso, Boton, Tarjeta } from '@/ui/componentes';
import { colores, espacio, radio } from '@/ui/theme';

type Muestra = {
  t_ms: number;
  lat: number;
  lon: number;
  precision_m: number | null;
  velocidad_mps: number | null;
  rumbo: number | null;
};

const INTERVALO_GPS_MS = 1000; // 1 Hz: suficiente para interpolar a velocidad urbana

export default function Recorrido() {
  const router = useRouter();
  const camara = useRef<CameraView>(null);
  const [permisoCamara, pedirCamara] = useCameraPermissions();
  const [permisoMicro, pedirMicro] = useMicrophonePermissions();

  const [grabando, setGrabando] = useState(false);
  const [recorridoId, setRecorridoId] = useState<string | null>(null);
  const [muestras, setMuestras] = useState<Muestra[]>([]);
  const [segundos, setSegundos] = useState(0);
  const [estado, setEstado] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [ocupado, setOcupado] = useState(false);

  const inicioRef = useRef<number>(0);
  const suscripcionGps = useRef<Location.LocationSubscription | null>(null);
  const cronometro = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    // Si la pantalla se cierra a medias, no se deja el GPS encendido.
    return () => {
      suscripcionGps.current?.remove();
      if (cronometro.current) clearInterval(cronometro.current);
    };
  }, []);

  async function iniciar() {
    setError(null);
    if (!permisoCamara?.granted && !(await pedirCamara()).granted) {
      return setError('Sin permiso de camara no se puede grabar el recorrido.');
    }
    if (!permisoMicro?.granted) await pedirMicro();

    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      return setError('El recorrido necesita ubicacion para georreferenciar las detecciones.');
    }

    setOcupado(true);
    try {
      // La clave de idempotencia se genera aqui: reintentar no abre dos recorridos.
      const { data } = await api.post('/recorridos', {
        idempotency_key: Crypto.randomUUID(),
        iniciado_en: new Date().toISOString(),
      });
      setRecorridoId(data.id);

      inicioRef.current = Date.now();
      setMuestras([]);
      setSegundos(0);

      suscripcionGps.current = await Location.watchPositionAsync(
        { accuracy: Location.Accuracy.High, timeInterval: INTERVALO_GPS_MS, distanceInterval: 0 },
        (p) =>
          setMuestras((previas) => [
            ...previas,
            {
              t_ms: Date.now() - inicioRef.current,
              lat: p.coords.latitude,
              lon: p.coords.longitude,
              precision_m: p.coords.accuracy ?? null,
              velocidad_mps: p.coords.speed ?? null,
              rumbo: p.coords.heading ?? null,
            },
          ]),
      );

      cronometro.current = setInterval(() => setSegundos((s) => s + 1), 1000);
      setGrabando(true);

      const video = await camara.current?.recordAsync();
      // recordAsync resuelve cuando se detiene la grabacion.
      if (video?.uri) await finalizar(data.id, video.uri);
    } catch (e) {
      setError(mensajeDeError(e));
      setGrabando(false);
    } finally {
      setOcupado(false);
    }
  }

  function detener() {
    camara.current?.stopRecording();
    setGrabando(false);
    suscripcionGps.current?.remove();
    suscripcionGps.current = null;
    if (cronometro.current) clearInterval(cronometro.current);
  }

  async function finalizar(id: string, videoUri: string) {
    setOcupado(true);
    setEstado('Subiendo las muestras de GPS…');
    try {
      await api.post(`/recorridos/${id}/muestras`, {
        finalizado_en: new Date().toISOString(),
        muestras,
      });

      setEstado('Subiendo el video…');
      const formulario = new FormData();
      formulario.append('video', {
        uri: videoUri,
        name: 'recorrido.mp4',
        type: 'video/mp4',
      } as unknown as Blob);
      await api.post(`/recorridos/${id}/video`, formulario, {
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: 300_000, // los videos de recorrido son grandes
      });

      setEstado('Listo. El servidor esta procesando el video.');
      Alert.alert(
        'Recorrido enviado',
        'El video se esta procesando en segundo plano. Los candidatos detectados apareceran en el panel de revision.',
        [{ text: 'Entendido', onPress: () => router.back() }],
      );
    } catch (e) {
      setError(mensajeDeError(e));
      setEstado(null);
    } finally {
      setOcupado(false);
    }
  }

  const mm = String(Math.floor(segundos / 60)).padStart(2, '0');
  const ss = String(segundos % 60).padStart(2, '0');

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colores.fondo }} contentContainerStyle={{ padding: espacio.md }}>
      {!!error && <Aviso tono="error">{error}</Aviso>}
      {!!estado && <Aviso tono="info">{estado}</Aviso>}

      {permisoCamara?.granted && (
        <View style={e.marcoCamara}>
          <CameraView ref={camara} style={{ flex: 1 }} facing="back" mode="video" />
          {grabando && (
            <View style={e.indicador}>
              <View style={e.punto} />
              <Text style={e.indicadorTexto}>
                {mm}:{ss} · {muestras.length} muestras GPS
              </Text>
            </View>
          )}
        </View>
      )}

      <Tarjeta>
        <Text style={e.titulo}>{grabando ? 'Grabando recorrido' : 'Recorrido detenido'}</Text>
        <Text style={e.dato}>Recorrido: {recorridoId ?? '—'}</Text>
        <Text style={e.dato}>Muestras GPS: {muestras.length}</Text>
        <Text style={e.dato}>Duracion: {mm}:{ss}</Text>
        <Text style={e.nota}>
          Mantiene la pantalla encendida mientras graba. No manipules el telefono conduciendo.
        </Text>
      </Tarjeta>

      {!grabando ? (
        <Boton titulo="Comenzar a grabar" onPress={iniciar} cargando={ocupado} />
      ) : (
        <Boton titulo="Detener y enviar" variante="peligro" onPress={detener} />
      )}

      <Pressable onPress={() => router.back()} style={{ marginTop: espacio.md, alignItems: 'center' }}>
        <Text style={{ color: colores.primarioClaro, fontWeight: '600' }}>Volver</Text>
      </Pressable>
    </ScrollView>
  );
}

const e = StyleSheet.create({
  marcoCamara: {
    height: 240,
    borderRadius: radio.md,
    overflow: 'hidden',
    marginBottom: espacio.md,
    backgroundColor: '#000',
  },
  indicador: {
    position: 'absolute',
    top: espacio.sm,
    left: espacio.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: espacio.xs,
    backgroundColor: 'rgba(0,0,0,0.65)',
    paddingHorizontal: espacio.sm,
    paddingVertical: 4,
    borderRadius: 999,
  },
  punto: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#FF5252' },
  indicadorTexto: { color: '#FFF', fontSize: 12, fontWeight: '600' },
  titulo: { fontSize: 18, fontWeight: '700', color: colores.texto, marginBottom: espacio.sm },
  dato: { color: colores.texto, marginTop: 2 },
  nota: { color: colores.textoSuave, fontSize: 12, marginTop: espacio.sm, lineHeight: 17 },
});
