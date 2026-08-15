import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';

const PAGES = [
  'dashboard', 'delays', 'suppliers', 'articles', 'engagements', 'structures', 'anomalies'
];

const PAGE_LABELS = {
  dashboard: 'Vue d\'ensemble',
  delays: 'Délais',
  suppliers: 'Fournisseurs',
  articles: 'Articles & Prix',
  engagements: 'Engagements',
  structures: 'Structures',
  anomalies: 'Anomalies',
};

export async function exportAllPagesPdf(setActivePage, onProgress) {
  const pdf = new jsPDF('landscape', 'mm', 'a4');
  const pdfW = pdf.internal.pageSize.getWidth();
  const pdfH = pdf.internal.pageSize.getHeight();
  let firstPage = true;

  for (let i = 0; i < PAGES.length; i++) {
    const pageId = PAGES[i];
    onProgress && onProgress(i + 1, PAGES.length, PAGE_LABELS[pageId]);

    // Switch to page and wait for render
    setActivePage(pageId);
    await new Promise(r => setTimeout(r, 800));

    const mainEl = document.querySelector('.main-content');
    if (!mainEl) continue;

    // Temporarily expand to full height (no scroll clipping)
    const origMaxH = mainEl.style.maxHeight;
    const origOverflow = mainEl.style.overflow;
    mainEl.style.maxHeight = 'none';
    mainEl.style.overflow = 'visible';

    // Also expand inner scrollable containers
    const scrollables = mainEl.querySelectorAll('[style*="max-height"], [style*="maxHeight"]');
    const origStyles = [];
    scrollables.forEach(el => {
      origStyles.push({ el, maxH: el.style.maxHeight, overflow: el.style.overflow });
      el.style.maxHeight = 'none';
      el.style.overflow = 'visible';
    });

    await new Promise(r => setTimeout(r, 200));

    try {
      const canvas = await html2canvas(mainEl, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#f5f0e8',
        logging: false,
        windowWidth: mainEl.scrollWidth,
        windowHeight: mainEl.scrollHeight,
      });

      const imgData = canvas.toDataURL('image/jpeg', 0.92);
      const imgW = canvas.width;
      const imgH = canvas.height;

      // Fit image into PDF pages (may need multiple PDF pages for long content)
      const ratio = pdfW / imgW;
      const scaledH = imgH * ratio;
      const totalPdfPages = Math.ceil(scaledH / pdfH);

      for (let p = 0; p < totalPdfPages; p++) {
        if (!firstPage) pdf.addPage();
        firstPage = false;

        // Draw a slice of the image
        const srcY = (p * pdfH) / ratio;
        const srcSliceH = pdfH / ratio;

        // Create a temporary canvas for this slice
        const sliceCanvas = document.createElement('canvas');
        sliceCanvas.width = imgW;
        sliceCanvas.height = Math.min(srcSliceH, imgH - srcY);
        const ctx = sliceCanvas.getContext('2d');
        ctx.drawImage(canvas, 0, srcY, imgW, sliceCanvas.height, 0, 0, imgW, sliceCanvas.height);

        const sliceData = sliceCanvas.toDataURL('image/jpeg', 0.92);
        const sliceScaledH = sliceCanvas.height * ratio;
        pdf.addImage(sliceData, 'JPEG', 0, 0, pdfW, sliceScaledH);

        // Page label footer
        pdf.setFontSize(7);
        pdf.setTextColor(150);
        pdf.text(`SNDE — Direction des Achats | ${PAGE_LABELS[pageId]}`, 5, pdfH - 3);
        pdf.text(`Page ${pdf.getNumberOfPages()}`, pdfW - 20, pdfH - 3);
      }
    } catch (err) {
      console.error(`Erreur capture ${pageId}:`, err);
    }

    // Restore styles
    mainEl.style.maxHeight = origMaxH;
    mainEl.style.overflow = origOverflow;
    origStyles.forEach(({ el, maxH, overflow }) => {
      el.style.maxHeight = maxH;
      el.style.overflow = overflow;
    });
  }

  // Download
  const date = new Date().toLocaleDateString('fr-FR').replace(/\//g, '-');
  pdf.save(`SNDE_Dashboard_Achats_${date}.pdf`);
}
