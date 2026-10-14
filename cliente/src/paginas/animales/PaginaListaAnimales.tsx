import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Alerta,
  Boton,
  CampoTexto,
  Cargando,
  DisenoApp,
  EstadoVacio,
  Icono,
  Insignia,
  Segmentos,
  Tarjeta,
} from '../../componentes';
import { api, type Animal, type EstadoAnimal } from '../../servicios/api';
import { t } from '../../servicios/idioma';
import { formatoPeso } from '../../servicios/unidades';
import { conTransicion } from '../../servicios/transicion';
import { nivel, useContextoGanado, usuarioDe } from '../ganado/contexto';
import { FormularioFicha } from './FormularioFicha';

type Vista = EstadoAnimal | 'todos' | 'bajas';
const VISTAS: Vista[] = ['activo', 'vendido', 'muerto', 'archivado', 'todos', 'bajas'];

export function PaginaListaAnimales() {
  const contexto = useContextoGanado();
  const navegar = useNavigate();
  const [animales, setAnimales] = useState<Animal[]>([]);
  const [vista, setVista] = useState<Vista>('activo');
  const [busqueda, setBusqueda] = useState('');
  const [sexoFiltro, setSexoFiltro] = useState('');
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');
  const [registrando, setRegistrando] = useState(false);

  const puedeEditar = nivel(contexto, 'animales') === 'editar';

  useEffect(() => {
    let vigente = true;

    const cargarDatos = async () => {
      setCargando(true);
      try {
        const pedido =
          vista === 'bajas'
            ? api.animales('todos', true, busqueda, undefined, sexoFiltro).then((lista) => lista.filter((a) => a.eliminado_en))
            : api.animales(vista, false, busqueda, undefined, sexoFiltro);

        const lista = await pedido;
        if (vigente) {
          setAnimales(lista);
          setError('');
        }
      } catch (err) {
        if (vigente) {
          setError((err as Error).message);
        }
      } finally {
        if (vigente) {
          setCargando(false);
        }
      }
    };

    cargarDatos();

    return () => {
      vigente = false;
    };
  }, [vista, busqueda, sexoFiltro]);

  function alRegistrar(animal: Animal) {
    navegar(`/animales/${animal.id}`);
  }

  return (
    <DisenoApp
      activo="animales"
      ruta={[t('app.modulos.inicio'), t('animales.titulo')]}
      usuario={usuarioDe(contexto)}
      rancho={contexto.rancho?.rancho?.nombre ?? null}
      rotulo={t('animales.rotulo')}
      titulo={t('animales.titulo')}
      acciones={
        puedeEditar &&
        !registrando && (
          <Boton variante="primario" onClick={() => conTransicion(() => setRegistrando(true))}>
            <Icono nombre="mas" tamano={18} />
            {t('animales.nuevo')}
          </Boton>
        )
      }
    >
      <div className="col g24">
        {error && <Alerta variante="error">{error}</Alerta>}
        {!contexto.cargando && !puedeEditar && !error && (
          <Alerta variante="info">{t('animales.soloConsulta')}</Alerta>
        )}

        {registrando && (
          <FormularioFicha
            regional={contexto.regional}
            alGuardar={alRegistrar}
            alCancelar={() => conTransicion(() => setRegistrando(false))}
          />
        )}

        <Segmentos
          etiqueta={t('animales.vistas.etiqueta')}
          valor={vista}
          alCambiar={(nueva) => {
            setVista(nueva);
          }}
          opciones={VISTAS.map((clave) => ({ clave, nombre: t(`animales.vistas.${clave}`) }))}
        />

       {/* Filtros y búsqueda requeridos por la HU-29 */}
        <div className="fila g12 a-centro">
          <div style={{ flex: 2 }}>
            <CampoTexto
              etiqueta={t('comun.idioma') ?? 'Buscar'}
              value={busqueda}
              placeholder={t('animales.campos.identificadorEjemplo') ?? 'Identificador o nombre...'}
              onChange={(e) => setBusqueda(e.target.value)}
            />
          </div>
          <div style={{ flex: 1 }} className="campo">
            <label className="campo__etiqueta">{t('animales.campos.sexo')}</label>
            <select
              className="campo__control"
              value={sexoFiltro}
              onChange={(e) => setSexoFiltro(e.target.value)}
            >
              <option value="">{t('equipo.filtros.todos')}</option>
              <option value="macho">{t('animales.sexos.macho')}</option>
              <option value="hembra">{t('animales.sexos.hembra')}</option>
            </select>
          </div>
        </div>

        {cargando && <Cargando lineas={5} />}

        {!cargando && !error && (
          <>
            {animales.length === 0 ? (
              <EstadoVacio
                icono="animal"
                titulo={t('animales.vacio.titulo')}
                texto={vista === 'activo' && !busqueda && puedeEditar ? t('animales.vacio.texto') : t('animales.vacio.textoVista')}
              />
            ) : (
              <Tarjeta>
                <ul className="ganado__lista">
                  {animales.map((animal) => (
                    <li key={animal.id} className={animal.eliminado_en ? 'ganado__fila de-baja' : 'ganado__fila'}>
                      <div className="ganado__principal">
                        <span className="dato">{animal.identificador}</span>
                        <span className="pie c-500">
                          {[
                            animal.nombre,
                            animal.categoria_codigo && t(`animales.categorias.${animal.categoria_codigo}`),
                            t(`animales.sexos.${animal.sexo}`),
                            animal.peso_kg !== null && formatoPeso(animal.peso_kg, contexto.regional),
                          ]
                            .filter(Boolean)
                            .join(' · ')}
                        </span>
                      </div>
                      <span className="ganado__dato">{animal.corral_nombre ?? t('animales.sinCorral')}</span>
                      <Insignia variante={animal.estado}>{t(`animales.estados.${animal.estado}`)}</Insignia>
                      {animal.eliminado_en && <Insignia variante="archivado">{t('animales.deBaja')}</Insignia>}
                      <div className="ganado__acciones">
                        <Link className="btn btn-fantasma" to={`/animales/${animal.id}`}>
                          {t('animales.verFicha')}
                        </Link>
                      </div>
                    </li>
                  ))}
                </ul>
              </Tarjeta>
            )}
          </>
        )}
      </div>
    </DisenoApp>
  );
}