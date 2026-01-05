/**
 * MSW (Mock Service Worker) handlers for VPS Hosting API endpoints.
 * 
 * Mocks all API responses for testing.
 */
import { http, HttpResponse } from "msw";
import type { VPSPlan, VPSSubscription, ContainerStats, TimelineEvent, Alert, MonitoringOverview } from "@/modules/hosting/types";

const API_BASE = "/api/v1/hosting";

// Mock data
const mockPlans: VPSPlan[] = [
  {
    id: "plan-1",
    name: "Starter VPS",
    slug: "starter",
    description: "Entry-level VPS",
    cpu_cores: 1.0,
    ram_gb: 2,
    storage_gb: 25,
    bandwidth_tb: 1.0,
    monthly_price: 10.0,
    setup_fee: 0.0,
    features: { ssh: true, ipv4: true },
    docker_image: "ubuntu:22.04",
    is_active: true,
    display_order: 0,
    created_at: "2024-01-01T00:00:00Z",
    updated_at: "2024-01-01T00:00:00Z",
  },
  {
    id: "plan-2",
    name: "Professional VPS",
    slug: "professional",
    description: "Mid-tier VPS",
    cpu_cores: 2.0,
    ram_gb: 4,
    storage_gb: 50,
    bandwidth_tb: 2.0,
    monthly_price: 20.0,
    setup_fee: 0.0,
    features: { ssh: true, ipv4: true, backup: true },
    docker_image: "ubuntu:22.04",
    is_active: true,
    display_order: 1,
    created_at: "2024-01-01T00:00:00Z",
    updated_at: "2024-01-01T00:00:00Z",
  },
];

const mockSubscriptions: VPSSubscription[] = [
  {
    id: "sub-1",
    subscription_number: "VPS-20241221-00001",
    customer_id: "user-1",
    plan_id: "plan-1",
    status: "ACTIVE",
    billing_cycle: "MONTHLY",
    auto_renew: true,
    grace_period_days: 7,
    total_invoiced: 10.0,
    total_paid: 10.0,
    is_trial: false,
    created_at: "2024-01-01T00:00:00Z",
    updated_at: "2024-01-01T00:00:00Z",
    plan: mockPlans[0],
    container: {
      id: "container-1",
      subscription_id: "sub-1",
      container_id: "docker-123",
      container_name: "vps-test",
      ip_address: "172.20.1.2",
      network_name: "vps-net-1",
      hostname: "vps.example.com",
      ssh_port: 2222,
      status: "RUNNING",
      cpu_limit: 1.0,
      memory_limit_gb: 2,
      storage_limit_gb: 25,
      data_volume_path: "/var/lib/vps/test",
      uptime_seconds: 86400,
      created_at: "2024-01-01T00:00:00Z",
      updated_at: "2024-01-01T00:00:00Z",
    },
  },
];

