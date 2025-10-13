import { useState } from "react";
import { useCustomers, useDeleteCustomer, useActivateCustomer, useSuspendCustomer } from "../hooks/useCustomers";
import { CustomerStatus, CustomerType } from "../types";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/shared/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";
import { Badge } from "@/shared/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/shared/components/ui/dropdown-menu";
import { MoreHorizontal, Plus, Search } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/components/ui/card";

interface CustomerListProps {
  onEdit?: (id: string) => void;
  onView?: (id: string) => void;
  onCreate?: () => void;
}

export function CustomerList({ onEdit, onView, onCreate }: CustomerListProps) {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<CustomerStatus | undefined>();
  const [typeFilter, setTypeFilter] = useState<CustomerType | undefined>();

  const { data, isLoading, error } = useCustomers(page, 20, {
    search,
    status: statusFilter,
    customerType: typeFilter,
  });

  const deleteCustomer = useDeleteCustomer();
  const activateCustomer = useActivateCustomer();
  const suspendCustomer = useSuspendCustomer();

  const getStatusBadge = (status: CustomerStatus) => {
    const variants = {
      [CustomerStatus.ACTIVE]: "default",
      [CustomerStatus.PENDING]: "secondary",
      [CustomerStatus.SUSPENDED]: "destructive",
      [CustomerStatus.INACTIVE]: "outline",
    } as const;

    return (
      <Badge variant={variants[status]}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  const handleDelete = async (id: string, name: string) => {
    if (window.confirm(`Are you sure you want to delete customer "${name}"?`)) {
      await deleteCustomer.mutateAsync(id);
    }
  };

  const handleActivate = async (id: string) => {
    await activateCustomer.mutateAsync(id);
  };

  const handleSuspend = async (id: string) => {
    await suspendCustomer.mutateAsync(id);
  };

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Error</CardTitle>
          <CardDescription>Failed to load customers</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Customers</CardTitle>
              <CardDescription>
                Manage your customer accounts and profiles
              </CardDescription>
            </div>
            {onCreate && (
              <Button onClick={onCreate}>
                <Plus className="mr-2 h-4 w-4" />
                Add Customer
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {/* Filters */}
          <div className="flex gap-4 mb-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name, email, or company..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select
              value={statusFilter}
              onValueChange={(value) =>
                setStatusFilter(value as CustomerStatus | undefined)
              }
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value={CustomerStatus.ACTIVE}>Active</SelectItem>
                <SelectItem value={CustomerStatus.PENDING}>Pending</SelectItem>
                <SelectItem value={CustomerStatus.SUSPENDED}>
                  Suspended
                </SelectItem>
                <SelectItem value={CustomerStatus.INACTIVE}>Inactive</SelectItem>
              </SelectContent>
            </Select>
            <Select
              value={typeFilter}
              onValueChange={(value) =>
                setTypeFilter(value as CustomerType | undefined)
              }
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value={CustomerType.INDIVIDUAL}>
                  Individual
                </SelectItem>
                <SelectItem value={CustomerType.CORPORATE}>Corporate</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Table */}
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Company</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center">
                      Loading...
                    </TableCell>
                  </TableRow>
                ) : data?.data.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center">
                      No customers found
                    </TableCell>
                  </TableRow>
                ) : (
                  data?.data.map((customer) => (
                    <TableRow key={customer.id}>
                      <TableCell className="font-medium">
                        {customer.name}
                      </TableCell>
                      <TableCell>{customer.email}</TableCell>
                      <TableCell>{customer.phone}</TableCell>
                      <TableCell>
                        {customer.customerType === CustomerType.CORPORATE
                          ? "Corporate"
                          : "Individual"}
                      </TableCell>
                      <TableCell>{getStatusBadge(customer.status)}</TableCell>
                      <TableCell>
                        {customer.companyName || "-"}
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="h-8 w-8 p-0">
                              <span className="sr-only">Open menu</span>
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Actions</DropdownMenuLabel>
                            {onView && (
                              <DropdownMenuItem
                                onClick={() => onView(customer.id)}
                              >
                                View Details
                              </DropdownMenuItem>
                            )}
                            {onEdit && (
                              <DropdownMenuItem
                                onClick={() => onEdit(customer.id)}
                              >
                                Edit
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuSeparator />
                            {customer.status !== CustomerStatus.ACTIVE && (
                              <DropdownMenuItem
                                onClick={() => handleActivate(customer.id)}
                              >
                                Activate
                              </DropdownMenuItem>
                            )}
                            {customer.status === CustomerStatus.ACTIVE && (
                              <DropdownMenuItem
                                onClick={() => handleSuspend(customer.id)}
                              >
                                Suspend
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={() =>
                                handleDelete(customer.id, customer.name)
                              }
                              className="text-destructive"
                            >
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          {data && data.totalPages > 1 && (
            <div className="flex items-center justify-between space-x-2 py-4">
              <div className="text-sm text-muted-foreground">
                Showing page {data.page} of {data.totalPages} ({data.total}{" "}
                total customers)
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(page - 1)}
                  disabled={page === 1}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(page + 1)}
                  disabled={page >= data.totalPages}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
