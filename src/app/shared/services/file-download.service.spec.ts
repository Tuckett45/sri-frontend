import { TestBed } from '@angular/core/testing';
import { FileDownloadService } from './file-download.service';

describe('FileDownloadService', () => {
  let service: FileDownloadService;
  let createElementSpy: jasmine.Spy;
  let appendChildSpy: jasmine.Spy;
  let removeChildSpy: jasmine.Spy;
  let clickSpy: jasmine.Spy;
  let createObjectURLSpy: jasmine.Spy;
  let revokeObjectURLSpy: jasmine.Spy;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(FileDownloadService);

    // Mock DOM methods
    const mockAnchor = {
      href: '',
      download: '',
      style: { display: '' },
      click: jasmine.createSpy('click')
    };

    createElementSpy = spyOn(document, 'createElement').and.returnValue(mockAnchor as any);
    appendChildSpy = spyOn(document.body, 'appendChild');
    removeChildSpy = spyOn(document.body, 'removeChild');
    clickSpy = mockAnchor.click;

    createObjectURLSpy = spyOn(URL, 'createObjectURL').and.returnValue('blob:mock-url');
    revokeObjectURLSpy = spyOn(URL, 'revokeObjectURL');
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should download a Blob', () => {
    const blob = new Blob(['test content'], { type: 'text/plain' });
    service.downloadFile(blob, 'test.txt', 'text/plain');

    expect(createObjectURLSpy).toHaveBeenCalledWith(blob);
    expect(createElementSpy).toHaveBeenCalledWith('a');
    expect(appendChildSpy).toHaveBeenCalled();
    expect(clickSpy).toHaveBeenCalled();
    expect(removeChildSpy).toHaveBeenCalled();
  });

  it('should download a string', () => {
    service.downloadFile('test content', 'test.txt', 'text/plain');

    expect(createObjectURLSpy).toHaveBeenCalled();
    expect(clickSpy).toHaveBeenCalled();
  });

  it('should download text content', () => {
    service.downloadText('Hello World', 'hello.txt');

    expect(createObjectURLSpy).toHaveBeenCalled();
    expect(clickSpy).toHaveBeenCalled();
  });

  it('should download JSON data', () => {
    const data = { name: 'John', age: 30 };
    service.downloadJSON(data, 'data.json');

    expect(createObjectURLSpy).toHaveBeenCalled();
    expect(clickSpy).toHaveBeenCalled();
  });

  it('should download CSV data', () => {
    const csv = 'name,age\nJohn,30';
    service.downloadCSV(csv, 'data.csv');

    expect(createObjectURLSpy).toHaveBeenCalled();
    expect(clickSpy).toHaveBeenCalled();
  });

  it('should download PDF data', () => {
    const pdfBlob = new Blob(['pdf content'], { type: 'application/pdf' });
    service.downloadPDF(pdfBlob, 'document.pdf');

    expect(createObjectURLSpy).toHaveBeenCalledWith(pdfBlob);
    expect(clickSpy).toHaveBeenCalled();
  });

  it('should throw error for unsupported data type', () => {
    expect(() => {
      service.downloadFile(123 as any, 'test.txt');
    }).toThrowError('Unsupported data type for download');
  });

  it('should revoke object URL after download', (done) => {
    const blob = new Blob(['test'], { type: 'text/plain' });
    service.downloadFile(blob, 'test.txt');

    setTimeout(() => {
      expect(revokeObjectURLSpy).toHaveBeenCalledWith('blob:mock-url');
      done();
    }, 150);
  });
});
