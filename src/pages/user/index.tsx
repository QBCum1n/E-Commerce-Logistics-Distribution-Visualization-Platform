// src/pages/CustomerPortal/index.tsx（更新后）
import { Layout, ConfigProvider, Spin, Card, Empty } from "antd";
import Header from "./components/header";
import SearchCard from "./components/searchCard";
import OrderItemsCard from "./components/OrderItemsCard";
import TrajectoryTimeline from "./components/trajectoryTimeline";
import OrderMap from "@/components/map/orderMap";
import { useAuth } from "./hooks/useAuth";
import { useOrderTracking } from "./hooks/useOrderTracking";
import { useToastMessage } from "@/hooks/useToastMessage";
import { antdTheme } from "./config/theme";
import "./style.css";

const { Content } = Layout;

const CustomerPortal = () => {
	const { toastMessage, contextHolder } = useToastMessage();
	const { user, handleLogout } = useAuth(toastMessage);
	const { loading, searched, trackingData, isUpdating, handleSearch, cleanupSubscription, mapTrajectories, startPoint, endPoint } =
		useOrderTracking(toastMessage);

	const onLogout = async () => {
		cleanupSubscription();
		await handleLogout();
	};

	return (
		<ConfigProvider theme={antdTheme}>
			{contextHolder}

			<Layout className="h-screen overflow-hidden bg-slate-50 relative">
				<Header userEmail={user?.email} onLogout={onLogout} />

				<Content className="relative w-full h-full mt-16">
					<div className="absolute inset-0 w-full h-full">
						<OrderMap trajectories={mapTrajectories} startPoint={startPoint} endPoint={endPoint} isSearching={loading} />
					</div>

					<div className="absolute inset-0 pointer-events-none flex flex-col md:flex-row">
						<div className="w-full md:w-[420px] h-full bg-gradient-to-b from-white/90 via-white/80 to-transparent md:bg-transparent pointer-events-auto p-4 md:p-6 flex flex-col gap-4 overflow-y-auto no-scrollbar">
							<SearchCard onSearch={handleSearch} loading={loading} />

							{searched && (
								<>
									{loading ? (
										<div className="flex justify-center py-10 bg-white/50 rounded-2xl backdrop-blur">
											<Spin tip="正在从卫星同步数据..." />
										</div>
									) : trackingData ? (
										<div className="animate-slide-up flex flex-col gap-4 pb-10">
											<OrderItemsCard orderItems={trackingData.orderItems} isUpdating={isUpdating} />
											<TrajectoryTimeline
												trajectories={trackingData.trajectories}
												isShipping={trackingData.order.status === "shipping"}
												isUpdating={isUpdating}
											/>
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
		</ConfigProvider>
	);
};

export default CustomerPortal;
