-- 为物流公司表添加配送速度列
-- 单位为千米每小时，初始值在0.5到1之间

-- 1. 添加配送速度列
ALTER TABLE logistics_providers 
ADD COLUMN delivery_speed DECIMAL(5,2) DEFAULT 0.5 CHECK (delivery_speed > 0);

-- 2. 为现有物流公司设置随机配送速度值（0.5到1之间）
UPDATE logistics_providers 
SET delivery_speed = ROUND((RANDOM() * 0.5 + 0.5)::numeric, 2)
WHERE delivery_speed = 0.5;

-- 3. 添加注释说明
COMMENT ON COLUMN logistics_providers.delivery_speed IS '配送速度，单位为千米每小时';