// src/types.ts

// I. Estructura de la data estática del Producto (Base)
export interface ProductAttributes {
  PRODUCTO: string;
  PRECIO_DE_VENTA: number;
  PRECIO_DE_COMPRA: number;
  LEAD_TIME_DIAS: number;
  CANT_MIN_COMPRAS: number;
  SENSIBILIDAD_PRECIO: number;
}

// II. Estructura de los INPUTS del Gerente (Variables del Escenario)
export interface ScenarioInputs {
  MES: number;
  CLIMA: number;
  FERIA: number;
  CAMBIO_PRECIO_PCT: number;
  CRECIMIENTO_ORGANICO: number;
}

// VI. Payload para la API de simulación
export interface SimulationPayload extends ProductAttributes, ScenarioInputs {}

// III. Estructura de la RESPUESTA de la Simulación (Output del modelo) - Actualizada para múltiples productos
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

// IV. Estructura de la Respuesta de Recomendación
export interface RecommendationResult {
  peor: string;
  conservador: string;
  mejor: string;
}

// V. Estructura del Plan de Compra (Output de /purchase-plan)
export interface PurchasePlanEntry {
  MES: number;
  PRODUCTO: string;
  DEMANDA_PROYECTADA: number;
  STOCK_INICIAL: number;
  COMPRA_REQUERIDA: number;
  STOCK_FINAL: number;
  AVISO: string;
  RECOMENDACION: string;
  // Campos adicionales que pueden venir del backend
  LEAD_TIME_DIAS?: number;
  CANT_MIN_COMPRAS?: number;
  CANTIDAD_PROYECTADA_FINAL?: number;
  PRECIO_DE_COMPRA?: number;
}
