-- Proforma Invoice Module Migration
-- Run this script in MySQL Workbench or let the application auto-ensure the schema.

CREATE TABLE IF NOT EXISTS proformas (
  id VARCHAR(36) NOT NULL PRIMARY KEY,
  organization_id VARCHAR(36) NULL,
  proforma_no VARCHAR(50) NOT NULL,
  customer_id VARCHAR(36) NOT NULL,
  date DATETIME NOT NULL,
  valid_until DATETIME NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'DRAFT',
  gst_type VARCHAR(20) NOT NULL DEFAULT 'CGST_SGST',
  subtotal DECIMAL(10,2) NOT NULL,
  discount_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
  tax_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
  round_off DECIMAL(10,2) NOT NULL DEFAULT 0,
  total_amount DECIMAL(10,2) NOT NULL,
  notes TEXT NULL,
  terms TEXT NULL,
  party_details JSON NULL,
  converted_to_id VARCHAR(36) NULL,
  created_by_id VARCHAR(36) NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (customer_id) REFERENCES customers(id),
  UNIQUE KEY uq_proformas_org_proforma_no (organization_id, proforma_no)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS proforma_items (
  id VARCHAR(36) NOT NULL PRIMARY KEY,
  proforma_id VARCHAR(36) NOT NULL,
  product_id VARCHAR(36) NOT NULL,
  description VARCHAR(255) NULL,
  quantity DECIMAL(10,3) NOT NULL,
  rate DECIMAL(10,2) NOT NULL,
  discount DECIMAL(5,2) NOT NULL DEFAULT 0,
  gst_rate DECIMAL(5,2) NOT NULL DEFAULT 0,
  gst_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
  amount DECIMAL(10,2) NOT NULL,
  sort_order INT NOT NULL DEFAULT 0,
  FOREIGN KEY (proforma_id) REFERENCES proformas(id) ON DELETE CASCADE,
  FOREIGN KEY (product_id) REFERENCES products(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Add Proforma prefix and terms to business_settings
ALTER TABLE business_settings 
  ADD COLUMN proforma_prefix VARCHAR(10) NOT NULL DEFAULT 'PI' AFTER quotation_prefix,
  ADD COLUMN proforma_terms TEXT NULL AFTER quotation_terms;
