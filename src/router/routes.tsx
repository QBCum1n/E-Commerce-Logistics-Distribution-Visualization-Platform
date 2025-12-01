import { type RouteObject, Navigate } from "react-router-dom";
import DashboardPage from "@/pages/dashboard";
import LoginPage from "@/pages/login";
import MerchantPage from "@/pages/merchant";
import LogisticsTrajectoryPage from "@/pages/merchant/trajectory/LogisticsTrajectoryPage";
import OrderManagement from "@/pages/merchant/order";
import UserPage from "@/pages/user";
export const appRoutes: RouteObject[] = [
	{
		path: "/",
		element: <Navigate to="/login" replace />,
	},
	{
		path: "/login",
		element: <LoginPage />,
	},
	{
		path: "/dashboard",
		element: <DashboardPage />,
	},
	{
		path: "/merchant",
		element: <MerchantPage />,
		children: [
			{
				path: "order",
				element: <OrderManagement />,
			},
			{
				path: "trajectory",
				element: <LogisticsTrajectoryPage />,
			},
		],
	},
	{
		path: "/user",
		element: <UserPage />,
	},
	{
		path: "*",
		element: <Navigate to="/login" replace />,
	},
];
