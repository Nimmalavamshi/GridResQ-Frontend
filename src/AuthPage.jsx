import { useState } from "react";
import { apiRequest } from "./api";
import "./AuthPage.css";

export default function AuthPage({ onLogin }) {
  const [mode, setMode] = useState("login");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  async function handleSubmit(event) {
    event.preventDefault();

    setLoading(true);
    setError("");
    setMessage("");

    try {
      if (mode === "register") {
        await apiRequest("/auth/register", {
          method: "POST",
          body: JSON.stringify({
            fullName: fullName.trim(),
            email: email.trim(),
            password,
          }),
        });

        setMessage(
          "Registration successful! You can now log in."
        );

        setMode("login");
        setPassword("");
      } else {
        const user = await apiRequest("/auth/login", {
          method: "POST",
          body: JSON.stringify({
            email: email.trim(),
            password,
          }),
        });

        setPassword("");
        onLogin(user);
      }
    } catch (err) {
      setError(err.message || "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="auth-page">
      <section className="auth-card">
        <div className="auth-brand">
          <div className="auth-logo">G</div>
          <div>
            <h1>GridResQ</h1>
            <p>CRITICAL INFRASTRUCTURE RESILIENCE</p>
          </div>
        </div>

        <div className="auth-heading">
          <h2>
            {mode === "login"
              ? "Welcome back"
              : "Create your account"}
          </h2>

          <p>
            {mode === "login"
              ? "Sign in to access your infrastructure dashboard."
              : "Register to access the GridResQ platform."}
          </p>
        </div>

        {error && (
          <div className="auth-error" role="alert">
            {error}
          </div>
        )}

        {message && (
          <div className="auth-success" role="status">
            {message}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          {mode === "register" && (
            <div className="auth-field">
              <label htmlFor="fullName">Full name</label>
              <input
                id="fullName"
                type="text"
                autoComplete="name"
                value={fullName}
                onChange={(event) =>
                  setFullName(event.target.value)
                }
                placeholder="Enter your full name"
                maxLength={100}
                required
              />
            </div>
          )}

          <div className="auth-field">
            <label htmlFor="email">Email address</label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(event) =>
                setEmail(event.target.value)
              }
              placeholder="you@example.com"
              maxLength={150}
              required
            />
          </div>

          <div className="auth-field">
            <label htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              autoComplete={
                mode === "login"
                  ? "current-password"
                  : "new-password"
              }
              value={password}
              onChange={(event) =>
                setPassword(event.target.value)
              }
              placeholder={
                mode === "login"
                  ? "Enter your password"
                  : "At least 8 characters"
              }
              minLength={mode === "register" ? 8 : undefined}
              required
            />
          </div>

          <button
            className="auth-submit"
            type="submit"
            disabled={loading}
          >
            {loading
              ? "Please wait..."
              : mode === "login"
              ? "Sign in"
              : "Create account"}
          </button>
        </form>

        <div className="auth-switch">
          {mode === "login" ? (
            <>
              Don't have an account?{" "}
              <button
                type="button"
                onClick={() => {
                  setMode("register");
                  setError("");
                  setMessage("");
                }}
              >
                Register
              </button>
            </>
          ) : (
            <>
              Already registered?{" "}
              <button
                type="button"
                onClick={() => {
                  setMode("login");
                  setError("");
                  setMessage("");
                }}
              >
                Sign in
              </button>
            </>
          )}
        </div>

        <p className="auth-footer">
          GridResQ · Infrastructure Simulation Platform
        </p>
      </section>
    </main>
  );
}