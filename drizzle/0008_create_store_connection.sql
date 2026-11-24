CREATE TABLE "store_connection" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"store_id" uuid NOT NULL,
	"account_id" text NOT NULL,
	"last_synced_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "store_connection_user_store_unique" UNIQUE("user_id","store_id")
);
--> statement-breakpoint
ALTER TABLE "store_connection" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "store_connection" ADD CONSTRAINT "store_connection_store_id_store_id_fk" FOREIGN KEY ("store_id") REFERENCES "public"."store"("id") ON DELETE no action ON UPDATE no action;