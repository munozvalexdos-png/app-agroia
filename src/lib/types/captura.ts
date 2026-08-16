/**
 * Etapa fenológica (cultivos) y fase productiva (sistemas pecuarios)
 * del formulario de captura de campo.
 */
export const ETAPAS_FENOLOGICAS_FASE_PRODUCTIVA = [
  'Germinación / Almácigo',
  'Crecimiento Vegetativo',
  'Floración / Cuajado',
  'Llenado de Fruto / Grano',
  'Cosecha / Maduración',
  'Ganadería Bovina (Carne / Doble Propósito)',
  'Ganadería Bovina Láctea',
  'Piscicultura (Tilapia / Cachama - Embalse del Prado)',
  'Avicultura (Pollo Engorde / Huevo)',
  'Porcina / Porcicultura',
  'Apicultura (Miel y Polen)',
  'Ovinocultura y Caprinocultura',
  'Equinos (Crianza y Trabajo)',
] as const;

export type EtapaFenologicaFaseProductiva =
  (typeof ETAPAS_FENOLOGICAS_FASE_PRODUCTIVA)[number];

export const ETAPA_FENOLOGICA_LABEL = 'Etapa Fenológica / Fase Productiva';

export interface DatosCampoCaptura {
  cultivo?: string;
  variedad?: string;
  hectareas?: number;
  etapa?: EtapaFenologicaFaseProductiva;
  estadoSanitario?: string;
  [key: string]: unknown;
}
