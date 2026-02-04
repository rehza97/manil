import { useNavigate, useParams } from "react-router-dom";
import { CustomerForm } from "@/modules/customers/components";
import { Button } from "@/shared/components/ui/button";
import { ArrowLeft } from "lucide-react";

export function CustomerEditPage() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();

  const handleSuccess = () => {
    navigate(`/admin/customers/${id}`);
  };

  const handleCancel = () => {
    navigate(`/admin/customers/${id}`);
  };

  if (!id) {
    return <div>ID client introuvable</div>;
  }

  return (
    <div className="container mx-auto py-6">
      <div className="mb-6">
        <Button variant="ghost" onClick={() => navigate(`/admin/customers/${id}`)}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Retour aux détails du client
        </Button>
      </div>
      <CustomerForm
        customerId={id}
        onSuccess={handleSuccess}
        onCancel={handleCancel}
      />
    </div>
  );
}












