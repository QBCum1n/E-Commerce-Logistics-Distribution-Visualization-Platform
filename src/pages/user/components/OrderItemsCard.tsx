// src/pages/CustomerPortal/components/OrderItemsCard.tsx
import { Card, Typography, Table, Tag, Empty } from "antd";
import {
  ShoppingOutlined,
} from "@ant-design/icons";
import type { OrderItem } from "../types";

const { Title, Text } = Typography;

interface Props {
  orderItems: OrderItem[];
  isUpdating?: boolean;
}

const OrderItemsCard = ({ orderItems, isUpdating }: Props) => {
  // 计算总金额
  const totalAmount = orderItems.reduce((sum, item) => sum + Number(item.subtotal), 0);
  const totalQuantity = orderItems.reduce((sum, item) => sum + item.quantity, 0);

  const columns = [
    {
      title: '商品名称',
      dataIndex: 'product_name',
      key: 'product_name',
      width: 100,
      render: (name: string) => (
        <div className="flex items-center gap-2">
          <span className="font-medium text-slate-700">{name}</span>
        </div>
      ),
    },
    {
      title: '单价',
      dataIndex: 'product_price',
      key: 'product_price',
      width: 100,
      render: (price: number) => (
        <Text className="text-slate-600">¥{Number(price).toFixed(2)}</Text>
      ),
    },
    {
      title: '数量',
      dataIndex: 'quantity',
      key: 'quantity',
      width: 10,
      render: (qty: number) => (
        <Tag>
          ×{qty}
        </Tag>
      ),
    },
    {
      title: '小计',
      dataIndex: 'subtotal',
      key: 'subtotal',
      width: 100,
      render: (subtotal: number) => (
        <Text strong className="text-emerald-600">
          ¥{Number(subtotal).toFixed(2)}
        </Text>
      ),
    },
  ];

  return (
    <Card
      bordered={false}
      className={`
        shadow-lg bg-white/95 backdrop-blur rounded-2xl border-l-4 border-l-blue-500
        animate-slide-up transition-all duration-500 ease-in-out
        ${isUpdating ? "ring-2 ring-offset-2 ring-blue-200 scale-[1.02]" : ""}
      `}
    >
      {/* 头部 */}
      <div className="flex justify-between items-center mb-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-full bg-blue-50 shadow-sm">
            <ShoppingOutlined className="text-xl text-blue-500" />
          </div>
          <div>
            <Title level={4} className="!m-0 !text-lg text-slate-800">
              物品清单
            </Title>
            <Text type="secondary" className="text-xs">
              共 {orderItems.length} 种商品，{totalQuantity} 件
            </Text>
          </div>
        </div>

        <div className="text-right">
          <Text type="secondary" className="text-xs block">合计金额</Text>
          <Text strong className="text-xl text-emerald-600">
            ¥{totalAmount.toFixed(2)}
          </Text>
        </div>
      </div>

      {/* 物品列表 */}
      {orderItems.length > 0 ? (
        <Table
          dataSource={orderItems}
          columns={columns}
          rowKey="id"
          pagination={false}
          size="small"
          className="order-items-table"
          rowClassName="hover:bg-slate-50 transition-colors"
        />
      ) : (
        <Empty 
          description="暂无物品信息" 
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          className="py-8"
        />
      )}
    </Card>
  );
};

export default OrderItemsCard;