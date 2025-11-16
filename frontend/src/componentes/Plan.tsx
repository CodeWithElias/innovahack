// src/components/Plan.tsx

import React, { useState, useEffect, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import apiClient from '../api/apiClient';
import type { PurchasePlanEntry } from '../types';
import './Plan.css';

interface LocationState {
    purchasePlan: PurchasePlanEntry[];
    scenarioName: string;
}

const MONTHS = ['Nov', 'Dic', 'Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct'];


const AVAILABLE_PRODUCTS = [
    "ABERDEN_ANGUS",
    "SEMBRADORA_ELECTRICA",
    "SEMILLA DE MAIZ",
    "SEMILLA DE SORGO",
    "HOMEPATIA",
    "DEFENSIVOS",
    "ALIMENTO BALANCEADO"
];

const PurchasePlan: React.FC = () => {

    const location = useLocation();
    const state = location.state as LocationState;


    const initialPurchasePlanData = state?.purchasePlan || [];
    const scenarioName = state?.scenarioName || 'N/A';


    const [stockActual, setStockActual] = useState<number>(100);
    const [fuelSituation, setFuelSituation] = useState<number>(2); 
    const [selectedProduct, setSelectedProduct] = useState<string>('');
    const [purchasePlanData, setPurchasePlanData] = useState<PurchasePlanEntry[]>([]);
    const [statusMessage, setStatusMessage] = useState<string>(
        !state ? "Cargue un escenario primero." : `Escenario aprobado: ${scenarioName.toUpperCase()}. Selecciona un producto para ver el plan.`
    );
    const [isRecalculating, setIsRecalculating] = useState<boolean>(false);


    const [showInitialData, setShowInitialData] = useState<boolean>(false);


    const recalculatePlan = useCallback(async () => {
        if (!selectedProduct) return; 

        setIsRecalculating(true);
        setStatusMessage("🔄 Recalculando plan de compra...");

        try {
            console.log(`📤 Recalculando plan para producto ${selectedProduct} con stock_actual=${stockActual}, situacion_combustible=${fuelSituation}`);

            const filteredData = initialPurchasePlanData.filter(item => item.PRODUCTO === selectedProduct);

            const recalculatePayload = {
                stock_actual: stockActual, // Stock inicial para este producto
                situacion_combustible: fuelSituation,
                proyeccion_ventas: filteredData.map(item => ({
                    MES: item.MES,
                    PRODUCTO: item.PRODUCTO,
                    LEAD_TIME_DIAS: item.LEAD_TIME_DIAS || 7,
                    CANT_MIN_COMPRAS: item.CANT_MIN_COMPRAS || 50,
                    CANTIDAD_PROYECTADA_FINAL: item.CANTIDAD_PROYECTADA_FINAL || item.DEMANDA_PROYECTADA,
                    PRECIO_DE_COMPRA: item.PRECIO_DE_COMPRA || 100
                }))
            };

            const response = await apiClient.post<PurchasePlanEntry[]>('purchase-plan/', recalculatePayload);

            console.log(`📥 Respuesta del recálculo recibida:`, {
                status: response.status,
                data: response.data,
                totalRegistros: response.data.length,
                primerRegistro: response.data[0],
                ultimoRegistro: response.data[response.data.length - 1]
            });

            setPurchasePlanData(response.data);
            setStatusMessage(`✅ Plan recalculado para ${selectedProduct} - Stock: ${stockActual}, Combustible: ${fuelSituation}`);
            setShowInitialData(false); // Ya no mostrar datos iniciales después del primer recálculo

        } catch (error: any) {
            console.error("Error al recalcular:", error);
            setStatusMessage(`Error al recalcular: ${error.response?.data?.error || error.message}`);
        } finally {
            setIsRecalculating(false);
        }
    }, [stockActual, fuelSituation, initialPurchasePlanData, selectedProduct]);

    useEffect(() => {
        if (initialPurchasePlanData.length > 0 && selectedProduct && !showInitialData) {
            const timeoutId = setTimeout(() => {
                recalculatePlan();
            }, 1000);

            return () => clearTimeout(timeoutId);
        }
    }, [stockActual, fuelSituation, selectedProduct, recalculatePlan, initialPurchasePlanData.length, showInitialData]);


    useEffect(() => {

    }, [selectedProduct]);
    

    if (!state) {
        return <div style={{padding: '20px'}}><p>No se ha aprobado ningún escenario. Vuelve a <a href="/simulador">Simulación</a> para elegir un escenario.</p></div>;
    }


    console.log('📋 Datos del Plan de Compra en Plan.tsx:', {
        state: state,
        purchasePlanData: purchasePlanData,
        length: purchasePlanData?.length || 0,
        primerRegistro: purchasePlanData?.[0],
        ultimoRegistro: purchasePlanData?.[purchasePlanData.length - 1]
    });

    return (
        <div className="plan-container">
            <h2 className="plan-header">3. Plan de Compra y Logística Final</h2>
            <p className="status-info">
                <strong>Escenario Aprobado:</strong> <span className="status-success">{scenarioName.toUpperCase()}</span> | <span className={statusMessage.includes('❌') ? 'status-error' : 'status-success'}>{statusMessage}</span>
            </p>

            <div className="inputs-section">
                <h3 className="section-title">📦 Configurar Variables de Compra</h3>
                <p className="section-subtitle">Ajusta estos parámetros para recalcular el plan de compra automáticamente.</p>

                <div className="variables-grid">
                    <div className="input-group">
                        <label htmlFor="product-select">📊 Ver Plan por Producto:</label>
                        <select
                            id="product-select"
                            value={selectedProduct}
                            onChange={(e) => {
                                const newProduct = e.target.value;
                                setSelectedProduct(newProduct);
                                if (newProduct) {

                                    setPurchasePlanData([]);
                                    setStatusMessage(`Seleccionado: ${newProduct}. Recalculando plan...`);

                                } else {
                                    setPurchasePlanData([]);
                                    setStatusMessage(`Escenario aprobado: ${scenarioName.toUpperCase()}. Selecciona un producto para ver el plan.`);
                                }
                            }}
                            className="config-select"
                        >
                            <option value="">Selecciona un producto...</option>
                            {AVAILABLE_PRODUCTS.map(product => (
                                <option key={product} value={product}>
                                    {product}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className="input-group">
                        <label htmlFor="stock-actual">Stock Actual (Uds):</label>
                        <input
                            id="stock-actual"
                            type="number"
                            min="0"
                            value={stockActual}
                            onChange={(e) => setStockActual(Number(e.target.value))}
                            disabled={isRecalculating}
                            className="config-input"
                        />
                    </div>

                    <div className="input-group">
                        <label htmlFor="fuel-situation">Situación Combustible:</label>
                        <select
                            id="fuel-situation"
                            value={fuelSituation}
                            onChange={(e) => setFuelSituation(Number(e.target.value))}
                            disabled={isRecalculating}
                            className="config-select"
                        >
                            <option value={1}>1 - Normal (Lead time estándar)</option>
                            <option value={2}>2 - Crítico (Lead time elevado)</option>
                        </select>
                    </div>
                </div>

                {isRecalculating && (
                    <div className="recalculate-status">
                        <p className="status-text">🔄 Recalculando plan automáticamente...</p>
                    </div>
                )}
            </div>


            {showInitialData && (
                <div style={{ marginBottom: '20px', padding: '20px', backgroundColor: '#fff3cd', border: '1px solid #ffeaa7', borderRadius: '8px', borderLeft: '4px solid #f39c12' }}>
                    <h4 style={{ color: '#8b4513', margin: '0 0 10px 0' }}>⚠️ Configuración Inicial</h4>
                    <p style={{ margin: '0 0 10px 0', color: '#5d4e37' }}>
                        <strong>Escenario:</strong> {scenarioName}
                    </p>
                    <p style={{ margin: '0 0 10px 0', color: '#5d4e37' }}>
                        <strong>Estado:</strong> Los datos mostrados son los valores iniciales por defecto (Stock: 100, Combustible: Crítico).
                        Ajusta las variables arriba para recalcular el plan automáticamente.
                    </p>
                    <p style={{ margin: '0', color: '#8b4513', fontSize: '0.9em' }}>
                        💡 <strong>Nota:</strong> El plan se recalculará automáticamente cuando cambies Stock Actual o Situación Combustible.
                    </p>
                </div>
            )}


            {(purchasePlanData && purchasePlanData.length > 0) && (
                <div className="table-container">
                    <h3>📋 Detalle del Plan de Compra ({purchasePlanData.filter(item => !selectedProduct || item.PRODUCTO === selectedProduct).length} meses)</h3>


                    <div style={{ marginBottom: '2rem', padding: '1.5rem', backgroundColor: '#f8f9fa', borderRadius: '12px', border: '1px solid #dee2e6' }}>
                        <h4 style={{ margin: '0 0 1rem 0', color: '#495057', fontSize: '1.1em' }}>📊 Resumen Ejecutivo</h4>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1.5rem' }}>
                            {(() => {
                                const filteredData = purchasePlanData.filter(item => !selectedProduct || item.PRODUCTO === selectedProduct);
                                return (
                                    <>
                                        <div style={{ textAlign: 'center', padding: '1rem', backgroundColor: 'white', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
                                            <div style={{ fontSize: '2em', fontWeight: 'bold', color: '#007bff' }}>
                                                {filteredData.reduce((sum: number, item: PurchasePlanEntry) => sum + item.DEMANDA_PROYECTADA, 0).toLocaleString('es-AR')}
                                            </div>
                                            <div style={{ fontSize: '0.9em', color: '#6c757d' }}>Total Demanda Proyectada</div>
                                        </div>
                                        <div style={{ textAlign: 'center', padding: '1rem', backgroundColor: 'white', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
                                            <div style={{ fontSize: '2em', fontWeight: 'bold', color: '#28a745' }}>
                                                {filteredData.reduce((sum: number, item: PurchasePlanEntry) => sum + item.COMPRA_REQUERIDA, 0).toLocaleString('es-AR')}
                                            </div>
                                            <div style={{ fontSize: '0.9em', color: '#6c757d' }}>Total Compras Requeridas</div>
                                        </div>
                                        <div style={{ textAlign: 'center', padding: '1rem', backgroundColor: 'white', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
                                            <div style={{ fontSize: '2em', fontWeight: 'bold', color: '#ffc107' }}>
                                                {filteredData.reduce((sum: number, item: PurchasePlanEntry) => sum + item.STOCK_FINAL, 0).toLocaleString('es-AR')}
                                            </div>
                                            <div style={{ fontSize: '0.9em', color: '#6c757d' }}>Stock Final Total</div>
                                        </div>
                                        <div style={{ textAlign: 'center', padding: '1rem', backgroundColor: 'white', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
                                            <div style={{ fontSize: '2em', fontWeight: 'bold', color: '#dc3545' }}>
                                                {filteredData.filter((item: PurchasePlanEntry) => item.RECOMENDACION.includes('ALERTA') || item.RECOMENDACION.includes('ADVERTENCIA')).length}
                                            </div>
                                            <div style={{ fontSize: '0.9em', color: '#6c757d' }}>Meses con Alertas</div>
                                        </div>
                                    </>
                                );
                            })()}
                        </div>
                    </div>

                    <table className="purchase-table">
                        <thead>
                            <tr>
                                <th>Mes</th>
                                <th>Producto</th>
                                <th>Demanda Proy.</th>
                                <th>Stock Inicial</th>
                                <th>Compra Req.</th>
                                <th>Stock Final</th>
                                <th>Aviso Logístico</th>
                                <th>Recomendación</th>
                            </tr>
                        </thead>
                        <tbody>
                            {purchasePlanData
                                .filter(item => !selectedProduct || item.PRODUCTO === selectedProduct)
                                .map((p: PurchasePlanEntry, index: number) => (
                                <tr key={`${p.PRODUCTO}-${p.MES}-${index}`} className={
                                    p.RECOMENDACION.includes('ALERTA') ? 'alert-row' :
                                    p.RECOMENDACION.includes('ADVERTENCIA') ? 'warning-row' : ''
                                }>
                                    <td style={{ fontWeight: 'bold' }}>{MONTHS[p.MES - 1] || p.MES}</td>
                                    <td>{p.PRODUCTO}</td>
                                    <td style={{ textAlign: 'right' }}>{p.DEMANDA_PROYECTADA.toFixed(0)}</td>
                                    <td style={{ textAlign: 'right' }}>{p.STOCK_INICIAL.toFixed(0)}</td>
                                    <td style={{ textAlign: 'right', fontWeight: 'bold', color: p.COMPRA_REQUERIDA > 0 ? '#28a745' : '#6c757d' }}>
                                        {p.COMPRA_REQUERIDA.toFixed(0)}
                                    </td>
                                    <td style={{
                                        textAlign: 'right',
                                        fontWeight: 'bold',
                                        color: p.STOCK_FINAL < 50 ? '#dc3545' : p.STOCK_FINAL < 100 ? '#ffc107' : '#28a745'
                                    }}>
                                        {p.STOCK_FINAL.toFixed(0)}
                                    </td>
                                    <td style={{ fontSize: '0.9em', color: '#6c757d' }}>{p.AVISO}</td>
                                    <td style={{
                                        fontWeight: 'bold',
                                        color: p.RECOMENDACION.includes('ALERTA') ? '#dc3545' :
                                               p.RECOMENDACION.includes('ADVERTENCIA') ? '#ffc107' : '#28a745'
                                    }}>
                                        {p.RECOMENDACION}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
};

export default PurchasePlan;