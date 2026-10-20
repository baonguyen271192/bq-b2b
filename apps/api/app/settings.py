"""Cấu hình chạy, đọc từ biến môi trường (12-factor) — không chốt cứng trong code."""

from __future__ import annotations

import os
from dataclasses import dataclass, field


def _bool(name: str, default: bool = False) -> bool:
    return os.getenv(name, str(default)).strip().lower() in {"1", "true", "yes", "on"}


@dataclass(frozen=True)
class SapB1Settings:
    base_url: str = field(default_factory=lambda: os.getenv("SAPB1_BASE_URL", ""))
    company_db: str = field(default_factory=lambda: os.getenv("SAPB1_COMPANY_DB", ""))
    username: str = field(default_factory=lambda: os.getenv("SAPB1_USERNAME", ""))
    password: str = field(default_factory=lambda: os.getenv("SAPB1_PASSWORD", ""))
    # Bản cài nội bộ hay dùng cert tự ký → cần tắt verify. Chỉ tắt trong LAN/VPN.
    verify_ssl: bool = field(default_factory=lambda: _bool("SAPB1_VERIFY_SSL", True))
    warehouse: str = field(default_factory=lambda: os.getenv("SAPB1_WAREHOUSE", ""))

    def validate(self) -> None:
        missing = [
            name
            for name, value in (
                ("SAPB1_BASE_URL", self.base_url),
                ("SAPB1_COMPANY_DB", self.company_db),
                ("SAPB1_USERNAME", self.username),
                ("SAPB1_PASSWORD", self.password),
            )
            if not value
        ]
        if missing:
            raise RuntimeError(
                "Thiếu cấu hình SAP B1: " + ", ".join(missing) + ". Xem .env.example."
            )


@dataclass(frozen=True)
class Settings:
    # 'demo'  = dữ liệu mẫu trong repo (bản pitch hiện tại)
    # 'sapb1' = SAP Business One Service Layer (bật sau khi ký hợp đồng)
    data_source: str = field(
        default_factory=lambda: os.getenv("BQ_DATA_SOURCE", "demo").strip().lower()
    )
    sapb1: SapB1Settings = field(default_factory=SapB1Settings)


settings = Settings()
