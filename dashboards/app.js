import React, { useEffect, useMemo, useRef, useState } from "https://esm.sh/react@18";
import { createRoot } from "https://esm.sh/react-dom@18/client";
import Chart from "https://cdn.jsdelivr.net/npm/chart.js@4.4.1/dist/chart.umd.min.js";

const statePalette = {
  OBSERVE: "#60a5fa",
  STABILIZE: "#34d399",
  EXPAND: "#fbbf24",
  DEFEND: "#f87171",
};

const initialMetrics = {
  psi: 0.282,
  omega: 0.884,
  alpha: 1.031,
  cvar: 0.738,
};

const maxPoints = 30;
const updateIntervalMs = 2000;
const deterministicSeed = 20260130;

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function formatPercent(value) {
  return `${(value * 100).toFixed(1)}%`;
}

function formatValue(value) {
  return value.toFixed(3);
}

function buildSeedSeries() {
  return Array.from({ length: maxPoints }, (_, index) => index - maxPoints + 1);
}

function mulberry32(seed) {
  let t = seed;
  return () => {
    t += 0x6d2b79f5;
    let result = Math.imul(t ^ (t >>> 15), 1 | t);
    result ^= result + Math.imul(result ^ (result >>> 7), 61 | result);
    return ((result ^ (result >>> 14)) >>> 0) / 4294967296;
  };
}

function generateStateTransition(previousState, randomValue) {
  const states = Object.keys(statePalette);
  const nextIndex = Math.floor(randomValue * states.length);
  const nextState = states[nextIndex];
  return nextState === previousState ? states[(nextIndex + 1) % states.length] : nextState;
}

