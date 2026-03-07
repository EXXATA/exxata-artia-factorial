import { useState } from 'react';
import Modal from '../common/Modal/Modal';
import Button from '../common/Button/Button';
import Input from '../common/Input/Input';
import { formatDuration, calculateDuration } from '../../utils/timeUtils';
import toast from 'react-hot-toast';

export default function BrokenTimeModal({ isOpen, onClose, day, project, activity, onSave }) {
  const [intervals, setIntervals] = useState([
    { start: '', end: '' }
  ]);

  const addInterval = () => {
    setIntervals([...intervals, { start: '', end: '' }]);
  };

  const removeInterval = (index) => {
    if (intervals.length === 1) {
      toast.error('Deve haver pelo menos um intervalo');
      return;
    }
    setIntervals(intervals.filter((_, i) => i !== index));
  };

  const updateInterval = (index, field, value) => {
    const updated = [...intervals];
    updated[index][field] = value;
    setIntervals(updated);
  };

  const calculateTotalDuration = () => {
    return intervals.reduce((total, interval) => {
      if (interval.start && interval.end) {
        const start = new Date(`${day}T${interval.start}`);
        const end = new Date(`${day}T${interval.end}`);
        return total + calculateDuration(start.toISOString(), end.toISOString());
      }
      return total;
    }, 0);
  };

  const handleSave = () => {
    // Validar intervalos
    const validIntervals = intervals.filter(i => i.start && i.end);
    
    if (validIntervals.length === 0) {
      toast.error('Preencha pelo menos um intervalo');
      return;
    }

    // Verificar sobreposição
    for (let i = 0; i < validIntervals.length; i++) {
      for (let j = i + 1; j < validIntervals.length; j++) {
        const start1 = validIntervals[i].start;
        const end1 = validIntervals[i].end;
        const start2 = validIntervals[j].start;
        const end2 = validIntervals[j].end;

        if ((start1 < end2 && end1 > start2)) {
          toast.error('Intervalos não podem se sobrepor');
          return;
        }
      }
    }

    // Criar eventos para cada intervalo
    const events = validIntervals.map(interval => ({
      day,
      start: new Date(`${day}T${interval.start}`).toISOString(),
      end: new Date(`${day}T${interval.end}`).toISOString(),
      project,
      activityLabel: activity,
      activityId: '',
      notes: '',
      artiaLaunched: false
    }));

    onSave(events);
    onClose();
    setIntervals([{ start: '', end: '' }]);
  };

  const totalDuration = calculateTotalDuration();

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Horário Quebrado" size="md">
      <div className="space-y-4">
        <div className="bg-light-panel2 dark:bg-dark-panel2 rounded-lg p-3">
          <p className="text-sm text-light-muted dark:text-dark-muted">
            💡 Use para registrar múltiplos intervalos no mesmo dia (ex: 09:00-12:00 e 14:00-18:00)
          </p>
        </div>

        {totalDuration > 0 && (
          <div className="bg-primary/10 dark:bg-primary/20 border border-primary/30 rounded-lg p-3">
            <div className="text-sm font-medium text-primary dark:text-primary-light">
              ⏱️ Duração Total: <span className="text-lg font-bold">{formatDuration(totalDuration)}</span>
            </div>
          </div>
        )}

        <div className="space-y-3">
          {intervals.map((interval, index) => (
            <div key={index} className="flex items-center gap-2 p-3 bg-light-panel dark:bg-dark-panel rounded-lg border border-light-line dark:border-dark-line">
              <div className="flex-1 grid grid-cols-2 gap-2">
                <Input
                  type="time"
                  value={interval.start}
                  onChange={(e) => updateInterval(index, 'start', e.target.value)}
                  placeholder="Início"
                />
                <Input
                  type="time"
                  value={interval.end}
                  onChange={(e) => updateInterval(index, 'end', e.target.value)}
                  placeholder="Fim"
                />
              </div>
              
              {interval.start && interval.end && (
                <div className="text-sm font-medium text-primary whitespace-nowrap">
                  {formatDuration(calculateDuration(
                    new Date(`${day}T${interval.start}`).toISOString(),
                    new Date(`${day}T${interval.end}`).toISOString()
                  ))}
                </div>
              )}

              <button
                onClick={() => removeInterval(index)}
                className="p-2 text-danger hover:bg-danger/10 rounded transition-colors"
                disabled={intervals.length === 1}
              >
                🗑️
              </button>
            </div>
          ))}
        </div>

        <Button variant="secondary" onClick={addInterval} className="w-full">
          ➕ Adicionar Intervalo
        </Button>

        <div className="flex gap-2 justify-end pt-4 border-t border-light-line dark:border-dark-line">
          <Button variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button variant="primary" onClick={handleSave}>
            Salvar Intervalos
          </Button>
        </div>
      </div>
    </Modal>
  );
}
