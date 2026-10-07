import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Alerta,
  Boton,
  CampoLista,
  CampoTexto,
  Cargando,
  Cifra,
  Dato,
  Datos,
  DisenoApp,
  EstadoVacio,
  GuiaConfiguracion,
  Icono,
  Insignia,
  MapaUbicacion,
  PasosDeAlta,
  Tarjeta,
} from '../../componentes';
import {
  api,
  type EstadoRancho,
  type Pais,
  type Rancho,
} from '../../servicios/api';
import { existe, localeActual, t } from '../../servicios/idioma';
import { AccesosDeSoporte } from './AccesosDeSoporte';

/**
 * HU-15, Creacion del rancho. La pantalla principal del propietario.
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

/**
 * Los tipos de producción son códigos que se mandan al servidor ('carne',
 * 'leche', 'mixto'): el código no cambia, solo el texto que se muestra.
 */
const TIPOS = ['carne', 'leche', 'mixto'];

/** El nombre del tipo en el idioma actual; si no lo conocemos, el código. */
function nombreTipo(codigo: string): string {
  return existe(`rancho.tipos.${codigo}`) ? t(`rancho.tipos.${codigo}`) : codigo;
}

/** "Producción de carne". Con un código que no conocemos, se arma con el código. */
function insigniaProduccion(codigo: string): string {
  return existe(`rancho.datos.produccion.${codigo}`)
    ? t(`rancho.datos.produccion.${codigo}`)
    : t('rancho.datos.produccionDe', { tipo: codigo });
}

/** El rol para la ruta de la cabecera, con el mismo nombre que en Mi perfil. */
function nombreRol(rol: string): string {
  return existe(`perfil.roles.${rol}`) ? t(`perfil.roles.${rol}`) : capitalizar(rol);
}

function fechaHora(valor: string | null | undefined): string {
  return valor ? new Date(valor).toLocaleString(localeActual()) : '—';
}

