import { Component, OnInit, ViewChild, ElementRef, ChangeDetectorRef, NgZone } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { PetcenterService } from '../../../../services/petcenter.service';

@Component({
  selector: 'app-portal-home',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './home.html',
  styleUrl: './home.css'
})
export class PortalHomeComponent implements OnInit {
  @ViewChild('carruselTrack') carruselTrack?: ElementRef<HTMLDivElement>;

  mascotas: any[] = [];
  cargando = true;

  // Beneficios para "¿Por qué adoptar?"
  beneficios = [
    { icon: '❤️', titulo: 'Salvas una vida',
      desc: 'Cada adopción significa una segunda oportunidad para un animal que lo necesita.' },
    { icon: '🏠', titulo: 'Compañía incondicional',
      desc: 'Las mascotas adoptadas traen amor, alegría y lealtad a tu hogar.' },
    { icon: '😊', titulo: 'Mejora tu bienestar',
      desc: 'Está comprobado que las mascotas reducen el estrés y mejoran la salud mental.' },
    { icon: '🛡️', titulo: 'Adopción responsable',
      desc: 'Todas nuestras mascotas están vacunadas, desparasitadas y esterilizadas.' }
  ];

  constructor(
    private petService: PetcenterService,
    private cdr: ChangeDetectorRef,
    private zone: NgZone
  ) {}

  ngOnInit() {
    this.petService.getMascotasDetalle().subscribe({
      next: (data) => {
        this.zone.run(() => {
          this.mascotas = data.filter((m: any) => m.estado === 'disponible');
          this.cargando = false;
          this.cdr.detectChanges();
        });
      },
      error: (err) => {
        console.error('[home] error mascotas:', err);
        this.zone.run(() => {
          this.cargando = false;
          this.cdr.detectChanges();
        });
      }
    });
  }

  emojiEspecie(especie: string): string {
    const map: Record<string, string> = { perro: '🐶', gato: '🐱' };
    return map[(especie || '').toLowerCase()] || '🐾';
  }

  bgEspecie(especie: string): string {
    const map: Record<string, string> = {
      perro: '#fef3c7', gato: '#e0e7ff'
    };
    return map[(especie || '').toLowerCase()] || '#f1f5f9';
  }

  scrollCarrusel(dir: 'left' | 'right') {
    const el = this.carruselTrack?.nativeElement;
    if (!el) return;
    const card = el.querySelector('.carrusel-card') as HTMLElement;
    const cardW = card ? card.offsetWidth + 16 : 280;
    el.scrollBy({ left: dir === 'left' ? -cardW : cardW, behavior: 'smooth' });
  }
}
