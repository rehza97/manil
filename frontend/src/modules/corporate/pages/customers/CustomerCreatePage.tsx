import { useNavigate } from "react-router-dom";
import { CustomerForm } from "@/modules/customers/components";
import { Button } from "@/shared/components/ui/button";
import { ArrowLeft } from "lucide-react";

export function CustomerCreatePage() {
  const navigate = useNavigate();

  const handleSuccess = () => {
    navigate("/corporate/customers");
  };

  const handleCancel = () => {
    navigate("/corporate/customers");
  };

  return (
    <div className="container mx-auto py-6">
      <div className="mb-6">
        <Button variant="ghost" onClick={() => navigate("/corporate/customers")}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Customers
        </Button>
      </div>
      <CustomerForm onSuccess={handleSuccess} onCancel={handleCancel} />
    </div>
  );
}
