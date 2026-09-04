import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Adds the `scans` table introduced by the detection-first pivot.
 *
 * Only authenticated scans are ever inserted (public "Try it" scans are not
 * persisted), but `user_id` is nullable to keep the schema flexible and to make
 * the FK ON DELETE CASCADE behaviour explicit.
 */
export class AddScans1730000000000 implements MigrationInterface {
  name = 'AddScans1730000000000';

  public async up(q: QueryRunner): Promise<void> {
    await q.query(`
      CREATE TABLE "scans" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "user_id" uuid,
        "input_type" varchar NOT NULL,
        "input" text NOT NULL,
        "score" integer NOT NULL,
        "verdict" varchar NOT NULL,
        "threat" boolean NOT NULL DEFAULT false,
        "result" jsonb NOT NULL DEFAULT '{}',
        "created_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "pk_scans" PRIMARY KEY ("id"),
        CONSTRAINT "fk_scans_user" FOREIGN KEY ("user_id")
          REFERENCES "users"("id") ON DELETE CASCADE
      );
    `);
    await q.query(`CREATE INDEX "idx_scans_user" ON "scans" ("user_id");`);
    await q.query(`CREATE INDEX "idx_scans_verdict" ON "scans" ("verdict");`);
    await q.query(`CREATE INDEX "idx_scans_created" ON "scans" ("created_at");`);
  }

  public async down(q: QueryRunner): Promise<void> {
    await q.query(`DROP INDEX IF EXISTS "idx_scans_created"`);
    await q.query(`DROP INDEX IF EXISTS "idx_scans_verdict"`);
    await q.query(`DROP INDEX IF EXISTS "idx_scans_user"`);
    await q.query(`DROP TABLE IF EXISTS "scans"`);
  }
}
