import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { productService } from "../services";
import type { CreateProductDTO, UpdateProductDTO } from "../types";

export const useProducts = (page = 1, pageSize = 20) => {
  return useQuery({
    queryKey: ["products", page, pageSize],
    queryFn: () => productService.getAll(page, pageSize),
  });
};

export const useProduct = (id: string) => {
  return useQuery({
    queryKey: ["products", id],
    queryFn: () => productService.getById(id),
    enabled: !!id,
  });
};

export const useCreateProduct = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateProductDTO) => productService.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
    },
  });
};

export const useUpdateProduct = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateProductDTO }) =>
      productService.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
    },
  });
};
