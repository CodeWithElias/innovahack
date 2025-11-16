// src/components/Setup.tsx
import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import apiClient, { API_BASE_URL } from '../api/apiClient';
import './Setup.css';

const Setup: React.FC = () => {
    const [statusMessage, setStatusMessage] = useState<string>("Cargue su archivo de datis (CSV) para iniciar la simulación.");
    const [file, setFile] = useState<File | null>(null);
    const navigate = useNavigate();

    const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
        if (event.target.files && event.target.files.length > 0) {
            setFile(event.target.files[0]);
            setStatusMessage(`Archivo seleccionado: ${event.target.files[0].name}.`);
        }
    };
    
    // Función de Entrenamiento (POST /api/upload/ y POST /api/train/)
    const handleTrainModel = async () => {
        if (!file) {
            setStatusMessage("❌ Error: Selecciona un archivo CSV primero.");
            return;
        }
        
        setStatusMessage("Cargando y entrenando el modelo... Por favor espera.");
        const formData = new FormData();
        formData.append('file', file);
        
        try {
            // 1. UPLOAD (POST /api/upload/)
            await axios.post(API_BASE_URL + 'upload/', formData, {
                 headers: { 'Content-Type': 'multipart/form-data' },
            });
            setStatusMessage("CSV Subido correctamente. Entrenando...");
            
            // 2. TRAIN (POST /api/train/)
            const trainResponse = await apiClient.post('train/', {});
            
            setStatusMessage(`🧠 ${trainResponse.data.status}. ¡Modelo listo!`);
            
            // Si el entrenamiento fue exitoso, navegamos al simulador.
            setTimeout(() => navigate('/simulador'), 1500); 

        } catch (error: any) {
            const msg = error.response?.data?.error || "Fallo de conexión. ¿Está corriendo Django?";
            setStatusMessage(`❌ Error: ${msg}`);
            console.error("Error en el proceso de Setup:", error);
        }
    };
    
    return (
        <div className="setup-container">
            <h2 className="setup-header">1.  Carga de datos y configuración inicial</h2>

            <div className="status-box">
                {statusMessage.includes("Cargando") && <span className="spinner">⚙️</span>}
                {statusMessage}
            </div>

            <div className="controls-group">
                <input
                    type="file"
                    onChange={handleFileUpload}
                    accept=".csv"
                    className="input-file"
                />
                <button
                    onClick={handleTrainModel}
                    disabled={!file || statusMessage.includes("Cargando")}
                    className="btn-train"
                >
                    Generar
                </button>
            </div>

            {statusMessage.includes("Error") && (
                <div className="status-box status-error">
                    Por favor, revisa el formato de tu CSV y la consola del navegador.
                </div>
            )}
        </div>
    );
};

export default Setup;