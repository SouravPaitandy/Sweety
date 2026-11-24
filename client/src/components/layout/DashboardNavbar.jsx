import { NavLink } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";

function DashboardNavbar() {
  const { user, logout } = useAuth();

  const navLinkClass = ({ isActive }) =>
    `rounded-lg px-3 py-2 text-sm font-medium transition ${
      isActive
        ? "bg-teal-50 text-teal-800"
        : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
    }`;

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/95 backdrop-blur">
      <div className="mx-auto flex min-h-16 max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6 lg:px-8">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-teal-700 text-white">
            <span className="text-lg">♥</span>
          </div>

          <span className="text-xl font-bold tracking-tight text-slate-900">
            Sweety<span className="text-teal-700">.</span>
          </span>
        </div>

        <nav className="flex items-center gap-1">
          <NavLink to="/dashboard" className={navLinkClass}>
            Dashboard
          </NavLink>

          <NavLink to="/readings" className={navLinkClass}>
            Readings
          </NavLink>

          <NavLink to="/reports" className={navLinkClass}>
            Reports
          </NavLink>
        </nav>

        <div className="flex items-center gap-3">
          <div className="hidden text-right sm:block">
            <p className="text-sm font-semibold text-slate-800">{user?.name}</p>
            <p className="text-xs text-slate-400">Personal account</p>
          </div>

          <button
            onClick={logout}
            className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-600 transition hover:border-red-200 hover:bg-red-50 hover:text-red-600"
          >
            Logout
          </button>
        </div>
      </div>
    </header>
  );
}

export default DashboardNavbar;
