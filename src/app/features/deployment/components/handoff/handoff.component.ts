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
import { MessageService } from 'primeng/api';
import { DeploymentService, HandoffUpdateDto } from '../../services/deployment.service';
import { HandoffPackage } from '../../models/deployment.models';

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
  providers: [MessageService],
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

  // Default to 6, but we’ll prefer the package’s requiredPhotos length if present
  protected readonly defaultRequiredPhotoCount = 6;
  protected readonly loading = signal(true);
  protected readonly pkg = signal<HandoffPackage | null>(null);

  private readonly deploymentService = inject(DeploymentService);
  private readonly route = inject(ActivatedRoute);
  private readonly messageService = inject(MessageService);
  private projectId = '';

  protected package(): HandoffPackage | null {
    return this.pkg();
  }

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) {
      this.loading.set(false);
      return;
    }
    this.projectId = id;
    void this.loadHandoffPackage(id);
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

  protected get requiredPhotoCount(): number {
    const p = this.pkg();
    return p?.requiredPhotos?.length ?? this.defaultRequiredPhotoCount;
  }

  protected canSign(): boolean {
    const { cabinetPhotos, asBuilt, portTests } = this.form.getRawValue();
    return (
      Array.isArray(cabinetPhotos) && cabinetPhotos.length >= this.requiredPhotoCount &&
      Array.isArray(asBuilt) && asBuilt.length > 0 &&
      Array.isArray(portTests) && portTests.length > 0
    );
  }

  protected async sign(): Promise<void> {
    if (!this.projectId) return;
    if (!this.canSign()) return;

    const {
      cabinetPhotos = [],
      asBuilt = [],
      portTests = [],
      vendorSigned,
      deSigned,
    } = this.form.getRawValue();

    const payload: HandoffUpdateDto = {
      requiredPhotos: cabinetPhotos,
      asBuiltFileId: asBuilt[0] ?? null,
      portTestFileId: portTests[0] ?? null,
      signedVendorAt: vendorSigned ? new Date().toISOString() : null,
      signedDeAt: deSigned ? new Date().toISOString() : null,
    };

    this.loading.set(true);
    try {
      const pkg = await this.deploymentService.signHandoff(this.projectId, payload); // returns HandoffPackage
      this.applyPackage(pkg);
      this.messageService.add({ severity: 'success', summary: 'Handoff signed successfully.' });
    } catch (error) {
      console.error('Failed to sign handoff', error);
      this.messageService.add({ severity: 'error', summary: 'Failed to sign handoff package.' });
    } finally {
      this.loading.set(false);
    }
  }

  private async loadHandoffPackage(id: string): Promise<void> {
    this.loading.set(true);
    try {
      const pkg = await this.deploymentService.getHandoff(id); // returns HandoffPackage
      this.applyPackage(pkg);
    } catch (error) {
      console.error('Failed to load handoff package', error);
      this.messageService.add({ severity: 'error', summary: 'Unable to load handoff package.' });
    } finally {
      this.loading.set(false);
    }
  }

  private applyPackage(pkg: HandoffPackage): void {
    this.pkg.set(pkg);
    this.form.patchValue(
      {
        cabinetPhotos: pkg.requiredPhotos ?? [],
        asBuilt: pkg.asBuiltFileId ? [pkg.asBuiltFileId] : [],
        portTests: pkg.portTestFileId ? [pkg.portTestFileId] : [],
        vendorSigned: !!pkg.signedVendorAt,
        deSigned: !!pkg.signedDeAt,
      },
      { emitEvent: false }
    );
  }
}
