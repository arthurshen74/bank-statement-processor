import Thermometer from '../../ui/thermometer';
export const CategorizationStats = ({
  categorizationStats,
  namingStats,
  getGaugeColor,
  getThermometerColor,
}) => {
  return (
    <div className="grid grid-cols-2 gap-4">
      <div className="bg-blue-50 rounded-lg border border-blue-200 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`${getGaugeColor(categorizationStats.percentage)}`}>
              <svg
                className="w-10 h-10"
                fill="currentColor"
                viewBox="0 0 24 24"
              >
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67z" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-900">
                Transaction Categorization
              </p>
              <p className="text-2xl font-bold text-gray-900">
                {categorizationStats.categorized} of {categorizationStats.total}
              </p>
              <p className="text-sm text-gray-600">
                {categorizationStats.uncategorized} uncategorized (
                {categorizationStats.percentage.toFixed(1)}% complete)
              </p>
            </div>
          </div>
          <div className="text-right">
            <Thermometer
              fillPercentage={categorizationStats.percentage}
              className={`transition-all duration-300 h-20 ${getThermometerColor(
                categorizationStats.percentage
              )}`}
            />
          </div>
        </div>
      </div>
      <div className="bg-blue-50 rounded-lg border border-blue-200 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`${getGaugeColor(namingStats.percentage)}`}>
              <svg
                className="w-10 h-10"
                fill="currentColor"
                viewBox="0 0 24 24"
              >
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67z" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-900">
                Transaction Naming
              </p>
              <p className="text-2xl font-bold text-gray-900">
                {namingStats.named} of {namingStats.total}
              </p>
              <p className="text-sm text-gray-600">
                {namingStats.unnamed} uncategorized (
                {namingStats.percentage.toFixed(1)}% complete)
              </p>
            </div>
          </div>
          <div className="text-right">
            <Thermometer
              fillPercentage={namingStats.percentage}
              className={`transition-all duration-300 h-20 ${getThermometerColor(
                namingStats.percentage
              )}`}
            />
          </div>
        </div>
      </div>
    </div>
  );
};
