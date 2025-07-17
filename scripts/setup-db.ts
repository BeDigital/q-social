import { AppDataSource } from '../src/database/ormconfig';
import { seedDatabase } from '../src/database/seeds/initial';

async function setup() {
    try {
        // Initialize the data source
        await AppDataSource.initialize();
        console.log('Database connection initialized');

        // Run migrations
        await AppDataSource.runMigrations();
        console.log('Migrations completed');

        // Run seeds if in development
        if (process.env.NODE_ENV === 'development') {
            await seedDatabase(AppDataSource);
            console.log('Seed data inserted');
        }

        console.log('Database setup completed successfully');
        process.exit(0);
    } catch (error) {
        console.error('Error during database setup:', error);
        process.exit(1);
    }
}

setup();
