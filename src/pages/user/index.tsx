import { useState, useEffect, useRef } from "react";
import { Layout, Input, Button, Card, Typography, Timeline, Tag, Dropdown, ConfigProvider, message, Empty, Spin, Avatar } from "antd";
import {
	RocketOutlined,
	LogoutOutlined,
	UserOutlined,
	EnvironmentFilled,
	CarOutlined,
	CheckCircleOutlined,
	LoadingOutlined,
	StopOutlined,
	ClockCircleOutlined,
    SyncOutlined
} from "@ant-design/icons";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabaseClient";
import type { TrajectoryPoint, Order } from "@/types/order";
import { RealtimeChannel } from "@supabase/supabase-js";

const { Header, Content } = Layout;
const { Title, Text } = Typography;

// -----------------------------------------------------------------------------
// 类型定义
// -----------------------------------------------------------------------------
interface TrackingData {
	order: Order;
	trajectories: TrajectoryPoint[];
}

// 状态映射配置
const STATUS_MAP: Record<string, { text: string; icon: React.ReactNode; color: string }> = {
	pending: { text: "待发货", icon: <LoadingOutlined />, color: "gray" },
	confirmed: { text: "已确认", icon: <CheckCircleOutlined />, color: "blue" },
	shipping: { text: "运输中", icon: <CarOutlined />, color: "#1677ff" },
	delivered: { text: "已送达", icon: <CheckCircleOutlined />, color: "#52c41a" },
	cancelled: { text: "已取消", icon: <StopOutlined />, color: "red" },
	// 轨迹状态映射
	pickup: { text: "已揽收", icon: <CheckCircleOutlined />, color: "blue" },
	in_transit: { text: "运输中", icon: <RocketOutlined />, color: "blue" },
	out_for_delivery: { text: "派送中", icon: <CarOutlined />, color: "green" },
};

