import { Controller, Get } from '@nestjs/common';
import { RepositorioPais } from './repositorio-pais';

@Controller('paises')
export class ControladorPais {
  constructor(private readonly repositorio: RepositorioPais) {}

  @Get()
  async listar() {
    return this.repositorio.listar();
  }
}
