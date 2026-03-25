import React from 'react';

export default function Input({
    label,
    type = 'text',
    name,
    value,
    onChange,
    placeholder,
    error,
    icon,
    className = '',
    required = false,
    ...props
}) {
    return (
        <div className={`w-full ${className}`}>
            {label && (
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    {label} {required && <span className="text-red-500">*</span>}
                </label>
            )}
            <div className="relative">
                {icon && (
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                        {icon}
                    </div>
                )}
                <input
                    type={type}
                    name={name}
                    value={value}
                    onChange={onChange}
                    className={`w-full px-4 py-3 rounded-xl bg-gray-50 border-2 border-transparent dark:bg-gray-800 focus:bg-white dark:focus:bg-gray-900 transition-all duration-300 placeholder:text-gray-400 outline-none ${icon ? 'pl-10' : ''} ${error ? 'border-red-500' : 'border-gray-200 dark:border-gray-700'}`}
                    placeholder={placeholder}
                    required={required}
                    {...props}
                />
                {/* Animated Underline */}
                <span className={`absolute bottom-0 left-0 h-0.5 bg-primary-500 transition-all duration-300 ease-out ${error ? 'w-full bg-red-500' : 'w-0 group-hover:w-full peer-focus:w-full'}`}
                    style={{ transformOrigin: 'center' }}
                />
            </div>
            {error && (
                <p className="mt-1 text-sm text-red-500 animate-slide-up">
                    {error}
                </p>
            )}
        </div>
    );
}
