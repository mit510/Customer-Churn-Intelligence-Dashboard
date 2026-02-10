import React, { useState, useRef, useEffect } from 'react';
import './CustomSelect.css';

const CustomSelect = ({ name, value, onChange, options, label }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedValue, setSelectedValue] = useState(value);
  const dropdownRef = useRef(null);

  useEffect(() => {
    setSelectedValue(value);
  }, [value]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (option) => {
    const event = {
      target: {
        name: name,
        value: option.value !== undefined ? option.value : option
      }
    };
    setSelectedValue(option.value !== undefined ? option.value : option);
    onChange(event);
    setIsOpen(false);
  };

  const getDisplayValue = () => {
    if (typeof options[0] === 'object') {
      const selected = options.find(opt => opt.value === selectedValue);
      return selected ? selected.label : selectedValue;
    }
    return selectedValue;
  };

  return (
    <div className="custom-select-wrapper" ref={dropdownRef}>
      {label && <label className="custom-select-label">{label}</label>}
      <div 
        className={`custom-select ${isOpen ? 'open' : ''}`}
        onClick={() => setIsOpen(!isOpen)}
      >
        <div className="custom-select-value">
          {getDisplayValue()}
        </div>
        <div className="custom-select-arrow">
          <svg width="12" height="8" viewBox="0 0 12 8" fill="none">
            <path d="M1 1L6 6L11 1" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
      </div>
      
      {isOpen && (
        <div className="custom-select-dropdown">
          {options.map((option, index) => {
            const optionValue = typeof option === 'object' ? option.value : option;
            const optionLabel = typeof option === 'object' ? option.label : option;
            
            return (
              <div
                key={index}
                className={`custom-select-option ${optionValue === selectedValue ? 'selected' : ''}`}
                onClick={() => handleSelect(option)}
              >
                {optionLabel}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default CustomSelect;
