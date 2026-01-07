import { useNavigate } from "react-router-dom";
import { CustomerForm } from "@/modules/customers/components";
import { Button } from "@/shared/components/ui/button";
import { ArrowLeft } from "lucide-react";

export function CustomerCreatePage() {
  const navigate = useNavigate();

  const handleSuccess = () => {
    navigate("/admin/customers");
  };

  const handleCancel = () => {
    navigate("/admin/customers");
  };

  return (
    <div className="container mx-auto py-6">
      <div className="mb-6">
        <Button variant="ghost" onClick={() => navigate("/admin/customers")}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Customers
        </Button>
      </div>
      <CustomerForm onSuccess={handleSuccess} onCancel={handleCancel} />
    </div>
  );
}












