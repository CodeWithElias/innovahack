import  { useState, useMemo, useCallback } from 'react';
import { Bar, Line } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, LineElement, PointElement, Title, Tooltip, Legend } from 'chart.js';
import { useNavigate } from 'react-router-dom';
import apiClient from '../api/apiClient';
import './Simulator.css';

ChartJS.register(CategoryScale, LinearScale, BarElement, LineElement, PointElement, Title, Tooltip, Legend);

interface RecommendationResult {
    peor: string;
    conservador: string;
    mejor: string;
}

interface SimulationPayload {
    PRODUCTO: string;
    MES: number;
    CLIMA: number;
    FERIA: number;
    CAMBIO_PRECIO_PCT: number;
    CRECIMIENTO_ORGANICO: number;
}

interface SimulationResult {
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

interface PurchasePlanEntry {
    MES: number;
    PRODUCTO: string;
    DEMANDA_PROYECTADA: number;
    STOCK_INICIAL: number;
    COMPRA_REQUERIDA: number;
    STOCK_FINAL: number;
    AVISO: string;
    RECOMENDACION: string;
}


const AVAILABLE_PRODUCTS = [
    "ABERDEN_ANGUS",
    "SEMBRADORA_ELECTRICA",
    "SEMILLA DE MAIZ",
    "SEMILLA DE SORGO",
    "HOMEPATIA",
    "DEFENSIVOS",
    "ALIMENTO BALANCEADO"
];


const MONTHS = ['Nov', 'Dic', 'Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct'];
const INITIAL_MONTH_NUMBERS = [11, 12, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10]; // 12 meses


interface MonthInputs {
    CLIMA: number;
    FERIA: number;
    CAMBIO_PRECIO_PCT: number;
    CRECIMIENTO_ORGANICO: number;
}

type ScenarioName = 'peor' | 'conservador' | 'mejor';
type ScenarioInputs = Record<ScenarioName, MonthInputs[]>;


const Simulator = () => {
    const navigate = useNavigate();
    
    const [statusMessage, setStatusMessage] = useState<string>("Listo para simular.");
    const [selectedProduct, setSelectedProduct] = useState<string>(AVAILABLE_PRODUCTS[0]);

    // Función para generar valores aleatorios iniciales para un mes
    const generateRandomMonthInputs = (): MonthInputs => ({
        CLIMA: Math.floor(Math.random() * 3) + 1, // 1, 2, o 3
        FERIA: Math.floor(Math.random() * 2), // 0 o 1
        CAMBIO_PRECIO_PCT: Math.floor(Math.random() * 41) - 20, // -20 a +20
        CRECIMIENTO_ORGANICO: Math.floor(Math.random() * 11), // 0 a 10
    });


    const [scenarioInputs, setScenarioInputs] = useState<ScenarioInputs>({
        peor: INITIAL_MONTH_NUMBERS.map(() => generateRandomMonthInputs()),
        conservador: INITIAL_MONTH_NUMBERS.map(() => generateRandomMonthInputs()),
        mejor: INITIAL_MONTH_NUMBERS.map(() => generateRandomMonthInputs()),
    });

    const [selectedScenario, setSelectedScenario] = useState<ScenarioName>('conservador');


    const [autoSimulate, setAutoSimulate] = useState<boolean>(true);
    const [simulationTimeout, setSimulationTimeout] = useState<number | null>(null);


    const [results, setResults] = useState<Record<ScenarioName, SimulationResult[] | null>>({
        peor: null, conservador: null, mejor: null,
    });
    const [recommendations, setRecommendations] = useState<RecommendationResult | null>(null);
    const [purchasePlan, setPurchasePlan] = useState<PurchasePlanEntry[] | null>(null);
    const [approvedScenario, setApprovedScenario] = useState<ScenarioName | null>(null);


    const updateMonthInput = useCallback((scenario: ScenarioName, monthIndex: number, field: keyof MonthInputs, value: number) => {
        console.log(`🔄 Actualizando input mensual: ${scenario} mes ${monthIndex} campo ${field} = ${value}`);
        setScenarioInputs(prev => ({
            ...prev,
            [scenario]: prev[scenario].map((month, index) =>
                index === monthIndex ? { ...month, [field]: value } : month
            )
        }));


        if (autoSimulate) {
            console.log("⏰ Programando simulación automática por cambio mensual...");
            if (simulationTimeout) {
                clearTimeout(simulationTimeout);
            }
            const timeout = setTimeout(() => {
                console.log("🚀 Ejecutando simulación automática por cambio mensual...");
                handleSimulateAll();
            }, 1000); // Esperar 1 segundo después del último cambio
            setSimulationTimeout(timeout);
        }
    }, [autoSimulate, simulationTimeout]);


    const getRecommendations = useCallback(async (simResults: Record<ScenarioName, SimulationResult[] | null>) => {
        setStatusMessage("Analizando resultados...");
        try {

            const payload = {
                peor: simResults.peor,
                conservador: simResults.conservador,
                mejor: simResults.mejor
            };

            console.log(`📤 Enviando datos para recomendaciones:`, {
                endpoint: 'get-recommendations/',
                payload: payload,
                totalRegistrosPeor: simResults.peor?.length || 0,
                totalRegistrosConservador: simResults.conservador?.length || 0,
                totalRegistrosMejor: simResults.mejor?.length || 0
            });

            const response = await apiClient.post('get-recommendations/', payload);

            console.log(`📥 Respuesta de recomendaciones recibida:`, {
                status: response.status,
                data: response.data
            });

            setRecommendations(response.data);
            setStatusMessage("✅ Simulación completa y recomendaciones generadas.");
        } catch (error: any) {

            console.warn("⚠️ API de recomendaciones no disponible, usando mock:", error.message);
            const totalConservador = simResults.conservador?.reduce((sum, r) => sum + r.CANTIDAD_PROYECTADA_FINAL, 0) || 0;
            const mockRecommendations = {
                peor: `Se proyecta un volumen de ${Math.round(totalConservador * 0.75)} unidades para el escenario Peor.`,
                conservador: `Se proyecta un volumen de ${Math.round(totalConservador)} unidades para el escenario Conservador.`,
                mejor: `Se proyecta un volumen de ${Math.round(totalConservador * 1.25)} unidades para el escenario Mejor.`,
            };

            console.log(`📋 Usando recomendaciones mock:`, mockRecommendations);

            setRecommendations(mockRecommendations);
            setStatusMessage("✅ Simulación completa (usando recomendaciones mock).");
        }
    }, []);


    const getSelectedProductData = () => {
        return { PRODUCTO: selectedProduct };
    };


    const generateScenarioPayload = (scenarioName: ScenarioName): SimulationPayload[] => {
        const payload: SimulationPayload[] = [];


        AVAILABLE_PRODUCTS.forEach(product => {

            INITIAL_MONTH_NUMBERS.forEach((month, index) => {
                const monthInputs = scenarioInputs[scenarioName][index];

                payload.push({
                    PRODUCTO: product,
                    MES: month,
                    CLIMA: monthInputs.CLIMA,
                    FERIA: monthInputs.FERIA,
                    CAMBIO_PRECIO_PCT: monthInputs.CAMBIO_PRECIO_PCT,
                    CRECIMIENTO_ORGANICO: monthInputs.CRECIMIENTO_ORGANICO,
                });
            });
        });

        return payload;
    };


    const mockGetRecommendations = (simResults: Record<ScenarioName, SimulationResult[]>) => {
        const totalConservador = simResults.conservador?.reduce((sum, r) => sum + r.CANTIDAD_PROYECTADA_FINAL, 0) || 0;
        return {
            peor: `Se proyecta un volumen de ${Math.round(totalConservador * 0.75)} unidades para el escenario Peor.`,
            conservador: `Se proyecta un volumen de ${Math.round(totalConservador)} unidades para el escenario Conservador.`,
            mejor: `Se proyecta un volumen de ${Math.round(totalConservador * 1.25)} unidades para el escenario Mejor.`,
        };
    };

    const handleSimulateAll = async () => {
        setStatusMessage("Calculando 3 escenarios...");
        const scenarioNames: ScenarioName[] = ['peor', 'conservador', 'mejor'];
        const newResults: Record<ScenarioName, SimulationResult[] | null> = { peor: null, conservador: null, mejor: null };

        try {

            for (const name of scenarioNames) {
                const payload = generateScenarioPayload(name);
                console.log(`📤 Enviando datos de simulación para escenario ${name}:`, {
                    endpoint: 'simulate-projection/',
                    payload: payload,
                    totalRegistros: payload.length
                });

                const response = await apiClient.post<SimulationResult[]>('simulate-projection/', payload);

                console.log(`📥 Respuesta recibida para escenario ${name}:`, {
                    status: response.status,
                    data: response.data,
                    totalRegistros: response.data.length,
                    primerRegistro: response.data[0]
                });

                newResults[name] = response.data;
            }

            setResults(newResults as any);
            await getRecommendations(newResults as any);

        } catch (error: any) {
            setStatusMessage(`❌ Error en la simulación: ${error.response?.data?.error || error.message}`);
            console.error("❌ Error en simulación:", {
                error: error.message,
                response: error.response?.data,
                status: error.response?.status
            });
        }
    };
    

    const [chartType, setChartType] = useState<'bar' | 'line'>('line');

    const chartData = useMemo(() => {
        if (!results.conservador && !results.peor && !results.mejor) return { labels: MONTHS, datasets: [] };


        const productsToShow = selectedProduct ? [selectedProduct] : AVAILABLE_PRODUCTS;

        const datasets = [];


        for (const product of productsToShow) {

            const aggregateData = (dataArray: SimulationResult[] | null) => {
                if (!dataArray) return [];
                return MONTHS.map((_, index) => {
                    const monthData = dataArray.filter(r => r.PRODUCTO === product && r.MES === INITIAL_MONTH_NUMBERS[index]);
                    return monthData.reduce((sum, r) => sum + r.CANTIDAD_PROYECTADA_FINAL, 0);
                });
            };

            const createDataset = (label: string, color: string, dataArray: SimulationResult[] | null) => ({
                label: selectedProduct ? `${label}` : `${label} - ${product}`,
                data: aggregateData(dataArray),
                backgroundColor: color,
                borderColor: color,
                borderWidth: 2,
                borderRadius: chartType === 'bar' ? 4 : 0,
                fill: chartType === 'line' ? false : true,
                tension: chartType === 'line' ? 0.4 : 0,
                pointRadius: chartType === 'line' ? 4 : 0,
                pointHoverRadius: chartType === 'line' ? 6 : 0,
            });

            datasets.push(
                createDataset('Peor', 'rgba(239, 68, 68, 0.8)', results.peor),
                createDataset('Conservador', 'rgba(59, 130, 246, 0.8)', results.conservador),
                createDataset('Mejor', 'rgba(16, 185, 129, 0.8)', results.mejor)
            );
        }

        return {
            labels: MONTHS,
            datasets: datasets,
        };
    }, [results, chartType, selectedProduct]);

    const chartOptions = { // Added detailed options for better chart styling
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            title: {
                display: false, // Removido porque ya está en el header
            },
            legend: {
                position: 'top' as const,
                labels: {
                    usePointStyle: true,
                    padding: 20,
                    font: {
                        size: 12
                    }
                }
            },
            tooltip: {
                backgroundColor: 'rgba(0, 0, 0, 0.8)',
                titleColor: 'white',
                bodyColor: 'white',
                callbacks: {
                    label: function(context: any) {
                        let label = context.dataset.label || '';
                        if (label) {
                            label += ': ';
                        }
                        if (context.parsed.y !== null) {
                            label += new Intl.NumberFormat('es-AR').format(context.parsed.y) + ' Unidades';
                        }
                        return label;
                    }
                }
            }
        },
        scales: {
            x: {
                title: {
                    display: true,
                    text: 'Meses',
                    font: {
                        size: 14,
                        weight: 'bold'
                    }
                },
                grid: {
                    display: false
                }
            },
            y: {
                beginAtZero: true,
                title: {
                    display: true,
                    text: 'Volumen Proyectado (Unidades)',
                    font: {
                        size: 14,
                        weight: 'bold'
                    }
                },
                grid: {
                    color: 'rgba(0, 0, 0, 0.1)'
                },
                ticks: {
                    callback: function(value: any) {
                        return new Intl.NumberFormat('es-AR').format(value);
                    }
                }
            }
        },
        interaction: {
            intersect: false,
            mode: 'index' as const
        },
        elements: {
            point: {
                hoverRadius: 8
            }
        }
    };


