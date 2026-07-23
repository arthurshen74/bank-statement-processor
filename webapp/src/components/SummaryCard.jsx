import React, { useState } from 'react';
import {
  ChevronLeftIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  DocumentArrowDownIcon,
  PhotoIcon,
  DocumentIcon,
} from '@heroicons/react/24/outline';

const SummaryCard = ({
  statements,
  transactions,
  onExport,
  onOpenPageModal,
  onAutoSelect,
}) => {
  const [expandedStatements, setExpandedStatements] = useState(new Set());
  const [statementsToggle, setStatementsToggle] = useState(false);

  const toggleStatement = (statementIndex) => {
    const newExpanded = new Set(expandedStatements);
    const key = `stmt-${statementIndex}`;
    if (newExpanded.has(key)) {
      newExpanded.delete(key);
    } else {
      newExpanded.add(key);
    }
    setExpandedStatements(newExpanded);
  };

  const toggleViewStatementDetails = () => setStatementsToggle((prev) => !prev);

  // Calculate totals
  const totalStatements = statements.length;
  const totalPages = statements.reduce(
    (sum, stmt) => sum + (stmt.pages?.length || 0),
    0
  );
  const totalTransactions = statements.reduce(
    (sum, stmt) => sum + (stmt.totalTransactions || 0),
    0
  );
  const pagesWithTransactions = statements.reduce(
    (sum, stmt) =>
      sum + stmt.pages?.filter((p) => p.numberOfTransactions > 0).length || 0,
    0
  );

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-3 relative">
      <div className="absolute top-5 right-4">
        <button
          onClick={toggleViewStatementDetails}
          className="cursor-pointer flex items-center space-x-1 text-gray-500 hover:text-gray-700 focus:outline-none"
        >
          <ChevronDownIcon
            className={`size-6 stroke-2 transform transition-transform duration-300 ${
              statementsToggle ? '' : 'rotate-90'
            }`}
          />
        </button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-2 mb-2">
        <div className="text-center">
          <p className="text-sm text-gray-600">Total Statements</p>
          <p className="text-sm font-bold text-gray-900">{totalStatements}</p>
        </div>
        <div className="text-center">
          <p className="text-sm text-gray-600">Total Pages</p>
          <p className="text-sm font-bold text-gray-900">{totalPages}</p>
        </div>
        <div className="text-center">
          <p className="text-sm text-gray-600">Pages with Transactions</p>
          <p className="text-sm font-bold text-gray-900">
            {pagesWithTransactions}
          </p>
        </div>
        <div className="text-center">
          <p className="text-sm text-gray-600">Total Transactions</p>
          <p className="text-sm font-bold text-gray-900">{totalTransactions}</p>
        </div>
        <div className="col-span-2 flex items-center justify-end gap-2 mr-10">
          {onAutoSelect && (
            <button
              onClick={onAutoSelect}
              className="cursor-pointer inline-flex items-center px-3 py-1.5 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
            >
              <DocumentArrowDownIcon className="h-4 w-4 mr-1" />
              Auto Select
            </button>
          )}
          <button
            onClick={() => onExport(transactions)}
            className="cursor-pointer inline-flex items-center px-3 py-1.5 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <DocumentArrowDownIcon className="h-4 w-4 mr-1" />
            Export Excel
          </button>
        </div>
      </div>
      {/* Statements Tree View */}
      {statementsToggle && (
        <div className="mt-3 pt-3 border-t border-gray-200">
          <h3 className="text-sm font-semibold text-gray-900 mb-1">
            Statements
          </h3>
          <div className="space-y-1">
            {statements
              .sort((a, b) => a.statementDate.localeCompare(b.statementDate))
              .map((statement, stmtIndex) => (
                <div key={stmtIndex}>
                  {/* Statement Header */}
                  <button
                    onClick={() => toggleStatement(stmtIndex)}
                    className="w-full px-4 py-2 flex items-center justify-between hover:bg-gray-50 transition-colors cursor-pointer"
                  >
                    <div className="flex items-center space-x-2">
                      {expandedStatements.has(`stmt-${stmtIndex}`) ? (
                        <ChevronDownIcon className="h-4 w-4 text-gray-400" />
                      ) : (
                        <ChevronRightIcon className="h-4 w-4 text-gray-400" />
                      )}
                      <DocumentIcon className="h-4 w-4 text-gray-500" />
                      <span className="text-sm font-medium text-gray-900">
                        {statement.statementDate !== 'N/A'
                          ? statement.statementDate
                          : statement.filename}
                      </span>
                      <span className="text-xs text-gray-500">
                        ({statement.pages?.length || 0} pages)
                      </span>
                    </div>
                    <span className="text-xs px-2 py-1 bg-blue-100 text-blue-800 rounded-full">
                      {statement.totalTransactions} transactions
                    </span>
                  </button>

                  {/* Expanded Pages */}
                  {expandedStatements.has(`stmt-${stmtIndex}`) && (
                    <div className="border-t bg-gray-50">
                      {statement.pages?.map((page, pageIndex) => (
                        <div
                          key={page.pageNumber}
                          className="ps-8 pe-4 py-2 flex items-center justify-between hover:bg-gray-100"
                        >
                          <div className="flex items-center space-x-2">
                            <span className="text-sm text-gray-700">
                              Page {page.pageNumber}
                            </span>
                            {(page.imageFileId || page.croppedImageFileId) && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onOpenPageModal(page, stmtIndex, pageIndex);
                                }}
                                className="inline-flex items-center px-2 py-1 text-xs font-medium rounded-md text-blue-700 bg-blue-50 hover:bg-blue-100 cursor-pointer"
                              >
                                <PhotoIcon className="h-3 w-3 mr-1" />
                                View
                              </button>
                            )}
                          </div>
                          <span className="text-xs px-2 py-1 bg-blue-100 text-blue-800 rounded-full">
                            {page.numberOfTransactions} transactions
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default SummaryCard;