function App() {
  const rng = useRef(mulberry32(deterministicSeed));
  const [metrics, setMetrics] = useState(initialMetrics);
  const [history, setHistory] = useState({
    labels: buildSeedSeries(),
    psi: Array(maxPoints).fill(initialMetrics.psi),
    omega: Array(maxPoints).fill(initialMetrics.omega),
    alpha: Array(maxPoints).fill(initialMetrics.alpha),
    cvar: Array(maxPoints).fill(initialMetrics.cvar),
  });
  const [transitions, setTransitions] = useState([
    { state: "OBSERVE", at: new Date().toLocaleTimeString("pt-BR") },
  ]);

  const lineChartRef = useRef(null);
  const barChartRef = useRef(null);
  const lineChart = useRef(null);
  const barChart = useRef(null);

  const stateCounts = useMemo(() => {
    return transitions.reduce((acc, item) => {
      acc[item.state] = (acc[item.state] || 0) + 1;
      return acc;
    }, {});
  }, [transitions]);

  useEffect(() => {
    const interval = setInterval(() => {
      setMetrics((prev) => {
        const psi = clamp(prev.psi + (rng.current() - 0.5) * 0.02, 0.24, 0.42);
        const omega = clamp(prev.omega + (rng.current() - 0.5) * 0.03, 0.72, 0.95);
        const alpha = clamp(prev.alpha + (rng.current() - 0.5) * 0.015, 0.98, 1.08);
        const cvar = clamp(prev.cvar + (rng.current() - 0.5) * 0.025, 0.62, 0.82);
        return { psi, omega, alpha, cvar };
      });
    }, updateIntervalMs);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    setHistory((prev) => {
      const timestamp = new Date().toLocaleTimeString("pt-BR");
      const updateSeries = (series, value) => [...series.slice(1), value];

      return {
        labels: [...prev.labels.slice(1), timestamp],
        psi: updateSeries(prev.psi, metrics.psi),
        omega: updateSeries(prev.omega, metrics.omega),
        alpha: updateSeries(prev.alpha, metrics.alpha),
        cvar: updateSeries(prev.cvar, metrics.cvar),
      };
    });

    setTransitions((prev) => {
      const nextState = generateStateTransition(prev[0]?.state || "OBSERVE", rng.current());
      const nextEntry = { state: nextState, at: new Date().toLocaleTimeString("pt-BR") };
      return [nextEntry, ...prev].slice(0, 6);
    });
  }, [metrics]);

  useEffect(() => {
    if (!lineChartRef.current || lineChart.current) {
      return;
    }

    const lineContext = lineChartRef.current.getContext("2d");
    lineChart.current = new Chart(lineContext, {
      type: "line",
      data: {
        labels: history.labels,
        datasets: [
          {
            label: "Ψ Coerência",
            data: history.psi,
            borderColor: "#60a5fa",
            backgroundColor: "rgba(96, 165, 250, 0.2)",
            tension: 0.3,
          },
          {
            label: "Ω Viabilidade",
            data: history.omega,
            borderColor: "#34d399",
            backgroundColor: "rgba(52, 211, 153, 0.2)",
            tension: 0.3,
          },
          {
            label: "α Antifragilidade",
            data: history.alpha,
            borderColor: "#fbbf24",
            backgroundColor: "rgba(251, 191, 36, 0.2)",
            tension: 0.3,
          },
          {
            label: "CVaR",
            data: history.cvar,
            borderColor: "#f87171",
            backgroundColor: "rgba(248, 113, 113, 0.2)",
            tension: 0.3,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { labels: { color: "#e2e8f0" } },
        },
        scales: {
          x: { ticks: { color: "#94a3b8" }, grid: { color: "rgba(148, 163, 184, 0.1)" } },
          y: { ticks: { color: "#94a3b8" }, grid: { color: "rgba(148, 163, 184, 0.1)" } },
        },
      },
    });
  }, [history]);

  useEffect(() => {
    if (!barChartRef.current || barChart.current) {
      return;
    }

    const barContext = barChartRef.current.getContext("2d");
    barChart.current = new Chart(barContext, {
      type: "bar",
      data: {
        labels: Object.keys(statePalette),
        datasets: [
          {
            label: "Transições",
            data: Object.keys(statePalette).map((state) => stateCounts[state] || 0),
            backgroundColor: Object.keys(statePalette).map((state) => statePalette[state]),
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
        },
        scales: {
          x: { ticks: { color: "#94a3b8" }, grid: { display: false } },
          y: { ticks: { color: "#94a3b8" }, grid: { color: "rgba(148, 163, 184, 0.1)" } },
        },
      },
    });
  }, [stateCounts]);

  useEffect(() => {
    if (!lineChart.current) {
      return;
    }

    lineChart.current.data.labels = history.labels;
    lineChart.current.data.datasets[0].data = history.psi;
    lineChart.current.data.datasets[1].data = history.omega;
    lineChart.current.data.datasets[2].data = history.alpha;
    lineChart.current.data.datasets[3].data = history.cvar;
    lineChart.current.update("none");
  }, [history]);

  useEffect(() => {
    if (!barChart.current) {
      return;
    }

    barChart.current.data.datasets[0].data = Object.keys(statePalette).map(
      (state) => stateCounts[state] || 0,
    );
    barChart.current.update("none");
  }, [stateCounts]);

  return (
    <div className="grid">
      <section className="card metric-card">
        <h3>Ψ Coerência</h3>
        <p className="metric-value">{formatPercent(metrics.psi)}</p>
        <p className="metric-sub">Ψ index: {formatValue(metrics.psi)}</p>
      </section>
      <section className="card metric-card">
        <h3>Ω Viabilidade</h3>
        <p className="metric-value">{formatPercent(metrics.omega)}</p>
        <p className="metric-sub">Score: {formatValue(metrics.omega)}</p>
      </section>
      <section className="card metric-card">
        <h3>α Antifragilidade</h3>
        <p className="metric-value">{formatValue(metrics.alpha)}</p>
        <p className="metric-sub">Meta &gt; 1.0</p>
      </section>
      <section className="card metric-card">
        <h3>CVaR</h3>
        <p className="metric-value">{formatPercent(metrics.cvar)}</p>
        <p className="metric-sub">Limite crítico: 0.80</p>
      </section>

      <section className="card chart-card">
        <div className="card-header">
          <h3>Trajetória das métricas</h3>
          <span className="chip">
            Atualizado: {new Date().toLocaleTimeString("pt-BR")} • Seed {deterministicSeed}
          </span>
        </div>
        <div className="chart-wrap">
          <canvas ref={lineChartRef}></canvas>
        </div>
      </section>

      <section className="card transition-card">
        <div className="card-header">
          <h3>Transições de estado</h3>
          <span className="chip">Últimas 6 mudanças</span>
        </div>
        <ul className="transition-list">
          {transitions.map((item, index) => (
            <li key={`${item.state}-${item.at}-${index}`}>
              <span className="state-pill" style={{ backgroundColor: statePalette[item.state] }}>
                {item.state}
              </span>
              <span className="transition-time">{item.at}</span>
            </li>
          ))}
        </ul>
        <div className="chart-wrap small">
          <canvas ref={barChartRef}></canvas>
        </div>
      </section>
    </div>
  );
}

const root = createRoot(document.getElementById("root"));
root.render(<App />);