    const handleApproveScenario = async (scenario: ScenarioName) => {
        if (results[scenario]) {
            setStatusMessage(`Generando Plan de Compra para escenario ${scenario}...`);

            try {

                const purchasePayload = {
                    stock_actual: 100, // Valor por defecto, se configurará en Plan
                    situacion_combustible: 2, // Valor por defecto, se configurará en Plan
                    proyeccion_ventas: results[scenario]?.map(item => ({
                        MES: item.MES,
                        PRODUCTO: item.PRODUCTO,
                        LEAD_TIME_DIAS: item.LEAD_TIME_DIAS,
                        CANT_MIN_COMPRAS: item.CANT_MIN_COMPRAS,
                        CANTIDAD_PROYECTADA_FINAL: item.CANTIDAD_PROYECTADA_FINAL,
                        PRECIO_DE_COMPRA: item.PRECIO_DE_COMPRA
                    })) || []
                };

                console.log(`📤 Enviando datos para generar plan de compra:`, {
                    endpoint: 'purchase-plan/',
                    escenario: scenario,
                    payload: purchasePayload,
                    totalRegistros: purchasePayload.proyeccion_ventas.length,
                    primerRegistro: purchasePayload.proyeccion_ventas[0]
                });

                const response = await apiClient.post<PurchasePlanEntry[]>('purchase-plan/', purchasePayload);

                console.log(`📥 Respuesta del plan de compra recibida:`, {
                    status: response.status,
                    data: response.data,
                    totalRegistros: response.data.length,
                    primerRegistro: response.data[0],
                    ultimoRegistro: response.data[response.data.length - 1]
                });

                navigate('/compras', {
                    state: {
                        purchasePlan: response.data,
                        scenarioName: scenario
                    }
                });

                setStatusMessage(`✅ Plan de Compra generado. Navegando a vista de Plan...`);
            } catch (error: any) {
                setStatusMessage(`❌ Error al generar Plan de Compra: ${error.response?.data?.error || error.message}`);
                console.error("❌ Error generando plan de compra:", {
                    error: error.message,
                    response: error.response?.data,
                    status: error.response?.status
                });
            }
        } else {
            console.error(`No hay resultados para el escenario ${scenario} para aprobar.`);
        }
    };


