import { useState } from 'react';
import { useProjects } from '../../hooks/useProjects';

export default function DirectoryView() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedProject, setSelectedProject] = useState(null);
  
  const { data: projectsData, isLoading } = useProjects();
  const projects = projectsData?.data || [];

  const filteredProjects = projects.filter(project => {
    if (!searchTerm) return true;
    const search = searchTerm.toLowerCase();
    return (
      project.number.toLowerCase().includes(search) ||
      project.name.toLowerCase().includes(search)
    );
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-lg">Carregando projetos...</div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col p-4">
      <div className="mb-4">
        <input
          type="text"
          placeholder="Buscar projeto..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full max-w-md px-4 py-2 rounded-lg bg-light-panel dark:bg-dark-panel border border-light-line dark:border-dark-line focus:outline-none focus:ring-2 focus:ring-primary"
        />
      </div>

      <div className="flex-1 flex gap-4 overflow-hidden">
        <div className="w-1/3 bg-light-panel dark:bg-dark-panel rounded-lg border border-light-line dark:border-dark-line p-4 overflow-y-auto">
          <h3 className="text-sm font-bold uppercase text-light-muted dark:text-dark-muted mb-3">
            Projetos ({filteredProjects.length})
          </h3>
          <div className="space-y-2">
            {filteredProjects.map(project => (
              <div
                key={project.id}
                onClick={() => setSelectedProject(project)}
                className={`p-3 rounded-lg cursor-pointer transition-colors ${
                  selectedProject?.id === project.id
                    ? 'bg-primary/20 border-primary'
                    : 'bg-light-panel2 dark:bg-dark-panel2 hover:bg-light-line dark:hover:bg-dark-line'
                } border`}
              >
                <div className="font-semibold">{project.number}</div>
                <div className="text-sm text-light-muted dark:text-dark-muted truncate">
                  {project.name}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="flex-1 bg-light-panel dark:bg-dark-panel rounded-lg border border-light-line dark:border-dark-line p-4 overflow-y-auto">
          {selectedProject ? (
            <>
              <h3 className="text-sm font-bold uppercase text-light-muted dark:text-dark-muted mb-3">
                Atividades ({selectedProject.activities?.length || 0})
              </h3>
              <div className="space-y-2">
                {selectedProject.activities?.map(activity => (
                  <div
                    key={activity.id}
                    className="p-3 rounded-lg bg-light-panel2 dark:bg-dark-panel2 border border-light-line dark:border-dark-line"
                  >
                    <div className="font-medium">{activity.label}</div>
                    {activity.artiaId && (
                      <div className="text-sm text-primary mt-1">
                        ID: {activity.artiaId}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="flex items-center justify-center h-full text-light-muted dark:text-dark-muted">
              Selecione um projeto para ver as atividades
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
