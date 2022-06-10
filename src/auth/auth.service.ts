import { ForbiddenException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as argon from 'argon2';

import { PrismaService } from '../prisma/prisma.service';
import { AuthDto } from './dto';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
    private config: ConfigService,
  ) {}

  /**
   * Register a new user.
   * @param dto AuthDto
   * @returns
   */
  async signup(dto: AuthDto) {
    const hash = await argon.hash(dto.password);
    try {
      const user = await this.prisma.user.create({
        data: {
          email: dto.email,
          hash: hash,
        },
      });
      return this.signToken(user.id, user.email);
    } catch (error) {
      throw new ForbiddenException('email already registered');
    }
  }

  /**
   * User login.
   * @param dto AuthDto
   * @returns
   */
  async signin(dto: AuthDto) {
    const user = await this.prisma.user.findUnique({
      where: {
        email: dto.email,
      },
    });

    if (!user) {
      throw new ForbiddenException('login invalid');
    }

    const hash = await argon.verify(user.hash, dto.password);
    if (!hash) {
      throw new ForbiddenException('login invalid 2');
    }

    return this.signToken(user.id, user.email);
  }

  /**
   * Create a JWT token.
   * @param userId
   * @param email
   * @returns
   */
  async signToken(
    userId: number,
    email: string,
  ): Promise<{ access_token: string }> {
    const payload = {
      sub: userId,
      email: email,
    };

    const token = await this.jwt.signAsync(payload, {
      expiresIn: '86400s',
      secret: this.config.get('JWT_SECRET'),
    });

    return {
      access_token: token,
    };
  }
}
