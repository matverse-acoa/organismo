# MatVerse Dashboard (React)

Este dashboard em React fornece uma visualização em tempo real das métricas Ψ, Ω, α e CVaR, além de um painel de transições de estado.

## Como executar

```bash
cd dashboards
python -m http.server 8000
```

Abra `http://localhost:8000` no navegador.

> Observação: a simulação usa um gerador pseudoaleatório determinístico (seed fixa) para manter as mesmas trajetórias em cada execução, mantendo o ritmo de 2s entre atualizações.
