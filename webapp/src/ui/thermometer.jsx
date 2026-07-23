const Thermometer = ({ fillPercentage = 50, className = '' }) => {
  const fill = Math.min(Math.max(fillPercentage, 0), 100);
  const fillHeight = 60;
  const fillY = 70 - (fillHeight * fill) / 100;

  return (
    <svg
      viewBox="0 0 32 100"
      className={`w-8 ${className}`}
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Thermometer outline with shorter bulb */}
      <path
        d="M 12 10 L 12 65 Q 12 68, 10 70 Q 6 72, 6 78 Q 6 84, 10 86 Q 14 88, 16 88 Q 18 88, 22 86 Q 26 84, 26 78 Q 26 72, 22 70 Q 20 68, 20 65 L 20 10 Q 20 6, 18 6 L 14 6 Q 12 6, 12 10 Z"
        className="fill-none stroke-gray-400 stroke-2"
      />

      {/* Fill */}
      <defs>
        <clipPath id={`thermo-clip-${fill}`}>
          <path d="M 12 10 L 12 65 Q 12 68, 10 70 Q 6 72, 6 78 Q 6 84, 10 86 Q 14 88, 16 88 Q 18 88, 22 86 Q 26 84, 26 78 Q 26 72, 22 70 Q 20 68, 20 65 L 20 10 Q 20 6, 18 6 L 14 6 Q 12 6, 12 10 Z" />
        </clipPath>
      </defs>

      <rect
        x="6"
        y={fillY}
        width="20"
        height={70 - fillY + 24}
        clipPath={`url(#thermo-clip-${fill})`}
      />

      {/* Tick marks */}
      <line
        x1="20"
        y1="20"
        x2="23"
        y2="20"
        className="stroke-gray-400 stroke-1"
      />
      <line
        x1="20"
        y1="35"
        x2="23"
        y2="35"
        className="stroke-gray-400 stroke-1"
      />
      <line
        x1="20"
        y1="50"
        x2="23"
        y2="50"
        className="stroke-gray-400 stroke-1"
      />
      <line
        x1="20"
        y1="65"
        x2="23"
        y2="65"
        className="stroke-gray-400 stroke-1"
      />
    </svg>
  );
};
export default Thermometer;
