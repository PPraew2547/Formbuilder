CREATE TABLE "form_routes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"form_id" uuid,
	"slug" text NOT NULL,
	"is_active" boolean,
	"created_at" timestamp,
	"updated_at" timestamp,
	CONSTRAINT "form_routes_slug_unique" UNIQUE("slug")
);
