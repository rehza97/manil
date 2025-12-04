from __future__ import annotations

import logging
from typing import Any, Dict, Optional

import requests
from requests import Response

from app.config.settings import get_settings

logger = logging.getLogger(__name__)


class CPanelClient:
    """
    Minimal WHM/cPanel API client.

    Notes:
    - WHM API (root/reseller) is typically on 2087 HTTPS.
    - cPanel UAPI (per-account) is typically on 2083 HTTPS.
    - This client focuses on WHM API with API token auth for server-level tasks.
    """

    def __init__(
        self,
        host: str,
        username: str,
        api_token: str,
        verify_ssl: bool = True,
        timeout_sec: int = 30,
    ) -> None:
        self.host = host
        self.username = username
        self.api_token = api_token
        self.verify_ssl = verify_ssl
        self.timeout_sec = timeout_sec

        if not self.host or not self.username or not self.api_token:
            raise ValueError("cPanel/WHM host, username, and api token are required")

        # Normalize host (no scheme)
        self.host = self.host.replace("https://", "").replace("http://", "").strip("/")

    @classmethod
    def from_env(cls) -> "CPanelClient":
        settings = get_settings()
        return cls(
            host=settings.CPANEL_HOST or "",
            username=settings.CPANEL_USERNAME or "",
            api_token=settings.WHM_API_TOKEN or "",
            verify_ssl=bool(settings.CPANEL_SSL_VERIFY),
        )

    def _headers(self) -> Dict[str, str]:
        return {
            "Authorization": f"whm {self.username}:{self.api_token}",
            "Accept": "application/json",
        }

    def _whm_url(self, path: str) -> str:
        # WHM API base on port 2087
        path = path.lstrip("/")
        return f"https://{self.host}:2087/{path}"

    def get(self, path: str, params: Optional[Dict[str, Any]] = None) -> Response:
        url = self._whm_url(path)
        logger.debug("WHM GET %s params=%s", url, params)
        resp = requests.get(
            url, headers=self._headers(), params=params, verify=self.verify_ssl, timeout=self.timeout_sec
        )
        resp.raise_for_status()
        return resp

    def post(self, path: str, data: Optional[Dict[str, Any]] = None) -> Response:
        url = self._whm_url(path)
        logger.debug("WHM POST %s data=%s", url, data)
        resp = requests.post(
            url, headers=self._headers(), data=data, verify=self.verify_ssl, timeout=self.timeout_sec
        )
        resp.raise_for_status()
        return resp

    # Convenience wrappers for common WHM API endpoints
    # Reference: https://api.docs.cpanel.net/whm/guide/introduction/

    def server_information(self) -> Dict[str, Any]:
        resp = self.get("json-api/serverinformation", params={"api.version": 1})
        return resp.json()

    def list_accounts(self) -> Dict[str, Any]:
        resp = self.get("json-api/listaccts", params={"api.version": 1})
        return resp.json()

    def create_account(
        self,
        domain: str,
        username: str,
        password: str,
        plan: Optional[str] = None,
        contactemail: Optional[str] = None,
    ) -> Dict[str, Any]:
        payload: Dict[str, Any] = {
            "api.version": 1,
            "domain": domain,
            "username": username,
            "password": password,
        }
        if plan:
            payload["plan"] = plan
        if contactemail:
            payload["contactemail"] = contactemail

        resp = self.get("json-api/createacct", params=payload)
        return resp.json()

    def suspend_account(self, username: str, reason: Optional[str] = None) -> Dict[str, Any]:
        payload: Dict[str, Any] = {"api.version": 1, "user": username}
        if reason:
            payload["reason"] = reason
        resp = self.get("json-api/suspendacct", params=payload)
        return resp.json()

    def unsuspend_account(self, username: str) -> Dict[str, Any]:
        resp = self.get("json-api/unsuspendacct", params={"api.version": 1, "user": username})
        return resp.json()


def get_cpanel_client_or_none() -> Optional[CPanelClient]:
    """
    Returns a client if CPANEL_* settings are present; otherwise None.
    """
    settings = get_settings()
    if not (settings.CPANEL_HOST and settings.CPANEL_USERNAME and settings.WHM_API_TOKEN):
        return None
    try:
        return CPanelClient.from_env()
    except Exception as exc:
        logger.warning("Failed to initialize CPanelClient: %s", exc)
        return None





