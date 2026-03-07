export default function Button({ 
  children, 
  onClick, 
  variant = 'primary', 
  size = 'md',
  disabled = false,
  type = 'button',
  className = ''
}) {
  const baseStyles = 'font-medium rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2';
  
  const variants = {
    primary: 'bg-primary hover:bg-primary-dark text-white focus:ring-primary',
    secondary: 'bg-light-panel2 dark:bg-dark-panel2 hover:bg-light-line dark:hover:bg-dark-line text-light-text dark:text-dark-text',
    danger: 'bg-danger hover:bg-red-700 text-white focus:ring-danger',
    success: 'bg-success hover:bg-green-700 text-white focus:ring-success',
    ghost: 'bg-transparent hover:bg-light-panel2 dark:hover:bg-dark-panel2 text-light-text dark:text-dark-text'
  };

  const sizes = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2 text-base',
    lg: 'px-6 py-3 text-lg'
  };

  const disabledStyles = disabled ? 'opacity-50 cursor-not-allowed' : '';

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
