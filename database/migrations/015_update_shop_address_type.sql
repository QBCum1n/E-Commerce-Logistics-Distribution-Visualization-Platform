-- 迁移脚本：将商家表的address字段类型从TEXT改为geometry(Point, 4326)
-- 目的：使商家地址字段与物流轨迹表中的location字段类型保持一致

-- 1. 直接修改address列的类型为geometry(Point, 4326)
-- 深圳市南山区科技园的大致坐标为：经度113.934，纬度22.533
ALTER TABLE shops 
ALTER COLUMN address TYPE geometry(Point, 4326) 
USING ST_GeomFromText('POINT(113.934 22.533)', 4326);

-- 2. 为新的address字段添加索引，提高查询性能
CREATE INDEX IF NOT EXISTS idx_shops_address ON shops USING GIST (address);

-- 3. 检查更新结果
SELECT 
  id, 
  name, 
  ST_AsText(address) as address_text,
  ST_X(address) as longitude,
  ST_Y(address) as latitude
FROM shops 
WHERE address IS NOT NULL
LIMIT 10;