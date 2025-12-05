-- 测试 orders_in_delivery_range_final 函数
-- 这个脚本用于检查函数是否正常工作

-- 1. 检查函数是否存在
SELECT 
  proname as function_name,
  pg_get_functiondef(oid) as function_definition
FROM pg_proc 
WHERE proname = 'orders_in_delivery_range_final';

-- 2. 查看商家的配送范围
SELECT 
  id,
  name,
  ST_AsText(delivery_range) as delivery_range_wkt,
  ST_Area(delivery_range::geography) / 1000000 as area_km2
FROM shops
WHERE delivery_range IS NOT NULL;

-- 3. 查看所有订单和它们的物流轨迹
SELECT 
  o.id as order_id,
  o.order_number,
  o.customer_name,
  lt.status as trajectory_status,
  ST_AsText(lt.location) as location_wkt,
  CASE 
    WHEN s.delivery_range IS NOT NULL AND ST_Contains(s.delivery_range, lt.location) THEN '在配送范围内'
    ELSE '不在配送范围内'
  END as in_delivery_range
FROM 
  orders o
JOIN 
  shops s ON o.shop_id = s.id
JOIN 
  logistics_trajectories lt ON o.id = lt.order_id
WHERE 
  lt.status = 'delivered'
ORDER BY 
  o.order_number;

-- 4. 查看有多少订单在配送范围内
SELECT 
  s.id as shop_id,
  s.name as shop_name,
  COUNT(o.id) as total_orders,
  COUNT(CASE WHEN lt.status = 'delivered' THEN 1 END) as delivered_orders,
  COUNT(CASE WHEN lt.status = 'delivered' AND ST_Contains(s.delivery_range, lt.location) THEN 1 END) as orders_in_range
FROM 
  shops s
LEFT JOIN 
  orders o ON s.id = o.shop_id
LEFT JOIN 
  logistics_trajectories lt ON o.id = lt.order_id AND lt.status = 'delivered'
WHERE 
  s.delivery_range IS NOT NULL
GROUP BY 
  s.id, s.name;