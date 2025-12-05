-- 迁移 016: 为订单表添加配送距离列
-- 描述: 在订单表中添加配送距离列，用于存储从商家开始，经过每个中转站，最后到达用户地址的总距离（单位：公里）
-- 创建: 2025-11-20

-- 1. 在订单表中添加配送距离列
ALTER TABLE orders
ADD COLUMN IF NOT EXISTS delivery_distance DECIMAL(10,2) DEFAULT 0;

-- 2. 为新添加的列创建索引
CREATE INDEX IF NOT EXISTS idx_orders_delivery_distance ON orders(delivery_distance);

-- 3. 创建函数，根据物流轨迹计算订单的总配送距离
CREATE OR REPLACE FUNCTION calculate_delivery_distance_from_trajectories(order_id_param UUID)
RETURNS DECIMAL(10,2) AS $$
DECLARE
    total_distance DECIMAL(10,2) := 0;
    prev_point GEOMETRY;
    current_point GEOMETRY;
    trajectory_record RECORD;
    point_distance DECIMAL(10,2);
BEGIN
    -- 获取该订单的所有轨迹点，按时间顺序排序
    FOR trajectory_record IN 
        SELECT location, timestamp
        FROM logistics_trajectories
        WHERE order_id = order_id_param
        ORDER BY timestamp ASC
    LOOP
        -- 设置当前点
        current_point := trajectory_record.location;
        
        -- 如果不是第一个点，计算与上一个点的距离
        IF prev_point IS NOT NULL THEN
            -- 计算两点之间的距离（单位：米）
            point_distance := ST_Distance(
                prev_point::geography,
                current_point::geography
            );
            
            -- 累加到总距离（转换为公里）
            total_distance := total_distance + (point_distance / 1000);
        END IF;
        
        -- 更新上一个点
        prev_point := current_point;
    END LOOP;
    
    -- 返回总距离（单位：公里，保留两位小数）
    RETURN ROUND(total_distance, 2);
END;
$$ LANGUAGE plpgsql;

-- 4. 创建函数，计算单个订单的配送距离
CREATE OR REPLACE FUNCTION calculate_delivery_distance_for_order(order_id_param UUID)
RETURNS DECIMAL(10,2) AS $$
DECLARE
    distance DECIMAL(10,2);
BEGIN
    -- 计算配送距离
    distance := calculate_delivery_distance_from_trajectories(order_id_param);
    
    -- 更新订单表中的配送距离
    UPDATE orders
    SET delivery_distance = distance
    WHERE id = order_id_param;
    
    RETURN distance;
END;
$$ LANGUAGE plpgsql;

-- 5. 创建函数，批量更新所有订单的配送距离
CREATE OR REPLACE FUNCTION update_all_orders_delivery_distance()
RETURNS INTEGER AS $$
DECLARE
    updated_count INTEGER := 0;
    order_record RECORD;
BEGIN
    -- 遍历所有有轨迹点的订单
    FOR order_record IN 
        SELECT DISTINCT order_id
        FROM logistics_trajectories
    LOOP
        -- 更新每个订单的配送距离
        PERFORM calculate_delivery_distance_for_order(order_record.order_id);
        updated_count := updated_count + 1;
    END LOOP;
    
    RETURN updated_count;
END;
$$ LANGUAGE plpgsql;

-- 6. 创建函数，计算多个订单的总配送距离
CREATE OR REPLACE FUNCTION calculate_total_delivery_distance(order_ids_param UUID[])
RETURNS DECIMAL(10,2) AS $$
DECLARE
    total_distance DECIMAL(10,2) := 0;
    order_id UUID;
BEGIN
    -- 遍历所有订单ID
    FOREACH order_id IN ARRAY order_ids_param
    LOOP
        -- 累加每个订单的配送距离
        SELECT COALESCE(delivery_distance, 0) INTO total_distance
        FROM orders
        WHERE id = order_id;
        
        total_distance := total_distance + COALESCE(
            calculate_delivery_distance_from_trajectories(order_id), 0
        );
    END LOOP;
    
    RETURN ROUND(total_distance, 2);
END;
$$ LANGUAGE plpgsql;

-- 7. 创建函数，获取商家的总配送距离
CREATE OR REPLACE FUNCTION get_shop_total_delivery_distance(
    shop_id_param UUID,
    status_filter TEXT DEFAULT NULL,
    start_date_param TIMESTAMPTZ DEFAULT NULL,
    end_date_param TIMESTAMPTZ DEFAULT NULL
)
RETURNS DECIMAL(10,2) AS $$
DECLARE
    total_distance DECIMAL(10,2) := 0;
BEGIN
    -- 计算商家的总配送距离
    SELECT COALESCE(SUM(delivery_distance), 0) INTO total_distance
    FROM orders
    WHERE shop_id = shop_id_param
    AND delivery_distance > 0
    AND (
        status_filter IS NULL OR status = status_filter
    )
    AND (
        start_date_param IS NULL OR created_at >= start_date_param
    )
    AND (
        end_date_param IS NULL OR created_at <= end_date_param
    );
    
    RETURN ROUND(total_distance, 2);
END;
$$ LANGUAGE plpgsql;

-- 8. 创建函数，更新单个订单的配送距离
CREATE OR REPLACE FUNCTION update_order_delivery_distance(order_id_param UUID)
RETURNS VOID AS $$
BEGIN
    UPDATE orders
    SET delivery_distance = calculate_delivery_distance_from_trajectories(order_id_param)
    WHERE id = order_id_param;
END;
$$ LANGUAGE plpgsql;

-- 9. 执行批量更新
SELECT update_all_orders_delivery_distance() AS updated_orders_count;

-- 10. 验证更新结果
SELECT 
    COUNT(*) as total_orders,
    COUNT(CASE WHEN delivery_distance > 0 THEN 1 END) as orders_with_distance,
    AVG(delivery_distance) as avg_distance,
    MAX(delivery_distance) as max_distance,
    MIN(delivery_distance) as min_distance
FROM orders;

-- 11. 显示一些示例数据
SELECT 
    o.id,
    o.order_number,
    o.shop_id,
    o.delivery_distance,
    (SELECT COUNT(*) FROM logistics_trajectories WHERE order_id = o.id) as trajectory_points_count
FROM orders o
WHERE o.delivery_distance > 0
ORDER BY o.delivery_distance DESC
LIMIT 10;

-- 12. 显示轨迹点示例
SELECT 
    lt.order_id,
    o.order_number,
    lt.status,
    ST_AsText(lt.location) as location_text,
    lt.timestamp
FROM logistics_trajectories lt
JOIN orders o ON lt.order_id = o.id
WHERE o.delivery_distance > 0
ORDER BY lt.order_id, lt.timestamp
LIMIT 20;

SELECT '✅ 订单表已添加配送距离列并完成数据更新' AS status;
SELECT '🎉 迁移 016 完成!' AS completion_message;