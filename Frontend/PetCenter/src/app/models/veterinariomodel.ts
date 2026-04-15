export interface Veterinario {
  id: number;
  nombre: string;
  especialidad?: string;
  telefono?: string;
  email?: string;
  activo?: boolean;
}

export interface Consulta {
  id: number;
  mascota_id: number;
  veterinario_id?: number;
  fecha: string;
  motivo: string;
  diagnostico?: string;
  tratamiento?: string;
  notas?: string;
}

export interface ConsultaDetalle {
  id: number;
  fecha: string;
  motivo: string;
  diagnostico?: string;
  tratamiento?: string;
  notas?: string;
  mascota_id: number;
  mascota_nombre: string;
  veterinario_id?: number;
  veterinario_nombre?: string;
  especialidad?: string;
}

export type CrearConsulta = Omit<Consulta, 'id'>;
export type CrearVeterinario = Omit<Veterinario, 'id'>;
