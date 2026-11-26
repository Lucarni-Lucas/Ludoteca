ALTER TABLE "import_entry" ALTER COLUMN "play_answer" SET DATA TYPE text;--> statement-breakpoint
DROP TYPE "public"."import_play_answer";--> statement-breakpoint
CREATE TYPE "public"."import_play_answer" AS ENUM('keep', 'hidden', 'played');--> statement-breakpoint
ALTER TABLE "import_entry" ALTER COLUMN "play_answer" SET DATA TYPE "public"."import_play_answer" USING "play_answer"::"public"."import_play_answer";--> statement-breakpoint
ALTER TABLE "import_entry" DROP COLUMN "status_key";