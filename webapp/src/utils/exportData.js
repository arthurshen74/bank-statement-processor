
import ExcelJS from 'exceljs';

const normalizeData = (data) => {

    // determine if data comes from credit card or bank account
    const isCreditCardData = data.length > 0 && Object.keys(data[0]).includes('DatumBuchung');

    const normalized = data.reduce((acc, transaction) => {

        const betrag = isCreditCardData
            ? transaction.Amount
            : Number((transaction.Einnahmen || transaction.Ausgaben || '0,00').trim().replace(/\./g, '').replace(',', '.'));
        const isNegative = transaction.Ausgaben ? true : false;
        const includeRow = betrag !== 0;

        if (includeRow) {
            const rowData = {
                rowId: acc.length + 1,
                date: new Date(isCreditCardData
                    ? transaction.DatumBuchung.split('.').reverse().join('-')
                    : transaction.Datum),
                description: transaction.Buchungstext,
                amount: betrag * (isNegative ? -1 : 1),
                includeInReport: false,
            };

            acc.push(rowData);

        }

        return acc;
    }, []);

    return normalized;
};

const exportData = async (data) => {

    // normalize the data first
    const exportData = normalizeData(data);

    // create workbook and worksheet
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Transactions');

    // define headers/columns
    worksheet.columns = [
        { header: 'Datum', key: 'date', width: 15, style: { numFmt: 'dd.mm.yyyy' } },
        {
            header: 'Beschreibung', key: 'description', width: 50, style: {
                alignment: {
                    wrapText: true,
                    vertical: 'top'
                }
            }
        },
        { header: 'Betrag', key: 'amount', width: 20, style: { numFmt: '#,##0.00 €;[Red]-#,##0.00 €', alignment: { horizontal: 'right' } } },
    ];

    // add data rows
    exportData.forEach((transaction) => {
        worksheet.addRow(transaction);
    });

    // header styling
    worksheet.getRow(1).font = { bold: true };
    worksheet.getRow(1).fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFE0E0E0' }
    };

    // sure, why not autofilter?
    worksheet.autoFilter = {
        from: 'A1',
        to: 'C1',
    };

    // generate buffer
    const buffer = await workbook.xlsx.writeBuffer();

    // create blob and trigger download
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'transactions.xlsx';
    a.click();

    // cleanup
    URL.revokeObjectURL(url);

};

const exportReportTransactions = async (transactions, reportName) => {
    // create workbook and worksheet
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Transactions');

    // define headers/columns
    worksheet.columns = [
        {
            header: 'Buchungsdatum',
            key: 'date',
            width: 15,
            style: { numFmt: 'dd.mm.yyyy' }
        },
        {
            header: 'Name',
            key: 'name',
            width: 30
        },
        {
            header: 'Buchungstext',
            key: 'description',
            width: 50,
            style: {
                alignment: {
                    wrapText: true,
                    vertical: 'top'
                }
            }
        },
        {
            header: 'Kategorie',
            key: 'category',
            width: 20
        },
        {
            header: 'Betrag',
            key: 'amount',
            width: 20,
            style: {
                numFmt: '#,##0.00 €;[Red]-#,##0.00 €',
                alignment: { horizontal: 'right' }
            }
        },
    ];

    // add data rows
    transactions.forEach((transaction) => {
        worksheet.addRow({
            date: transaction.date,
            name: transaction.name || '',
            description: transaction.description,
            category: transaction.category || 'Uncategorized',
            amount: transaction.amount,
        });
    });

    // header styling
    worksheet.getRow(1).font = { bold: true };
    worksheet.getRow(1).fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFE0E0E0' }
    };

    // autofilter
    worksheet.autoFilter = {
        from: 'A1',
        to: 'E1',
    };

    // generate buffer
    const buffer = await workbook.xlsx.writeBuffer();

    // create blob and trigger download
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${reportName}_transactions.xlsx`;
    a.click();

    // cleanup
    URL.revokeObjectURL(url);
};

export { exportData, normalizeData, exportReportTransactions };
