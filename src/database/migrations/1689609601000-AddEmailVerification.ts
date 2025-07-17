import { MigrationInterface, QueryRunner } from "typeorm";

export class AddEmailVerification1689609601000 implements MigrationInterface {
    name = 'AddEmailVerification1689609601000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Add email_verified column to users table
        await queryRunner.query(`
            ALTER TABLE "users" ADD COLUMN "email_verified" BOOLEAN DEFAULT FALSE
        `);

        // Create email verification tokens table
        await queryRunner.query(`
            CREATE TABLE "email_verification_tokens" (
                "id" INTEGER PRIMARY KEY AUTOINCREMENT,
                "token" TEXT NOT NULL,
                "user_id" INTEGER NOT NULL,
                "expires_at" DATETIME NOT NULL,
                "created_at" DATETIME DEFAULT CURRENT_TIMESTAMP,
                "is_used" BOOLEAN DEFAULT FALSE,
                FOREIGN KEY ("user_id") REFERENCES "users" ("id")
            )
        `);

        // Create index for token lookup
        await queryRunner.query(`
            CREATE INDEX "idx_verification_token" ON "email_verification_tokens" ("token")
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX "idx_verification_token"`);
        await queryRunner.query(`DROP TABLE "email_verification_tokens"`);
        await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "email_verified"`);
    }
}
