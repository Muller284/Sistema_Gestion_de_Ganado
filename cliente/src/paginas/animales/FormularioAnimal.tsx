import { useState, type FormEvent } from 'react';
import { api } from '../../servicios/api';

interface Props {
  alTerminar: () => void;
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

    if (!identificador.trim()) {
      setError('El identificador (caravana) es obligatorio.');
      return;
    }

    try {
      setGuardando(true);
      
      const payload: any = {
        identificador: identificador.trim(),
        sexo: sexo.toLowerCase(),
        categoria: categoria.toLowerCase(),
        estado: 'activo'
      };

      if (nombre.trim()) payload.nombre = nombre.trim();
      if (raza.trim()) payload.raza = raza.trim();
      if (fechaNacimiento) payload.fechaNacimiento = fechaNacimiento;
      if (corral.trim()) payload.corral = corral.trim();
      if (peso) payload.peso = Number(peso);

      const token = localStorage.getItem('ganado_token_acceso') || '';
      const usuarioId = localStorage.getItem('usuario-id') || '';
      const ranchoId = localStorage.getItem('rancho_id') || localStorage.getItem('ranchoId');

      if (ranchoId) {
        payload.ranchoId = ranchoId;
      }

      // Obtenemos el rol y estado de edición actual de la sesión para cumplir con la HU-18
      const rolActual = localStorage.getItem('usuario_rol') || 'propietario';
      const puedeEditarExplicito = localStorage.getItem('usuario_puede_editar') || 'true';

      const respuesta = await fetch('http://localhost:3000/animales', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
          ...(usuarioId ? { 'x-usuario-id': usuarioId } : {}),
          ...(ranchoId ? { 'x-rancho-id': ranchoId } : {}),
          'x-usuario-rol': rolActual,
          'x-puede-editar': String(puedeEditarExplicito)
        },
        body: JSON.stringify(payload)
      });

      if (!respuesta.ok) {
        const errorData = await respuesta.json().catch(() => ({}));
        throw new Error(errorData.mensaje || errorData.error || `Error del servidor (${respuesta.status})`);
      }

      alTerminar();
    } catch (err: any) {
      console.error('Error al registrar animal:', err);
      setError(err.message || 'Hubo un error al guardar el animal en la base de datos.');
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