const CustomerPortal = () => {
	const navigate = useNavigate();
	const [loading, setLoading] = useState(false);
	const [searched, setSearched] = useState(false);
	const [trackingData, setTrackingData] = useState<TrackingData | null>(null);
	const [user, setUser] = useState<{ email?: string } | null>(null);
    
    // 实时更新状态指示
    const [isUpdating, setIsUpdating] = useState(false);
    // 订阅引用
    const subscriptionRef = useRef<RealtimeChannel | null>(null);

	// 获取当前登录用户信息
	useEffect(() => {
		const getUser = async () => {
			const {
				data: { user },
			} = await supabase.auth.getUser();
			setUser(user);
		};
		getUser();

        // 组件卸载时清理订阅
        return () => {
            if (subscriptionRef.current) {
                supabase.removeChannel(subscriptionRef.current);
            }
        };
	}, []);

    // ---------------------------------------------------------------------------
    // 实时订阅逻辑
    // ---------------------------------------------------------------------------
    const subscribeToOrderUpdates = (orderId: string) => {
        // 1. 清理旧订阅
        if (subscriptionRef.current) {
            supabase.removeChannel(subscriptionRef.current);
        }

        // 2. 创建新频道
        const channel = supabase.channel(`order-tracking-${orderId}`)
            // 监听订单状态变更 (UPDATE)
            .on(
                'postgres_changes',
                { event: 'UPDATE', schema: 'public', table: 'orders', filter: `id=eq.${orderId}` },
                (payload) => {
                    setIsUpdating(true);
                    setTrackingData(prev => {
                        if (!prev) return null;
                        return { ...prev, order: payload.new as Order };
                    });
                    message.info({ content: '订单状态已更新', icon: <SyncOutlined spin /> });
                    setTimeout(() => setIsUpdating(false), 1500);
                }
            )
            // 监听新轨迹插入 (INSERT)
            .on(
                'postgres_changes',
                { event: 'INSERT', schema: 'public', table: 'logistics_trajectories', filter: `order_id=eq.${orderId}` },
                (payload) => {
                    setIsUpdating(true);
                    // 注意：这里 payload.new 对应数据库行结构，需要确保它符合 TrajectoryPoint 类型
                    const newTrajectory = payload.new as TrajectoryPoint;
                    
                    setTrackingData(prev => {
                        if (!prev) return null;
                        // 将新轨迹插入到数组最前面
                        return { ...prev, trajectories: [newTrajectory, ...prev.trajectories] };
                    });
                    
                    message.success({ content: '有新的物流动态', icon: <RocketOutlined /> });
                    setTimeout(() => setIsUpdating(false), 1500);
                }
            )
            .subscribe();

        subscriptionRef.current = channel;
    };

	// ---------------------------------------------------------------------------
	// 核心业务逻辑
	// ---------------------------------------------------------------------------

	const handleSearch = async (orderNumber: string) => {
		if (!orderNumber.trim()) return;

		setLoading(true);
		setSearched(true);
		setTrackingData(null);

		try {
			// 1. 调用安全查询函数
			const { data: orderData, error: orderError } = await supabase.rpc("get_order_by_number", { p_order_number: orderNumber.trim() }).maybeSingle();

			if (orderError) throw orderError;

			if (!orderData) {
				throw new Error("未找到该订单信息，请检查单号");
			}

			// 2. 查询物流轨迹
			const { data: trajectoryData, error: trajError } = await supabase
				.from("logistics_trajectories")
				.select("*")
				.eq("order_id", (orderData as Order).id)
				.order("timestamp", { ascending: false });

			if (trajError) {
				console.error("轨迹加载失败", trajError);
			}

			// 3. 组装数据
			setTrackingData({
				order: orderData as Order,
				trajectories: (trajectoryData as TrajectoryPoint[]) || [],
			});

            // 4. 开启实时订阅
            subscribeToOrderUpdates((orderData as Order).id);

		} catch (error: unknown) {
			const errorMessage = error instanceof Error ? error.message : "查询失败，请稍后重试";
			message.error(errorMessage);
		} finally {
			setLoading(false);
		}
	};

	const handleLogout = async () => {
        // 登出前清理订阅
        if (subscriptionRef.current) {
            supabase.removeChannel(subscriptionRef.current);
        }
		try {
			const { error } = await supabase.auth.signOut();
			if (error) throw error;

			localStorage.clear();
			sessionStorage.clear();

			message.success("已安全退出");
			navigate("/login");
		} catch (error: unknown) {
			const errorMessage = error instanceof Error ? error.message : "退出失败";
			message.error(`退出失败: ${errorMessage}`);
		}
	};

	// 渲染最新状态卡片
	const renderStatusCard = () => {
		if (!trackingData) return null;
		const { order, trajectories } = trackingData;

		// 1. 定义状态配置 (Theme Config)
		const statusConfig = {
			pending: {
				color: "text-amber-500",
				bg: "bg-amber-50",
				borderColor: "border-l-amber-500",
				icon: <ClockCircleOutlined className="text-2xl text-amber-500" />,
				title: "订单待处理",
				desc: "商家正在确认您的订单",
			},
			confirmed: {
				color: "text-blue-500",
				bg: "bg-blue-50",
				borderColor: "border-l-blue-500",
				icon: <CheckCircleOutlined className="text-2xl text-blue-500" />,
				title: "订单已确认",
				desc: "商家已接单，正在备货中",
			},
			shipping: {
				color: "text-sky-600",
				bg: "bg-sky-50",
				borderColor: "border-l-sky-600",
				icon: <LoadingOutlined className="text-2xl text-sky-600" spin />,
				title: order.estimated_delivery ? `预计 ${new Date(order.estimated_delivery).toLocaleDateString()} 送达` : "运输中 - 预计近日送达",
				desc: trajectories[0]?.description ? `当前位置: ${trajectories[0].description}` : "包裹正在飞速奔向您",
			},
			delivered: {
				color: "text-emerald-600",
				bg: "bg-emerald-50",
				borderColor: "border-l-emerald-600",
				icon: <CheckCircleOutlined className="text-2xl text-emerald-600" />,
				title: "订单已签收",
				desc: order.actual_delivery ? `签收时间: ${new Date(order.actual_delivery).toLocaleString()}` : "感谢您的使用，期待再次为您服务",
			},
			cancelled: {
				color: "text-slate-500",
				bg: "bg-slate-100",
				borderColor: "border-l-slate-400",
				icon: <StopOutlined className="text-2xl text-slate-500" />,
				title: "订单已取消",
				desc: "该订单已取消，如有疑问请联系客服",
			},
		};

		const theme = statusConfig[order.status as keyof typeof statusConfig] || statusConfig.pending;

		return (
			<Card
				bordered={false}
				className={`
                    shadow-lg bg-white/95 backdrop-blur rounded-2xl border-l-4 ${theme.borderColor} 
                    animate-slide-up transition-all duration-500 ease-in-out
                    ${isUpdating ? 'ring-2 ring-offset-2 ring-blue-200 scale-[1.02]' : ''}
                `}>
				<div className="flex justify-between items-start">
					<div>
                        <div className="flex items-center gap-2 mb-1">
						    <Text type="secondary" className="text-xs font-medium uppercase tracking-wide opacity-70">
							    当前状态
						    </Text>
                            {isUpdating && (
                                <Tag color="processing" icon={<SyncOutlined spin />} className="border-0 bg-transparent p-0 m-0 text-blue-500 text-xs">
                                    更新中...
                                </Tag>
                            )}
                        </div>

						<Title level={3} className={`!my-1 !text-xl ${theme.color} flex items-center gap-2 transition-colors duration-300`}>
							{theme.title}
						</Title>

						<div className="flex items-center gap-1.5 mt-2 text-slate-500 text-sm transition-all duration-300">
							{order.status === "shipping" && <EnvironmentFilled className={theme.color} />}
							<span>{theme.desc}</span>
						</div>
					</div>

					<div className={`p-3 rounded-full ${theme.bg} flex items-center justify-center shadow-sm transition-all duration-500 ${isUpdating ? 'rotate-12 scale-110' : ''}`}>
						{theme.icon}
					</div>
				</div>
			</Card>
		);
	};

	return (
		<ConfigProvider
			theme={{
				token: {
					colorPrimary: "#1677ff",
					fontFamily: '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
					borderRadius: 8,
				},
				components: {
					Button: { controlHeight: 40 },
					Input: { controlHeight: 40 },
					Card: { boxShadowTertiary: "0 10px 40px -10px rgba(22, 119, 255, 0.15)" },
				},
			}}>
			<Layout className="h-screen overflow-hidden bg-slate-50 relative">
				{/* 1. 顶部导航栏 */}
				<Header className="absolute top-0 left-0 w-full z-50 flex items-center justify-between px-6 md:px-10 bg-white/80 backdrop-blur-md border-b border-white/50 shadow-sm h-16">
					<div className="flex items-center gap-3">
						<div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center shadow-lg shadow-blue-500/30 text-white">
							<RocketOutlined style={{ fontSize: 18 }} />
						</div>
						<span className="text-lg font-bold text-slate-800 tracking-tight">智配物流 · 用户端</span>
					</div>

					<Dropdown
						menu={{
							items: [{ key: "1", label: "退出登录", icon: <LogoutOutlined />, danger: true, onClick: handleLogout }],
						}}>
						<div className="flex items-center gap-3 cursor-pointer hover:bg-slate-100/50 py-1 px-2 rounded-full transition-all">
							<Text className="text-slate-600 hidden sm:block">{user?.email || "用户"}</Text>
							<Avatar style={{ backgroundColor: "#1677ff" }} icon={<UserOutlined />} />
						</div>
					</Dropdown>
				</Header>

				{/* 2. 主体内容区 */}
				<Content className="relative w-full h-full mt-16">
					{/* 地图占位层 */}
					<div className="absolute inset-0 w-full h-full bg-[#eef4ff] overflow-hidden select-none">
						<div
							className="absolute inset-0 opacity-30"
							style={{
								backgroundImage: "linear-gradient(#cbd5e1 1px, transparent 1px), linear-gradient(90deg, #cbd5e1 1px, transparent 1px)",
								backgroundSize: "40px 40px",
							}}
						/>
						<div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center z-0">
							<div className="relative flex items-center justify-center">
								<span className="animate-ping absolute inline-flex h-16 w-16 rounded-full bg-blue-400 opacity-75"></span>
								<span className="relative inline-flex rounded-full h-6 w-6 bg-blue-600 border-4 border-white shadow-lg"></span>
							</div>
							<div className="mt-2 bg-slate-800/80 backdrop-blur text-white text-xs px-2 py-1 rounded shadow-md">我的位置</div>
						</div>
					</div>

					{/* 3. 交互浮层 */}
					<div className="absolute inset-0 pointer-events-none flex flex-col md:flex-row">
						{/* 左侧面板 */}
						<div className="w-full md:w-[420px] h-full bg-gradient-to-b from-white/90 via-white/80 to-transparent md:bg-transparent pointer-events-auto p-4 md:p-6 flex flex-col gap-4 overflow-y-auto no-scrollbar">
							{/* 搜索卡片 */}
							<Card bordered={false} className="shadow-xl backdrop-blur-xl bg-white/90 border border-white/50 rounded-2xl">
								<Title level={4} className="!mb-4 text-slate-800">
									追踪您的包裹
								</Title>
								<Input.Search
									placeholder="请输入订单号 (如: ORD202401150001)"
									enterButton={
										<Button type="primary" className="bg-blue-600 font-medium shadow-blue-200 shadow-lg">
											查询
										</Button>
									}
									size="large"
									onSearch={handleSearch}
									loading={loading}
									allowClear
								/>
								<div className="mt-3 flex flex-wrap gap-2">
									<Tag
										className="text-xs bg-slate-100 border-slate-200 text-slate-500 cursor-pointer hover:text-blue-600 transition-colors"
										onClick={() => handleSearch("ORD202401150001")}>
										示例订单: ORD202401150001
									</Tag>
								</div>
							</Card>

							{/* 搜索结果区域 */}
							{searched && (
								<>
									{loading ? (
										<div className="flex justify-center py-10 bg-white/50 rounded-2xl backdrop-blur">
											<Spin tip="正在从卫星同步数据..." />
										</div>
									) : trackingData ? (
										<div className="animate-slide-up flex flex-col gap-4 pb-10">
											{/* 状态卡片 */}
											{renderStatusCard()}

											{/* 时间轴卡片 */}
											<Card bordered={false} className="shadow-lg bg-white/95 backdrop-blur rounded-2xl flex-1 min-h-[200px]">
												<div className="mb-6 flex items-center gap-2 border-b border-slate-100 pb-3">
													<ClockCircleOutlined className="text-slate-400" />
													<span className="font-bold text-slate-700">物流进度</span>
												</div>

												{trackingData.trajectories.length > 0 ? (
													<Timeline
                                                        pending={trackingData.order.status === 'shipping' ? '正在运输中...' : false}
														items={trackingData.trajectories.map((item, index) => {
															const statusConfig = STATUS_MAP[item.status] || { text: item.status, color: "gray" };
                                                            const isLatest = index === 0;
                                                            
															return {
																color: isLatest ? "#1677ff" : "gray",
																dot: isLatest ? (
                                                                    <div className={`w-3 h-3 bg-blue-600 rounded-full ring-4 ring-blue-100 ${isUpdating ? 'animate-ping' : ''}`} />
                                                                ) : null,
																children: (
																	<div className={`pb-6 ${isLatest ? "text-slate-800" : "text-slate-400"} transition-colors duration-500`}>
																		<div className="font-medium text-sm flex justify-between items-center mb-1">
																			<span>{statusConfig.text}</span>
																			<span className="text-xs font-normal opacity-70 font-mono">
																				{new Date(item.timestamp).toLocaleString([], {
																					month: "2-digit",
																					day: "2-digit",
																					hour: "2-digit",
																					minute: "2-digit",
																				})}
																			</span>
																		</div>
																		<div className={`text-xs leading-relaxed opacity-80 bg-slate-50 p-2 rounded border border-slate-100 ${isLatest && isUpdating ? 'bg-blue-50 border-blue-100' : ''}`}>
																			{item.description}
																		</div>
																	</div>
																),
															};
														})}
													/>
												) : (
													<Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="暂无物流轨迹信息" />
												)}
											</Card>
										</div>
									) : (
										<Card className="shadow-lg bg-white/90 backdrop-blur rounded-2xl text-center py-8">
											<Empty description="未找到该订单，请检查单号" />
										</Card>
									)}
								</>
							)}
						</div>
					</div>
				</Content>
			</Layout>

			<style>{`
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
        .animate-slide-up { animation: slideUp 0.5s cubic-bezier(0.16, 1, 0.3, 1); }
        @keyframes slideUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>
		</ConfigProvider>
	);
};

export default CustomerPortal;