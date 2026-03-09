import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { useThemeStore } from './store/slices/uiSlice';
import { AuthProvider } from './contexts/AuthContext';
import Header from './components/layout/Header';
import CalendarView from './components/calendar/CalendarView';
import GanttView from './components/gantt/GanttView';
import TableView from './components/table/TableView';
import ChartsView from './components/charts/ChartsView';
import DirectoryView from './components/directory/DirectoryView';
import WorkedHoursComparison from './pages/WorkedHoursComparison';
import LoginPage from './pages/LoginPage';
import PrivateRoute from './components/auth/PrivateRoute';

function App() {
  const { theme } = useThemeStore();

  return (
    <div className={theme}>
      <div className="app-shell">
        <AuthProvider>
          <Router>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route
              path="/*"
              element={
                <PrivateRoute>
                  <>
                    <Header />
                    <main className="app-main">
                      <Routes>
                        <Route path="/" element={<CalendarView />} />
                        <Route path="/gantt" element={<GanttView />} />
                        <Route path="/table" element={<TableView />} />
                        <Route path="/charts" element={<ChartsView />} />
                        <Route path="/directory" element={<DirectoryView />} />
                        <Route path="/comparison" element={<WorkedHoursComparison />} />
                      </Routes>
                    </main>
                  </>
                </PrivateRoute>
              }
              />
          </Routes>
        </Router>
        </AuthProvider>
      </div>
    </div>
  );
}

export default App;
