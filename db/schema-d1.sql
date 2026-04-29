-- D1 SQLite Schema for The Vault
-- Run with: npx wrangler d1 execute thevault-db --file=./db/schema-d1.sql

CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  unionId TEXT UNIQUE,
  oauth_provider TEXT,
  oauth_provider_id TEXT,
  name TEXT,
  email TEXT,
  avatar TEXT,
  password TEXT,
  role TEXT DEFAULT 'user' NOT NULL,
  createdAt INTEGER DEFAULT (unixepoch()) NOT NULL,
  updatedAt INTEGER DEFAULT (unixepoch()) NOT NULL,
  lastSignInAt INTEGER DEFAULT (unixepoch()) NOT NULL
);

CREATE TABLE IF NOT EXISTS categories (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  icon TEXT,
  description TEXT,
  listing_count INTEGER DEFAULT 0 NOT NULL,
  created_at INTEGER DEFAULT (unixepoch()) NOT NULL
);

CREATE TABLE IF NOT EXISTS listings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  description TEXT,
  category_id INTEGER NOT NULL,
  seller_id INTEGER,
  price TEXT NOT NULL,
  commission_rate TEXT DEFAULT '5.00' NOT NULL,
  condition TEXT DEFAULT 'very_good',
  status TEXT DEFAULT 'active' NOT NULL,
  badge TEXT DEFAULT 'none',
  images TEXT,
  features TEXT,
  appraisal_id INTEGER,
  is_buy_now INTEGER DEFAULT 1,
  is_consignment INTEGER DEFAULT 0,
  view_count INTEGER DEFAULT 0 NOT NULL,
  is_certified INTEGER DEFAULT 0,
  token_contract_address TEXT,
  certification_id INTEGER,
  created_at INTEGER DEFAULT (unixepoch()) NOT NULL,
  updated_at INTEGER DEFAULT (unixepoch()) NOT NULL
);

CREATE TABLE IF NOT EXISTS appraisals (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER,
  item_name TEXT NOT NULL,
  category TEXT NOT NULL,
  condition TEXT,
  description TEXT,
  image_url TEXT,
  estimated_value TEXT,
  value_range_low TEXT,
  value_range_high TEXT,
  confidence TEXT DEFAULT 'medium',
  market_analysis TEXT,
  comparable_sales TEXT,
  status TEXT DEFAULT 'pending' NOT NULL,
  commission_estimate TEXT,
  commission_rate TEXT,
  created_at INTEGER DEFAULT (unixepoch()) NOT NULL,
  updated_at INTEGER DEFAULT (unixepoch()) NOT NULL
);

CREATE TABLE IF NOT EXISTS cart_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER,
  session_id TEXT,
  listing_id INTEGER NOT NULL,
  quantity INTEGER DEFAULT 1 NOT NULL,
  offer_price TEXT,
  created_at INTEGER DEFAULT (unixepoch()) NOT NULL
);

CREATE TABLE IF NOT EXISTS stripe_sessions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  session_id TEXT NOT NULL UNIQUE,
  user_id INTEGER,
  listing_id INTEGER NOT NULL,
  amount TEXT NOT NULL,
  commission TEXT NOT NULL,
  status TEXT DEFAULT 'pending' NOT NULL,
  metadata TEXT,
  created_at INTEGER DEFAULT (unixepoch()) NOT NULL
);

CREATE TABLE IF NOT EXISTS ai_agent_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  agent_name TEXT NOT NULL,
  agent_type TEXT DEFAULT 'general' NOT NULL,
  listing_id INTEGER,
  status TEXT DEFAULT 'queued' NOT NULL,
  input TEXT,
  output TEXT,
  confidence TEXT,
  message TEXT,
  created_at INTEGER DEFAULT (unixepoch()) NOT NULL
);

CREATE TABLE IF NOT EXISTS blockchain_certs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  listing_id INTEGER NOT NULL,
  user_id INTEGER,
  certificate_hash TEXT NOT NULL UNIQUE,
  contract_address TEXT,
  token_id TEXT,
  block_hash TEXT,
  block_number INTEGER,
  network TEXT DEFAULT 'ethereum_sepolia',
  item_name TEXT NOT NULL,
  item_description TEXT,
  metadata_uri TEXT,
  status TEXT DEFAULT 'pending' NOT NULL,
  certification_fee TEXT DEFAULT '0.002',
  created_at INTEGER DEFAULT (unixepoch()) NOT NULL,
  updated_at INTEGER DEFAULT (unixepoch()) NOT NULL
);

