ALTER TABLE "form_routes" DROP CONSTRAINT "form_routes_slug_unique";--> statement-breakpoint
ALTER TABLE "form_routes" ADD COLUMN "site_id" uuid;--> statement-breakpoint
ALTER TABLE "form_routes" ADD COLUMN "match_type" text;--> statement-breakpoint
ALTER TABLE "form_routes" ADD COLUMN "url_pattern" text;--> statement-breakpoint
ALTER TABLE "form_routes" ADD COLUMN "priority" integer;--> statement-breakpoint
ALTER TABLE "form_routes" ADD COLUMN "start_at" timestamp;--> statement-breakpoint
ALTER TABLE "form_routes" ADD COLUMN "end_at" timestamp;--> statement-breakpoint
ALTER TABLE "form_routes" DROP COLUMN "slug";