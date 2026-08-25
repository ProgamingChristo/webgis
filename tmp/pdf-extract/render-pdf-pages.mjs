import fs from "node:fs/promises";
import path from "node:path";
import { createCanvas } from "@napi-rs/canvas";
import { getDocument } from "pdfjs-dist/legacy/build/pdf.mjs";

class NodeCanvasFactory {
  create(width, height) {
    const canvas = createCanvas(width, height);
    return {
      canvas,
      context: canvas.getContext("2d"),
    };
  }

  reset(canvasAndContext, width, height) {
    canvasAndContext.canvas.width = width;
    canvasAndContext.canvas.height = height;
  }

  destroy(canvasAndContext) {
    canvasAndContext.canvas.width = 0;
    canvasAndContext.canvas.height = 0;
    canvasAndContext.canvas = null;
    canvasAndContext.context = null;
  }
}

const [pdfPath, outputDir, pagesArg = "3"] = process.argv.slice(2);

if (!pdfPath || !outputDir) {
  throw new Error("Usage: node render-pdf-pages.mjs <pdfPath> <outputDir> [pages]");
}

await fs.mkdir(outputDir, { recursive: true });

const pdfBytes = await fs.readFile(pdfPath);
const pdf = await getDocument({
  data: new Uint8Array(pdfBytes),
  disableFontFace: true,
  isEvalSupported: false,
}).promise;

const pageLimit = Math.min(Number.parseInt(pagesArg, 10) || 1, pdf.numPages);
const canvasFactory = new NodeCanvasFactory();

for (let pageNumber = 1; pageNumber <= pageLimit; pageNumber += 1) {
  const page = await pdf.getPage(pageNumber);
  const viewport = page.getViewport({ scale: 2 });
  const canvasAndContext = canvasFactory.create(viewport.width, viewport.height);

  await page.render({
    canvasContext: canvasAndContext.context,
    viewport,
    canvasFactory,
  }).promise;

  const outputPath = path.join(outputDir, `proposal-page-${pageNumber}.png`);
  await fs.writeFile(outputPath, canvasAndContext.canvas.toBuffer("image/png"));
  canvasFactory.destroy(canvasAndContext);
  console.log(outputPath);
}
