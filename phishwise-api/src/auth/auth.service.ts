import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { LessThan, Repository } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import { createHash, randomBytes } from 'crypto';
import { User, UserRole, UserStatus } from '../users/user.entity';
import { Progress } from '../progress/progress.entity';
import { AuthToken, TokenType } from './auth-token.entity';
import { MailService } from '../mail/mail.service';
import {
  RegisterDto,
  LoginDto,
  ResetPasswordDto,
  ChangePasswordDto,
} from './dto/auth.dto';

const SALT_ROUNDS = 12;
const sha256 = (s: string) => createHash('sha256').update(s).digest('hex');

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    @InjectRepository(User) private readonly users: Repository<User>,
    @InjectRepository(Progress) private readonly progress: Repository<Progress>,
    @InjectRepository(AuthToken) private readonly tokens: Repository<AuthToken>,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
    private readonly mail: MailService,
  ) {}

  // ── Registration ───────────────────────────────────────
  async register(dto: RegisterDto) {
    const email = dto.email.toLowerCase().trim();
    const existing = await this.users.findOne({ where: { email } });
    if (existing) {
      throw new ConflictException('An account with this email already exists.');
    }

    // Role convention preserved from the original demo: emails starting with
    // "admin" become admins. (In real life this would be invite-based.)
    const role = email.startsWith('admin') ? UserRole.ADMIN : UserRole.LEARNER;

    const user = this.users.create({
      email,
      name: dto.name.trim(),
      passwordHash: await bcrypt.hash(dto.password, SALT_ROUNDS),
      role,
      status: UserStatus.ACTIVE,
      emailVerified: false,
    });
    await this.users.save(user);

    // Every user gets a progress row.
    await this.progress.save(this.progress.create({ userId: user.id }));

    await this.issueEmailVerification(user);

    return {
      message:
        'Account created. Check your email to verify your address before logging in.',
      email: user.email,
    };
  }

  // ── Email verification ─────────────────────────────────
  private async issueEmailVerification(user: User) {
    const raw = randomBytes(32).toString('hex');
    const ttl = this.config.get<number>('tokens.emailTtlHours') ?? 24;
    await this.tokens.save(
      this.tokens.create({
        tokenHash: sha256(raw),
        type: TokenType.EMAIL_VERIFY,
        userId: user.id,
        expiresAt: new Date(Date.now() + ttl * 3600_000),
      }),
    );
    const link = `${this.config.get('appUrl')}/verify-email?token=${raw}`;
    await this.mail.sendVerificationEmail(user.email, user.name, link);
  }

  async verifyEmail(token: string) {
    const record = await this.tokens.findOne({
      where: { tokenHash: sha256(token), type: TokenType.EMAIL_VERIFY },
    });
    if (!record || record.consumedAt || record.expiresAt < new Date()) {
      throw new BadRequestException(
        'This verification link is invalid or has expired.',
      );
    }
    record.consumedAt = new Date();
    await this.tokens.save(record);
    await this.users.update(record.userId, { emailVerified: true });
    return { message: 'Email verified. You can now log in.' };
  }

  async resendVerification(email: string) {
    const user = await this.users.findOne({
      where: { email: email.toLowerCase().trim() },
    });
    // Always return success to avoid leaking which emails exist.
    if (user && !user.emailVerified) await this.issueEmailVerification(user);
    return {
      message: 'If that account exists and is unverified, a new link is on its way.',
    };
  }

  // ── Login ──────────────────────────────────────────────
  async login(dto: LoginDto) {
    const email = dto.email.toLowerCase().trim();
    const user = await this.users.findOne({ where: { email } });
    if (!user || !(await bcrypt.compare(dto.password, user.passwordHash))) {
      throw new UnauthorizedException('Invalid email or password.');
    }
    if (user.status === UserStatus.SUSPENDED) {
      throw new UnauthorizedException('This account has been suspended.');
    }
    if (!user.emailVerified) {
      throw new UnauthorizedException(
        'Please verify your email before logging in. Check your inbox for the link.',
      );
    }
    user.lastActiveAt = new Date();
    await this.users.save(user);
    return this.issueSession(user);
  }

  // ── Session / tokens ───────────────────────────────────
  private async issueSession(user: User) {
    const payload = { sub: user.id, email: user.email, role: user.role };
    const accessToken = await this.jwt.signAsync(payload, {
      secret: this.config.get('jwt.accessSecret'),
      expiresIn: this.config.get('jwt.accessTtl'),
    });
    const refreshToken = await this.jwt.signAsync(payload, {
      secret: this.config.get('jwt.refreshSecret'),
      expiresIn: this.config.get('jwt.refreshTtl'),
    });
    user.refreshTokenHash = sha256(refreshToken);
    await this.users.save(user);
    return { accessToken, refreshToken, user: this.sanitize(user) };
  }

  async refresh(refreshToken: string) {
    let payload: any;
    try {
      payload = await this.jwt.verifyAsync(refreshToken, {
        secret: this.config.get('jwt.refreshSecret'),
      });
    } catch {
      throw new UnauthorizedException('Session expired. Please log in again.');
    }
    const user = await this.users.findOne({ where: { id: payload.sub } });
    if (!user || user.refreshTokenHash !== sha256(refreshToken)) {
      throw new UnauthorizedException('Session is no longer valid.');
    }
    return this.issueSession(user); // rotation: new refresh token each time
  }

  async logout(userId: string) {
    await this.users.update(userId, { refreshTokenHash: null });
    return { message: 'Logged out.' };
  }

  // ── Forgot / reset password ────────────────────────────
  async forgotPassword(email: string) {
    const user = await this.users.findOne({
      where: { email: email.toLowerCase().trim() },
    });
    if (user) {
      const raw = randomBytes(32).toString('hex');
      const ttl = this.config.get<number>('tokens.resetTtlHours') ?? 1;
      await this.tokens.save(
        this.tokens.create({
          tokenHash: sha256(raw),
          type: TokenType.PASSWORD_RESET,
          userId: user.id,
          expiresAt: new Date(Date.now() + ttl * 3600_000),
        }),
      );
      const link = `${this.config.get('appUrl')}/reset-password?token=${raw}`;
      await this.mail.sendPasswordResetEmail(user.email, user.name, link);
    }
    // Uniform response — never reveal whether the email is registered.
    return {
      message: 'If an account exists for that email, a reset link has been sent.',
    };
  }

  async resetPassword(dto: ResetPasswordDto) {
    const record = await this.tokens.findOne({
      where: { tokenHash: sha256(dto.token), type: TokenType.PASSWORD_RESET },
    });
    if (!record || record.consumedAt || record.expiresAt < new Date()) {
      throw new BadRequestException(
        'This reset link is invalid or has expired.',
      );
    }
    record.consumedAt = new Date();
    await this.tokens.save(record);
    await this.users.update(record.userId, {
      passwordHash: await bcrypt.hash(dto.password, SALT_ROUNDS),
      refreshTokenHash: null, // force re-login everywhere
    });
    return { message: 'Password updated. You can now log in.' };
  }

  async changePassword(userId: string, dto: ChangePasswordDto) {
    const user = await this.users.findOne({ where: { id: userId } });
    if (!user || !(await bcrypt.compare(dto.currentPassword, user.passwordHash))) {
      throw new BadRequestException('Your current password is incorrect.');
    }
    user.passwordHash = await bcrypt.hash(dto.newPassword, SALT_ROUNDS);
    await this.users.save(user);
    return { message: 'Password changed successfully.' };
  }

  // ── Helpers ────────────────────────────────────────────
  sanitize(user: User) {
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      status: user.status,
      emailVerified: user.emailVerified,
      avatarUrl: user.avatarUrl,
      theme: user.theme,
      onboarded: user.onboarded,
      joined: user.createdAt?.toISOString().slice(0, 10),
    };
  }

  /** Periodic cleanup hook (called from a cron or manually). */
  async purgeExpiredTokens() {
    await this.tokens.delete({ expiresAt: LessThan(new Date()) });
  }
}
