export default function Button({ 
  children, 
  onClick, 
  variant = 'primary', 
  size = 'md',
  disabled = false,
  type = 'button',
  className = ''
}) {
  const baseStyles = 'inline-flex items-center justify-center gap-2 font-medium rounded-xl border transition-all focus:outline-none focus:ring-2 focus:ring-primary/15 focus:ring-offset-0';
  
  const variants = {
    primary: 'border-primary bg-primary text-white shadow-sm hover:border-primary-dark hover:bg-primary-dark',
    secondary: 'border-slate-200 bg-white text-slate-700 shadow-sm hover:border-slate-300 hover:bg-slate-50 dark:border-white/10 dark:bg-white/5 dark:text-slate-100 dark:hover:bg-white/10',
    danger: 'border-red-500 bg-danger text-white shadow-sm hover:bg-red-700 hover:border-red-700',
    success: 'border-green-500 bg-success text-white shadow-sm hover:bg-green-700 hover:border-green-700',
    ghost: 'border-transparent bg-transparent text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-white/10'
  };

  const sizes = {
    sm: 'px-3 py-2 text-sm',
    md: 'px-4 py-2.5 text-sm',
    lg: 'px-6 py-3 text-base'
  };

  const disabledStyles = disabled ? 'cursor-not-allowed opacity-50 shadow-none' : '';

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${disabledStyles} ${className}`}
    >
      {children}
    </button>
  );
}
