export interface Solicitud {
  id: string;
  usuario_id: string;
  mascota_id: string;
  estado: 'pendiente' | 'aprobada' | 'rechazada';
  fecha_solicitud: string;
  comentarios_admin?: string;
}

export interface CrearSolicitud {
  usuario_id: string;
  mascota_id: string;
  comentarios_admin?: string;
}
