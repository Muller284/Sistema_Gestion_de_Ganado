import { useEffect, useState, type FormEvent } from 'react';
import {
  Alerta,
  Boton,
  Cargando,
  CampoTexto,
  DisenoApp,
  EstadoVacio,
  Icono,
  Insignia,
  Segmentos,
  Tarjeta,
} from '../../componentes';
import { api, type Corral } from '../../servicios/api';
import { t } from '../../servicios/idioma';
import { conTransicion } from '../../servicios/transicion';
import {
  formatoSuperficie,
  superficieAGuardar,
  superficieAMostrar,
  type Regional,
} from '../../servicios/unidades';
import { nivel, useContextoGanado, usuarioDe } from '../ganado/contexto';

/**
 * HU-36 · Creación de corrales.
 *
 *   1. El nombre del corral es único dentro del rancho (lo controla el
 *      servidor; acá se muestra su mensaje).
 *   2. La capacidad es opcional; si no se carga, no hay aviso de sobrepoblación.
 *   3. El listado muestra la ocupación actual sobre la capacidad.
 *
 * HU-34: dar de baja no borra; la vista "Dados de baja" permite restaurar.
 * HU-26: la superficie se escribe y se ve en hectáreas o acres según el país.
 * HU-21 y HU-22: quien solo puede ver no encuentra los botones de cargar.
 */

type Vista = 'vigentes' | 'bajas';
const NUEVO = 'nuevo';

export function PaginaCorrales() {
  const contexto = useContextoGanado();
  const [corrales, setCorrales] = useState<Corral[]>([]);
  const [vista, setVista] = useState<Vista>('vigentes');
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');
  const [aviso, setAviso] = useState('');
  const [editando, setEditando] = useState<string | null>(null);
  const [confirmando, setConfirmando] = useState<string | null>(null);
  const [ocupado, setOcupado] = useState<string | null>(null);

  const puedeEditar = nivel(contexto, 'corrales') === 'editar';

  // Cambiar la versión vuelve a pedir la lista.
  const [version, setVersion] = useState(0);
  const recargar = () => setVersion((previa) => previa + 1);

  useEffect(() => {
    let vigente = true;
    api
      .corrales(true)
      .then((lista) => vigente && setCorrales(lista))
      .catch((err: Error) => vigente && setError(err.message))
      .finally(() => vigente && setCargando(false));
    return () => {
      vigente = false;
    };
  }, [version]);

  const visibles = corrales.filter((c) => (vista === 'bajas') === Boolean(c.eliminado_en));
  const cuantosDeBaja = corrales.filter((c) => c.eliminado_en).length;

  function abrir(id: string | null) {
    conTransicion(() => {
      setEditando(id);
      setConfirmando(null);
      setError('');
    });
  }

  async function accion(id: string, hacer: () => Promise<{ mensaje: string }>) {
    setOcupado(id);
    setError('');
    setAviso('');
    try {
      const respuesta = await hacer();
      setAviso(respuesta.mensaje);
      setConfirmando(null);
      recargar();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setOcupado(null);
    }
  }

  function alGuardar(mensaje: string) {
    setAviso(mensaje);
    abrir(null);
    recargar();
  }

  return (
    <DisenoApp
      activo="corrales"
      ruta={[t('app.modulos.inicio'), t('corrales.titulo')]}
      usuario={usuarioDe(contexto)}
      rancho={contexto.rancho?.rancho?.nombre ?? null}
      rotulo={t('corrales.rotulo')}
      titulo={t('corrales.titulo')}
      acciones={
        puedeEditar &&
        editando === null && (
          <Boton variante="primario" onClick={() => abrir(NUEVO)}>
            <Icono nombre="mas" tamano={18} />
            {t('corrales.nuevo')}
          </Boton>
        )
      }
    >
      <div className="col g24">
        {(cargando || contexto.cargando) && <Cargando lineas={4} />}
        {error && <Alerta variante="error">{error}</Alerta>}
        {contexto.error && <Alerta variante="error">{contexto.error}</Alerta>}
        {aviso && <Alerta variante="exito">{aviso}</Alerta>}
        {!contexto.cargando && !puedeEditar && !error && (
          <Alerta variante="info">{t('corrales.soloConsulta')}</Alerta>
        )}

        {editando === NUEVO && (
          <FormularioCorral regional={contexto.regional} alGuardar={alGuardar} alCancelar={() => abrir(null)} />
        )}

        {!cargando && !error && (
          <>
            {cuantosDeBaja > 0 && (
              <Segmentos
                etiqueta={t('corrales.vistas.etiqueta')}
                valor={vista}
                alCambiar={setVista}
                opciones={[
                  { clave: 'vigentes', nombre: t('corrales.vistas.vigentes'), cantidad: corrales.length - cuantosDeBaja },
                  { clave: 'bajas', nombre: t('corrales.vistas.bajas'), cantidad: cuantosDeBaja },
                ]}
              />
            )}

            {visibles.length === 0 ? (
              <EstadoVacio
                icono="corral"
                titulo={t('corrales.vacio.titulo')}
                texto={puedeEditar ? t('corrales.vacio.texto') : t('corrales.vacio.textoConsulta')}
              />
            ) : (
              <Tarjeta>
                <ul className="ganado__lista">
                  {visibles.map((corral) =>
                    editando === corral.id ? (
                      <li key={corral.id} className="ganado__fila">
                        <FormularioCorral
                          corral={corral}
                          regional={contexto.regional}
                          alGuardar={alGuardar}
                          alCancelar={() => abrir(null)}
                        />
                      </li>
                    ) : (
                      <FilaCorral
                        key={corral.id}
                        corral={corral}
                        regional={contexto.regional}
                        editable={puedeEditar && editando === null}
                        confirmando={confirmando === corral.id}
                        ocupado={ocupado === corral.id}
                        alEditar={() => abrir(corral.id)}
                        alPedirBaja={() => setConfirmando(corral.id)}
                        alCancelarBaja={() => setConfirmando(null)}
                        alDarDeBaja={() => accion(corral.id, () => api.bajaCorral(corral.id))}
                        alRestaurar={() => accion(corral.id, () => api.restaurarCorral(corral.id))}
                      />
                    ),
                  )}
                </ul>
              </Tarjeta>
            )}
          </>
        )}
      </div>
    </DisenoApp>
  );
}

