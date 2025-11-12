/**
 * Order Edit Page
 * Form for editing an existing order
 */

import { useParams } from "react-router-dom";
import { OrderForm } from "../components";

export function OrderEditPage() {
  const { orderId } = useParams<{ orderId: string }>();

  return (
    <div className="container mx-auto py-6">
      <OrderForm orderId={orderId} />
    </div>
  );
}
