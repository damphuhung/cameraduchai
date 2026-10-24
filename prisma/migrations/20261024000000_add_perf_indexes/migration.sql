-- Index cho các cột khoá ngoại / cột lọc hay dùng (Postgres không tự tạo index cho khoá ngoại)
CREATE INDEX IF NOT EXISTS "Sale_createdAt_idx" ON "Sale"("createdAt");
CREATE INDEX IF NOT EXISTS "Sale_customerId_idx" ON "Sale"("customerId");
CREATE INDEX IF NOT EXISTS "Sale_userId_idx" ON "Sale"("userId");

CREATE INDEX IF NOT EXISTS "SaleItem_saleId_idx" ON "SaleItem"("saleId");
CREATE INDEX IF NOT EXISTS "SaleItem_productId_idx" ON "SaleItem"("productId");

CREATE INDEX IF NOT EXISTS "ProductSerial_saleId_idx" ON "ProductSerial"("saleId");
CREATE INDEX IF NOT EXISTS "ProductSerial_saleItemId_idx" ON "ProductSerial"("saleItemId");
CREATE INDEX IF NOT EXISTS "ProductSerial_purchaseItemId_idx" ON "ProductSerial"("purchaseItemId");

CREATE INDEX IF NOT EXISTS "Warranty_saleId_idx" ON "Warranty"("saleId");
CREATE INDEX IF NOT EXISTS "Warranty_customerId_idx" ON "Warranty"("customerId");

CREATE INDEX IF NOT EXISTS "PurchaseOrder_supplierId_idx" ON "PurchaseOrder"("supplierId");
CREATE INDEX IF NOT EXISTS "PurchaseOrder_createdAt_idx" ON "PurchaseOrder"("createdAt");

CREATE INDEX IF NOT EXISTS "PurchaseItem_purchaseOrderId_idx" ON "PurchaseItem"("purchaseOrderId");
CREATE INDEX IF NOT EXISTS "PurchaseItem_productId_idx" ON "PurchaseItem"("productId");

CREATE INDEX IF NOT EXISTS "PurchasePayment_purchaseOrderId_idx" ON "PurchasePayment"("purchaseOrderId");
