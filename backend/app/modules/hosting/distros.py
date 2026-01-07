"""
Curated VPS distro catalog.

We map distro choices to Docker base images used for VPS containers.
"""

from typing import List, Dict


SUPPORTED_DISTROS: List[Dict[str, str]] = [
    {
        "id": "ubuntu-22.04",
        "label": "Ubuntu 22.04 LTS",
        "docker_image": "ubuntu:22.04",
        "description": "Stable LTS release (recommended)",
    },
    {
        "id": "ubuntu-24.04",
        "label": "Ubuntu 24.04 LTS",
        "docker_image": "ubuntu:24.04",
        "description": "Latest Ubuntu LTS",
    },
    {
        "id": "debian-12",
        "label": "Debian 12 (Bookworm)",
        "docker_image": "debian:12",
        "description": "Stable Debian release",
    },
    {
        "id": "almalinux-9",
        "label": "AlmaLinux 9",
        "docker_image": "almalinux:9",
        "description": "RHEL-compatible distro",
    },
]


def get_distro_by_id(distro_id: str) -> Dict[str, str] | None:
    for d in SUPPORTED_DISTROS:
        if d["id"] == distro_id:
            return d
    return None





