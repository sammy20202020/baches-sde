/** RF-01: cuenta con nombre, correo, contrasena y consentimiento de privacidad. */
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Link, useRouter } from 'expo-router';

import { mensajeDeError } from '@/api/client';
import { useAuth } from '@/store/auth';
import { Aviso, Boton, Campo } from '@/ui/componentes';
import { colores, espacio, TOQUE_MINIMO } from '@/ui/theme';

export default function Registro() {
  const registro = useAuth((s) => s.registro);
  const router = useRouter();
  const [nombre, setNombre] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [acepta, setAcepta] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cargando, setCargando] = useState(false);

  async function enviar() {
    setError(null);
    if (nombre.trim().length < 2) return setError('Escribe tu nombre');
    if (!email.includes('@')) return setError('El correo no parece valido');
    if (password.length < 10) return setError('La contrasena debe tener al menos 10 caracteres');
    if (!acepta) return setError('Debes aceptar la politica de privacidad para crear la cuenta');

    setCargando(true);
    try {
      await registro(nombre.trim(), email.trim().toLowerCase(), password);
    } catch (e) {
      setError(mensajeDeError(e));
    } finally {
      setCargando(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: colores.fondo }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={e.contenido} keyboardShouldPersistTaps="handled">
        <Text style={e.titulo}>Crear cuenta</Text>

        {!!error && <Aviso tono="error">{error}</Aviso>}

        <Campo etiqueta="Nombre" value={nombre} onChangeText={setNombre} placeholder="Tu nombre" />
        <Campo
          etiqueta="Correo"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
          placeholder="tu@correo.com"
        />
        <Campo
          etiqueta="Contrasena"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          placeholder="Al menos 10 caracteres"
        />

        <Pressable
          accessibilityRole="checkbox"
          accessibilityState={{ checked: acepta }}
          accessibilityLabel="Acepto la politica de privacidad"
          onPress={() => setAcepta((v) => !v)}
          style={e.consentimiento}
        >
          <View style={[e.casilla, acepta && { backgroundColor: colores.primario, borderColor: colores.primario }]}>
            {acepta && <Text style={{ color: '#FFF', fontWeight: '800' }}>✓</Text>}
          </View>
          <Text style={e.consentimientoTexto}>
            Acepto la{' '}
            <Text
              style={e.enlaceTexto}
              onPress={() => router.push('/privacidad')}
              accessibilityRole="link"
            >
              politica de privacidad
            </Text>
            . Mi nombre y correo no se publican en el mapa.
          </Text>
        </Pressable>

        <Boton titulo="Crear cuenta" onPress={enviar} cargando={cargando} />

        <View style={e.pie}>
          <Text style={{ color: colores.textoSuave }}>Ya tienes cuenta? </Text>
          <Link href="/(auth)/login" style={e.enlace}>
            Entrar
          </Link>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const e = StyleSheet.create({
  contenido: { padding: espacio.lg, paddingTop: espacio.xl * 2 },
  titulo: { fontSize: 28, fontWeight: '800', color: colores.primario, marginBottom: espacio.lg },
  consentimiento: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espacio.sm,
    minHeight: TOQUE_MINIMO,
    marginBottom: espacio.md,
  },
  casilla: {
    width: 26,
    height: 26,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: colores.borde,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colores.superficie,
  },
  consentimientoTexto: { flex: 1, color: colores.texto, lineHeight: 20 },
  enlaceTexto: { color: colores.primarioClaro, fontWeight: '700', textDecorationLine: 'underline' },
  pie: { flexDirection: 'row', justifyContent: 'center', marginTop: espacio.lg },
  enlace: { color: colores.primarioClaro, fontWeight: '700' },
});
