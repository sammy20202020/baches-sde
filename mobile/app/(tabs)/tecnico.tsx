/** Entrada al modo tecnico (RF-13). Solo visible para operador y admin. */
import { ScrollView, StyleSheet, Text } from 'react-native';
import { useRouter } from 'expo-router';

import { Aviso, Boton, Tarjeta } from '@/ui/componentes';
import { colores, espacio } from '@/ui/theme';

export default function Tecnico() {
  const router = useRouter();

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colores.fondo }}
      contentContainerStyle={{ padding: espacio.md }}
    >
      <Aviso tono="error">
        Seguridad primero: el operador no manipula la aplicacion mientras conduce. El recorrido lo
        inicia un acompanante o se deja el telefono en un soporte fijo antes de arrancar.
      </Aviso>

      <Tarjeta>
        <Text style={e.titulo}>Recorrido tecnico en video</Text>
        <Text style={e.texto}>
          Graba el recorrido de una ruta con muestras de GPS. Al terminar, el video se sube y el
          servidor extrae fotogramas, los analiza y propone candidatos georreferenciados.
        </Text>
        <Text style={e.nota}>
          Ningun candidato automatico se publica en el mapa: todos pasan por revision humana.
        </Text>
      </Tarjeta>

      <Boton titulo="Iniciar recorrido" onPress={() => router.push('/recorrido')} />
    </ScrollView>
  );
}

const e = StyleSheet.create({
  titulo: { fontSize: 18, fontWeight: '700', color: colores.texto, marginBottom: espacio.sm },
  texto: { color: colores.texto, lineHeight: 21 },
  nota: { color: colores.textoSuave, fontSize: 13, marginTop: espacio.sm, fontStyle: 'italic', lineHeight: 18 },
});
