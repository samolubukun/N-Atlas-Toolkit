import * as pdfjsLib from 'pdfjs-dist';
import mammoth from 'mammoth';

// Configure pdfjs-dist worker via CDN to avoid bundler worker build issues
if (typeof window !== 'undefined' && pdfjsLib.GlobalWorkerOptions) {
  pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version || '4.10.38'}/pdf.worker.min.mjs`;
}

/**
 * Extracts plain text from various file formats (.txt, .md, .json, .csv, .pdf, .docx).
 * @param {File} file 
 * @returns {Promise<{ filename: string, text: string, type: string, sizeBytes: number }>}
 */
export async function extractTextFromFile(file) {
  const extension = file.name.split('.').pop()?.toLowerCase();
  let text = '';

  if (['txt', 'md', 'json', 'csv', 'yaml', 'yml', 'js', 'py', 'ts'].includes(extension)) {
    text = await file.text();
  } else if (extension === 'pdf') {
    text = await extractPdfText(file);
  } else if (extension === 'docx') {
    text = await extractDocxText(file);
  } else {
    // Attempt fallback to text
    try {
      text = await file.text();
    } catch {
      throw new Error(`Unsupported file type: .${extension}`);
    }
  }

  return {
    filename: file.name,
    text: text.trim(),
    type: extension || 'txt',
    sizeBytes: file.size,
  };
}

async function extractPdfText(file) {
  const arrayBuffer = await file.arrayBuffer();
  const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
  const pdf = await loadingTask.promise;
  const numPages = pdf.numPages;
  const fullText = [];

  for (let pageNum = 1; pageNum <= numPages; pageNum++) {
    const page = await pdf.getPage(pageNum);
    const content = await page.getTextContent();
    const strings = content.items.map(item => item.str);
    fullText.push(`--- Page ${pageNum} ---\n` + strings.join(' '));
  }

  return fullText.join('\n\n');
}

async function extractDocxText(file) {
  const arrayBuffer = await file.arrayBuffer();
  const result = await mammoth.extractRawText({ arrayBuffer });
  return result.value;
}
