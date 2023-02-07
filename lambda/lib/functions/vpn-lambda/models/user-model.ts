export interface Customer {
    fullName: string;
}

export interface Product {
    id: string;
    name: string;
    quantity: number;
    price: number;
    tax: number;
}

export interface Basket {
    products: Product[];
}

export interface Payment {
    amount: number;
    approvedCode: string;
    createdDate: Date;
}

export interface User {
    id: string;
    customer: Customer;
    basket: Basket;
    payment: Payment;
    createdDate: Date;
}
