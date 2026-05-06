import { Directive, Input, OnInit, TemplateRef, ViewContainerRef } from '@angular/core';
import { AuthService } from '../../../services/auth.service';

@Directive({ selector: '[frmHasPermission]' })
export class FrmHasPermissionDirective implements OnInit {
  @Input('frmHasPermission') permission: string | string[] = [];

  constructor(
    private templateRef: TemplateRef<any>,
    private viewContainer: ViewContainerRef,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    const permissions = Array.isArray(this.permission) ? this.permission : [this.permission];
    const user = this.authService.getCurrentUser();
    if (user && permissions.includes(user.role)) {
      this.viewContainer.createEmbeddedView(this.templateRef);
    } else {
      this.viewContainer.clear();
    }
  }
}
