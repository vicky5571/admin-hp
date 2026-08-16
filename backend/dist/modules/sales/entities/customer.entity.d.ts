import { Sale } from './sale.entity';
export declare class Customer {
    id: number;
    name: string;
    phone: string | null;
    email: string | null;
    createdAt: Date;
    sales: Sale[];
}
