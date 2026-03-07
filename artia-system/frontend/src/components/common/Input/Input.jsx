export default function Input({
  label,
  type = 'text',
  value,
  onChange,
  placeholder,
  required = false,
  disabled = false,
  error,
  className = ''
}) {
  return (
    <div className={`flex flex-col gap-1 ${className}`}>
      {label && (
        <label className="text-sm font-medium text-light-text dark:text-dark-text">
          {label}
          {required && <span className="text-danger ml-1">*</span>}
        </label>
      )}
      
      <input
        type={type}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        required={required}
        disabled={disabled}
        className={`
          px-3 py-2 rounded-lg
          bg-light-panel dark:bg-dark-panel
          border ${error ? 'border-danger' : 'border-light-line dark:border-dark-line'}
          text-light-text dark:text-dark-text
          placeholder-light-muted dark:placeholder-dark-muted
          focus:outline-none focus:ring-2 focus:ring-primary
          disabled:opacity-50 disabled:cursor-not-allowed
          transition-colors
        `}
      />
      
      {error && (
        <span className="text-sm text-danger">{error}</span>
      )}
    </div>
  );
}
