import { Repository } from 'typeorm';
import { User } from './entities/user.entity';
export declare class UsersService {
    private readonly usersRepo;
    constructor(usersRepo: Repository<User>);
    findAll(): Promise<User[]>;
    findOne(id: number): Promise<User | null>;
}
