import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Alerta,
  Boton,
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
import { conTransicion } from '../../servicios/transicion';
import { nivel, useContextoGanado, usuarioDe } from '../ganado/contexto';
import { FormularioFicha } from './FormularioFicha';

/**
 * Los animales del rancho, para llegar a cada ficha.
 *
 * HU-33, criterio 3: por defecto solo los activos; los vendidos, muertos y
 * archivados se consultan eligiendo su estado.
 * HU-34: los dados de baja tienen su propia vista y desde la ficha se
 * restauran.
 *
 * El listado con filtros y búsqueda es HU-29 (Brian): acá está solo lo que
 * hace falta para registrar un animal y abrir su ficha.
 */

type Vista = EstadoAnimal | 'todos' | 'bajas';
const VISTAS: Vista[] = ['activo', 'vendido', 'muerto', 'archivado', 'todos', 'bajas'];

export function PaginaListaAnimales() {
  const contexto = useContextoGanado();
  const navegar = useNavigate();
  const [animales, setAnimales] = useState<Animal[]>([]);
  const [vista, setVista] = useState<Vista>('activo');
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');
  const [registrando, setRegistrando] = useState(false);

  const puedeEditar = nivel(contexto, 'animales') === 'editar';

  useEffect(() => {
    let vigente = true;
    const pedido =
      vista === 'bajas'
        ? api.animales('todos', true).then((lista) => lista.filter((a) => a.eliminado_en))
        : api.animales(vista);
    pedido
      .then((lista) => {
        if (vigente) {
          setAnimales(lista);
          setError('');
        }
      })
      .catch((err: Error) => vigente && setError(err.message))
      .finally(() => vigente && setCargando(false));
    return () => {
      vigente = false;
    };
  }, [vista]);

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
        {(cargando || contexto.cargando) && <Cargando lineas={5} />}
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

        {!cargando && !error && (
          <>
            <Segmentos
              etiqueta={t('animales.vistas.etiqueta')}
              valor={vista}
              alCambiar={(nueva) => {
                setCargando(true);
                setVista(nueva);
              }}
              opciones={VISTAS.map((clave) => ({ clave, nombre: t(`animales.vistas.${clave}`) }))}
            />

            {animales.length === 0 ? (
              <EstadoVacio
                icono="animal"
                titulo={t('animales.vacio.titulo')}
                texto={vista === 'activo' && puedeEditar ? t('animales.vacio.texto') : t('animales.vacio.textoVista')}
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
