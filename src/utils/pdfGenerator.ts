import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface EstimateData {
  estimateNumber: string;
  date: string;
  client: {
    name: string;
    email: string;
    phone?: string;
    address?: string;
  };
  company: {
    name: string;
    email: string;
    phone: string;
    address?: string;
  };
  items: {
    description: string;
    quantity: number;
    rate: number;
    amount: number;
  }[];
  subtotal: number;
  tax?: number;
  total: number;
  notes?: string;
  terms?: string;
}

export const generateEstimatePDF = (estimate: EstimateData): Blob => {
  const doc = new jsPDF();

  // Header
  doc.setFontSize(24);
  doc.setTextColor(33, 37, 41);
  doc.text('ESTIMATE', 20, 20);

  // Company Info
  doc.setFontSize(10);
  doc.setTextColor(108, 117, 125);
  doc.text(estimate.company.name, 20, 30);
  if (estimate.company.address) doc.text(estimate.company.address, 20, 35);
  doc.text(`${estimate.company.phone} | ${estimate.company.email}`, 20, 40);

  // Estimate Details (Right side)
  doc.setFontSize(10);
  doc.text(`Estimate #: ${estimate.estimateNumber}`, 140, 30);
  doc.text(`Date: ${estimate.date}`, 140, 35);

  // Client Info
  doc.setFontSize(12);
  doc.setTextColor(33, 37, 41);
  doc.text('Bill To:', 20, 55);
  doc.setFontSize(10);
  doc.setTextColor(108, 117, 125);
  doc.text(estimate.client.name, 20, 62);
  if (estimate.client.address) doc.text(estimate.client.address, 20, 67);
  if (estimate.client.phone) doc.text(estimate.client.phone, 20, 72);
  doc.text(estimate.client.email, 20, 77);

  // Items Table
  autoTable(doc, {
    startY: 90,
    head: [['Description', 'Qty', 'Rate', 'Amount']],
    body: estimate.items.map(item => [
      item.description,
      item.quantity.toString(),
      `$${item.rate.toFixed(2)}`,
      `$${item.amount.toFixed(2)}`
    ]),
    theme: 'striped',
    headStyles: {
      fillColor: [37, 99, 235],
      textColor: 255,
      fontSize: 10,
      fontStyle: 'bold'
    },
    columnStyles: {
      0: { cellWidth: 90 },
      1: { cellWidth: 30, halign: 'center' },
      2: { cellWidth: 35, halign: 'right' },
      3: { cellWidth: 35, halign: 'right' }
    },
    margin: { left: 20, right: 20 }
  });

  // Totals
  const finalY = (doc as any).lastAutoTable.finalY + 10;

  doc.setFontSize(10);
  doc.text('Subtotal:', 140, finalY);
  doc.text(`$${estimate.subtotal.toFixed(2)}`, 175, finalY, { align: 'right' });

  if (estimate.tax) {
    doc.text('Tax:', 140, finalY + 7);
    doc.text(`$${estimate.tax.toFixed(2)}`, 175, finalY + 7, { align: 'right' });
  }

  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('Total:', 140, finalY + (estimate.tax ? 14 : 7));
  doc.text(`$${estimate.total.toFixed(2)}`, 175, finalY + (estimate.tax ? 14 : 7), { align: 'right' });

  // Notes
  if (estimate.notes) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.text('Notes:', 20, finalY + 25);
    const splitNotes = doc.splitTextToSize(estimate.notes, 170);
    doc.text(splitNotes, 20, finalY + 32);
  }

  // Terms & Conditions
  if (estimate.terms) {
    const termsY = estimate.notes ? finalY + 50 : finalY + 25;
    doc.setFont('helvetica', 'bold');
    doc.text('Terms & Conditions:', 20, termsY);
    doc.setFont('helvetica', 'normal');
    const splitTerms = doc.splitTextToSize(estimate.terms, 170);
    doc.text(splitTerms, 20, termsY + 7);
  }

  // Footer
  doc.setFontSize(8);
  doc.setTextColor(150, 150, 150);
  doc.text('This estimate is valid for 30 days from the date of issue.', 105, 280, { align: 'center' });

  // Return as Blob
  return doc.output('blob');
};

