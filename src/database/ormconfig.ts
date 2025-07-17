import { DataSource } from 'typeorm';
import { User } from './entities/User';
import { Post } from './entities/Post';
import { Comment } from './entities/Comment';

export const AppDataSource = new DataSource({
  type: 'sqlite',
  database: process.env.NODE_ENV === 'test' ? ':memory:' : 'database.sqlite',
  entities: [User, Post, Comment],
  synchronize: process.env.NODE_ENV === 'test',
  logging: process.env.NODE_ENV === 'development',
});
