import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
} from 'typeorm';
import { User } from './User';

@Entity('email_verification_tokens')
export class EmailVerificationToken {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  token: string;

  @Column()
  user_id: number;

  @ManyToOne(() => User)
  user: User;

  @Column()
  expires_at: Date;

  @CreateDateColumn()
  created_at: Date;

  @Column({ default: false })
  is_used: boolean;
}
