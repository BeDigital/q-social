import 'reflect-metadata';
import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, OneToMany } from 'typeorm';
import { Post } from './Post';
import { Comment } from './Comment';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  username: string;

  @Column({ unique: true })
  email: string;

  @Column()
  password_hash: string;

  @Column({ nullable: true })
  profile_image: string;

  @Column({ nullable: true })
  bio: string;

  @Column({ default: false })
  is_private: boolean;

  @OneToMany(() => Post, post => post.user)
  posts: Post[];

  @OneToMany(() => Comment, comment => comment.user)
  comments: Comment[];

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
