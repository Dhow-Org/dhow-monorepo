import { Navigate, Route, Routes } from "react-router-dom";
import { AppShell } from "./components/AppShell";
import { Cockpit } from "./pages/Cockpit";
import { Funders } from "./pages/Funders";
import { Landing } from "./landing/Landing";
import { useSession } from "./hooks/useSession";

export function App() {
  const session = useSession();

  // Before sign-in: the cinematic landing page. After: the working app.
  if (!session.authed) {
    return <Landing session={session} />;
  }

  return (
    <AppShell session={session}>
      <Routes>
        <Route path="/" element={<Cockpit session={session} />} />
        <Route path="/pool" element={<Funders />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AppShell>
  );
}
