import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { CustomerList } from "../components";

export function CustomersPage() {
  const navigate = useNavigate();

  const handleCreate = () => {
    navigate("/customers/new");
  };

  const handleEdit = (id: string) => {
    navigate(`/customers/${id}/edit`);
  };

  const handleView = (id: string) => {
    navigate(`/customers/${id}`);
  };

  return (
    <div className="container mx-auto py-6">
      <CustomerList
        onCreate={handleCreate}
        onEdit={handleEdit}
        onView={handleView}
      />
    </div>
  );
}
