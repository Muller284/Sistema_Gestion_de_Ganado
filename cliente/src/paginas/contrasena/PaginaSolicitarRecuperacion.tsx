import { useState } from 'react';
import { Alerta, Boton, CampoTexto, DisenoAcceso, Icono } from '../../componentes';
import { api } from '../../servicios/api';

export function PaginaSolicitarRecuperacion() {
  const [correo, setCorreo] = useState('');
  const [error, setError] = useState('');
  const [exito, setExito] = useState(false);
  const [enviando, setEnviando] = useState(false);

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    if (!correo) {
      setError('Por favor ingresa tu correo electrónico.');
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
        titulo="Revisa tu bandeja"
        nota="Si tu correo está registrado, te hemos enviado instrucciones."
      >
        <div className="col g16">
          <Alerta variante="adv">
            Haz clic en el enlace que te enviamos para crear una nueva contraseña. Recuerda que el enlace caduca en 1 hora.
          </Alerta>
          <Boton variante="secundario" bloque onClick={() => window.location.href = '/'}>
            Volver al inicio
          </Boton>
        </div>
      </DisenoAcceso>
    );
  }

  // Pantalla normal del formulario
  return (
    <DisenoAcceso
      icono="llave"
      titulo="Recuperar contraseña"
      nota="Ingresa tu correo y te enviaremos un enlace para recuperarla."
    >
      <div className="col g16">
        {error && <Alerta variante="error">{error}</Alerta>}

        <form onSubmit={enviar} className="col g16">
          <CampoTexto
            etiqueta="Correo electrónico"
            obligatorio
            type="email"
            placeholder="ejemplo@correo.com"
            value={correo}
            onChange={(e) => setCorreo(e.target.value)}
          />
          <Boton type="submit" variante="primario" bloque disabled={enviando}>
            {enviando ? 'Enviando enlace...' : 'Enviar enlace'}
          </Boton>
          <Boton type="button" variante="secundario" bloque onClick={() => window.location.href = '/'}>
            Cancelar
          </Boton>
        </form>
      </div>
    </DisenoAcceso>
  );
}