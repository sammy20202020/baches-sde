import { Tabs } from 'expo-router';
import { Text, type ColorValue } from 'react-native';

import { useAuth } from '@/store/auth';
import { colores } from '@/ui/theme';

/** Iconos como texto para no depender de una libreria de iconos. */
const icono = (glifo: string) =>
  function Icono({ color }: { color: ColorValue }) {
    return <Text style={{ fontSize: 20, color }}>{glifo}</Text>;
  };

export default function TabsLayout() {
  const rol = useAuth((s) => s.usuario?.rol);
  const esTecnico = rol === 'operador' || rol === 'admin';

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: colores.primario,
        tabBarInactiveTintColor: colores.textoSuave,
        headerStyle: { backgroundColor: colores.primario },
        headerTintColor: '#FFFFFF',
        tabBarStyle: { height: 60, paddingBottom: 6 },
      }}
    >
      <Tabs.Screen name="index" options={{ title: 'Inicio', tabBarIcon: icono('⌂') }} />
      <Tabs.Screen name="nuevo" options={{ title: 'Reportar', tabBarIcon: icono('＋') }} />
      <Tabs.Screen name="mapa" options={{ title: 'Mapa', tabBarIcon: icono('◉') }} />
      <Tabs.Screen name="mis-reportes" options={{ title: 'Mis reportes', tabBarIcon: icono('☰') }} />
      <Tabs.Screen
        name="tecnico"
        options={{
          title: 'Tecnico',
          tabBarIcon: icono('▣'),
          // RF-03: la pestana tecnica solo existe para operador y admin. El
          // servidor vuelve a validar el rol en cada peticion.
          href: esTecnico ? undefined : null,
        }}
      />
    </Tabs>
  );
}
