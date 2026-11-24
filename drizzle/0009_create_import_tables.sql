CREATE TYPE "public"."import_play_answer" AS ENUM('keep', 'not_interested');--> statement-breakpoint
CREATE TYPE "public"."import_match_state" AS ENUM('pending', 'matched', 'candidates', 'not_found', 'absorbed');--> statement-breakpoint
CREATE TYPE "public"."import_source" AS ENUM('ign', 'playnite', 'steam');--> statement-breakpoint
CREATE TABLE "import_entry" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"igdb_id" integer,
	"catalog_game_id" uuid,
	"multiplayer_only" boolean DEFAULT false NOT NULL,
	"manual_title" text,
	"status_key" text,
	"endless_answer" boolean,
	"play_answer" "import_play_answer",
	"excluded" boolean DEFAULT false NOT NULL,
	"library_game_id" uuid,
	"confirmed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "import_entry_user_igdb_unique" UNIQUE("user_id","igdb_id")
);
--> statement-breakpoint
ALTER TABLE "import_entry" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "import_item" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"source" "import_source" NOT NULL,
	"source_key" text NOT NULL,
	"title" text NOT NULL,
	"alt_titles" text[] NOT NULL,
	"year" integer,
	"store_id" uuid,
	"store_game_id" text,
	"playtime_minutes" integer,
	"ign_statuses" text[] NOT NULL,
	"ign_score" numeric(3, 1),
	"hltb_main_hours" numeric(6, 1),
	"steam_app_id" text,
	"match_state" "import_match_state" DEFAULT 'pending' NOT NULL,
	"candidates" jsonb NOT NULL,
	"entry_id" uuid,
	"copy_kind" "copy_kind",
	"excluded" boolean DEFAULT false NOT NULL,
	"confirmed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "import_item_user_source_key_unique" UNIQUE("user_id","source","source_key")
);
--> statement-breakpoint
ALTER TABLE "import_item" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "import_entry" ADD CONSTRAINT "import_entry_catalog_game_id_catalog_game_id_fk" FOREIGN KEY ("catalog_game_id") REFERENCES "public"."catalog_game"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "import_entry" ADD CONSTRAINT "import_entry_library_game_id_library_game_id_fk" FOREIGN KEY ("library_game_id") REFERENCES "public"."library_game"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "import_item" ADD CONSTRAINT "import_item_store_id_store_id_fk" FOREIGN KEY ("store_id") REFERENCES "public"."store"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "import_item" ADD CONSTRAINT "import_item_entry_id_import_entry_id_fk" FOREIGN KEY ("entry_id") REFERENCES "public"."import_entry"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "import_item_entry_id_idx" ON "import_item" USING btree ("entry_id");