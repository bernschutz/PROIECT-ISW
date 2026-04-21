import { useState } from "react";
import { supabase } from "../lib/supabase";

export default function AuthPage() {
  const [mode, setMode] = useState("signIn"); // 'signIn' | 'signUp'
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [msg, setMsg] = useState("");


  async function handleSubmit(e) {
    e.preventDefault();
    setMsg("");
    const res =
      mode === "signIn"
        ? await supabase.auth.signInWithPassword({ email, password })
        : await supabase.auth.signUp({ email, password });

    if (res.error) setMsg(res.error.message);
    else setMsg(mode === "signIn" ? "Autentificat." : "Cont creat. Verifică emailul dacă e necesar.");
  }

  
  async function handleReset() {
    if (!email) return setMsg("Introdu emailul ca să-ți pot trimite linkul de resetare.");
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin, // sau o pagină dedicată
    });
    setMsg(error ? error.message : "Ți-am trimis un email de resetare (dacă există acest cont).");
  }
  return (
    <div className="auth">
      <form className="card" onSubmit={handleSubmit} style={{minWidth: 360, display: "grid", gap: 12}}>
        <h2 style={{margin: 0}}>Autentificare</h2>

        <label style={{display:"grid", gap:6}}>
          <span>Email</span>
          <input className="input" placeholder="email@exemplu.com" value={email}
                 onChange={e=>setEmail(e.target.value)} type="email" required/>
        </label>

        <label style={{display:"grid", gap:6}}>
          <span>Parolă</span>
          <input className="input" placeholder="••••••••" value={password}
                 onChange={e=>setPassword(e.target.value)} type="password" required/>
        </label>

        <div style={{display:"flex", gap:10, flexWrap:"wrap"}}>
          <button className="primary" type="submit">
            {mode === "signIn" ? "Autentifică-te" : "Creează cont"}
          </button>
        </div>

        <div style={{display:"flex", gap:10, flexDirection:"column", marginTop:4}}>
          <button type="button" className="ghost" onClick={() => setMode(m => m === "signIn" ? "signUp" : "signIn")}>
            {mode === "signIn" ? "Nu ai cont? Creează unul" : "Ai cont? Intră în cont"}
          </button>
          <button type="button" className="ghost" onClick={handleReset}>
            Ți-ai uitat parola? Reseteaz-o
          </button>
        </div>

        {msg && <div style={{marginTop:6, opacity:.9}}>{msg}</div>}
      </form>
    </div>
  );
}
