/**
 * Estilo de mapa para MapLibre, con teselas de OpenStreetMap.
 *
 * Se usa MapLibre y no Google Maps porque Google exige una cuenta de
 * facturacion con tarjeta antes de entregar la primera API key, aunque el
 * consumo quede dentro del tramo gratuito. MapLibre es BSD y OSM es
 * cartografia abierta: cero llaves, cero costo.
 *
 * NOTA PARA EL DESPLIEGUE: el servidor publico de teselas de OSM es para uso
 * ligero y su politica desaconseja apps de volumen. Para la tesis en cuatro
 * rutas alcanza, pero si el sistema se despliega de verdad hay que pasar a un
 * proveedor de teselas propio o contratado. Solo cambia la URL de abajo.
 */
import type { StyleSpecification } from '@maplibre/maplibre-react-native';

export const ESTILO_OSM: StyleSpecification = {
  version: 8,
  sources: {
    osm: {
      type: 'raster',
      tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
      tileSize: 256,
      maxzoom: 19,
      attribution: '© OpenStreetMap',
    },
  },
  layers: [{ id: 'osm', type: 'raster', source: 'osm' }],
};

/** Centro aproximado de Santo Domingo Este. */
export const CENTRO: [number, number] = [-69.857, 18.4886];
