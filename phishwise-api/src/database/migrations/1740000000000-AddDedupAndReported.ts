import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Dedup wall for XP farming + community blocklist derived from threat scans.
 * - scans.input_hash + unique (user_id, input_hash) prevents duplicate XP
 * - reported_phishing_urls / reported_phishing_messages store Likely/Dangerous
 *   artefacts for future engine enrichment (separate from static 176k Set).
 */
export class AddDedupAndReported1740000000000 implements MigrationInterface {
  name = 'AddDedupAndReported1740000000000';

  public async up(q: QueryRunner): Promise<void> {
    // scans.input_hash
    await q.query(`ALTER TABLE "scans" ADD COLUMN IF NOT EXISTS "input_hash" varchar;`);
    await q.query(`CREATE INDEX IF NOT EXISTS "idx_scans_input_hash" ON "scans" ("input_hash");`);
    // unique per user (allow multiple nulls, but Postgres treats null != null, so ok)
    await q.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "uq_scans_user_hash"
      ON "scans" ("user_id", "input_hash") WHERE "input_hash" IS NOT NULL;
    `);

    // reported_phishing_urls
    await q.query(`
      CREATE TABLE IF NOT EXISTS "reported_phishing_urls" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "reg_domain" varchar NOT NULL,
        "example_url" text NOT NULL,
        "example_hash" varchar NOT NULL,
        "first_verdict" varchar NOT NULL,
        "report_count" integer NOT NULL DEFAULT 1,
        "first_seen_at" timestamptz NOT NULL DEFAULT now(),
        "last_reported_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "pk_reported_urls" PRIMARY KEY ("id"),
        CONSTRAINT "uq_reported_urls_domain" UNIQUE ("reg_domain")
      );
    `);
    await q.query(`CREATE INDEX IF NOT EXISTS "idx_reported_urls_domain" ON "reported_phishing_urls" ("reg_domain");`);

    // reported_phishing_messages
    await q.query(`
      CREATE TABLE IF NOT EXISTS "reported_phishing_messages" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "msg_hash" varchar NOT NULL,
        "preview" varchar(300) NOT NULL,
        "first_verdict" varchar NOT NULL,
        "report_count" integer NOT NULL DEFAULT 1,
        "first_seen_at" timestamptz NOT NULL DEFAULT now(),
        "last_reported_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "pk_reported_msgs" PRIMARY KEY ("id"),
        CONSTRAINT "uq_reported_msgs_hash" UNIQUE ("msg_hash")
      );
    `);
    await q.query(`CREATE INDEX IF NOT EXISTS "idx_reported_msgs_hash" ON "reported_phishing_messages" ("msg_hash");`);
  }

  public async down(q: QueryRunner): Promise<void> {
    await q.query(`DROP TABLE IF EXISTS "reported_phishing_messages"`);
    await q.query(`DROP TABLE IF EXISTS "reported_phishing_urls"`);
    await q.query(`DROP INDEX IF EXISTS "uq_scans_user_hash"`);
    await q.query(`DROP INDEX IF EXISTS "idx_scans_input_hash"`);
    await q.query(`ALTER TABLE "scans" DROP COLUMN IF EXISTS "input_hash"`);
  }
}
