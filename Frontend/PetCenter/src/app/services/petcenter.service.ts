import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Mascota, Raza } from '../models/mascotamodel';
import { Solicitud, CrearSolicitud } from '../models/solicitudmodel';

export interface Usuario {
  id: number;
  nombre: string;
  email: string;
  rol: string;
}

@Injectable({
  providedIn: 'root'
})
export class PetcenterService {
  private apiUrl = '/api';

  constructor(private http: HttpClient) { }

  // ─── AUTH ─────────────────────────────────────────────────

  login(email: string, password: string): Observable<Usuario[]> {
    return this.http.get<Usuario[]>(
      `${this.apiUrl}/usuarios?email=eq.${email}&password=eq.${password}&select=id,nombre,email,rol`
    );
  }

  // ─── RAZAS ────────────────────────────────────────────────

  getRazas(): Observable<Raza[]> {
    return this.http.get<Raza[]>(`${this.apiUrl}/raza`);
  }

  // ─── MASCOTAS ─────────────────────────────────────────────

  getMascotas(): Observable<Mascota[]> {
    return this.http.get<Mascota[]>(`${this.apiUrl}/mascotas`);
  }

  getMascotasDetalle(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/mascotas_detalle`);
  }

  getMascotaById(id: string): Observable<Mascota[]> {
    return this.http.get<Mascota[]>(`${this.apiUrl}/mascotas?id=eq.${id}`);
  }

  getMascotasDisponibles(): Observable<Mascota[]> {
    return this.http.get<Mascota[]>(`${this.apiUrl}/mascotas?estado=eq.disponible`);
  }

  crearMascota(mascota: Omit<Mascota, 'id'>): Observable<any> {
    const headers = new HttpHeaders({ 'Prefer': 'return=representation' });
    return this.http.post(`${this.apiUrl}/mascotas`, mascota, { headers });
  }

  actualizarMascota(id: string, datos: Partial<Mascota>): Observable<any> {
    return this.http.patch(`${this.apiUrl}/mascotas?id=eq.${id}`, datos);
  }

  eliminarMascota(id: string): Observable<any> {
    return this.http.delete(`${this.apiUrl}/mascotas?id=eq.${id}`);
  }

  // ─── SOLICITUDES ──────────────────────────────────────────

  getSolicitudes(): Observable<Solicitud[]> {
    return this.http.get<Solicitud[]>(`${this.apiUrl}/solicitudes`);
  }

  getSolicitudesPorUsuario(usuarioId: string): Observable<Solicitud[]> {
    return this.http.get<Solicitud[]>(
      `${this.apiUrl}/solicitudes?usuario_id=eq.${usuarioId}`
    );
  }

  crearSolicitud(solicitud: CrearSolicitud): Observable<any> {
    const headers = new HttpHeaders({ 'Prefer': 'return=representation' });
    return this.http.post(`${this.apiUrl}/solicitudes`, solicitud, { headers });
  }

  actualizarEstadoSolicitud(id: string, estado: Solicitud['estado'], comentarios?: string): Observable<any> {
    const datos: Partial<Solicitud> = { estado };
    if (comentarios) datos.comentarios_admin = comentarios;
    return this.http.patch(`${this.apiUrl}/solicitudes?id=eq.${id}`, datos);
  }
}
