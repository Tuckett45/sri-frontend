import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';
import { CheckboxModule } from 'primeng/checkbox';
import { MessageModule } from 'primeng/message';
import { PhotoUploaderComponent } from '../photo-uploader/photo-uploader.component';
import { TestsUploaderComponent } from '../tests-uploader/tests-uploader.component';
import { DeploymentService } from '../../services/deployment.service';
import { DeploymentStatus, HandoffPackage } from '../../models/deployment.models';

@Component({
  selector: 'ark-handoff',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    ReactiveFormsModule,
    CardModule,
    ButtonModule,
    CheckboxModule,
    MessageModule,
    PhotoUploaderComponent,
    TestsUploaderComponent,
  ],
  templateUrl: './handoff.component.html',
  styleUrls: ['./handoff.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HandoffComponent implements OnInit {
  protected readonly form = inject(FormBuilder).nonNullable.group({
    cabinetPhotos: [[] as string[]],
    asBuilt: [[] as string[]],
    portTests: [[] as string[]],
    vendorSigned: [false],
    deSigned: [false],
  });

  protected readonly requiredPhotoCount = 6;
  protected readonly loading = signal(true);
  protected readonly package = signal<HandoffPackage | null>(null);

  private readonly deploymentService = inject(DeploymentService);
  private readonly route = inject(ActivatedRoute);
  private projectId = '';

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) return;
    this.projectId = id;
    this.deploymentService.getHandoff(id).subscribe(pkg => {
      this.package.set(pkg);
      if (pkg.requiredPhotos?.length) {
        this.form.patchValue({ cabinetPhotos: pkg.requiredPhotos });
      }
      if (pkg.asBuiltFileId) this.form.patchValue({ asBuilt: [pkg.asBuiltFileId] });
      if (pkg.portTestFileId) this.form.patchValue({ portTests: [pkg.portTestFileId] });
      this.loading.set(false);
    }, () => this.loading.set(false));
  }

  protected onPhotosChange(ids: string[]) {
    this.form.patchValue({ cabinetPhotos: ids });
  }

  protected onAsBuiltChange(ids: string[]) {
    this.form.patchValue({ asBuilt: ids });
  }

  protected onPortTestsChange(ids: string[]) {
    this.form.patchValue({ portTests: ids });
  }

  protected canSign(): boolean {
    const { cabinetPhotos, asBuilt, portTests } = this.form.getRawValue();
    return (
      Array.isArray(cabinetPhotos) && cabinetPhotos.length >= this.requiredPhotoCount &&
      Array.isArray(asBuilt) && asBuilt.length > 0 &&
      Array.isArray(portTests) && portTests.length > 0
    );
  }

  protected sign(): void {
    if (!this.canSign()) return;
    const payload = {
      requiredPhotos: this.form.getRawValue().cabinetPhotos,
      asBuiltFileId: this.form.getRawValue().asBuilt?.[0],
      portTestFileId: this.form.getRawValue().portTests?.[0],
      signedVendorAt: this.form.value.vendorSigned ? new Date().toISOString() : undefined,
      signedDeAt: this.form.value.deSigned ? new Date().toISOString() : undefined,
    } satisfies Partial<HandoffPackage>;

    this.deploymentService.signHandoff(this.projectId, payload).subscribe(pkg => {
      this.package.set(pkg);
    });
  }
}
