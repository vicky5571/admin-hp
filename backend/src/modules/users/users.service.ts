import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './entities/user.entity';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly usersRepo: Repository<User>,
  ) {}

  findAll() {
    return this.usersRepo.find({
      select: ['id', 'fullName', 'username', 'email', 'isActive', 'roleId'],
    });
  }

  findOne(id: number) {
    return this.usersRepo.findOne({ where: { id } });
  }
}
