/**
 * Ajustes de conexion. Permite apuntar la app a otro servidor sin recompilar,
 * que es lo que hace falta cada vez que cambia la IP de la computadora.
 */
import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';

import * as servidor from '@/api/servidor';
import { Aviso, Boton, Campo, Tarjeta } from '@/ui/componentes';
import { colores, espacio } from '@/ui/theme';

export default function Servidor() {
  const router = useRouter();
  const [url, setUrl] = useState('');
  const [guardada, setGuardada] = useState('');
  const [probando, setProbando] = useState(false);
  const [resultado, setResultado] = useState<{ ok: boolean; detalle: string } | null>(null);

  useEffect(() => {
    servidor.cargar().then((v) => {
      setUrl(v);
      setGuardada(v);
    });
  }, []);

  async function probarYGuardar() {
    setProbando(true);
    setResultado(null);
    const r = await servidor.probar(url);
    setResultado(r);
    if (r.ok) {
      const limpia = await servidor.guardar(url);
      setUrl(limpia);
      setGuardada(limpia);
    }
    setProbando(false);
  }

  async function volverAlDefecto() {
    const v = await servidor.restablecer();
    setUrl(v);
    setGuardada(v);
    setResultado(null);
  }

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colores.fondo }}
      contentContainerStyle={{ padding: espacio.lg }}
      keyboardShouldPersistTaps="handled"
    >
      <Text style={e.titulo}>Servidor</Text>
      <Text style={e.ayuda}>
        Direccion de la API. Cambiala cuando cambie la IP de la computadora que corre el backend.
      </Text>

      {resultado && (
        <Aviso tono={resultado.ok ? 'exito' : 'error'}>{resultado.detalle}</Aviso>
      )}

      <Campo
        etiqueta="Direccion"
        value={url}
        onChangeText={setUrl}
        autoCapitalize="none"
        autoCorrect={false}
        keyboardType="url"
        placeholder="10.0.0.95"
      />
      <Text style={e.pista}>
        Basta con la IP: se completa a http://IP:8000/api/v1
      </Text>

      <Boton
        titulo={probando ? 'Probando…' : 'Probar y guardar'}
        onPress={probarYGuardar}
        cargando={probando}
      />
      <View style={{ height: espacio.sm }} />
      <Boton titulo="Volver al valor por defecto" variante="secundario" onPress={volverAlDefecto} />

      <Tarjeta>
        <Text style={e.etiquetaTarjeta}>En uso ahora</Text>
        <Text style={e.mono}>{guardada || '—'}</Text>
      </Tarjeta>

      <Aviso tono="info">
        El teléfono y la computadora deben estar en la misma Wi-Fi. En la Mac, la IP se ve con{' '}
        <Text style={e.mono}>ipconfig getifaddr en0</Text>.
      </Aviso>

      <Boton titulo="Volver" variante="secundario" onPress={() => router.back()} />
    </ScrollView>
  );
}

const e = StyleSheet.create({
  titulo: { fontSize: 26, fontWeight: '800', color: colores.primario },
  ayuda: { fontSize: 15, color: colores.textoSuave, lineHeight: 22, marginBottom: espacio.lg },
  pista: { fontSize: 13, color: colores.textoSuave, marginTop: -espacio.sm, marginBottom: espacio.md },
  etiquetaTarjeta: { fontSize: 13, fontWeight: '700', color: colores.textoSuave },
  mono: { fontFamily: 'Courier', color: colores.texto, marginTop: espacio.xs },
});
