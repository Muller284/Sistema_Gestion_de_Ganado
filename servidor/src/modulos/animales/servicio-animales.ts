import { Injectable } from '@nestjs/common';
import { RepositorioAnimales } from './repositorio-animales';

@Injectable()
export class ServicioAnimales {
  constructor(private repositorioAnimales: RepositorioAnimales) {}

  // Métodos estándar
  async crear(ranchoId: string, datos: any, usuarioId: string) {
    return await this.repositorioAnimales.crear(ranchoId, datos, usuarioId);
  }

  async listarPorRancho(ranchoId: string) {
    return await this.repositorioAnimales.listarPorRancho(ranchoId);
  }

  // Alias para que coincidan con las llamadas del controlador si usa .registrar() o .listar()
  async registrar(ranchoId: string, datos: any, usuarioId: string) {
    return await this.crear(ranchoId, datos, usuarioId);
  }

  async listar(ranchoId: string) {
    return await this.listarPorRancho(ranchoId);
  }
}