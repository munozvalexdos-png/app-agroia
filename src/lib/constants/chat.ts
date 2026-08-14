/** Constantes de UI y copy del asistente. */

export const INITIAL_BOT_GREETING = `¡Hola! Soy **AgroIA Tolima**, el asistente virtual de la Secretaría de Desarrollo Agropecuario y Seguridad Alimentaria de la Gobernación del Tolima.

Estoy listo para orientarle en:
- Estadísticas de predios, hectáreas y rubros
- Manejo de **café, arroz, aguacate Hass, cacao, maíz y plátano**
- Trámites **ICA** (predio exportador, BPA, plagas cuarentenarias)
- Incentivos **FICAT / PDEA** y contacto con **UMATA**

¿En qué consulta estadística o tema técnico le ayudo hoy?`;

export interface FrequentQuery {
  icon: string;
  label: string;
  prompt: string;
}

export const FREQUENT_QUERIES: readonly FrequentQuery[] = [
  {
    icon: '📊',
    label: 'Resumen de hectáreas, producción y predios',
    prompt:
      'Preséntame un resumen estadístico de la base de datos: total de predios, hectáreas por rubro (café, arroz, aguacate, cacao, ganadería), municipios y porcentaje georreferenciado con GPS.',
  },
  {
    icon: '☕',
    label: 'Café en Planadas, Líbano y Chaparral',
    prompt:
      '¿Cuántos predios de café hay, cuántas hectáreas suman y cuáles productores y fincas están en Planadas, Líbano o Chaparral? Incluye plan de manejo de roya y broca.',
  },
  {
    icon: '🌾',
    label: 'Arroz, Hass y cacao según el censo SIG',
    prompt:
      'Consulta las hectáreas de arroz, aguacate Hass y cacao, con municipios principales y recomendaciones de manejo.',
  },
  {
    icon: '🗺️',
    label: 'Predios con GPS y registro ICA',
    prompt:
      '¿Cuántos predios tienen coordenadas GPS precisas y cuántos tienen registro sanitario ICA activo?',
  },
  {
    icon: '📜',
    label: 'FICAT y requisitos UMATA',
    prompt:
      '¿Cuáles son las líneas de crédito subsidiado y requisitos para postular una finca al Fondo FICAT de la Gobernación del Tolima?',
  },
  {
    icon: '🥑',
    label: 'Predio exportador Hass — ICA Cajamarca',
    prompt:
      '¿Cuáles son los requisitos y pasos ante el ICA para registrar un predio exportador de Aguacate Hass en Cajamarca, Tolima?',
  },
];

export function formatClock(date = new Date()): string {
  return date.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' });
}

export function createMessageId(prefix: string): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return `${prefix}-${crypto.randomUUID()}`;
  }
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}
