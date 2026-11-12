ALTER TYPE "public"."copy_kind" ADD VALUE 'other';--> statement-breakpoint
ALTER TABLE "copy" ADD COLUMN "kind_detail" text;