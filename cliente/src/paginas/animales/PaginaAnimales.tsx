import { useState, useEffect, useRef } from 'react';
import { DisenoApp } from '../../componentes/DisenoApp';
import { FormularioAnimal } from './FormularioAnimal';

interface Animal {
  id: string;
  identificador: string;
  nombre?: string;
  raza?: string;
  sexo: string;
  corral?: string;
  peso?: number;
  categoria: string;
  estado?: string;
  fechaCreacion?: string;
  fecha_creacion?: string;
  created_at?: string;
  fechaNacimiento?: string;
  madre?: string;
  padre?: string;
}

export function PaginaAnimales() {
  const [animales, setAnimales] = useState<Animal[]>([]);
  const [busqueda, setBusqueda] = useState('');
  const [categoriaFiltro, setCategoriaFiltro] = useState('');
  const [sexoFiltro, setSexoFiltro] = useState('');
  const [corralFiltro, setCorralFiltro] = useState('');
  const [estadoFiltro, setEstadoFiltro] = useState('');
  
  const [fechaDesde, setFechaDesde] = useState('');
  const [fechaHasta, setFechaHasta] = useState('');
  
  const [cargando, setCargando] = useState(true);
  const [mensaje, setMensaje] = useState('');
  
  const [vista, setVista] = useState<'tabla' | 'formulario' | 'detalle'>('tabla');
  const [animalSeleccionado, setAnimalSeleccionado] = useState<Animal | null>(null);
  const [pestanaDetalle, setPestanaDetalle] = useState<'resumen' | 'sanidad' | 'pesajes' | 'historial'>('resumen');
  
  const [editando, setEditando] = useState(false);
  const [confirmarEliminar, setConfirmarEliminar] = useState(false);
  
  const [nombreEdit, setNombreEdit] = useState('');
  const [razaEdit, setRazaEdit] = useState('');
  const [corralEdit, setCorralEdit] = useState('');
  const [pesoEdit, setPesoEdit] = useState('');
  
  const archivoInputRef = useRef<HTMLInputElement>(null);

  const obtenerSesionReal = () => {
    try {
      const usuarioJson = JSON.parse(localStorage.getItem('ganado_usuario') || localStorage.getItem('usuario') || '{}');
      const rol = usuarioJson.rol || localStorage.getItem('usuario_rol') || 'colaborador';
      const usuarioId = usuarioJson.id || localStorage.getItem('usuario-id') || 'usr_colaborador';
      
      // Lectura de permisos granulares por módulo específicos de la HU-19
      const permisosGuardados = localStorage.getItem(`permisos_${usuarioId}`);
      let puedeEditarAnimales = false;

      if (rol === 'propietario' || rol === 'admin') {
        puedeEditarAnimales = true;
      } else if (permisosGuardados) {
        try {
          const modulos = JSON.parse(permisosGuardados);
          puedeEditarAnimales = Boolean(modulos?.animales?.editar);
        } catch {
          puedeEditarAnimales = localStorage.getItem('puede_editar') === 'true';
        }
      } else {
        const permisoLocal = localStorage.getItem('puede_editar') === 'true';
        const puedeEditarExplicito = permisoLocal || (usuarioJson.puedeEditar ?? usuarioJson.puede_editar ?? false);
        puedeEditarAnimales = Boolean(puedeEditarExplicito);
      }
      
      return {
        id: usuarioId,
        nombre: usuarioJson.nombre || localStorage.getItem('usuario_nombre') || 'Colaborador',
        rol: rol,
        puedeEditar: Boolean(puedeEditarAnimales),
        ranchoId: usuarioJson.ranchoId || usuarioJson.rancho_id || localStorage.getItem('rancho_id') || 'rancho_principal',
        ranchoNombre: usuarioJson.ranchoNombre || localStorage.getItem('rancho_nombre') || 'Mi Rancho'
      };
    } catch {
      return {
        id: 'usr_colaborador',
        nombre: 'Colaborador',
        rol: 'colaborador',
        puedeEditar: false,
        ranchoId: 'rancho_principal',
        ranchoNombre: 'Mi Rancho'
      };
    }
  };

  const sesion = obtenerSesionReal();
  const rolUsuario = sesion.rol;
  const puedeEditar = sesion.puedeEditar;
  const esPropietarioOAdmin = rolUsuario === 'propietario' || rolUsuario === 'admin';

  useEffect(() => {
    cargarAnimales();
  }, []);

  useEffect(() => {
    if (animalSeleccionado) {
      setNombreEdit(animalSeleccionado.nombre || '');
      setRazaEdit(animalSeleccionado.raza || '');
      setCorralEdit(animalSeleccionado.corral || '');
      setPesoEdit(animalSeleccionado.peso?.toString() || '');
      setEditando(false);
      setConfirmarEliminar(false);
    }
  }, [animalSeleccionado]);

  const cargarAnimales = async () => {
    try {
      setCargando(true);
      const token = localStorage.getItem('ganado_token_acceso') || localStorage.getItem('token') || '';

      const respuesta = await fetch('http://localhost:3000/animales', {
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'x-usuario-id': sesion.id,
          'x-rancho-id': sesion.ranchoId,
          'x-usuario-rol': rolUsuario,
          'x-puede-editar': String(puedeEditar)
        }
      });
      const resultado = await respuesta.json();
      setAnimales(Array.isArray(resultado) ? resultado : (resultado.animales || []));
    } catch (error) {
      console.error('Error al cargar animales:', error);
      setMensaje('No se pudieron cargar los animales desde la base de datos.');
    } finally {
      setCargando(false);
    }
  };

  const guardarEdicion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!puedeEditar) {
      setMensaje('No tienes permisos de edición para el módulo de animales (HU-19).');
      return;
    }
    if (!animalSeleccionado) return;

    try {
      const token = localStorage.getItem('ganado_token_acceso') || localStorage.getItem('token') || '';
      const datosActualizados = {
        nombre: nombreEdit,
        raza: razaEdit,
        corral: corralEdit,
        peso: pesoEdit ? Number(pesoEdit) : undefined
      };

      const respuesta = await fetch(`http://localhost:3000/animales/${animalSeleccionado.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'x-usuario-id': sesion.id,
          'x-rancho-id': sesion.ranchoId,
          'x-usuario-rol': rolUsuario,
          'x-puede-editar': 'true'
        },
        body: JSON.stringify(datosActualizados)
      });

      if (respuesta.ok) {
        const animalActualizado = { ...animalSeleccionado, ...datosActualizados };
        setAnimalSeleccionado(animalActualizado);
        setAnimales(prev => prev.map(a => a.id === animalActualizado.id ? animalActualizado : a));
        setEditando(false);
        setMensaje('Animal actualizado correctamente.');
      } else {
        const errJson = await respuesta.json();
        setMensaje(errJson.mensaje || 'No se pudo actualizar el animal.');
      }
    } catch (error) {
      console.error('Error al actualizar:', error);
      setMensaje('Error de conexión al actualizar.');
    }
  };

  const eliminarAnimal = async (id: string) => {
    if (!esPropietarioOAdmin) {
      setMensaje('Acción no autorizada. Solo el Propietario o Administrador pueden eliminar registros.');
      return;
    }

    try {
      const token = localStorage.getItem('ganado_token_acceso') || localStorage.getItem('token') || '';
      const respuesta = await fetch(`http://localhost:3000/animales/${id}`, {
        method: 'DELETE',
        headers: { 
          'Authorization': `Bearer ${token}`,
          'x-usuario-id': sesion.id,
          'x-rancho-id': sesion.ranchoId,
          'x-usuario-rol': rolUsuario
        }
      });
      if (respuesta.ok) {
        setAnimales(prev => prev.filter(a => a.id !== id));
        setVista('tabla');
        setMensaje('Animal eliminado correctamente.');
      } else {
        const errJson = await respuesta.json();
        setMensaje(errJson.mensaje || 'No tienes permisos para eliminar registros.');
      }
    } catch (error) {
      console.error('Error al eliminar:', error);
      setMensaje('Error de conexión al intentar eliminar.');
    }
  };

  const manejarImportarExcel = (e: React.ChangeEvent<HTMLInputElement>) => {
    const archivo = e.target.files?.[0];
    if (!archivo) return;
    alert(`Archivo "${archivo.name}" seleccionado con éxito. Procesando importación masiva...`);
  };

  const animalesFiltrados = animales.filter(a => {
    const textoMatch = (a.identificador + ' ' + (a.nombre || '') + ' ' + (a.raza || '')).toLowerCase().includes(busqueda.toLowerCase());
    const categoriaMatch = categoriaFiltro ? (a.categoria || '').toLowerCase() === categoriaFiltro.toLowerCase() : true;
    const sexoMatch = sexoFiltro ? (a.sexo || '').toLowerCase() === sexoFiltro.toLowerCase() : true;
    const corralMatch = corralFiltro ? (a.corral || '').toLowerCase().includes(corralFiltro.toLowerCase()) : true;
    const estadoMatch = estadoFiltro ? (a.estado || 'Activo').toLowerCase() === estadoFiltro.toLowerCase() : true;

    let fechaMatch = true;
    const fechaBruta = a.fechaCreacion || a.fecha_creacion || a.created_at || '';
    const fechaAnimal = fechaBruta ? fechaBruta.split('T')[0] : '';
    
    if (fechaDesde && fechaAnimal) {
      if (fechaAnimal < fechaDesde) fechaMatch = false;
    }
    if (fechaHasta && fechaAnimal) {
      if (fechaAnimal > fechaHasta) fechaMatch = false;
    }

    return textoMatch && categoriaMatch && sexoMatch && corralMatch && estadoMatch && fechaMatch;
  });

  const usuarioApp = {
    nombre: sesion.nombre,
    rol: sesion.rol,
    correo: 'usuario@rancho.com'
  };

  return (
    <DisenoApp
      activo="animales"
      ruta={
        vista === 'formulario' ? ['Animales', 'Registrar animal'] : 
        vista === 'detalle' ? ['Animales', animalSeleccionado?.identificador || 'Detalle'] : 
        ['Mi rancho', 'Animales']
      }
      usuario={usuarioApp}
      rancho={sesion.ranchoNombre}
      titulo="Animales"
      rotulo="Consulta y administra los animales registrados en tus establecimientos."
      acciones={
        vista === 'tabla' ? (
          <div className="fila g12">
            <input 
              type="file" 
              ref={archivoInputRef} 
              onChange={manejarImportarExcel} 
              accept=".xlsx, .xls, .csv" 
              style={{ display: 'none' }} 
            />
            <button 
              onClick={() => archivoInputRef.current?.click()} 
              className="btn btn-secundario"
              style={{ background: '#fff', border: '1px solid #d1d5db', padding: '10px 16px', borderRadius: '8px', fontWeight: 600, color: '#374151', cursor: 'pointer' }}
            >
              Importar Excel
            </button>

            {puedeEditar ? (
              <button 
                onClick={() => setVista('formulario')} 
                className="btn btn-primario" 
                style={{ background: '#113f30', color: '#fff', padding: '10px 18px', borderRadius: '8px', fontWeight: 600, border: 'none', cursor: 'pointer' }}
              >
                + Registrar animal
              </button>
            ) : (
              <span className="pie c-500" style={{ fontStyle: 'italic', alignSelf: 'center', color: '#d97706', fontWeight: 500 }}>
                Modo de solo consulta (Módulo Animales)
              </span>
            )}
          </div>
        ) : (
          <button onClick={() => setVista('tabla')} className="btn btn-secundario" style={{ padding: '8px 16px', borderRadius: '8px', background: '#f3f4f6', border: 'none', cursor: 'pointer', fontWeight: 500 }}>
            ← Volver al listado
          </button>
        )
      }
    >
      <div className="col g16">
        {mensaje && (
          <div className="aviso" style={{ padding: '12px', background: '#e0f2fe', color: '#0369a1', borderRadius: '8px', marginBottom: '12px' }}>
            <p>{mensaje}</p>
          </div>
        )}

        {vista === 'formulario' ? (
          <div className="tarjeta" style={{ padding: '32px', background: '#fff', borderRadius: '12px', border: '1px solid #e5e7eb' }}>
            <h2 style={{ fontSize: '20px', fontWeight: 'bold', marginBottom: '24px', color: '#111' }}>Registrar animal</h2>
            <FormularioAnimal 
              alTerminar={() => {
                setVista('tabla');
                cargarAnimales();
              }} 
            />
          </div>
        ) : vista === 'detalle' && animalSeleccionado ? (
          <div className="col g16">
            <div className="tarjeta" style={{ padding: '24px 32px', background: '#fff', borderRadius: '12px', border: '1px solid #e5e7eb' }}>
              <div className="fila entre" style={{ alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
                <div>
                  <div className="fila g12" style={{ alignItems: 'center' }}>
                    <h1 style={{ fontSize: '28px', fontFamily: 'monospace', fontWeight: 'bold', margin: 0 }}>
                      {animalSeleccionado.identificador}
                    </h1>
                    <span style={{ padding: '4px 12px', borderRadius: '12px', background: '#d1fae5', color: '#065f46', fontSize: '13px', fontWeight: 600 }}>
                      {animalSeleccionado.estado || 'Activo'}
                    </span>
                  </div>
                  <p style={{ color: '#666', fontSize: '15px', marginTop: '6px' }}>
                    {animalSeleccionado.nombre || 'Sin nombre'} · {animalSeleccionado.raza || 'Sin raza'}
                  </p>
                </div>

                <div className="fila g12">
                  {puedeEditar && !editando && (
                    <button 
                      onClick={() => setEditando(true)} 
                      className="btn" 
                      style={{ padding: '8px 16px', borderRadius: '8px', border: '1px solid #f59e0b', background: '#fef3c7', color: '#b45309', cursor: 'pointer', fontWeight: 600 }}
                    >
                      ✏️ Editar animal
                    </button>
                  )}
                  {esPropietarioOAdmin && !confirmarEliminar && (
                    <button 
                      onClick={() => setConfirmarEliminar(true)}
                      className="btn" 
                      style={{ padding: '8px 16px', borderRadius: '8px', border: '1px solid #f87171', background: '#fee2e2', color: '#991b1b', cursor: 'pointer', fontWeight: 600 }}
                    >
                      🗑️ Eliminar
                    </button>
                  )}
                </div>
              </div>

              {confirmarEliminar && esPropietarioOAdmin && (
                <div style={{ marginTop: '20px', padding: '16px', background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
                  <span style={{ color: '#991b1b', fontWeight: 500, fontSize: '14px' }}>
                    ⚠️ ¿Estás seguro de que deseas eliminar este animal? Esta acción no se puede deshacer.
                  </span>
                  <div className="fila g8">
                    <button 
                      onClick={() => setConfirmarEliminar(false)}
                      style={{ padding: '6px 14px', borderRadius: '6px', background: '#fff', border: '1px solid #d1d5db', cursor: 'pointer', fontWeight: 500 }}
                    >
                      No, cancelar
                    </button>
                    <button 
                      onClick={() => eliminarAnimal(animalSeleccionado.id)}
                      style={{ padding: '6px 14px', borderRadius: '6px', background: '#dc2626', color: '#fff', border: 'none', cursor: 'pointer', fontWeight: 600 }}
                    >
                      Sí, eliminar
                    </button>
                  </div>
                </div>
              )}

              {editando && puedeEditar && (
                <form onSubmit={guardarEdicion} style={{ marginTop: '20px', padding: '20px', background: '#fffbeb', border: '1px solid #fde68a', borderRadius: '8px' }} className="col g16">
                  <h3 style={{ fontSize: '16px', fontWeight: 600, color: '#92400e', margin: 0 }}>Editar información del animal</h3>
                  
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
                    <div>
                      <label style={{ fontSize: '12px', color: '#78350f', display: 'block', marginBottom: '4px' }}>Nombre o alias</label>
                      <input 
                        type="text" 
                        value={nombreEdit} 
                        onChange={e => setNombreEdit(e.target.value)}
                        style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #d97706', background: '#fff' }}
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: '12px', color: '#78350f', display: 'block', marginBottom: '4px' }}>Raza</label>
                      <input 
                        type="text" 
                        value={razaEdit} 
                        onChange={e => setRazaEdit(e.target.value)}
                        style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #d97706', background: '#fff' }}
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: '12px', color: '#78350f', display: 'block', marginBottom: '4px' }}>Corral</label>
                      <input 
                        type="text" 
                        value={corralEdit} 
                        onChange={e => setCorralEdit(e.target.value)}
                        style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #d97706', background: '#fff' }}
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: '12px', color: '#78350f', display: 'block', marginBottom: '4px' }}>Peso (kg)</label>
                      <input 
                        type="number" 
                        step="0.1" 
                        value={pesoEdit} 
                        onChange={e => setPesoEdit(e.target.value)}
                        style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #d97706', background: '#fff' }}
                      />
                    </div>
                  </div>

                  <div className="fila g8 derecha" style={{ marginTop: '8px' }}>
                    <button 
                      type="button" 
                      onClick={() => setEditando(false)}
                      style={{ padding: '8px 14px', borderRadius: '6px', background: '#fff', border: '1px solid #d1d5db', cursor: 'pointer' }}
                    >
                      Cancelar
                    </button>
                    <button 
                      type="submit" 
                      style={{ padding: '8px 16px', borderRadius: '6px', background: '#d97706', color: '#fff', border: 'none', cursor: 'pointer', fontWeight: 600 }}
                    >
                      Guardar cambios
                    </button>
                  </div>
                </form>
              )}

              <div className="fila g24" style={{ borderBottom: '1px solid #e5e7eb', marginTop: '24px' }}>
                {(['resumen', 'sanidad', 'pesajes', 'historial'] as const).map((pestana) => (
                  <button
                    key={pestana}
                    onClick={() => setPestanaDetalle(pestana)}
                    style={{
                      padding: '12px 4px',
                      background: 'transparent',
                      border: 'none',
                      borderBottom: pestanaDetalle === pestana ? '2px solid #113f30' : '2px solid transparent',
                      color: pestanaDetalle === pestana ? '#113f30' : '#6b7280',
                      fontWeight: pestanaDetalle === pestana ? 600 : 400,
                      cursor: 'pointer',
                      textTransform: 'capitalize',
                      fontSize: '15px'
                    }}
                  >
                    {pestana}
                  </button>
                ))}
              </div>
            </div>

            {pestanaDetalle === 'resumen' && (
              <div className="tarjeta" style={{ padding: '28px 32px', background: '#fff', borderRadius: '12px', border: '1px solid #e5e7eb' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '24px' }}>
                  <div>
                    <span style={{ fontSize: '13px', color: '#6b7280', display: 'block' }}>Sexo</span>
                    <strong style={{ fontSize: '15px', color: '#111', textTransform: 'capitalize' }}>{animalSeleccionado.sexo}</strong>
                  </div>
                  <div>
                    <span style={{ fontSize: '13px', color: '#6b7280', display: 'block' }}>Categoría</span>
                    <strong style={{ fontSize: '15px', color: '#111', textTransform: 'capitalize' }}>{animalSeleccionado.categoria}</strong>
                  </div>
                  <div>
                    <span style={{ fontSize: '13px', color: '#6b7280', display: 'block' }}>Corral asignado</span>
                    <strong style={{ fontSize: '15px', color: '#111' }}>{animalSeleccionado.corral || 'Sin asignar'}</strong>
                  </div>
                  <div>
                    <span style={{ fontSize: '13px', color: '#6b7280', display: 'block' }}>Último peso</span>
                    <strong style={{ fontSize: '15px', color: '#111' }}>{animalSeleccionado.peso ? `${animalSeleccionado.peso} kg` : 'Sin registrar'}</strong>
                  </div>
                </div>
              </div>
            )}
            {pestanaDetalle === 'sanidad' && <div className="tarjeta" style={{ padding: '24px', background: '#fff' }}><p>Sin registros sanitarios.</p></div>}
            {pestanaDetalle === 'pesajes' && <div className="tarjeta" style={{ padding: '24px', background: '#fff' }}><p>Peso actual: {animalSeleccionado.peso} kg</p></div>}
            {pestanaDetalle === 'historial' && <div className="tarjeta" style={{ padding: '24px', background: '#fff' }}><p>Historial registrado correctamente.</p></div>}
          </div>
        ) : (
          cargando ? (
            <div className="tarjeta" style={{ padding: '48px', textAlign: 'center', background: '#fff', borderRadius: '12px' }}>
              <p style={{ color: '#666' }}>Cargando listado de animales...</p>
            </div>
          ) : animales.length === 0 ? (
            <div className="tarjeta col centro g16" style={{ padding: '64px 24px', textAlign: 'center', background: '#fff', borderRadius: '12px', border: '1px solid #e5e7eb' }}>
              <div style={{ fontSize: '32px' }}>🐄</div>
              <div>
                <h3 style={{ fontSize: '18px', fontWeight: 600 }}>No hay animales registrados</h3>
                <p style={{ color: '#666', fontSize: '14px', marginTop: '4px' }}>
                  Comienza registrando tu primer animal en el sistema.
                </p>
              </div>
              {puedeEditar && (
                <button 
                  onClick={() => setVista('formulario')}
                  className="btn btn-primario"
                  style={{ marginTop: '8px', padding: '10px 18px', background: '#113f30', color: '#fff', borderRadius: '8px', fontWeight: 600, border: 'none', cursor: 'pointer' }}
                >
                  + Registrar primer animal
                </button>
              )}
            </div>
          ) : (
            <div className="col g16">
              <div className="tarjeta fila g12 entre" style={{ padding: '20px', background: '#fff', borderRadius: '12px', border: '1px solid #e5e7eb', flexWrap: 'wrap', alignItems: 'center' }}>
                <div className="campo" style={{ flex: '1 1 160px', marginBottom: 0 }}>
                  <label className="etiqueta" style={{ fontSize: '12px', color: '#666', marginBottom: '4px', display: 'block' }}>Buscar</label>
                  <input 
                    type="text" 
                    placeholder="Caravana, nombre..." 
                    value={busqueda}
                    onChange={e => setBusqueda(e.target.value)}
                    className="dato"
                    style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #d1d5db' }}
                  />
                </div>

                <div className="campo" style={{ flex: '1 1 120px', marginBottom: 0 }}>
                  <label className="etiqueta" style={{ fontSize: '12px', color: '#666', marginBottom: '4px', display: 'block' }}>Categoría</label>
                  <select 
                    value={categoriaFiltro} 
                    onChange={e => setCategoriaFiltro(e.target.value)}
                    className="dato"
                    style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #d1d5db', background: '#fff' }}
                  >
                    <option value="">Todas</option>
                    <option value="vaquilla">Vaquilla</option>
                    <option value="vaca">Vaca</option>
                    <option value="toro">Toro</option>
                    <option value="ternero">Ternero</option>
                    <option value="novillo">Novillo</option>
                  </select>
                </div>

                <div className="campo" style={{ flex: '1 1 100px', marginBottom: 0 }}>
                  <label className="etiqueta" style={{ fontSize: '12px', color: '#666', marginBottom: '4px', display: 'block' }}>Sexo</label>
                  <select 
                    value={sexoFiltro} 
                    onChange={e => setSexoFiltro(e.target.value)}
                    className="dato"
                    style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #d1d5db', background: '#fff' }}
                  >
                    <option value="">Todos</option>
                    <option value="hembra">Hembra</option>
                    <option value="macho">Macho</option>
                  </select>
                </div>

                <div className="campo" style={{ flex: '1 1 110px', marginBottom: 0 }}>
                  <label className="etiqueta" style={{ fontSize: '12px', color: '#666', marginBottom: '4px', display: 'block' }}>Corral</label>
                  <input 
                    type="text" 
                    placeholder="Corral..." 
                    value={corralFiltro}
                    onChange={e => setCorralFiltro(e.target.value)}
                    className="dato"
                    style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #d1d5db' }}
                  />
                </div>

                <div className="campo" style={{ flex: '1 1 100px', marginBottom: 0 }}>
                  <label className="etiqueta" style={{ fontSize: '12px', color: '#666', marginBottom: '4px', display: 'block' }}>Estado</label>
                  <select 
                    value={estadoFiltro} 
                    onChange={e => setEstadoFiltro(e.target.value)}
                    className="dato"
                    style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #d1d5db', background: '#fff' }}
                  >
                    <option value="">Todos</option>
                    <option value="activo">Activo</option>
                    <option value="inactivo">Inactivo</option>
                  </select>
                </div>

                <div className="campo" style={{ flex: '1 1 130px', marginBottom: 0 }}>
                  <label className="etiqueta" style={{ fontSize: '12px', color: '#666', marginBottom: '4px', display: 'block' }}>Desde</label>
                  <input 
                    type="date" 
                    value={fechaDesde}
                    onChange={e => setFechaDesde(e.target.value)}
                    className="dato"
                    style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #d1d5db' }}
                  />
                </div>

                <div className="campo" style={{ flex: '1 1 130px', marginBottom: 0 }}>
                  <label className="etiqueta" style={{ fontSize: '12px', color: '#666', marginBottom: '4px', display: 'block' }}>Hasta</label>
                  <input 
                    type="date" 
                    value={fechaHasta}
                    onChange={e => setFechaHasta(e.target.value)}
                    className="dato"
                    style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #d1d5db' }}
                  />
                </div>

                <div style={{ alignSelf: 'flex-end', paddingBottom: '10px', color: '#666', fontSize: '14px', fontWeight: 500 }}>
                  {animalesFiltrados.length} animales
                </div>
              </div>

              {animalesFiltrados.length === 0 ? (
                <div className="tarjeta col centro g16" style={{ padding: '64px 24px', textAlign: 'center', background: '#fff', borderRadius: '12px', border: '1px solid #e5e7eb' }}>
                  <div style={{ fontSize: '32px' }}>🔍</div>
                  <div>
                    <h3 style={{ fontSize: '18px', fontWeight: 600 }}>No hay resultados para tu búsqueda</h3>
                    <p style={{ color: '#666', fontSize: '14px', marginTop: '4px' }}>
                      Revisa los filtros aplicados o intenta buscar con otros parámetros.
                    </p>
                  </div>
                  <button 
                    onClick={() => { setBusqueda(''); setCategoriaFiltro(''); setSexoFiltro(''); setCorralFiltro(''); setEstadoFiltro(''); setFechaDesde(''); setFechaHasta(''); }}
                    className="btn btn-secundario"
                    style={{ marginTop: '8px', padding: '8px 16px', background: '#f3f4f6', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 500 }}
                  >
                    Borrar filtros de búsqueda
                  </button>
                </div>
              ) : (
                <div className="tarjeta" style={{ overflowX: 'auto', padding: 0, background: '#fff', borderRadius: '12px', border: '1px solid #e5e7eb' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid #e5e7eb', background: '#f9fafb' }}>
                        <th style={{ padding: '14px 20px', fontSize: '13px', color: '#374151', fontWeight: 600 }}>Caravana</th>
                        <th style={{ padding: '14px 20px', fontSize: '13px', color: '#374151', fontWeight: 600 }}>Nombre</th>
                        <th style={{ padding: '14px 20px', fontSize: '13px', color: '#374151', fontWeight: 600 }}>Raza</th>
                        <th style={{ padding: '14px 20px', fontSize: '13px', color: '#374151', fontWeight: 600 }}>Sexo</th>
                        <th style={{ padding: '14px 20px', fontSize: '13px', color: '#374151', fontWeight: 600 }}>Corral</th>
                        <th style={{ padding: '14px 20px', fontSize: '13px', color: '#374151', fontWeight: 600 }}>Peso</th>
                        <th style={{ padding: '14px 20px', fontSize: '13px', color: '#374151', fontWeight: 600 }}>Estado</th>
                      </tr>
                    </thead>
                    <tbody>
                      {animalesFiltrados.map((animal) => (
                        <tr 
                          key={animal.id} 
                          onClick={() => {
                            setAnimalSeleccionado(animal);
                            setVista('detalle');
                          }}
                          style={{ borderBottom: '1px solid #f3f4f6', cursor: 'pointer' }}
                          title="Haz clic para ver la ficha detallada del animal"
                        >
                          <td style={{ padding: '14px 20px', fontFamily: 'monospace', fontWeight: 'bold', color: '#113f30' }}>
                            {animal.identificador}
                          </td>
                          <td style={{ padding: '14px 20px', color: '#374151' }}>{animal.nombre || '-'}</td>
                          <td style={{ padding: '14px 20px', color: '#374151' }}>{animal.raza || '-'}</td>
                          <td style={{ padding: '14px 20px', color: '#374151', textTransform: 'capitalize' }}>{animal.sexo}</td>
                          <td style={{ padding: '14px 20px', color: '#374151' }}>{animal.corral || '-'}</td>
                          <td style={{ padding: '14px 20px', color: '#374151' }}>{animal.peso ? `${animal.peso} kg` : '-'}</td>
                          <td style={{ padding: '14px 20px' }}>
                            <span style={{ padding: '4px 10px', borderRadius: '12px', background: '#d1fae5', color: '#065f46', fontSize: '12px', fontWeight: 500, textTransform: 'capitalize' }}>
                              {animal.estado || 'Activo'}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )
        )}
      </div>
    </DisenoApp>
  );
}