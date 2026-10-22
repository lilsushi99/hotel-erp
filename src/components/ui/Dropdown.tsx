import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check } from 'lucide-react';

export interface DropdownOption {
  value: string;
  label: string;
  sublabel?: string;
}

interface DropdownProps {
  label?: string;
  value: string;
  options: DropdownOption[];
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  size?: 'sm' | 'md';
  required?: boolean;
  icon?: React.ReactNode;
}

export const Dropdown: React.FC<DropdownProps> = ({
  label,
  value,
  options,
  onChange,
  placeholder = 'Select an option',
  disabled = false,
  className = '',
  size = 'md',
  required = false,
  icon,
}) => {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const selectedOption = options.find((o) => o.value === value);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      {label && (
        <label className="block text-[12px] font-normal text-[#4A4A46] mb-1.5">
          {label}
          {required && <span className="text-[#B93829] ml-0.5">*</span>}
        </label>
      )}
      <button
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setOpen((o) => !o)}
        className={`w-full flex items-center justify-between gap-2 bg-white border border-[#E2E2DC] rounded-[10px] text-left transition-colors focus:outline-none focus:border-[#7463A6] ${
          size === 'sm' ? 'px-3 py-1.5 text-[12.5px] h-[34px]' : 'px-3.5 py-2 text-[13px] h-[38px]'
        } ${
          disabled
            ? 'opacity-50 cursor-not-allowed bg-[#F6F6F4]'
            : 'hover:border-[#C8C8C0] cursor-pointer'
        } ${open ? 'border-[#7463A6] ring-2 ring-[#7463A6]/15' : ''}`}
      >
        <div className="flex items-center gap-2 min-w-0">
          {icon && <span className="text-[#6E6E6A] shrink-0">{icon}</span>}
          <span
            className={`truncate ${
              selectedOption ? 'text-[#1E1E1E] font-normal' : 'text-[#8E8E88]'
            }`}
          >
            {selectedOption ? selectedOption.label : placeholder}
          </span>
        </div>
        <ChevronDown
          className={`w-3.5 h-3.5 text-[#6E6E6A] shrink-0 transition-transform duration-150 ${
            open ? 'rotate-180 text-[#7463A6]' : ''
          }`}
        />
      </button>

      {open && (
        <div className="absolute right-0 z-50 mt-1.5 w-full min-w-[168px] bg-white border border-[#E6E6E0] rounded-[11px] shadow-[0_10px_28px_rgba(0,0,0,0.08)] py-1 max-h-64 overflow-y-auto">
          {options.length === 0 ? (
            <div className="px-3 py-2 text-[12.5px] text-[#8E8E88]">
              No options available
            </div>
          ) : (
            <div className="flex flex-col">
              {options.map((opt) => {
                const isSelected = opt.value === value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => {
                      onChange(opt.value);
                      setOpen(false);
                    }}
                    className={`w-full px-3 py-2 text-left flex items-center justify-between gap-2 text-[12.5px] transition-colors cursor-pointer ${
                      isSelected
                        ? 'bg-[#F1EEF8] text-[#7463A6] font-medium'
                        : 'text-[#3A3A36] hover:bg-[#F6F6F4]'
                    }`}
                  >
                    <div className="truncate">
                      <div className="truncate">{opt.label}</div>
                      {opt.sublabel && (
                        <div className="text-[11px] text-[#6E6E6A] truncate">
                          {opt.sublabel}
                        </div>
                      )}
                    </div>
                    {isSelected && <Check className="w-3.5 h-3.5 text-[#7463A6] shrink-0" />}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
