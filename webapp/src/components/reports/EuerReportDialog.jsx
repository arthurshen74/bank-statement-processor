import { useState, useEffect, useMemo } from 'react';
import {
  Dialog,
  DialogActions,
  DialogBody,
  DialogDescription,
  DialogTitle,
} from '../../ui/dialog';
import { Button } from '../../ui/button';
import { Input } from '../../ui/input';
import { generateEuerPdf } from '../../utils/generateEuerPdf';
import { useCategories } from '../../hooks/useCategories';

export default function EuerReportDialog({
  isOpen,
  onClose,
  transactions,
  reportName,
}) {
  const [reportTitle, setReportTitle] = useState('');
  const [creditsLabel, setCreditsLabel] = useState('');
  const [paymentsLabel, setPaymentsLabel] = useState('');
  const [surplusLabel, setSurplusLabel] = useState('');
  const [fileName, setFileName] = useState('');
  const { categories, loading } = useCategories();
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (isOpen) {
      setReportTitle('Einnahme-Überschuss-Rechnung');
      setCreditsLabel('Einnahme');
      setPaymentsLabel('Betriebsausgaben');
      setSurplusLabel('Überschuss');
      setFileName(`${reportName}_EÜR`);
      setError(null);
    }
  }, [isOpen, reportName]);

  // Calculate preview stats
  const stats = useMemo(() => {
    const validTransactions = transactions.filter(
      (t) => t.category && t.name && t.name.trim() !== ''
    );

    const categoryMap = new Map(categories.map((c) => [c.name, c]));

    const einnahmeCount = validTransactions.filter((t) => {
      const cat = categoryMap.get(t.category);
      return cat && cat.categoryType === 'Einnahme';
    }).length;

    const ausgabenCount = validTransactions.filter((t) => {
      const cat = categoryMap.get(t.category);
      return cat && cat.categoryType === 'Ausgabe';
    }).length;

    return {
      total: validTransactions.length,
      einnahme: einnahmeCount,
      ausgaben: ausgabenCount,
      excluded: transactions.length - validTransactions.length,
    };
  }, [transactions, categories]);

  const handleGenerate = async () => {
    if (!reportTitle.trim()) {
      setError('Bitte geben Sie einen Titel ein');
      return;
    }

    if (stats.einnahme > 0 && !creditsLabel.trim()) {
      setError('Bitte geben Sie eine Überschrift für Einnahmen ein');
      return;
    }

    if (stats.ausgaben > 0 && !paymentsLabel.trim()) {
      setError('Bitte geben Sie eine Überschrift für Ausgaben ein');
      return;
    }

    if (stats.einnahme > 0 && stats.ausgaben > 0 && !surplusLabel.trim()) {
      setError('Bitte geben Sie eine Überschrift für den Überschuss ein');
      return;
    }

    if (!fileName.trim()) {
      setError('Bitte geben Sie einen Dateinamen ein');
      return;
    }

    try {
      setGenerating(true);
      setError(null);
      await generateEuerPdf(
        transactions,
        categories,
        reportTitle.trim(),
        reportName,
        {
          creditsLabel: creditsLabel.trim(),
          paymentsLabel: paymentsLabel.trim(),
          surplusLabel: surplusLabel.trim(),
          fileName: fileName.trim(),
        }
      );
      onClose();
    } catch (err) {
      setError(`Failed to generate PDF: ${err.message}`);
    } finally {
      setGenerating(false);
    }
  };

  return (
    <Dialog open={isOpen} onClose={onClose} size="2xl">
      <DialogTitle>Einnahme-Überschuss-Rechnung generieren</DialogTitle>
      <DialogDescription>
        Erstellen Sie eine EÜR-PDF basierend auf den Transaktionen in diesem
        Bericht.
      </DialogDescription>
      <DialogBody>
        <div className="space-y-6">
          {/* Error Message */}
          {error && (
            <div className="rounded-md bg-red-50 p-4">
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}

          {/* Report Title Input */}
          <div>
            <label className="block text-sm font-medium text-gray-900 mb-2">
              Bericht Titel
            </label>
            <Input
              type="text"
              value={reportTitle}
              onChange={(e) => setReportTitle(e.target.value)}
              placeholder="Einnahme-Überschuss-Rechnung"
              className="w-full"
            />
          </div>

          {/* Credits Label Input — only when there are credit transactions */}
          {!loading && stats.einnahme > 0 && (
            <div>
              <label className="block text-sm font-medium text-gray-900 mb-2">
                Überschrift für Einnahmen (Label for Credits)
              </label>
              <Input
                type="text"
                value={creditsLabel}
                onChange={(e) => setCreditsLabel(e.target.value)}
                placeholder="Einnahme"
                className="w-full"
              />
            </div>
          )}

          {/* Payments Label Input — only when there are payment transactions */}
          {!loading && stats.ausgaben > 0 && (
            <div>
              <label className="block text-sm font-medium text-gray-900 mb-2">
                Überschrift für Ausgaben (Label for Payments)
              </label>
              <Input
                type="text"
                value={paymentsLabel}
                onChange={(e) => setPaymentsLabel(e.target.value)}
                placeholder="Betriebsausgaben"
                className="w-full"
              />
            </div>
          )}

          {/* Surplus Label Input — only when both groups have transactions */}
          {!loading && stats.einnahme > 0 && stats.ausgaben > 0 && (
            <div>
              <label className="block text-sm font-medium text-gray-900 mb-2">
                Überschrift für Überschuss (Label for Surplus)
              </label>
              <Input
                type="text"
                value={surplusLabel}
                onChange={(e) => setSurplusLabel(e.target.value)}
                placeholder="Überschuss"
                className="w-full"
              />
            </div>
          )}

          {/* Filename Input */}
          <div>
            <label className="block text-sm font-medium text-gray-900 mb-2">
              Dateiname
            </label>
            <div className="flex items-center gap-2">
              <Input
                type="text"
                value={fileName}
                onChange={(e) => setFileName(e.target.value)}
                placeholder={`${reportName}_EÜR`}
                className="w-full"
              />
              <span className="text-sm text-gray-500">.pdf</span>
            </div>
          </div>

          {/* Preview Stats */}
          {!loading && (
            <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
              <h4 className="text-sm font-semibold text-blue-900 mb-3">
                Vorschau
              </h4>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-blue-700">Einnahme Transaktionen</p>
                  <p className="font-bold text-blue-900">{stats.einnahme}</p>
                </div>
                <div>
                  <p className="text-blue-700">Ausgaben Transaktionen</p>
                  <p className="font-bold text-blue-900">{stats.ausgaben}</p>
                </div>
                <div>
                  <p className="text-blue-700">Gesamt</p>
                  <p className="font-bold text-blue-900">{stats.total}</p>
                </div>
                {stats.excluded > 0 && (
                  <div>
                    <p className="text-blue-700">Ausgeschlossen</p>
                    <p className="font-bold text-blue-900">{stats.excluded}</p>
                    <p className="text-xs text-blue-600 mt-1">
                      (Ohne Namen oder Kategorie)
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {loading && (
            <div className="flex items-center justify-center p-8">
              <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-current border-r-transparent"></div>
              <p className="ml-3 text-gray-600">Lade Kategorien...</p>
            </div>
          )}
        </div>
      </DialogBody>
      <DialogActions>
        <Button plain onClick={onClose} disabled={generating}>
          Abbrechen
        </Button>
        <Button
          onClick={handleGenerate}
          disabled={generating || loading}
          color="blue"
        >
          {generating ? 'Generiere PDF...' : 'PDF erstellen'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
