"""HTTP client cho SAP B1 Service Layer (OData v4).

Phần này KHÔNG phụ thuộc nghiệp vụ BQ — chỉ lo đăng nhập, giữ session, phân trang,
và dịch lỗi. Nghiệp vụ nằm ở catalog.py / dealers.py / orders.py cùng thư mục.

[Unverified] Đường dẫn và tên trường dưới đây theo tài liệu Service Layer phổ biến;
PHẢI đối chiếu lại với bản cài + Patch Level thật của BQ trước khi tin.
"""

from __future__ import annotations

import logging
import threading
from typing import Any, Dict, Iterator, List, Optional

import httpx

log = logging.getLogger(__name__)


class ServiceLayerError(RuntimeError):
    """Service Layer trả lỗi. Giữ nguyên payload để debug — B1 báo lỗi rất chi tiết."""

    def __init__(self, status: int, payload: Any):
        super().__init__(f"SAP B1 Service Layer {status}: {payload}")
        self.status = status
        self.payload = payload


class NeedsMapping(NotImplementedError):
    """Chỗ cần biết cấu hình B1 thật của BQ mới viết tiếp được.

    Cố ý raise thay vì đoán: một ánh xạ sai (nhất là bảng size) sẽ sinh đơn sai số
    lượng trong ERP thật — hỏng dữ liệu còn tệ hơn lỗi lộ ra ngay.
    """


class ServiceLayerClient:
    """Giữ một session B1 và tự đăng nhập lại khi hết hạn.

    Session Service Layer mặc định hết hạn sau ~30 phút không hoạt động, và khi hết
    hạn thì request trả 401 — không phải lỗi mạng. Ta bắt 401 để login lại đúng MỘT
    lần rồi thử lại, tránh vòng lặp vô tận khi sai mật khẩu.
    """

    def __init__(
        self,
        base_url: str,
        company_db: str,
        username: str,
        password: str,
        *,
        verify_ssl: bool = True,
        timeout: float = 30.0,
        page_size: int = 100,
    ):
        # verify_ssl=False thường cần cho bản cài dùng cert tự ký trong mạng nội bộ.
        # Chỉ tắt khi đã chắc chắn đường truyền là LAN/VPN tin cậy.
        self._base_url = base_url.rstrip("/")
        self._credentials = {
            "CompanyDB": company_db,
            "UserName": username,
            "Password": password,
        }
        self._page_size = page_size
        self._lock = threading.Lock()
        self._client = httpx.Client(
            base_url=self._base_url,
            verify=verify_ssl,
            timeout=timeout,
            headers={"Content-Type": "application/json"},
        )
        self._logged_in = False

    # ---------- phiên làm việc ----------

    def login(self) -> None:
        res = self._client.post("/Login", json=self._credentials)
        if res.status_code >= 400:
            raise ServiceLayerError(res.status_code, _safe_json(res))
        # Cookie B1SESSION do httpx.Client tự giữ trong cookie jar.
        self._logged_in = True
        log.info("SAP B1: đăng nhập thành công (%s)", self._credentials["CompanyDB"])

    def logout(self) -> None:
        if self._logged_in:
            try:
                self._client.post("/Logout")
            finally:
                self._logged_in = False

    def close(self) -> None:
        self.logout()
        self._client.close()

    # ---------- gọi API ----------

    def request(self, method: str, path: str, **kwargs) -> Any:
        with self._lock:
            if not self._logged_in:
                self.login()

        res = self._client.request(method, path, **kwargs)

        if res.status_code == 401:
            # Session hết hạn: đăng nhập lại đúng một lần rồi thử lại.
            with self._lock:
                self._logged_in = False
                self.login()
            res = self._client.request(method, path, **kwargs)

        if res.status_code >= 400:
            raise ServiceLayerError(res.status_code, _safe_json(res))
        if res.status_code == 204 or not res.content:
            return None
        return res.json()

    def get(self, path: str, **kwargs) -> Any:
        return self.request("GET", path, **kwargs)

    def post(self, path: str, json: Optional[dict] = None) -> Any:
        return self.request("POST", path, json=json or {})

    def patch(self, path: str, json: dict) -> Any:
        return self.request("PATCH", path, json=json)

    def iter_all(self, path: str) -> Iterator[Dict[str, Any]]:
        """Duyệt hết một collection, theo `@odata.nextLink`.

        Service Layer phân trang MẶC ĐỊNH (20 bản ghi) — quên xử lý nextLink là
        nguyên nhân kinh điển của "ERP thiếu hàng": code chạy không lỗi, chỉ mất
        dữ liệu từ bản ghi thứ 21 trở đi.
        """
        headers = {"Prefer": f"odata.maxpagesize={self._page_size}"}
        next_path: Optional[str] = path
        while next_path:
            payload = self.request("GET", next_path, headers=headers)
            for row in payload.get("value", []):
                yield row
            next_link = payload.get("@odata.nextLink")
            next_path = f"/{next_link}" if next_link else None

    def list(self, path: str) -> List[Dict[str, Any]]:
        return list(self.iter_all(path))


def _safe_json(res: httpx.Response) -> Any:
    try:
        return res.json()
    except ValueError:
        return res.text
