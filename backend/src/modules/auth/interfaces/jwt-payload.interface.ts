import { RoleName } from '../../../common/enums/role.enum';

export interface JwtPayload {
  sub: number;
  username: string;
  role: RoleName;
}
