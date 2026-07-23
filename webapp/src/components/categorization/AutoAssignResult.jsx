import { Button } from '../../ui/button';
import { Badge } from '../../ui/badge';
import { CheckCircleIcon, XCircleIcon } from '@heroicons/react/24/outline';

export default function AutoAssignResult({ result, onAccept, onReject }) {
  const renderHighlightedText = (text, highlights) => {
    if (!highlights || highlights.length === 0) {
      return text;
    }

    const highlight = highlights[0];
    const before = text.substring(0, highlight.start);
    const matched = text.substring(
      highlight.start,
      highlight.start + highlight.length
    );
    const after = text.substring(highlight.start + highlight.length);

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

  if (!result.matched) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <XCircleIcon className="h-6 w-6 text-gray-400" />
          <h3 className="text-lg font-semibold text-gray-900">
            No Match Found
          </h3>
        </div>

        <div className="bg-gray-50 rounded-lg p-4">
          <p className="text-sm text-gray-700">
            No categorization rules matched this transaction text.
          </p>
          <p className="text-sm text-gray-600 mt-2">
            Please select a category manually or create a new rule.
          </p>
        </div>

        <div className="flex justify-end">
          <Button onClick={onReject}>Back to Selection</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <CheckCircleIcon className="h-6 w-6 text-green-600" />
        <h3 className="text-lg font-semibold text-green-900">Match Found!</h3>
      </div>

      <div className="bg-green-50 rounded-lg p-4 space-y-3">
        <div>
          <p className="text-sm text-gray-600">Rule</p>
          <p className="font-semibold text-gray-900">{result.ruleName}</p>
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

        {result.highlights && result.highlights.length > 0 && (
          <div>
            <p className="text-sm text-gray-600 mb-2">Highlighted Match</p>
            <div className="bg-white rounded border p-3 font-mono text-sm">
              {renderHighlightedText(
                result.highlights[0].text || '',
                result.highlights
              )}
            </div>
          </div>
        )}
      </div>

      <div className="flex justify-end gap-2">
        <Button plain onClick={onReject}>
          Reject
        </Button>
        <Button color="green" onClick={onAccept}>
          Accept Category
        </Button>
      </div>
    </div>
  );
}
