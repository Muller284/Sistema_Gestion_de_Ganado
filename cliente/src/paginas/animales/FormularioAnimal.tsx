import { useState, type FormEvent } from 'react';
import { api } from '../../servicios/api';

interface Props {
  alTerminar: () => void;
}

type PayloadAnimal = Record<string, unknown> & {
  identificador: string;
  caravana: string;
  numero: string;
  sexo: string;
  categoria: string;
  estado: string;
  nombre?: string;
  raza?: string;
  fechaNacimiento?: string;
  corral?: string;
  corralAsignado?: string;
  corral_id?: string;
  peso?: number;
  pesoInicial?: number;
  peso_inicial?: number;
};

interface ErrorApi {
  response?: { data?: { mensaje?: string } };
  mensaje?: string;
  message?: string;
}

export function FormularioAnimal({ alTerminar }: Props) {
  const [identificador, setIdentificador] = useState('');
  const [nombre, setNombre] = useState('');
  const [raza, setRaza] = useState('');
  const [sexo, setSexo] = useState('hembra');
  const [categoria, setCategoria] = useState('vaquilla');
  const [fechaNacimiento, setFechaNacimiento] = useState('');
  const [corral, setCorral] = useState('');
  const [peso, setPeso] = useState('');
  const [error, setError] = useState('');
  const [guardando, setGuardando] = useState(false);

  const manejarEnvio = async (e: FormEvent) => {
    e.preventDefault();
    setError('');

    const valorIdentificador = identificador.trim();
    if (!valorIdentificador) {
      setError('El identificador (caravana) es obligatorio.');
      return;
    }

    try {
      setGuardando(true);
      
      // Enviamos todas las variantes posibles del campo para asegurar que el backend lo reciba sí o sí
      const payload: PayloadAnimal = {
        identificador: valorIdentificador,
        caravana: valorIdentificador,
        numero: valorIdentificador,
        sexo: sexo.toLowerCase(),
        categoria: categoria.toLowerCase(),
        estado: 'activo'
      };

      if (nombre.trim()) payload.nombre = nombre.trim();
      if (raza.trim()) payload.raza = raza.trim();
      if (fechaNacimiento) payload.fechaNacimiento = fechaNacimiento;
      if (corral.trim()) {
        payload.corral = corral.trim();
        payload.corralAsignado = corral.trim();
        payload.corral_id = corral.trim();
      }
      if (peso) {
        payload.peso = Number(peso);
        payload.pesoInicial = Number(peso);
        payload.peso_inicial = Number(peso);
      }

      await api.registrarAnimal(payload);

      alTerminar();
    } catch (err: unknown) {
      console.error('Error al registrar animal:', err);
      const errorApi = (typeof err === 'object' && err !== null ? err : {}) as ErrorApi;
      const mensajeServidor = errorApi.response?.data?.mensaje || errorApi.mensaje || errorApi.message || 'Hubo un error al guardar el animal.';
      setError(mensajeServidor);
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div className="col g16">
      {error && (
        <div className="aviso aviso-error" style={{ background: '#fee2e2', color: '#991b1b', padding: '12px', borderRadius: '6px', marginBottom: '16px' }}>
          <p><strong>Error:</strong> {error}</p>
        </div>
      )}

      <form onSubmit={manejarEnvio} className="col g16">
        <div className="fila g16">
          <div className="campo col g8" style={{ flex: 1 }}>
            <label className="etiqueta">Caravana (Obligatorio) *</label>
            <input 
              type="text" 
              placeholder="Ej: 4471" 
              value={identificador}
              onChange={e => setIdentificador(e.target.value)}
              className="dato"
              required
            />
            <span className="detalle">Número de identificación único.</span>
          </div>

          <div className="campo col g8" style={{ flex: 1 }}>
            <label className="etiqueta">Nombre o alias (Opcional)</label>
            <input 
              type="text" 
              placeholder="Ej: Lucero" 
              value={nombre}
              onChange={e => setNombre(e.target.value)}
              className="dato"
            />
          </div>
        </div>

        <div className="fila g16">
          <div className="campo col g8" style={{ flex: 1 }}>
            <label className="etiqueta">Raza</label>
            <input 
              type="text" 
              placeholder="Seleccionar raza..." 
              value={raza}
              onChange={e => setRaza(e.target.value)}
              className="dato"
            />
          </div>

          <div className="campo col g8" style={{ flex: 1 }}>
            <label className="etiqueta">Sexo</label>
            <select 
              value={sexo} 
              onChange={e => setSexo(e.target.value)}
              className="dato"
            >
              <option value="hembra">Hembra</option>
              <option value="macho">Macho</option>
            </select>
          </div>
        </div>

        <div className="fila g16">
          <div className="campo col g8" style={{ flex: 1 }}>
            <label className="etiqueta">Categoría</label>
            <select 
              value={categoria} 
              onChange={e => setCategoria(e.target.value)}
              className="dato"
            >
              <option value="vaquilla">Vaquilla</option>
              <option value="vaca">Vaca</option>
              <option value="toro">Toro</option>
              <option value="ternero">Ternero</option>
              <option value="novillo">Novillo</option>
            </select>
          </div>

          <div className="campo col g8" style={{ flex: 1 }}>
            <label className="etiqueta">Fecha de nacimiento (Opcional)</label>
            <input 
              type="date" 
              value={fechaNacimiento}
              onChange={e => setFechaNacimiento(e.target.value)}
              className="dato"
            />
          </div>
        </div>

        <div className="campo col g8">
          <label className="etiqueta">Corral asignado</label>
          <input 
            type="text" 
            placeholder="Sin asignar" 
            value={corral}
            onChange={e => setCorral(e.target.value)}
            className="dato"
          />
        </div>

        <div className="campo col g8">
          <label className="etiqueta">Peso inicial (kg)</label>
          <input 
            type="number" 
            step="0.1"
            placeholder="0.0" 
            value={peso}
            onChange={e => setPeso(e.target.value)}
            className="dato"
          />
        </div>

        <div className="fila g12 derecha" style={{ marginTop: '16px' }}>
          <button 
            type="button" 
            onClick={alTerminar} 
            className="btn btn-secundario"
            disabled={guardando}
          >
            Cancelar
          </button>
          <button 
            type="submit" 
            className="btn btn-primario"
            disabled={guardando}
          >
            {guardando ? 'Guardando...' : 'Guardar animal'}
          </button>
        </div>
      </form>
    </div>
  );
}