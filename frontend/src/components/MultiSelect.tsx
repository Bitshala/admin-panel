import React, { useState, useRef, useEffect } from 'react';

interface Option {
  label: string;
  value: string;
}

type Props = {
  options: Option[];
  selectedValues: string[];
  onChange: (selected: string[]) => void;
  placeholder?: string;
};

const MultiSelect: React.FC<Props> = ({ options, selectedValues, onChange, placeholder }) => {
  const [isOpen, setIsOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const toggleOption = (value: string) => {
    if (selectedValues.includes(value)) {
      onChange(selectedValues.filter(v => v !== value));
    } else {
      onChange([...selectedValues, value]);
    }
  };

  const displayText =
    selectedValues.length > 0
      ? options
          .filter(opt => selectedValues.includes(opt.value))
          .map(opt => opt.label)
          .join(', ')
      : placeholder || 'Select...';

  return (
    <div ref={ref} className="relative inline-block text-left">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-64 p-2 border rounded flex justify-between items-center"
      >
        <span>{displayText}</span>
        <span className="ml-2">▾</span>
      </button>
      {isOpen && (
        <div className="absolute mt-1 w-64 bg-white border rounded shadow-lg z-10 max-h-60 overflow-auto">
          {options.map(opt => (
            <label
              key={opt.value}
              className="flex items-center px-2 py-1 hover:bg-gray-100 cursor-pointer"
            >
              <input
                type="checkbox"
                value={opt.value}
                checked={selectedValues.includes(opt.value)}
                onChange={() => toggleOption(opt.value)}
                className="mr-2"
              />
              {opt.label}
            </label>
          ))}
        </div>
      )}
    </div>
  );
};

export default MultiSelect;
