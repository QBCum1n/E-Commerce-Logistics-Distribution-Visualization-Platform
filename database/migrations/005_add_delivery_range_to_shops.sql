-- 迁移 005: 为商家表添加配送范围列
-- 描述: 在商家表中添加delivery_range列，表示商家可以配送商品的范围(几何图形)
-- 创建: 2025-06-18

-- 为商家表添加配送范围列(几何类型，用于存储多边形区域)
ALTER TABLE shops 
ADD COLUMN delivery_range geometry(Polygon, 4326);

-- 添加注释说明
COMMENT ON COLUMN shops.delivery_range IS '商家可以配送商品的范围，存储为多边形几何数据，使用WGS84坐标系(SRID:4326)';

-- 为配送范围列创建空间索引，提高查询性能
CREATE INDEX IF NOT EXISTS idx_shops_delivery_range ON shops USING GIST (delivery_range);

-- 验证列添加成功
SELECT '✅ 商家表已添加配送范围列' as completion_message;