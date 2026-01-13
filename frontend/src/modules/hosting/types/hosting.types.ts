/**
 * VPS Hosting TypeScript Types
 *
 * Type definitions for VPS hosting module matching backend schemas.
 */


// ============================================================================
// Enums
// ============================================================================

export enum SubscriptionStatus {
  PENDING = "PENDING",
  DOWNLOADING_IMAGE = "DOWNLOADING_IMAGE",
  PROVISIONING = "PROVISIONING",
  ACTIVE = "ACTIVE",
  SUSPENDED = "SUSPENDED",
  CANCELLED = "CANCELLED",
  TERMINATED = "TERMINATED",
}

export enum ContainerStatus {
  CREATING = "CREATING",
  RUNNING = "RUNNING",
  STOPPED = "STOPPED",
  REBOOTING = "REBOOTING",
  ERROR = "ERROR",
  TERMINATED = "TERMINATED",
}

export enum BillingCycle {
  MONTHLY = "MONTHLY",
  QUARTERLY = "QUARTERLY",
  ANNUALLY = "ANNUALLY",
}

export enum TimelineEventType {
  CREATED = "CREATED",
  APPROVED = "APPROVED",
  PROVISIONED = "PROVISIONED",
  STARTED = "STARTED",
  STOPPED = "STOPPED",
  REBOOTED = "REBOOTED",
  UPGRADED = "UPGRADED",
  DOWNGRADED = "DOWNGRADED",
  SUSPENDED = "SUSPENDED",
  REACTIVATED = "REACTIVATED",
  CANCELLED = "CANCELLED",
  TERMINATED = "TERMINATED",
  PAYMENT_RECEIVED = "PAYMENT_RECEIVED",
  PAYMENT_OVERDUE = "PAYMENT_OVERDUE",
  INVOICE_GENERATED = "INVOICE_GENERATED",
}

export enum ActorType {
  CUSTOMER = "CUSTOMER",
  ADMIN = "ADMIN",
  SYSTEM = "SYSTEM",
}

// ============================================================================
// Core Interfaces
// ============================================================================

export interface VPSPlan {
  id: string;
  name: string;
  slug: string;
  description?: string;
  cpu_cores: number;
  ram_gb: number;
  storage_gb: number;
  bandwidth_tb: number;
  monthly_price: number;
  setup_fee: number;
  features: Record<string, any>;
  docker_image: string;
  is_active: boolean;
  display_order: number;
  created_at: string;
  updated_at: string;
}

export interface VPSPlanCreate {
  name: string;
  slug: string;
  description?: string;
  cpu_cores: number;
  ram_gb: number;
  storage_gb: number;
  bandwidth_tb: number;
  monthly_price: number;
  setup_fee?: number;
  features?: Record<string, any>;
  docker_image: string;
  is_active?: boolean;
  display_order?: number;
}

export interface VPSPlanUpdate {
  name?: string;
  slug?: string;
  description?: string;
  cpu_cores?: number;
  ram_gb?: number;
  storage_gb?: number;
  bandwidth_tb?: number;
  monthly_price?: number;
  setup_fee?: number;
  features?: Record<string, any>;
  docker_image?: string;
  is_active?: boolean;
  display_order?: number;
}

export interface ContainerInstance {
  id: string;
  subscription_id: string;
  container_id: string;
  container_name: string;
  ip_address: string;
  network_name: string;
  hostname: string;
  ssh_port: number;
  ssh_public_key?: string;
  status: ContainerStatus;
  cpu_limit: number;
  memory_limit_gb: number;
  storage_limit_gb: number;
  data_volume_path: string;
  first_started_at?: string;
  last_started_at?: string;
  last_stopped_at?: string;
  uptime_seconds: number;
  created_at: string;
  updated_at: string;
}

export interface ContainerCredentials {
  ip_address: string;
  ssh_port: number;
  hostname: string;
  root_password: string;
  ssh_connection_string: string;
}

export interface ContainerMetrics {
  id: string;
  subscription_id: string;
  container_id: string;
  cpu_usage_percent: number;
  memory_usage_mb: number;
  memory_usage_percent: number;
  storage_usage_mb: number;
  storage_usage_percent: number;
  network_rx_bytes: number;
  network_tx_bytes: number;
  block_read_bytes: number;
  block_write_bytes: number;
  process_count?: number;
  recorded_at: string;
}

export interface VPSSubscription {
  id: string;
  subscription_number: string;
  customer_id: string;
  plan_id: string;
  quote_id?: string;
  status: SubscriptionStatus;
  status_reason?: string;
  start_date?: string;
  next_billing_date?: string;
  last_billed_date?: string;
  cancelled_at?: string;
  terminated_at?: string;
  is_trial: boolean;
  trial_ends_at?: string;
  auto_renew: boolean;
  grace_period_days: number;
  total_invoiced: number;
  total_paid: number;
  approved_at?: string;
  approved_by_id?: string;
  os_distro_id?: string;
  os_docker_image?: string;
  image_download_status?: string;
  image_download_progress?: number;
  image_download_updated_at?: string;
  billing_cycle: BillingCycle;
  created_at: string;
  updated_at: string;
  
  // Relationships (optional)
  plan?: VPSPlan;
  container?: ContainerInstance;
  customer?: {
    id: string;
    full_name: string;
    email: string;
  };
}

export interface VPSSubscriptionDetail extends VPSSubscription {
  timeline?: TimelineEvent[];
  recent_metrics?: ContainerMetrics[];
}

