import { MigrationInterface, QueryRunner } from "typeorm";

export class InitialSchema1689609600000 implements MigrationInterface {
    name = 'InitialSchema1689609600000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            CREATE TABLE "users" (
                "id" INTEGER PRIMARY KEY AUTOINCREMENT,
                "username" TEXT UNIQUE NOT NULL,
                "email" TEXT UNIQUE NOT NULL,
                "password_hash" TEXT NOT NULL,
                "profile_image" TEXT,
                "bio" TEXT,
                "is_private" BOOLEAN DEFAULT FALSE,
                "created_at" DATETIME DEFAULT CURRENT_TIMESTAMP,
                "updated_at" DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        `);

        await queryRunner.query(`
            CREATE TABLE "posts" (
                "id" INTEGER PRIMARY KEY AUTOINCREMENT,
                "user_id" INTEGER NOT NULL,
                "content" TEXT NOT NULL,
                "media_urls" TEXT,
                "is_draft" BOOLEAN DEFAULT FALSE,
                "scheduled_for" DATETIME,
                "created_at" DATETIME DEFAULT CURRENT_TIMESTAMP,
                "updated_at" DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY ("user_id") REFERENCES "users" ("id")
            )
        `);

        await queryRunner.query(`
            CREATE TABLE "comments" (
                "id" INTEGER PRIMARY KEY AUTOINCREMENT,
                "post_id" INTEGER NOT NULL,
                "user_id" INTEGER NOT NULL,
                "content" TEXT NOT NULL,
                "created_at" DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY ("post_id") REFERENCES "posts" ("id"),
                FOREIGN KEY ("user_id") REFERENCES "users" ("id")
            )
        `);

        await queryRunner.query(`
            CREATE TABLE "likes" (
                "user_id" INTEGER NOT NULL,
                "post_id" INTEGER NOT NULL,
                "created_at" DATETIME DEFAULT CURRENT_TIMESTAMP,
                PRIMARY KEY ("user_id", "post_id"),
                FOREIGN KEY ("user_id") REFERENCES "users" ("id"),
                FOREIGN KEY ("post_id") REFERENCES "posts" ("id")
            )
        `);

        await queryRunner.query(`
            CREATE TABLE "followers" (
                "follower_id" INTEGER NOT NULL,
                "following_id" INTEGER NOT NULL,
                "created_at" DATETIME DEFAULT CURRENT_TIMESTAMP,
                PRIMARY KEY ("follower_id", "following_id"),
                FOREIGN KEY ("follower_id") REFERENCES "users" ("id"),
                FOREIGN KEY ("following_id") REFERENCES "users" ("id")
            )
        `);

        await queryRunner.query(`
            CREATE TABLE "hashtags" (
                "id" INTEGER PRIMARY KEY AUTOINCREMENT,
                "name" TEXT UNIQUE NOT NULL,
                "created_at" DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        `);

        await queryRunner.query(`
            CREATE TABLE "post_hashtags" (
                "post_id" INTEGER NOT NULL,
                "hashtag_id" INTEGER NOT NULL,
                PRIMARY KEY ("post_id", "hashtag_id"),
                FOREIGN KEY ("post_id") REFERENCES "posts" ("id"),
                FOREIGN KEY ("hashtag_id") REFERENCES "hashtags" ("id")
            )
        `);

        await queryRunner.query(`
            CREATE TABLE "notifications" (
                "id" INTEGER PRIMARY KEY AUTOINCREMENT,
                "user_id" INTEGER NOT NULL,
                "type" TEXT NOT NULL,
                "content" TEXT NOT NULL,
                "is_read" BOOLEAN DEFAULT FALSE,
                "created_at" DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY ("user_id") REFERENCES "users" ("id")
            )
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP TABLE "notifications"`);
        await queryRunner.query(`DROP TABLE "post_hashtags"`);
        await queryRunner.query(`DROP TABLE "hashtags"`);
        await queryRunner.query(`DROP TABLE "followers"`);
        await queryRunner.query(`DROP TABLE "likes"`);
        await queryRunner.query(`DROP TABLE "comments"`);
        await queryRunner.query(`DROP TABLE "posts"`);
        await queryRunner.query(`DROP TABLE "users"`);
    }
}
