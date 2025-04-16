export class ErrorCodes {
    id: string; 
    area: string; 
    category: string; 
    subCategory: string; 
    errorCode: string; 
    criticality: string; 
  
    constructor(id: string, area: string, category: string, subCategory: string, errorCode: string, criticality: string) {
      this.id = id;
      this.area = area;
      this.category = category; 
      this.subCategory = subCategory; 
      this.errorCode = errorCode;
      this.criticality = criticality;
    }
  }