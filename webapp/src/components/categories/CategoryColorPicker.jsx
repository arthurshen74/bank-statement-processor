import { useState } from 'react';
import { Input } from '../../ui/input';

const PRESET_COLORS = [
  { name: 'Indigo', value: '#4F46E5' },
  { name: 'Purple', value: '#7C3AED' },
  { name: 'Blue', value: '#2563EB' },
  { name: 'Green', value: '#059669' },
  { name: 'Red', value: '#DC2626' },
  { name: 'Orange', value: '#EA580C' },
  { name: 'Yellow', value: '#CA8A04' },
  { name: 'Pink', value: '#EC4899' },
];

export default function CategoryColorPicker({ value, onChange }) {
  const [customColor, setCustomColor] = useState(value);

  const handlePresetClick = (color) => {
    setCustomColor(color);
    onChange(color);
  };

  const handleCustomChange = (e) => {
    const color = e.target.value;
    setCustomColor(color);
    onChange(color);
  };

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-4 gap-2">
        {PRESET_COLORS.map((color) => (
          <button
            key={color.value}
            type="button"
            onClick={() => handlePresetClick(color.value)}
            className={`h-10 rounded-md border-2 transition-all ${
              value === color.value
                ? 'border-gray-900 ring-2 ring-gray-900 ring-offset-2'
                : 'border-gray-200 hover:border-gray-400'
            }`}
            style={{ backgroundColor: color.value }}
            title={color.name}
          />
        ))}
      </div>

      <div className="flex items-center gap-2">
        <div
          className="w-10 h-10 rounded-md border-2 border-gray-200 flex-shrink-0"
          style={{ backgroundColor: customColor }}
        />
        <Input
          type="text"
          value={customColor}
          onChange={handleCustomChange}
          placeholder="#4F46E5"
          pattern="^#[0-9A-Fa-f]{6}$"
          className="font-mono text-sm"
        />
      </div>
    </div>
  );
}
