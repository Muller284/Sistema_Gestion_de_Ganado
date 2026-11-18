import { useState, type FormEvent } from 'react';
import { Alerta, Boton, CampoLista, CampoTexto, Cargando, Icono, Insignia, Segmentos, Tarjeta } from '../../componentes';
import { admin, type CatalogoRazas, type GrupoRaza, type RazaCatalogo } from '../../servicios/admin';
import { t, tn } from '../../servicios/idioma';
import { MarcoAdmin } from './comun';
import { numero, useCarga } from './formatos';

/**
 * Fase 4 · RF-60. El catálogo general de razas, el que ven todos los ranchos
 * (migración 009).
 *
 *   - Agregar una raza, con su grupo. Si algún rancho ya la había escrito en
 *     «Otra», la suya pasa a ser la del catálogo.
 *   - Cambiar el grupo, desactivarla (deja de ofrecerse, los animales que la
 *     tienen la conservan) y volver a activarla.
 *   - Las razas que escribieron los ranchos y no están en el catálogo, para
 *     agregarlas con un clic.
 *
 * Las categorías de animal son fijas (las usa el cálculo de categoría) y las
 * franjas de precio esperan a los planes (DECISIONES §50): no se editan acá.
 */

const GRUPOS: GrupoRaza[] = ['carne', 'leche', 'doble'];
type Filtro = 'activas' | 'desactivadas';

export function PaginaAdminCatalogo() {
  return (
    <MarcoAdmin activo="admin-catalogo" ruta={[t('admin.navegacion.catalogo')]} titulo={t('admin.catalogo.titulo')}>
      {() => <Catalogo />}
    </MarcoAdmin>
  );
}

function Catalogo() {
  const { datos, error, recargar } = useCarga(admin.razas);
  const [aviso, setAviso] = useState<{ tipo: 'exito' | 'error'; texto: string } | null>(null);
  const [propuesta, setPropuesta] = useState('');

  const listo = (texto: string) => {
    setAviso({ tipo: 'exito', texto });
    recargar();
  };
  const fallo = (err: unknown) => setAviso({ tipo: 'error', texto: (err as Error).message });

  if (error) return <Alerta variante="error">{error}</Alerta>;
  if (!datos) return <Cargando lineas={6} />;

  return (
    <>
      <p className="cuerpo c-600 admin__intro">{t('admin.catalogo.intro')}</p>
      {aviso && <Alerta variante={aviso.tipo}>{aviso.texto}</Alerta>}

      <div className="panel admin__catalogo">
        <NuevaRaza key={propuesta} inicial={propuesta} alCrear={listo} alFallar={fallo} />
        <DeLosRanchos datos={datos} alProponer={(nombre) => setPropuesta(nombre)} />
      </div>

      <Razas razas={datos.catalogo} alCambiar={listo} alFallar={fallo} />
    </>
  );
}

function NuevaRaza({
  inicial,
  alCrear,
  alFallar,
}: {
  inicial: string;
  alCrear: (mensaje: string) => void;
  alFallar: (err: unknown) => void;
}) {
  const [nombre, setNombre] = useState(inicial);
  const [grupo, setGrupo] = useState<GrupoRaza>('carne');
  const [enviando, setEnviando] = useState(false);

  async function crear(e: FormEvent) {
    e.preventDefault();
    setEnviando(true);
    try {
      const respuesta = await admin.crearRaza(nombre.trim(), grupo);
      setNombre('');
      alCrear(respuesta.mensaje);
    } catch (err) {
      alFallar(err);
    } finally {
      setEnviando(false);
    }
  }

  return (
    <Tarjeta titulo={t('admin.catalogo.nueva')}>
      <form className="col g16" onSubmit={crear}>
        <CampoTexto
          etiqueta={t('admin.catalogo.nombre')}
          placeholder={t('admin.catalogo.nombreEjemplo')}
          obligatorio
          maxLength={100}
          value={nombre}
          autoFocus={Boolean(inicial)}
          onChange={(e) => setNombre(e.target.value)}
        />
        <CampoLista
          etiqueta={t('admin.catalogo.grupo')}
          value={grupo}
          onChange={(e) => setGrupo(e.target.value as GrupoRaza)}
        >
          {GRUPOS.map((g) => (
            <option key={g} value={g}>
              {t(`admin.catalogo.grupos.${g}`)}
            </option>
          ))}
        </CampoLista>
        <div className="fila g8 admin__botones">
          <Boton type="submit" variante="primario" disabled={enviando || nombre.trim().length < 2}>
            <Icono nombre="mas" tamano={16} />
            {t('admin.catalogo.agregar')}
          </Boton>
        </div>
      </form>
    </Tarjeta>
  );
}

