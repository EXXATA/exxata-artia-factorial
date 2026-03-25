import { Suspense, lazy } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { GlobalActionProvider } from '../../contexts/GlobalActionContext';
import CalendarView from '../calendar/CalendarView';
import WorkspaceShell from './WorkspaceShell';

const GanttView = lazy(() => import('../gantt/GanttView'));
const TableView = lazy(() => import('../table/TableView'));
const ChartsView = lazy(() => import('../charts/ChartsView'));
const DirectoryView = lazy(() => import('../directory/DirectoryView'));
const WorkedHoursComparison = lazy(() => import('../../pages/WorkedHoursComparison'));

function ViewLoadingFallback() {
  return (
    <div className="flex h-full items-center justify-center">
      <div className="ui-empty-state max-w-md px-6 py-5">
        Carregando visao...
      </div>
    </div>
  );
}

export default function ProtectedLayout() {
  return (
    <GlobalActionProvider>
      <WorkspaceShell>
        <Suspense fallback={<ViewLoadingFallback />}>
          <Routes>
            <Route path="/" element={<CalendarView />} />
            <Route path="/gantt" element={<GanttView />} />
            <Route path="/table" element={<TableView />} />
            <Route path="/charts" element={<ChartsView />} />
            <Route path="/directory" element={<DirectoryView />} />
            <Route path="/comparison" element={<WorkedHoursComparison />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      </WorkspaceShell>
    </GlobalActionProvider>
  );
}
