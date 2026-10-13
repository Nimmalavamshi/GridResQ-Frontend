import { useEffect, useState } from "react";
import "./App.css";
import AuthPage from "./AuthPage";
import AdminPage from "./AdminPage";
import { apiRequest } from "./api";

const DEFAULT_SYSTEMS = [
  { id: 1, name: "Power Grid", capacity: 95, status: "Operational" },
  { id: 2, name: "Water Network", capacity: 90, status: "Operational" },
  { id: 3, name: "Telecom Tower", capacity: 88, status: "Operational" },
  { id: 4, name: "Hospital H1", capacity: 100, status: "Operational" },
  { id: 5, name: "Emergency Center", capacity: 92, status: "Operational" },
];

const NODES = [
  { name: "Power Grid", icon: "⚡", x: 50, y: 12 },
  { name: "Water Network", icon: "💧", x: 18, y: 40 },
  { name: "Telecom Tower", icon: "📡", x: 82, y: 40 },
  { name: "Hospital H1", icon: "✚", x: 18, y: 77 },
  { name: "Emergency Center", icon: "🚨", x: 82, y: 77 },
];

const CONNECTIONS = [
  ["Power Grid", "Water Network"],
  ["Power Grid", "Telecom Tower"],
  ["Power Grid", "Hospital H1"],
  ["Power Grid", "Emergency Center"],
  ["Water Network", "Hospital H1"],
  ["Telecom Tower", "Emergency Center"],
];

const DEFAULT_DEPENDENCIES = {
  "Power Grid": [],
  "Water Network": ["Power Grid"],
  "Telecom Tower": ["Power Grid"],
  "Hospital H1": ["Power Grid", "Water Network"],
  "Emergency Center": ["Power Grid", "Telecom Tower"],
};

function getStatusClass(status) {
  if (status === "Initial Failure") return "failed";
  if (status === "Affected") return "affected";
  return "operational";
}

function getHealth(capacities, systems) {
  const values = systems.map((system) =>
    Number(capacities?.[system.name] ?? system.capacity)
  );

  if (!values.length) return 0;

  return Math.round(
    values.reduce((total, value) => total + value, 0) /
      values.length
  );
}

function formatTime(value) {
  if (!value) return "—";

  if (Array.isArray(value)) {
    const [
      year,
      month,
      day,
      hour = 0,
      minute = 0,
      second = 0,
    ] = value;

    return new Date(
      year,
      month - 1,
      day,
      hour,
      minute,
      second
    ).toLocaleString();
  }

  const date = new Date(value);

  return Number.isNaN(date.getTime())
    ? String(value)
    : date.toLocaleString();
}

function getRiskLevel(health) {
  if (health < 40) return "Critical";
  if (health < 60) return "High";
  if (health < 75) return "Moderate";
  return "Low";
}

function getRiskColor(level) {
  switch (level) {
    case "Critical":
      return "#dc2626";
    case "High":
      return "#ea580c";
    case "Moderate":
      return "#ca8a04";
    default:
      return "#059669";
  }
}

function getRecoveryRecommendations(component, health) {
  const recommendations = {
    "Power Grid": [
      "Inspect the simulated primary power failure.",
      "Evaluate backup power for hospitals and emergency services.",
      "Assess dependent water and telecommunications infrastructure.",
      "Prioritize restoration of critical infrastructure.",
    ],
    "Water Network": [
      "Inspect the simulated water network failure.",
      "Assess water availability at the hospital.",
      "Evaluate emergency water storage and alternative supply.",
      "Verify service restoration before returning to normal operation.",
    ],
    "Telecom Tower": [
      "Inspect the simulated telecommunications failure.",
      "Evaluate backup communication channels.",
      "Prioritize communications for emergency services.",
      "Verify connectivity after simulated recovery.",
    ],
    "Hospital H1": [
      "Assess the simulated hospital service interruption.",
      "Evaluate continuity plans for essential medical services.",
      "Check backup power and communications availability.",
      "Prioritize safe restoration of hospital operations.",
    ],
    "Emergency Center": [
      "Assess the simulated emergency center interruption.",
      "Evaluate alternative emergency coordination arrangements.",
      "Verify backup communication availability.",
      "Prioritize restoration of emergency response capability.",
    ],
  };

  const actions = recommendations[component] ?? [
    "Assess the affected infrastructure.",
    "Identify dependencies and alternative services.",
    "Prioritize essential services.",
    "Verify recovery before restoring normal operation.",
  ];

  if (health < 40) {
    return [
      "CRITICAL: Prioritize immediate assessment of essential services.",
      ...actions,
    ];
  }

  if (health < 60) {
    return [
      "HIGH RISK: Prioritize mitigation and continuity planning.",
      ...actions,
    ];
  }

  return actions;
}

