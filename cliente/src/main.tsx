import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
// HU-05: unica hoja de estilos del cliente. Ninguna pantalla importa CSS propio.
import './estilos/estilos.css'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
