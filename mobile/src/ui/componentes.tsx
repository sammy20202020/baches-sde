import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { ReactNode } from 'react';
import { colores, espacio, radio, TOQUE_MINIMO } from './theme';

type BotonProps = {
  titulo: string;
  onPress: () => void;
  variante?: 'primario' | 'secundario' | 'peligro';
  cargando?: boolean;
  deshabilitado?: boolean;
};

export function Boton({ titulo, onPress, variante = 'primario', cargando, deshabilitado }: BotonProps) {
  const inactivo = deshabilitado || cargando;
  const fondo =
    variante === 'primario' ? colores.primario : variante === 'peligro' ? colores.error : colores.superficie;
  const color = variante === 'secundario' ? colores.primario : '#FFFFFF';

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: !!inactivo, busy: !!cargando }}
      accessibilityLabel={titulo}
      onPress={onPress}
      disabled={inactivo}
      style={({ pressed }) => [
        e.boton,
        { backgroundColor: fondo, opacity: inactivo ? 0.5 : pressed ? 0.85 : 1 },
        variante === 'secundario' && { borderWidth: 1, borderColor: colores.primario },
      ]}
    >
      {cargando ? <ActivityIndicator color={color} /> : <Text style={[e.botonTexto, { color }]}>{titulo}</Text>}
    </Pressable>
  );
}

export function Campo({
  etiqueta,
  error,
  ...props
}: { etiqueta: string; error?: string } & React.ComponentProps<typeof TextInput>) {
  return (
    <View style={{ marginBottom: espacio.md }}>
      <Text style={e.etiqueta}>{etiqueta}</Text>
      <TextInput
        accessibilityLabel={etiqueta}
        placeholderTextColor={colores.textoSuave}
        style={[e.input, !!error && { borderColor: colores.error }]}
        {...props}
      />
      {!!error && (
        <Text style={e.error} accessibilityLiveRegion="polite">
          {error}
        </Text>
      )}
    </View>
  );
}

export function CintaDemo() {
  // Sin el inset la cinta se dibuja encima del reloj y los iconos del sistema.
  const inset = useSafeAreaInsets();
  return (
    <View style={[e.cintaDemo, { paddingTop: inset.top + 6 }]} accessibilityRole="alert">
      <Text style={e.cintaDemoTexto}>
        MODO DEMOSTRACION · datos de ejemplo, sin servidor
      </Text>
    </View>
  );
}

export function Tarjeta({ children }: { children: ReactNode }) {
  return <View style={e.tarjeta}>{children}</View>;
}

export function Insignia({ texto, color }: { texto: string; color: string }) {
  return (
    <View style={[e.insignia, { backgroundColor: color }]}>
      <Text style={e.insigniaTexto}>{texto}</Text>
    </View>
  );
}

export function Aviso({ tono = 'info', children }: { tono?: 'info' | 'error' | 'exito'; children: ReactNode }) {
  const fondo = tono === 'error' ? '#FDECEA' : tono === 'exito' ? '#E8F5EC' : '#EAF1F8';
  const borde = tono === 'error' ? colores.error : tono === 'exito' ? colores.exito : colores.primarioClaro;
  return (
    <View style={[e.aviso, { backgroundColor: fondo, borderLeftColor: borde }]} accessibilityLiveRegion="polite">
      <Text style={{ color: colores.texto, lineHeight: 20 }}>{children}</Text>
    </View>
  );
}

const e = StyleSheet.create({
  boton: {
    minHeight: TOQUE_MINIMO,
    borderRadius: radio.md,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: espacio.md,
  },
  botonTexto: { fontSize: 16, fontWeight: '600' },
  etiqueta: { fontSize: 14, fontWeight: '600', color: colores.texto, marginBottom: espacio.xs },
  input: {
    minHeight: TOQUE_MINIMO,
    borderWidth: 1,
    borderColor: colores.borde,
    borderRadius: radio.sm,
    paddingHorizontal: espacio.md,
    backgroundColor: colores.superficie,
    color: colores.texto,
    fontSize: 16,
  },
  error: { color: colores.error, fontSize: 13, marginTop: espacio.xs },
  cintaDemo: {
    backgroundColor: colores.aviso,
    paddingBottom: 6,
    paddingHorizontal: espacio.md,
    alignItems: 'center',
  },
  cintaDemoTexto: { color: '#FFFFFF', fontSize: 12, fontWeight: '800', letterSpacing: 0.3 },
  tarjeta: {
    backgroundColor: colores.superficie,
    borderRadius: radio.md,
    borderWidth: 1,
    borderColor: colores.borde,
    padding: espacio.md,
    marginBottom: espacio.sm,
  },
  insignia: { paddingHorizontal: espacio.sm, paddingVertical: 3, borderRadius: 999, alignSelf: 'flex-start' },
  insigniaTexto: { color: '#FFFFFF', fontSize: 12, fontWeight: '700' },
  aviso: { borderLeftWidth: 4, borderRadius: radio.sm, padding: espacio.md, marginBottom: espacio.md },
});
