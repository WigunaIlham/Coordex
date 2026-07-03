-- RAB module: rencana anggaran biaya.

CREATE TABLE "rabs" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "rabs_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "rabs_createdById_idx" ON "rabs"("createdById");

ALTER TABLE "rabs"
    ADD CONSTRAINT "rabs_createdById_fkey"
    FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "rab_categories" (
    "id" TEXT NOT NULL,
    "rabId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "rab_categories_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "rab_categories_rabId_order_idx" ON "rab_categories"("rabId", "order");

ALTER TABLE "rab_categories"
    ADD CONSTRAINT "rab_categories_rabId_fkey"
    FOREIGN KEY ("rabId") REFERENCES "rabs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "rab_items" (
    "id" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "volume" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "unit" TEXT NOT NULL,
    "unitPrice" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "notes" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "rab_items_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "rab_items_categoryId_order_idx" ON "rab_items"("categoryId", "order");

ALTER TABLE "rab_items"
    ADD CONSTRAINT "rab_items_categoryId_fkey"
    FOREIGN KEY ("categoryId") REFERENCES "rab_categories"("id") ON DELETE CASCADE ON UPDATE CASCADE;