CREATE TABLE IF NOT EXISTS crypto_payments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  listing_id INTEGER NOT NULL,
  buyer_address TEXT NOT NULL,
  seller_address TEXT,
  amount TEXT NOT NULL,
  amount_usd TEXT NOT NULL,
  currency TEXT DEFAULT 'ETH' NOT NULL,
  network TEXT DEFAULT 'ethereum_sepolia',
  tx_hash TEXT UNIQUE,
  block_hash TEXT,
  block_number INTEGER,
  status TEXT DEFAULT 'pending' NOT NULL,
  confirmations INTEGER DEFAULT 0,
  metadata TEXT,
  created_at INTEGER DEFAULT (unixepoch()) NOT NULL,
  updated_at INTEGER DEFAULT (unixepoch()) NOT NULL
);

CREATE TABLE IF NOT EXISTS commission_tiers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  min_amount TEXT NOT NULL,
  max_amount TEXT,
  rate TEXT NOT NULL,
  label TEXT NOT NULL,
  description TEXT,
  is_active INTEGER DEFAULT 1 NOT NULL,
  created_at INTEGER DEFAULT (unixepoch()) NOT NULL
);

CREATE TABLE IF NOT EXISTS coinbase_charges (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  listing_id INTEGER NOT NULL,
  user_id INTEGER,
  coinbase_charge_id TEXT NOT NULL UNIQUE,
  coinbase_code TEXT,
  coinbase_hosted_url TEXT,
  amount TEXT NOT NULL,
  currency TEXT DEFAULT 'USD' NOT NULL,
  status TEXT DEFAULT 'pending' NOT NULL,
  metadata TEXT,
  created_at INTEGER DEFAULT (unixepoch()) NOT NULL,
  updated_at INTEGER DEFAULT (unixepoch()) NOT NULL
);

CREATE TABLE IF NOT EXISTS outreach_campaigns (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  listing_id INTEGER,
  application_id INTEGER,
  user_id INTEGER,
  item_name TEXT NOT NULL,
  category TEXT NOT NULL,
  target_professionals INTEGER DEFAULT 5 NOT NULL,
  found_leads INTEGER DEFAULT 0 NOT NULL,
  outreach_count INTEGER DEFAULT 0 NOT NULL,
  status TEXT DEFAULT 'running' NOT NULL,
  ai_strategy TEXT,
  last_run_at INTEGER,
  completed_at INTEGER,
  created_at INTEGER DEFAULT (unixepoch()) NOT NULL
);

CREATE TABLE IF NOT EXISTS outreach_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  campaign_id INTEGER NOT NULL,
  expert_id INTEGER,
  professional_name TEXT,
  professional_title TEXT,
  institution TEXT,
  email TEXT,
  specialty TEXT,
  outreach_method TEXT DEFAULT 'ai_search',
  message TEXT,
  response TEXT,
  status TEXT DEFAULT 'pending' NOT NULL,
  confidence INTEGER DEFAULT 50,
  attempt_number INTEGER DEFAULT 1,
  created_at INTEGER DEFAULT (unixepoch()) NOT NULL
);

CREATE TABLE IF NOT EXISTS professional_leads (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  campaign_id INTEGER NOT NULL,
  listing_id INTEGER,
  application_id INTEGER,
  user_id INTEGER,
  outreach_log_id INTEGER,
  expert_id INTEGER,
  name TEXT NOT NULL,
  title TEXT,
  institution TEXT,
  email TEXT,
  specialty TEXT,
  interest_level TEXT DEFAULT 'interested',
  estimated_offer TEXT,
  notes TEXT,
  contact_message TEXT,
  is_delivered INTEGER DEFAULT 0,
  delivered_at INTEGER,
  status TEXT DEFAULT 'active' NOT NULL,
  created_at INTEGER DEFAULT (unixepoch()) NOT NULL
);

