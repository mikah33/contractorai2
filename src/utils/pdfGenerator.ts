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