interface PropiedadesFila {
  corral: Corral;
  regional: Regional;
  editable: boolean;
  confirmando: boolean;
  ocupado: boolean;
  alEditar: () => void;
  alPedirBaja: () => void;
  alCancelarBaja: () => void;
  alDarDeBaja: () => void;
  alRestaurar: () => void;
}

function FilaCorral({
  corral,
  regional,
  editable,
  confirmando,
  ocupado,
  alEditar,
  alPedirBaja,
  alCancelarBaja,
  alDarDeBaja,
  alRestaurar,
}: PropiedadesFila) {
  const deBaja = Boolean(corral.eliminado_en);

  return (
    <li className={deBaja ? 'ganado__fila de-baja' : 'ganado__fila'}>
      <div className="ganado__principal">
        <span className="cuerpo-m">{corral.nombre}</span>
        <span className="pie c-500">
          {corral.superficie_ha
            ? formatoSuperficie(Number(corral.superficie_ha), regional)
            : t('corrales.sinSuperficie')}
        </span>
      </div>

      {/* Criterio 3: ocupación sobre capacidad. Criterio 2: sin capacidad, sin aviso. */}
      <span className="ganado__dato">
        {corral.capacidad === null
          ? t('corrales.ocupacionSinTope', { n: corral.ocupacion })
          : t('corrales.ocupacion', { n: corral.ocupacion, capacidad: corral.capacidad })}
      </span>
      {corral.sobrepoblado && <Insignia variante="adv">{t('corrales.sobrepoblado')}</Insignia>}
      {deBaja && <Insignia variante="archivado">{t('corrales.deBaja')}</Insignia>}

      {editable && (
        <div className="ganado__acciones">
          {deBaja ? (
            <Boton variante="secundario" onClick={alRestaurar} disabled={ocupado}>
              {t('corrales.restaurar')}
            </Boton>
          ) : confirmando ? (
            <>
              <span className="pie c-600">{t('corrales.confirmarBaja', { nombre: corral.nombre })}</span>
              <Boton variante="secundario" onClick={alCancelarBaja} disabled={ocupado}>
                {t('comun.cancelar')}
              </Boton>
              <Boton variante="destructivo" onClick={alDarDeBaja} disabled={ocupado}>
                {t('corrales.darDeBaja')}
              </Boton>
            </>
          ) : (
            <>
              <Boton variante="fantasma" onClick={alEditar} disabled={ocupado}>
                <Icono nombre="lapiz" tamano={16} />
                {t('corrales.editar')}
              </Boton>
              <Boton variante="fantasma" onClick={alPedirBaja} disabled={ocupado}>
                <Icono nombre="archivar" tamano={16} />
                {t('corrales.darDeBaja')}
              </Boton>
            </>
          )}
        </div>
      )}
    </li>
  );
}

