import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { tap } from 'rxjs/operators';
import { environment } from '../../environments/environment';

/**
 * Modelo de una raza tal como la devuelve The Dog API / Cat API
 */
export interface RazaApi {
  id: number | string;           // perros usan number, gatos usan string ("abys", "siam"...)
  name: string;                  // "Labrador Retriever"
  temperament?: string;          // "Friendly, Active, Outgoing"
  origin?: string;               // "Canada"
  life_span?: string;            // "10 - 12 years"
  weight?: { metric: string };   // { metric: "25 - 36" }  → kg
  height?: { metric: string };   // { metric: "55 - 62" }  → cm
  bred_for?: string;             // "Water retrieving"
  breed_group?: string;          // "Sporting"
  description?: string;          // (solo gatos)
  reference_image_id?: string;
  image?: { url: string };
}

@Injectable({
  providedIn: 'root'
})
export class RazasApiService {

  private apiKey = environment.dogApiKey;

  private dogApiUrl = 'https://api.thedogapi.com/v1';
  private catApiUrl = 'https://api.thecatapi.com/v1';

  // Caché en memoria — se piden 1 vez y quedan en RAM
  private cachePerros: RazaApi[] | null = null;
  private cacheGatos:  RazaApi[] | null = null;

  constructor(private http: HttpClient) {}

  private headers(): HttpHeaders {
    return new HttpHeaders({ 'x-api-key': this.apiKey });
  }

  getRazasPerros(): Observable<RazaApi[]> {
    if (this.cachePerros) {
      return of(this.cachePerros);
    }
    return this.http
      .get<RazaApi[]>(`${this.dogApiUrl}/breeds`, { headers: this.headers() })
      .pipe(tap(data => this.cachePerros = data));
  }

  getRazasGatos(): Observable<RazaApi[]> {
    if (this.cacheGatos) {
      return of(this.cacheGatos);
    }
    return this.http
      .get<RazaApi[]>(`${this.catApiUrl}/breeds`, { headers: this.headers() })
      .pipe(tap(data => this.cacheGatos = data));
  }

  /**
   * Busca razas que coincidan con el texto.
   * Si query está vacío, devuelve las primeras 10.
   */
  buscarRaza(especie: 'perro' | 'gato', query: string): Observable<RazaApi[]> {
    const q = (query || '').trim().toLowerCase();
    const fuente = especie === 'perro' ? this.getRazasPerros() : this.getRazasGatos();

    return new Observable<RazaApi[]>(observer => {
      fuente.subscribe({
        next: (todas) => {
          if (!q) {
            observer.next(todas.slice(0, 10));
          } else {
            const filtradas = todas.filter(r =>
              r.name.toLowerCase().includes(q)
            );
            observer.next(filtradas.slice(0, 10));
          }
          observer.complete();
        },
        error: (err) => observer.error(err)
      });
    });
  }

  getRazaPorId(especie: 'perro' | 'gato', id: number | string): Observable<RazaApi> {
    const url = especie === 'perro'
      ? `${this.dogApiUrl}/breeds/${id}`
      : `${this.catApiUrl}/breeds/${id}`;
    return this.http.get<RazaApi>(url, { headers: this.headers() });
  }
}