function DeLosRanchos({ datos, alProponer }: { datos: CatalogoRazas; alProponer: (nombre: string) => void }) {
  return (
    <Tarjeta titulo={t('admin.catalogo.deRanchos.titulo')}>
      <p className="pie c-600">{t('admin.catalogo.deRanchos.intro')}</p>
      {datos.de_ranchos.length === 0 ? (
        <p className="cuerpo c-500 admin__vacio">{t('admin.catalogo.deRanchos.ninguna')}</p>
      ) : (
        <ul className="admin__propuestas">
          {datos.de_ranchos.map((raza) => (
            <li key={raza.nombre}>
              <span className="flex1">
                <strong>{raza.nombre}</strong>
                <span className="pie c-500">
                  {' '}
                  · {tn('admin.catalogo.deRanchos.ranchos', raza.ranchos)} · {tn('admin.cuentas.animales', raza.animales)}
                </span>
              </span>
              <Boton variante="fantasma" onClick={() => alProponer(raza.nombre)}>
                {t('admin.catalogo.deRanchos.proponer')}
              </Boton>
            </li>
          ))}
        </ul>
      )}
    </Tarjeta>
  );
}

function Razas({
  razas,
  alCambiar,
  alFallar,
}: {
  razas: RazaCatalogo[];
  alCambiar: (mensaje: string) => void;
  alFallar: (err: unknown) => void;
}) {
  const [filtro, setFiltro] = useState<Filtro>('activas');
  const activas = razas.filter((r) => r.activa);
  const desactivadas = razas.filter((r) => !r.activa);
  const visibles = filtro === 'activas' ? activas : desactivadas;

  return (
    <Tarjeta
      titulo={t('admin.catalogo.lista')}
      accion={
        <Segmentos
          etiqueta={t('admin.vistas')}
          valor={filtro}
          alCambiar={setFiltro}
          opciones={[
            { clave: 'activas', nombre: t('admin.catalogo.activas'), cantidad: activas.length },
            { clave: 'desactivadas', nombre: t('admin.catalogo.desactivadas'), cantidad: desactivadas.length },
          ]}
        />
      }
    >
      {visibles.length === 0 ? (
        <p className="cuerpo c-500 centrado admin__vacio">{t('admin.catalogo.ningunaDesactivada')}</p>
      ) : (
        <div className="ganado__tabla-contenedor">
          <table className="ganado__tabla admin__tabla">
            <thead>
              <tr>
                <th>{t('admin.catalogo.nombre')}</th>
                <th>{t('admin.catalogo.grupo')}</th>
                <th className="numero">{t('admin.catalogo.animales')}</th>
                <th>
                  <span className="solo-lectores">{t('admin.catalogo.acciones')}</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {visibles.map((raza) => (
                <FilaRaza key={raza.id} raza={raza} alCambiar={alCambiar} alFallar={alFallar} />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Tarjeta>
  );
}

function FilaRaza({
  raza,
  alCambiar,
  alFallar,
}: {
  raza: RazaCatalogo;
  alCambiar: (mensaje: string) => void;
  alFallar: (err: unknown) => void;
}) {
  const [ocupada, setOcupada] = useState(false);

  async function cambiar(cambios: { grupo?: GrupoRaza; activa?: boolean }) {
    setOcupada(true);
    try {
      alCambiar((await admin.editarRaza(raza.id, cambios)).mensaje);
    } catch (err) {
      alFallar(err);
    } finally {
      setOcupada(false);
    }
  }

  return (
    <tr>
      <td>
        {raza.nombre} {!raza.activa && <Insignia variante="neutro">{t('admin.catalogo.desactivada')}</Insignia>}
      </td>
      <td>
        <label className="solo-lectores" htmlFor={`grupo-${raza.id}`}>
          {t('admin.catalogo.grupoDe', { nombre: raza.nombre })}
        </label>
        <select
          id={`grupo-${raza.id}`}
          className="admin__select"
          value={raza.grupo}
          disabled={ocupada}
          onChange={(e) => void cambiar({ grupo: e.target.value as GrupoRaza })}
        >
          {GRUPOS.map((g) => (
            <option key={g} value={g}>
              {t(`admin.catalogo.grupos.${g}`)}
            </option>
          ))}
        </select>
      </td>
      <td className="numero">{numero(raza.animales)}</td>
      <td className="admin__celda-accion">
        <Boton variante="fantasma" disabled={ocupada} onClick={() => void cambiar({ activa: !raza.activa })}>
          {raza.activa ? t('admin.catalogo.desactivar') : t('admin.catalogo.activar')}
        </Boton>
      </td>
    </tr>
  );
}
