/**
 * Orders List Page
 * Displays all orders with pagination and filtering
 */

import { OrderList } from "../components";

export function OrdersListPage() {
  return (
    <div className="container mx-auto py-6">
      <OrderList />
    </div>
  );
}
