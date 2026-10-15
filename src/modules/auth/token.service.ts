import jwt from 'jsonwebtoken';
import { config } from '../../config/env.js';
import { UserRole } from '../../models/User.js';

export interface TokenPayload {
  userId: string;
  email: string;
  role: UserRole;
  restaurantId?: string | null;
  branchId?: string | null;
}

export interface GeneratedTokens {
  accessToken: string;
  refreshToken: string;
}

export class TokenService {
  static generateTokens(payload: TokenPayload): GeneratedTokens {
    const accessToken = jwt.sign(payload, config.jwtAccessSecret, {
      expiresIn: '7d',
    });

    const refreshToken = jwt.sign(payload, config.jwtRefreshSecret, {
      expiresIn: '30d',
    });

    return { accessToken, refreshToken };
  }

  static verifyAccessToken(token: string): TokenPayload {
    return jwt.verify(token, config.jwtAccessSecret) as TokenPayload;
  }

  static verifyRefreshToken(token: string): TokenPayload {
    return jwt.verify(token, config.jwtRefreshSecret) as TokenPayload;
  }
}
