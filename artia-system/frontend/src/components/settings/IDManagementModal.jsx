import { useEffect, useMemo, useState } from 'react';
import Modal from '../common/Modal/Modal';
import Button from '../common/Button/Button';
import Input from '../common/Input/Input';
import { useProjects } from '../../hooks/useProjects';

export default function IDManagementModal({ isOpen, onClose }) {
  const { data, isLoading } = useProjects();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedProject, setSelectedProject] = useState(null);

  const projects = useMemo(() => data?.data || [], [data]);
  const selectedProjectId = selectedProject?.id || null;

  useEffect(() => {
    if (!selectedProjectId && projects.length > 0) {
      setSelectedProject(projects[0]);
      return;
    }

    if (selectedProjectId) {
      const updatedSelectedProject = projects.find(project => project.id === selectedProjectId) || null;
      setSelectedProject(updatedSelectedProject);
    }
  }, [projects, selectedProjectId]);

  const filteredProjects = projects.filter(project =>
    project.number.toLowerCase().includes(searchTerm.toLowerCase()) ||
    project.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Diretório de IDs e Projetos" size="xl">
      <div className="space-y-6">
        <div className="bg-light-panel2 dark:bg-dark-panel2 rounded-lg p-4">
          <h3 className="font-semibold mb-2">Fonte oficial: backend</h3>
          <p className="text-sm text-light-muted dark:text-dark-muted">
            Os projetos e IDs exibidos aqui vêm do backend. Para atualizar a base, use a ação Dados no topo da aplicação.
          </p>
        </div>

        <div>
          <Input
            placeholder="🔍 Buscar projeto..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="mb-3"
          />

          <div className="grid grid-cols-2 gap-4">
            <div className="border border-light-line dark:border-dark-line rounded-lg p-4 max-h-96 overflow-y-auto">
              <h4 className="font-semibold mb-3">Projetos ({filteredProjects.length})</h4>
              {isLoading ? (
                <div className="text-sm text-light-muted dark:text-dark-muted">Carregando projetos...</div>
              ) : (
                <div className="space-y-2">
                  {filteredProjects.map(project => (
                    <div
                      key={project.id}
                      onClick={() => setSelectedProject(project)}
                      className={`p-3 rounded-lg cursor-pointer transition-colors ${
                        selectedProject?.id === project.id
                          ? 'bg-primary/20 border-2 border-primary'
                          : 'bg-light-panel dark:bg-dark-panel hover:bg-light-panel2 dark:hover:bg-dark-panel2 border border-light-line dark:border-dark-line'
                      }`}
                    >
                      <div className="font-semibold">{project.number}</div>
                      <div className="text-sm text-light-muted dark:text-dark-muted">
                        {project.name}
                      </div>
                      <div className="text-xs text-light-muted dark:text-dark-muted mt-1">
                        {project.activities?.length || 0} atividades
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="border border-light-line dark:border-dark-line rounded-lg p-4 max-h-96 overflow-y-auto">
              {selectedProject ? (
                <>
                  <h4 className="font-semibold mb-3">
                    Atividades - {selectedProject.number}
                  </h4>

                  <div className="space-y-2">
                    {selectedProject.activities?.map(activity => (
                      <div
                        key={activity.id}
                        className="p-3 rounded-lg bg-light-panel dark:bg-dark-panel border border-light-line dark:border-dark-line"
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="font-medium">{activity.label}</div>
                            {activity.artiaId && (
                              <div className="text-xs text-primary">
                                ID: {activity.artiaId}
                              </div>
                            )}
                          </div>
                        </div>
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

        <div className="flex justify-end pt-4 border-t border-light-line dark:border-dark-line">
          <Button variant="primary" onClick={onClose}>
            Fechar
          </Button>
        </div>
      </div>
    </Modal>
  );
}
