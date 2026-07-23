import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogActions,
  DialogBody,
  DialogTitle,
} from '../../ui/dialog';
import { Button } from '../../ui/button';
import { Badge } from '../../ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../../ui/table';
import LoadingSpinner from '../../ui/loading-spinner';
import { categoryRulesApi } from '../../api/categoryRules';

export default function CoverageStats({ isOpen, onClose }) {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (isOpen) {
      loadStats();
    }
  }, [isOpen]);

  const loadStats = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await categoryRulesApi.getCoverageStats();
      setStats(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onClose={onClose} size="3xl">
      <DialogTitle>Coverage Statistics</DialogTitle>
      <DialogBody>
        {loading && (
          <div className="flex justify-center py-12">
            <LoadingSpinner size="lg" />
          </div>
        )}

        {error && (
          <div className="rounded-md bg-red-50 p-4">
            <p className="text-sm text-red-800">{error}</p>
          </div>
        )}

        {stats && !loading && (
          <div className="space-y-8">
            {/* Summary Cards */}
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-blue-50 rounded-lg p-6 text-center">
                <p className="text-3xl font-bold text-blue-900">
                  {stats.totalRules}
                </p>
                <p className="text-sm text-blue-700 mt-1">Total Rules</p>
              </div>
              <div className="bg-green-50 rounded-lg p-6 text-center">
                <p className="text-3xl font-bold text-green-900">
                  {stats.enabledRules}
                </p>
                <p className="text-sm text-green-700 mt-1">Enabled</p>
              </div>
              <div className="bg-gray-50 rounded-lg p-6 text-center">
                <p className="text-3xl font-bold text-gray-900">
                  {stats.disabledRules}
                </p>
                <p className="text-sm text-gray-700 mt-1">Disabled</p>
              </div>
            </div>

            {/* Category Breakdown */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Category Breakdown
              </h3>
              {stats.categoriesUsage.length > 0 ? (
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableHeader>Category</TableHeader>
                      <TableHeader>Rules</TableHeader>
                      <TableHeader>Total Matches</TableHeader>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {stats.categoriesUsage.map((category, idx) => (
                      <TableRow key={idx}>
                        <TableCell>
                          <Badge color="indigo">{category.categoryName}</Badge>
                        </TableCell>
                        <TableCell>{category.ruleCount}</TableCell>
                        <TableCell>
                          {category.totalMatches.toLocaleString()}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <p className="text-sm text-gray-500 text-center py-4">
                  No categories found
                </p>
              )}
            </div>

            {/* Top Rules */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Top 10 Rules by Matches
              </h3>
              {stats.topMatchingRules.length > 0 ? (
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableHeader>Rank</TableHeader>
                      <TableHeader>Rule</TableHeader>
                      <TableHeader>Category</TableHeader>
                      <TableHeader>Matches</TableHeader>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {stats.topMatchingRules.map((rule, idx) => (
                      <TableRow key={rule.ruleId}>
                        <TableCell>
                          <span className="font-semibold text-gray-900">
                            #{idx + 1}
                          </span>
                        </TableCell>
                        <TableCell>
                          <div>
                            <p className="font-medium text-gray-900">
                              {rule.ruleName}
                            </p>
                            <p className="text-xs text-gray-500">
                              {rule.ruleId}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge color="indigo">{rule.category}</Badge>
                        </TableCell>
                        <TableCell>
                          <span className="font-medium">
                            {rule.matchCount.toLocaleString()}
                          </span>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <p className="text-sm text-gray-500 text-center py-4">
                  No matching data available
                </p>
              )}
            </div>
          </div>
        )}
      </DialogBody>
      <DialogActions>
        <Button plain onClick={onClose}>
          Close
        </Button>
      </DialogActions>
    </Dialog>
  );
}
