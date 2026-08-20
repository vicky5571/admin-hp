import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import { Repository } from 'typeorm';
import { RoleName } from '../../common/enums/role.enum';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { User } from '../users/entities/user.entity';
import { LoginDto } from './dto/login.dto';
import { JwtPayload } from './interfaces/jwt-payload.interface';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private readonly usersRepo: Repository<User>,
    private readonly jwtService: JwtService,
    private readonly auditLogsService: AuditLogsService,
  ) {}

  async login(dto: LoginDto, ipAddress?: string) {
    const user = await this.usersRepo.findOne({
      where: { username: dto.username, isActive: true },
    });
    if (!user) {
      await this.auditLogsService.log({
        action: 'LOGIN_FAILED',
        entityType: 'AUTH',
        metadataJson: { username: dto.username, reason: 'USER_NOT_FOUND_OR_INACTIVE' },
        ipAddress,
      });
      throw new UnauthorizedException('Invalid credentials');
    }

    const ok = await bcrypt.compare(dto.password, user.passwordHash);
    if (!ok) {
      await this.auditLogsService.log({
        userId: Number(user.id),
        action: 'LOGIN_FAILED',
        entityType: 'AUTH',
        metadataJson: { username: dto.username, reason: 'INVALID_PASSWORD' },
        ipAddress,
      });
      throw new UnauthorizedException('Invalid credentials');
    }

    user.lastLoginAt = new Date();
    await this.usersRepo.save(user);

    await this.auditLogsService.log({
      userId: Number(user.id),
      action: 'LOGIN_SUCCESS',
      entityType: 'AUTH',
      entityId: Number(user.id),
      metadataJson: { username: user.username, role: user.role?.name },
      ipAddress,
    });

    const payload: JwtPayload = {
      sub: Number(user.id),
      username: user.username,
      role: user.role.name as RoleName,
    };

    return {
      token: await this.jwtService.signAsync(payload),
      user: {
        id: Number(user.id),
        fullName: user.fullName,
        role: user.role.name,
      },
    };
  }
}
