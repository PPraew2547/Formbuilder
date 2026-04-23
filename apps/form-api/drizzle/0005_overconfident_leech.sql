CREATE TABLE "form_versions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"form_id" uuid,
	"version" integer,
	"schema_json" jsonb,
	"is_published" boolean,
	"created_at" timestamp
);
