import { Module } from '@nestjs/common';
import { PermisosModulo } from '../../comun/permisos-modulo';
import { RepositorioUsuarioActual } from '../../comun/repositorio-usuario-actual';
import { RepositorioAnimales } from '../animales/repositorio-animales';
import { RepositorioRazas } from '../animales/repositorio-razas';
import { ServicioAnimales } from '../animales/servicio-animales';
import { RepositorioCorrales } from '../corrales/repositorio-corrales';
import { ServicioCorrales } from '../corrales/servicio-corrales';
import { RepositorioIndicadores } from '../indicadores/repositorio-indicadores';
import { ServicioIndicadores } from '../indicadores/servicio-indicadores';
import { RepositorioPesajes } from '../pesajes/repositorio-pesajes';
import { ServicioPesajes } from '../pesajes/servicio-pesajes';
import { RepositorioSanidad } from '../sanidad/repositorio-sanidad';
import { ServicioSanidad } from '../sanidad/servicio-sanidad';
import { RepositorioVacunacion } from '../vacunacion/repositorio-vacunacion';
import { ServicioVacunacion } from '../vacunacion/servicio-vacunacion';
import { ControladorAsistente } from './controlador-asistente';
import { HerramientasAsistente } from './herramientas-asistente';
import { ProveedorAsistente } from './proveedor-asistente';
import { RepositorioAsistente } from './repositorio-asistente';
import { ServicioAsistente } from './servicio-asistente';
import { VozAsistente } from './voz-asistente';

/**
 * Fase 5 · Asistente. Usa los mismos servicios que las pantallas, así que los
 * declara acá como el resto de los módulos declara PermisosModulo: cada
 * módulo de Nest arma sus propias instancias (todas sin estado).
 * RepositorioUsuarioActual lo pide GuardiaCuentaLista.
 */
@Module({
  controllers: [ControladorAsistente],
  providers: [
    ServicioAsistente,
    RepositorioAsistente,
    ProveedorAsistente,
    VozAsistente,
    HerramientasAsistente,
    ServicioAnimales,
    RepositorioAnimales,
    RepositorioRazas,
    ServicioCorrales,
    RepositorioCorrales,
    ServicioIndicadores,
    RepositorioIndicadores,
    ServicioPesajes,
    RepositorioPesajes,
    ServicioSanidad,
    RepositorioSanidad,
    ServicioVacunacion,
    RepositorioVacunacion,
    PermisosModulo,
    RepositorioUsuarioActual,
  ],
})
export class ModuloAsistente {}