export const handlers = [
  // ===== VPS Plans =====
  http.get(`${API_BASE}/plans`, () => {
    return HttpResponse.json(mockPlans);
  }),

  http.get(`${API_BASE}/plans/:planId`, ({ params }) => {
    const plan = mockPlans.find((p) => p.id === params.planId);
    if (!plan) {
      return HttpResponse.json({ detail: "Plan not found" }, { status: 404 });
    }
    return HttpResponse.json(plan);
  }),

  // ===== VPS Subscriptions (Client) =====
  http.post(`${API_BASE}/subscriptions/request`, async ({ request }) => {
    const body = await request.json() as { plan_id: string };
    return HttpResponse.json({
      id: "quote-1",
      customer_id: "user-1",
      status: "PENDING",
      total_amount: 10.0,
      created_at: new Date().toISOString(),
    });
  }),

  http.get(`${API_BASE}/subscriptions`, ({ request }) => {
    const url = new URL(request.url);
    const page = parseInt(url.searchParams.get("page") || "1");
    const page_size = parseInt(url.searchParams.get("page_size") || "20");
    const status = url.searchParams.get("status");

    let filtered = mockSubscriptions;
    if (status) {
      filtered = filtered.filter((s) => s.status === status);
    }

    return HttpResponse.json({
      items: filtered.slice((page - 1) * page_size, page * page_size),
      total: filtered.length,
      page,
      page_size,
      total_pages: Math.ceil(filtered.length / page_size),
    });
  }),

  http.get(`${API_BASE}/subscriptions/:subscriptionId`, ({ params }) => {
    const subscription = mockSubscriptions.find((s) => s.id === params.subscriptionId);
    if (!subscription) {
      return HttpResponse.json({ detail: "Subscription not found" }, { status: 404 });
    }
    return HttpResponse.json(subscription);
  }),

  http.post(`${API_BASE}/subscriptions/:subscriptionId/upgrade`, async ({ params, request }) => {
    const body = await request.json() as { new_plan_id: string };
    return HttpResponse.json({
      subscription: { ...mockSubscriptions[0], plan_id: body.new_plan_id },
      prorated_amount: 5.0,
      message: "Upgrade successful",
    });
  }),

  http.post(`${API_BASE}/subscriptions/:subscriptionId/cancel`, async ({ request }) => {
    const body = await request.json() as { immediate: boolean; reason: string };
    return HttpResponse.json({
      ...mockSubscriptions[0],
      status: body.immediate ? "TERMINATED" : "CANCELLED",
    });
  }),

  // ===== Container Control =====
  http.post(`${API_BASE}/instances/:subscriptionId/start`, () => {
    return HttpResponse.json({
      success: true,
      message: "Container started",
      container_status: "RUNNING",
      action_timestamp: new Date().toISOString(),
    });
  }),

  http.post(`${API_BASE}/instances/:subscriptionId/stop`, () => {
    return HttpResponse.json({
      success: true,
      message: "Container stopped",
      container_status: "STOPPED",
      action_timestamp: new Date().toISOString(),
    });
  }),

  http.post(`${API_BASE}/instances/:subscriptionId/reboot`, () => {
    return HttpResponse.json({
      success: true,
      message: "Container rebooting",
      container_status: "REBOOTING",
      action_timestamp: new Date().toISOString(),
    });
  }),

  // ===== Metrics & Stats =====
  http.get(`${API_BASE}/instances/:subscriptionId/stats`, ({ request }) => {
    const url = new URL(request.url);
    const hours = parseInt(url.searchParams.get("hours") || "24");

    return HttpResponse.json({
      current: {
        cpu_percent: 45.5,
        memory_percent: 50.0,
        storage_percent: 20.0,
        network_rx_mb: 1.0,
        network_tx_mb: 0.5,
        uptime: "1 day",
        status: "RUNNING",
      },
      history: Array.from({ length: 10 }, (_, i) => ({
        id: `metric-${i}`,
        subscription_id: "sub-1",
        container_id: "container-1",
        cpu_usage_percent: 30 + i * 2,
        memory_usage_mb: 512 + i * 10,
        memory_usage_percent: 25 + i,
        storage_usage_mb: 2560,
        storage_usage_percent: 10,
        network_rx_bytes: 1000000 + i * 100000,
        network_tx_bytes: 500000 + i * 50000,
        block_read_bytes: 2000000,
        block_write_bytes: 1000000,
        process_count: 5,
        recorded_at: new Date(Date.now() - i * 3600000).toISOString(),
      })),
    });
  }),

  http.get(`${API_BASE}/instances/:subscriptionId/logs`, ({ request }) => {
    const url = new URL(request.url);
    const tail = parseInt(url.searchParams.get("tail") || "100");
    return HttpResponse.json({
      logs: "Container logs here...\nLine 1\nLine 2\nLine 3",
    });
  }),

  // ===== Timeline =====
  http.get(`${API_BASE}/subscriptions/:subscriptionId/timeline`, () => {
    return HttpResponse.json([
      {
        id: "event-1",
        subscription_id: "sub-1",
        event_type: "CREATED",
        event_description: "VPS subscription request created",
        actor_type: "CUSTOMER",
        created_at: "2024-01-01T00:00:00Z",
      },
      {
        id: "event-2",
        subscription_id: "sub-1",
        event_type: "APPROVED",
        event_description: "VPS request approved by admin",
        actor_type: "ADMIN",
        created_at: "2024-01-01T01:00:00Z",
      },
    ]);
  }),

  // ===== Admin: Pending Requests =====
  http.get(`${API_BASE}/admin/requests/pending`, ({ request }) => {
    const url = new URL(request.url);
    const page = parseInt(url.searchParams.get("page") || "1");
    const page_size = parseInt(url.searchParams.get("page_size") || "20");

    const pending = mockSubscriptions.filter((s) => s.status === "PENDING");

    return HttpResponse.json({
      items: pending.slice((page - 1) * page_size, page * page_size),
      total: pending.length,
      page,
      page_size,
      total_pages: Math.ceil(pending.length / page_size),
    });
  }),

  http.post(`${API_BASE}/admin/requests/:subscriptionId/approve`, () => {
    return HttpResponse.json({
      ...mockSubscriptions[0],
      status: "PROVISIONING",
    });
  }),

  http.post(`${API_BASE}/admin/requests/:subscriptionId/reject`, async ({ request }) => {
    const body = await request.json() as { reason: string };
    return HttpResponse.json({ status: "rejected" });
  }),

  // ===== Admin: All Subscriptions =====
  http.get(`${API_BASE}/admin/subscriptions`, ({ request }) => {
    const url = new URL(request.url);
    const page = parseInt(url.searchParams.get("page") || "1");
    const page_size = parseInt(url.searchParams.get("page_size") || "20");

    return HttpResponse.json({
      items: mockSubscriptions.slice((page - 1) * page_size, page * page_size),
      total: mockSubscriptions.length,
      page,
      page_size,
      total_pages: Math.ceil(mockSubscriptions.length / page_size),
    });
  }),

  http.post(`${API_BASE}/admin/subscriptions/:subscriptionId/suspend`, async ({ request }) => {
    const body = await request.json() as { reason: string };
    return HttpResponse.json({
      ...mockSubscriptions[0],
      status: "SUSPENDED",
      status_reason: body.reason,
    });
  }),

  http.post(`${API_BASE}/admin/subscriptions/:subscriptionId/reactivate`, () => {
    return HttpResponse.json({
      ...mockSubscriptions[0],
      status: "ACTIVE",
      status_reason: null,
    });
  }),

  http.delete(`${API_BASE}/admin/subscriptions/:subscriptionId`, () => {
    return HttpResponse.json({ status: "terminated" });
  }),

  // ===== Admin: Monitoring =====
  http.get(`${API_BASE}/admin/monitoring/overview`, () => {
    return HttpResponse.json({
      total_subscriptions: 10,
      active_containers: 8,
      total_monthly_revenue: 150.0,
      avg_cpu_usage: 45.5,
      avg_memory_usage: 50.0,
      alerts: [],
    });
  }),

  http.get(`${API_BASE}/admin/monitoring/alerts`, ({ request }) => {
    const url = new URL(request.url);
    const severity = url.searchParams.get("severity");

    const alerts: Alert[] = [
      {
        type: "CPU_HIGH",
        severity: "HIGH",
        message: "CPU usage above 90% for 10+ minutes",
        current_value: 92.5,
        threshold: 90.0,
        subscription_id: "sub-1",
        subscription_number: "VPS-20241221-00001",
      },
    ];

    const filtered = severity
      ? alerts.filter((a) => a.severity === severity.toUpperCase())
      : alerts;

    return HttpResponse.json(filtered);
  }),
];








