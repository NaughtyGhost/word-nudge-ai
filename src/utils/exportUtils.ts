import { jsPDF } from 'jspdf';
import { Document, Packer, Paragraph, TextRun, HeadingLevel } from 'docx';
import { saveAs } from 'file-saver';

interface Chapter {
  id: string;
  title: string;
  content: string;
  metadata?: {
    notes?: string;
    tags?: string[];
    status?: "draft" | "revision" | "final";
  };
}

// Convert HTML to plain text
const htmlToPlainText = (html: string): string => {
  const tempDiv = document.createElement('div');
  tempDiv.innerHTML = html;
  return tempDiv.textContent || tempDiv.innerText || '';
};

// Export to PDF
export const exportToPDF = (title: string, chapters: Chapter[]) => {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 20;
  const maxWidth = pageWidth - 2 * margin;
  let yPosition = margin;

  // Title
  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.text(title, margin, yPosition);
  yPosition += 15;

  // Process each chapter
  chapters.forEach((chapter, index) => {
    // Add new page if needed
    if (yPosition > 250) {
      doc.addPage();
      yPosition = margin;
    }

    // Chapter title
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text(chapter.title, margin, yPosition);
    yPosition += 10;

    // Chapter content
    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');
    const plainText = htmlToPlainText(chapter.content);
    const lines = doc.splitTextToSize(plainText, maxWidth);
    
    lines.forEach((line: string) => {
      if (yPosition > 280) {
        doc.addPage();
        yPosition = margin;
      }
      doc.text(line, margin, yPosition);
      yPosition += 6;
    });

    yPosition += 10;
  });

  doc.save(`${title}.pdf`);
};

// Export to DOCX
export const exportToDOCX = async (title: string, chapters: Chapter[]) => {
  const docParagraphs: Paragraph[] = [];

  // Title
  docParagraphs.push(
    new Paragraph({
      text: title,
      heading: HeadingLevel.TITLE,
      spacing: { after: 400 },
    })
  );

  // Process each chapter
  chapters.forEach((chapter) => {
    // Chapter title
    docParagraphs.push(
      new Paragraph({
        text: chapter.title,
        heading: HeadingLevel.HEADING_1,
        spacing: { before: 400, after: 200 },
      })
    );

    // Chapter content
    const plainText = htmlToPlainText(chapter.content);
    const paragraphs = plainText.split('\n\n');
    
    paragraphs.forEach((para) => {
      if (para.trim()) {
        docParagraphs.push(
          new Paragraph({
            children: [
              new TextRun({
                text: para.trim(),
                size: 24, // 12pt
              }),
            ],
            spacing: { after: 200 },
          })
        );
      }
    });
  });

  const doc = new Document({
    sections: [
      {
        properties: {},
        children: docParagraphs,
      },
    ],
  });

  const blob = await Packer.toBlob(doc);
  saveAs(blob, `${title}.docx`);
};
