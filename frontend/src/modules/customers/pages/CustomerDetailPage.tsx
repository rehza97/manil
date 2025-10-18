import { useNavigate, useParams } from "react-router-dom";
import { CustomerDetail } from "../components";
import { Button } from "@/shared/components/ui/button";
import { ArrowLeft } from "lucide-react";

export function CustomerDetailPage() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();

  const handleEdit = () => {
    navigate(`/customers/${id}/edit`);
  };

  const handleDelete = () => {
    navigate("/customers");
  };

  if (!id) {
    return <div>Customer ID not found</div>;
  }

  return (
    <div className="container mx-auto py-6">
      <div className="mb-6">
        <Button variant="ghost" onClick={() => navigate("/customers")}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Customers
        </Button>
      </div>
      <CustomerDetail
        customerId={id}
        onEdit={handleEdit}
        onDelete={handleDelete}
      />
    </div>
  );
}
