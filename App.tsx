import React from 'react';
import { HashRouter, Routes, Route, NavLink } from 'react-router-dom';
import { JobsPage } from './pages/JobsPage';
import { StatisticsPage } from './pages/StatisticsPage';
import { EducationCounselingPage } from './pages/EducationCounselingPage';

const App: React.FC = () => {
  return (
    <HashRouter>
      <div className="min-h-screen flex flex-col">
        <header className="bg-white shadow-md sticky top-0 z-10">
          <nav className="container mx-auto px-6 py-4 flex justify-between items-center">
            <div className="text-2xl font-bold text-sky-600">
              JobPilot+
            </div>
            <div className="flex space-x-6">
              <NavLink
                to="/"
                className={({ isActive }) =>
                  `text-lg font-medium transition-colors duration-200 ${
                    isActive ? 'text-sky-600 border-b-2 border-sky-600' : 'text-slate-600 hover:text-sky-500'
                  }`
                }
              >
                Jobs
              </NavLink>
              <NavLink
                to="/statistik"
                className={({ isActive }) =>
                  `text-lg font-medium transition-colors duration-200 ${
                    isActive ? 'text-sky-600 border-b-2 border-sky-600' : 'text-slate-600 hover:text-sky-500'
                  }`
                }
              >
                Statistik
              </NavLink>
              <NavLink
                to="/bildungsberatung"
                className={({ isActive }) =>
                  `text-lg font-medium transition-colors duration-200 ${
                    isActive ? 'text-sky-600 border-b-2 border-sky-600' : 'text-slate-600 hover:text-sky-500'
                  }`
                }
              >
                Bildungsberatung
              </NavLink>
            </div>
          </nav>
        </header>

        <main className="flex-grow container mx-auto p-6">
          <Routes>
            <Route path="/" element={<JobsPage />} />
            <Route path="/statistik" element={<StatisticsPage />} />
            <Route path="/bildungsberatung" element={<EducationCounselingPage />} />
          </Routes>
        </main>
        
        <footer className="bg-white mt-8 py-4 border-t">
            <div className="container mx-auto text-center text-sm text-slate-500 space-y-1">
                <p>&copy; {new Date().getFullYear()} JobPilot+. Alle Rechte vorbehalten.</p>
                <p>Für zusätzliche Anforderungen oder Anliegen, wenden Sie sich bitte an David Kühnel.</p>
            </div>
        </footer>
      </div>
    </HashRouter>
  );
};

export default App;