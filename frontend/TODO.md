# TODO: Implementar API de Plan de Compra en Simulator.tsx

## Pasos a Completar

1. **Actualizar types.ts**: ✅ Agregar tipo para la respuesta de la API de plan de compra (PurchasePlanResult), que extienda SimulationResult con campos adicionales si es necesario.

2. **Modificar Simulator.tsx**: ✅
   - Agregar estado para almacenar el plan de compra (purchasePlan: PurchasePlanResult[] | null).
   - Crear función `handleGeneratePurchasePlan` que llame a POST /api/purchase-plan/ con el array de datos del escenario seleccionado (puede ser 1 o 12 meses).
   - Cambiar el botón "Aprobar y Generar Plan" para llamar a esta función en lugar de navegar.
   - Agregar sección en la UI para mostrar el plan de compra generado (tabla o lista con los datos devueltos).

3. **Probar la integración**: Verificar que la API responda correctamente y que los datos se muestren en la vista.

4. **Manejo de errores**: ✅ Agregar try-catch en la llamada a la API y mostrar mensajes de error apropiados.

5. **Actualizar navegación**: Si se aprueba, considerar si aún se necesita la ruta /compras o si se maneja todo en Simulator.

## ✅ **Cambios Realizados:**

### 1. **Actualizar types.ts**: ✅
- Agregado `PurchasePlanResult` que extiende `SimulationResult` con campos adicionales.

### 2. **Modificar Simulator.tsx**: ✅
- Agregado estado `purchasePlan` y `purchasePlanSelection`.
- Agregado import de `PurchasePlanResult`.
- Agregado función `handleGeneratePurchasePlan` que consume POST /api/purchase-plan/.
- Cambiado botón "Aprobar y Generar Plan" para llamar a la función.
- Agregado sección para mostrar el plan de compra generado.

### 3. **Modificar Plan.tsx**: ✅
- Agregado filtro por producto.
- Agregado recálculo automático cuando cambian stock o situación combustible.
- Mejorado el diseño con grid para las variables.
- Agregado estado de recálculo automático.

### 4. **Modificar Plan.css**: ✅
- Agregado estilos para `.variables-grid`.
- Agregado estilos para `.recalculate-status` y `.status-text`.

## 🎯 **Funcionalidades Implementadas:**

- ✅ **API de Plan de Compra**: Consume POST /api/purchase-plan/ con datos del escenario seleccionado.
- ✅ **Filtros por Producto**: Selector para ver plan de compra por producto individual o todos.
- ✅ **Recálculo Automático**: El plan se recalcula automáticamente al cambiar stock o situación combustible.
- ✅ **Manejo de Errores**: Try-catch en llamadas a API con mensajes de error.
- ✅ **UI Mejorada**: Diseño profesional con grid layout y estados de carga.

## 📋 **Próximos Pasos:**
- Probar la integración completa con el backend Django.
- Verificar que los datos de simulación se pasen correctamente al plan de compra.
- Ajustar valores por defecto si es necesario (LEAD_TIME_DIAS, CANT_MIN_COMPRAS, PRECIO_DE_COMPRA).