// ============================================================================
// Response Types
// ============================================================================

export interface ContainerStats {
  current: {
    current_stats?: {
      cpu_usage_percent: number;
      memory_usage_mb: number;
      memory_usage_percent: number;
      storage_usage_mb: number;
      storage_usage_percent: number;
      network_rx_bytes: number;
      network_tx_bytes: number;
      block_read_bytes: number;
      block_write_bytes: number;
      process_count?: number;
    };
    container_status: ContainerStatus;
    docker_state?: string;
    uptime_seconds: number;
    last_updated: string;
    error?: string;
  };
  history: ContainerMetrics[];
}

export interface TimelineEvent {
  id: string;
  subscription_id: string;
  event_type: TimelineEventType;
  event_description: string;
  metadata?: Record<string, any>;
  actor_id?: string;
  actor_type: ActorType;
  created_at: string;
}

export interface VPSRequest {
  id: string;
  customer_name: string;
  customer_email: string;
  plan_name: string;
  plan_specs: string;
  requested_at: string;
  subscription_id: string;
}

export interface Alert {
  type: string;
  severity: "HIGH" | "CRITICAL";
  message: string;
  current_value: number;
  threshold: number;
  subscription_id?: string;
  subscription_number?: string;
}

export interface MonitoringOverview {
  total_subscriptions: number;
  active_containers: number;
  total_monthly_revenue: number;
  avg_cpu_usage: number;
  avg_memory_usage: number;
  alerts: Alert[];
}

// ============================================================================
// Request Types
// ============================================================================

export interface CreateVPSRequestBody {
  plan_id: string;
}

export interface UpgradeSubscriptionBody {
  new_plan_id: string;
  upgrade_immediately?: boolean;
}

export interface CancelSubscriptionBody {
  immediate: boolean;
  reason: string;
}

export interface SuspendSubscriptionBody {
  reason: string;
}

export interface RejectRequestBody {
  reason: string;
}

// ============================================================================
// Response Wrapper Types
// ============================================================================

export interface VPSSubscriptionListResponse {
  items: VPSSubscription[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

export type VPSPlanListResponse = VPSPlan[];

export interface UpgradeResponse {
  subscription: VPSSubscription;
  prorated_amount: number;
  message: string;
}

export interface ContainerActionResponse {
  success: boolean;
  message: string;
  container_status: ContainerStatus;
  action_timestamp: string;
}

export interface QuoteResponse {
  id: string;
  quote_number: string;
  customer_id: string;
  title: string;
  description?: string;
  version: number;
  parent_quote_id?: string;
  is_latest_version: boolean;
  status: string;
  subtotal_amount: number;
  tax_amount: number;
  tax_rate: number;
  discount_amount: number;
  total_amount: number;
  valid_from: string;
  valid_until: string;
  approval_required: boolean;
  sent_at?: string;
  accepted_at?: string;
  declined_at?: string;
  approved_by_id?: string;
  approved_at?: string;
  approval_notes?: string;
  notes?: string;
  terms_and_conditions?: string;
  created_at: string;
  updated_at: string;
  created_by_id: string;
  updated_by_id?: string;
  deleted_at?: string;
  items: Array<{
    id: string;
    quote_id: string;
    product_id?: string;
    item_name: string;
    description?: string;
    quantity: number;
    unit_price: number;
    discount_percentage: number;
    line_total: number;
    sort_order: number;
  }>;
}

// ============================================================================
// Custom Docker Images
// ============================================================================

export enum ImageBuildStatus {
  PENDING = "PENDING",
  VALIDATING = "VALIDATING",
  BUILDING = "BUILDING",
  SCANNING = "SCANNING",
  COMPLETED = "COMPLETED",
  FAILED = "FAILED",
  REJECTED = "REJECTED",
}

export interface SecurityScanResults {
  status: string;
  scan_date?: string;
  total_vulnerabilities: number;
  vulnerabilities_by_severity: {
    CRITICAL: number;
    HIGH: number;
    MEDIUM: number;
    LOW: number;
  };
  vulnerabilities: Array<{
    id: string;
    package: string;
    severity: string;
    title: string;
    fixed_version?: string;
  }>;
}

export interface CustomDockerImage {
  id: string;
  customer_id: string;
  subscription_id?: string;
  image_name: string;
  image_tag: string;
  docker_image_id?: string;
  upload_filename: string;
  upload_size_bytes: number;
  dockerfile_path: string;
  dockerfile_content?: string;
  build_args: Record<string, string>;
  status: ImageBuildStatus;
  build_started_at?: string;
  build_completed_at?: string;
  build_duration_seconds?: number;
  build_logs?: string;
  build_error?: string;
  image_size_mb?: number;
  base_image?: string;
  exposed_ports: number[];
  security_scan_results?: SecurityScanResults;
  scan_completed_at?: string;
  version: number;
  previous_version_id?: string;
  requires_approval: boolean;
  approved_at?: string;
  approved_by_id?: string;
  is_deleted: boolean;
  deleted_at?: string;
  created_at: string;
  updated_at: string;
}

export interface ImageBuildLog {
  id: string;
  image_id: string;
  timestamp: string;
  log_level: string;
  message: string;
  step?: string;
}

export interface CustomImageListResponse {
  items: CustomDockerImage[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

export interface CustomImageUploadRequest {
  file: File;
  image_name?: string;
  image_tag?: string;
  dockerfile_path?: string;
  build_args?: Record<string, string>;
  subscription_id?: string;
}

