import { DataSource } from 'typeorm';
import { User } from '../entities/User';
import { Post } from '../entities/Post';
import { Hashtag } from '../entities/Hashtag';
import * as bcrypt from 'bcrypt';

export async function seedDatabase(dataSource: DataSource) {
    // Create users
    const userRepository = dataSource.getRepository(User);
    const postRepository = dataSource.getRepository(Post);
    const hashtagRepository = dataSource.getRepository(Hashtag);

    const passwordHash = await bcrypt.hash('Password123!', 10);

    const users = await userRepository.save([
        {
            username: 'johndoe',
            email: 'john@example.com',
            password_hash: passwordHash,
            bio: 'Software developer and tech enthusiast',
            is_private: false,
        },
        {
            username: 'janedoe',
            email: 'jane@example.com',
            password_hash: passwordHash,
            bio: 'Digital artist and designer',
            is_private: false,
        },
    ]);

    // Create hashtags
    const hashtags = await hashtagRepository.save([
        { name: 'tech' },
        { name: 'art' },
        { name: 'design' },
    ]);

    // Create posts
    await postRepository.save([
        {
            user: users[0],
            content: 'Excited to start working with TypeScript! #tech',
            hashtags: [hashtags[0]],
        },
        {
            user: users[1],
            content: 'Just finished a new design project! #art #design',
            hashtags: [hashtags[1], hashtags[2]],
        },
    ]);

    // Set up followers
    users[0].followers = [users[1]];
    users[1].followers = [users[0]];
    await userRepository.save(users);
}