interface PropiedadesFormulario {
  corral?: Corral;
  regional: Regional;
  alGuardar: (mensaje: string) => void;
  alCancelar: () => void;
}

function FormularioCorral({ corral, regional, alGuardar, alCancelar }: PropiedadesFormulario) {
  const [nombre, setNombre] = useState(corral?.nombre ?? '');
  const [capacidad, setCapacidad] = useState(corral?.capacidad?.toString() ?? '');
  const [superficie, setSuperficie] = useState(
    corral?.superficie_ha
      ? String(Math.round(superficieAMostrar(Number(corral.superficie_ha), regional.superficie) * 100) / 100)
      : '',
  );
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState('');

  async function enviar(evento: FormEvent) {
    evento.preventDefault();
    setEnviando(true);
    setError('');
    const datos = {
      nombre,
      capacidad: capacidad === '' ? null : Number(capacidad),
      // HU-26: lo escrito en acres se guarda en hectáreas.
      superficie_ha: superficie === '' ? null : superficieAGuardar(Number(superficie), regional.superficie),
    };
    try {
      const respuesta = corral
        ? await api.actualizarCorral(corral.id, datos)
        : await api.crearCorral(datos);
      alGuardar(respuesta.mensaje);
    } catch (err) {
      setError((err as Error).message);
      setEnviando(false);
    }
  }

  const unidad = t(`unidades.superficie.${regional.superficie}`);

  return (
    <form className="col g16 flex1" onSubmit={enviar} noValidate>
      <Tarjeta
        titulo={corral ? t('corrales.formulario.editar', { nombre: corral.nombre }) : t('corrales.formulario.nuevo')}
        pie={
          <div className="fila g8">
            <Boton variante="secundario" onClick={alCancelar} disabled={enviando}>
              {t('comun.cancelar')}
            </Boton>
            <Boton variante="primario" type="submit" disabled={enviando || !nombre.trim()}>
              {enviando ? t('comun.guardando') : t('comun.guardar')}
            </Boton>
          </div>
        }
      >
        <div className="col g16">
          {error && <Alerta variante="error">{error}</Alerta>}
          <CampoTexto
            etiqueta={t('corrales.formulario.nombre')}
            obligatorio
            maxLength={100}
            placeholder={t('corrales.formulario.nombreEjemplo')}
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
          />
          <div className="par">
            <CampoTexto
              etiqueta={t('corrales.formulario.capacidad')}
              ayuda={t('corrales.formulario.capacidadAyuda')}
              type="number"
              min={1}
              step={1}
              inputMode="numeric"
              value={capacidad}
              onChange={(e) => setCapacidad(e.target.value)}
            />
            <CampoTexto
              etiqueta={t('corrales.formulario.superficie', { unidad })}
              ayuda={t('corrales.formulario.superficieAyuda')}
              type="number"
              min={0}
              step="any"
              inputMode="decimal"
              value={superficie}
              onChange={(e) => setSuperficie(e.target.value)}
            />
          </div>
        </div>
      </Tarjeta>
    </form>
  );
}
