declare module 'html5-qrcode' {
  export class Html5Qrcode {
    constructor(elementId: string);
    static getCameras(): Promise<Array<{ id: string; label: string }>>;
    start(
      cameraIdOrConfig: string | object,
      configuration: { fps: number; qrbox?: { width: number; height: number } | number },
      qrCodeSuccessCallback: (decodedText: string, result?: any) => void,
      qrCodeErrorCallback?: (errorMessage: string, error?: any) => void
    ): Promise<void>;
    stop(): Promise<void>;
    pause(): void;
    resume(): void;
  }

  export class Html5QrcodeScanner {
    constructor(elementId: string, config: any, verbose?: boolean);
    render(
      qrCodeSuccessCallback: (decodedText: string, result?: any) => void,
      qrCodeErrorCallback?: (errorMessage: string, error?: any) => void
    ): void;
    clear(): Promise<void>;
  }
}
