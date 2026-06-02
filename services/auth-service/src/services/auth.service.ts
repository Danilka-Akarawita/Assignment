import bcrypt from 'bcrypt';
import * as jwt from 'jsonwebtoken';
import type { JwtPayload, Secret, SignOptions } from 'jsonwebtoken';
import { prisma } from '../lib/prisma.js';
import { publishEvent } from '../lib/rabbitmq.publisher.js';
import type { RegisterInput, LoginInput } from '../schemas/auth.schema.js';
import { logger } from '../utils/logger.js';

interface RefreshTokenPayload extends JwtPayload {
  sub: string;
}

export class AuthService {
  async register(data: RegisterInput) {
    const existing = await prisma.user.findUnique({
      where: { email: data.email },
    });

    if (existing) throw new Error('User already exists');

    const hashedPassword = await bcrypt.hash(
      data.password,
      parseInt(process.env.BCRYPT_ROUNDS!)
    );

    const user = await prisma.user.create({
      data: {
        email: data.email,
        passwordHash: hashedPassword,
        role: data.role,
      },
      select: {
        id: true,
        email: true,
        role: true,
        createdAt: true,
      },
    });

    const tokens = this.generateTokens(user);
    await this.storeRefreshToken(tokens.refreshToken, user.id);

    await publishEvent('user.events', 'user.registered', {
      userId: user.id,
      email: user.email,
      role: user.role,
      timestamp: new Date().toISOString(),
    });

    logger.info({ userId: user.id }, 'User registered');

    return tokens;
  }

  async login(data: LoginInput) {
    const user = await prisma.user.findUnique({
      where: { email: data.email },
    });

    if (!user) throw new Error('Invalid credentials');

    const valid = await bcrypt.compare(data.password, user.passwordHash);

    if (!valid) throw new Error('Invalid credentials');

    const tokens = this.generateTokens(user);
    await this.storeRefreshToken(tokens.refreshToken, user.id);

    logger.info({ userId: user.id }, 'User logged in');

    return tokens;
  }

  async refresh(refreshToken: string) {
    const decoded = jwt.verify(
      refreshToken,
      process.env.REFRESH_TOKEN_SECRET!
    ) as RefreshTokenPayload;

    const stored = await prisma.refreshToken.findFirst({
      where: {
        token: refreshToken,
        expiresAt: { gt: new Date() },
      },
    });

    if (!stored) throw new Error('Invalid or expired refresh token');

    const userId = Number(decoded.sub);

    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) throw new Error('User not found');

    await prisma.refreshToken.delete({
      where: { id: stored.id },
    });

    const newTokens = this.generateTokens(user);
    await this.storeRefreshToken(newTokens.refreshToken, user.id);

    return newTokens;
  }

  private generateTokens(user: {
    id: number;
    email: string;
    role: string;
  }) {
    const accessToken = jwt.sign(
      {
        sub: String(user.id),
        email: user.email,
        role: user.role,
      },
      process.env.JWT_SECRET! as Secret,
      {
        expiresIn: process.env.JWT_EXPIRES_IN || '15m',
      } as SignOptions
    );

    const refreshToken = jwt.sign(
      {
        sub: String(user.id),
      },
      process.env.REFRESH_TOKEN_SECRET! as Secret,
      {
        expiresIn: process.env.REFRESH_TOKEN_EXPIRES_IN || '7d',
      } as SignOptions
    );

    return { accessToken, refreshToken };
  }

  private async storeRefreshToken(token: string, userId: number) {
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    await prisma.refreshToken.create({
      data: {
        token,
        userId,
        expiresAt,
      },
    });
  }
}