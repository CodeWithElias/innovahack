import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Setup from './componentes/Setup';
import Simulator from './componentes/Simulator';
import Plan from './componentes/Plan';
import './App.css';

function App() {
  return (
    <BrowserRouter>
      <div className="app-container">
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
