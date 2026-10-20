/** Tokens de estilo. RNF-05: contraste suficiente y areas tactiles de 44 pt. */
export const colores = {
  fondo: '#F6F7F9',
  superficie: '#FFFFFF',
  borde: '#DFE3E8',
  texto: '#16202C',
  textoSuave: '#5A6775',
  primario: '#0E2A47',
  primarioClaro: '#17497D',
  exito: '#1B7F4B',
  aviso: '#B26A00',
  error: '#B3261E',
  leve: '#2E7D32',
  moderada: '#ED8B00',
  grave: '#C62828',
} as const;

export const espacio = { xs: 4, sm: 8, md: 16, lg: 24, xl: 32 } as const;
export const radio = { sm: 8, md: 12, lg: 16 } as const;

/** Area tactil minima accesible (RNF-05). */
export const TOQUE_MINIMO = 44;

export const colorSeveridad = (s?: string | null) =>
  s === 'grave' ? colores.grave : s === 'moderada' ? colores.moderada : s === 'leve' ? colores.leve : colores.textoSuave;

export const etiquetaEstado: Record<string, string> = {
  recibido: 'Recibido',
  en_revision: 'En revision',
  validado: 'Validado',
  rechazado: 'Rechazado',
  programado: 'Programado',
  resuelto: 'Resuelto',
  fusionado: 'Unido a otro reporte',
};
