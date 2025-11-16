"""
Report Routes

API endpoints for all reporting and analytics functionality.
"""

from datetime import datetime
from typing import Optional, List
from fastapi import APIRouter, Depends, Query, HTTPException, status
from fastapi.responses import FileResponse
from sqlalchemy.ext.asyncio import AsyncSession

from app.config.database import get_db
from app.core.dependencies import get_current_user, require_permission
from app.modules.auth.models import User

from .dashboard_service import DashboardService
from .ticket_report_service import TicketReportService
from .customer_report_service import CustomerReportService
from .order_report_service import OrderReportService
from .export_service import ExportService
from .schemas import (
    DashboardResponse,
    TicketStatusReport,
    TicketPriorityReport,
    TicketCategoryReport,
    AgentPerformance,
    TeamPerformance,
    ResponseTimeMetrics,
    ResolutionTimeMetrics,
    OpenVsClosedReport,
    CustomerStatusReport,
    CustomerTypeReport,
    CustomerGrowthReport,
    KYCStatusReport,
    OrderStatusReport,
    OrderValueMetrics,
    MonthlyOrderReport,
    ProductPerformance,
    CustomerOrderReport,
    ExportRequest,
    ExportResponse,
)

router = APIRouter(prefix="/api/v1/reports", tags=["reports"])


# ============================================================================
# Dashboard Endpoints
# ============================================================================

