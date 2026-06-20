import { Navigate, Route, Routes } from "react-router-dom";
import { AppShell } from "./components/AppShell";
import { Cockpit } from "./pages/Cockpit";
import { Funders } from "./pages/Funders";
import { Connect } from "./pages/Connect";
import { useSession } from "./hooks/useSession";

export function App() {
  const session = useSession();
  return (
    <AppShell session={session}>
      <Routes>
        <Route path="/" element={session.authed ? <Cockpit session={session} /> : <Connect session={session} />} />
        <Route path="/pool" element={<Funders />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AppShell>
  );
}
