import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateAccountInput } from './dtos/create-account.dto';
import { LoginInput } from './dtos/login.dto';
import { User } from './entities/user.entity';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User) private readonly users: Repository<User>,
  ) {}

  async createAccount({
    email,
    password,
    role,
  }: CreateAccountInput): Promise<{ error?: string; ok: boolean }> {
    try {
      const exists = await this.users.findOne({ where: { email } });
      if (exists) {
        //make error
        return { ok: true, error: 'User with input email already exists.' };
      }
      await this.users.save(this.users.create({ email, password, role }));
      return { ok: true };
    } catch (err) {
      return { ok: false, error: "Couldn't create User" };
    }
  }

  async login({
    email,
    password,
  }: LoginInput): Promise<{ error?: string; ok: boolean; token?: string }> {
    try {
      const user = await this.users.findOne({ where: { email } });
      if (!user) {
        return {
          ok: false,
          error: 'User not found',
        };
      }
      const passwordCorrect = await user.checkPassword(password);
      if (!passwordCorrect) {
        return {
          ok: false,
          error: 'Wrong Password',
        };
      }
      return { ok: true, token: 'anyToken' }; //This token is Temporary value for testing
    } catch (error) {
      return { ok: false, error };
    }
  }
}
