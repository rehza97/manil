/**
 * VPS Hosting Service
 *
 * API service for VPS hosting operations.
 * Uses centralized API client from @/shared/api/client
 *
 * @module modules/hosting/services/vpsService
 */

import { apiClient } from "@/shared/api/client";
import type {
  VPSPlan,
  VPSPlanListResponse,
  VPSSubscription,
  VPSSubscriptionDetail,
  VPSSubscriptionListResponse,
  ContainerStats,
  TimelineEvent,
  MonitoringOverview,
  Alert,
  CreateVPSRequestBody,
  UpgradeSubscriptionBody,
  CancelSubscriptionBody,
  SuspendSubscriptionBody,
  RejectRequestBody,
  UpgradeResponse,
  ContainerActionResponse,
  QuoteResponse,
  SubscriptionStatus,
  CustomDockerImage,
  CustomImageListResponse,
  ImageBuildLog,
  ImageBuildStatus,
} from "../types";

/**
 * VPS Hosting service - provides comprehensive VPS management
 */
export const vpsService = {
  // ============================================================================
  // VPS Plans
  // ============================================================================

  /**
   * Get all available VPS plans
   */
  async getPlans(isActive?: boolean): Promise<VPSPlanListResponse> {
    const params: any = {};
    if (isActive !== undefined) {
      params.is_active = isActive;
    }
    const response = await apiClient.get("/hosting/plans", { params });
    return response.data;
  },

  /**
   * Get VPS plan by ID
   */
  async getPlan(planId: string): Promise<VPSPlan> {
    const response = await apiClient.get(`/hosting/plans/${planId}`);
    return response.data;
  },

  // ============================================================================
  // Admin: VPS Plan Management
  // ============================================================================

  /**
   * Get all VPS plans (admin view - includes inactive)
   */
  async getAllPlans(isActive?: boolean): Promise<VPSPlan[]> {
    const params: any = {};
    if (isActive !== undefined) {
      params.is_active = isActive;
    }
    const response = await apiClient.get("/hosting/admin/plans", { params });
    return response.data;
  },

  /**
   * Get VPS plan by ID (admin view)
   */
  async getPlanAdmin(planId: string): Promise<VPSPlan> {
    const response = await apiClient.get(`/hosting/admin/plans/${planId}`);
    return response.data;
  },

  /**
   * Create new VPS plan (admin only)
   */
  async createPlan(data: any): Promise<VPSPlan> {
    const response = await apiClient.post("/hosting/admin/plans", data);
    return response.data;
  },

  /**
   * Update VPS plan (admin only)
   */
  async updatePlan(planId: string, data: any): Promise<VPSPlan> {
    const response = await apiClient.put(`/hosting/admin/plans/${planId}`, data);
    return response.data;
  },

  /**
   * Delete VPS plan (admin only)
   */
  async deletePlan(planId: string): Promise<void> {
    await apiClient.delete(`/hosting/admin/plans/${planId}`);
  },

  /**
   * Activate VPS plan (admin only)
   */
  async activatePlan(planId: string): Promise<VPSPlan> {
    const response = await apiClient.patch(`/hosting/admin/plans/${planId}/activate`);
    return response.data;
  },

  /**
   * Deactivate VPS plan (admin only)
   */
  async deactivatePlan(planId: string): Promise<VPSPlan> {
    const response = await apiClient.patch(`/hosting/admin/plans/${planId}/deactivate`);
    return response.data;
  },

  // ============================================================================
  // Client Subscription Methods
  // ============================================================================

  /**
   * Request a new VPS (creates quote for admin approval)
   */
  async requestVPS(body: CreateVPSRequestBody): Promise<QuoteResponse> {
    const response = await apiClient.post("/hosting/subscriptions/request", body);
    return response.data;
  },

  /**
   * Get my VPS subscriptions with pagination and filters
   */
  async getMySubscriptions(params?: {
    status?: SubscriptionStatus;
    page?: number;
    page_size?: number;
  }): Promise<VPSSubscriptionListResponse> {
    const response = await apiClient.get("/hosting/subscriptions", { params });
    return response.data;
  },

  /**
   * Get subscription details by ID
   */
  async getSubscription(subscriptionId: string): Promise<VPSSubscriptionDetail> {
    const response = await apiClient.get(`/hosting/subscriptions/${subscriptionId}`);
    return response.data;
  },

  /**
   * Upgrade subscription to higher-tier plan
   */
  async upgradeSubscription(
    subscriptionId: string,
    body: UpgradeSubscriptionBody
  ): Promise<UpgradeResponse> {
    const response = await apiClient.post(
      `/hosting/subscriptions/${subscriptionId}/upgrade`,
      body
    );
    return response.data;
  },

  /**
   * Cancel subscription
   */
  async cancelSubscription(
    subscriptionId: string,
    body: CancelSubscriptionBody
  ): Promise<VPSSubscription> {
    const response = await apiClient.post(
      `/hosting/subscriptions/${subscriptionId}/cancel`,
      body
    );
    return response.data;
  },

  // ============================================================================
  // Container Control Methods
  // ============================================================================

  /**
   * Start stopped container
   */
  async startContainer(subscriptionId: string): Promise<ContainerActionResponse> {
    const response = await apiClient.post(`/hosting/instances/${subscriptionId}/start`);
    return response.data;
  },

  /**
   * Stop running container
   */
  async stopContainer(subscriptionId: string): Promise<ContainerActionResponse> {
    const response = await apiClient.post(`/hosting/instances/${subscriptionId}/stop`);
    return response.data;
  },

  /**
   * Reboot container
   */
  async rebootContainer(subscriptionId: string): Promise<ContainerActionResponse> {
    const response = await apiClient.post(`/hosting/instances/${subscriptionId}/reboot`);
    return response.data;
  },

  // ============================================================================
  // Metrics & Stats Methods
  // ============================================================================

  /**
   * Get container stats with history
   */
  async getContainerStats(
    subscriptionId: string,
    hours: number = 24
  ): Promise<ContainerStats> {
    const response = await apiClient.get(
      `/hosting/instances/${subscriptionId}/stats`,
      { params: { hours } }
    );
    return response.data;
  },

  /**
   * Get container logs
   */
  async getContainerLogs(
    subscriptionId: string,
    tail: number = 100
  ): Promise<{ logs: string }> {
    const response = await apiClient.get(
      `/hosting/instances/${subscriptionId}/logs`,
      { params: { tail } }
    );
    return response.data;
  },

  // ============================================================================
  // Command Execution (Client)
  // ============================================================================

  /**
   * Execute command in VPS container (client - own instances only)
   */
  async execCommand(
    subscriptionId: string,
    command: string,
    tty: boolean = false
  ): Promise<{ exit_code: number; output: string; command: string; executed_at: string }> {
    const response = await apiClient.post(
      `/hosting/instances/${subscriptionId}/exec`,
      { command, tty }
    );
    return response.data;
  },

  /**
   * Get container credentials including decrypted password
   */
  async getContainerCredentials(
    subscriptionId: string
  ): Promise<{
    ip_address: string;
    ssh_port: number;
    hostname: string;
    root_password: string;
    ssh_connection_string: string;
  }> {
    const response = await apiClient.get(
      `/hosting/instances/${subscriptionId}/credentials`
    );
    return response.data;
  },

  // ============================================================================
  // Docker Management (Client)
  // ============================================================================

  /**
   * Install Docker and docker-compose in VPS container
   * Uses fetch instead of axios to avoid timeout (Docker installation can take several minutes)
   */
  async installDocker(subscriptionId: string): Promise<{
    success: boolean;
    docker_version?: string;
    compose_version?: string;
    logs?: string[];
    installed_at?: string;
  }> {
    const token = sessionStorage.getItem("access_token") || localStorage.getItem("access_token");
    const baseUrl = apiClient.defaults.baseURL || "";
    const url = `${baseUrl}/hosting/instances/${subscriptionId}/docker/install`;
    
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      // No timeout - Docker installation can take several minutes
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ detail: response.statusText }));
      throw new Error(errorData.detail || `HTTP error! status: ${response.status}`);
    }
    
    return await response.json();
  },

  /**
   * Run docker-compose command in VPS container
   */
  async runDockerCompose(
    subscriptionId: string,
    composeFile: string = "docker-compose.yml",
    command: string = "up -d",
    workingDir: string = "/data"
  ): Promise<{
    success: boolean;
    exit_code: number;
    output: string;
    command: string;
    executed_at: string;
  }> {
    const formData = new FormData();
    formData.append("compose_file", composeFile);
    formData.append("command", command);
    formData.append("working_dir", workingDir);

    const response = await apiClient.post(
      `/hosting/instances/${subscriptionId}/docker/compose`,
      formData,
      {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      }
    );
    return response.data;
  },

  // ============================================================================
  // Timeline Methods
  // ============================================================================

  /**
   * Get subscription timeline events
   */
  async getTimeline(subscriptionId: string): Promise<TimelineEvent[]> {
    const response = await apiClient.get(
      `/hosting/subscriptions/${subscriptionId}/timeline`
    );
    return response.data;
  },

  // ============================================================================
  // Admin: Pending Requests
  // ============================================================================

  /**
   * Get pending VPS requests
   */
  async getPendingRequests(params?: {
    page?: number;
    page_size?: number;
  }): Promise<VPSSubscriptionListResponse> {
    const response = await apiClient.get("/hosting/admin/requests/pending", { params });
    return response.data;
  },

  /**
   * Approve VPS request
   */
  async approveRequest(subscriptionId: string): Promise<VPSSubscription> {
    const response = await apiClient.post(
      `/hosting/admin/requests/${subscriptionId}/approve`
    );
    return response.data;
  },

  /**
   * Reject VPS request
   */
  async rejectRequest(subscriptionId: string, reason: string): Promise<{ status: string }> {
    const response = await apiClient.post(
      `/hosting/admin/requests/${subscriptionId}/reject`,
      { reason }
    );
    return response.data;
  },

  // ============================================================================
  // Admin: All Subscriptions
  // ============================================================================

  /**
   * Get all VPS subscriptions (admin view)
   */
  async getAllSubscriptions(params?: {
    status?: SubscriptionStatus;
    customer_id?: string;
    plan_id?: string;
    page?: number;
    page_size?: number;
  }): Promise<VPSSubscriptionListResponse> {
    const response = await apiClient.get("/hosting/admin/subscriptions", { params });
    return response.data;
  },

  /**
   * Get subscription details (admin view)
   */
  async getSubscriptionAdmin(subscriptionId: string): Promise<VPSSubscriptionDetail> {
    const response = await apiClient.get(`/hosting/admin/subscriptions/${subscriptionId}`);
    return response.data;
  },

  /**
   * Get container stats + history (admin view)
   */
  async getSubscriptionStatsAdmin(
    subscriptionId: string,
    hours: number = 24
  ): Promise<ContainerStats> {
    const response = await apiClient.get(
      `/hosting/admin/subscriptions/${subscriptionId}/stats`,
      { params: { hours } }
    );
    return response.data;
  },

  /**
   * Create subscription for a customer (admin only)
   */
  async createSubscriptionAdmin(data: { customer_id: string; plan_id: string; os_distro_id?: string }): Promise<VPSSubscription> {
    const response = await apiClient.post("/hosting/admin/subscriptions/create", data);
    return response.data;
  },

  /**
   * List supported distros (admin)
   */
  async getSupportedDistrosAdmin(): Promise<
    Array<{ id: string; label: string; docker_image: string; description?: string }>
  > {
    const response = await apiClient.get("/hosting/admin/distros");
    return response.data;
  },

  /**
   * Get image download status (admin)
   */
  async getImageDownloadStatusAdmin(subscriptionId: string): Promise<{
    subscription_id: string;
    status: string;
    download_status?: string | null;
    progress: number;
    updated_at?: string | null;
    logs: string;
    os_distro_id?: string | null;
    os_docker_image?: string | null;
  }> {
    const response = await apiClient.get(
      `/hosting/admin/subscriptions/${subscriptionId}/download-status`
    );
    return response.data;
  },

  /**
   * Suspend subscription (admin action)
   */
  async suspendSubscription(
    subscriptionId: string,
    reason: string
  ): Promise<VPSSubscription> {
    const response = await apiClient.post(
      `/hosting/admin/subscriptions/${subscriptionId}/suspend`,
      { reason }
    );
    return response.data;
  },

  /**
   * Reactivate suspended subscription (admin action)
   */
  async reactivateSubscription(subscriptionId: string): Promise<VPSSubscription> {
    const response = await apiClient.post(
      `/hosting/admin/subscriptions/${subscriptionId}/reactivate`
    );
    return response.data;
  },

  /**
   * Terminate subscription permanently (admin action)
   */
  async terminateSubscription(
    subscriptionId: string,
    removeVolumes: boolean = true
  ): Promise<{ status: string }> {
    const response = await apiClient.delete(
      `/hosting/admin/subscriptions/${subscriptionId}`,
      { params: { remove_volumes: removeVolumes } }
    );
    return response.data;
  },

  // ============================================================================
  // Admin: Monitoring
  // ============================================================================

  /**
   * Get monitoring overview (system-wide metrics)
   */
  async getMonitoringOverview(): Promise<MonitoringOverview> {
    const response = await apiClient.get("/hosting/admin/monitoring/overview");
    return response.data;
  },

  /**
   * Get active alerts
   */
  async getAlerts(severity?: string): Promise<Alert[]> {
    const params: any = {};
    if (severity) {
      params.severity = severity;
    }
    const response = await apiClient.get("/hosting/admin/monitoring/alerts", { params });
    return response.data;
  },

  // ============================================================================
  // Custom Docker Images
  // ============================================================================

  /**
   * Upload custom Docker image project
   */
  async uploadCustomImage(
    file: File,
    metadata: {
      image_name?: string;
      image_tag?: string;
      dockerfile_path?: string;
      build_args?: Record<string, string>;
      subscription_id?: string;
    }
  ): Promise<CustomDockerImage> {
    const formData = new FormData();
    formData.append("file", file);
    if (metadata.image_name) formData.append("image_name", metadata.image_name);
    if (metadata.image_tag) formData.append("image_tag", metadata.image_tag);
    if (metadata.dockerfile_path) formData.append("dockerfile_path", metadata.dockerfile_path);
    if (metadata.build_args) formData.append("build_args", JSON.stringify(metadata.build_args));
    if (metadata.subscription_id) formData.append("subscription_id", metadata.subscription_id);

    const response = await apiClient.post("/hosting/custom-images/upload", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return response.data;
  },

  /**
   * List custom Docker images
   */
  async listCustomImages(filters?: {
    page?: number;
    page_size?: number;
    status?: ImageBuildStatus;
    subscription_id?: string;
  }): Promise<CustomImageListResponse> {
    const response = await apiClient.get("/hosting/custom-images", { params: filters });
    return response.data;
  },

  /**
   * Get custom Docker image details
   */
  async getCustomImage(imageId: string): Promise<CustomDockerImage> {
    const response = await apiClient.get(`/hosting/custom-images/${imageId}`);
    return response.data;
  },

  /**
   * Get build logs for custom Docker image
   */
  async getImageBuildLogs(imageId: string, step?: string): Promise<ImageBuildLog[]> {
    const params: any = {};
    if (step) {
      params.step = step;
    }
    const response = await apiClient.get(`/hosting/custom-images/${imageId}/logs`, { params });
    return response.data;
  },

  /**
   * Rebuild custom Docker image
   */
  async rebuildCustomImage(
    imageId: string,
    buildArgs?: Record<string, string>
  ): Promise<CustomDockerImage> {
    const response = await apiClient.post(`/hosting/custom-images/${imageId}/rebuild`, {
      build_args: buildArgs,
    });
    return response.data;
  },

  /**
   * Delete custom Docker image
   */
  async deleteCustomImage(imageId: string): Promise<void> {
    await apiClient.delete(`/hosting/custom-images/${imageId}`);
  },

  /**
   * Approve or reject custom Docker image (admin only)
   */
  async approveOrRejectImage(
    imageId: string,
    approved: boolean,
    reason?: string
  ): Promise<CustomDockerImage> {
    const response = await apiClient.post(`/hosting/custom-images/${imageId}/approve`, {
      approved,
      reason,
    });
    return response.data;
  },

  // ============================================================================
  // Command Execution (Admin)
  // ============================================================================

  /**
   * Execute command in VPS container (admin)
   */
  async execCommandAdmin(
    subscriptionId: string,
    command: string,
    tty: boolean = false
  ): Promise<{ exit_code: number; output: string; command: string; executed_at: string }> {
    const response = await apiClient.post(
      `/hosting/admin/subscriptions/${subscriptionId}/exec`,
      { command, tty }
    );
    return response.data;
  },

  // ============================================================================
  // File Deployment (Client)
  // ============================================================================

  /**
   * Deploy files directly to VPS container (client - own instances only)
   */
  async deployFiles(
    subscriptionId: string,
    file: File,
    targetPath: string = "/data"
  ): Promise<{
    success: boolean;
    subscription_id: string;
    target_path: string;
    files_deployed: number;
    archive_size: number;
    deployed_at: string;
    logs?: string[];
    error?: string;
  }> {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("target_path", targetPath);

    const response = await apiClient.post(
      `/hosting/instances/${subscriptionId}/deploy/files`,
      formData,
      {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      }
    );
    return response.data;
  },

  // ============================================================================
  // File Deployment (Admin)
  // ============================================================================

  /**
   * Deploy files directly to VPS container (admin)
   */
  async deployFilesAdmin(
    subscriptionId: string,
    file: File,
    targetPath: string = "/data"
  ): Promise<{
    subscription_id: string;
    success: boolean;
    target_path: string;
    files_deployed: number;
    archive_size: number;
    deployed_at: string;
  }> {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("target_path", targetPath);

    const response = await apiClient.post(
      `/hosting/admin/subscriptions/${subscriptionId}/deploy/files`,
      formData,
      {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      }
    );
    return response.data;
  },

  /**
   * Trigger custom image build for VPS (admin)
   */
  async triggerBuildDeployAdmin(
    subscriptionId: string,
    file: File,
    imageName?: string,
    imageTag: string = "latest",
    dockerfilePath: string = "Dockerfile",
    buildArgs?: Record<string, string>
  ): Promise<{
    subscription_id: string;
    image_id: string;
    image_name: string;
    image_tag: string;
    status: string;
    build_triggered_at: string;
    message: string;
  }> {
    const formData = new FormData();
    formData.append("file", file);
    if (imageName) formData.append("image_name", imageName);
    formData.append("image_tag", imageTag);
    formData.append("dockerfile_path", dockerfilePath);
    if (buildArgs) {
      formData.append("build_args", JSON.stringify(buildArgs));
    }

    const response = await apiClient.post(
      `/hosting/admin/subscriptions/${subscriptionId}/deploy/build`,
      formData,
      {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      }
    );
    return response.data;
  },
};

