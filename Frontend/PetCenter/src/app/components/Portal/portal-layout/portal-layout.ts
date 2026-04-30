import { Component, ViewEncapsulation } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterOutlet, RouterLink } from '@angular/router';

@Component({
  selector: 'app-portal-layout',
  standalone: true,
  imports: [CommonModule, RouterOutlet, RouterLink],
  templateUrl: './portal-layout.html',
  styleUrl: './portal-layout.css',
  encapsulation: ViewEncapsulation.None
})
export class PortalLayoutComponent {
  constructor(private router: Router) {}
}
