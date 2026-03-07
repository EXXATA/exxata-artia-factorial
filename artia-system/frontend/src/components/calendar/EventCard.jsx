import { useState } from 'react';
import { formatTimeHHMM, calculateDuration, formatDuration } from '../../utils/timeUtils';

export default function EventCard({ event, onSelect, onEdit, isSelected }) {
  const [clickTimeout, setClickTimeout] = useState(null);

  const duration = calculateDuration(event.start, event.end);
  const durationText = formatDuration(duration);

  const handleClick = (e) => {
    e.stopPropagation();

    // Limpar timeout anterior se existir
    if (clickTimeout) {
      clearTimeout(clickTimeout);
      setClickTimeout(null);
      // Duplo clique - abrir para editar
      onEdit(event);
    } else {
      // Primeiro clique - aguardar para ver se é duplo
      const timeout = setTimeout(() => {
        // Clique simples - apenas selecionar
        onSelect(event);
        setClickTimeout(null);
      }, 250);
      setClickTimeout(timeout);
    }
  };

  return (
    <div
      onClick={handleClick}
      className={`
        p-2 rounded-lg cursor-pointer transition-all
        ${isSelected 
          ? 'ring-2 ring-primary ring-offset-2 dark:ring-offset-dark-bg' 
          : ''
        }
        ${event.artiaLaunched 
          ? 'bg-success/80 dark:bg-success/60 border-2 border-success' 
          : 'bg-primary/80 dark:bg-primary/60 border-2 border-primary'
        }
        hover:shadow-lg hover:scale-[1.02]
        text-white
      `}
    >
      <div className="font-semibold text-sm truncate">
        {event.project}
      </div>
      
      <div className="text-xs truncate opacity-90">
        {event.activityLabel}
      </div>

      <div className="text-xs mt-1 font-medium opacity-95">
        {formatTimeHHMM(event.start)} - {formatTimeHHMM(event.end)}
      </div>

      <div className="text-xs font-bold mt-0.5">
        {durationText}
      </div>

      {event.notes && (
        <div className="text-xs mt-1 truncate opacity-80">
          📝 {event.notes}
        </div>
      )}
    </div>
  );
}
