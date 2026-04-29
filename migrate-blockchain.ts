import { getDb } from "../api/queries/connection";

async function migrate() {
  const db = getDb();
  console.log("Creating blockchain tables...");

  // Create blockchain_certs table
  await db.execute(`
    CREATE TABLE IF NOT EXISTS blockchain_certs (
      id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
      listing_id BIGINT UNSIGNED NOT NULL,
      user_id BIGINT UNSIGNED,
      certificate_hash VARCHAR(255) NOT NULL UNIQUE,
      contract_address VARCHAR(255),
      token_id VARCHAR(255),
      block_hash VARCHAR(255),
      block_number BIGINT,
      network VARCHAR(50) DEFAULT 'ethereum_sepolia',
      item_name VARCHAR(255) NOT NULL,
      item_description TEXT,
      metadata_uri TEXT,
      status ENUM('pending', 'minted', 'failed') DEFAULT 'pending' NOT NULL,
      certification_fee DECIMAL(10, 2) DEFAULT 0.002,
      created_at TIMESTAMP DEFAULT NOW() NOT NULL,
      updated_at TIMESTAMP DEFAULT NOW() NOT NULL
    )
  `);

  // Create crypto_payments table
  await db.execute(`
    CREATE TABLE IF NOT EXISTS crypto_payments (
      id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
      listing_id BIGINT UNSIGNED NOT NULL,
      buyer_address VARCHAR(255) NOT NULL,
      seller_address VARCHAR(255),
      amount DECIMAL(15, 6) NOT NULL,
      amount_usd DECIMAL(15, 2) NOT NULL,
      currency VARCHAR(20) DEFAULT 'ETH' NOT NULL,
      network VARCHAR(50) DEFAULT 'ethereum_sepolia',
      tx_hash VARCHAR(255) UNIQUE,
      block_hash VARCHAR(255),
      block_number BIGINT,
      status ENUM('pending', 'confirming', 'confirmed', 'failed') DEFAULT 'pending' NOT NULL,
      confirmations INT DEFAULT 0,
      metadata JSON,
      created_at TIMESTAMP DEFAULT NOW() NOT NULL,
      updated_at TIMESTAMP DEFAULT NOW() NOT NULL
    )
  `);

  // Add certification columns to listings
  try {
    await db.execute(`ALTER TABLE listings ADD COLUMN is_certified BOOLEAN DEFAULT FALSE`);
  } catch (e) { /* already exists */ }
  try {
    await db.execute(`ALTER TABLE listings ADD COLUMN token_contract_address VARCHAR(255)`);
  } catch (e) { /* already exists */ }
  try {
    await db.execute(`ALTER TABLE listings ADD COLUMN certification_id BIGINT UNSIGNED`);
  } catch (e) { /* already exists */ }

  console.log("Blockchain tables created successfully!");
}

migrate().catch(console.error);
