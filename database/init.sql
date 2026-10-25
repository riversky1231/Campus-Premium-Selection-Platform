-- Campus Market MySQL 8 bootstrap. Runs only on a new data volume.
-- The official image runs this file with the mysql client in a C locale, which
-- defaults to latin1; without this the seeded Chinese text is stored double-encoded.
SET NAMES utf8mb4;
CREATE DATABASE IF NOT EXISTS campus_product CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE campus_product;
CREATE TABLE IF NOT EXISTS category (id BIGINT AUTO_INCREMENT PRIMARY KEY, name VARCHAR(40) NOT NULL UNIQUE);
CREATE TABLE IF NOT EXISTS product (id BIGINT AUTO_INCREMENT PRIMARY KEY, category_id BIGINT NOT NULL, name VARCHAR(100) NOT NULL, description VARCHAR(1000) NOT NULL, price DECIMAL(10,2) NOT NULL, stock INT NOT NULL, on_sale BOOLEAN NOT NULL, FOREIGN KEY(category_id) REFERENCES category(id), CHECK(price>0), CHECK(stock>=0));
CREATE TABLE IF NOT EXISTS stock_operation (request_id VARCHAR(80) PRIMARY KEY, product_id BIGINT NOT NULL, quantity INT NOT NULL, state VARCHAR(16) NOT NULL, FOREIGN KEY(product_id) REFERENCES product(id), CHECK(quantity>0));

