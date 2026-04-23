CREATE TABLE "admins" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text,
	"email" text NOT NULL,
	"role" text,
	"is_active" boolean,
	"created_at" timestamp,
	"updated_at" timestamp,
	CONSTRAINT "admins_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "forms" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text,
	"slug" text NOT NULL,
	"status" text,
	"current_version" integer,
	"title" text,
	"description" text,
	"locale" text,
	"is_active" boolean,
	"created_by" uuid,
	"created_at" timestamp,
	"updated_at" timestamp,
	CONSTRAINT "forms_slug_unique" UNIQUE("slug")
);
