export default function ErrorMessage({ message, onRetry }) {
  return (
    <div className="flex flex-col items-center justify-center gap-4 p-8">
      <div className="w-16 h-16 rounded-full bg-danger/10 flex items-center justify-center">
        <span className="text-3xl">⚠️</span>
      </div>
      
      <div className="text-center">
        <h3 className="text-lg font-semibold mb-2">Ops! Algo deu errado</h3>
        <p className="text-light-muted dark:text-dark-muted">
          {message || 'Ocorreu um erro inesperado. Tente novamente.'}
        </p>
      </div>

      {onRetry && (
        <button
          onClick={onRetry}
          className="px-4 py-2 bg-primary hover:bg-primary-dark text-white rounded-lg transition-colors"
        >
          Tentar Novamente
        </button>
      )}
    </div>
  );
}