export function PaginaRancho() {
  const [estado, setEstado] = useState<EstadoRancho | null>(null);
  const [paises, setPaises] = useState<Pais[]>([]);
  const [formulario, setFormulario] = useState({ ...VACIO });
  const [editando, setEditando] = useState(false);
  const [error, setError] = useState('');
  const [aviso, setAviso] = useState('');
  const [cargando, setCargando] = useState(true);

  // Estados para el formulario de invitar colaborador (HU-13)

  /** Lo que se le pide al servidor para dibujar la pantalla. */
  async function pedirDatos() {
    const [datos, listaPaises] = await Promise.all([api.miRancho(), api.paises()]);
    return { datos, listaPaises };
  }

  function aplicarDatos({
    datos,
    listaPaises,
  }: Awaited<ReturnType<typeof pedirDatos>>) {
    setEstado(datos);
    setPaises(listaPaises);
    if (datos.rancho) volcarEnFormulario(datos.rancho);
  }

  async function recargar() {
    setCargando(true);
    setError('');
    try {
      aplicarDatos(await pedirDatos());
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
    let vigente = true;
    void (async () => {
      try {
        const resultado = await pedirDatos();
        if (!vigente) return;
        setError('');
        aplicarDatos(resultado);
      } catch (e) {
        if (!vigente) return;
        setError((e as Error).message);
        setEstado(null);
      } finally {
        if (vigente) setCargando(false);
      }
    })();
    return () => {
      vigente = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
        setAviso(t('rancho.avisos.actualizado'));
      } else {
        datos.id = crypto.randomUUID();
        await api.crear(datos);
        setAviso(t('rancho.avisos.creado'));
      }
      setEditando(false);
      await recargar();
    } catch (err) {
      setError((err as Error).message);
    }
  }

  async function darDeBaja() {
    if (!estado?.rancho) return;
    if (!confirm(t('rancho.confirmarBaja', { nombre: estado.rancho.nombre }))) return;
    setError('');
    setAviso('');
    try {
      await api.darDeBaja(estado.rancho.id);
      setAviso(t('rancho.avisos.dadoDeBaja'));
      setFormulario({ ...VACIO });
      await recargar();
    } catch (err) {
      setError((err as Error).message);
    }
  }

  const rancho = estado?.rancho ?? null;
  // HU-24: el Admin que entró a dar soporte puede lo mismo que el propietario.
  const esPropietario = estado?.usuario.rol === 'propietario' || Boolean(estado?.usuario.soporte);
  const mostrarFormulario = esPropietario && (!rancho || editando);
  const usuario = estado?.usuario ?? { nombre: t('rancho.invitado'), rol: '—' };

  // HU-14: Obtenemos los metadatos del país seleccionado actualmente
  const datosPaisActual = paises.find((p) => p.codigo === rancho?.pais_codigo);

  return (
    <DisenoApp
      ruta={[t('rancho.miRancho'), nombreRol(usuario.rol)]}
      usuario={usuario}
      rancho={rancho?.nombre ?? null}
      rotulo={t('rancho.rotulo')}
      titulo={rancho ? rancho.nombre : t('rancho.miRancho')}
      acciones={
        rancho && !editando && esPropietario ? (
          <>
            <Boton variante="secundario" onClick={() => setEditando(true)}>
              <Icono nombre="lapiz" tamano={18} />
              {t('rancho.acciones.editar')}
            </Boton>
            <Boton variante="destructivo" onClick={darDeBaja}>
              <Icono nombre="archivar" tamano={18} />
              {t('rancho.acciones.darDeBaja')}
            </Boton>
          </>
        ) : undefined
      }
    >
      <div className="col g24">
        {cargando && <Cargando />}
        {error && <Alerta variante="error">{error}</Alerta>}
        {aviso && <Alerta variante="exito">{aviso}</Alerta>}

        {!cargando && rancho && !editando && (
          <>
            <div className="rejilla-cifras">
              <Cifra
                rotulo={t('rancho.campos.superficie')}
                icono="regla"
                valor={t('rancho.hectareas', { n: Number(rancho.superficie) })}
                detalle={`${rancho.localidad}, ${rancho.departamento}`}
              />
              <Cifra
                rotulo={t('rancho.campos.tipoProduccion')}
                icono="produccion"
                valor={nombreTipo(rancho.tipo_produccion)}
                detalle={t('rancho.cifras.pais', { codigo: rancho.pais_codigo })}
              />
              <Cifra
                rotulo={t('rancho.cifras.existencias')}
                icono="animal"
                valor="—"
                detalle={t('rancho.cifras.llegaFase2')}
              />
              <Cifra
                rotulo={t('rancho.cifras.corrales')}
                icono="corral"
                valor="—"
                detalle={t('rancho.cifras.llegaFase2')}
              />
            </div>

            <div className="par">
              <Tarjeta
                titulo={t('rancho.datos.titulo')}
                accion={
                  <Insignia variante="exito">
                    {insigniaProduccion(rancho.tipo_produccion)}
                  </Insignia>
                }
              >
                <Datos>
                  <Dato nombre={t('rancho.campos.departamento')}>{rancho.departamento}</Dato>
                  <Dato nombre={t('rancho.campos.localidad')}>{rancho.localidad}</Dato>
                  <Dato nombre={t('rancho.campos.superficie')}>
                    {t('rancho.hectareas', { n: Number(rancho.superficie) })}
                  </Dato>
                  <Dato nombre={t('rancho.datos.coordenadas')}>
                    {rancho.latitud ? (
                      <span className="dato fila centro g6">
                        <Icono nombre="ubicacion" tamano={16} />
                        {Number(rancho.latitud)}, {Number(rancho.longitud)}
                      </span>
                    ) : (
                      <span className="c-500">{t('rancho.datos.sinUbicacion')}</span>
                    )}
                  </Dato>
                  
                  {/* HU-14: Mostramos la configuración regional */}
                  <Dato nombre={t('rancho.datos.monedaIdioma')}>
                    {datosPaisActual ? `${datosPaisActual.moneda} (${datosPaisActual.idioma})` : '—'}
                  </Dato>
                  <Dato nombre={t('rancho.datos.unidades')}>
                    {datosPaisActual
                      ? t('rancho.datos.unidadesValor', {
                          peso: String(datosPaisActual.unidad_peso),
                          superficie: String(datosPaisActual.unidad_superficie),
                        })
                      : '—'}
                  </Dato>
                  <Dato nombre={t('rancho.datos.zonaHoraria')}>
                    {datosPaisActual ? `${datosPaisActual.zona_horaria} (${datosPaisActual.formato_fecha})` : '—'}
                  </Dato>
                  <Dato nombre={t('rancho.datos.franjaPrecio')}>
                    {datosPaisActual?.franja_precio ?? '—'}
                  </Dato>

                  {/* HU-23: Auditoría y autoría de datos */}
                  <Dato nombre={t('rancho.datos.auditoria')}>
                    <div className="texto-secundario">
                      {t('rancho.datos.creadoEl', { fecha: fechaHora(rancho.creado_en) })}
                      <br />
                      {t('rancho.datos.modificadoEl', { fecha: fechaHora(rancho.modificado_en) })}
                    </div>
                  </Dato>
                </Datos>
              </Tarjeta>

              {/* HU-16: la guía de configuración ocupa el lugar del
                  recorrido fijo que había. El formulario provisional de
                  HU-13 que estaba debajo se reemplazó por la pantalla de
                  Equipo (HU-17), que aplica la misma regla y además crea
                  al integrante. */}
              {esPropietario ? (
                <GuiaConfiguracion />
              ) : (
                <Tarjeta titulo={t('rancho.lugar.titulo')}>
                  <div className="col g16 inicio">
                  <p className="cuerpo c-600">
                    {usuario.rol === 'socio'
                      ? t('rancho.lugar.socio')
                      : t('rancho.lugar.colaborador')}
                  </p>
                  {usuario.rol === 'socio' && (
                    <Link className="btn btn-secundario" to="/equipo">
                      <Icono nombre="equipo" tamano={18} />
                      {t('rancho.lugar.verEquipo')}
                    </Link>
                  )}
                  </div>
                </Tarjeta>
              )}
            </div>
          </>
        )}

        {!cargando && rancho && estado?.usuario.rol === 'propietario' && <AccesosDeSoporte />}

        {!cargando && !rancho && !esPropietario && estado && (
          <EstadoVacio
            titulo={t('rancho.sinRancho.titulo')}
            texto={t('rancho.sinRancho.texto')}
          />
        )}

        {!cargando && mostrarFormulario && !rancho && <PasosDeAlta actual={3} />}

        {!cargando && mostrarFormulario && (
          <Tarjeta titulo={rancho ? t('rancho.formulario.editar') : t('rancho.formulario.crear')}>
            <form onSubmit={guardar} className="col g16">
              <CampoTexto
                etiqueta={t('rancho.campos.nombre')}
                obligatorio
                placeholder={t('rancho.formulario.nombreEjemplo')}
                {...campo('nombre')}
              />
              <div className="par">
                <CampoTexto etiqueta={t('rancho.campos.departamento')} obligatorio {...campo('departamento')} />
                <CampoTexto etiqueta={t('rancho.campos.localidad')} obligatorio {...campo('localidad')} />
              </div>
              <div className="par">
                <CampoTexto
                  etiqueta={t('rancho.campos.superficie')}
                  ayuda={t('rancho.formulario.superficieAyuda')}
                  obligatorio
                  type="number"
                  step="0.01"
                  min="0.01"
                  {...campo('superficie')}
                />
                <CampoLista
                  etiqueta={t('rancho.campos.tipoProduccion')}
                  obligatorio
                  {...campo('tipo_produccion')}
                >
                  {TIPOS.map((codigo) => (
                    <option key={codigo} value={codigo}>
                      {nombreTipo(codigo)}
                    </option>
                  ))}
                </CampoLista>
              </div>
              <CampoLista etiqueta={t('rancho.campos.pais')} obligatorio {...campo('pais_codigo')}>
                {paises.map((p) => (
                  <option key={p.codigo} value={p.codigo}>
                    {p.nombre}
                  </option>
                ))}
              </CampoLista>
              <div className="col g8">
                <span className="etiqueta-campo">{t('rancho.campos.ubicacion')}</span>
                <MapaUbicacion
                  latitud={formulario.latitud}
                  longitud={formulario.longitud}
                  alElegir={(latitud, longitud) =>
                    setFormulario({
                      ...formulario,
                      latitud: String(latitud),
                      longitud: String(longitud),
                    })
                  }
                />
              </div>

              <div className="par">
                <CampoTexto
                  etiqueta={t('rancho.campos.latitud')}
                  ayuda={t('rancho.formulario.latitudAyuda')}
                  {...campo('latitud')}
                />
                <CampoTexto
                  etiqueta={t('rancho.campos.longitud')}
                  ayuda={t('rancho.formulario.longitudAyuda')}
                  {...campo('longitud')}
                />
              </div>
              <div className="fila centro g8">
                <Boton type="submit" variante="primario">
                  <Icono nombre={rancho ? 'exito' : 'mas'} tamano={18} />
                  {rancho ? t('rancho.formulario.guardarCambios') : t('rancho.formulario.crearRancho')}
                </Boton>
                {rancho && (
                  <Boton
                    variante="fantasma"
                    onClick={() => {
                      setEditando(false);
                      volcarEnFormulario(rancho);
                    }}
                  >
                    {t('comun.cancelar')}
                  </Boton>
                )}
              </div>
            </form>
          </Tarjeta>
        )}

        {!cargando && !esPropietario && rancho && (
          <Alerta variante="info">
            {t('rancho.soloPropietario')}
          </Alerta>
        )}
      </div>
    </DisenoApp>
  );
}

function capitalizar(texto: string): string {
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}
