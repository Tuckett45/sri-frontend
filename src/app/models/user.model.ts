export class User {
    id: string;
    name: string;         
    email: string;  
    password: string;         
    role: string;    
    createdDate: Date;    
  
    constructor(
      id: string,
      name: string,
      email: string,
      password: string,
      role: string,
      createdDate: Date = new Date()
    ) {
      this.id =  id;
      this.name = name;
      this.email = email;
      this.password = password;
      this.role = role;
      this.createdDate = createdDate;
    }
  }