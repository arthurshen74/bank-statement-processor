import jsPDF from 'jspdf';

export const generateEuerPdf = async (transactions, categories, reportTitle, reportName) => {
    // Filter valid transactions (must have both category and name)
    const validTransactions = transactions.filter(
        (t) => t.category && t.name && t.name.trim() !== ''
    );

    // Create category lookup map
    const categoryMap = new Map(categories.map((c) => [c.name, c]));

    // Group transactions by category
    const transactionsByCategory = validTransactions.reduce((acc, transaction) => {
        const categoryName = transaction.category;
        if (!acc[categoryName]) {
            acc[categoryName] = [];
        }
        acc[categoryName].push(transaction);
        return acc;
    }, {});

    // Separate into Einnahme and Betriebsausgaben based on CategoryType
    const einnahmeCategories = [];
    const ausgabenCategories = [];

    Object.keys(transactionsByCategory).forEach((categoryName) => {
        const category = categoryMap.get(categoryName);
        if (category) {
            const categoryData = {
                name: categoryName,
                type: category.categoryType,
                transactions: transactionsByCategory[categoryName].sort(
                    (a, b) => a.date - b.date
                ),
            };

            if (category.categoryType === 'Einnahme') {
                einnahmeCategories.push(categoryData);
            } else {
                ausgabenCategories.push(categoryData);
            }
        }
    });

    // Sort categories alphabetically
    einnahmeCategories.sort((a, b) => a.name.localeCompare(b.name, 'de'));
    ausgabenCategories.sort((a, b) => a.name.localeCompare(b.name, 'de'));

    // Calculate totals
    const calculateCategoryTotal = (category) =>
        category.transactions.reduce((sum, t) => sum + Math.abs(t.amount), 0);

    const totalEinnahme = einnahmeCategories.reduce(
        (sum, cat) => sum + calculateCategoryTotal(cat),
        0
    );
    const totalAusgaben = ausgabenCategories.reduce(
        (sum, cat) => sum + calculateCategoryTotal(cat),
        0
    );
    const ueberschuss = totalEinnahme - totalAusgaben;

    // Create PDF
    const doc = new jsPDF();
    let yPos = 20;
    const pageWidth = doc.internal.pageSize.width;
    const margin = 20;
    const contentWidth = pageWidth - 2 * margin;

    // Helper functions
    const formatDate = (date) => {
        return date.toLocaleDateString('de-DE', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
        });
    };

    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('de-DE', {
            style: 'currency',
            currency: 'EUR',
            minimumFractionDigits: 2,
        }).format(amount);
    };

    const checkPageBreak = (neededSpace) => {
        if (yPos + neededSpace > doc.internal.pageSize.height - 20) {
            doc.addPage();
            yPos = 20;
        }
    };

    // Title
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text(reportTitle || 'Einnahme-Überschuss-Rechnung', margin, yPos);
    yPos += 15;

    // EINNAHME Section
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('EINNAHME', margin, yPos);
    yPos += 8;

    if (einnahmeCategories.length === 0) {
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.text('Keine Einnahmen', margin + 5, yPos);
        yPos += 10;
    } else {
        einnahmeCategories.forEach((category) => {
            checkPageBreak(50);

            // Category name
            doc.setFontSize(11);
            doc.setFont('helvetica', 'bold');
            doc.text(category.name, margin + 5, yPos);
            yPos += 6;

            // Transactions
            doc.setFontSize(9);
            doc.setFont('helvetica', 'normal');

            category.transactions.forEach((transaction) => {
                checkPageBreak(10);

                const date = formatDate(transaction.date);
                const name = transaction.name || '';
                const betrag = formatCurrency(Math.abs(transaction.amount));

                doc.text(date, margin + 10, yPos);
                doc.text(name, margin + 35, yPos, { maxWidth: contentWidth - 80 });
                doc.text(betrag, pageWidth - margin, yPos, { align: 'right' });
                yPos += 5;
            });

            // Category subtotal
            const categoryTotal = calculateCategoryTotal(category);
            doc.setFont('helvetica', 'bold');
            doc.text('Summe:', margin + 10, yPos);
            doc.text(formatCurrency(categoryTotal), pageWidth - margin, yPos, {
                align: 'right',
            });
            yPos += 8;
            doc.setFont('helvetica', 'normal');
        });
    }

    // Total Einnahme
    checkPageBreak(15);
    yPos += 3;
    doc.setDrawColor(0);
    doc.line(margin, yPos, pageWidth - margin, yPos);
    yPos += 6;
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('Gesamt Einnahme:', margin + 5, yPos);
    doc.text(formatCurrency(totalEinnahme), pageWidth - margin, yPos, {
        align: 'right',
    });
    yPos += 15;

    // BETRIEBSAUSGABEN Section
    checkPageBreak(20);
    doc.setFontSize(14);
    doc.text('BETRIEBSAUSGABEN', margin, yPos);
    yPos += 8;

    if (ausgabenCategories.length === 0) {
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.text('Keine Betriebsausgaben', margin + 5, yPos);
        yPos += 10;
    } else {
        ausgabenCategories.forEach((category) => {
            checkPageBreak(50);

            // Category name
            doc.setFontSize(11);
            doc.setFont('helvetica', 'bold');
            doc.text(category.name, margin + 5, yPos);
            yPos += 6;

            // Transactions
            doc.setFontSize(9);
            doc.setFont('helvetica', 'normal');

            category.transactions.forEach((transaction) => {
                checkPageBreak(10);

                const date = formatDate(transaction.date);
                const name = transaction.name || '';
                const betrag = formatCurrency(Math.abs(transaction.amount));

                doc.text(date, margin + 10, yPos);
                doc.text(name, margin + 35, yPos, { maxWidth: contentWidth - 80 });
                doc.text(betrag, pageWidth - margin, yPos, { align: 'right' });
                yPos += 5;
            });

            // Category subtotal
            const categoryTotal = calculateCategoryTotal(category);
            doc.setFont('helvetica', 'bold');
            doc.text('Summe:', margin + 10, yPos);
            doc.text(formatCurrency(categoryTotal), pageWidth - margin, yPos, {
                align: 'right',
            });
            yPos += 8;
            doc.setFont('helvetica', 'normal');
        });
    }

    // Total Betriebsausgaben
    checkPageBreak(15);
    yPos += 3;
    doc.setDrawColor(0);
    doc.line(margin, yPos, pageWidth - margin, yPos);
    yPos += 6;
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('Gesamt Betriebsausgaben:', margin + 5, yPos);
    doc.text(formatCurrency(totalAusgaben), pageWidth - margin, yPos, {
        align: 'right',
    });
    yPos += 15;

    // Überschuss (Surplus/Deficit)
    checkPageBreak(20);
    yPos += 3;
    doc.line(margin, yPos, pageWidth - margin, yPos);
    doc.line(margin, yPos + 1, pageWidth - margin, yPos + 1); // Double line
    yPos += 8;
    doc.setFontSize(14);
    doc.text('ÜBERSCHUSS:', margin + 5, yPos);
    doc.text(formatCurrency(ueberschuss), pageWidth - margin, yPos, {
        align: 'right',
    });

    // Save PDF
    const filename = `${reportName}_EÜR.pdf`;
    doc.save(filename);
};
