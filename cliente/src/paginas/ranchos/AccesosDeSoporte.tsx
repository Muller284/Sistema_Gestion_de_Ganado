import { useEffect, useState } from 'react';
import { Alerta, Tarjeta } from '../../componentes';
import { api, type AccesoAdmin } from '../../servicios/api';
import { t } from '../../servicios/idioma';
import { ListaDeAccesos } from '../admin/PaginaAdmin';

/**
 * HU-24 · Quién del soporte de la plataforma entró a este rancho, cuándo y
 * por qué. Lo ve el propietario en su panel.
 *
 * No es un criterio de la historia, pero si el registro de accesos solo lo
 * viera quien entra, no le serviría de nada al dueño de los datos.
 * Mientras nadie haya entrado, no ocupa lugar: solo una línea.
 */
export function AccesosDeSoporte() {
  const [accesos, setAccesos] = useState<AccesoAdmin[] | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let vigente = true;
    api
      .accesosDeMiRancho()
      .then((lista) => vigente && setAccesos(lista))
      .catch((err) => vigente && setError((err as Error).message));
    return () => {
      vigente = false;
    };
  }, []);

  if (error) return <Alerta variante="error">{error}</Alerta>;
  if (!accesos) return null;
  if (accesos.length === 0) {
    return <p className="pie c-500 accesos-soporte__nadie">{t('admin.deMiRancho.nadie')}</p>;
  }

  return (
    <Tarjeta titulo={t('admin.deMiRancho.titulo')}>
      <p className="cuerpo c-600 accesos-soporte__intro">{t('admin.deMiRancho.intro')}</p>
      <ListaDeAccesos accesos={accesos} />
    </Tarjeta>
  );
}
