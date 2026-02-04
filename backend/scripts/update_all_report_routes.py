"""
Script to update all report routes to support JSON format for live preview.

This script updates all advanced report route files to:
1. Add "json" to format enum (default)
2. Add report_type and description parameters
"""

import re
import sys
from pathlib import Path

# Fix Windows console encoding
if sys.platform == "win32":
    sys.stdout.reconfigure(encoding='utf-8')

REPORTS_DIR = Path(__file__).parent.parent / "app" / "modules" / "reports"

# Define all route files and their reports
ROUTE_FILES = {
    "advanced_routes_sales.py": [
        ("quote-conversion", "Sales Quote Conversion", "Quote to order conversion analysis"),
        ("order-pipeline", "Sales Pipeline Report", "Sales pipeline by stage and value"),
        ("product-performance", "Product Performance Report", "Product sales analysis and trends"),
        ("customer-purchase-patterns", "Customer Purchase Patterns", "Customer buying behavior analysis"),
    ],
    "advanced_routes_customers.py": [
        ("customer-intelligence", "Customer Intelligence Report", "Customer insights and analytics"),
        ("customer-lifetime-value", "Customer Lifetime Value", "CLV analysis and segmentation"),
        ("customer-churn-risk", "Customer Churn Risk", "At-risk customer identification"),
        ("customer-satisfaction", "Customer Satisfaction Report", "CSAT scores and feedback analysis"),
    ],
    "advanced_routes_operations.py": [
        ("workflow-efficiency", "Workflow Efficiency Report", "Process efficiency metrics"),
        ("team-productivity", "Team Productivity Report", "Team performance and productivity"),
        ("resource-utilization", "Resource Utilization Report", "Resource allocation and usage"),
        ("sla-compliance", "SLA Compliance Report", "Service level agreement tracking"),
    ],
    "advanced_routes_hosting.py": [
        ("vps-utilization", "VPS Utilization Report", "VPS resource usage and capacity"),
        ("container-performance", "Container Performance Report", "Container metrics and health"),
        ("hosting-revenue", "Hosting Revenue Report", "VPS subscription revenue analysis"),
        ("infrastructure-health", "Infrastructure Health Report", "System health and uptime"),
    ],
    "advanced_routes_audit.py": [
        ("audit-trail", "Audit Trail Report", "System audit log and changes"),
        ("compliance-report", "Compliance Report", "Regulatory compliance tracking"),
        ("security-events", "Security Events Report", "Security incidents and alerts"),
    ],
    "advanced_routes_executive.py": [
        ("kpi-dashboard", "Executive KPI Dashboard", "Key performance indicators overview"),
        ("business-health", "Business Health Scorecard", "Overall business health metrics"),
        ("forecast", "Forecast Report", "Revenue and growth forecasting"),
    ],
}


def update_route_file(file_path: Path, reports: list):
    """Update a single route file to add JSON support."""
    if not file_path.exists():
        print(f"[!] File not found: {file_path}")
        return

    content = file_path.read_text(encoding='utf-8')
    original_content = content

    # Pattern 1: Update format Query to include "json" and make it default
    content = re.sub(
        r'format:\s*str\s*=\s*Query\("pdf",\s*enum=\["pdf",\s*"excel",\s*"csv"\]\)',
        'format: str = Query("json", enum=["json", "pdf", "excel", "csv"])',
        content
    )

    # Pattern 2: Add report_type and description to generate_report_response calls
    for endpoint, title, desc in reports:
        # Find the generate_report_response call for this endpoint
        pattern = rf'(return\s+await\s+generate_report_response\s*\([^)]*format,\s*"[^"]+",)'

        def add_metadata(match):
            call = match.group(1)
            if "report_type=" not in call:
                # Add report_type and description before the closing parenthesis
                report_type = endpoint.replace("-", "_")
                category = file_path.stem.replace("advanced_routes_", "")
                full_type = f"{category}_{report_type}"

                return f'{call}\n        report_type="{full_type}",\n        description="{desc}"'
            return call

        content = re.sub(pattern, add_metadata, content)

    if content != original_content:
        file_path.write_text(content, encoding='utf-8')
        print(f"[OK] Updated {file_path.name} with {len(reports)} reports")
    else:
        print(f"[SKIP] No changes needed for {file_path.name}")


def main():
    """Update all route files."""
    print("=" * 60)
    print("Updating All Report Routes for JSON Preview Support")
    print("=" * 60)
    print()

    for filename, reports in ROUTE_FILES.items():
        file_path = REPORTS_DIR / filename
        update_route_file(file_path, reports)

    print()
    print("=" * 60)
    print("[OK] All route files updated successfully!")
    print("=" * 60)
    print()
    print("Next steps:")
    print("1. Test API endpoints: GET /api/v1/reports/advanced/{category}/{report}?format=json")
    print("2. Update frontend to show live preview")
    print("3. Deploy and test all 28 reports")


if __name__ == "__main__":
    main()
