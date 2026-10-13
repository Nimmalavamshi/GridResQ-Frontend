import { useCallback, useEffect, useState } from "react";
import { apiRequest } from "./api";

const styles = {
  page: {
    minHeight: "100vh",
    background: "#f1f5f9",
    color: "#0f172a",
    padding: "32px 24px",
    fontFamily: "Arial, sans-serif",
  },
  container: {
    maxWidth: "1150px",
    margin: "0 auto",
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    flexWrap: "wrap",
    gap: "18px",
    marginBottom: "30px",
  },
  eyebrow: {
    color: "#2563eb",
    fontSize: "13px",
    fontWeight: "700",
    letterSpacing: "2px",
    marginBottom: "10px",
  },
  title: {
    color: "#0f172a",
    fontSize: "32px",
    margin: "0 0 10px",
  },
  subtitle: {
    color: "#475569",
    fontSize: "16px",
    margin: 0,
  },
  button: {
    border: "none",
    borderRadius: "8px",
    padding: "12px 18px",
    background: "#2563eb",
    color: "#ffffff",
    fontSize: "14px",
    fontWeight: "600",
    cursor: "pointer",
    marginLeft: "8px",
  },
  secondaryButton: {
    border: "1px solid #cbd5e1",
    borderRadius: "8px",
    padding: "12px 18px",
    background: "#ffffff",
    color: "#0f172a",
    fontSize: "14px",
    fontWeight: "600",
    cursor: "pointer",
  },
  cards: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))",
    gap: "16px",
    marginBottom: "28px",
  },
  card: {
    background: "#ffffff",
    border: "1px solid #e2e8f0",
    borderRadius: "12px",
    padding: "24px",
    boxShadow: "0 3px 12px rgba(15, 23, 42, 0.04)",
  },
  cardLabel: {
    color: "#475569",
    fontSize: "14px",
    marginBottom: "14px",
  },
  cardNumber: {
    color: "#2563eb",
    fontSize: "34px",
    fontWeight: "700",
    marginBottom: "10px",
  },
  cardDescription: {
    color: "#64748b",
    fontSize: "13px",
  },
  panel: {
    background: "#ffffff",
    border: "1px solid #e2e8f0",
    borderRadius: "12px",
    padding: "24px",
    boxShadow: "0 3px 12px rgba(15, 23, 42, 0.04)",
    overflowX: "auto",
  },
  panelTitle: {
    color: "#0f172a",
    fontSize: "23px",
    margin: "0 0 8px",
  },
  panelDescription: {
    color: "#64748b",
    fontSize: "14px",
    marginBottom: "24px",
  },
  table: {
    width: "100%",
    minWidth: "780px",
    borderCollapse: "collapse",
    textAlign: "left",
  },
  th: {
    background: "#eff6ff",
    color: "#1e3a8a",
    padding: "15px 12px",
    fontSize: "13px",
    borderBottom: "1px solid #dbeafe",
  },
  td: {
    color: "#334155",
    padding: "17px 12px",
    fontSize: "13px",
    borderBottom: "1px solid #e2e8f0",
  },
  select: {
    padding: "9px",
    borderRadius: "6px",
    border: "1px solid #cbd5e1",
    background: "#ffffff",
    color: "#0f172a",
    cursor: "pointer",
  },
  error: {
    padding: "14px",
    borderRadius: "8px",
    color: "#991b1b",
    background: "#fee2e2",
    marginBottom: "20px",
  },
  success: {
    padding: "14px",
    borderRadius: "8px",
    color: "#166534",
    background: "#dcfce7",
    marginBottom: "20px",
  },
  footer: {
    textAlign: "center",
    color: "#64748b",
    fontSize: "13px",
    marginTop: "35px",
  },
};

const initialStats = {
  totalUsers: 0,
  totalAdministrators: 0,
  enabledUsers: 0,
  totalSimulations: 0,
};

