import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule, NgFor } from '@angular/common';
import { HttpClientModule } from '@angular/common/http';
import { PetcenterService } from './services/petcenter.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, HttpClientModule, NgFor],
  template: `
    <div style="padding: 20px; font-family: Arial;">
      <h1>🐾 PetCenter - Gestión de Mascotas</h1>
      
      <h2>Clientes</h2>
      <table border="1" cellpadding="5" style="border-collapse: collapse; margin-bottom: 20px;">
        <tr style="background-color: #f0f0f0;">
          <th>Nombre</th>
          <th>Teléfono</th>
          <th>Email</th>
        </tr>
        <tr *ngFor="let cliente of clientes">
          <td>{{cliente.nombre}}</td>
          <td>{{cliente.telefono}}</td>
          <td>{{cliente.email}}</td>
        </tr>
      </table>

      <h2>Mascotas</h2>
      <table border="1" cellpadding="5" style="border-collapse: collapse; margin-bottom: 20px;">
        <tr style="background-color: #f0f0f0;">
          <th>Nombre</th>
          <th>Especie</th>
          <th>Raza</th>
          <th>Edad</th>
        </tr>
        <tr *ngFor="let mascota of mascotas">
          <td>{{mascota.nombre}}</td>
          <td>{{mascota.especie}}</td>
          <td>{{mascota.raza}}</td>
          <td>{{mascota.edad}} años</td>
        </tr>
      </table>
        <h2>Servicios</h2>
      <table border="1" cellpadding="5" style="border-collapse: collapse;">
        <tr style="background-color: #f0f0f0;">
          <th>Servicio</th>
          <th>Precio</th>
          <th>Duración</th>
        </tr>
        <tr *ngFor="let servicio of servicios">
          <td>{{servicio.nombre}}</td>
          <td>$ {{servicio.precio}}</td>
          <td>{{servicio.duracion_minutos}} min</td>
        </tr>
      </table>
    </div>

    
  `
})
export class App implements OnInit {
  clientes: any[] = [];
  mascotas: any[] = [];
  servicios: any[] = [];

  constructor(
    private petService: PetcenterService,
    private cdr: ChangeDetectorRef   // 👈 Inyectamos ChangeDetectorRef
  ) { }

  ngOnInit() {
    this.petService.getClientes().subscribe(data => {
      console.log('Clientes:', data);
      this.clientes = data;
      this.cdr.detectChanges();   // 👈 Forzar actualización de la vista
    });

    this.petService.getMascotas().subscribe(data => {
      console.log('Mascotas:', data);
      this.mascotas = data;
      this.cdr.detectChanges();   // 👈 Forzar actualización
    });



     
    his.petService.getServicios().subscribe(data => {
      console.log('Servicios:', data);
       this.servicios = data;
      this.cdr.detectChanges();
     });
  }
}

