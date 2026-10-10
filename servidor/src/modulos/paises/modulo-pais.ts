import { Module } from '@nestjs/common';
import { ControladorPais } from './controlador-pais';
import { RepositorioPais } from './repositorio-pais';

@Module({
  controllers: [ControladorPais],
  providers: [RepositorioPais],
})
export class ModuloPais {}