CREATE TABLE IF NOT EXISTS undo_log (
 branch_id BIGINT NOT NULL,
 xid VARCHAR(128) NOT NULL,
 context VARCHAR(128) NOT NULL,
 rollback_info LONGBLOB NOT NULL,
 log_status INT NOT NULL,
 log_created DATETIME(6) NOT NULL,
 log_modified DATETIME(6) NOT NULL,
 UNIQUE KEY ux_undo_log (xid,branch_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

INSERT INTO category(name) VALUES ('课间零食'),('元气饮品'),('宿舍日用');
INSERT INTO product(category_id,name,description,price,stock,on_sale) VALUES (1,'海盐苏打饼干','课间补充能量，独立小包装。',8.90,80,true),(2,'青柠气泡水','清爽青柠风味，330ml。',4.50,120,true),(3,'原生木浆纸巾','柔韧亲肤，三包装。',9.90,60,true),(1,'每日坚果','混合果仁，25g便携装。',6.80,100,true);

GRANT SELECT,INSERT,UPDATE,DELETE ON campus_product.* TO 'campus'@'%';
CREATE DATABASE IF NOT EXISTS campus_user CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE campus_user;
CREATE TABLE IF NOT EXISTS app_user (id BIGINT AUTO_INCREMENT PRIMARY KEY, username VARCHAR(64) NOT NULL UNIQUE, password_hash VARCHAR(100) NOT NULL, nickname VARCHAR(60) NOT NULL, role VARCHAR(16) NOT NULL, balance DECIMAL(12,2) NOT NULL DEFAULT 0, enabled BOOLEAN NOT NULL DEFAULT TRUE, openid VARCHAR(128) UNIQUE, CHECK(balance>=0));
CREATE TABLE IF NOT EXISTS user_session (token_hash VARCHAR(64) PRIMARY KEY, user_id BIGINT NOT NULL, expires_at TIMESTAMP NOT NULL, FOREIGN KEY(user_id) REFERENCES app_user(id));
CREATE TABLE IF NOT EXISTS user_address (id BIGINT AUTO_INCREMENT PRIMARY KEY, user_id BIGINT NOT NULL, recipient VARCHAR(40) NOT NULL, phone VARCHAR(20) NOT NULL, detail VARCHAR(250) NOT NULL, FOREIGN KEY(user_id) REFERENCES app_user(id));
CREATE TABLE IF NOT EXISTS wallet_operation (request_id VARCHAR(80) NOT NULL, kind VARCHAR(16) NOT NULL, user_id BIGINT NOT NULL, amount DECIMAL(12,2) NOT NULL, applied BOOLEAN NOT NULL, created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP, PRIMARY KEY(request_id,kind), FOREIGN KEY(user_id) REFERENCES app_user(id), CHECK(amount>0));

CREATE TABLE IF NOT EXISTS undo_log (
 branch_id BIGINT NOT NULL,
 xid VARCHAR(128) NOT NULL,
 context VARCHAR(128) NOT NULL,
 rollback_info LONGBLOB NOT NULL,
 log_status INT NOT NULL,
 log_created DATETIME(6) NOT NULL,
 log_modified DATETIME(6) NOT NULL,
 UNIQUE KEY ux_undo_log (xid,branch_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

GRANT SELECT,INSERT,UPDATE,DELETE ON campus_user.* TO 'campus'@'%';
CREATE DATABASE IF NOT EXISTS campus_order CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE campus_order;
CREATE TABLE IF NOT EXISTS market_order (id VARCHAR(36) PRIMARY KEY, user_id BIGINT NOT NULL, request_id VARCHAR(80) NOT NULL, fingerprint VARCHAR(64) NOT NULL, status VARCHAR(16) NOT NULL, amount DECIMAL(12,2) NOT NULL, recipient VARCHAR(40) NOT NULL, phone VARCHAR(20) NOT NULL, address_detail VARCHAR(250) NOT NULL, pickup_code VARCHAR(24) UNIQUE, created_at TIMESTAMP NOT NULL, expires_at TIMESTAMP NOT NULL, paid_at TIMESTAMP NULL, completed_at TIMESTAMP NULL, UNIQUE(user_id,request_id));
CREATE TABLE IF NOT EXISTS order_item (order_id VARCHAR(36) NOT NULL, product_id BIGINT NOT NULL, product_name VARCHAR(100) NOT NULL, price DECIMAL(10,2) NOT NULL, quantity INT NOT NULL, PRIMARY KEY(order_id,product_id), FOREIGN KEY(order_id) REFERENCES market_order(id), CHECK(quantity>0));
CREATE TABLE IF NOT EXISTS event_outbox (id VARCHAR(36) PRIMARY KEY, order_id VARCHAR(36) NOT NULL, event_type VARCHAR(24) NOT NULL, payload VARCHAR(4000) NOT NULL, created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP, sent BOOLEAN NOT NULL DEFAULT FALSE, attempts INT NOT NULL DEFAULT 0);
CREATE TABLE IF NOT EXISTS user_notice (event_id VARCHAR(36) PRIMARY KEY, user_id BIGINT NOT NULL, order_id VARCHAR(36) NOT NULL, message VARCHAR(250) NOT NULL, read_flag BOOLEAN NOT NULL DEFAULT FALSE, created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP);

CREATE TABLE IF NOT EXISTS undo_log (
 branch_id BIGINT NOT NULL,
 xid VARCHAR(128) NOT NULL,
 context VARCHAR(128) NOT NULL,
 rollback_info LONGBLOB NOT NULL,
 log_status INT NOT NULL,
 log_created DATETIME(6) NOT NULL,
 log_modified DATETIME(6) NOT NULL,
 UNIQUE KEY ux_undo_log (xid,branch_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

GRANT SELECT,INSERT,UPDATE,DELETE ON campus_order.* TO 'campus'@'%';
USE campus_user;
CREATE INDEX idx_session_expiry ON user_session(expires_at);
CREATE INDEX idx_session_user ON user_session(user_id);
CREATE INDEX idx_address_user ON user_address(user_id);
CREATE INDEX idx_ledger_user ON wallet_operation(user_id,created_at);
USE campus_order;
CREATE INDEX idx_order_expiry ON market_order(status,expires_at);
CREATE INDEX idx_order_user ON market_order(user_id,created_at);
CREATE INDEX idx_outbox_pending ON event_outbox(sent,created_at);
CREATE INDEX idx_notice_user ON user_notice(user_id,created_at);
