import { Outlet, useNavigate, useLocation } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { useTheme } from "../lib/useTheme";

export default function App() {
  const [session, setSession] = useState(null);
  const nav = useNavigate();
  const loc = useLocation();
  const { theme, toggleTheme } = useTheme();

  useEffect(() => {
    let mounted = true;

    supabase.auth.getSession().then(({ data }) => mounted && setSession(data.session));

    const { data: { subscription } = { subscription: null } } =
      supabase.auth.onAuthStateChange((_e, s) => {
        if (!mounted) return;
        setSession(s);
        if (!s && loc.pathname !== "/auth") nav("/auth");
        if (s && loc.pathname === "/auth") nav("/");
      });

    return () => {
      mounted = false;
      subscription && subscription.unsubscribe();
    };
  }, [nav, loc.pathname]);



return (
  <div className="app">
    <header className="bar">
      <h1>To-Do</h1>
      <div className="header-actions">
        <button className="ghost" onClick={toggleTheme} title="Schimbă tema">
          {theme === "dark" ? "🌙 Dark" : "🌞 Light"}
        </button>
        {session && (
          <button onClick={() => supabase.auth.signOut()}>
            Logout
          </button>
        )}
      </div>
    </header>

    <main><Outlet context={{ session }} /></main>

  </div>
);

}
