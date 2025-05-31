-- CreateTable
CREATE TABLE "contest_store_balances" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "contest_id" TEXT NOT NULL,
    "store_id" TEXT NOT NULL,
    "total_sales" INTEGER NOT NULL DEFAULT 0,
    "order_count" INTEGER NOT NULL DEFAULT 0,
    "last_updated_at" DATETIME NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "contest_store_balances_contest_id_fkey" FOREIGN KEY ("contest_id") REFERENCES "contests" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "contest_store_balances_store_id_fkey" FOREIGN KEY ("store_id") REFERENCES "shopify_stores" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "webhook_subscriptions" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "contest_id" TEXT NOT NULL,
    "store_id" TEXT NOT NULL,
    "webhook_id" TEXT NOT NULL,
    "topic" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "webhook_subscriptions_contest_id_fkey" FOREIGN KEY ("contest_id") REFERENCES "contests" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "webhook_subscriptions_store_id_fkey" FOREIGN KEY ("store_id") REFERENCES "shopify_stores" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "order_events" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "store_id" TEXT NOT NULL,
    "order_id" TEXT NOT NULL,
    "event_type" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "order_number" TEXT,
    "processed_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "webhook_data" TEXT,
    CONSTRAINT "order_events_store_id_fkey" FOREIGN KEY ("store_id") REFERENCES "shopify_stores" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "contest_store_balances_contest_id_store_id_key" ON "contest_store_balances"("contest_id", "store_id");

-- CreateIndex
CREATE UNIQUE INDEX "webhook_subscriptions_contest_id_store_id_topic_key" ON "webhook_subscriptions"("contest_id", "store_id", "topic");

-- CreateIndex
CREATE INDEX "order_events_store_id_processed_at_idx" ON "order_events"("store_id", "processed_at");

-- CreateIndex
CREATE UNIQUE INDEX "order_events_store_id_order_id_event_type_key" ON "order_events"("store_id", "order_id", "event_type");
