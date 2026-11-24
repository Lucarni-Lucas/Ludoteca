CREATE TYPE "public"."copy_origin" AS ENUM('manual', 'import', 'sync');--> statement-breakpoint
ALTER TABLE "copy" ADD COLUMN "store_game_id" text;--> statement-breakpoint
ALTER TABLE "copy" ADD COLUMN "origin" "copy_origin" DEFAULT 'manual' NOT NULL;--> statement-breakpoint
ALTER TABLE "library_game" ADD COLUMN "hltb_hours" numeric(6, 1);--> statement-breakpoint
ALTER TABLE "copy" ADD CONSTRAINT "copy_user_store_game_unique" UNIQUE("user_id","store_id","store_game_id");