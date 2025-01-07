import { Component, OnInit } from '@angular/core';

@Component({
  selector: 'goals-comp',
  templateUrl: './goals.component.html',
  styleUrls: ['./goals.component.scss']
})
export class GoalsComponent implements OnInit {
items: any;
  constructor() {}

  ngOnInit(): void {}
}