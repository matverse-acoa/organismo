#!/usr/bin/env python3
"""
Script para emitir o primeiro Q-DOI do MatVerse.
"""

import os

from qdoi_emitter import QDOIEmitter


def main() -> None:
    qds_api = os.getenv("QDS_API", "https://quantum-dynamics-suite.example.com/api")
    pole_registry = os.getenv("POLE_REGISTRY", "https://pole.matverse.org/register")
    zenodo_token = os.getenv("ZENODO_TOKEN")
    matverse_ledger = os.getenv("MATVERSE_LEDGER", "https://ledger.matverse.org")

    if not zenodo_token:
        raise ValueError("ZENODO_TOKEN não definido")

    emitter = QDOIEmitter(qds_api, pole_registry, zenodo_token, matverse_ledger)

    spec = {
        "qubits": 4,
        "circuit": "bell_pair_chain",
        "noise_model": "depolarizing",
        "noise_strength": 0.01,
        "shots": 10000,
        "topology": "linear",
    }

    print("🚀 Iniciando emissão de Q-DOI...")
    result = emitter.emit(spec)

    print("\n" + "=" * 60)
    print("RESULTADO DA EMISSÃO Q-DOI")
    print("=" * 60)

    if result["status"] == "QDOI_MINTED":
        print("✅ Q-DOI EMITIDO COM SUCESSO!")
        print(f"   Fingerprint: {result['fingerprint']}")
        print(f"   IIRQ+: {result['iiqr_plus']:.3f}")
        print(f"   Fidelidade: {result['fidelity']:.3f}")
        print(f"   QBER: {result['qber']:.3f}")
        print(f"   Q-PoLE TX: {result['qpole_tx']}")
        print(f"   DOI: {result['doi']}")
        print(f"   Zenodo URL: {result['zenodo_url']}")
        print(f"   MatVerse URL: {result['matverse_qdoi_url']}")
    else:
        print("❌ EMISSÃO REJEITADA")
        print(f"   Motivo: {result['reason']}")
        print(f"   Métricas: {result['metrics']}")

    print("=" * 60)


if __name__ == "__main__":
    main()
