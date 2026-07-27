-- Run once on live MySQL if quotation / purchase / delivery challan creation returns 500.
-- The app also applies these automatically on first create after deploy.

-- 1) Per-organization document numbers (fixes multi-tenant duplicate key errors)
ALTER TABLE quotations DROP INDEX quotation_no;
ALTER TABLE quotations ADD UNIQUE KEY uq_quotations_org_quotation_no (organization_id, quotation_no);

ALTER TABLE purchases DROP INDEX purchase_no;
ALTER TABLE purchases ADD UNIQUE KEY uq_purchases_org_purchase_no (organization_id, purchase_no);

ALTER TABLE delivery_challans DROP INDEX challan_no;
ALTER TABLE delivery_challans ADD UNIQUE KEY uq_delivery_challans_org_challan_no (organization_id, challan_no);

-- 2) Columns required by create APIs (skip lines that already exist)
ALTER TABLE quotations ADD COLUMN round_off DECIMAL(10,2) NOT NULL DEFAULT 0 AFTER tax_amount;
ALTER TABLE quotations ADD COLUMN gst_type VARCHAR(20) NOT NULL DEFAULT 'CGST_SGST' AFTER valid_until;
ALTER TABLE quotations ADD COLUMN party_details JSON NULL AFTER terms;

ALTER TABLE purchases ADD COLUMN round_off DECIMAL(10,2) NOT NULL DEFAULT 0 AFTER tax_amount;
ALTER TABLE purchases ADD COLUMN terms TEXT NULL AFTER notes;

ALTER TABLE delivery_challans ADD COLUMN completion_date DATETIME NULL AFTER date;
ALTER TABLE delivery_challans ADD COLUMN party_details JSON NULL AFTER notes;
ALTER TABLE delivery_challans ADD COLUMN terms TEXT NULL AFTER party_details;
ALTER TABLE delivery_challans ADD COLUMN include_pricing TINYINT(1) NOT NULL DEFAULT 0 AFTER terms;
ALTER TABLE challan_items ADD COLUMN discount DECIMAL(5,2) NOT NULL DEFAULT 0 AFTER rate;

-- 3) business_settings prefix columns (legacy quot_prefix / po_prefix → new names)
ALTER TABLE business_settings CHANGE COLUMN quot_prefix quotation_prefix VARCHAR(10) NOT NULL DEFAULT 'QT';
ALTER TABLE business_settings CHANGE COLUMN po_prefix purchase_order_prefix VARCHAR(10) NOT NULL DEFAULT 'PO';
