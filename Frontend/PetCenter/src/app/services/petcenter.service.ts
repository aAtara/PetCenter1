import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class PetcenterService {
  private apiUrl = '/api';

  constructor(private http: HttpClient) { }

  getClientes(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/clientes`);
  }

  getMascotas(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/mascotas`);
  }

  getServicios(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/servicios`);
  }

  getCitas(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/citas`);
  }
}