CREATE TABLE IF NOT EXISTS expert_profiles (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  title TEXT NOT NULL,
  email TEXT,
  institution TEXT,
  location TEXT,
  specialties TEXT,
  credentials TEXT,
  years_experience INTEGER DEFAULT 0,
  review_count INTEGER DEFAULT 0,
  rating TEXT DEFAULT '5.0',
  avatar TEXT,
  is_active INTEGER DEFAULT 1 NOT NULL,
  created_at INTEGER DEFAULT (unixepoch()) NOT NULL
);

CREATE TABLE IF NOT EXISTS expert_applications (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER,
  item_name TEXT NOT NULL,
  category TEXT NOT NULL,
  condition TEXT,
  description TEXT,
  provenance TEXT,
  dimensions TEXT,
  materials TEXT,
  markings TEXT,
  image_urls TEXT,
  estimated_value TEXT,
  status TEXT DEFAULT 'submitted' NOT NULL,
  assigned_expert_ids TEXT,
  review_fee TEXT DEFAULT '49.99',
  priority TEXT DEFAULT 'standard',
  notes TEXT,
  created_at INTEGER DEFAULT (unixepoch()) NOT NULL,
  updated_at INTEGER DEFAULT (unixepoch()) NOT NULL
);

CREATE TABLE IF NOT EXISTS expert_reviews (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  application_id INTEGER NOT NULL,
  expert_id INTEGER NOT NULL,
  authenticity_score INTEGER NOT NULL,
  value_score INTEGER NOT NULL,
  condition_score INTEGER NOT NULL,
  overall_score TEXT NOT NULL,
  estimated_value TEXT,
  value_range_low TEXT,
  value_range_high TEXT,
  authenticity_verdict TEXT DEFAULT 'uncertain',
  condition_notes TEXT,
  authenticity_notes TEXT,
  value_notes TEXT,
  methodology TEXT,
  comparable_sales TEXT,
  is_published INTEGER DEFAULT 0,
  created_at INTEGER DEFAULT (unixepoch()) NOT NULL
);

CREATE TABLE IF NOT EXISTS expert_consensus (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  application_id INTEGER NOT NULL UNIQUE,
  consensus_authenticity TEXT NOT NULL,
  consensus_value TEXT NOT NULL,
  consensus_condition TEXT NOT NULL,
  consensus_overall TEXT NOT NULL,
  consensus_verdict TEXT DEFAULT 'uncertain',
  estimated_value_low TEXT,
  estimated_value_high TEXT,
  expert_count INTEGER DEFAULT 0,
  summary_report TEXT,
  certificate_url TEXT,
  created_at INTEGER DEFAULT (unixepoch()) NOT NULL
);

CREATE TABLE IF NOT EXISTS reviews (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  listing_id INTEGER NOT NULL,
  user_id INTEGER,
  user_name TEXT NOT NULL,
  user_avatar TEXT,
  rating INTEGER NOT NULL,
  title TEXT,
  comment TEXT,
  is_verified_purchase INTEGER DEFAULT 0,
  helpful_count INTEGER DEFAULT 0,
  created_at INTEGER DEFAULT (unixepoch()) NOT NULL
);

CREATE TABLE IF NOT EXISTS wishlist_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER,
  listing_id INTEGER NOT NULL,
  session_id TEXT,
  created_at INTEGER DEFAULT (unixepoch()) NOT NULL
);

CREATE TABLE IF NOT EXISTS orders (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER,
  listing_id INTEGER NOT NULL,
  listing_title TEXT NOT NULL,
  listing_image TEXT,
  amount TEXT NOT NULL,
  commission TEXT DEFAULT '0.00',
  payment_method TEXT DEFAULT 'other',
  payment_status TEXT DEFAULT 'pending',
  order_status TEXT DEFAULT 'pending',
  shipping_address TEXT,
  tracking_number TEXT,
  notes TEXT,
  created_at INTEGER DEFAULT (unixepoch()) NOT NULL,
  updated_at INTEGER DEFAULT (unixepoch()) NOT NULL
);

CREATE TABLE IF NOT EXISTS newsletter_subscribers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT NOT NULL UNIQUE,
  is_subscribed INTEGER DEFAULT 1,
  created_at INTEGER DEFAULT (unixepoch()) NOT NULL
);

CREATE TABLE IF NOT EXISTS recently_viewed (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER,
  session_id TEXT,
  listing_id INTEGER NOT NULL,
  viewed_at INTEGER DEFAULT (unixepoch()) NOT NULL
);

