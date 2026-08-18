import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import { Repository } from 'typeorm';
import { Role } from '../roles/entities/role.entity';
import { User } from './entities/user.entity';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly usersRepo: Repository<User>,
    @InjectRepository(Role)
    private readonly rolesRepo: Repository<Role>,
  ) {}

  findAll() {
    return this.usersRepo.find({
      select: ['id', 'fullName', 'username', 'email', 'isActive', 'roleId', 'createdAt'],
      relations: ['role'],
      order: { createdAt: 'DESC' },
    });
  }

  findOne(id: number) {
    return this.usersRepo.findOne({ where: { id }, relations: ['role'] });
  }

  async create(dto: {
    fullName: string;
    username: string;
    email?: string;
    password: string;
    roleId: number;
  }) {
    const existingUser = await this.usersRepo.findOne({
      where: [{ username: dto.username }],
    });
    if (existingUser) {
      throw new ConflictException('Username already exists');
    }

    if (dto.email) {
      const existingEmail = await this.usersRepo.findOne({
        where: [{ email: dto.email }],
      });
      if (existingEmail) {
        throw new ConflictException('Email already exists');
      }
    }

    const role = await this.rolesRepo.findOne({ where: { id: dto.roleId } });
    if (!role) {
      throw new BadRequestException('Invalid role');
    }

    const passwordHash = await bcrypt.hash(dto.password, 10);

    const user = this.usersRepo.create({
      fullName: dto.fullName,
      username: dto.username,
      email: dto.email ?? null,
      passwordHash,
      roleId: dto.roleId,
      isActive: true,
    });

    const saved = await this.usersRepo.save(user);
    return this.findOne(saved.id);
  }

  async update(
    id: number,
    dto: {
      fullName?: string;
      username?: string;
      email?: string;
      roleId?: number;
      isActive?: boolean;
    },
  ) {
    const user = await this.usersRepo.findOne({ where: { id } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (dto.username && dto.username !== user.username) {
      const existing = await this.usersRepo.findOne({
        where: { username: dto.username },
      });
      if (existing) {
        throw new ConflictException('Username already exists');
      }
    }

    if (dto.email && dto.email !== user.email) {
      const existing = await this.usersRepo.findOne({
        where: { email: dto.email },
      });
      if (existing) {
        throw new ConflictException('Email already exists');
      }
    }

    if (dto.roleId) {
      const role = await this.rolesRepo.findOne({ where: { id: dto.roleId } });
      if (!role) {
        throw new BadRequestException('Invalid role');
      }
    }

    if (dto.fullName !== undefined) user.fullName = dto.fullName;
    if (dto.username !== undefined) user.username = dto.username;
    if (dto.email !== undefined) user.email = dto.email;
    if (dto.roleId !== undefined) user.roleId = dto.roleId;
    if (dto.isActive !== undefined) user.isActive = dto.isActive;

    await this.usersRepo.save(user);
    return this.findOne(id);
  }

  async changePassword(
    id: number,
    currentPassword: string,
    newPassword: string,
  ) {
    const user = await this.usersRepo.findOne({ where: { id } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const ok = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!ok) {
      throw new BadRequestException('Current password is incorrect');
    }

    user.passwordHash = await bcrypt.hash(newPassword, 10);
    await this.usersRepo.save(user);
    return { message: 'Password changed successfully' };
  }

  async resetPassword(id: number, newPassword: string) {
    const user = await this.usersRepo.findOne({ where: { id } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    user.passwordHash = await bcrypt.hash(newPassword, 10);
    await this.usersRepo.save(user);
    return { message: 'Password reset successfully' };
  }

  async getRoles() {
    return this.rolesRepo.find({ order: { name: 'ASC' } });
  }
}
