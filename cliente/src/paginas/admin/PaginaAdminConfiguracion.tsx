import { useState, type FormEvent } from 'react';
import { Alerta, Boton, CampoTexto, Cargando, Icono, Tarjeta } from '../../componentes';
import { admin, type ConfiguracionPlataforma } from '../../servicios/admin';
import { t } from '../../servicios/idioma';
import { MarcoAdmin } from './comun';
import { useCarga } from './formatos';

/**
 * Fase 4 · RNF-04 y RNF-11. Lo que se cambia seguido, en un formulario y no
 * en el código ni en el .env: por ahora, las cuotas del asistente.
 *
 *   Consultas por persona al mes   vacío = la del .env (ASISTENTE_CONSULTAS_MES).
 *   Tope de la plataforma al mes   vacío = sin tope. Con la capa gratis de
 *                                  Gemini conviene ponerlo: el límite diario
 *                                  de Google es de toda la plataforma.
 *
 * Rige desde que se guarda y queda en la auditoría con el valor de antes.
 */

export function PaginaAdminConfiguracion() {
  return (
    <MarcoAdmin
      activo="admin-configuracion"
      ruta={[t('admin.navegacion.configuracion')]}
      titulo={t('admin.configuracion.titulo')}
    >
      {() => <Configuracion />}
    </MarcoAdmin>
  );
}

function Configuracion() {
  const { datos, error } = useCarga(admin.configuracion);
  if (error) return <Alerta variante="error">{error}</Alerta>;
  if (!datos) return <Cargando lineas={4} />;
  return <Formulario inicial={datos} />;
}

const comoTexto = (valor: number | null) => (valor === null ? '' : String(valor));

/** Vacío → null; si no, el número (el servidor valida que sea entero y positivo). */
function comoValor(texto: string): number | null {
  const limpio = texto.trim();
  return limpio === '' ? null : Number(limpio);
}

function Formulario({ inicial }: { inicial: ConfiguracionPlataforma }) {
  const [porUsuario, setPorUsuario] = useState(comoTexto(inicial.asistente_consultas_mes));
  const [tope, setTope] = useState(comoTexto(inicial.asistente_tope_mensual));
  const [guardado, setGuardado] = useState(inicial);
  const [enviando, setEnviando] = useState(false);
  const [aviso, setAviso] = useState<{ tipo: 'exito' | 'error'; texto: string } | null>(null);

  const cambio =
    comoTexto(guardado.asistente_consultas_mes) !== porUsuario.trim() ||
    comoTexto(guardado.asistente_tope_mensual) !== tope.trim();

  async function guardar(e: FormEvent) {
    e.preventDefault();
    setEnviando(true);
    setAviso(null);
    try {
      const respuesta = await admin.guardarConfiguracion({
        asistente_consultas_mes: comoValor(porUsuario),
        asistente_tope_mensual: comoValor(tope),
      });
      setGuardado(respuesta);
      setPorUsuario(comoTexto(respuesta.asistente_consultas_mes));
      setTope(comoTexto(respuesta.asistente_tope_mensual));
      setAviso({ tipo: 'exito', texto: respuesta.mensaje ?? t('admin.configuracion.guardado') });
    } catch (err) {
      setAviso({ tipo: 'error', texto: (err as Error).message });
    } finally {
      setEnviando(false);
    }
  }

  return (
    <>
      <p className="cuerpo c-600 admin__intro">{t('admin.configuracion.intro')}</p>
      {aviso && <Alerta variante={aviso.tipo}>{aviso.texto}</Alerta>}

      <Tarjeta titulo={t('admin.configuracion.asistente')}>
        <form className="col g16 admin__formulario" onSubmit={guardar}>
          <CampoTexto
            etiqueta={t('admin.configuracion.porUsuario')}
            inputMode="numeric"
            placeholder={t('admin.configuracion.deFabrica', { n: inicial.por_defecto.asistente_consultas_mes })}
            ayuda={t('admin.configuracion.porUsuarioAyuda', { n: inicial.por_defecto.asistente_consultas_mes })}
            value={porUsuario}
            onChange={(e) => setPorUsuario(e.target.value)}
          />
          <CampoTexto
            etiqueta={t('admin.configuracion.tope')}
            inputMode="numeric"
            placeholder={t('admin.configuracion.sinTope')}
            ayuda={t('admin.configuracion.topeAyuda')}
            value={tope}
            onChange={(e) => setTope(e.target.value)}
          />
          <div className="fila g8 admin__botones">
            <Boton type="submit" variante="primario" disabled={enviando || !cambio}>
              <Icono nombre="exito" tamano={16} />
              {enviando ? t('admin.motivo.enviando') : t('admin.configuracion.guardar')}
            </Boton>
          </div>
        </form>
      </Tarjeta>

      <div className="admin__futuro">
        <p className="h3">{t('admin.configuracion.futuro.titulo')}</p>
        <p className="cuerpo c-600">{t('admin.configuracion.futuro.texto')}</p>
      </div>
    </>
  );
}
