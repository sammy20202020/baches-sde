/**
 * Texto completo de la politica de privacidad (seccion 5.2 del protocolo etico).
 *
 * Existe porque la casilla de consentimiento del registro remitia a una
 * politica que el usuario no podia leer en ninguna parte. Un consentimiento
 * que no se puede leer es nominal, no informado.
 */
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';

import { Boton } from '@/ui/componentes';
import { colores, espacio } from '@/ui/theme';

// PENDIENTE: crear la cuenta real del proyecto y ponerla aqui antes de que
// la app la use alguien fuera del equipo. No inventar una direccion: podria
// pertenecer a un tercero que recibiria solicitudes de datos personales.
const CORREO_PROYECTO = '(correo del proyecto, pendiente de crear)';

function Seccion({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <View style={{ marginBottom: espacio.lg }}>
      <Text style={e.titulo}>{titulo}</Text>
      <Text style={e.cuerpo}>{children}</Text>
    </View>
  );
}

export default function Privacidad() {
  const router = useRouter();

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colores.fondo }}
      contentContainerStyle={{ padding: espacio.lg }}
    >
      <Text style={e.encabezado}>Politica de privacidad</Text>
      <Text style={e.subtitulo}>Baches SDE · Santo Domingo Este</Text>

      <Seccion titulo="Que guardamos">
        Tu nombre y tu correo, para identificarte y avisarte del estado de tus
        reportes. Tu contrasena se guarda cifrada: nadie del equipo puede leerla.
        {'\n\n'}
        No te pedimos cedula, telefono, direccion ni fecha de nacimiento.
      </Seccion>

      <Seccion titulo="Que se hace publico">
        La ubicacion del bache, su severidad y la fecha. Nada mas.
      </Seccion>

      <Seccion titulo="Que nunca se hace publico">
        Tu nombre, tu correo y tu fotografia. La foto solo la ve el personal
        autorizado que revisa el reporte, y mediante enlaces que caducan.
      </Seccion>

      <Seccion titulo="Tu ubicacion">
        Se lee una sola vez, cuando tu decides reportar. La aplicacion no te
        sigue ni registra por donde andas.
      </Seccion>

      <Seccion titulo="Tus derechos">
        Puedes pedir que te mostremos tus datos, que los corrijamos, o que
        borremos tu cuenta y tus reportes. Escribe a {CORREO_PROYECTO} y
        respondemos en un maximo de 15 dias habiles.
        {'\n\n'}
        Ten en cuenta: un reporte ya validado y publicado queda sin vinculo
        contigo. Podemos borrar tu cuenta y ese vinculo, pero el punto del bache
        permanece de forma anonima como parte de los datos de la investigacion.
      </Seccion>

      <View style={e.aviso}>
        <Text style={e.avisoTexto}>
          Este sistema es un prototipo de investigacion academica. No sustituye
          los canales oficiales del ayuntamiento ni garantiza que el dano sea
          reparado.
        </Text>
      </View>

      <Boton titulo="Volver" variante="secundario" onPress={() => router.back()} />
    </ScrollView>
  );
}

const e = StyleSheet.create({
  encabezado: { fontSize: 26, fontWeight: '800', color: colores.primario },
  subtitulo: { fontSize: 14, color: colores.textoSuave, marginBottom: espacio.lg },
  titulo: { fontSize: 16, fontWeight: '700', color: colores.texto, marginBottom: espacio.xs },
  cuerpo: { fontSize: 15, color: colores.texto, lineHeight: 23 },
  aviso: {
    backgroundColor: '#FFF4E5',
    borderLeftWidth: 4,
    borderLeftColor: colores.aviso,
    borderRadius: 8,
    padding: espacio.md,
    marginBottom: espacio.lg,
  },
  avisoTexto: { color: colores.texto, lineHeight: 21 },
});
