export interface Raza {
  id: number;
  nombre: string;
  especie: string;
}

export interface Mascota {
  id: string;
  nombre: string;
  edad_meses: number;
  genero: 'macho' | 'hembra';
  raza_id: number;
  raza?: Raza;
  estado: 'disponible' | 'en_proceso' | 'adoptado';
  descripcion: string;
  fecha_ingreso: string;
}
