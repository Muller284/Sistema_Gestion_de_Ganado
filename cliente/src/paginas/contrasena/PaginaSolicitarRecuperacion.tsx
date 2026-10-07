import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Alerta, Boton, CampoTexto, DisenoAcceso,  } from '../../componentes';
import { api } from '../../servicios/api';
import { t } from '../../servicios/idioma';

export function PaginaSolicitarRecuperacion() {
  const [correo, setCorreo] = useState('');
  const [error, setError] = useState('');
  const [exito, setExito] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const navegar = useNavigate();

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    if (!correo) {
      setError(t('acceso.contrasena.solicitar.faltaCorreo'));
      return;
    }

    setEnviando(true);
    try {
      // Esta función la agregaremos a la API en el siguiente paso
      await api.solicitarRecuperacion(correo);
      setExito(true);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setEnviando(false);
    }
  }

  // Si el correo se envió, mostramos el mensaje de éxito
  if (exito) {
    return (
      <DisenoAcceso
        icono="llave"
        titulo={t('acceso.contrasena.solicitar.exito.titulo')}
        nota={t('acceso.contrasena.solicitar.exito.nota')}
      >
        <div className="col g16">
          <Alerta variante="adv">{t('acceso.contrasena.solicitar.exito.texto')}</Alerta>
          <Boton variante="secundario" bloque onClick={() => navegar('/ingreso')}>
            {t('acceso.contrasena.solicitar.exito.volverIngresar')}
          </Boton>
        </div>
      </DisenoAcceso>
    );
  }

  // Pantalla normal del formulario
  return (
    <DisenoAcceso
      icono="llave"
      titulo={t('acceso.contrasena.solicitar.titulo')}
      nota={t('acceso.contrasena.solicitar.nota')}
    >
      <div className="col g16">
        {error && <Alerta variante="error">{error}</Alerta>}

        <form onSubmit={enviar} className="col g16">
          <CampoTexto
            etiqueta={t('acceso.contrasena.solicitar.correo')}
            obligatorio
            type="email"
            placeholder={t('acceso.contrasena.solicitar.correoEjemplo')}
            value={correo}
            onChange={(e) => setCorreo(e.target.value)}
          />
          <Boton type="submit" variante="primario" bloque disabled={enviando}>
            {enviando
              ? t('acceso.contrasena.solicitar.enviando')
              : t('acceso.contrasena.solicitar.enviar')}
          </Boton>
          <Boton type="button" variante="secundario" bloque onClick={() => navegar('/ingreso')}>
            {t('comun.cancelar')}
          </Boton>
        </form>
      </div>
    </DisenoAcceso>
  );
}