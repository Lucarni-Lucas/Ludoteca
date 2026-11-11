CREATE TYPE "public"."copy_kind" AS ENUM('purchased', 'free', 'subscription', 'family', 'physical');--> statement-breakpoint
CREATE TYPE "public"."lost_reason" AS ENUM('left_family', 'subscription_ended', 'sold', 'other');--> statement-breakpoint
CREATE TYPE "public"."catalog_source" AS ENUM('igdb', 'manual');--> statement-breakpoint
CREATE TYPE "public"."journal_entry_kind" AS ENUM('status_change');--> statement-breakpoint
CREATE TYPE "public"."status_group" AS ENUM('in_progress', 'not_started', 'finished', 'dropped');--> statement-breakpoint
CREATE TABLE "copy" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"library_game_id" uuid NOT NULL,
	"store_id" uuid NOT NULL,
	"kind" "copy_kind" NOT NULL,
	"acquired_on" date,
	"playtime_minutes" integer,
	"family_owner" text,
	"lost_at" date,
	"lost_reason" "lost_reason",
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "copy" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "catalog_game" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"igdb_id" integer,
	"source" "catalog_source" NOT NULL,
	"owner_id" uuid,
	"title" text NOT NULL,
	"year" integer,
	"developer" text,
	"cover_url" text,
	"page_url" text,
	"estimated_hours" numeric(6, 1),
	"endless" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "catalog_game_igdb_id_unique" UNIQUE("igdb_id")
);
--> statement-breakpoint
ALTER TABLE "catalog_game" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "library_game" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"catalog_game_id" uuid NOT NULL,
	"status_id" uuid NOT NULL,
	"status_since" date NOT NULL,
	"score" numeric(3, 1),
	"not_interested" boolean DEFAULT false NOT NULL,
	"estimated_hours" numeric(6, 1),
	"endless" boolean,
	"cover_url" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "library_game_user_catalog_unique" UNIQUE("user_id","catalog_game_id")
);
--> statement-breakpoint
ALTER TABLE "library_game" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "provider_token" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"provider" text NOT NULL,
	"access_token" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "provider_token_provider_unique" UNIQUE("provider")
);
--> statement-breakpoint
ALTER TABLE "provider_token" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "journal_entry" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"library_game_id" uuid NOT NULL,
	"kind" "journal_entry_kind" NOT NULL,
	"occurred_on" date NOT NULL,
	"from_status_id" uuid NOT NULL,
	"to_status_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "journal_entry" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "status" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"status_group" "status_group" NOT NULL,
	"name" text NOT NULL,
	"color" text NOT NULL,
	"position" integer NOT NULL,
	"system_key" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "status_user_system_key_unique" UNIQUE("user_id","system_key")
);
--> statement-breakpoint
ALTER TABLE "status" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "store" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "store_user_slug_unique" UNIQUE NULLS NOT DISTINCT("user_id","slug")
);
--> statement-breakpoint
ALTER TABLE "store" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "copy" ADD CONSTRAINT "copy_library_game_id_library_game_id_fk" FOREIGN KEY ("library_game_id") REFERENCES "public"."library_game"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "copy" ADD CONSTRAINT "copy_store_id_store_id_fk" FOREIGN KEY ("store_id") REFERENCES "public"."store"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "library_game" ADD CONSTRAINT "library_game_catalog_game_id_catalog_game_id_fk" FOREIGN KEY ("catalog_game_id") REFERENCES "public"."catalog_game"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "library_game" ADD CONSTRAINT "library_game_status_id_status_id_fk" FOREIGN KEY ("status_id") REFERENCES "public"."status"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "journal_entry" ADD CONSTRAINT "journal_entry_library_game_id_library_game_id_fk" FOREIGN KEY ("library_game_id") REFERENCES "public"."library_game"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "journal_entry" ADD CONSTRAINT "journal_entry_from_status_id_status_id_fk" FOREIGN KEY ("from_status_id") REFERENCES "public"."status"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "journal_entry" ADD CONSTRAINT "journal_entry_to_status_id_status_id_fk" FOREIGN KEY ("to_status_id") REFERENCES "public"."status"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "copy_user_id_idx" ON "copy" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "copy_library_game_id_idx" ON "copy" USING btree ("library_game_id");--> statement-breakpoint
CREATE INDEX "copy_store_id_idx" ON "copy" USING btree ("store_id");--> statement-breakpoint
CREATE INDEX "catalog_game_owner_id_idx" ON "catalog_game" USING btree ("owner_id");--> statement-breakpoint
CREATE INDEX "library_game_catalog_game_id_idx" ON "library_game" USING btree ("catalog_game_id");--> statement-breakpoint
CREATE INDEX "library_game_status_id_idx" ON "library_game" USING btree ("status_id");--> statement-breakpoint
CREATE INDEX "journal_entry_user_id_idx" ON "journal_entry" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "journal_entry_library_game_id_idx" ON "journal_entry" USING btree ("library_game_id");