-- 迁移 008: 为所有商家设置深圳市福田区矩形配送范围
-- 描述: 为数据库中所有没有配送范围的商家添加默认的深圳市福田区矩形配送范围
-- 创建: 2025-06-18

-- 为所有没有配送范围的商家添加默认的配送范围
-- 使用深圳市福田区的一个矩形区域作为默认配送范围
-- 福田区大致坐标范围: 114.03-114.12E, 22.50-22.57N
-- 我们选择福田区中心区域的一个矩形作为配送范围

-- 首先检查是否有商家没有配送范围
SELECT 
  COUNT(*) as shops_without_range,
  COUNT(*) FILTER (WHERE delivery_range IS NULL) as shops_with_null_range,
  COUNT(*) FILTER (WHERE delivery_range IS NOT NULL) as shops_with_range
FROM shops;

-- 为没有配送范围的商家添加默认的矩形配送范围
-- 福田区中心区域矩形范围 (经度: 114.05-114.06, 纬度: 22.52-22.53)
UPDATE shops 
SET delivery_range = ST_GeomFromText(
  'POLYGON((14.05 22.52, 14.06 22.52, 14.06 22.53, 14.05 22.53, 14.05 22.52))', 
  4326
)
WHERE delivery_range IS NULL;

-- 验证更新结果
SELECT 
  '✅ 所有商家已添加深圳市福田区矩形配送范围' as completion_message,
  COUNT(*) as total_shops,
  COUNT(*) FILTER (WHERE delivery_range IS NOT NULL) as shops_with_range
FROM shops;

-- 显示更新后的商家配送范围
SELECT 
  id,
  name,
  ST_AsText(delivery_range) as delivery_range_wkt,
  ST_Area(delivery_range::geography) / 1000000 as area_km2
FROM shops
WHERE delivery_range IS NOT NULL;

-- 显示配送范围的中心点
SELECT 
  id,
  name,
  ST_X(ST_Centroid(delivery_range)) as center_lng,
  ST_Y(ST_Centroid(delivery_range)) as center_lat
FROM shops
WHERE delivery_range IS NOT NULL;