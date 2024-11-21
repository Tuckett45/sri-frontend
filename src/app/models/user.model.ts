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

  const userString = localStorage.getItem('user');

  if (userString) {
      const userObj = JSON.parse(userString);

      const user = new User(
          userObj.id,
          userObj.name,
          userObj.email,
          userObj.password,
          userObj.role,
          new Date(userObj.createdDate)
      );

  } else {
      console.log('User data not found in localStorage');
  }