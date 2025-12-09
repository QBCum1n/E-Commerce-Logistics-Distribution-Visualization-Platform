import type { TrajectoryPoint, Order } from "@/types/order";
import type { Coordinate } from "@/types/amap";

export interface TrackingData {
  order: Order;
  trajectories: TrajectoryPoint[];
  orderItems: OrderItem[];  // 新增
}

export interface TrajectoryPointWithCoords extends TrajectoryPoint, Coordinate {}

export interface StatusConfig {
  text: string;
  icon: React.ReactNode;
  color: string;
}

export interface OrderItem {
  id: string;
  order_id: string;
  product_name: string;
  product_price: number;
  quantity: number;
  subtotal: number;
  created_at: string;
  updated_at: string;
}
