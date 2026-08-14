CREATE TYPE "public"."payment_status" AS ENUM('settled', 'disputed');--> statement-breakpoint
CREATE TYPE "public"."refund_status" AS ENUM('pending_approval', 'approved', 'issued', 'rejected');--> statement-breakpoint
CREATE TABLE "payments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"customer_ref" text NOT NULL,
	"amount_cents" integer NOT NULL,
	"status" "payment_status" DEFAULT 'settled' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "refunds" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"payment_id" uuid NOT NULL,
	"amount_cents" integer NOT NULL,
	"reason" text NOT NULL,
	"status" "refund_status" DEFAULT 'pending_approval' NOT NULL,
	"requested_by" text NOT NULL,
	"approved_by" text,
	"provider_ref" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "refunds" ADD CONSTRAINT "refunds_payment_id_payments_id_fk" FOREIGN KEY ("payment_id") REFERENCES "public"."payments"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "refunds_created_at_idx" ON "refunds" USING btree ("created_at" DESC NULLS LAST);