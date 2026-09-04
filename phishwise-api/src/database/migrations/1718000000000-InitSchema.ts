import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitSchema1718000000000 implements MigrationInterface {
  name = 'InitSchema1718000000000';

  public async up(q: QueryRunner): Promise<void> {
    await q.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);
    await q.query(`CREATE EXTENSION IF NOT EXISTS "citext"`);

    await q.query(`
      CREATE TYPE "user_role_enum" AS ENUM ('learner','moderator','admin');
    `);
    await q.query(`
      CREATE TYPE "user_status_enum" AS ENUM ('active','inactive','suspended');
    `);
    await q.query(`
      CREATE TYPE "auth_token_type_enum" AS ENUM ('email_verify','password_reset');
    `);

    await q.query(`
      CREATE TABLE "users" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "email" citext NOT NULL,
        "password_hash" varchar NOT NULL,
        "name" varchar NOT NULL,
        "role" "user_role_enum" NOT NULL DEFAULT 'learner',
        "status" "user_status_enum" NOT NULL DEFAULT 'active',
        "email_verified" boolean NOT NULL DEFAULT false,
        "avatar_url" varchar,
        "theme" varchar NOT NULL DEFAULT 'light',
        "onboarded" boolean NOT NULL DEFAULT false,
        "refresh_token_hash" varchar,
        "last_active_at" timestamptz,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "pk_users" PRIMARY KEY ("id"),
        CONSTRAINT "uq_users_email" UNIQUE ("email")
      );
    `);

    await q.query(`
      CREATE TABLE "progress" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "user_id" uuid NOT NULL,
        "xp" integer NOT NULL DEFAULT 0,
        "completed_lessons" jsonb NOT NULL DEFAULT '[]',
        "bookmarks" jsonb NOT NULL DEFAULT '[]',
        "badges" jsonb NOT NULL DEFAULT '[]',
        "streak" integer NOT NULL DEFAULT 0,
        "last_active_date" date,
        "daily_challenge" jsonb NOT NULL DEFAULT '{}',
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "pk_progress" PRIMARY KEY ("id"),
        CONSTRAINT "uq_progress_user" UNIQUE ("user_id"),
        CONSTRAINT "fk_progress_user" FOREIGN KEY ("user_id")
          REFERENCES "users"("id") ON DELETE CASCADE
      );
    `);

    await q.query(`
      CREATE TABLE "auth_tokens" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "token_hash" varchar NOT NULL,
        "type" "auth_token_type_enum" NOT NULL,
        "user_id" uuid NOT NULL,
        "expires_at" timestamptz NOT NULL,
        "consumed_at" timestamptz,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "pk_auth_tokens" PRIMARY KEY ("id"),
        CONSTRAINT "fk_auth_tokens_user" FOREIGN KEY ("user_id")
          REFERENCES "users"("id") ON DELETE CASCADE
      );
    `);
    await q.query(`CREATE INDEX "idx_auth_tokens_hash" ON "auth_tokens" ("token_hash");`);

    await q.query(`
      CREATE TABLE "categories" (
        "id" varchar NOT NULL,
        "name" varchar NOT NULL,
        "icon" varchar NOT NULL,
        "color" varchar NOT NULL,
        "bg" varchar NOT NULL,
        "sort" integer NOT NULL DEFAULT 0,
        CONSTRAINT "pk_categories" PRIMARY KEY ("id")
      );
    `);

    await q.query(`
      CREATE TABLE "lessons" (
        "id" varchar NOT NULL,
        "title" varchar NOT NULL,
        "category_id" varchar NOT NULL,
        "minutes" integer NOT NULL DEFAULT 5,
        "difficulty" varchar NOT NULL DEFAULT 'Easy',
        "xp" integer NOT NULL DEFAULT 50,
        "summary" text NOT NULL,
        "blocks" jsonb NOT NULL DEFAULT '[]',
        "published" boolean NOT NULL DEFAULT true,
        "sort" integer NOT NULL DEFAULT 0,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "pk_lessons" PRIMARY KEY ("id")
      );
    `);

    await q.query(`
      CREATE TABLE "quizzes" (
        "id" varchar NOT NULL,
        "title" varchar NOT NULL,
        "category_id" varchar NOT NULL,
        "difficulty" varchar NOT NULL DEFAULT 'Easy',
        "minutes" integer NOT NULL DEFAULT 5,
        "timed" boolean NOT NULL DEFAULT false,
        "time_limit" integer,
        "description" text NOT NULL,
        "questions" jsonb NOT NULL DEFAULT '[]',
        "published" boolean NOT NULL DEFAULT true,
        "sort" integer NOT NULL DEFAULT 0,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "pk_quizzes" PRIMARY KEY ("id")
      );
    `);

    await q.query(`
      CREATE TABLE "quiz_attempts" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "user_id" uuid NOT NULL,
        "quiz_id" varchar NOT NULL,
        "title" varchar NOT NULL,
        "score" integer NOT NULL,
        "total" integer NOT NULL,
        "pct" integer NOT NULL,
        "xp" integer NOT NULL,
        "timed" boolean NOT NULL DEFAULT false,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "pk_quiz_attempts" PRIMARY KEY ("id"),
        CONSTRAINT "fk_quiz_attempts_user" FOREIGN KEY ("user_id")
          REFERENCES "users"("id") ON DELETE CASCADE
      );
    `);
    await q.query(`CREATE INDEX "idx_quiz_attempts_user" ON "quiz_attempts" ("user_id");`);
  }

  public async down(q: QueryRunner): Promise<void> {
    await q.query(`DROP TABLE IF EXISTS "quiz_attempts"`);
    await q.query(`DROP TABLE IF EXISTS "quizzes"`);
    await q.query(`DROP TABLE IF EXISTS "lessons"`);
    await q.query(`DROP TABLE IF EXISTS "categories"`);
    await q.query(`DROP TABLE IF EXISTS "auth_tokens"`);
    await q.query(`DROP TABLE IF EXISTS "progress"`);
    await q.query(`DROP TABLE IF EXISTS "users"`);
    await q.query(`DROP TYPE IF EXISTS "auth_token_type_enum"`);
    await q.query(`DROP TYPE IF EXISTS "user_status_enum"`);
    await q.query(`DROP TYPE IF EXISTS "user_role_enum"`);
  }
}