export const downloadEstimatePDF = (estimate: EstimateData, filename?: string) => {
  const blob = generateEstimatePDF(estimate);
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename || `estimate-${estimate.estimateNumber}.pdf`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

// Financial Report Interfaces
interface FinancialReportData {
  reportType: 'profit-loss' | 'expense-summary' | 'revenue-summary' | 'cash-flow' | 'tax-summary';
  dateRange: {
    startDate: string;
    endDate: string;
  };
  companyInfo?: {
    name: string;
    address?: string;
    phone?: string;
    email?: string;
  };
  summary: {
    totalRevenue?: number;
    totalExpenses?: number;
    netProfit?: number;
    profitMargin?: number;
  };
  expenses?: Array<{
    date: string;
    vendor: string;
    category: string;
    amount: number;
    notes?: string;
  }>;
  expensesByCategory?: Record<string, number>;
  revenue?: Array<{
    date: string;
    description: string;
    amount: number;
    paymentMethod?: string;
  }>;
  cashFlow?: Array<{
    month: string;
    revenue: number;
    expenses: number;
    netCashFlow: number;
  }>;
  trends?: {
    trend: 'improving' | 'declining' | 'stable';
    averageRevenue?: number;
    averageExpenses?: number;
    prediction?: number;
  };
}

export const generateFinancialReportPDF = (reportData: FinancialReportData): Blob => {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  // Header Background
  doc.setFillColor(37, 99, 235); // Blue
  doc.rect(0, 0, pageWidth, 35, 'F');

  // Report Title
  doc.setFontSize(22);
  doc.setTextColor(255, 255, 255);
  const reportTitles = {
    'profit-loss': 'PROFIT & LOSS STATEMENT',
    'expense-summary': 'EXPENSE SUMMARY REPORT',
    'revenue-summary': 'REVENUE SUMMARY REPORT',
    'cash-flow': 'CASH FLOW ANALYSIS',
    'tax-summary': 'TAX SUMMARY REPORT'
  };
  doc.text(reportTitles[reportData.reportType], pageWidth / 2, 15, { align: 'center' });

  // Report Period
  doc.setFontSize(10);
  doc.setTextColor(220, 220, 255);
  doc.text(`Period: ${reportData.dateRange.startDate} to ${reportData.dateRange.endDate}`, pageWidth / 2, 25, { align: 'center' });

  let yPos = 45;

  // Company Info (if provided)
  if (reportData.companyInfo) {
    doc.setFontSize(9);
    doc.setTextColor(100, 100, 100);
    doc.text(reportData.companyInfo.name, 20, yPos);
    if (reportData.companyInfo.address) {
      yPos += 4;
      doc.text(reportData.companyInfo.address, 20, yPos);
    }
    yPos += 8;
  }

  // Generated Date (right-aligned)
  doc.setFontSize(8);
  doc.setTextColor(120, 120, 120);
  doc.text(`Generated: ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}`, pageWidth - 20, yPos, { align: 'right' });
  yPos += 10;

  // Financial Summary Cards
  const cardWidth = 85;
  const cardHeight = 25;
  const cardSpacing = 10;
  const startX = 20;

  // Revenue Card
  doc.setFillColor(240, 253, 244); // Light green
  doc.roundedRect(startX, yPos, cardWidth, cardHeight, 3, 3, 'F');
  doc.setDrawColor(34, 197, 94);
  doc.setLineWidth(0.5);
  doc.roundedRect(startX, yPos, cardWidth, cardHeight, 3, 3, 'S');

  doc.setFontSize(9);
  doc.setTextColor(34, 197, 94);
  doc.text('Total Revenue', startX + 5, yPos + 8);
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text(`$${(reportData.summary.totalRevenue || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, startX + 5, yPos + 18);
  doc.setFont('helvetica', 'normal');

  // Expenses Card
  doc.setFillColor(254, 242, 242); // Light red
  doc.roundedRect(startX + cardWidth + cardSpacing, yPos, cardWidth, cardHeight, 3, 3, 'F');
  doc.setDrawColor(239, 68, 68);
  doc.roundedRect(startX + cardWidth + cardSpacing, yPos, cardWidth, cardHeight, 3, 3, 'S');

  doc.setFontSize(9);
  doc.setTextColor(239, 68, 68);
  doc.text('Total Expenses', startX + cardWidth + cardSpacing + 5, yPos + 8);
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text(`$${(reportData.summary.totalExpenses || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, startX + cardWidth + cardSpacing + 5, yPos + 18);
  doc.setFont('helvetica', 'normal');

  yPos += cardHeight + 5;

  // Net Profit Card
  const profitColor = (reportData.summary.netProfit || 0) >= 0 ? [34, 197, 94] : [239, 68, 68];
  const profitBg = (reportData.summary.netProfit || 0) >= 0 ? [240, 253, 244] : [254, 242, 242];

  doc.setFillColor(profitBg[0], profitBg[1], profitBg[2]);
  doc.roundedRect(startX, yPos, cardWidth, cardHeight, 3, 3, 'F');
  doc.setDrawColor(profitColor[0], profitColor[1], profitColor[2]);
  doc.roundedRect(startX, yPos, cardWidth, cardHeight, 3, 3, 'S');

  doc.setFontSize(9);
  doc.setTextColor(profitColor[0], profitColor[1], profitColor[2]);
  doc.text('Net Profit', startX + 5, yPos + 8);
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text(`$${(reportData.summary.netProfit || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, startX + 5, yPos + 18);
  doc.setFont('helvetica', 'normal');

  // Profit Margin Card
  doc.setFillColor(239, 246, 255); // Light blue
  doc.roundedRect(startX + cardWidth + cardSpacing, yPos, cardWidth, cardHeight, 3, 3, 'F');
  doc.setDrawColor(59, 130, 246);
  doc.roundedRect(startX + cardWidth + cardSpacing, yPos, cardWidth, cardHeight, 3, 3, 'S');

  doc.setFontSize(9);
  doc.setTextColor(59, 130, 246);
  doc.text('Profit Margin', startX + cardWidth + cardSpacing + 5, yPos + 8);
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text(`${(reportData.summary.profitMargin || 0).toFixed(1)}%`, startX + cardWidth + cardSpacing + 5, yPos + 18);
  doc.setFont('helvetica', 'normal');

  yPos += cardHeight + 15;

  // Expenses by Category (Profit & Loss, Expense Summary)
  if (reportData.expensesByCategory && Object.keys(reportData.expensesByCategory).length > 0) {
    // Section Header
    doc.setFillColor(249, 250, 251); // Light gray background
    doc.rect(15, yPos - 5, pageWidth - 30, 12, 'F');
    doc.setFontSize(12);
    doc.setTextColor(55, 65, 81);
    doc.setFont('helvetica', 'bold');
    doc.text('Expense Breakdown by Category', 20, yPos + 3);
    doc.setFont('helvetica', 'normal');
    yPos += 15;

    const categoryData = Object.entries(reportData.expensesByCategory)
      .sort((a, b) => b[1] - a[1])
      .map(([category, amount]) => [
        category,
        `$${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
        reportData.summary.totalExpenses
          ? `${((amount / reportData.summary.totalExpenses) * 100).toFixed(1)}%`
          : '0%'
      ]);

    autoTable(doc, {
      startY: yPos,
      head: [['Category', 'Amount', '% of Total']],
      body: categoryData,
      theme: 'grid',
      headStyles: {
        fillColor: [37, 99, 235], // Blue
        textColor: 255,
        fontSize: 10,
        fontStyle: 'bold',
        halign: 'left'
      },
      bodyStyles: {
        fontSize: 9,
        textColor: [55, 65, 81]
      },
      alternateRowStyles: {
        fillColor: [249, 250, 251]
      },
      columnStyles: {
        0: { cellWidth: 90, halign: 'left' },
        1: { cellWidth: 50, halign: 'right', fontStyle: 'bold' },
        2: { cellWidth: 40, halign: 'right' }
      },
      margin: { left: 20, right: 20 }
    });

    yPos = (doc as any).lastAutoTable.finalY + 15;
  }

  // Detailed Expense Table
  if (reportData.expenses && reportData.expenses.length > 0) {
    // Check if we need a new page
    if (yPos > 200) {
      doc.addPage();
      yPos = 30;
    }

    // Section Header
    doc.setFillColor(249, 250, 251);
    doc.rect(15, yPos - 5, pageWidth - 30, 12, 'F');
    doc.setFontSize(12);
    doc.setTextColor(55, 65, 81);
    doc.setFont('helvetica', 'bold');
    doc.text('Detailed Transaction History', 20, yPos + 3);
    doc.setFont('helvetica', 'normal');
    yPos += 15;

    const expenseData = reportData.expenses.slice(0, 50).map(exp => [
      new Date(exp.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
      exp.vendor,
      exp.category,
      `$${exp.amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
    ]);

    autoTable(doc, {
      startY: yPos,
      head: [['Date', 'Vendor', 'Category', 'Amount']],
      body: expenseData,
      theme: 'grid',
      headStyles: {
        fillColor: [37, 99, 235],
        textColor: 255,
        fontSize: 9,
        fontStyle: 'bold'
      },
      bodyStyles: {
        fontSize: 8,
        textColor: [55, 65, 81]
      },
      alternateRowStyles: {
        fillColor: [249, 250, 251]
      },
      columnStyles: {
        0: { cellWidth: 28, halign: 'left' },
        1: { cellWidth: 60, halign: 'left' },
        2: { cellWidth: 45, halign: 'left' },
        3: { cellWidth: 35, halign: 'right', fontStyle: 'bold' }
      },
      margin: { left: 20, right: 20 }
    });

    yPos = (doc as any).lastAutoTable.finalY + 8;

    if (reportData.expenses.length > 50) {
      doc.setFontSize(8);
      doc.setTextColor(120, 120, 120);
      doc.setFont('helvetica', 'italic');
      doc.text(`Note: Showing first 50 of ${reportData.expenses.length} transactions. Full data available in system.`, 20, yPos);
      doc.setFont('helvetica', 'normal');
      yPos += 10;
    }
  }

  // Revenue Table
  if (reportData.revenue && reportData.revenue.length > 0) {
    if (yPos > 200) {
      doc.addPage();
      yPos = 30;
    }

    // Section Header
    doc.setFillColor(249, 250, 251);
    doc.rect(15, yPos - 5, pageWidth - 30, 12, 'F');
    doc.setFontSize(12);
    doc.setTextColor(55, 65, 81);
    doc.setFont('helvetica', 'bold');
    doc.text('Revenue & Income Details', 20, yPos + 3);
    doc.setFont('helvetica', 'normal');
    yPos += 15;

    const revenueData = reportData.revenue.map(rev => [
      new Date(rev.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
      rev.description,
      rev.paymentMethod || 'N/A',
      `$${rev.amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
    ]);

    autoTable(doc, {
      startY: yPos,
      head: [['Date', 'Description', 'Payment Method', 'Amount']],
      body: revenueData,
      theme: 'grid',
      headStyles: {
        fillColor: [34, 197, 94],
        textColor: 255,
        fontSize: 9,
        fontStyle: 'bold'
      },
      bodyStyles: {
        fontSize: 8,
        textColor: [55, 65, 81]
      },
      alternateRowStyles: {
        fillColor: [249, 250, 251]
      },
      columnStyles: {
        0: { cellWidth: 28, halign: 'left' },
        1: { cellWidth: 70, halign: 'left' },
        2: { cellWidth: 35, halign: 'left' },
        3: { cellWidth: 35, halign: 'right', fontStyle: 'bold', textColor: [34, 197, 94] }
      },
      margin: { left: 20, right: 20 }
    });

    yPos = (doc as any).lastAutoTable.finalY + 15;
  }

  // Cash Flow Table
  if (reportData.cashFlow && reportData.cashFlow.length > 0) {
    if (yPos > 200) {
      doc.addPage();
      yPos = 30;
    }

    // Section Header
    doc.setFillColor(249, 250, 251);
    doc.rect(15, yPos - 5, pageWidth - 30, 12, 'F');
    doc.setFontSize(12);
    doc.setTextColor(55, 65, 81);
    doc.setFont('helvetica', 'bold');
    doc.text('Monthly Cash Flow Analysis', 20, yPos + 3);
    doc.setFont('helvetica', 'normal');
    yPos += 15;

    const cashFlowData = reportData.cashFlow.map(cf => [
      cf.month,
      `$${cf.revenue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      `$${cf.expenses.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      `$${cf.netCashFlow.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
    ]);

    autoTable(doc, {
      startY: yPos,
      head: [['Month', 'Revenue', 'Expenses', 'Net Cash Flow']],
      body: cashFlowData,
      theme: 'grid',
      headStyles: {
        fillColor: [37, 99, 235],
        textColor: 255,
        fontSize: 10,
        fontStyle: 'bold'
      },
      bodyStyles: {
        fontSize: 9,
        textColor: [55, 65, 81]
      },
      alternateRowStyles: {
        fillColor: [249, 250, 251]
      },
      columnStyles: {
        0: { cellWidth: 65, halign: 'left', fontStyle: 'bold' },
        1: { cellWidth: 38, halign: 'right', textColor: [34, 197, 94] },
        2: { cellWidth: 38, halign: 'right', textColor: [239, 68, 68] },
        3: { cellWidth: 38, halign: 'right', fontStyle: 'bold' }
      },
      margin: { left: 20, right: 20 }
    });

    yPos = (doc as any).lastAutoTable.finalY + 15;

    // Trends Box
    if (reportData.trends) {
      doc.setFillColor(239, 246, 255);
      doc.roundedRect(20, yPos, pageWidth - 40, 35, 3, 3, 'F');
      doc.setDrawColor(59, 130, 246);
      doc.setLineWidth(0.5);
      doc.roundedRect(20, yPos, pageWidth - 40, 35, 3, 3, 'S');

      doc.setFontSize(11);
      doc.setTextColor(37, 99, 235);
      doc.setFont('helvetica', 'bold');
      doc.text('📊 Trend Analysis', 25, yPos + 8);
      doc.setFont('helvetica', 'normal');

      doc.setFontSize(9);
      doc.setTextColor(55, 65, 81);
      yPos += 16;

      const trendColor = reportData.trends.trend === 'improving' ? '🟢' : '🔴';
      doc.text(`${trendColor} Cash Flow Trend: ${reportData.trends.trend.toUpperCase()}`, 25, yPos);
      yPos += 6;

      if (reportData.trends.averageRevenue !== undefined) {
        doc.text(`Avg Monthly Revenue: $${reportData.trends.averageRevenue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, 25, yPos);
      }

      if (reportData.trends.averageExpenses !== undefined) {
        doc.text(`Avg Monthly Expenses: $${reportData.trends.averageExpenses.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, 110, yPos);
      }

      yPos += 45;
    }
  }

  // Professional Footer
  const footerY = pageHeight - 15;
  doc.setDrawColor(229, 231, 235);
  doc.setLineWidth(0.5);
  doc.line(20, footerY - 5, pageWidth - 20, footerY - 5);

  doc.setFontSize(8);
  doc.setTextColor(156, 163, 175);
  doc.text('Generated by Saul AI Finance Manager', 20, footerY);
  doc.text(`${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}`, pageWidth - 20, footerY, { align: 'right' });

  // Confidential Notice
  doc.setFontSize(7);
  doc.setTextColor(156, 163, 175);
  doc.setFont('helvetica', 'italic');
  doc.text('This report is confidential and intended for internal use only.', pageWidth / 2, footerY + 5, { align: 'center' });
  doc.setFont('helvetica', 'normal');

  return doc.output('blob');
};

export const downloadFinancialReportPDF = (reportData: FinancialReportData, filename?: string) => {
  const blob = generateFinancialReportPDF(reportData);
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;

  const defaultFilename = `${reportData.reportType}-${reportData.dateRange.startDate}-to-${reportData.dateRange.endDate}.pdf`;
  link.download = filename || defaultFilename;

  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};
