-- 迁移 012: 缩小商家配送范围，使部分订单不在配送范围内
-- 描述: 将商家的配送范围从原来的较大区域缩小为较小区域，以便测试配送范围筛选功能
-- 创建: 2025-06-18

-- 查看当前配送范围
SELECT 
  id,
  name,
  ST_AsText(delivery_range) as current_range_wkt,
  ST_Area(delivery_range::geography) / 1000000 as current_area_km2,
  ST_X(ST_Centroid(delivery_range)) as center_lng,
  ST_Y(ST_Centroid(delivery_range)) as center_lat
FROM shops
WHERE delivery_range IS NOT NULL;

-- 缩小商家的配送范围
-- 将原来的矩形范围 (114.05-114.06, 22.52-22.53) 缩小为更小的矩形范围 (114.055-114.056, 22.525-22.526)
-- 这样可以确保部分订单不在新的配送范围内
UPDATE shops 
SET delivery_range = ST_GeomFromText(
  'POLYGON((114.055 22.525, 114.056 22.525, 114.056 22.526, 114.055 22.526, 114.055 22.525))', 
  4326
)
WHERE delivery_range IS NOT NULL;

-- 验证更新结果
SELECT 
  '✅ 商家配送范围已缩小' as completion_message,
  COUNT(*) as total_shops,
  COUNT(*) FILTER (WHERE delivery_range IS NOT NULL) as shops_with_range
FROM shops;

-- 显示更新后的商家配送范围
SELECT 
  id,
  name,
  ST_AsText(delivery_range) as new_range_wkt,
  ST_Area(delivery_range::geography) / 1000000 as new_area_km2,
  ST_X(ST_Centroid(delivery_range)) as center_lng,
  ST_Y(ST_Centroid(delivery_range)) as center_lat
FROM shops
WHERE delivery_range IS NOT NULL;

-- 检查缩小后的配送范围对订单的影响
-- 使用修改后的orders_in_delivery_range_final函数
SELECT 
  s.id as shop_id,
  s.name as shop_name,
  COUNT(o.id) as total_orders,
  COUNT(CASE WHEN lt.status = 'delivered' THEN 1 END) as delivered_orders,
  COUNT(CASE WHEN lt.status = 'delivered' AND 
    ST_Contains(s.delivery_range, lt.location) 
    THEN 1 END) as orders_in_new_range
FROM 
  shops s
LEFT JOIN 
  orders o ON s.id = o.shop_id
LEFT JOIN 
  logistics_trajectories lt ON o.id = lt.order_id AND lt.status = 'delivered'
WHERE 
  s.delivery_range IS NOT NULL
GROUP BY 
  s.id, s.name
ORDER BY 
  s.id;