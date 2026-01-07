"""
Locust performance tests for VPS Hosting API endpoints.

Run with: locust -f locustfile.py --host=http://localhost:8000

Target: <500ms response time (95th percentile)
"""
from locust import HttpUser, task, between
import random
import uuid


class VPSHostingUser(HttpUser):
    """Simulates a client user interacting with VPS hosting endpoints."""
    
    wait_time = between(1, 3)  # Wait 1-3 seconds between requests
    
    def on_start(self):
        """Login and get auth token."""
        # Mock authentication - adjust based on your auth system
        self.token = "test-token"
        self.headers = {
            "Authorization": f"Bearer {self.token}",
            "Content-Type": "application/json",
        }
        self.subscription_id = None
    
    @task(3)
    def get_vps_plans(self):
        """Get list of VPS plans."""
        self.client.get(
            "/api/v1/hosting/plans",
            headers=self.headers,
            name="GET /api/v1/hosting/plans"
        )
    
    @task(2)
    def get_my_subscriptions(self):
        """Get my VPS subscriptions."""
        self.client.get(
            "/api/v1/hosting/subscriptions",
            headers=self.headers,
            params={"page": 1, "page_size": 20},
            name="GET /api/v1/hosting/subscriptions"
        )
    
    @task(1)
    def get_subscription_details(self):
        """Get subscription details."""
        if self.subscription_id:
            self.client.get(
                f"/api/v1/hosting/subscriptions/{self.subscription_id}",
                headers=self.headers,
                name="GET /api/v1/hosting/subscriptions/{id}"
            )
    
    @task(1)
    def get_container_stats(self):
        """Get container stats."""
        if self.subscription_id:
            self.client.get(
                f"/api/v1/hosting/instances/{self.subscription_id}/stats",
                headers=self.headers,
                params={"hours": 24},
                name="GET /api/v1/hosting/instances/{id}/stats"
            )
    
    @task(1)
    def request_vps(self):
        """Request a new VPS."""
        plan_id = str(uuid.uuid4())
        self.client.post(
            "/api/v1/hosting/subscriptions/request",
            headers=self.headers,
            json={"plan_id": plan_id},
            name="POST /api/v1/hosting/subscriptions/request"
        )


class VPSHostingAdminUser(HttpUser):
    """Simulates an admin user interacting with VPS hosting admin endpoints."""
    
    wait_time = between(2, 5)
    weight = 1  # Fewer admin users than regular users
    
    def on_start(self):
        """Login as admin."""
        self.token = "admin-token"
        self.headers = {
            "Authorization": f"Bearer {self.token}",
            "Content-Type": "application/json",
        }
    
    @task(3)
    def get_pending_requests(self):
        """Get pending VPS requests."""
        self.client.get(
            "/api/v1/hosting/admin/requests/pending",
            headers=self.headers,
            params={"page": 1, "page_size": 20},
            name="GET /api/v1/hosting/admin/requests/pending"
        )
    
    @task(2)
    def get_all_subscriptions(self):
        """Get all VPS subscriptions."""
        self.client.get(
            "/api/v1/hosting/admin/subscriptions",
            headers=self.headers,
            params={"page": 1, "page_size": 20},
            name="GET /api/v1/hosting/admin/subscriptions"
        )
    
    @task(1)
    def get_monitoring_overview(self):
        """Get monitoring overview."""
        self.client.get(
            "/api/v1/hosting/admin/monitoring/overview",
            headers=self.headers,
            name="GET /api/v1/hosting/admin/monitoring/overview"
        )
    
    @task(1)
    def get_alerts(self):
        """Get active alerts."""
        self.client.get(
            "/api/v1/hosting/admin/monitoring/alerts",
            headers=self.headers,
            name="GET /api/v1/hosting/admin/monitoring/alerts"
        )
    
    @task(1)
    def approve_request(self):
        """Approve a VPS request."""
        subscription_id = str(uuid.uuid4())
        self.client.post(
            f"/api/v1/hosting/admin/requests/{subscription_id}/approve",
            headers=self.headers,
            name="POST /api/v1/hosting/admin/requests/{id}/approve"
        )


class VPSHostingLoadTest(HttpUser):
    """Combined load test with both client and admin users."""
    
    wait_time = between(1, 3)
    
    def on_start(self):
        """Setup authentication."""
        self.token = "test-token"
        self.headers = {
            "Authorization": f"Bearer {self.token}",
            "Content-Type": "application/json",
        }
    
    @task(5)
    def get_plans(self):
        """High-frequency: Get plans."""
        self.client.get("/api/v1/hosting/plans", headers=self.headers)
    
    @task(3)
    def get_subscriptions(self):
        """Medium-frequency: Get subscriptions."""
        self.client.get(
            "/api/v1/hosting/subscriptions",
            headers=self.headers,
            params={"page": 1, "page_size": 20}
        )
    
    @task(2)
    def get_stats(self):
        """Medium-frequency: Get stats."""
        subscription_id = str(uuid.uuid4())
        self.client.get(
            f"/api/v1/hosting/instances/{subscription_id}/stats",
            headers=self.headers,
            params={"hours": 24}
        )
    
    @task(1)
    def control_container(self):
        """Low-frequency: Container control."""
        subscription_id = str(uuid.uuid4())
        actions = ["start", "stop", "reboot"]
        action = random.choice(actions)
        self.client.post(
            f"/api/v1/hosting/instances/{subscription_id}/{action}",
            headers=self.headers
        )