    return (
        <div className="simulator-dashboard">
            <div className="dashboard-header-bar">
                <h2 className="dashboard-title">Simulador de Plan de Venta & Compras</h2>
                <div className="header-controls">
                    <div className="product-selector-group">
                        <label htmlFor="product-select">📊 Ver Plan de Ventas por Producto:</label>
                        <select
                            id="product-select"
                            value={selectedProduct}
                            onChange={(e) => setSelectedProduct(e.target.value)}
                            className="select-control"
                        >
                            <option value="">Todos los productos</option>
                            {AVAILABLE_PRODUCTS.map(product => (
                                <option key={product} value={product}>
                                    {product}
                                </option>
                            ))}
                        </select>
                    </div>
                    <button
                        className="btn-simulate-main"
                        onClick={handleSimulateAll}
                        disabled={statusMessage.includes("Calculando")}
                    >
                        {statusMessage.includes("Calculando") ? 'Calculando...' : '▶️ RUN SIMULACIÓN (3 Escenarios)'}
                    </button>
                </div>
            </div>


            <p className={`status-bar ${statusMessage.includes('❌') ? 'status-error' : 'status-success'}`}>
                <strong>Status:</strong> {statusMessage}
            </p>

            <div className="dashboard-grid">
                

                <div className="panel inputs-panel">
                    <h3 className="panel-title">12 Meses: Ajuste de Variables</h3>
                    <p className="panel-subtitle">Modifica las variables exógenas para cada escenario.</p>


                    <div className="purchase-variables-note">
                        <p className="note-text">
                            💡 <strong>Nota:</strong> Las variables de Stock Actual y Situación Combustible
                            se configurarán en la vista del Plan de Compra después de aprobar un escenario.
                        </p>
                    </div>


                    <div className="scenario-tabs">
                        {(['peor', 'conservador', 'mejor'] as const).map(scenario => (
                            <button
                                key={scenario}
                                className={`tab-button ${selectedScenario === scenario ? 'active' : ''}`}
                                onClick={() => setSelectedScenario(scenario)}
                            >
                                {scenario.toUpperCase()}
                            </button>
                        ))}
                    </div>


                    <div className="auto-simulate-control">
                        <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.9rem' }}>
                            <input
                                type="checkbox"
                                checked={autoSimulate}
                                onChange={(e) => setAutoSimulate(e.target.checked)}
                            />
                            🔄 Actualización automática (cada cambio dispara simulación)
                        </label>
                    </div>


                    <div className="inputs-table-container">
                        <table className="inputs-table">
                            <thead>
                                <tr>
                                    <th>Mes</th>
                                    <th>CLIMA (1-3)</th>
                                    <th>FERIA (0-1)</th>
                                    <th>Precio %</th>
                                    <th>Crec. Org. %</th>
                                </tr>
                            </thead>
                            <tbody>
                                {INITIAL_MONTH_NUMBERS.map((month, index) => (
                                    <tr key={month}>
                                        <td className="month-cell">{MONTHS[index]}</td>
                                        <td>
                                            <input
                                                type="number"
                                                min="1"
                                                max="3"
                                                value={scenarioInputs[selectedScenario][index].CLIMA}
                                                onChange={(e) => updateMonthInput(selectedScenario, index, 'CLIMA', Number(e.target.value))}
                                                className="table-input"
                                            />
                                        </td>
                                        <td>
                                            <input
                                                type="number"
                                                min="0"
                                                max="1"
                                                value={scenarioInputs[selectedScenario][index].FERIA}
                                                onChange={(e) => updateMonthInput(selectedScenario, index, 'FERIA', Number(e.target.value))}
                                                className="table-input"
                                            />
                                        </td>
                                        <td>
                                            <input
                                                type="number"
                                                step="1"
                                                value={scenarioInputs[selectedScenario][index].CAMBIO_PRECIO_PCT}
                                                onChange={(e) => updateMonthInput(selectedScenario, index, 'CAMBIO_PRECIO_PCT', Number(e.target.value))}
                                                className="table-input"
                                            />
                                        </td>
                                        <td>
                                            <input
                                                type="number"
                                                step="1"
                                                value={scenarioInputs[selectedScenario][index].CRECIMIENTO_ORGANICO}
                                                onChange={(e) => updateMonthInput(selectedScenario, index, 'CRECIMIENTO_ORGANICO', Number(e.target.value))}
                                                className="table-input"
                                            />
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                </div>


                <div className="panel results-panel">
                    

                    <div className="chart-card">
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                            <h3 className="chart-title">
                                Proyección Comparativa de Volumen
                                {selectedProduct ? ` - ${selectedProduct}` : ' - Todos los Productos'}
                            </h3>
                            <div style={{ display: 'flex', gap: '0.5rem' }}>
                                <button
                                    onClick={() => setChartType('line')}
                                    style={{
                                        padding: '0.5rem 1rem',
                                        backgroundColor: chartType === 'line' ? '#007bff' : '#f8f9fa',
                                        color: chartType === 'line' ? 'white' : '#333',
                                        border: '1px solid #dee2e6',
                                        borderRadius: '0.25rem',
                                        cursor: 'pointer',
                                        fontSize: '0.875rem'
                                    }}
                                >
                                    📈 Líneas (Recomendado)
                                </button>
                                <button
                                    onClick={() => setChartType('bar')}
                                    style={{
                                        padding: '0.5rem 1rem',
                                        backgroundColor: chartType === 'bar' ? '#007bff' : '#f8f9fa',
                                        color: chartType === 'bar' ? 'white' : '#333',
                                        border: '1px solid #dee2e6',
                                        borderRadius: '0.25rem',
                                        cursor: 'pointer',
                                        fontSize: '0.875rem'
                                    }}
                                >
                                    📊 Barras
                                </button>
                            </div>
                        </div>
                        <div className="chart-container">
                            {chartType === 'bar' ? (
                                <Bar data={chartData} options={chartOptions as any} />
                            ) : (
                                <Line data={chartData} options={chartOptions as any} />
                            )}
                        </div>
                    </div>


                    <div className="summary-section">
                        {/* Recommendations */}
                        <div className="recommendations-box">
                            <h3 className="summary-title">🤖 Recomendaciones del Algoritmo</h3>
                            {recommendations ? (
                                <div className="recommendation-list">
                                    <div className="recommendation-item">
                                        <strong>Peor:</strong> {recommendations.peor}
                                    </div>
                                    <div className="recommendation-item">
                                        <strong>Conservador:</strong> {recommendations.conservador}
                                    </div>
                                    <div className="recommendation-item">
                                        <strong>Mejor:</strong> {recommendations.mejor}
                                    </div>
                                </div>
                            ) : (
                                <p className="text-gray-500">Ejecute la simulación para recibir recomendaciones...</p>
                            )}
                        </div>


                        <div className="decision-section">
                            <h3 className="summary-title">📈 Aprobar Plan de Compra</h3>
                            <p className="text-sm text-gray-600 mb-4">Elige el escenario para generar el Plan de Compras de 12 meses:</p>
                            <div className="approve-buttons">
                                {Object.keys(results).map((key) => (
                                    <button
                                        key={key}
                                        className={`btn-approve btn-${key}`}
                                        onClick={() => handleApproveScenario(key as ScenarioName)}
                                        disabled={!results[key as ScenarioName]}
                                    >
                                        Aprobar {key.toUpperCase()}
                                    </button>
                                ))}
                            </div>


                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Simulator;