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

export const UNIDADES_AREA = [
  'Hectáreas (Ha)',
  'Metros cuadrados (m²)',
  'Estanques / Espejos de agua',
  'Metros cúbicos (m³)',
  'Colmenas / Cajas',
  'Litros / Capacidad de tanque',
] as const;

export type UnidadArea = (typeof UNIDADES_AREA)[number];

export const UNIDADES_PRODUCCION = [
  'Ton/Ha (Agrícola)',
  'Kg/ha o Cargas/Ha',
  'Número de Cabezas / Animales (Ganado bovino, porcino, ovino, caprino, equino/mular)',
  'Cantidad de Peces / Alevines (Piscicultura)',
  'Aves / Pollos / Gallinas (Avicultura)',
  'Litros/Día o Litros/Lote (Lácteos/Miel)',
] as const;

export type UnidadProduccion = (typeof UNIDADES_PRODUCCION)[number];

export const DEFAULT_UNIDAD_AREA: UnidadArea = 'Hectáreas (Ha)';
export const DEFAULT_UNIDAD_PRODUCCION: UnidadProduccion = 'Ton/Ha (Agrícola)';

export const AREA_CAPACIDAD_LABEL = 'Área / Capacidad Productiva';
export const ESTIMADO_PRODUCCION_LABEL = 'Estimado Producción / Población';

/** Sugiere unidades según la etapa / fase, sin impedir que el técnico las cambie. */
export function unidadesSugeridasPorEtapa(
  etapa?: string,
): { area: UnidadArea; produccion: UnidadProduccion } {
  const value = etapa ?? '';

  if (value.includes('Piscicultura')) {
    return {
      area: 'Estanques / Espejos de agua',
      produccion: 'Cantidad de Peces / Alevines (Piscicultura)',
    };
  }
  if (value.includes('Avicultura')) {
    return {
      area: 'Metros cuadrados (m²)',
      produccion: 'Aves / Pollos / Gallinas (Avicultura)',
    };
  }
  if (value.includes('Apicultura')) {
    return {
      area: 'Colmenas / Cajas',
      produccion: 'Litros/Día o Litros/Lote (Lácteos/Miel)',
    };
  }
  if (value.includes('Láctea')) {
    return {
      area: 'Hectáreas (Ha)',
      produccion: 'Litros/Día o Litros/Lote (Lácteos/Miel)',
    };
  }
  if (
    value.includes('Ganadería') ||
    value.includes('Porcina') ||
    value.includes('Ovino') ||
    value.includes('Equinos')
  ) {
    return {
      area: 'Hectáreas (Ha)',
      produccion:
        'Número de Cabezas / Animales (Ganado bovino, porcino, ovino, caprino, equino/mular)',
    };
  }

  return {
    area: DEFAULT_UNIDAD_AREA,
    produccion: DEFAULT_UNIDAD_PRODUCCION,
  };
}

/**
 * Datos de captura. `hectareas` y `rendimientoEstimadoTonHa` se conservan
 * para compatibilidad con registros agrícolas existentes; las unidades
 * nuevas van en `unidadArea` y `unidadProduccion`.
 */
export interface DatosCampoCaptura {
  cultivo?: string;
  variedad?: string;
  /** Valor numérico de área o capacidad (histórico: hectáreas). */
  hectareas?: number;
  unidadArea?: UnidadArea;
  etapa?: EtapaFenologicaFaseProductiva;
  /** Valor numérico de producción o población (histórico: Ton/Ha). */
  rendimientoEstimadoTonHa?: number;
  unidadProduccion?: UnidadProduccion;
  estadoSanitario?: string;
  [key: string]: unknown;
}
