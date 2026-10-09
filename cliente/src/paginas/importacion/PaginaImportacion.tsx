import { useState } from 'react';
import { api } from '../../servicios/api';
import { DisenoApp } from '../../componentes/DisenoApp';
export function PaginaImportacion() {
  const usuarioRaw = localStorage.getItem('ganado_usuario');
  const usuario = usuarioRaw ? JSON.parse(usuarioRaw) : { nombre: 'Usuario', rol: 'propietario' };

  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [validacion, setValidacion] = useState<any>(null);
  const [estrategia, setEstrategia] = useState<'omitir' | 'actualizar'>('omitir');
  const [resultado, setResultado] = useState<any>(null);

  // Rol de solo lectura
  const esSocio = usuario.rol === 'socio';

  const descargarPlantilla = async () => {
    const res = await api.plantillaImportacion();
    const blob = new Blob([res.contenidoCsv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'plantilla_ganado.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleArchivo = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      setCsvFile(file);
      const text = await file.text();
      const res = await api.validarImportacion({ csv: text });
      setValidacion(res);
    }
  };

  const procesar = async () => {
    if (!csvFile) return;
    const text = await csvFile.text();
    const res = await api.ejecutarImportacion({ csv: text, estrategia_duplicados: estrategia });
    setResultado(res);
  };

  return (
    <DisenoApp
      activo="importacion"
      ruta={['Mi rancho', 'Importación Masiva (CSV)']}
      titulo="Importar Ganado"
      usuario={usuario}
    >
      {esSocio ? (
        <div className="tarjeta mt-8">
          <div style={{ padding: '24px', textAlign: 'center', color: '#854d0e', backgroundColor: '#fef08a', borderRadius: '8px' }}>
            <strong>Acceso Restringido:</strong> Tu rol de Socio tiene acceso de solo lectura y no puede importar animales.
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', marginTop: '32px' }}>
          
          {!resultado ? (
            <>
              <div className="tarjeta" style={{ padding: '24px' }}>
                <h3 style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '8px' }}>1. Descargar Plantilla</h3>
                <p style={{ marginBottom: '16px', color: '#4b5563' }}>Descarga la plantilla oficial en CSV con las columnas exactas para subir tus animales.</p>
                <button 
                  onClick={descargarPlantilla}
                  style={{ background: '#166534', color: 'white', padding: '8px 16px', borderRadius: '4px', cursor: 'pointer', border: 'none' }}
                >
                  Descargar Plantilla CSV
                </button>
              </div>

              <div className="tarjeta" style={{ padding: '24px' }}>
                <h3 style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '8px' }}>2. Subir Archivo</h3>
                <input type="file" accept=".csv" onChange={handleArchivo} style={{ display: 'block', width: '100%', padding: '16px', border: '2px dashed #cbd5e1', borderRadius: '8px' }} />
              </div>

              {validacion && (
                <div className="tarjeta" style={{ padding: '24px' }}>
                  <h3 style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '16px' }}>3. Validación de Datos</h3>
                  <p style={{ color: '#166534', fontWeight: 'bold' }}>✅ {validacion.validos} animales válidos listos para importar.</p>
                  
                  {validacion.duplicados && validacion.duplicados.length > 0 && (
                    <div style={{ marginTop: '16px', padding: '16px', backgroundColor: '#fee2e2', color: '#991b1b', borderRadius: '8px' }}>
                      <h4 style={{ fontWeight: 'bold', marginBottom: '8px' }}>¡Atención! Se detectaron duplicados</h4>
                      <p style={{ marginBottom: '12px' }}>La caravana <strong>{validacion.duplicados[0].caravana}</strong> ya existe en el rancho.</p>
                      
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                          <input type="radio" checked={estrategia === 'omitir'} onChange={() => setEstrategia('omitir')} />
                          Omitir duplicados (no registrar los repetidos)
                        </label>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                          <input type="radio" checked={estrategia === 'actualizar'} onChange={() => setEstrategia('actualizar')} />
                          Actualizar existentes (sobreescribir datos del animal actual)
                        </label>
                      </div>
                    </div>
                  )}
                  
                  <button 
                    onClick={procesar}
                    style={{ marginTop: '24px', background: '#166534', color: 'white', padding: '12px 24px', borderRadius: '4px', cursor: 'pointer', border: 'none', fontWeight: 'bold', width: '100%' }}
                  >
                    Confirmar y Procesar Importación
                  </button>
                </div>
              )}
            </>
          ) : (
            <div className="tarjeta" style={{ padding: '32px', textAlign: 'center' }}>
              <div style={{ fontSize: '48px', marginBottom: '16px' }}>🎉</div>
              <h3 style={{ fontSize: '24px', fontWeight: 'bold', color: '#166534', marginBottom: '16px' }}>¡Importación Exitosa!</h3>
              <p style={{ fontSize: '18px', marginBottom: '8px' }}>
                <strong>{resultado.importados}</strong> animales registrados.
              </p>
              <p style={{ fontSize: '18px', marginBottom: '8px', color: '#854d0e' }}>
                <strong>{resultado.omitidos}</strong> duplicados omitidos.
              </p>
              <p style={{ fontSize: '18px', marginBottom: '24px', color: '#1e40af' }}>
                <strong>{resultado.actualizados}</strong> actualizados.
              </p>
              
              <button 
                onClick={() => { setResultado(null); setValidacion(null); setCsvFile(null); }}
                style={{ background: '#e2e8f0', color: '#1e293b', padding: '8px 16px', borderRadius: '4px', cursor: 'pointer', border: 'none', fontWeight: 'bold' }}
              >
                Realizar otra importación
              </button>
            </div>
          )}
        </div>
      )}
    </DisenoApp>
  );
}
