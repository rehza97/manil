"""
System module models.
ApiRequestLog stores every API request for performance metrics.
"""
import uuid
from datetime import datetime

from sqlalchemy import DateTime, Float, Index, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.config.database import Base


class ApiRequestLog(Base):
    """
    Log of each API request for performance dashboards.
    Path is normalized (e.g. UUIDs replaced with {id}) for aggregation.
    """

    __tablename__ = "api_request_logs"

    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=lambda: str(uuid.uuid4())
    )
    request_path: Mapped[str] = mapped_column(Text, nullable=False, index=True)
    request_method: Mapped[str] = mapped_column(String(10), nullable=False)
    status_code: Mapped[int] = mapped_column(nullable=False)
    duration_ms: Mapped[float] = mapped_column(Float, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime, default=lambda: datetime.utcnow(), nullable=False, index=True
    )

    __table_args__ = (
        Index("idx_api_request_logs_path_created", "request_path", "created_at"),
    )

    def __repr__(self) -> str:
        return f"<ApiRequestLog {self.request_method} {self.request_path} {self.status_code}>"
