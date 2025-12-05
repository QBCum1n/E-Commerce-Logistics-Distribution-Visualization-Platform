-- 迁移 018: 为订单表添加最大配送时间列
-- 描述: 在订单表中添加最大配送时间列，表示该订单允许的最大配送时间，单位为小时
-- 默认值在一定范围内随机生成
-- 创建: 2025-11-20

-- 1. 在订单表中添加最大配送时间列
ALTER TABLE orders
ADD COLUMN IF NOT EXISTS limited_delivery_time DECIMAL(5,2) DEFAULT 0 CHECK (limited_delivery_time >= 0);

-- 2. 为新添加的列创建索引
CREATE INDEX IF NOT EXISTS idx_orders_limited_delivery_time ON orders(limited_delivery_time);

-- 3. 创建函数，根据配送距离生成合理的随机最大配送时间
CREATE OR REPLACE FUNCTION generate_random_limited_delivery_time(distance_param DECIMAL(10,2))
RETURNS DECIMAL(5,2) AS $$
DECLARE
    base_time DECIMAL(5,2);
    random_factor DECIMAL(5,2);
    limited_time DECIMAL(5,2);
BEGIN
    -- 如果距离为0或NULL，返回默认值24小时
    IF distance_param IS NULL OR distance_param = 0 THEN
        -- 生成12-24小时之间的随机值
        RETURN ROUND((RANDOM() * 12 + 12)::numeric, 2);
    END IF;
    
    -- 根据配送距离设置基础时间范围
    -- 0-5公里: 2-4小时
    -- 5-10公里: 4-8小时
    -- 10-20公里: 8-16小时
    -- 20-50公里: 16-24小时
    -- 50-100公里: 24-48小时
    -- 100公里以上: 48-72小时
    IF distance_param < 5 THEN
        base_time := 2;
        random_factor := RANDOM() * 2; -- 0-2
    ELSIF distance_param < 10 THEN
        base_time := 4;
        random_factor := RANDOM() * 4; -- 0-4
    ELSIF distance_param < 20 THEN
        base_time := 8;
        random_factor := RANDOM() * 8; -- 0-8
    ELSIF distance_param < 50 THEN
        base_time := 16;
        random_factor := RANDOM() * 8; -- 0-8，总共16-24小时
    ELSIF distance_param < 100 THEN
        base_time := 24;
        random_factor := RANDOM() * 24; -- 0-24，总共24-48小时
    ELSE
        base_time := 48;
        random_factor := RANDOM() * 24; -- 0-24，总共48-72小时
    END IF;
    
    -- 计算最终时间
    limited_time := base_time + random_factor;
    
    -- 确保最小值为2小时，最大值为72小时
    IF limited_time < 2 THEN
        limited_time := 2;
    ELSIF limited_time > 72 THEN
        limited_time := 72;
    END IF;
    
    RETURN ROUND(limited_time, 2);
END;
$$ LANGUAGE plpgsql;

-- 4. 创建函数，更新单个订单的最大配送时间
CREATE OR REPLACE FUNCTION update_order_limited_delivery_time(order_id_param UUID)
RETURNS DECIMAL(5,2) AS $$
DECLARE
    order_delivery_distance DECIMAL(10,2);
    limited_time DECIMAL(5,2);
BEGIN
    -- 获取订单的配送距离
    SELECT COALESCE(delivery_distance, 0) INTO order_delivery_distance
    FROM orders
    WHERE id = order_id_param;
    
    -- 生成随机最大配送时间
    limited_time := generate_random_limited_delivery_time(order_delivery_distance);
    
    -- 更新订单表
    UPDATE orders
    SET limited_delivery_time = limited_time
    WHERE id = order_id_param;
    
    RETURN limited_time;
END;
$$ LANGUAGE plpgsql;

-- 5. 创建函数，批量更新所有订单的最大配送时间
CREATE OR REPLACE FUNCTION update_all_orders_limited_delivery_time()
RETURNS INTEGER AS $$
DECLARE
    updated_count INTEGER := 0;
    order_record RECORD;
