-- Idempotent migration for an existing MySQL 8 data volume.
SET NAMES utf8mb4;
USE campus_product;

SET @has_image_url = (SELECT COUNT(*) FROM information_schema.columns WHERE table_schema=DATABASE() AND table_name='product' AND column_name='image_url');
SET @ddl = IF(@has_image_url=0, 'ALTER TABLE product ADD COLUMN image_url VARCHAR(1000) NULL AFTER description', 'SELECT 1');
PREPARE catalog_stmt FROM @ddl;
EXECUTE catalog_stmt;
DEALLOCATE PREPARE catalog_stmt;

INSERT INTO category(name) VALUES ('课间零食'),('元气饮品'),('宿舍日用'),('方便速食'),('学习文具'),('清洁洗护')
ON DUPLICATE KEY UPDATE name=VALUES(name);

UPDATE product SET image_url='https://images.pexels.com/photos/38127820/pexels-photo-38127820/free-photo-of-assortment-of-snacks-on-a-shop-shelf.jpeg?auto=compress&dpr=1&h=750&w=1260' WHERE name='海盐苏打饼干' AND (image_url IS NULL OR image_url='');
UPDATE product SET image_url='https://images.pexels.com/photos/11560362/pexels-photo-11560362.jpeg?cs=srgb&dl=pexels-markus-winkler-1430818-11560362.jpg&fm=jpg' WHERE name='青柠气泡水' AND (image_url IS NULL OR image_url='');
UPDATE product SET image_url='https://images.pexels.com/photos/4107959/pexels-photo-4107959.jpeg?auto=compress&dpr=1&h=750&w=1260' WHERE name='原生木浆纸巾' AND (image_url IS NULL OR image_url='');
UPDATE product SET image_url='https://images.pexels.com/photos/38127820/pexels-photo-38127820/free-photo-of-assortment-of-snacks-on-a-shop-shelf.jpeg?auto=compress&dpr=1&h=750&w=1260' WHERE name='每日坚果' AND (image_url IS NULL OR image_url='');

INSERT INTO product(category_id,name,description,image_url,price,stock,on_sale)
SELECT c.id,'原味薯片分享装','酥脆薯片，宿舍分享装。','https://images.pexels.com/photos/32802526/pexels-photo-32802526/free-photo-of-close-up-of-bowl-of-potato-chips-on-wicker-surface.jpeg?auto=compress&dpr=1&h=750&w=1260',5.90,80,true FROM category c WHERE c.name='课间零食' AND NOT EXISTS (SELECT 1 FROM product p WHERE p.name='原味薯片分享装');
INSERT INTO product(category_id,name,description,image_url,price,stock,on_sale)
SELECT c.id,'巧克力威化饼','轻脆威化夹心，下午茶小点心。','https://images.pexels.com/photos/38127820/pexels-photo-38127820/free-photo-of-assortment-of-snacks-on-a-shop-shelf.jpeg?auto=compress&dpr=1&h=750&w=1260',4.50,90,true FROM category c WHERE c.name='课间零食' AND NOT EXISTS (SELECT 1 FROM product p WHERE p.name='巧克力威化饼');
INSERT INTO product(category_id,name,description,image_url,price,stock,on_sale)
SELECT c.id,'鲜榨风味橙汁','橙香清爽，冷藏后口感更佳。','https://images.pexels.com/photos/4443511/pexels-photo-4443511.jpeg?auto=compress&dpr=1&h=750&w=1260',8.90,60,true FROM category c WHERE c.name='元气饮品' AND NOT EXISTS (SELECT 1 FROM product p WHERE p.name='鲜榨风味橙汁');
INSERT INTO product(category_id,name,description,image_url,price,stock,on_sale)
SELECT c.id,'便携饮用水 550ml','日常补水，随身携带。','https://images.pexels.com/photos/11560362/pexels-photo-11560362.jpeg?cs=srgb&dl=pexels-markus-winkler-1430818-11560362.jpg&fm=jpg',2.00,180,true FROM category c WHERE c.name='元气饮品' AND NOT EXISTS (SELECT 1 FROM product p WHERE p.name='便携饮用水 550ml');
INSERT INTO product(category_id,name,description,image_url,price,stock,on_sale)
SELECT c.id,'香辣方便面','香辣汤底，宿舍宵夜快速补给。','https://images.pexels.com/photos/33312313/pexels-photo-33312313/free-photo-of-delicious-bowl-of-instant-ramen-noodles-on-dark-table.jpeg?auto=compress&dpr=1&h=750&w=1260',5.90,100,true FROM category c WHERE c.name='方便速食' AND NOT EXISTS (SELECT 1 FROM product p WHERE p.name='香辣方便面');
INSERT INTO product(category_id,name,description,image_url,price,stock,on_sale)
SELECT c.id,'香菇鸡汤杯面','独立杯装，冲泡即食。','https://images.pexels.com/photos/13796733/pexels-photo-13796733.jpeg?auto=compress&dpr=1&h=750&w=1260',7.50,70,true FROM category c WHERE c.name='方便速食' AND NOT EXISTS (SELECT 1 FROM product p WHERE p.name='香菇鸡汤杯面');
INSERT INTO product(category_id,name,description,image_url,price,stock,on_sale)
SELECT c.id,'黑色中性笔','书写顺滑，适合课堂笔记。','https://images.pexels.com/photos/7657385/pexels-photo-7657385.jpeg?auto=compress&dpr=1&h=750&w=1260',2.50,120,true FROM category c WHERE c.name='学习文具' AND NOT EXISTS (SELECT 1 FROM product p WHERE p.name='黑色中性笔');
INSERT INTO product(category_id,name,description,image_url,price,stock,on_sale)
SELECT c.id,'A5 横线笔记本','轻便好携带，适合课堂记录。','https://images.pexels.com/photos/8250882/pexels-photo-8250882.jpeg?auto=compress&dpr=1&h=750&w=1260',9.90,50,true FROM category c WHERE c.name='学习文具' AND NOT EXISTS (SELECT 1 FROM product p WHERE p.name='A5 横线笔记本');
INSERT INTO product(category_id,name,description,image_url,price,stock,on_sale)
SELECT c.id,'清爽洗发水 400ml','日常清洁护理，按压瓶便于取用。','https://images.pexels.com/photos/14149696/pexels-photo-14149696.jpeg?auto=compress&dpr=1&h=750&w=1260',19.90,35,true FROM category c WHERE c.name='清洁洗护' AND NOT EXISTS (SELECT 1 FROM product p WHERE p.name='清爽洗发水 400ml');
INSERT INTO product(category_id,name,description,image_url,price,stock,on_sale)
SELECT c.id,'宿舍速溶咖啡','醇香咖啡风味，早八快速提神。','https://images.pexels.com/photos/28678822/pexels-photo-28678822/free-photo-of-close-up-of-coffee-cup-with-roasted-beans.jpeg?auto=compress&dpr=1&h=750&w=1260',9.90,50,true FROM category c WHERE c.name='元气饮品' AND NOT EXISTS (SELECT 1 FROM product p WHERE p.name='宿舍速溶咖啡');