function App() {
  const [user, setUser] = useState(null);
  const [authChecking, setAuthChecking] = useState(true);
  const [logoutLoading, setLogoutLoading] = useState(false);
  const [showAdmin, setShowAdmin] = useState(false);

  const [systems, setSystems] = useState(DEFAULT_SYSTEMS);
  const [selectedSystem, setSelectedSystem] = useState("Power Grid");
  const [simulation, setSimulation] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [backendConnected, setBackendConnected] = useState(false);
  const [error, setError] = useState("");
  const [historyError, setHistoryError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function checkSession() {
      try {
        const currentUser = await apiRequest("/auth/me");

        if (!cancelled) {
          setUser(currentUser);
        }
      } catch {
        if (!cancelled) {
          setUser(null);
        }
      } finally {
        if (!cancelled) {
          setAuthChecking(false);
        }
      }
    }

    checkSession();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!user) return;

    loadInfrastructure();

    if (user.role === "ADMIN") {
      loadDatabaseHistory();
    } else {
      setHistory([]);
      setHistoryError("");
    }

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  function handleLogin(loggedInUser) {
    setUser(loggedInUser);
    setShowAdmin(false);
    setError("");
    setHistoryError("");
  }

  async function handleLogout() {
    setLogoutLoading(true);

    try {
      await apiRequest("/auth/logout", { method: "POST" });
    } catch (logoutError) {
      setError(
        logoutError.message ||
          "Logout request failed. Please try again."
      );
      setLogoutLoading(false);
      return;
    }

    setLogoutLoading(false);
    setUser(null);
    setShowAdmin(false);
    setSimulation(null);
    setHistory([]);
    setBackendConnected(false);
    setError("");
    setHistoryError("");
  }

  async function loadInfrastructure() {
    try {
      const data = await apiRequest("/infrastructure");

      if (Array.isArray(data) && data.length > 0) {
        setSystems(
          data.map((item, index) => ({
            id: item.id ?? index + 1,
            name: item.name,
            capacity: Number(item.capacity ?? 0),
            status: item.status ?? "Operational",
          }))
        );
      }

      setBackendConnected(true);
      setError("");
    } catch (requestError) {
      setBackendConnected(false);
      setError(
        requestError.message ||
          "Cannot load infrastructure. Check the backend."
      );
    }
  }

  async function loadDatabaseHistory() {
    if (user?.role !== "ADMIN") return;

    setHistoryLoading(true);
    setHistoryError("");

    try {
      const data = await apiRequest("/history");

      if (!Array.isArray(data)) {
        throw new Error("Invalid history response.");
      }

      setHistory(
        data.map((item) => ({
          id: item.id,
          time: formatTime(item.simulationTime),
          component: item.failedComponent,
          affectedCount: Number(item.affectedCount ?? 0),
          stillOperational: Number(item.operationalCount ?? 0),
          afterHealth: Number(item.systemHealth ?? 0),
        }))
      );
    } catch (requestError) {
      setHistoryError(
        requestError.message ||
          "Unable to load database history."
      );
    } finally {
      setHistoryLoading(false);
    }
  }

  async function runSimulation() {
    setLoading(true);
    setError("");

    try {
      const data = await apiRequest("/simulation", {
        method: "POST",
        body: JSON.stringify({ component: selectedSystem }),
      });

      const baselineCapacities = Object.fromEntries(
        systems.map((system) => [
          system.name,
          system.capacity,
        ])
      );

      const beforeHealth = getHealth(
        baselineCapacities,
        systems
      );

      const normalizedSimulation = {
        ...data,
        beforeHealth,
        dependencies:
          data.dependencies ?? DEFAULT_DEPENDENCIES,
        recoveryRecommendations:
          data.recoveryRecommendations ??
          getRecoveryRecommendations(
            data.initialFailure ?? selectedSystem,
            Number(data.systemHealth ?? beforeHealth)
          ),
      };

      setSimulation(normalizedSimulation);
      setBackendConnected(true);

      if (user?.role === "ADMIN") {
        await loadDatabaseHistory();
      }
    } catch (requestError) {
      setError(
        requestError.message ||
          "Simulation failed. Check the backend and database."
      );
    } finally {
      setLoading(false);
    }
  }

  async function resetSimulation() {
    if (user?.role !== "ADMIN") {
      setError("Only administrators can reset simulations.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      await apiRequest("/simulation/reset", {
        method: "POST",
      });

      setSimulation(null);
    } catch (requestError) {
      setError(
        requestError.message ||
          "Could not reset the simulation."
      );
    } finally {
      setLoading(false);
    }
  }

  function getNodeStatus(name) {
    if (!simulation) return "Operational";

    return simulation.statuses?.[name] ?? "Operational";
  }

  function getCapacity(name) {
    if (!simulation) {
      return (
        systems.find((system) => system.name === name)?.capacity ?? 0
      );
    }

    return Number(
      simulation.capacities?.[name] ??
        systems.find((system) => system.name === name)?.capacity ??
        0
    );
  }

  function getConnectionStatus(source, target) {
    const sourceStatus = getNodeStatus(source);
    const targetStatus = getNodeStatus(target);

    if (
      sourceStatus === "Initial Failure" ||
      targetStatus === "Initial Failure"
    ) {
      return "connection-failed";
    }

    if (
      sourceStatus === "Affected" ||
      targetStatus === "Affected"
    ) {
      return "connection-affected";
    }

    return "connection-operational";
  }

  function downloadCSV() {
    if (user?.role !== "ADMIN") {
      setError("Only administrators can export simulation history.");
      return;
    }

    if (history.length === 0) {
      setError("There are no saved simulations to export.");
      return;
    }

    const headers = [
      "Database ID",
      "Simulation Time",
      "Initial Failure",
      "Affected Components",
      "Operational Components",
      "System Health (%)",
    ];

    const rows = history.map((record) => [
      record.id,
      record.time,
      record.component,
      record.affectedCount,
      record.stillOperational,
      record.afterHealth,
    ]);

    const escapeCSV = (value) =>
      `"${String(value ?? "").replace(/"/g, '""')}"`;

    const csvContent = [
      headers.map(escapeCSV).join(","),
      ...rows.map((row) => row.map(escapeCSV).join(",")),
    ].join("\r\n");

    const blob = new Blob(["\uFEFF" + csvContent], {
      type: "text/csv;charset=utf-8;",
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = `GridResQ_Report_${new Date()
      .toISOString()
      .slice(0, 10)}.csv`;

    document.body.appendChild(link);
    link.click();
    link.remove();

    setTimeout(() => URL.revokeObjectURL(url), 1000);
    setError("");
  }

  const baselineHealth = getHealth(
    Object.fromEntries(
      systems.map((system) => [
        system.name,
        system.capacity,
      ])
    ),
    systems
  );

  const currentHealth = simulation
    ? Number(simulation.systemHealth ?? baselineHealth)
    : baselineHealth;

  const affectedCount = simulation?.affectedCount ?? 0;

  const operationalCount = simulation
    ? Number(
        simulation.stillOperational ??
          simulation.operationalCount ??
          0
      )
    : systems.filter(
        (system) => system.status === "Operational"
      ).length;

  const riskLevel =
    simulation?.riskLevel ?? getRiskLevel(currentHealth);

  const recoveryRecommendations = simulation
    ? simulation.recoveryRecommendations ??
      getRecoveryRecommendations(
        simulation.initialFailure,
        currentHealth
      )
    : [];

  const dependencies =
    simulation?.dependencies ?? DEFAULT_DEPENDENCIES;

  if (authChecking) {
    return (
      <div className="auth-loading">
        Checking your GridResQ session...
      </div>
    );
  }

  if (!user) {
    return <AuthPage onLogin={handleLogin} />;
  }

  // Only ADMIN accounts can open the Admin Dashboard.
  if (showAdmin && user.role === "ADMIN") {
    return (
      <AdminPage
        onBack={() => setShowAdmin(false)}
      />
    );
  }

  return (
    <div className="app">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-icon">G</div>
          <div>
            <h2>GridResQ</h2>
            <span>RESILIENCE PLATFORM</span>
          </div>
        </div>

        <div className="side-label">MAIN MENU</div>

        <button
          className="nav-item active"
          onClick={() =>
            document
              .getElementById("dashboard")
              ?.scrollIntoView({ behavior: "smooth" })
          }
        >
          <span>▦</span> Dashboard
        </button>

        <button
          className="nav-item"
          onClick={() =>
            document
              .getElementById("network-section")
              ?.scrollIntoView({ behavior: "smooth" })
          }
        >
          <span>⌘</span> Infrastructure
        </button>

        <button
          className="nav-item"
          onClick={() =>
            document
              .getElementById("simulation-section")
              ?.scrollIntoView({ behavior: "smooth" })
          }
        >
          <span>◉</span> Simulations
        </button>

        {user.role === "ADMIN" && (
          <button
            className="nav-item"
            onClick={() =>
              document
                .getElementById("history-section")
                ?.scrollIntoView({ behavior: "smooth" })
            }
          >
            <span>▤</span> Reports & History
          </button>
        )}

        {user.role === "ADMIN" && (
          <button
            className="nav-item"
            onClick={() => {
              setShowAdmin(true);
              setError("");
            }}
          >
            <span>⚙</span> Admin Dashboard
          </button>
        )}

        <div className="sidebar-bottom">
          <div className="connection-card">
            <span
              className={`connection-dot ${
                backendConnected ? "online" : "offline"
              }`}
            />

            <div>
              <strong>Backend Status</strong>
              <p>
                {backendConnected ? "Connected" : "Disconnected"}
              </p>
            </div>
          </div>

          <div className="sidebar-footer">
            GridResQ v1.1
            <br />
            Infrastructure Resilience
          </div>
        </div>
      </aside>

      <main className="main-content" id="dashboard">
        <header className="topbar">
          <div>
            <div className="breadcrumb">
              Workspace / Dashboard
            </div>

            <h1>Infrastructure Resilience Dashboard</h1>

            <p className="subtitle">
              Monitor critical infrastructure and simulate cascading
              failures.
            </p>
          </div>

          <div className="topbar-right">
            <span className="live-indicator">
              <span /> SYSTEM MONITOR
            </span>

            <div className="user-info">
              <strong>{user.fullName}</strong>
              <span>{user.role}</span>
            </div>

            <button
              className="logout-button"
              onClick={handleLogout}
              disabled={logoutLoading}
            >
              {logoutLoading ? "Logging out..." : "Logout"}
            </button>
          </div>
        </header>

        {error && (
          <div className="error-banner" role="alert">
            <span>⚠ {error}</span>
            <button onClick={() => setError("")}>×</button>
          </div>
        )}

        <section className="metrics-grid">
          <div className="metric-card">
            <div className="metric-top">
              <span className="metric-label">
                INFRASTRUCTURE SYSTEMS
              </span>
              <span className="metric-icon blue">⌘</span>
            </div>
            <div className="metric-value">{systems.length}</div>
            <div className="metric-description">
              Critical components monitored
            </div>
          </div>

          <div className="metric-card">
            <div className="metric-top">
              <span className="metric-label">
                CURRENT SYSTEM HEALTH
              </span>
              <span className="metric-icon green">♥</span>
            </div>
            <div className="metric-value">
              {currentHealth}
              <span className="metric-unit">%</span>
            </div>
            <div className="progress-track">
              <div
                className={`progress-fill ${
                  currentHealth < 50
                    ? "progress-red"
                    : currentHealth < 75
                    ? "progress-orange"
                    : ""
                }`}
                style={{
                  width: `${Math.max(
                    0,
                    Math.min(100, currentHealth)
                  )}%`,
                }}
              />
            </div>
          </div>

          <div className="metric-card">
            <div className="metric-top">
              <span className="metric-label">
                AFFECTED COMPONENTS
              </span>
              <span className="metric-icon orange">⚠</span>
            </div>
            <div className="metric-value">{affectedCount}</div>
            <div className="metric-description">
              Components impacted in current simulation
            </div>
          </div>

          <div className="metric-card">
            <div className="metric-top">
              <span className="metric-label">
                OPERATIONAL SYSTEMS
              </span>
              <span className="metric-icon green">✓</span>
            </div>
            <div className="metric-value">{operationalCount}</div>
            <div className="metric-description">
              Out of {systems.length} components
            </div>
          </div>
        </section>

        <section className="comparison-grid">
          <div className="comparison-card">
            <span>BASELINE HEALTH</span>
            <strong>{baselineHealth}%</strong>
            <p>Average initial component capacity</p>
          </div>

          <div className="comparison-card">
            <span>SIMULATED HEALTH</span>
            <strong>{currentHealth}%</strong>
            <p>
              {simulation
                ? `Failure: ${simulation.initialFailure}`
                : "Run a scenario to calculate impact"}
            </p>
          </div>

          <div className="comparison-card">
            <span>HEALTH CHANGE</span>
            <strong
              className={
                currentHealth < baselineHealth
                  ? "text-red"
                  : "text-green"
              }
            >
              {currentHealth - baselineHealth > 0 ? "+" : ""}
              {currentHealth - baselineHealth}%
            </strong>
            <p>Difference from baseline health</p>
          </div>
        </section>

        <section className="content-grid">
          <div
            className="panel network-panel"
            id="network-section"
          >
            <div className="panel-header">
              <div>
                <h2>Infrastructure Network</h2>
                <p>
                  Visual representation of infrastructure dependencies
                </p>
              </div>
              <span className="panel-badge">
                {simulation ? "SIMULATION ACTIVE" : "NORMAL STATE"}
              </span>
            </div>

            <div className="network-map">
              <svg
                className="network-lines"
                viewBox="0 0 100 100"
                preserveAspectRatio="none"
              >
                {CONNECTIONS.map(([source, target]) => {
                  const a = NODES.find(
                    (node) => node.name === source
                  );
                  const b = NODES.find(
                    (node) => node.name === target
                  );

                  return (
                    <line
                      key={`${source}-${target}`}
                      x1={a.x}
                      y1={a.y}
                      x2={b.x}
                      y2={b.y}
                      className={getConnectionStatus(
                        source,
                        target
                      )}
                    />
                  );
                })}
              </svg>

              {NODES.map((node) => {
                const status = getNodeStatus(node.name);

                return (
                  <button
                    key={node.name}
                    className={`network-node ${getStatusClass(status)}`}
                    style={{
                      left: `${node.x}%`,
                      top: `${node.y}%`,
                    }}
                    onClick={() => setSelectedSystem(node.name)}
                    title={`Select ${node.name}`}
                  >
                    <span className="node-icon">{node.icon}</span>
                    <span className="node-name">{node.name}</span>
                    <span className="node-capacity">
                      {getCapacity(node.name)}% capacity
                    </span>
                    <span className="node-status">{status}</span>
                  </button>
                );
              })}
            </div>

            <div className="network-legend">
              <span>
                <i className="legend-dot operational-dot" /> Operational
              </span>
              <span>
                <i className="legend-dot affected-dot" /> Affected
              </span>
              <span>
                <i className="legend-dot failed-dot" /> Initial Failure
              </span>
            </div>
          </div>

          <div
            className="panel simulation-panel"
            id="simulation-section"
          >
            <div className="panel-header">
              <div>
                <h2>Scenario Lab</h2>
                <p>Test infrastructure failure scenarios</p>
              </div>
              <span className="lab-icon">⚗</span>
            </div>

            <div className="form-group">
              <label htmlFor="failure-component">
                INITIAL FAILURE COMPONENT
              </label>
              <select
                id="failure-component"
                value={selectedSystem}
                onChange={(event) =>
                  setSelectedSystem(event.target.value)
                }
              >
                {systems.map((system) => (
                  <option key={system.name} value={system.name}>
                    {system.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="scenario-info">
              <div className="scenario-info-icon">ⓘ</div>
              <div>
                <strong>Failure Scenario</strong>
                <p>
                  Simulate the loss of{" "}
                  <strong>{selectedSystem}</strong> and observe the
                  potential impact on connected infrastructure.
                </p>
              </div>
            </div>

            <div className="simulation-buttons">
              <button
                className="primary-button"
                onClick={runSimulation}
                disabled={loading || !backendConnected}
              >
                {loading ? "Processing..." : "▶ Run Simulation"}
              </button>

              {user.role === "ADMIN" && (
                <button
                  className="secondary-button"
                  onClick={resetSimulation}
                  disabled={loading}
                >
                  ↻ Reset
                </button>
              )}
            </div>

            <div className="scenario-divider" />
            <h3 className="mini-heading">SIMULATION SUMMARY</h3>

            <div className="summary-row">
              <span>Initial failure</span>
              <strong>
                {simulation?.initialFailure ?? "Not started"}
              </strong>
            </div>
            <div className="summary-row">
              <span>Affected components</span>
              <strong>{affectedCount}</strong>
            </div>
            <div className="summary-row">
              <span>Remaining operational</span>
              <strong>{operationalCount}</strong>
            </div>

            {simulation && (
              <div className="simulation-success">
                ✓ {simulation.message}
              </div>
            )}
          </div>
        </section>

        <section className="panel results-panel">
          <div className="panel-header">
            <div>
              <h2>Risk Assessment & Recovery</h2>
              <p>
                Simulation-based risk classification and recovery
                guidance.
              </p>
            </div>
            <span className="results-count">RISK ANALYSIS</span>
          </div>

          {!simulation ? (
            <div className="empty-history">
              <div>⚠</div>
              <strong>No active failure scenario</strong>
              <p>
                Run a simulation to calculate risk and display
                recovery recommendations.
              </p>
            </div>
          ) : (
            <div style={{ padding: "20px" }}>
              <span className="metric-label">SIMULATED RISK LEVEL</span>
              <h2
                style={{
                  color: getRiskColor(riskLevel),
                  marginTop: "10px",
                }}
              >
                {riskLevel} Risk
              </h2>

              <p>
                System health: {currentHealth}% | Affected components:{" "}
                {affectedCount}
              </p>

              <div style={{ marginTop: "24px" }}>
                <h3>Infrastructure Dependencies</h3>
                <p style={{ fontSize: "13px", color: "#64748b" }}>
                  Modeled dependencies used in this illustrative
                  simulation.
                </p>

                <div
                  style={{
                    display: "grid",
                    gap: "10px",
                    marginTop: "14px",
                  }}
                >
                  {Object.entries(dependencies).map(
                    ([component, componentDependencies]) => (
                      <div
                        key={component}
                        style={{
                          padding: "12px",
                          border: "1px solid #e2e8f0",
                          borderRadius: "8px",
                          background: "#f8fafc",
                        }}
                      >
                        <strong>{component}</strong>
                        <p
                          style={{
                            margin: "5px 0 0",
                            color: "#475569",
                            fontSize: "13px",
                          }}
                        >
                          Depends on:{" "}
                          {Array.isArray(componentDependencies) &&
                          componentDependencies.length
                            ? componentDependencies.join(", ")
                            : "No modeled dependencies"}
                        </p>
                      </div>
                    )
                  )}
                </div>
              </div>

              <h3 style={{ marginTop: "24px" }}>
                Recommended Recovery Actions
              </h3>
              <ol style={{ lineHeight: "2", paddingLeft: "22px" }}>
                {recoveryRecommendations.map((recommendation, index) => (
                  <li
                    key={`${index}-${recommendation}`}
                    style={{ marginBottom: "8px" }}
                  >
                    {recommendation}
                  </li>
                ))}
              </ol>

              <p style={{ fontSize: "12px", color: "#64748b" }}>
                Risk thresholds, dependencies, and recommendations are
                illustrative prototype rules, not validated real-world
                safety assessments.
              </p>
            </div>
          )}
        </section>

        <section className="panel results-panel">
          <div className="panel-header">
            <div>
              <h2>Infrastructure Assessment</h2>
              <p>Component capacity and operational status</p>
            </div>
            <span className="results-count">
              {systems.length} COMPONENTS
            </span>
          </div>

          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>INFRASTRUCTURE</th>
                  <th>CAPACITY</th>
                  <th>CAPACITY LEVEL</th>
                  <th>STATUS</th>
                </tr>
              </thead>
              <tbody>
                {systems.map((system) => {
                  const capacity = getCapacity(system.name);
                  const status = getNodeStatus(system.name);

                  return (
                    <tr key={system.name}>
                      <td>
                        <div className="table-system">
                          <span
                            className={`table-system-icon ${getStatusClass(status)}`}
                          >
                            {NODES.find(
                              (node) => node.name === system.name
                            )?.icon ?? "●"}
                          </span>
                          <strong>{system.name}</strong>
                        </div>
                      </td>
                      <td>
                        <strong>{capacity}%</strong>
                      </td>
                      <td>
                        <div className="table-progress">
                          <div
                            className={`table-progress-fill ${
                              capacity < 40
                                ? "progress-red"
                                : capacity < 70
                                ? "progress-orange"
                                : ""
                            }`}
                            style={{
                              width: `${Math.max(
                                0,
                                Math.min(100, capacity)
                              )}%`,
                            }}
                          />
                        </div>
                      </td>
                      <td>
                        <span
                          className={`status-pill ${getStatusClass(status)}`}
                        >
                          <i /> {status}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="results-footer">
            <span>
              {simulation
                ? "Showing simulated infrastructure results"
                : "Showing baseline infrastructure data"}
            </span>
            <button onClick={loadInfrastructure}>
              ↻ Refresh data
            </button>
          </div>
        </section>

        {user.role === "ADMIN" && (
          <section
            className="panel history-panel"
            id="history-section"
          >
            <div className="panel-header history-header">
              <div>
                <h2>Simulation History & Reports</h2>
                <p>
                  Saved scenarios retrieved from the MySQL database.
                </p>
              </div>

              <div className="history-actions">
                <button
                  className="secondary-button"
                  onClick={loadDatabaseHistory}
                  disabled={historyLoading}
                >
                  {historyLoading ? "Loading..." : "↻ Refresh History"}
                </button>
                <button
                  className="primary-button download-button"
                  onClick={downloadCSV}
                  disabled={history.length === 0}
                >
                  ↓ Download CSV
                </button>
              </div>
            </div>

            {historyError && (
              <div className="error-banner" role="alert">
                <span>⚠ {historyError}</span>
                <button onClick={() => setHistoryError("")}>×</button>
              </div>
            )}

            <div className="history-stats">
              <div>
                <span>Recorded simulations</span>
                <strong>{history.length}</strong>
              </div>
              <div>
                <span>Most recent scenario</span>
                <strong>{history[0]?.component ?? "None yet"}</strong>
              </div>
              <div>
                <span>Latest health after failure</span>
                <strong>
                  {history.length ? `${history[0].afterHealth}%` : "—"}
                </strong>
              </div>
            </div>

            {historyLoading && history.length === 0 ? (
              <div className="empty-history">
                <div>↻</div>
                <strong>Loading saved simulations...</strong>
                <p>Retrieving records from the backend.</p>
              </div>
            ) : history.length === 0 ? (
              <div className="empty-history">
                <div>▤</div>
                <strong>No simulation history yet</strong>
                <p>
                  Run a failure scenario to save a record in MySQL.
                </p>
              </div>
            ) : (
              <div className="table-wrapper">
                <table>
                  <thead>
                    <tr>
                      <th>DATABASE ID</th>
                      <th>TIME</th>
                      <th>INITIAL FAILURE</th>
                      <th>AFFECTED</th>
                      <th>HEALTH AFTER</th>
                      <th>OPERATIONAL</th>
                    </tr>
                  </thead>
                  <tbody>
                    {history.map((record) => (
                      <tr key={record.id}>
                        <td>{record.id}</td>
                        <td>{record.time}</td>
                        <td><strong>{record.component}</strong></td>
                        <td>{record.affectedCount}</td>
                        <td className="text-red">{record.afterHealth}%</td>
                        <td>{record.stillOperational}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <p className="history-note">
              History is retrieved from MySQL and remains available
              after a browser refresh. Resetting the active simulation
              does not delete database records.
            </p>
          </section>
        )}

        <footer className="app-footer">
          <span>GridResQ © 2026</span>
          <span>
            Critical Infrastructure Resilience & Simulation Platform
          </span>
        </footer>
      </main>
    </div>
  );
}

export default App;