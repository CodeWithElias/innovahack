export interface ProductAttributes {
  PRODUCTO: string;
  PRECIO_DE_VENTA: number;
  PRECIO_DE_COMPRA: number;
  LEAD_TIME_DIAS: number;
  CANT_MIN_COMPRAS: number;
  SENSIBILIDAD_PRECIO: number;
}


export interface ScenarioInputs {
  MES: number;
  CLIMA: number;
  FERIA: number;
  CAMBIO_PRECIO_PCT: number;
  CRECIMIENTO_ORGANICO: number;
}


export interface SimulationPayload extends ProductAttributes, ScenarioInputs {}


export interface SimulationResult {
  MES: number;
  PRODUCTO: string;
  CLIMA: number;
  FERIA: number;
  CAMBIO_PRECIO_PCT: number;
  CRECIMIENTO_ORGANICO: number;
  CANTIDAD_PROYECTADA_IA_BASE: number;
  CANTIDAD_PROYECTADA_FINAL: number;
  INGRESOS_PROYECTADOS: number;
  MARGEN_PROYECTADO: number;
  LEAD_TIME_DIAS: number;
  CANT_MIN_COMPRAS: number;
  PRECIO_DE_COMPRA: number;
}


export interface RecommendationResult {
  peor: string;
  conservador: string;
  mejor: string;
}


export interface PurchasePlanEntry {
  MES: number;
  PRODUCTO: string;
  DEMANDA_PROYECTADA: number;
  STOCK_INICIAL: number;
  COMPRA_REQUERIDA: number;
  STOCK_FINAL: number;
  AVISO: string;
  RECOMENDACION: string;
  LEAD_TIME_DIAS?: number;
  CANT_MIN_COMPRAS?: number;
  CANTIDAD_PROYECTADA_FINAL?: number;
  PRECIO_DE_COMPRA?: number;
}
