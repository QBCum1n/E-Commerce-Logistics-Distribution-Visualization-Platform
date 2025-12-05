import { useState, useEffect } from "react";
import { Modal, Radio, Button, Typography, Space, Spin, Tag } from "antd";
import { CheckCircleOutlined, ClockCircleOutlined, ExclamationCircleOutlined } from "@ant-design/icons";
import { supabase } from "@/lib/supabaseClient";
import type { LogisticsProvider } from "@/services/logisticsService";

const { Title, Text } = Typography;

interface LogisticsProviderModalProps {
  open: boolean;
  onCancel: () => void;
  onConfirm: (providerId: string) => void;
  loading?: boolean;
  orderId?: string; // 新增订单ID参数
}

const LogisticsProviderModal: React.FC<LogisticsProviderModalProps> = ({
  open,
  onCancel,
  onConfirm,
  loading = false,
  orderId = "", // 默认为空字符串
}) => {
  const [providers, setProviders] = useState<LogisticsProvider[]>([]);
  const [selectedProviderId, setSelectedProviderId] = useState<string>("");
  const [fetchLoading, setFetchLoading] = useState(false);
  const [orderInfo, setOrderInfo] = useState<{
    delivery_distance: number;
    limited_delivery_time: number;
  } | null>(null);
  const [eligibleProviders, setEligibleProviders] = useState<LogisticsProvider[]>([]);

  // 获取订单信息
  useEffect(() => {
    if (!open || !orderId) return;

    const fetchOrderInfo = async () => {
      try {
        const { data, error } = await supabase
          .from("orders")
          .select("delivery_distance, limited_delivery_time")
          .eq("id", orderId)
          .single();

        if (error) throw error;
        setOrderInfo(data);
      } catch (error) {
        console.error("获取订单信息失败:", error);
      }
    };

    fetchOrderInfo();
  }, [open, orderId]);

  // 获取快递公司列表
  useEffect(() => {
    if (!open) return;

    const fetchProviders = async () => {
      setFetchLoading(true);
      try {
        const { data, error } = await supabase
          .from("logistics_providers")
          .select("*")
          .eq("is_active", true)
          .order("name");

        if (error) throw error;
        setProviders(data || []);
      } catch (error) {
        console.error("获取快递公司列表失败:", error);
      } finally {
        setFetchLoading(false);
      }
    };

    fetchProviders();
  }, [open]);

  // 筛选能够按时配送的快递公司
  useEffect(() => {
    if (!providers.length || !orderInfo) return;

    const eligible = providers.filter(provider => {
      // 计算预计配送时间（小时）= 配送距离（公里） / 配送速度（公里/小时）
      const estimatedTime = orderInfo.delivery_distance / provider.delivery_speed;
      // 如果预计配送时间小于等于最大配送时间，则该快递公司符合要求
      return estimatedTime <= orderInfo.limited_delivery_time;
    });

    setEligibleProviders(eligible);
    
    // 默认选择第一个符合条件的快递公司
    if (eligible.length > 0) {
      setSelectedProviderId(eligible[0].id);
    } else {
      setSelectedProviderId("");
    }
  }, [providers, orderInfo]);

  const handleConfirm = () => {
    if (!selectedProviderId) return;
    onConfirm(selectedProviderId);
  };

  // 计算预计配送时间
  const calculateEstimatedTime = (distance: number, speed: number): string => {
    const hours = distance / speed;
    return hours.toFixed(2);
  };

  return (
    <Modal
      title={
        <div className="flex items-center gap-2">
          <CheckCircleOutlined className="text-blue-500" />
          <span>选择快递公司</span>
        </div>
      }
      open={open}
      onCancel={onCancel}
      footer={[
        <Button key="cancel" onClick={onCancel}>
          取消
        </Button>,
        <Button
          key="confirm"
          type="primary"
          onClick={handleConfirm}
          loading={loading}
          disabled={!selectedProviderId}
        >
          确认发货
        </Button>,
      ]}
      width={700}
      destroyOnClose
    >
      <div className="py-4">
        {fetchLoading ? (
          <div className="flex justify-center py-8">
            <Spin size="large" />
          </div>
        ) : (
          <>
            {orderInfo && (
              <div className="mb-4 p-3 bg-blue-50 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <ClockCircleOutlined className="text-blue-500" />
                  <Text strong>订单配送信息</Text>
                </div>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <Text type="secondary">配送距离：</Text>
                    <Text strong>{orderInfo.delivery_distance} 公里</Text>
                  </div>
                  <div>
                    <Text type="secondary">最大配送时间：</Text>
                    <Text strong>{orderInfo.limited_delivery_time} 小时</Text>
                  </div>
                </div>
              </div>
            )}
            
            <div className="mb-4">
              <Text type="secondary">请选择能够按时配送此订单的快递公司：</Text>
            </div>
            
            {eligibleProviders.length > 0 ? (
              <Radio.Group
                value={selectedProviderId}
                onChange={(e) => setSelectedProviderId(e.target.value)}
                className="w-full"
              >
                <Space direction="vertical" className="w-full">
                  {eligibleProviders.map((provider) => (
                    <Radio
                      key={provider.id}
                      value={provider.id}
                      className="w-full border border-gray-200 rounded-lg p-4 hover:border-blue-300 hover:bg-blue-50 transition-all"
                    >
                      <div className="flex justify-between items-center">
                        <div>
                          <Title level={5} className="!mb-1">
                            {provider.name}
                          </Title>
                          <div className="flex items-center gap-4 text-sm text-gray-500">
                            <span>客服电话：{provider.contact_phone}</span>
                            <span>配送速度：{provider.delivery_speed} 公里/小时</span>
                            <Tag color="green">
                              预计 {calculateEstimatedTime(orderInfo?.delivery_distance || 0, provider.delivery_speed)} 小时
                            </Tag>
                          </div>
                        </div>
                        <div className="bg-blue-100 text-blue-600 px-3 py-1 rounded-full text-sm font-medium">
                          {provider.code}
                        </div>
                      </div>
                    </Radio>
                  ))}
                </Space>
              </Radio.Group>
            ) : (
              <div className="text-center py-8">
                <ExclamationCircleOutlined className="text-4xl text-amber-500 mb-4" />
                <div className="text-gray-500 mb-2">
                  暂无能够按时配送此订单的快递公司
                </div>
                {orderInfo && (
                  <Text type="secondary" className="text-sm">
                    配送距离：{orderInfo.delivery_distance} 公里，最大配送时间：{orderInfo.limited_delivery_time} 小时
                  </Text>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </Modal>
  );
};

export default LogisticsProviderModal;