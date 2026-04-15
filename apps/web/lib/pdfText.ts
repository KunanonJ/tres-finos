const PDFJS_VERSION = "4.10.38";

const getItemString = (item: unknown) => {
  if (item && typeof item === "object" && "str" in item && typeof (item as { str: unknown }).str === "string") {
    return (item as { str: string }).str;
  }

  return "";
};

/**
 * Extracts plain text from a PDF in the browser (no server upload).
 * Worker is loaded from unpkg to avoid bundling path issues with Next/Turbopack.
 */
export const extractTextFromPdfFile = async (file: File): Promise<string> => {
  const data = new Uint8Array(await file.arrayBuffer());
  const pdfjs = await import("pdfjs-dist");
  pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${PDFJS_VERSION}/build/pdf.worker.min.mjs`;

  const pdf = await pdfjs.getDocument({ data }).promise;
  const pageTexts: string[] = [];

  for (let pageIndex = 1; pageIndex <= pdf.numPages; pageIndex += 1) {
    const page = await pdf.getPage(pageIndex);
    const textContent = await page.getTextContent();
    const line = textContent.items.map(getItemString).filter(Boolean).join(" ");
    pageTexts.push(line);
  }

  return pageTexts.join("\n");
};
