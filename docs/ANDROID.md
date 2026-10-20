# Instalar la app en un telefono Android

Android es el camino recomendado para la tesis: **no cuesta nada**, no pide
cuenta de desarrollador y la app no caduca a los 7 dias como en iPhone.

Hay tres formas. Empieza por la A.

---

## A. Expo Go — 2 minutos, sin cables

Sirve para todo menos grabar recorridos en video (RF-13) y recibir
notificaciones push. Es lo ideal para probar reportes, mapa y modo sin conexion.

1. Instala **Expo Go** desde la Play Store en el telefono.
2. Conecta el telefono a la **misma Wi-Fi** que la computadora.
3. En la computadora:

   ```bash
   cd ~/Desktop/baches-sde
   make up                      # backend, si no esta corriendo
   cd mobile && npm run start:go
   ```

4. Abre Expo Go y escanea el codigo QR de la terminal.

No hay que configurar ninguna IP: la app deduce sola la direccion de la API.

---

## B. Development build por USB — la app completa

Esto si incluye el recorrido en video y las notificaciones. Instala la app de
verdad en el telefono, con su propio icono, y **no caduca**.

### B.1 Preparar el telefono

1. Ajustes → **Acerca del telefono** → toca 7 veces **Numero de compilacion**.
   Aparece "Ya eres desarrollador".
2. Ajustes → **Opciones de desarrollador** → activa **Depuracion por USB**.
3. Conecta el telefono por USB y acepta el dialogo "Permitir depuracion USB".

### B.2 Preparar la computadora

Android Studio y el SDK ya estan instalados en esta maquina, pero las variables
de entorno no. Agregalas a `~/.zshrc` una sola vez:

```bash
echo 'export ANDROID_HOME=$HOME/Library/Android/sdk' >> ~/.zshrc
echo 'export PATH=$PATH:$ANDROID_HOME/platform-tools:$ANDROID_HOME/emulator' >> ~/.zshrc
source ~/.zshrc
```

Comprueba que el telefono aparece:

```bash
adb devices
```

Debe listar tu dispositivo como `device`. Si dice `unauthorized`, revisa el
dialogo en la pantalla del telefono.

### B.3 Compilar e instalar

```bash
cd ~/Desktop/baches-sde/mobile
npx expo run:android
```

La primera vez tarda bastante (descarga Gradle y compila). Las siguientes son
rapidas. Al terminar, la app queda instalada en el telefono.

Para las veces siguientes basta con `npm start` y abrir la app.

### B.4 Mapas en Android

`react-native-maps` usa Google Maps en Android y **necesita una API key** en
`mobile/app.json` → `android.config.googleMaps.apiKey`.

Google pide una cuenta de facturacion con tarjeta aunque no pases del tramo
gratis. Si no quieren poner tarjeta, el sustituto es MapLibre con teselas de
OpenStreetMap, sin llave ni tarjeta. Ver [COSTOS.md](COSTOS.md), seccion 2.2.

Sin la llave la app abre igual: solo el mapa sale en blanco.

---

## C. APK por la nube (EAS) — para repartir al equipo

Util para que David y Anyelys instalen la app sin tener Android Studio, y para
llevarla a las salidas de campo.

```bash
cd ~/Desktop/baches-sde/mobile
npx eas-cli login          # cuenta gratuita de Expo
npx eas-cli build -p android --profile preview
```

Al terminar, EAS entrega un enlace de descarga del `.apk`. Se abre desde el
telefono y se instala (hay que permitir "instalar apps de origenes
desconocidos"). El plan gratuito tiene cola, asi que puede tardar.

Nota: un APK instalado asi **no** habla con el backend de tu laptop a menos que
estes en la misma Wi-Fi y pongas la IP en `extra.apiUrl`. Para campo real
conviene desplegar la API en un servidor (ver COSTOS.md, seccion 2.3).

---

## Problemas comunes

**El telefono no ve la API.** Verifica que ambos esten en la misma Wi-Fi y que
el backend responda desde la IP de la red:

```bash
ipconfig getifaddr en0          # la IP de tu Mac
curl http://$(ipconfig getifaddr en0):8000/salud
```

Si responde en la computadora pero no en el telefono, suele ser el firewall de
macOS (Ajustes del Sistema → Red → Firewall) o una red Wi-Fi con aislamiento de
clientes, comun en redes de universidad. Solucion: usa el hotspot del telefono.

**`adb devices` no lista nada.** Prueba otro cable (muchos cables son solo de
carga), otro puerto USB, y revisa que la depuracion USB este activada.

**Gradle falla la primera vez.** Normalmente es memoria o una descarga a medias.
Limpia y reintenta:

```bash
cd mobile/android && ./gradlew clean && cd .. && npx expo run:android
```
