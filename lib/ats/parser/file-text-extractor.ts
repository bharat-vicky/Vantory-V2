export const MAX_RESUME_UPLOAD_BYTES = 5 * 1024 * 1024;
const MIN_EXTRACTED_TEXT_LENGTH = 30;

export async function extractTextFromFile(file: File): Promise<string> {
  if (file.size === 0) {
    throw new Error("The selected file is empty.");
  }
  if (file.size > MAX_RESUME_UPLOAD_BYTES) {
    throw new Error("Resume files must be 5 MB or smaller.");
  }

  const extension = file.name.split(".").pop()?.toLowerCase();
  if (!extension || !["pdf", "docx", "txt"].includes(extension)) {
    throw new Error("Choose a PDF, DOCX, or TXT resume.");
  }

  const bytes = new Uint8Array(await file.arrayBuffer());
  let extractedText: string;

  if (extension === "txt") {
    extractedText = new TextDecoder().decode(bytes);
  } else if (extension === "pdf") {
    if (new TextDecoder("ascii").decode(bytes.subarray(0, 5)) !== "%PDF-") {
      throw new Error("The selected file is not a valid PDF.");
    }
    extractedText = await extractPdfText(bytes);
  } else {
    if (bytes[0] !== 0x50 || bytes[1] !== 0x4b) {
      throw new Error("The selected file is not a valid DOCX document.");
    }
    const mammothModule = await import("mammoth");
    const result = await mammothModule.default.extractRawText({
      arrayBuffer: bytes.buffer,
    });
    extractedText = result.value;
  }

  const cleanedText = cleanExtractedText(extractedText);
  if (cleanedText.length < MIN_EXTRACTED_TEXT_LENGTH) {
    throw new Error(
      "No readable resume text was found. Try a text-based PDF, DOCX, or TXT file.",
    );
  }

  return cleanedText;
}

async function extractPdfText(data: Uint8Array): Promise<string> {
  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
  if (typeof window !== "undefined") {
    pdfjs.GlobalWorkerOptions.workerSrc = new URL(
      "pdfjs-dist/legacy/build/pdf.worker.mjs",
      import.meta.url,
    ).toString();
  }

  const document = await pdfjs.getDocument({
    data,
    isEvalSupported: false,
    useSystemFonts: true,
  }).promise;

  try {
    const pages: string[] = [];
    for (let pageNumber = 1; pageNumber <= document.numPages; pageNumber += 1) {
      const page = await document.getPage(pageNumber);
      const content = await page.getTextContent();
      const pageText = content.items
        .map((item) => {
          if (!("str" in item)) return "";
          return `${item.str}${item.hasEOL ? "\n" : " "}`;
        })
        .join("");
      pages.push(pageText);
    }
    return pages.join("\n");
  } finally {
    await document.destroy();
  }
}

function cleanExtractedText(text: string): string {
  return text
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F-\u009F]/g, "")
    .replace(/\r\n?/g, "\n")
    .split("\n")
    .map((line) => line.replace(/[\t ]+/g, " ").trim())
    .filter(Boolean)
    .join("\n")
    .trim();
}
