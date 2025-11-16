import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Setup from './componentes/Setup';
import Simulator from './componentes/Simulator';
import Plan from './componentes/Plan';
import logo from './assets/LOGO Totalpec blanco.png';
import './App.css';

function App() {
  return (
    <BrowserRouter>
      <div className="app-container">
        <header className="app-header">
          <img src={logo} alt="Totalpec Logo" className="app-logo" />
          <h1 className="app-title">Sistema de Simulación y Planificación</h1>
        </header>
        <Routes>
          <Route path="/" element={<Setup />} />
          <Route path="/simulador" element={<Simulator />} />
          <Route path="/compras" element={<Plan />} />
        </Routes>
      </div>
    </BrowserRouter>
  );
}

export default App;
