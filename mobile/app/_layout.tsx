import { useEffect } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { Stack, useRouter, useSegments } from 'expo-router';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';

import { useAuth } from '@/store/auth';
import { abrir } from '@/db/outbox';
import { observarRed, sincronizar } from '@/db/sync';
import { colores } from '@/ui/theme';

function Guardia() {
  const { usuario, cargando } = useAuth();
  const segmentos = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (cargando) return;
    const enAuth = segmentos[0] === '(auth)';
    if (!usuario && !enAuth) router.replace('/(auth)/login');
    if (usuario && enAuth) router.replace('/(tabs)');
  }, [usuario, cargando, segmentos, router]);

  if (cargando) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', backgroundColor: colores.fondo }}>
        <ActivityIndicator size="large" color={colores.primario} />
      </View>
    );
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(auth)" />
      <Stack.Screen name="(tabs)" />
      <Stack.Screen
        name="recorrido"
        options={{ headerShown: true, title: 'Recorrido tecnico', presentation: 'modal' }}
      />
    </Stack>
  );
}

export default function RootLayout() {
  const iniciar = useAuth((s) => s.iniciar);

  useEffect(() => {
    // Orden importante: primero la base local (hay borradores que mostrar aunque
    // no haya sesion), luego la sesion, y la cola se vacia cuando haya red.
    abrir().then(() => iniciar());
    sincronizar();
    const suscripcion = observarRed();
    return () => suscripcion();
  }, [iniciar]);

  return (
    <SafeAreaProvider>
      <StatusBar style="light" />
      <Guardia />
    </SafeAreaProvider>
  );
}
