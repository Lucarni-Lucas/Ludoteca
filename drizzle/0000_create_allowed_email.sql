CREATE TABLE "allowed_email" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "allowed_email_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "allowed_email" ENABLE ROW LEVEL SECURITY;