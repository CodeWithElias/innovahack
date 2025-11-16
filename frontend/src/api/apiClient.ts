// src/api/apiClient.ts
import axios, { type AxiosInstance } from 'axios';

// AJUSTA ESTE PUERTO SI CORRES DJANGO EN 8001
export const API_BASE_URL = 'http://127.0.0.1:8000/api/'; 

const apiClient: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    // El tipo de contenido por defecto será JSON
    'Content-Type': 'application/json', 
  },
});

export default apiClient;