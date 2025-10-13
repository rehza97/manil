import { AuditFields, PaginatedResponse } from "@/shared/types";

export enum TicketStatus {
  OPEN = "open",
  IN_PROGRESS = "in_progress",
  RESOLVED = "resolved",
  CLOSED = "closed",
}

export enum TicketPriority {
  LOW = "low",
  MEDIUM = "medium",
  HIGH = "high",
  URGENT = "urgent",
}

export interface Ticket extends AuditFields {
  id: string;
  title: string;
  description: string;
  status: TicketStatus;
  priority: TicketPriority;
  customerId: string;
  assignedTo?: string;
}

export interface CreateTicketDTO {
  title: string;
  description: string;
  priority: TicketPriority;
  customerId: string;
}

export interface UpdateTicketDTO extends Partial<CreateTicketDTO> {
  status?: TicketStatus;
  assignedTo?: string;
}

export type TicketListResponse = PaginatedResponse<Ticket>;
