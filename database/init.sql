-- Campus Market MySQL 8 bootstrap. Runs only on a new data volume.
-- The official image runs this file with the mysql client in a C locale, which
-- defaults to latin1; without this the seeded Chinese text is stored double-encoded.
SET NAMES utf8mb4;
CREATE DATABASE IF NOT EXISTS campus_product CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE campus_product;
CREATE TABLE IF NOT EXISTS category (id BIGINT AUTO_INCREMENT PRIMARY KEY, name VARCHAR(40) NOT NULL UNIQUE);
CREATE TABLE IF NOT EXISTS product (id BIGINT AUTO_INCREMENT PRIMARY KEY, category_id BIGINT NOT NULL, name VARCHAR(100) NOT NULL, description VARCHAR(1000) NOT NULL, image_url VARCHAR(1000), price DECIMAL(10,2) NOT NULL, stock INT NOT NULL, on_sale BOOLEAN NOT NULL, FOREIGN KEY(category_id) REFERENCES category(id), CHECK(price>0), CHECK(stock>=0));
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

INSERT INTO category(name) VALUES ('课间零食'),('元气饮品'),('宿舍日用'),('方便速食'),('学习文具'),('清洁洗护');
INSERT INTO product(category_id,name,description,image_url,price,stock,on_sale)
SELECT c.id,'海盐苏打饼干','课间补充能量，独立小包装。','https://images.pexels.com/photos/38127820/pexels-photo-38127820/free-photo-of-assortment-of-snacks-on-a-shop-shelf.jpeg?auto=compress&dpr=1&h=750&w=1260',8.90,80,true FROM category c WHERE c.name='课间零食';
INSERT INTO product(category_id,name,description,image_url,price,stock,on_sale)
SELECT c.id,'青柠气泡水','清爽气泡口感，冰镇后饮用风味更佳。','https://images.pexels.com/photos/11560362/pexels-photo-11560362.jpeg?cs=srgb&dl=pexels-markus-winkler-1430818-11560362.jpg&fm=jpg',4.50,120,true FROM category c WHERE c.name='元气饮品';
INSERT INTO product(category_id,name,description,image_url,price,stock,on_sale)
SELECT c.id,'原生木浆纸巾','柔韧亲肤，三包装。','https://images.pexels.com/photos/4107959/pexels-photo-4107959.jpeg?auto=compress&dpr=1&h=750&w=1260',9.90,60,true FROM category c WHERE c.name='宿舍日用';
INSERT INTO product(category_id,name,description,image_url,price,stock,on_sale)
SELECT c.id,'每日坚果','混合果仁，25g便携装。','https://images.pexels.com/photos/38127820/pexels-photo-38127820/free-photo-of-assortment-of-snacks-on-a-shop-shelf.jpeg?auto=compress&dpr=1&h=750&w=1260',6.80,100,true FROM category c WHERE c.name='课间零食';
INSERT INTO product(category_id,name,description,image_url,price,stock,on_sale)
SELECT c.id,'原味薯片分享装','酥脆薯片，宿舍分享装。','https://images.pexels.com/photos/32802526/pexels-photo-32802526/free-photo-of-close-up-of-bowl-of-potato-chips-on-wicker-surface.jpeg?auto=compress&dpr=1&h=750&w=1260',5.90,80,true FROM category c WHERE c.name='课间零食';
INSERT INTO product(category_id,name,description,image_url,price,stock,on_sale)
SELECT c.id,'巧克力威化饼','轻脆威化夹心，下午茶小点心。','https://images.pexels.com/photos/38127820/pexels-photo-38127820/free-photo-of-assortment-of-snacks-on-a-shop-shelf.jpeg?auto=compress&dpr=1&h=750&w=1260',4.50,90,true FROM category c WHERE c.name='课间零食';
INSERT INTO product(category_id,name,description,image_url,price,stock,on_sale)
SELECT c.id,'鲜榨风味橙汁','橙香清爽，冷藏后口感更佳。','https://images.pexels.com/photos/4443511/pexels-photo-4443511.jpeg?auto=compress&dpr=1&h=750&w=1260',8.90,60,true FROM category c WHERE c.name='元气饮品';
INSERT INTO product(category_id,name,description,image_url,price,stock,on_sale)
SELECT c.id,'便携饮用水 550ml','日常补水，随身携带。','https://images.pexels.com/photos/11560362/pexels-photo-11560362.jpeg?cs=srgb&dl=pexels-markus-winkler-1430818-11560362.jpg&fm=jpg',2.00,180,true FROM category c WHERE c.name='元气饮品';
INSERT INTO product(category_id,name,description,image_url,price,stock,on_sale)
SELECT c.id,'香辣方便面','香辣汤底，宿舍宵夜快速补给。','https://images.pexels.com/photos/33312313/pexels-photo-33312313/free-photo-of-delicious-bowl-of-instant-ramen-noodles-on-dark-table.jpeg?auto=compress&dpr=1&h=750&w=1260',5.90,100,true FROM category c WHERE c.name='方便速食';
INSERT INTO product(category_id,name,description,image_url,price,stock,on_sale)
SELECT c.id,'香菇鸡汤杯面','独立杯装，冲泡即食。','https://images.pexels.com/photos/13796733/pexels-photo-13796733.jpeg?auto=compress&dpr=1&h=750&w=1260',7.50,70,true FROM category c WHERE c.name='方便速食';
INSERT INTO product(category_id,name,description,image_url,price,stock,on_sale)
SELECT c.id,'黑色中性笔','书写顺滑，适合课堂笔记。','https://images.pexels.com/photos/7657385/pexels-photo-7657385.jpeg?auto=compress&dpr=1&h=750&w=1260',2.50,120,true FROM category c WHERE c.name='学习文具';
INSERT INTO product(category_id,name,description,image_url,price,stock,on_sale)
SELECT c.id,'A5 横线笔记本','轻便好携带，适合课堂记录。','https://images.pexels.com/photos/8250882/pexels-photo-8250882.jpeg?auto=compress&dpr=1&h=750&w=1260',9.90,50,true FROM category c WHERE c.name='学习文具';
INSERT INTO product(category_id,name,description,image_url,price,stock,on_sale)
SELECT c.id,'清爽洗发水 400ml','日常清洁护理，按压瓶便于取用。','https://images.pexels.com/photos/14149696/pexels-photo-14149696.jpeg?auto=compress&dpr=1&h=750&w=1260',19.90,35,true FROM category c WHERE c.name='清洁洗护';
INSERT INTO product(category_id,name,description,image_url,price,stock,on_sale)
SELECT c.id,'宿舍速溶咖啡','醇香咖啡风味，早八快速提神。','https://images.pexels.com/photos/28678822/pexels-photo-28678822/free-photo-of-close-up-of-coffee-cup-with-roasted-beans.jpeg?auto=compress&dpr=1&h=750&w=1260',9.90,50,true FROM category c WHERE c.name='元气饮品';

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
