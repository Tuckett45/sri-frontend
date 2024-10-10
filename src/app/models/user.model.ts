export class User {
    id: string;              // Optional - used when the user is already registered (e.g., for profile update)
    name: string;         // Required - username or email for login
    password: string;        // Optional - for login or registration, might not always be needed (e.g., profile update)
    email: string;          
    role: string;    
    createdDate: Date;    
  
    constructor(
      id: string,
      name: string,
      password: string,
      email: string,
      role: string,
      createdDate: Date = new Date()
    ) {
      this.id =  id;
      this.name = name;
      this.password = password;
      this.email = email;
      this.role = role;
      this.createdDate = createdDate;
    }
  }