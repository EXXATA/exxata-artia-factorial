import { formatTimeHHMM, calculateDuration, formatDuration } from '../../utils/timeUtils';

export default function DragPreview({ startTime, endTime, visible }) {
  if (!visible || !startTime || !endTime) return null;

  const duration = calculateDuration(startTime, endTime);
  const durationText = formatDuration(duration);

  return (
    <div className="fixed top-4 right-4 z-50 bg-primary text-white px-4 py-3 rounded-lg shadow-xl border-2 border-primary-light animate-pulse">
      <div className="flex items-center gap-3">
        <div className="text-2xl">⏱️</div>
        <div>
          <div className="text-sm font-medium opacity-90">
            {formatTimeHHMM(startTime)} - {formatTimeHHMM(endTime)}
          </div>
          <div className="text-lg font-bold">
            {durationText}
          </div>
        </div>
      </div>
    </div>
  );
}