BEGIN
    -- 遍历所有订单
    FOR order_record IN 
        SELECT id FROM orders
    LOOP
        -- 更新每个订单的最大配送时间
        PERFORM update_order_limited_delivery_time(order_record.id);
        updated_count := updated_count + 1;
    END LOOP;
    
    RETURN updated_count;
END;
$$ LANGUAGE plpgsql;

-- 6. 创建触发器，当订单的配送距离变更时，自动更新最大配送时间
CREATE OR REPLACE FUNCTION update_limited_delivery_time_trigger()
RETURNS TRIGGER AS $$
BEGIN
    -- 如果是新订单，生成随机最大配送时间
    IF TG_OP = 'INSERT' THEN
        NEW.limited_delivery_time := generate_random_limited_delivery_time(NEW.delivery_distance);
    ELSIF TG_OP = 'UPDATE' AND NEW.delivery_distance IS DISTINCT FROM OLD.delivery_distance THEN
        -- 如果配送距离发生变化，重新生成随机最大配送时间
        NEW.limited_delivery_time := generate_random_limited_delivery_time(NEW.delivery_distance);
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 7. 创建触发器
DROP TRIGGER IF EXISTS trigger_update_limited_delivery_time ON orders;
CREATE TRIGGER trigger_update_limited_delivery_time
BEFORE INSERT OR UPDATE OF delivery_distance ON orders
FOR EACH ROW EXECUTE FUNCTION update_limited_delivery_time_trigger();

-- 8. 执行批量更新
SELECT update_all_orders_limited_delivery_time() AS updated_orders_count;

-- 9. 验证更新结果
SELECT 
    COUNT(*) as total_orders,
    COUNT(CASE WHEN limited_delivery_time > 0 THEN 1 END) as orders_with_limited_time,
    AVG(limited_delivery_time) as avg_limited_time,
    MAX(limited_delivery_time) as max_limited_time,
    MIN(limited_delivery_time) as min_limited_time
FROM orders;

-- 10. 显示一些示例数据
SELECT 
    o.id,
    o.order_number,
    o.delivery_distance,
    o.limited_delivery_time,
    CASE 
        WHEN o.delivery_distance < 5 THEN '2-4小时'
        WHEN o.delivery_distance < 10 THEN '4-8小时'
        WHEN o.delivery_distance < 20 THEN '8-16小时'
        WHEN o.delivery_distance < 50 THEN '16-24小时'
        WHEN o.delivery_distance < 100 THEN '24-48小时'
        ELSE '48-72小时'
    END as expected_range
FROM orders o
WHERE o.limited_delivery_time > 0
ORDER BY o.delivery_distance ASC
LIMIT 10;

-- 11. 按距离分组统计最大配送时间分布
SELECT 
    CASE 
        WHEN delivery_distance < 5 THEN '0-5公里'
        WHEN delivery_distance < 10 THEN '5-10公里'
        WHEN delivery_distance < 20 THEN '10-20公里'
        WHEN delivery_distance < 50 THEN '20-50公里'
        WHEN delivery_distance < 100 THEN '50-100公里'
        ELSE '100公里以上'
    END as distance_range,
    COUNT(*) as order_count,
    AVG(limited_delivery_time) as avg_limited_time,
    MIN(limited_delivery_time) as min_limited_time,
    MAX(limited_delivery_time) as max_limited_time
FROM orders
WHERE limited_delivery_time > 0
GROUP BY 
    CASE 
        WHEN delivery_distance < 5 THEN '0-5公里'
        WHEN delivery_distance < 10 THEN '5-10公里'
        WHEN delivery_distance < 20 THEN '10-20公里'
        WHEN delivery_distance < 50 THEN '20-50公里'
        WHEN delivery_distance < 100 THEN '50-100公里'
        ELSE '100公里以上'
    END
ORDER BY MIN(delivery_distance);

-- 12. 添加注释说明
COMMENT ON COLUMN orders.limited_delivery_time IS '订单允许的最大配送时间，单位为小时，根据配送距离在一定范围内随机生成';

SELECT '✅ 订单表已添加最大配送时间列并完成数据更新' AS status;
SELECT '🎉 迁移 018 完成!' AS completion_message;