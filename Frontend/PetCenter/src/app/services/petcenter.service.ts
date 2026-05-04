import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Mascota, Raza } from '../models/mascotamodel';
import { Solicitud, SolicitudDetalle, CrearSolicitud } from '../models/solicitudmodel';
import { Veterinario, CrearVeterinario, Consulta, CrearConsulta, ConsultaDetalle } from '../models/veterinariomodel';

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

  crearRaza(raza: { nombre: string; especie: string }): Observable<any> {
    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
      'Prefer': 'return=representation'
    });
    return this.http.post(`${this.apiUrl}/raza`, raza, { headers });
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

  crearMascota(mascota: any): Observable<any> {
    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
      'Prefer': 'return=representation'
    });
    return this.http.post(`${this.apiUrl}/mascotas`, mascota, { headers });
  }

  actualizarMascota(id: string, datos: Partial<Mascota>): Observable<any> {
    const headers = new HttpHeaders({ 'Content-Type': 'application/json', 'Prefer': 'return=representation' });
    return this.http.patch(`${this.apiUrl}/mascotas?id=eq.${id}`, datos, { headers });
  }

  eliminarMascota(id: string): Observable<any> {
    const headers = new HttpHeaders({ 'Prefer': 'return=representation' });
    return this.http.delete(`${this.apiUrl}/mascotas?id=eq.${id}`, { headers });
  }

  // ─── SOLICITUDES ──────────────────────────────────────────

  getSolicitudes(): Observable<Solicitud[]> {
    return this.http.get<Solicitud[]>(`${this.apiUrl}/solicitudes?order=fecha_solicitud.desc`);
  }

  /** Vista enriquecida con datos de la mascota y raza */
  getSolicitudesDetalle(): Observable<SolicitudDetalle[]> {
    return this.http.get<SolicitudDetalle[]>(`${this.apiUrl}/solicitudes_detalle`);
  }

  crearSolicitud(solicitud: CrearSolicitud): Observable<any> {
    const headers = new HttpHeaders({ 'Prefer': 'return=representation' });
    return this.http.post(`${this.apiUrl}/solicitudes`, solicitud, { headers });
  }

  actualizarEstadoSolicitud(id: number, estado: Solicitud['estado'], procesadaPor?: number, comentarios?: string): Observable<any> {
    const datos: any = {
      estado,
      fecha_decision: new Date().toISOString()
    };
    if (procesadaPor) datos.procesada_por = procesadaPor;
    if (comentarios)  datos.comentarios_admin = comentarios;
    const headers = new HttpHeaders({ 'Content-Type': 'application/json', 'Prefer': 'return=representation' });
    return this.http.patch(`${this.apiUrl}/solicitudes?id=eq.${id}`, datos, { headers });
  }

  /** Cambia el estado de una mascota — usado al aprobar una solicitud */
  cambiarEstadoMascota(mascotaId: number, estado: 'disponible' | 'en_proceso' | 'adoptado'): Observable<any> {
    const headers = new HttpHeaders({ 'Content-Type': 'application/json', 'Prefer': 'return=representation' });
    return this.http.patch(`${this.apiUrl}/mascotas?id=eq.${mascotaId}`, { estado }, { headers });
  }

  // ─── VETERINARIOS ─────────────────────────────────────────

  getVeterinarios(): Observable<Veterinario[]> {
    return this.http.get<Veterinario[]>(`${this.apiUrl}/veterinarios?order=nombre`);
  }

  getVeterinariosActivos(): Observable<Veterinario[]> {
    return this.http.get<Veterinario[]>(`${this.apiUrl}/veterinarios?activo=eq.true&order=nombre`);
  }

  crearVeterinario(vet: CrearVeterinario): Observable<any> {
    const headers = new HttpHeaders({ 'Prefer': 'return=representation' });
    return this.http.post(`${this.apiUrl}/veterinarios`, vet, { headers });
  }

  actualizarVeterinario(id: number, datos: Partial<Veterinario>): Observable<any> {
    const headers = new HttpHeaders({ 'Content-Type': 'application/json', 'Prefer': 'return=representation' });
    return this.http.patch(`${this.apiUrl}/veterinarios?id=eq.${id}`, datos, { headers });
  }

  eliminarVeterinario(id: number): Observable<any> {
    const headers = new HttpHeaders({ 'Prefer': 'return=representation' });
    return this.http.delete(`${this.apiUrl}/veterinarios?id=eq.${id}`, { headers });
  }

  // ─── CONSULTAS VETERINARIAS ───────────────────────────────

  getConsultas(): Observable<ConsultaDetalle[]> {
    return this.http.get<ConsultaDetalle[]>(`${this.apiUrl}/consultas_detalle`);
  }

  getConsultasPorMascota(mascotaId: number): Observable<ConsultaDetalle[]> {
    return this.http.get<ConsultaDetalle[]>(
      `${this.apiUrl}/consultas_detalle?mascota_id=eq.${mascotaId}`
    );
  }

  crearConsulta(consulta: CrearConsulta): Observable<any> {
    const headers = new HttpHeaders({ 'Prefer': 'return=representation' });
    return this.http.post(`${this.apiUrl}/consultas_veterinarias`, consulta, { headers });
  }

  eliminarConsulta(id: number): Observable<any> {
    const headers = new HttpHeaders({ 'Prefer': 'return=representation' });
    return this.http.delete(`${this.apiUrl}/consultas_veterinarias?id=eq.${id}`, { headers });
  }

  // ─── CITAS PÚBLICAS ──────────────────────────────────────

  getCitas(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/citas?order=fecha.asc`);
  }

  crearCita(cita: any): Observable<any> {
    const headers = new HttpHeaders({ 'Prefer': 'return=representation' });
    return this.http.post(`${this.apiUrl}/citas`, cita, { headers });
  }

  actualizarCita(id: number, datos: any): Observable<any> {
    const headers = new HttpHeaders({ 'Content-Type': 'application/json', 'Prefer': 'return=representation' });
    return this.http.patch(`${this.apiUrl}/citas?id=eq.${id}`, datos, { headers });
  }
}
