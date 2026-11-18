import { useEffect, useState, type FormEvent, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { Alerta, Boton, CampoTexto, Cargando, DisenoApp, EstadoVacio, Icono, Insignia, type NombreIcono } from '../../componentes';
import { MOTIVO_MINIMO } from '../../servicios/admin';
import { api, guardarSoporte, soporteActual, type AccesoAdmin, type EstadoCuenta } from '../../servicios/api';
import { t, tn } from '../../servicios/idioma';
import { fechaHora } from './formatos';

/**
 * Fase 4 · Lo que comparten las pantallas del panel del Admin.
 *
 *   MarcoAdmin        el marco de siempre (DisenoApp), con la cuenta del Admin
 *                     y el aviso si quien entra no tiene ese rol.
 *   FormularioMotivo  el «¿por qué?» que se escribe en la misma fila, no en un
 *                     cuadro del navegador. Lo piden entrar a un rancho,
 *                     suspender, reactivar y mandar un enlace de contraseña.
 *   EntrarASoporte    el botón para entrar a un rancho (HU-24).
 *   ListaDeAccesos    el registro de accesos de soporte; también lo usa el
 *                     panel del propietario.
 */

let cuentaRecordada: EstadoCuenta | null = null;

export function MarcoAdmin({
  activo,
  ruta,
  titulo,
  acciones,
  children,
}: {
  activo: string;
  ruta: string[];
  titulo: string;
  acciones?: ReactNode;
  children: (cuenta: EstadoCuenta) => ReactNode;
}) {
  const [cuenta, setCuenta] = useState<EstadoCuenta | null>(cuentaRecordada);
  const [error, setError] = useState('');
  const soporte = soporteActual();

  useEffect(() => {
    let vigente = true;
    api
      .yo()
      .then((yo) => {
        cuentaRecordada = yo;
        if (vigente) setCuenta(yo);
      })
      .catch((err: Error) => vigente && setError(err.message));
    return () => {
      vigente = false;
    };
  }, []);

  const usuario = cuenta ? { nombre: cuenta.nombre, rol: cuenta.rol, correo: cuenta.correo } : { nombre: '…', rol: '—' };
  const esAdmin = cuenta?.rol === 'admin_plataforma';

  return (
    <DisenoApp
      activo={activo}
      ruta={[t('admin.menu'), ...ruta]}
      usuario={usuario}
      rancho={soporte?.rancho ?? null}
      rotulo={t('admin.rotulo')}
      titulo={titulo}
      acciones={esAdmin ? acciones : undefined}
    >
      <div className="col g24 admin">
        {error && <Alerta variante="error">{error}</Alerta>}
        {!cuenta && !error && <Cargando lineas={5} />}
        {cuenta && !esAdmin && (
          <EstadoVacio icono="escudo" titulo={t('admin.noEsTuRol.titulo')} texto={t('admin.noEsTuRol.texto')} />
        )}
        {esAdmin && soporte && <Alerta variante="info">{t('admin.sigueAdentro', { rancho: soporte.rancho })}</Alerta>}
        {esAdmin && children(cuenta)}
      </div>
    </DisenoApp>
  );
}

export function FormularioMotivo({
  etiqueta,
  ejemplo,
  ayuda,
  boton,
  icono,
  variante = 'primario',
  alConfirmar,
  alCancelar,
}: {
  etiqueta: string;
  ejemplo: string;
  ayuda?: string;
  boton: string;
  icono: NombreIcono;
  variante?: 'primario' | 'destructivo';
  alConfirmar: (motivo: string) => Promise<void>;
  alCancelar: () => void;
}) {
  const [motivo, setMotivo] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState('');
  const corto = motivo.trim().length < MOTIVO_MINIMO;

  async function confirmar(e: FormEvent) {
    e.preventDefault();
    setError('');
    setEnviando(true);
    try {
      await alConfirmar(motivo.trim());
    } catch (err) {
      setError((err as Error).message);
      setEnviando(false);
    }
  }

  return (
    <form className="admin__motivo" onSubmit={confirmar}>
      {error && <Alerta variante="error">{error}</Alerta>}
      <CampoTexto
        etiqueta={etiqueta}
        obligatorio
        autoFocus
        maxLength={300}
        placeholder={ejemplo}
        ayuda={ayuda ?? t('admin.motivo.ayuda', { n: MOTIVO_MINIMO })}
        value={motivo}
        onChange={(e) => setMotivo(e.target.value)}
      />
      <div className="fila g8 admin__botones">
        <Boton type="button" variante="secundario" onClick={alCancelar} disabled={enviando}>
          {t('comun.cancelar')}
        </Boton>
        <Boton type="submit" variante={variante} disabled={enviando || corto}>
          <Icono nombre={icono} tamano={16} />
          {enviando ? t('admin.motivo.enviando') : boton}
        </Boton>
      </div>
    </form>
  );
}

/** HU-24 · Entrar a un rancho para dar soporte, con el motivo en la misma tarjeta. */
export function EntrarASoporte({ ranchoId, rancho, abierto }: { ranchoId: string; rancho: string; abierto?: boolean }) {
  const navegar = useNavigate();
  const [pidiendo, setPidiendo] = useState(false);

  if (!pidiendo) {
    return (
      <Boton variante="secundario" onClick={() => setPidiendo(true)}>
        <Icono nombre="entrar" tamano={16} />
        {abierto ? t('admin.soporte.volver') : t('admin.ranchos.entrar')}
      </Boton>
    );
  }
  return (
    <FormularioMotivo
      etiqueta={t('admin.ranchos.motivo')}
      ejemplo={t('admin.ranchos.motivoEjemplo')}
      ayuda={t('admin.ranchos.motivoAyuda', { n: MOTIVO_MINIMO })}
      boton={t('admin.ranchos.entrarAlRancho')}
      icono="escudo"
      alCancelar={() => setPidiendo(false)}
      alConfirmar={async (motivo) => {
        const respuesta = await api.entrarARancho(ranchoId, motivo);
        guardarSoporte({ accesoId: respuesta.acceso.id, ranchoId, rancho, motivo: respuesta.acceso.motivo });
        navegar('/rancho');
      }}
    />
  );
}

const VARIANTE_ESTADO = { abierto: 'info', cerrado: 'neutro', vencido: 'adv' } as const;

function duracion(acceso: AccesoAdmin): string {
  if (!acceso.salido_en) return '';
  const minutos = Math.max(
    1,
    Math.round((new Date(acceso.salido_en).getTime() - new Date(acceso.entrado_en).getTime()) / 60000),
  );
  return tn('admin.registro.minutos', minutos);
}

/** HU-24 · El registro de accesos de soporte. También lo usa el panel del propietario. */
export function ListaDeAccesos({
  accesos,
  conAdmin = false,
}: {
  accesos: Pick<AccesoAdmin, 'id' | 'admin' | 'rancho' | 'motivo' | 'entrado_en' | 'salido_en' | 'estado'>[];
  conAdmin?: boolean;
}) {
  return (
    <ul className="admin__registro">
      {accesos.map((acceso) => (
        <li key={acceso.id} className="admin__acceso">
          <div className="admin__cuando">
            <span className="dato">{fechaHora(acceso.entrado_en)}</span>
            <span className="pie c-500">{duracion(acceso as AccesoAdmin)}</span>
          </div>
          <div className="admin__que">
            <strong>
              {conAdmin ? t('admin.registro.quienDonde', { admin: acceso.admin, rancho: acceso.rancho }) : acceso.admin}
            </strong>
            <span className="pie c-600">«{acceso.motivo}»</span>
          </div>
          <Insignia variante={VARIANTE_ESTADO[acceso.estado]}>{t(`admin.estado.${acceso.estado}`)}</Insignia>
        </li>
      ))}
    </ul>
  );
}
