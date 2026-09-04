import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  IsBoolean,
  IsIn,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { User } from './user.entity';

export class UpdateProfileDto {
  @IsOptional() @IsString() @MaxLength(80) name?: string;
  @IsOptional() @IsString() @MaxLength(500) avatarUrl?: string;
  @IsOptional() @IsString() @IsIn(['light', 'dark']) theme?: string;
  @IsOptional() @IsBoolean() onboarded?: boolean;
}

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User) private readonly users: Repository<User>,
  ) {}

  async update(userId: string, dto: UpdateProfileDto) {
    const user = await this.users.findOne({ where: { id: userId } });
    if (!user) throw new NotFoundException('Account not found.');
    if (dto.name !== undefined) user.name = dto.name.trim();
    if (dto.avatarUrl !== undefined) user.avatarUrl = dto.avatarUrl;
    if (dto.theme !== undefined) user.theme = dto.theme;
    if (dto.onboarded !== undefined) user.onboarded = dto.onboarded;
    await this.users.save(user);
    return this.sanitize(user);
  }

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
}
