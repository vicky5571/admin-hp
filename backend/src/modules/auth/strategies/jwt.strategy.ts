import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { InjectRepository } from '@nestjs/typeorm';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { Repository } from 'typeorm';
import { RoleName } from '../../../common/enums/role.enum';
import { AuthUser } from '../../../common/types/auth-user.type';
import { User } from '../../users/entities/user.entity';
import { JwtPayload } from '../interfaces/jwt-payload.interface';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    configService: ConfigService,
    @InjectRepository(User)
    private readonly usersRepo: Repository<User>,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.getOrThrow<string>('jwt.secret'),
    });
  }

  async validate(payload: JwtPayload): Promise<AuthUser> {
    const user = await this.usersRepo.findOne({
      where: { id: payload.sub },
      relations: ['role'],
    });
    if (!user || !user.isActive) {
      throw new UnauthorizedException(
        'User account is deactivated or no longer exists',
      );
    }
    return {
      id: Number(user.id),
      username: user.username,
      fullName: user.fullName,
      role: user.role.name as RoleName,
    };
  }
}
