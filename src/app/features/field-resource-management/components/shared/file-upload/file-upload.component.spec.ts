import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FileUploadComponent } from './file-upload.component';
import { SanitizationService } from '../../../services/sanitization.service';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { DebugElement } from '@angular/core';
import { By } from '@angular/platform-browser';

describe('FileUploadComponent', () => {
  let component: FileUploadComponent;
  let fixture: ComponentFixture<FileUploadComponent>;
  let sanitizationService: jasmine.SpyObj<SanitizationService>;

  beforeEach(async () => {
    const sanitizationServiceSpy = jasmine.createSpyObj('SanitizationService', [
      'validateFile',
      'validateFiles'
    ]);

    await TestBed.configureTestingModule({
      declarations: [FileUploadComponent],
      imports: [MatIconModule, MatButtonModule, MatProgressBarModule],
      providers: [
        { provide: SanitizationService, useValue: sanitizationServiceSpy }
      ]
    }).compileComponents();

    sanitizationService = TestBed.inject(SanitizationService) as jasmine.SpyObj<SanitizationService>;
    fixture = TestBed.createComponent(FileUploadComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('Initialization', () => {
    it('should have default values', () => {
      expect(component.multiple).toBe(true);
      expect(component.allowedFileTypes).toEqual(['image/jpeg', 'image/png', 'image/heic']);
      expect(component.maxFileSize).toBe(10 * 1024 * 1024);
      expect(component.label).toBe('Upload Files');
      expect(component.disabled).toBe(false);
      expect(component.selectedFiles).toEqual([]);
      expect(component.filePreviews).toEqual([]);
    });

    it('should accept custom configuration', () => {
      component.multiple = false;
      component.allowedFileTypes = ['application/pdf'];
      component.maxFileSize = 5 * 1024 * 1024;
      component.label = 'Upload PDF';
      
      expect(component.multiple).toBe(false);
      expect(component.allowedFileTypes).toEqual(['application/pdf']);
      expect(component.maxFileSize).toBe(5 * 1024 * 1024);
      expect(component.label).toBe('Upload PDF');
    });
  });

  describe('File Selection', () => {
    it('should process valid files on selection', () => {
      const file = new File(['content'], 'test.jpg', { type: 'image/jpeg' });
      const event = {
        target: { files: [file] }
      } as any;

      sanitizationService.validateFile.and.returnValue({ valid: true });
      spyOn(component.filesSelected, 'emit');

      component.onFileSelected(event);

      expect(component.selectedFiles.length).toBe(1);
      expect(component.selectedFiles[0]).toBe(file);
      expect(component.filesSelected.emit).toHaveBeenCalledWith([file]);
    });

    it('should not process files when disabled', () => {
      component.disabled = true;
      const file = new File(['content'], 'test.jpg', { type: 'image/jpeg' });
      const event = {
        target: { files: [file] }
      } as any;

      component.onFileSelected(event);

      expect(component.selectedFiles.length).toBe(0);
    });

    it('should replace file in single mode', () => {
      component.multiple = false;
      const file1 = new File(['content1'], 'test1.jpg', { type: 'image/jpeg' });
      const file2 = new File(['content2'], 'test2.jpg', { type: 'image/jpeg' });

      sanitizationService.validateFile.and.returnValue({ valid: true });

      component.onFileSelected({ target: { files: [file1] } } as any);
      expect(component.selectedFiles.length).toBe(1);
      expect(component.selectedFiles[0]).toBe(file1);

      component.onFileSelected({ target: { files: [file2] } } as any);
      expect(component.selectedFiles.length).toBe(1);
      expect(component.selectedFiles[0]).toBe(file2);
    });

    it('should append files in multiple mode', () => {
      component.multiple = true;
      const file1 = new File(['content1'], 'test1.jpg', { type: 'image/jpeg' });
      const file2 = new File(['content2'], 'test2.jpg', { type: 'image/jpeg' });

      sanitizationService.validateFile.and.returnValue({ valid: true });

      component.onFileSelected({ target: { files: [file1] } } as any);
      component.onFileSelected({ target: { files: [file2] } } as any);

      expect(component.selectedFiles.length).toBe(2);
      expect(component.selectedFiles).toContain(file1);
      expect(component.selectedFiles).toContain(file2);
    });
  });

  describe('File Validation', () => {
    it('should reject files with invalid type', () => {
      const file = new File(['content'], 'test.txt', { type: 'text/plain' });
      const event = { target: { files: [file] } } as any;

      spyOn(component.uploadError, 'emit');

      component.onFileSelected(event);

      expect(component.selectedFiles.length).toBe(0);
      expect(component.errorMessage).toContain('Invalid file type');
      expect(component.uploadError.emit).toHaveBeenCalled();
    });

    it('should reject files exceeding size limit', () => {
      const largeContent = new Array(11 * 1024 * 1024).fill('a').join('');
      const file = new File([largeContent], 'large.jpg', { type: 'image/jpeg' });
      const event = { target: { files: [file] } } as any;

      spyOn(component.uploadError, 'emit');

      component.onFileSelected(event);

      expect(component.selectedFiles.length).toBe(0);
      expect(component.errorMessage).toContain('exceeds');
      expect(component.uploadError.emit).toHaveBeenCalled();
    });

    it('should use sanitization service for security validation', () => {
      const file = new File(['content'], 'test.jpg', { type: 'image/jpeg' });
      const event = { target: { files: [file] } } as any;

      sanitizationService.validateFile.and.returnValue({
        valid: false,
        error: 'Suspicious file'
      });

      component.onFileSelected(event);

      expect(sanitizationService.validateFile).toHaveBeenCalledWith(file);
      expect(component.selectedFiles.length).toBe(0);
    });
  });

  describe('Drag and Drop', () => {
    it('should set dragging state on drag over', () => {
      const event = new DragEvent('dragover');
      spyOn(event, 'preventDefault');
      spyOn(event, 'stopPropagation');

      component.onDragOver(event);

      expect(component.isDragging).toBe(true);
      expect(event.preventDefault).toHaveBeenCalled();
      expect(event.stopPropagation).toHaveBeenCalled();
    });

    it('should clear dragging state on drag leave', () => {
      component.isDragging = true;
      const event = new DragEvent('dragleave');
      spyOn(event, 'preventDefault');

      component.onDragLeave(event);

      expect(component.isDragging).toBe(false);
      expect(event.preventDefault).toHaveBeenCalled();
    });

    it('should process files on drop', () => {
      const file = new File(['content'], 'test.jpg', { type: 'image/jpeg' });
      const dataTransfer = new DataTransfer();
      dataTransfer.items.add(file);
      
      const event = new DragEvent('drop', { dataTransfer });
      spyOn(event, 'preventDefault');
      sanitizationService.validateFile.and.returnValue({ valid: true });

      component.onDrop(event);

      expect(component.isDragging).toBe(false);
      expect(event.preventDefault).toHaveBeenCalled();
      expect(component.selectedFiles.length).toBe(1);
    });

    it('should not process drag events when disabled', () => {
      component.disabled = true;
      const event = new DragEvent('dragover');

      component.onDragOver(event);

      expect(component.isDragging).toBe(false);
    });
  });

  describe('Keyboard Navigation', () => {
    it('should trigger file input on Enter key', () => {
      const fileInput = document.createElement('input');
      spyOn(fileInput, 'click');
      const event = new KeyboardEvent('keydown', { key: 'Enter' });
      spyOn(event, 'preventDefault');

      component.onKeyDown(event, fileInput);

      expect(event.preventDefault).toHaveBeenCalled();
      expect(fileInput.click).toHaveBeenCalled();
    });

    it('should trigger file input on Space key', () => {
      const fileInput = document.createElement('input');
      spyOn(fileInput, 'click');
      const event = new KeyboardEvent('keydown', { key: ' ' });
      spyOn(event, 'preventDefault');

      component.onKeyDown(event, fileInput);

      expect(event.preventDefault).toHaveBeenCalled();
      expect(fileInput.click).toHaveBeenCalled();
    });

    it('should not trigger file input when disabled', () => {
      component.disabled = true;
      const fileInput = document.createElement('input');
      spyOn(fileInput, 'click');
      const event = new KeyboardEvent('keydown', { key: 'Enter' });

      component.onKeyDown(event, fileInput);

      expect(fileInput.click).not.toHaveBeenCalled();
    });
  });

  describe('File Management', () => {
    beforeEach(() => {
      sanitizationService.validateFile.and.returnValue({ valid: true });
    });

    it('should remove file from selection', () => {
      const file1 = new File(['content1'], 'test1.jpg', { type: 'image/jpeg' });
      const file2 = new File(['content2'], 'test2.jpg', { type: 'image/jpeg' });

      component.onFileSelected({ target: { files: [file1, file2] } } as any);
      expect(component.selectedFiles.length).toBe(2);

      component.removeFile(file1);
      expect(component.selectedFiles.length).toBe(1);
      expect(component.selectedFiles[0]).toBe(file2);
    });

    it('should clear all files', () => {
      const file1 = new File(['content1'], 'test1.jpg', { type: 'image/jpeg' });
      const file2 = new File(['content2'], 'test2.jpg', { type: 'image/jpeg' });

      component.onFileSelected({ target: { files: [file1, file2] } } as any);
      expect(component.selectedFiles.length).toBe(2);

      component.clearFiles();
      expect(component.selectedFiles.length).toBe(0);
      expect(component.filePreviews.length).toBe(0);
      expect(component.errorMessage).toBeNull();
    });

    it('should not remove files when disabled', () => {
      const file = new File(['content'], 'test.jpg', { type: 'image/jpeg' });
      component.onFileSelected({ target: { files: [file] } } as any);
      
      component.disabled = true;
      component.removeFile(file);

      expect(component.selectedFiles.length).toBe(1);
    });
  });

  describe('ControlValueAccessor', () => {
    it('should write value as array', () => {
      const file1 = new File(['content1'], 'test1.jpg', { type: 'image/jpeg' });
      const file2 = new File(['content2'], 'test2.jpg', { type: 'image/jpeg' });

      component.writeValue([file1, file2]);

      expect(component.selectedFiles.length).toBe(2);
      expect(component.selectedFiles).toContain(file1);
      expect(component.selectedFiles).toContain(file2);
    });

    it('should write value as single file', () => {
      const file = new File(['content'], 'test.jpg', { type: 'image/jpeg' });

      component.writeValue(file);

      expect(component.selectedFiles.length).toBe(1);
      expect(component.selectedFiles[0]).toBe(file);
    });

    it('should write null value', () => {
      const file = new File(['content'], 'test.jpg', { type: 'image/jpeg' });
      component.selectedFiles = [file];

      component.writeValue(null);

      expect(component.selectedFiles.length).toBe(0);
    });

    it('should register onChange callback', () => {
      const onChange = jasmine.createSpy('onChange');
      component.registerOnChange(onChange);

      sanitizationService.validateFile.and.returnValue({ valid: true });
      const file = new File(['content'], 'test.jpg', { type: 'image/jpeg' });
      component.onFileSelected({ target: { files: [file] } } as any);

      expect(onChange).toHaveBeenCalled();
    });

    it('should register onTouched callback', () => {
      const onTouched = jasmine.createSpy('onTouched');
      component.registerOnTouched(onTouched);

      sanitizationService.validateFile.and.returnValue({ valid: true });
      const file = new File(['content'], 'test.jpg', { type: 'image/jpeg' });
      component.onFileSelected({ target: { files: [file] } } as any);

      expect(onTouched).toHaveBeenCalled();
    });

    it('should set disabled state', () => {
      component.setDisabledState(true);
      expect(component.disabled).toBe(true);

      component.setDisabledState(false);
      expect(component.disabled).toBe(false);
    });
  });

  describe('Utility Methods', () => {
    it('should format file size correctly', () => {
      expect(component.getFileSize(500)).toBe('500 B');
      expect(component.getFileSize(1024)).toBe('1.0 KB');
      expect(component.getFileSize(1024 * 1024)).toBe('1.0 MB');
      expect(component.getFileSize(5.5 * 1024 * 1024)).toBe('5.5 MB');
    });

    it('should generate accept attribute', () => {
      component.allowedFileTypes = ['image/jpeg', 'image/png'];
      expect(component.acceptAttribute).toBe('image/jpeg,image/png');
    });

    it('should generate hint text', () => {
      component.allowedFileTypes = ['image/jpeg', 'image/png'];
      component.maxFileSize = 5 * 1024 * 1024;
      
      const hint = component.hintText;
      expect(hint).toContain('JPEG');
      expect(hint).toContain('PNG');
      expect(hint).toContain('5.0 MB');
    });

    it('should check if file has preview', () => {
      const file = new File(['content'], 'test.jpg', { type: 'image/jpeg' });
      component.filePreviews = [{ file, preview: 'data:image/jpeg;base64,...' }];

      expect(component.hasPreview(file)).toBe(true);
      
      const otherFile = new File(['content'], 'other.jpg', { type: 'image/jpeg' });
      expect(component.hasPreview(otherFile)).toBe(false);
    });

    it('should get preview for file', () => {
      const file = new File(['content'], 'test.jpg', { type: 'image/jpeg' });
      const preview = 'data:image/jpeg;base64,...';
      component.filePreviews = [{ file, preview }];

      expect(component.getPreview(file)).toBe(preview);
      
      const otherFile = new File(['content'], 'other.jpg', { type: 'image/jpeg' });
      expect(component.getPreview(otherFile)).toBeNull();
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA attributes on dropzone', () => {
      const dropzone = fixture.debugElement.query(By.css('.file-upload__dropzone'));
      
      expect(dropzone.nativeElement.getAttribute('role')).toBe('button');
      expect(dropzone.nativeElement.getAttribute('aria-label')).toContain('Upload files');
      expect(dropzone.nativeElement.getAttribute('tabindex')).toBe('0');
    });

    it('should have aria-disabled when disabled', () => {
      component.disabled = true;
      fixture.detectChanges();
      
      const dropzone = fixture.debugElement.query(By.css('.file-upload__dropzone'));
      expect(dropzone.nativeElement.getAttribute('aria-disabled')).toBe('true');
      expect(dropzone.nativeElement.getAttribute('tabindex')).toBe('-1');
    });

    it('should have role="alert" on error message', () => {
      component.errorMessage = 'Test error';
      fixture.detectChanges();
      
      const error = fixture.debugElement.query(By.css('.file-upload__error'));
      expect(error.nativeElement.getAttribute('role')).toBe('alert');
      expect(error.nativeElement.getAttribute('aria-live')).toBe('polite');
    });

    it('should have proper list structure for files', () => {
      sanitizationService.validateFile.and.returnValue({ valid: true });
      const file = new File(['content'], 'test.jpg', { type: 'image/jpeg' });
      component.onFileSelected({ target: { files: [file] } } as any);
      fixture.detectChanges();
      
      const filesList = fixture.debugElement.query(By.css('.file-upload__files-list'));
      expect(filesList.nativeElement.getAttribute('role')).toBe('list');
    });
  });

  describe('Event Emissions', () => {
    beforeEach(() => {
      sanitizationService.validateFile.and.returnValue({ valid: true });
    });

    it('should emit filesSelected event', () => {
      spyOn(component.filesSelected, 'emit');
      const file = new File(['content'], 'test.jpg', { type: 'image/jpeg' });

      component.onFileSelected({ target: { files: [file] } } as any);

      expect(component.filesSelected.emit).toHaveBeenCalledWith([file]);
    });

    it('should emit fileSelected event in single mode', () => {
      component.multiple = false;
      spyOn(component.fileSelected, 'emit');
      const file = new File(['content'], 'test.jpg', { type: 'image/jpeg' });

      component.onFileSelected({ target: { files: [file] } } as any);

      expect(component.fileSelected.emit).toHaveBeenCalledWith(file);
    });

    it('should emit uploadError event on validation failure', () => {
      spyOn(component.uploadError, 'emit');
      const file = new File(['content'], 'test.txt', { type: 'text/plain' });

      component.onFileSelected({ target: { files: [file] } } as any);

      expect(component.uploadError.emit).toHaveBeenCalled();
    });

    it('should emit uploadProgress event', () => {
      spyOn(component.uploadProgress, 'emit');

      component.simulateUploadProgress();

      // Wait for at least one progress update
      setTimeout(() => {
        expect(component.uploadProgress.emit).toHaveBeenCalled();
      }, 250);
    });
  });
});
