import { triggerBlobDownload } from './download.util';

describe('triggerBlobDownload', () => {
  let createObjectURLSpy: jasmine.Spy;
  let revokeObjectURLSpy: jasmine.Spy;
  let createElementSpy: jasmine.Spy;
  let mockAnchor: { href: string; download: string; click: jasmine.Spy };

  beforeEach(() => {
    createObjectURLSpy = spyOn(URL, 'createObjectURL').and.returnValue('blob:mock-url');
    revokeObjectURLSpy = spyOn(URL, 'revokeObjectURL');

    mockAnchor = { href: '', download: '', click: jasmine.createSpy('click') };
    createElementSpy = spyOn(document, 'createElement').and.returnValue(mockAnchor as any);
  });

  it('should create an object URL from the blob', () => {
    const blob = new Blob(['test'], { type: 'application/pdf' });
    triggerBlobDownload(blob, 'test.pdf');
    expect(createObjectURLSpy).toHaveBeenCalledWith(blob);
  });

  it('should create an anchor element with correct href and download attributes', () => {
    const blob = new Blob(['test'], { type: 'application/pdf' });
    triggerBlobDownload(blob, 'paystub_123_2024-01.pdf');

    expect(createElementSpy).toHaveBeenCalledWith('a');
    expect(mockAnchor.href).toBe('blob:mock-url');
    expect(mockAnchor.download).toBe('paystub_123_2024-01.pdf');
  });

  it('should click the anchor to trigger download', () => {
    const blob = new Blob(['test'], { type: 'application/pdf' });
    triggerBlobDownload(blob, 'test.pdf');
    expect(mockAnchor.click).toHaveBeenCalled();
  });

  it('should revoke the object URL after download', () => {
    const blob = new Blob(['test'], { type: 'application/pdf' });
    triggerBlobDownload(blob, 'test.pdf');
    expect(revokeObjectURLSpy).toHaveBeenCalledWith('blob:mock-url');
  });
});