export default function AdminPage({ onBack }) {
  const [stats, setStats] = useState(initialStats);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busyId, setBusyId] = useState(null);

  const loadDashboard = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const [statsData, usersData] = await Promise.all([
        apiRequest("/admin/stats"),
        apiRequest("/admin/users"),
      ]);

      setStats({
        totalUsers: Number(statsData.totalUsers ?? 0),
        totalAdministrators: Number(
          statsData.totalAdministrators ?? 0
        ),
        enabledUsers: Number(statsData.enabledUsers ?? 0),
        totalSimulations: Number(
          statsData.totalSimulations ?? 0
        ),
      });

      setUsers(Array.isArray(usersData) ? usersData : []);
    } catch (err) {
      setError(
        err.message ||
          "Unable to load the Admin Dashboard. Please log in again if your session expired."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  async function changeRole(user, role) {
    if (user.role === role) return;

    const confirmed = window.confirm(
      `Change ${user.fullName}'s role to ${role}?`
    );

    if (!confirmed) return;

    setBusyId(user.id);
    setError("");
    setNotice("");

    try {
      await apiRequest(`/admin/users/${user.id}/role`, {
        method: "PATCH",
        body: JSON.stringify({ role }),
      });

      setNotice("User role updated successfully.");
      await loadDashboard();
    } catch (err) {
      setError(err.message || "Unable to change the user role.");
    } finally {
      setBusyId(null);
    }
  }

  async function changeStatus(user) {
    const enabled = !user.enabled;

    const confirmed = window.confirm(
      `${enabled ? "Enable" : "Disable"} ${user.fullName}'s account?`
    );

    if (!confirmed) return;

    setBusyId(user.id);
    setError("");
    setNotice("");

    try {
      await apiRequest(`/admin/users/${user.id}/status`, {
        method: "PATCH",
        body: JSON.stringify({ enabled }),
      });

      setNotice(
        `Account ${enabled ? "enabled" : "disabled"} successfully.`
      );

      await loadDashboard();
    } catch (err) {
      setError(err.message || "Unable to update the account status.");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <main style={styles.page}>
      <div style={styles.container}>
        <header style={styles.header}>
          <div>
            <div style={styles.eyebrow}>
              GRIDRESQ · ADMINISTRATION
            </div>

            <h1 style={styles.title}>Admin Dashboard</h1>

            <p style={styles.subtitle}>
              Manage users, permissions, and platform activity.
            </p>
          </div>

          <div>
            <button
              type="button"
              style={styles.secondaryButton}
              onClick={loadDashboard}
              disabled={loading}
            >
              {loading ? "Loading..." : "Refresh"}
            </button>

            <button
              type="button"
              style={styles.button}
              onClick={onBack}
            >
              Back to Dashboard
            </button>
          </div>
        </header>

        {error && (
          <div style={styles.error} role="alert">
            {error}
          </div>
        )}

        {notice && (
          <div style={styles.success} role="status">
            {notice}
          </div>
        )}

        <section style={styles.cards}>
          {[
            {
              label: "Total Users",
              value: stats.totalUsers,
              description: "All registered accounts",
            },
            {
              label: "Administrators",
              value: stats.totalAdministrators,
              description: "Accounts with ADMIN role",
            },
            {
              label: "Enabled Users",
              value: stats.enabledUsers,
              description: "Accounts currently enabled",
            },
            {
              label: "Total Simulations",
              value: stats.totalSimulations,
              description: "Recorded simulation runs",
            },
          ].map((item) => (
            <article key={item.label} style={styles.card}>
              <div style={styles.cardLabel}>{item.label}</div>
              <div style={styles.cardNumber}>
                {loading ? "…" : item.value}
              </div>
              <div style={styles.cardDescription}>
                {item.description}
              </div>
            </article>
          ))}
        </section>

        <section style={styles.panel}>
          <h2 style={styles.panelTitle}>User Management</h2>

          <p style={styles.panelDescription}>
            Manage registered accounts and their permissions.
            {" "}
            <strong>{users.length} accounts</strong>
          </p>

          {loading && users.length === 0 ? (
            <p style={{ color: "#475569" }}>
              Loading users...
            </p>
          ) : (
            <table style={styles.table}>
              <thead>
                <tr>
                  {[
                    "ID",
                    "Full Name",
                    "Email",
                    "Role",
                    "Status",
                    "Registered",
                    "Actions",
                  ].map((heading) => (
                    <th key={heading} style={styles.th}>
                      {heading}
                    </th>
                  ))}
                </tr>
              </thead>

              <tbody>
                {users.map((user) => (
                  <tr key={user.id}>
                    <td style={styles.td}>{user.id}</td>

                    <td style={styles.td}>
                      <strong style={{ color: "#0f172a" }}>
                        {user.fullName}
                      </strong>
                    </td>

                    <td style={styles.td}>{user.email}</td>

                    <td style={styles.td}>
                      <select
                        aria-label={`Role for ${user.fullName}`}
                        style={styles.select}
                        value={user.role}
                        disabled={busyId === user.id}
                        onChange={(event) =>
                          changeRole(user, event.target.value)
                        }
                      >
                        <option value="USER">USER</option>
                        <option value="ADMIN">ADMIN</option>
                      </select>
                    </td>

                    <td style={styles.td}>
                      <span
                        style={{
                          color: user.enabled
                            ? "#15803d"
                            : "#b91c1c",
                          fontWeight: "700",
                        }}
                      >
                        {user.enabled ? "Enabled" : "Disabled"}
                      </span>
                    </td>

                    <td style={styles.td}>
                      {user.createdAt
                        ? new Date(user.createdAt).toLocaleString()
                        : "—"}
                    </td>

                    <td style={styles.td}>
                      <button
                        type="button"
                        disabled={busyId === user.id}
                        onClick={() => changeStatus(user)}
                        style={{
                          ...styles.button,
                          marginLeft: 0,
                          background: user.enabled
                            ? "#dc2626"
                            : "#15803d",
                          opacity:
                            busyId === user.id ? 0.6 : 1,
                        }}
                      >
                        {busyId === user.id
                          ? "Saving..."
                          : user.enabled
                          ? "Disable"
                          : "Enable"}
                      </button>
                    </td>
                  </tr>
                ))}

                {!loading && users.length === 0 && (
                  <tr>
                    <td
                      style={styles.td}
                      colSpan={7}
                    >
                      No registered accounts found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}

          <p
            style={{
              color: "#64748b",
              fontSize: "13px",
              marginTop: "22px",
              marginBottom: 0,
            }}
          >
            Account and role changes are validated by the backend.
          </p>
        </section>

        <footer style={styles.footer}>
          GridResQ · Infrastructure Resilience Platform
        </footer>
      </div>
    </main>
  );
}