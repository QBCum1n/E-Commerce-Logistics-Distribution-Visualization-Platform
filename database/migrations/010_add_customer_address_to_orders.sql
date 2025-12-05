-- 迁移脚本：更新 orders 表的 customer_address 列数据，从 logistics_trajectories 表填充数据

-- 1. 从 logistics_trajectories 表中获取状态为 'delivered' 的记录的 location 字段作为地址
UPDATE orders 
SET customer_address = ST_AsText(lt.location)
FROM logistics_trajectories lt
WHERE 
  orders.id = lt.order_id 
  AND lt.status = 'delivered'
  AND lt.location IS NOT NULL;

-- 2. 检查更新结果
SELECT 
  o.id,
  o.order_number,
  o.customer_address,
  lt.status as trajectory_status,
  ST_AsText(lt.location) as trajectory_location
FROM 
  orders o
LEFT JOIN 
  logistics_trajectories lt ON o.id = lt.order_id AND lt.status = 'delivered'
WHERE 
  o.customer_address IS NOT NULL
LIMIT 10;