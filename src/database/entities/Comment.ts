import 'reflect-metadata';
import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne } from 'typeorm';
import { User } from './User';
import { Post } from './Post';

@Entity('comments')
export class Comment {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  content: string;

  @ManyToOne(() => User, user => user.comments)
  user: User;

  @ManyToOne(() => Post, post => post.comments)
  post: Post;

  @CreateDateColumn()
  created_at: Date;
}
