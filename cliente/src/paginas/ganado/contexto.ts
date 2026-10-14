import { useEffect, useState } from 'react';
import { api, type EstadoRancho, type MisPermisos, type NivelModulo } from '../../servicios/api';
import { t } from '../../servicios/idioma';
import { cargarRegional, REGIONAL_POR_DEFECTO, type Regional } from '../../servicios/unidades';

/**
 * Lo que necesitan todas las pantallas de animales y corrales antes de
 * dibujar: quién entró, a qué rancho, qué puede en cada módulo (HU-21 y
 * HU-22) y en qué unidades trabaja (HU-26).
 */
export interface Contexto {
  rancho: EstadoRancho | null;
  permisos: MisPermisos;
  regional: Regional;
  cargando: boolean;
  error: string;
}

export function useContextoGanado(): Contexto {
  const [contexto, setContexto] = useState<Contexto>({
    rancho: null,
    permisos: {},
    regional: REGIONAL_POR_DEFECTO,
    cargando: true,
    error: '',
  });

  useEffect(() => {
    let vigente = true;
    Promise.all([api.miRancho(), api.misPermisos(), cargarRegional()])
      .then(([rancho, permisos, regional]) => {
        if (vigente) setContexto({ rancho, permisos, regional, cargando: false, error: '' });
      })
      .catch((err: Error) => {
        if (vigente) setContexto((previo) => ({ ...previo, cargando: false, error: err.message }));
      });
    return () => {
      vigente = false;
    };
  }, []);

  return contexto;
}

export function nivel(contexto: Contexto, modulo: string): NivelModulo {
  return contexto.permisos[modulo] ?? 'ninguno';
}

/** Para DisenoApp mientras todavía no se sabe quién es. */
export function usuarioDe(contexto: Contexto) {
  return contexto.rancho?.usuario ?? { nombre: t('equipo.invitado'), rol: '—' };
}
