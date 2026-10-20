/** RF-02: inicio de sesion. */
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Link } from 'expo-router';

import { mensajeDeError } from '@/api/client';
import { useAuth } from '@/store/auth';
import { Aviso, Boton, Campo } from '@/ui/componentes';
import { colores, espacio } from '@/ui/theme';

export default function Login() {
  const login = useAuth((s) => s.login);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [cargando, setCargando] = useState(false);

  async function enviar() {
    setError(null);
    if (!email.trim() || !password) {
      setError('Escribe tu correo y tu contrasena');
      return;
    }
    setCargando(true);
    try {
      await login(email.trim().toLowerCase(), password);
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
        <Text style={e.titulo}>Baches SDE</Text>
        <Text style={e.subtitulo}>Reporta un bache en Santo Domingo Este</Text>

        {!!error && <Aviso tono="error">{error}</Aviso>}

        <Campo
          etiqueta="Correo"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
          autoComplete="email"
          placeholder="tu@correo.com"
        />
        <Campo
          etiqueta="Contrasena"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          autoComplete="current-password"
          placeholder="Tu contrasena"
        />

        <Boton titulo="Entrar" onPress={enviar} cargando={cargando} />

        <View style={e.pie}>
          <Text style={{ color: colores.textoSuave }}>No tienes cuenta? </Text>
          <Link href="/(auth)/registro" style={e.enlace}>
            Crear cuenta
          </Link>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const e = StyleSheet.create({
  contenido: { padding: espacio.lg, paddingTop: espacio.xl * 2 },
  titulo: { fontSize: 32, fontWeight: '800', color: colores.primario },
  subtitulo: { fontSize: 16, color: colores.textoSuave, marginBottom: espacio.xl },
  pie: { flexDirection: 'row', justifyContent: 'center', marginTop: espacio.lg },
  enlace: { color: colores.primarioClaro, fontWeight: '700' },
});
