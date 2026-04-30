export interface Solicitud {
  id: number;
  mascota_id: number;
  nombre_solicitante: string;
  email_solicitante: string;
  telefono?: string;
  ciudad?: string;
  vivienda?: string;
  mascotas_previas?: string;
  estado: 'pendiente' | 'aprobada' | 'rechazada';
  fecha_solicitud: string;
  comentarios_admin?: string;
  procesada_por?: number;
  fecha_decision?: string;
}

export interface SolicitudDetalle extends Solicitud {
  mascota_nombre: string;
  mascota_estado: string;
  raza_nombre?: string;
  raza_especie?: string;
  procesada_por_nombre?: string;
}

export interface CrearSolicitud {
  mascota_id: number;
  nombre_solicitante: string;
  email_solicitante: string;
  telefono?: string;
  ciudad?: string;
  vivienda?: string;
  mascotas_previas?: string;
  comentarios_admin?: string;
}
