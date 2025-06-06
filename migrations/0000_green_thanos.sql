CREATE TABLE "clients" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" varchar NOT NULL,
	"name" varchar NOT NULL,
	"description" text,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "csv_uploads" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" varchar NOT NULL,
	"client_id" integer NOT NULL,
	"file_name" varchar NOT NULL,
	"total_rows" integer NOT NULL,
	"processed_rows" integer DEFAULT 0 NOT NULL,
	"status" varchar DEFAULT 'processing' NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "prospects" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" varchar NOT NULL,
	"client_id" integer NOT NULL,
	"first_name" varchar NOT NULL,
	"last_name" varchar NOT NULL,
	"company" varchar NOT NULL,
	"title" varchar NOT NULL,
	"email" varchar NOT NULL,
	"linkedin_url" varchar,
	"status" varchar DEFAULT 'processing' NOT NULL,
	"research_results" jsonb,
	"webhook_payload" jsonb,
	"error_message" text,
	"sent_to_replyio_campaign_id" integer,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "replyio_accounts" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" varchar NOT NULL,
	"client_id" integer NOT NULL,
	"name" varchar NOT NULL,
	"api_key" varchar NOT NULL,
	"is_default" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "replyio_accounts_user_client_default_unique" UNIQUE("user_id","client_id","is_default")
);
--> statement-breakpoint
CREATE TABLE "replyio_campaigns" (
	"id" serial PRIMARY KEY NOT NULL,
	"account_id" integer NOT NULL,
	"campaign_id" integer NOT NULL,
	"campaign_name" varchar NOT NULL,
	"campaign_status" varchar,
	"is_default" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "replyio_campaigns_account_default_unique" UNIQUE("account_id","is_default"),
	CONSTRAINT "replyio_campaigns_account_campaign_unique" UNIQUE("account_id","campaign_id")
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"sid" varchar PRIMARY KEY NOT NULL,
	"sess" jsonb NOT NULL,
	"expire" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_settings" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" varchar NOT NULL,
	"client_id" integer NOT NULL,
	"reply_io_api_key" varchar,
	"reply_io_campaign_id" varchar,
	"reply_io_auto_send" boolean DEFAULT true,
	"webhook_url" varchar,
	"webhook_timeout" integer DEFAULT 300,
	"batch_size" integer DEFAULT 10,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "user_settings_user_client_unique" UNIQUE("user_id","client_id")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" varchar PRIMARY KEY NOT NULL,
	"email" varchar,
	"first_name" varchar,
	"last_name" varchar,
	"profile_image_url" varchar,
	"preferences" jsonb,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "clients" ADD CONSTRAINT "clients_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "csv_uploads" ADD CONSTRAINT "csv_uploads_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "csv_uploads" ADD CONSTRAINT "csv_uploads_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "prospects" ADD CONSTRAINT "prospects_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "prospects" ADD CONSTRAINT "prospects_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "replyio_accounts" ADD CONSTRAINT "replyio_accounts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "replyio_accounts" ADD CONSTRAINT "replyio_accounts_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "replyio_campaigns" ADD CONSTRAINT "replyio_campaigns_account_id_replyio_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."replyio_accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_settings" ADD CONSTRAINT "user_settings_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_settings" ADD CONSTRAINT "user_settings_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "clients_user_id_idx" ON "clients" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "csv_uploads_client_idx" ON "csv_uploads" USING btree ("client_id");--> statement-breakpoint
CREATE INDEX "prospects_user_client_idx" ON "prospects" USING btree ("user_id","client_id");--> statement-breakpoint
CREATE INDEX "prospects_client_idx" ON "prospects" USING btree ("client_id");--> statement-breakpoint
CREATE INDEX "replyio_accounts_user_id_idx" ON "replyio_accounts" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "replyio_accounts_client_idx" ON "replyio_accounts" USING btree ("client_id");--> statement-breakpoint
CREATE INDEX "replyio_campaigns_account_id_idx" ON "replyio_campaigns" USING btree ("account_id");--> statement-breakpoint
CREATE INDEX "IDX_session_expire" ON "sessions" USING btree ("expire");--> statement-breakpoint
CREATE INDEX "user_settings_client_idx" ON "user_settings" USING btree ("client_id");