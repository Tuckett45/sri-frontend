import { Component, OnInit } from '@angular/core';
import { MenuModule } from 'primeng/menu';

@Component({
  selector: 'goals-comp',
  templateUrl: './goals.component.html',
  styleUrls: ['./goals.component.scss'],
  standalone: true,
  imports: [MenuModule]
})
export class GoalsComponent implements OnInit {
items: any;
  constructor() {}

  ngOnInit(): void {}
}