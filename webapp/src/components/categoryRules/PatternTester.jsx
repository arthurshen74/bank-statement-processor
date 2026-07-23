import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogActions,
  DialogBody,
  DialogDescription,
  DialogTitle,
} from '../../ui/dialog';
import { Button } from '../../ui/button';
import { Textarea } from '../../ui/textarea';
import { Field, Label } from '../../ui/fieldset';
import { Badge } from '../../ui/badge';
import { categoryRulesApi } from '../../api/categoryRules';

export default function PatternTester({
  isOpen,
  onClose,
  initialBuchungstext = '',
}) {
  const [buchungstext, setBuchungstext] = useState('');
  const [result, setResult] = useState(null);
  const [testing, setTesting] = useState(false);
  const [recentTests, setRecentTests] = useState([]);
  const [error, setError] = useState(null);

  // Pre-populate textarea when dialog opens with initialBuchungstext
  useEffect(() => {
    if (isOpen && initialBuchungstext) {
      setBuchungstext(initialBuchungstext);
      setResult(null);
      setError(null);
    }
  }, [isOpen, initialBuchungstext]);

  const handleTest = async () => {
    if (!buchungstext.trim()) {
      setError('Please enter transaction text to test');
      return;
    }

    setTesting(true);
    setError(null);
    try {
      const testResult = await categoryRulesApi.testTransaction(buchungstext);
      setResult(testResult);

      // Add to recent tests (keep last 5)
      setRecentTests((prev) => {
        const newTest = {
          buchungstext,
          matched: testResult.matched,
          category: testResult.category,
          ruleName: testResult.ruleName,
          timestamp: new Date(),
        };
        return [newTest, ...prev.slice(0, 4)];
      });
    } catch (err) {
      setError(err.message);
    } finally {
      setTesting(false);
    }
  };

  const handleClear = () => {
    setBuchungstext('');
    setResult(null);
    setError(null);
  };

  const handleUseRecent = (test) => {
    setBuchungstext(test.buchungstext);
    setResult(null);
  };

  const renderHighlightedText = () => {
    if (!result || !result.matched || !result.highlights) {
      return buchungstext;
    }

    const highlight = result.highlights[0];
    const before = buchungstext.substring(0, highlight.start);
    const matched = buchungstext.substring(
      highlight.start,
      highlight.start + highlight.length
    );
    const after = buchungstext.substring(highlight.start + highlight.length);

    return (
      <>
        {before}
        <span className="bg-yellow-200 font-semibold px-1 rounded">
          {matched}
        </span>
        {after}
      </>
    );
  };

  return (
    <Dialog open={isOpen} onClose={onClose} size="2xl">
      <DialogTitle>Pattern Tester</DialogTitle>
      <DialogDescription>
        Test transaction text against your categorization rules to see which
        rule matches.
      </DialogDescription>
      <DialogBody>
        <div className="space-y-6">
          {/* Input Section */}
          <Field>
            <Label>Transaction Text (Buchungstext) *</Label>
            <Textarea
              value={buchungstext}
              onChange={(e) => setBuchungstext(e.target.value)}
              placeholder="e.g., PAYPAL *MONBECKGMBH 3531485GER"
              rows={3}
              className="font-mono text-sm"
            />
          </Field>

          {/* Action Buttons */}
          <div className="flex gap-2">
            <Button
              onClick={handleTest}
              disabled={testing || !buchungstext.trim()}
              color="blue"
            >
              {testing ? 'Testing...' : 'Test'}
            </Button>
            <Button
              outline
              onClick={handleClear}
              disabled={!buchungstext && !result}
            >
              Clear
            </Button>
          </div>

          {/* Error Message */}
          {error && (
            <div className="rounded-md bg-red-50 p-4">
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}

          {/* Results Section */}
          {result && (
            <div className="border-t pt-6">
              {result.matched ? (
                <div className="space-y-4">
                  {/* Match Success */}
                  <div className="flex items-center gap-2">
                    <svg
                      className="h-6 w-6 text-green-600"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                    <h3 className="text-lg font-semibold text-green-900">
                      Match Found!
                    </h3>
                  </div>

                  {/* Match Details */}
                  <div className="bg-green-50 rounded-lg p-4 space-y-3">
                    <div>
                      <p className="text-sm text-gray-600">Rule</p>
                      <p className="font-semibold text-gray-900">
                        {result.ruleName}
                      </p>
                    </div>

                    <div>
                      <p className="text-sm text-gray-600">Category</p>
                      <Badge color="indigo">{result.category}</Badge>
                    </div>

                    <div>
                      <p className="text-sm text-gray-600">Matched Pattern</p>
                      <code className="text-sm bg-white px-2 py-1 rounded border">
                        {result.matchedPattern}
                      </code>
                    </div>

                    <div>
                      <p className="text-sm text-gray-600">Priority</p>
                      <Badge color="blue">{result.rulePriority}</Badge>
                    </div>

                    <div>
                      <p className="text-sm text-gray-600 mb-2">
                        Highlighted Match
                      </p>
                      <div className="bg-white rounded border p-3 font-mono text-sm">
                        {renderHighlightedText()}
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* No Match */}
                  <div className="flex items-center gap-2">
                    <svg
                      className="h-6 w-6 text-gray-400"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                    <h3 className="text-lg font-semibold text-gray-900">
                      No Match Found
                    </h3>
                  </div>

                  <div className="bg-gray-50 rounded-lg p-4">
                    <p className="text-sm text-gray-700">
                      No categorization rules matched this transaction text.
                    </p>
                    <p className="text-sm text-gray-600 mt-2">
                      Consider creating a new rule or adjusting existing
                      patterns to match this transaction.
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Recent Tests */}
          {recentTests.length > 0 && (
            <div className="border-t pt-6">
              <h4 className="text-sm font-semibold text-gray-900 mb-3">
                Recent Tests
              </h4>
              <div className="space-y-2">
                {recentTests.map((test, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleUseRecent(test)}
                    className="w-full text-left p-3 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs text-gray-500">
                        {test.timestamp.toLocaleTimeString()}
                      </span>
                      {test.matched ? (
                        <Badge color="green">Matched: {test.category}</Badge>
                      ) : (
                        <Badge color="zinc">No Match</Badge>
                      )}
                    </div>
                    <p className="text-sm font-mono text-gray-700 truncate">
                      {test.buchungstext}
                    </p>
                    {test.matched && (
                      <p className="text-xs text-gray-600 mt-1">
                        Rule: {test.ruleName}
                      </p>
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </DialogBody>
      <DialogActions>
        <Button plain onClick={onClose}>
          Close
        </Button>
      </DialogActions>
    </Dialog>
  );
}
