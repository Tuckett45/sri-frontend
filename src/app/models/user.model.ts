export class User {
    id: string;
    name: string;         
    email: string;  
    password: string;         
    role: string;    
    market: string;
    company: string;
    createdDate: Date;
    isApproved: boolean;
    approvalToken?: string;
    constructor(
      id: string,
      name: string,
      email: string,
      password: string,
      role: string,
      market: string,
      company: string,
      createdDate: Date = new Date(),
      isApproved: boolean,
      approvalToken?: string
    ) {
      this.id =  id;
      this.name = name;
      this.email = email;
      this.password = password;
      this.role = role;
      this.market = market;
      this.company = company;
      this.createdDate = createdDate;
      this.isApproved = isApproved;
      this.approvalToken = approvalToken;
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
          userObj.market,
          userObj.company,
          new Date(userObj.createdDate),
          userObj.isApproved,
          userObj.approvalToken
      );

  }