@router.get("/dashboard/admin", response_model=DashboardResponse)
async def get_admin_dashboard(
    period: str = Query("month", description="Time period for trends"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Get admin dashboard with system-wide metrics

    Requires: REPORTS_VIEW permission
    """
    # Check permission
    if not current_user.has_permission("REPORTS_VIEW"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to view reports"
        )

    service = DashboardService(db)
    return await service.get_admin_dashboard(period)


@router.get("/dashboard/corporate", response_model=DashboardResponse)
async def get_corporate_dashboard(
    period: str = Query("month", description="Time period for trends"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Get corporate dashboard with business operations overview

    Requires: REPORTS_VIEW permission
    """
    if not current_user.has_permission("REPORTS_VIEW"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to view reports"
        )

    service = DashboardService(db)
    return await service.get_corporate_dashboard(current_user.id, period)


@router.get("/dashboard/customer", response_model=DashboardResponse)
async def get_customer_dashboard(
    period: str = Query("month", description="Time period for trends"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Get customer dashboard with personal account overview

    Note: Requires customer_id. This endpoint is for customers only.
    """
    # Get customer_id from current user
    # This assumes there's a way to get customer_id from the user
    # You may need to adjust this based on your user-customer relationship
    customer_id = getattr(current_user, 'customer_id', None)

    if not customer_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No customer associated with this user"
        )

    service = DashboardService(db)
    return await service.get_customer_dashboard(customer_id, period)


# ============================================================================
# Ticket Report Endpoints
# ============================================================================

@router.get("/tickets/by-status", response_model=List[TicketStatusReport])
async def get_tickets_by_status(
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get tickets grouped by status"""
    if not current_user.has_permission("REPORTS_VIEW"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to view reports"
        )

    service = TicketReportService(db)
    return await service.get_tickets_by_status(start_date, end_date)


@router.get("/tickets/by-priority", response_model=List[TicketPriorityReport])
async def get_tickets_by_priority(
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get tickets grouped by priority with avg resolution time"""
    if not current_user.has_permission("REPORTS_VIEW"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to view reports"
        )

    service = TicketReportService(db)
    return await service.get_tickets_by_priority(start_date, end_date)


@router.get("/tickets/by-category", response_model=List[TicketCategoryReport])
async def get_tickets_by_category(
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get tickets grouped by category"""
    if not current_user.has_permission("REPORTS_VIEW"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to view reports"
        )

    service = TicketReportService(db)
    return await service.get_tickets_by_category(start_date, end_date)


@router.get("/tickets/by-agent", response_model=List[AgentPerformance])
async def get_tickets_by_agent(
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get agent performance metrics"""
    if not current_user.has_permission("REPORTS_VIEW"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to view reports"
        )

    service = TicketReportService(db)
    return await service.get_tickets_by_agent(start_date, end_date)


@router.get("/tickets/by-team", response_model=List[TeamPerformance])
async def get_tickets_by_team(
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get team performance metrics"""
    if not current_user.has_permission("REPORTS_VIEW"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to view reports"
        )

    service = TicketReportService(db)
    return await service.get_tickets_by_team(start_date, end_date)


@router.get("/tickets/response-time", response_model=ResponseTimeMetrics)
async def get_response_time_metrics(
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get response time analytics"""
    if not current_user.has_permission("REPORTS_VIEW"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to view reports"
        )

    service = TicketReportService(db)
    return await service.get_response_time_metrics(start_date, end_date)


@router.get("/tickets/resolution-time", response_model=ResolutionTimeMetrics)
async def get_resolution_time_metrics(
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get resolution time analytics"""
    if not current_user.has_permission("REPORTS_VIEW"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to view reports"
        )

    service = TicketReportService(db)
    return await service.get_resolution_time_metrics(start_date, end_date)


@router.get("/tickets/open-vs-closed", response_model=List[OpenVsClosedReport])
async def get_open_vs_closed_report(
    period: str = Query("month", description="Time period"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get open vs closed tickets report"""
    if not current_user.has_permission("REPORTS_VIEW"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to view reports"
        )

    service = TicketReportService(db)
    return await service.get_open_vs_closed_report(period)


# ============================================================================
# Customer Report Endpoints
# ============================================================================

@router.get("/customers/by-status", response_model=List[CustomerStatusReport])
async def get_customers_by_status(
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get customers grouped by status"""
    if not current_user.has_permission("REPORTS_VIEW"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to view reports"
        )

    service = CustomerReportService(db)
    return await service.get_customers_by_status(start_date, end_date)


@router.get("/customers/by-type", response_model=List[CustomerTypeReport])
async def get_customers_by_type(
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get customers grouped by type"""
    if not current_user.has_permission("REPORTS_VIEW"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to view reports"
        )

    service = CustomerReportService(db)
    return await service.get_customers_by_type(start_date, end_date)


@router.get("/customers/growth", response_model=List[CustomerGrowthReport])
async def get_customer_growth(
    period: str = Query("month", description="Time period"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get customer growth over time"""
    if not current_user.has_permission("REPORTS_VIEW"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to view reports"
        )

    service = CustomerReportService(db)
    return await service.get_customer_growth(period)


@router.get("/customers/kyc-status", response_model=List[KYCStatusReport])
async def get_kyc_status_report(
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get KYC verification status report"""
    if not current_user.has_permission("REPORTS_VIEW"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to view reports"
        )

    service = CustomerReportService(db)
    return await service.get_kyc_status_report(start_date, end_date)


# ============================================================================
# Order Report Endpoints
# ============================================================================

@router.get("/orders/by-status", response_model=List[OrderStatusReport])
async def get_orders_by_status(
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get orders grouped by status with total values"""
    if not current_user.has_permission("REPORTS_VIEW"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to view reports"
        )

    service = OrderReportService(db)
    return await service.get_orders_by_status(start_date, end_date)


@router.get("/orders/value-metrics", response_model=OrderValueMetrics)
async def get_order_value_metrics(
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get order value metrics"""
    if not current_user.has_permission("REPORTS_VIEW"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to view reports"
        )

    service = OrderReportService(db)
    return await service.get_order_value_metrics(start_date, end_date)


@router.get("/orders/monthly", response_model=List[MonthlyOrderReport])
async def get_monthly_orders(
    months: int = Query(12, ge=1, le=24, description="Number of months"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get monthly order statistics"""
    if not current_user.has_permission("REPORTS_VIEW"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to view reports"
        )

    service = OrderReportService(db)
    return await service.get_monthly_orders(months)


@router.get("/orders/product-performance", response_model=List[ProductPerformance])
async def get_product_performance(
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None,
    limit: int = Query(10, ge=1, le=50, description="Number of top products"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get top performing products in orders"""
    if not current_user.has_permission("REPORTS_VIEW"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to view reports"
        )

    service = OrderReportService(db)
    return await service.get_product_performance(start_date, end_date, limit)


@router.get("/orders/by-customer", response_model=List[CustomerOrderReport])
async def get_orders_by_customer(
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None,
    limit: int = Query(10, ge=1, le=50, description="Number of top customers"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get top customers by order value"""
    if not current_user.has_permission("REPORTS_VIEW"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to view reports"
        )

    service = OrderReportService(db)
    return await service.get_orders_by_customer(start_date, end_date, limit)


# ============================================================================
# Export Endpoints
# ============================================================================

@router.post("/export", response_model=ExportResponse)
async def export_report(
    export_request: ExportRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Export report data in specified format

    Supported formats: csv, excel, pdf
    Supported report types: tickets, customers, orders
    """
    if not current_user.has_permission("REPORTS_EXPORT"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to export reports"
        )

    export_service = ExportService()

    # This is a simplified version
    # In a real implementation, you would fetch actual data based on filters
    # For now, returning a sample export

    try:
        if export_request.report_type == "tickets":
            # Fetch tickets data (simplified)
            data = [{"id": 1, "subject": "Sample", "status": "open"}]
            result = export_service.export_tickets_report(
                data,
                export_request.format,
                "tickets_report"
            )
        elif export_request.report_type == "customers":
            data = [{"id": 1, "full_name": "Sample", "email": "test@example.com"}]
            result = export_service.export_customers_report(
                data,
                export_request.format,
                "customers_report"
            )
        elif export_request.report_type == "orders":
            data = [{"id": 1, "order_number": "ORD-001", "status": "delivered"}]
            result = export_service.export_orders_report(
                data,
                export_request.format,
                "orders_report"
            )
        else:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Unsupported report type: {export_request.report_type}"
            )

        return ExportResponse(**result)

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Export failed: {str(e)}"
        )


@router.get("/export/download/{file_name}")
async def download_export(
    file_name: str,
    current_user: User = Depends(get_current_user)
):
    """Download exported file"""
    if not current_user.has_permission("REPORTS_EXPORT"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to download exports"
        )

    export_service = ExportService()
    file_path = export_service.export_dir / file_name

    if not file_path.exists():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="File not found"
        )

    return FileResponse(
        path=str(file_path),
        filename=file_name,
        media_type="application/octet-stream"
    )
