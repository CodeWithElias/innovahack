import axios, { type AxiosInstance } from 'axios';

export const API_BASE_URL = 'http://127.0.0.1:8000/api/'; 

const apiClient: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  headers: {

    'Content-Type': 'application/json', 
  },
});

export default apiClient;