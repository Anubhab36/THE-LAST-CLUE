import { useEffect, useState, type FormEvent } from "react";
import { getMyAccount, loginAccount, registerAccount, type AuthUser } from "../services/api";

const TOKEN_KEY = "the-last-clue-auth-token";

export default function AccountAccess() {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [user, setUser] = useState<AuthUser | null>(null);
  const [email, setEmail] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    const token = window.localStorage.getItem(TOKEN_KEY);
    if (!token) return;
    getMyAccount(token).then(setUser).catch(() => window.localStorage.removeItem(TOKEN_KEY));
  }, []);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true); setError(""); setNotice("");
    try {
      const result = mode === "register"
        ? await registerAccount(email, displayName, password)
        : await loginAccount(email, password);
      window.localStorage.setItem(TOKEN_KEY, result.access_token);
      setUser(result.user); setPassword("");
      setNotice(mode === "register" ? "Account created. You are signed in." : "Signed in successfully.");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to authenticate. Please try again.");
    } finally { setBusy(false); }
  }

  function signOut() {
    window.localStorage.removeItem(TOKEN_KEY);
    setUser(null); setNotice("You have signed out."); setError("");
  }

  return <section className="account-access panel">
    <div className="panel-heading"><div><span className="panel-number">00</span><h2>PLAYER ACCOUNT</h2></div><span className="count">{user ? "SIGNED IN" : "OPTIONAL"}</span></div>
    {user ? <div className="account-signed-in">
      <div><span className="account-label">CURRENT OPERATOR</span><strong>{user.display_name}</strong><small>{user.email}</small></div>
      <button className="secondary account-submit" type="button" onClick={signOut}>SIGN OUT</button>
    </div> : <form className="account-form" onSubmit={submit}>
      <p className="muted account-intro">Create an account or sign in. You can still play without an account.</p>
      <div className="account-tabs">
        <button type="button" className={mode === "login" ? "selected" : ""} onClick={() => {setMode("login");setError("");}}>SIGN IN</button>
        <button type="button" className={mode === "register" ? "selected" : ""} onClick={() => {setMode("register");setError("");}}>CREATE ACCOUNT</button>
      </div>
      {mode === "register" && <label>DISPLAY NAME<input autoComplete="name" value={displayName} onChange={e => setDisplayName(e.target.value)} minLength={2} maxLength={60} required /></label>}
      <label>EMAIL ADDRESS<input type="email" autoComplete="email" value={email} onChange={e => setEmail(e.target.value)} maxLength={254} required /></label>
      <label>PASSWORD<input type="password" autoComplete={mode === "login" ? "current-password" : "new-password"} value={password} onChange={e => setPassword(e.target.value)} minLength={mode === "login" ? 1 : 10} maxLength={128} required />{mode === "register" && <small>At least 10 characters, including a letter and a number.</small>}</label>
      <button className="primary account-submit" type="submit" disabled={busy}>{busy ? "PLEASE WAIT…" : mode === "login" ? "SIGN IN →" : "CREATE ACCOUNT →"}</button>
      {error && <p className="welcome-error" role="alert">{error}</p>}
    </form>}
    {notice && <p className="account-notice" role="status">{notice}</p>}
  </section>;
}
