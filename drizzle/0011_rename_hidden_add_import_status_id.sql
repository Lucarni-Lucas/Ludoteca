ALTER TYPE "public"."import_play_answer" ADD VALUE 'played';--> statement-breakpoint
ALTER TABLE "library_game" RENAME COLUMN "not_interested" TO "hidden";--> statement-breakpoint
ALTER TABLE "import_entry" ADD COLUMN "status_id" uuid;--> statement-breakpoint
ALTER TABLE "import_entry" ADD CONSTRAINT "import_entry_status_id_status_id_fk" FOREIGN KEY ("status_id") REFERENCES "public"."status"("id") ON DELETE set null ON UPDATE no action;