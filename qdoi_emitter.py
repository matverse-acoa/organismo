import hashlib
import json
import time
from decimal import Decimal
from typing import Any, Dict

import requests


class QDOIEmitter:
    """
    Emissor de Q-DOI do MatVerse.
    Só emite Q-DOI se houver evidência quântica válida.
    """

    def __init__(
        self, qds_api: str, pole_registry: str, zenodo_token: str, matverse_ledger: str
    ) -> None:
        self.qds_api = qds_api
        self.pole_registry = pole_registry
        self.zenodo_token = zenodo_token
        self.matverse_ledger = matverse_ledger

    def run_quantum_experiment(self, spec: Dict[str, Any]) -> Dict[str, Any]:
        """Executa experimento na QDS."""
        response = requests.post(f"{self.qds_api}/run", json=spec, timeout=30)
        response.raise_for_status()
        return response.json()

    def compute_iirq_plus(
        self,
        fidelity: Decimal,
        tau: Decimal,
        eta: Decimal,
        latency: Decimal,
        qber: Decimal,
        sigma: Decimal,
    ) -> Decimal:
        """Calcula IIRQ+."""
        if latency == 0 or qber == 0 or sigma == 0:
            raise ValueError("Latency, QBER ou sigma não podem ser zero.")
        return (fidelity * tau * eta) / (latency * qber * sigma)

    def omega_gate(self, fidelity: Decimal, qber: Decimal, iirq: Decimal) -> bool:
        """Validação Ω-Gate quântica."""
        return (
            fidelity >= Decimal("0.95")
            and qber <= Decimal("0.05")
            and iirq >= Decimal("1.0")
        )

    def fingerprint(self, payload: Dict[str, Any]) -> str:
        """Gera fingerprint SHA3-256."""
        return hashlib.sha3_256(
            json.dumps(payload, sort_keys=True).encode()
        ).hexdigest()

    def register_qpole(self, fingerprint: str, metrics: Dict[str, Any]) -> Dict[str, Any]:
        """Registra Q-PoLE on-chain."""
        response = requests.post(
            self.pole_registry,
            json={
                "fingerprint": fingerprint,
                "metrics": metrics,
                "timestamp": time.time(),
            },
            timeout=30,
        )
        response.raise_for_status()
        return response.json()

    def publish_zenodo(self, payload: Dict[str, Any]) -> Dict[str, Any]:
        """Publica dataset no Zenodo."""
        headers = {
            "Authorization": f"Bearer {self.zenodo_token}",
            "Content-Type": "application/json",
        }

        response = requests.post(
            "https://zenodo.org/api/deposit/depositions",
            headers=headers,
            json={},
            timeout=30,
        )
        response.raise_for_status()
        deposition = response.json()

        dataset_path = "/tmp/quantum_dataset.json"
        with open(dataset_path, "w", encoding="utf-8") as handle:
            json.dump(payload, handle, indent=2)

        with open(dataset_path, "rb") as handle:
            files = {"file": handle}
            response = requests.post(
                deposition["links"]["files"],
                headers=headers,
                files=files,
                timeout=30,
            )
            response.raise_for_status()

        metadata = {
            "metadata": {
                "title": (
                    "MatVerse Q-DOI: Quantum Experiment "
                    f"{payload['fingerprint'][:8]}"
                ),
                "upload_type": "dataset",
                "description": (
                    "Quantum evidence for IIRQ+="
                    f"{payload['metrics']['IIRQ+']:.3f}, F="
                    f"{payload['metrics']['F']:.3f}"
                ),
                "creators": [{"name": "MatVerse Autonomous System"}],
                "keywords": ["quantum", "matverse", "q-doi", "iirq+", "blockchain"],
                "license": "cc-by-4.0",
            }
        }

        response = requests.put(
            deposition["links"]["self"],
            headers=headers,
            json=metadata,
            timeout=30,
        )
        response.raise_for_status()

        response = requests.post(
            deposition["links"]["publish"],
            headers=headers,
            timeout=30,
        )
        response.raise_for_status()

        return response.json()

    def mint_qdoi(self, fingerprint: str, doi: str, tx_hash: str) -> Dict[str, Any]:
        """Registra Q-DOI no ledger do MatVerse."""
        payload = {
            "fingerprint": fingerprint,
            "doi": doi,
            "tx_hash": tx_hash,
            "timestamp": time.time(),
        }

        response = requests.post(
            f"{self.matverse_ledger}/qdoi/mint",
            json=payload,
            timeout=30,
        )
        response.raise_for_status()
        return response.json()

    def emit(self, spec: Dict[str, Any]) -> Dict[str, Any]:
        """
        Pipeline completo de emissão de Q-DOI.

        Args:
            spec: Especificação do experimento quântico.

        Returns:
            Dict com status e evidências.
        """
        print("🔬 Executando experimento quântico...")
        qds_result = self.run_quantum_experiment(spec)

        fidelity = Decimal(str(qds_result["fidelity"]))
        qber = Decimal(str(qds_result["qber"]))
        tau = Decimal(str(qds_result["coherence_time"]))
        eta = Decimal(str(qds_result["detector_efficiency"]))
        latency = Decimal(str(qds_result["latency"]))
        sigma = Decimal(str(qds_result["fidelity_std"]))

        iirq = self.compute_iirq_plus(fidelity, tau, eta, latency, qber, sigma)

        if not self.omega_gate(fidelity, qber, iirq):
            return {
                "status": "REJECTED",
                "reason": "Ω-Gate failed",
                "metrics": {
                    "F": float(fidelity),
                    "QBER": float(qber),
                    "IIRQ+": float(iirq),
                },
            }

        payload = {
            "timestamp": time.time(),
            "spec": spec,
            "metrics": {
                "F": float(fidelity),
                "QBER": float(qber),
                "tau": float(tau),
                "eta": float(eta),
                "latency": float(latency),
                "sigma": float(sigma),
                "IIRQ+": float(iirq),
            },
        }

        fingerprint = self.fingerprint(payload)
        payload["fingerprint"] = fingerprint

        print("⛓️ Registrando Q-PoLE on-chain...")
        qpole = self.register_qpole(fingerprint, payload["metrics"])

        print("📚 Publicando no Zenodo...")
        zenodo = self.publish_zenodo(payload)

        print("🪙 Mintando Q-DOI...")
        qdoi = self.mint_qdoi(fingerprint, zenodo["doi"], qpole["tx_hash"])

        return {
            "status": "QDOI_MINTED",
            "qdoi": qdoi,
            "fingerprint": fingerprint,
            "iiqr_plus": float(iirq),
            "fidelity": float(fidelity),
            "qber": float(qber),
            "qpole_tx": qpole["tx_hash"],
            "doi": zenodo["doi"],
            "zenodo_url": zenodo["links"]["html"],
            "matverse_qdoi_url": f"{self.matverse_ledger}/qdoi/{fingerprint}",
        }
