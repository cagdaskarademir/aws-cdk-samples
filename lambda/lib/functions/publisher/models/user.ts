export interface User {
    id: string | null;
    username: string;
    firstName: string;
    lastName: string;
    companyCode: string | null;
    email: string;
    createdDate: number;
    expiredDate: Date | null;
}