import React, { useState, useEffect } from 'react';
import { Field, Label } from './fieldset';
import { Input } from './input';
import { Text } from './text';
import { XMarkIcon, MagnifyingGlassIcon } from '@heroicons/react/24/outline';

const SearchField = ({
  placeholder,
  onChange,
  debounceMs = 300,
  resetKey = 0,
  supportDarkMode = false,
}) => {
  const [value, setValue] = useState('');

  const handleChange = (e) => {
    const newValue = e.target.value;
    setValue(newValue);
    if (debounceMs > 0) {
      clearTimeout(handleChange.debounceTimeout);
      handleChange.debounceTimeout = setTimeout(() => {
        onChange(newValue);
      }, debounceMs);
    } else {
      onChange(newValue);
    }
  };

  useEffect(() => {
    if (resetKey > 0) {
      setValue('');
    }
  }, [resetKey]);

  return (
    <Field>
      <div className="flex justify-start items-center gap-2">
        <MagnifyingGlassIcon className="size-5 stroke-3 stroke-gray-600 dark:stroke-gray-200" />
        <div className="relative">
          <Input
            type="text"
            placeholder={placeholder}
            onChange={handleChange}
            value={value}
          />
          <XMarkIcon
            className={`size-5 absolute right-2 top-1/2 transform -translate-y-1/2 cursor-pointer stroke-gray-600 hover:stroke-2 ${
              supportDarkMode ? 'dark:stroke-gray-200' : ''
            }`}
            onClick={() => {
              setValue('');
              onChange('');
            }}
          />
        </div>
      </div>
    </Field>
  );
};

export { SearchField };
