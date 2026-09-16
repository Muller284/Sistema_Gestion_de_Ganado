import { useEffect, useState } from 'react';
import {
  api,
  cambiarUsuario,
  usuarioActual,
  type EstadoRancho,
  type Pais,
  type Rancho,
} from '../../servicios/api';

/**
 * HU-15, Creacion del rancho. Pantalla unica con el CRUD completo.
 *
 * Deliberadamente sin estilos del sistema de diseño: HU-05 todavia no esta
 * hecha y aca lo que importa es que las cuatro operaciones funcionen.
 * Cuando exista estilos.css, esta pantalla se reviste sin tocar su logica.
 */

const VACIO = {
  nombre: '',
  departamento: '',
  localidad: '',
  superficie: '',
  tipo_produccion: 'carne',
  pais_codigo: 'BO',
  latitud: '',
  longitud: '',
};

export function PaginaRancho() {
  const [estado, setEstado] = useState<EstadoRancho | null>(null);
  const [paises, setPaises] = useState<Pais[]>([]);
  const [formulario, setFormulario] = useState({ ...VACIO });
  const [editando, setEditando] = useState(false);
  const [error, setError] = useState('');
  const [aviso, setAviso] = useState('');
  const [cargando, setCargando] = useState(true);
  const [usuario, setUsuario] = useState(usuarioActual());

  async function recargar() {
    setCargando(true);
    setError('');
    try {
      const [datos, listaPaises] = await Promise.all([api.miRancho(), api.paises()]);
      setEstado(datos);
      setPaises(listaPaises);
      if (datos.rancho) volcarEnFormulario(datos.rancho);
    } catch (e) {
      setError((e as Error).message);
      setEstado(null);
    } finally {
      setCargando(false);
    }
  }

  function volcarEnFormulario(rancho: Rancho) {
    setFormulario({
      nombre: rancho.nombre,
      departamento: rancho.departamento,
      localidad: rancho.localidad,
      superficie: String(Number(rancho.superficie)),
      tipo_produccion: rancho.tipo_produccion,
      pais_codigo: rancho.pais_codigo,
      latitud: rancho.latitud ? String(Number(rancho.latitud)) : '',
      longitud: rancho.longitud ? String(Number(rancho.longitud)) : '',
    });
  }

  useEffect(() => {
    void recargar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [usuario]);

  function campo(nombre: keyof typeof VACIO) {
    return {
      value: formulario[nombre],
      onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
        setFormulario({ ...formulario, [nombre]: e.target.value }),
    };
  }

  async function guardar(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setAviso('');
    const datos: Record<string, unknown> = {
      ...formulario,
      superficie: Number(formulario.superficie),
      latitud: formulario.latitud === '' ? null : Number(formulario.latitud),
      longitud: formulario.longitud === '' ? null : Number(formulario.longitud),
    };
    try {
      if (estado?.rancho) {
        await api.actualizar(estado.rancho.id, datos);
        setAviso('Rancho actualizado.');
      } else {
        // El identificador lo genera el cliente: es la convencion del equipo
        // y es lo que despues permite trabajar sin conexion.
        datos.id = crypto.randomUUID();
        await api.crear(datos);
        setAviso('Rancho creado.');
      }
      setEditando(false);
      await recargar();
    } catch (err) {
      setError((err as Error).message);
    }
  }

  async function darDeBaja() {
    if (!estado?.rancho) return;
    if (!confirm(`¿Dar de baja "${estado.rancho.nombre}"? La información no se borra.`)) return;
    setError('');
    setAviso('');
    try {
      await api.darDeBaja(estado.rancho.id);
      setAviso('Rancho dado de baja. El registro sigue en la base de datos.');
      setFormulario({ ...VACIO });
      await recargar();
    } catch (err) {
      setError((err as Error).message);
    }
  }

  const rancho = estado?.rancho ?? null;
  const mostrarFormulario = !rancho || editando;
  const esPropietario = estado?.usuario.rol === 'propietario';

  return (
    <main style={{ maxWidth: 680, margin: '0 auto', padding: 24, fontFamily: 'system-ui, sans-serif' }}>
      <h1 style={{ fontSize: 22 }}>Mi rancho</h1>
      <p style={{ color: '#666', fontSize: 13 }}>
        HU-15 · Creación del rancho. Sin estilos todavía: HU-05 está pendiente.
      </p>

      <fieldset style={{ margin: '16px 0', padding: 12, border: '1px solid #ddd' }}>
        <legend style={{ fontSize: 12, color: '#666' }}>
          Usuario (provisional, hasta que exista el inicio de sesión)
        </legend>
        <input
          style={{ width: '100%', padding: 6, fontFamily: 'monospace', fontSize: 12 }}
          value={usuario}
          onChange={(e) => {
            cambiarUsuario(e.target.value);
            setUsuario(e.target.value);
          }}
          placeholder="identificador del usuario"
        />
        {estado && (
          <p style={{ fontSize: 13, margin: '8px 0 0' }}>
            {estado.usuario.nombre} — {estado.usuario.rol}
          </p>
        )}
      </fieldset>

      {cargando && <p>Cargando…</p>}
      {error && <p style={{ color: '#b02a2a' }}>{error}</p>}
      {aviso && <p style={{ color: '#2f8f52' }}>{aviso}</p>}

      {!cargando && rancho && !editando && (
        <section style={{ border: '1px solid #ddd', padding: 16, marginBottom: 16 }}>
          <h2 style={{ fontSize: 18, marginTop: 0 }}>{rancho.nombre}</h2>
          <p style={{ margin: '4px 0' }}>
            {rancho.localidad}, {rancho.departamento} ({rancho.pais_codigo})
          </p>
          <p style={{ margin: '4px 0' }}>
            {Number(rancho.superficie)} ha · producción de {rancho.tipo_produccion}
          </p>
          <p style={{ margin: '4px 0', color: '#666', fontSize: 13 }}>
            {rancho.latitud ? `Ubicación: ${Number(rancho.latitud)}, ${Number(rancho.longitud)}` : 'Sin ubicación cargada'}
          </p>
          {esPropietario && (
            <div style={{ marginTop: 12, display: 'flex', gap: 8 }}>
              <button onClick={() => setEditando(true)}>Editar</button>
              <button onClick={darDeBaja}>Dar de baja</button>
            </div>
          )}
        </section>
      )}

      {!cargando && !rancho && !error && (
        <p style={{ background: '#fdece0', padding: 12 }}>
          Todavía no tienes un rancho. Créalo para poder usar el sistema.
        </p>
      )}

      {!cargando && mostrarFormulario && esPropietario && (
        <form onSubmit={guardar} style={{ display: 'grid', gap: 10 }}>
          <label>
            Nombre<br />
            <input required style={{ width: '100%', padding: 6 }} {...campo('nombre')} />
          </label>
          <label>
            Departamento<br />
            <input required style={{ width: '100%', padding: 6 }} {...campo('departamento')} />
          </label>
          <label>
            Localidad<br />
            <input required style={{ width: '100%', padding: 6 }} {...campo('localidad')} />
          </label>
          <label>
            Superficie (hectáreas)<br />
            <input required type="number" step="0.01" min="0.01" style={{ width: '100%', padding: 6 }} {...campo('superficie')} />
          </label>
          <label>
            Tipo de producción<br />
            <select style={{ width: '100%', padding: 6 }} {...campo('tipo_produccion')}>
              <option value="carne">Carne</option>
              <option value="leche">Leche</option>
              <option value="mixto">Mixto</option>
            </select>
          </label>
          <label>
            País<br />
            <select style={{ width: '100%', padding: 6 }} {...campo('pais_codigo')}>
              {paises.map((p) => (
                <option key={p.codigo} value={p.codigo}>
                  {p.nombre}
                </option>
              ))}
            </select>
          </label>
          <fieldset style={{ border: '1px solid #eee', padding: 10 }}>
            <legend style={{ fontSize: 12, color: '#666' }}>Ubicación (opcional)</legend>
            <div style={{ display: 'flex', gap: 8 }}>
              <input placeholder="latitud" style={{ flex: 1, padding: 6 }} {...campo('latitud')} />
              <input placeholder="longitud" style={{ flex: 1, padding: 6 }} {...campo('longitud')} />
            </div>
          </fieldset>
          <div style={{ display: 'flex', gap: 8 }}>
            <button type="submit">{rancho ? 'Guardar cambios' : 'Crear rancho'}</button>
            {rancho && (
              <button type="button" onClick={() => { setEditando(false); volcarEnFormulario(rancho); }}>
                Cancelar
              </button>
            )}
          </div>
        </form>
      )}

      {!cargando && !esPropietario && estado && (
        <p style={{ color: '#666' }}>
          Solo el propietario puede crear o editar el rancho.
        </p>
      )}
    </main>
  );
}