-- AI Social Media Buyer Finding System

CREATE TABLE IF NOT EXISTS listing_fees (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  listing_id INTEGER,
  stripe_session_id TEXT,
  amount TEXT DEFAULT '20.00' NOT NULL,
  status TEXT DEFAULT 'pending' NOT NULL,
  paid_at INTEGER,
  created_at INTEGER DEFAULT (unixepoch()) NOT NULL
);

CREATE TABLE IF NOT EXISTS social_media_searches (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  listing_id INTEGER NOT NULL,
  user_id INTEGER,
  item_name TEXT NOT NULL,
  category TEXT NOT NULL,
  platforms_searched TEXT,
  search_query TEXT,
  status TEXT DEFAULT 'pending' NOT NULL,
  total_mentions_found INTEGER DEFAULT 0,
  leads_with_contact INTEGER DEFAULT 0,
  ai_summary TEXT,
  completed_at INTEGER,
  created_at INTEGER DEFAULT (unixepoch()) NOT NULL
);

CREATE TABLE IF NOT EXISTS social_media_mentions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  search_id INTEGER NOT NULL,
  listing_id INTEGER NOT NULL,
  platform TEXT NOT NULL,
  post_url TEXT,
  post_content TEXT,
  author_username TEXT,
  author_display_name TEXT,
  author_profile_url TEXT,
  author_bio TEXT,
  public_email TEXT,
  public_website TEXT,
  public_location TEXT,
  followers_count INTEGER,
  post_date INTEGER,
  engagement_score INTEGER DEFAULT 0,
  relevance_score INTEGER DEFAULT 50,
  ai_notes TEXT,
  is_contacted INTEGER DEFAULT 0,
  contact_method TEXT,
  status TEXT DEFAULT 'new' NOT NULL,
  created_at INTEGER DEFAULT (unixepoch()) NOT NULL
);

CREATE TABLE IF NOT EXISTS shipping_quotes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  listing_id INTEGER NOT NULL,
  seller_id INTEGER,
  buyer_id INTEGER,
  carrier TEXT NOT NULL,
  service_level TEXT,
  estimated_cost TEXT,
  estimated_days INTEGER,
  origin_zip TEXT,
  destination_zip TEXT,
  package_weight TEXT,
  package_dimensions TEXT,
  insurance_amount TEXT,
  is_insured INTEGER DEFAULT 0,
  quote_data TEXT,
  expires_at INTEGER,
  created_at INTEGER DEFAULT (unixepoch()) NOT NULL
);

CREATE TABLE IF NOT EXISTS sale_transactions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  listing_id INTEGER NOT NULL,
  seller_id INTEGER NOT NULL,
  buyer_id INTEGER,
  buyer_email TEXT,
  buyer_name TEXT,
  sale_price TEXT NOT NULL,
  commission_rate TEXT DEFAULT '5.00' NOT NULL,
  commission_amount TEXT NOT NULL,
  seller_payout TEXT NOT NULL,
  stripe_payment_intent_id TEXT,
  stripe_transfer_id TEXT,
  status TEXT DEFAULT 'pending' NOT NULL,
  shipping_carrier TEXT,
  shipping_tracking_number TEXT,
  shipping_quote_id INTEGER,
  shipped_at INTEGER,
  delivered_at INTEGER,
  completed_at INTEGER,
  notes TEXT,
  created_at INTEGER DEFAULT (unixepoch()) NOT NULL
);

CREATE TABLE IF NOT EXISTS seller_payouts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  seller_id INTEGER NOT NULL,
  sale_transaction_id INTEGER NOT NULL,
  amount TEXT NOT NULL,
  stripe_payout_id TEXT,
  status TEXT DEFAULT 'pending' NOT NULL,
  method TEXT DEFAULT 'stripe_transfer',
  paid_at INTEGER,
  created_at INTEGER DEFAULT (unixepoch()) NOT NULL
);

CREATE TABLE IF NOT EXISTS email_notifications (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER,
  recipient_email TEXT NOT NULL,
  type TEXT NOT NULL,
  subject TEXT NOT NULL,
  body_html TEXT,
  body_text TEXT,
  metadata TEXT,
  status TEXT DEFAULT 'pending' NOT NULL,
  sent_at INTEGER,
  created_at INTEGER DEFAULT (unixepoch()) NOT NULL
);
