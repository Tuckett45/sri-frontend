export class PunchListImages {
    id?: string; 
    preliminaryPunchListId: string; 
    imageType: 'issueImage' | 'resolutionImage'; 
    image: string | File | null; 
    
    constructor(
      preliminaryPunchListId: string,
      imageType: 'issueImage' | 'resolutionImage',
      image: string | File | null = null
    ) {
      this.preliminaryPunchListId = preliminaryPunchListId;
      this.imageType = imageType;
      this.image = image;
    }
  }