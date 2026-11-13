# 本地 PDF 与 OCR 依赖

仅在上传 PDF 时按需加载。所有脚本、Worker、字体映射及中英文语言包都从本站读取；简历内容不发送给第三方或服务器。

- PDF.js (`pdfjs-dist`) 6.5.438，Apache-2.0，来自 npm 包的 `legacy/build`、`cmaps`、`standard_fonts`、`wasm`。
- Tesseract.js 7.0.0，Apache-2.0，来自 npm 包 `dist/`。
- Tesseract.js-core 7.0.0，Apache-2.0，包含普通、SIMD 和 relaxed-SIMD 的 LSTM / 完整核心。
- 中英文语言包来自 `https://tessdata.projectnaptha.com/4.0.0_fast/{chi_sim,eng}.traineddata.gz`，Apache-2.0。

各组件许可证保留在对应子目录。文字型 PDF 使用 PDF.js 文本层；扫描页或乱码页使用 Canvas 渲染后在本地 Worker 识别，并在完成后释放 Worker 和 Canvas。
