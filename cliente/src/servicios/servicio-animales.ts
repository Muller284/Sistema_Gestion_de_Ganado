import { api } from './api';

export const servicioAnimales = {
  // HU-27: Registrar un animal
  registrar: async (datos: Record<string, unknown>) => {
    return await api.registrarAnimal(datos);
  },

  // HU-29: Obtener listado de animales
  listar: async () => {
    return await api.listarAnimales();
  },
};