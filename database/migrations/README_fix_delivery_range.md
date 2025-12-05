# 修改配送范围筛选函数说明

## 问题描述
当前的 `orders_in_delivery_range_final` 函数依赖于 `orders` 表中的 `customer_lng` 和 `customer_lat` 字段，但这些字段在数据库中并不存在，导致"仅显示配送范围内订单"功能无法正常工作。

## 解决方案
修改 `orders_in_delivery_range_final` 函数，使其使用 `logistics_trajectories` 表中的位置信息来判断订单是否在配送范围内。

## 执行步骤

### 方法一：通过 Supabase Dashboard（推荐）
1. 登录 [Supabase Dashboard](https://khvhcuqzmiusxlnzfrnz.supabase.co)
2. 进入项目的 SQL Editor
3. 复制 `scripts/supabase_update_function.sql` 文件中的 SQL 代码
4. 粘贴到 SQL Editor 中并执行

### 方法二：通过 Supabase CLI
1. 安装 Supabase CLI（如果尚未安装）
2. 运行以下命令：
   ```
   cd e:\E-Commerce-Logistics-Distribution-Visualization-Platform
   supabase login
   supabase link --project-ref khvhcuqzmiusxlnzfrnz
   supabase db push
   ```

## 修改内容
修改后的函数将：
1. 使用 `logistics_trajectories` 表中的 `lng` 和 `lat` 字段
2. 只考虑状态为 'delivered' 的轨迹点
3. 使用 PostGIS 的 `ST_Contains` 函数检查点是否在配送范围内
4. 使用 `DISTINCT` 避免重复订单

## 验证方法
执行修改后，可以在商家轨迹页面上测试"仅显示配送范围内订单"功能是否正常工作。