import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToMany,
} from 'typeorm';
import { Post } from './Post';

@Entity('hashtags')
export class Hashtag {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  name: string;

  @ManyToMany(() => Post, post => post.hashtags)
  posts: Post[];

  @CreateDateColumn()
  created_at: Date;
}
