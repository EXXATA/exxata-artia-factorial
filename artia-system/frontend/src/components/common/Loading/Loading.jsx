export default function Loading({ size = 'md', text = 'Carregando...' }) {
  const sizes = {
    sm: 'w-4 h-4',
    md: 'w-8 h-8',
    lg: 'w-12 h-12'
  };

  return (
    <div className="flex flex-col items-center justify-center gap-3 p-8">
      <div className={`${sizes[size]} border-4 border-light-line dark:border-dark-line border-t-primary rounded-full animate-spin`} />
      {text && (
        <p className="text-sm text-light-muted dark:text-dark-muted">{text}</p>
      )}
    </div>
  );
}
