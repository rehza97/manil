import React, { useState } from "react";
import {
  useQuoteRequests,
  useCreateQuoteRequest,
  useApproveQuoteRequest,
  useAcceptQuoteRequest,
  useRejectQuoteRequest,
  useDeleteQuoteRequest,
} from "../hooks/useQuotes";
import type { CreateQuoteRequestDTO } from "../types";

export const QuoteRequestPage: React.FC = () => {
  const [showForm, setShowForm] = useState(false);
  const [page, setPage] = useState(1);
  const [formData, setFormData] = useState<CreateQuoteRequestDTO>({
    title: "",
    description: "",
    quantity: 1,
    priority: "medium",
  });

  // Queries and mutations
  const { data: quoteData, isLoading } = useQuoteRequests(page);
  const createMutation = useCreateQuoteRequest();
  const approveMutation = useApproveQuoteRequest();
  const acceptMutation = useAcceptQuoteRequest();
  const rejectMutation = useRejectQuoteRequest();
  const deleteMutation = useDeleteQuoteRequest();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createMutation.mutateAsync(formData);
      setFormData({
        title: "",
        description: "",
        quantity: 1,
        priority: "medium",
      });
      setShowForm(false);
    } catch (error) {
      console.error("Failed to create quote:", error);
    }
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      pending: "bg-yellow-100 text-yellow-800",
      reviewed: "bg-blue-100 text-blue-800",
      quoted: "bg-purple-100 text-purple-800",
      accepted: "bg-green-100 text-green-800",
      rejected: "bg-red-100 text-red-800",
      expired: "bg-gray-100 text-gray-800",
      cancelled: "bg-gray-100 text-gray-800",
    };
    return colors[status] || "bg-gray-100 text-gray-800";
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Demandes de devis</h1>
          <button
            onClick={() => setShowForm(!showForm)}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
          >
            {showForm ? "Annuler" : "Demander un devis"}
          </button>
        </div>

        {showForm && (
          <div className="bg-white rounded-lg shadow p-6 mb-8">
            <h2 className="text-xl font-semibold mb-4">Nouvelle demande de devis</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Titre</label>
                <input
                  type="text"
                  required
                  value={formData.title}
                  onChange={(e) =>
                    setFormData({ ...formData, title: e.target.value })
                  }
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Description
                </label>
                <textarea
                  value={formData.description || ""}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
                  rows={4}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Quantity
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={formData.quantity}
                    onChange={(e) =>
                      setFormData({ ...formData, quantity: parseInt(e.target.value) })
                    }
                    className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Priorité
                  </label>
                  <select
                    value={formData.priority}
                    onChange={(e) =>
                      setFormData({ ...formData, priority: e.target.value as any })
                    }
                    className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
                  >
                    <option value="low">Basse</option>
                    <option value="medium">Moyenne</option>
                    <option value="high">Haute</option>
                    <option value="urgent">Urgente</option>
                  </select>
                </div>
              </div>

              <button
                type="submit"
                disabled={createMutation.isPending}
                className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {createMutation.isPending ? "Création…" : "Créer la demande"}
              </button>
            </form>
          </div>
        )}

        {/* Quotes List */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          {isLoading ? (
            <div className="p-6 text-center">Loading...</div>
          ) : quoteData?.data.length === 0 ? (
            <div className="p-6 text-center text-gray-500">
              No quote requests found
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="px-6 py-3 text-left text-sm font-medium text-gray-700">
                      Title
                    </th>
                    <th className="px-6 py-3 text-left text-sm font-medium text-gray-700">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-sm font-medium text-gray-700">
                      Priority
                    </th>
                    <th className="px-6 py-3 text-left text-sm font-medium text-gray-700">
                      Requested
                    </th>
                    <th className="px-6 py-3 text-left text-sm font-medium text-gray-700">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {quoteData?.data.map((quote) => (
                    <tr key={quote.id} className="border-b hover:bg-gray-50">
                      <td className="px-6 py-4 text-sm text-gray-900">
                        {quote.title}
                      </td>
                      <td className="px-6 py-4 text-sm">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(quote.status)}`}>
                          {quote.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900">
                        {quote.priority}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">
                        {new Date(quote.requested_at).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 text-sm">
                        <div className="flex gap-2">
                          {quote.status === "pending" && (
                            <>
                              <button
                                onClick={() => approveMutation.mutate(quote.id)}
                                className="px-2 py-1 bg-green-600 text-white rounded text-xs hover:bg-green-700"
                              >
                                Approuver
                              </button>
                              <button
                                onClick={() => rejectMutation.mutate(quote.id)}
                                className="px-2 py-1 bg-red-600 text-white rounded text-xs hover:bg-red-700"
                              >
                                Rejeter
                              </button>
                            </>
                          )}
                          {quote.status === "quoted" && (
                            <button
                              onClick={() => acceptMutation.mutate(quote.id)}
                              className="px-2 py-1 bg-green-600 text-white rounded text-xs hover:bg-green-700"
                            >
                              Accepter
                            </button>
                          )}
                          <button
                            onClick={() => deleteMutation.mutate(quote.id)}
                            className="px-2 py-1 bg-gray-600 text-white rounded text-xs hover:bg-gray-700"
                          >
                            Supprimer
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Pagination */}
        {quoteData && quoteData.total_pages > 1 && (
          <div className="flex justify-center gap-2 mt-6">
            <button
              onClick={() => setPage(Math.max(1, page - 1))}
              disabled={page === 1}
              className="px-4 py-2 border rounded-lg disabled:opacity-50"
            >
              Précédent
            </button>
            <span className="px-4 py-2">
              Page {page} / {quoteData.total_pages}
            </span>
            <button
              onClick={() => setPage(Math.min(quoteData.total_pages, page + 1))}
              disabled={page === quoteData.total_pages}
              className="px-4 py-2 border rounded-lg disabled:opacity-50"
            >
              Suivant
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
