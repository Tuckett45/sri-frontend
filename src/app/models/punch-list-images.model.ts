export class PunchListImages {
    id?: string; 
    preliminaryPunchListId: string; 
    imageType: 'issueImage' | 'resolutionImage'; 
    imageData: string | null; 
    
    constructor(
      preliminaryPunchListId: string,
      imageType: 'issueImage' | 'resolutionImage',
      imageData: string | null = null
    ) {
      this.preliminaryPunchListId = preliminaryPunchListId;
      this.imageType = imageType;
      this.imageData = imageData;
    }
  }
