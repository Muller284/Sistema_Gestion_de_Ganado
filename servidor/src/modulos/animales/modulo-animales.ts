import { Module } from '@nestjs/common';
import { ControladorAnimales } from './controlador-animales';
import { ServicioAnimales } from './servicio-animales';
import { RepositorioAnimales } from './repositorio-animales';

@Module({
  controllers: [ControladorAnimales],
  providers: [ServicioAnimales, RepositorioAnimales],
})
export class ModuloAnimales {}