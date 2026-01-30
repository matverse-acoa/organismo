# MatVerse Dashboard (React)

Este dashboard em React fornece uma visualização em tempo real das métricas Ψ, Ω, α e CVaR, além de um painel de transições de estado.

## Como executar

```bash
cd dashboards
python -m http.server 8000
```

Abra `http://localhost:8000` no navegador.

> Observação: a simulação de dados é determinística apenas no ritmo (2s), mas os valores são gerados por variação estocástica para demonstrar a UI.
