/**
 * Production-grade Barcode Label Generator
 * Features:
 * - Multiple format support (CODE128, EAN13, CODE39)
 * - Customizable label dimensions
 * - Batch generation
 * - Error handling with fallbacks
 * - Memory efficient
 */

import JsBarcode from "jsbarcode";

// Label configuration
export const LABEL_CONFIG = {
    // Standard 50mm x 25mm label (5 cm x 2.5 cm thermal label size)
    width: 500,  // pixels ~ 50mm (5 cm)
    height: 250, // pixels ~ 25mm (2.5 cm)
    margin: 10,  // Reduced to 10 to allow maximum content scaling
    barcode: {
        width: 3,
        height: 65,  // Reduced to 65 to make room for extra-large text
        fontSize: 14,
        margin: 5,
    },
    text: {
        fontSize: {
            small: 18,
            medium: 24,  // Product name
            large: 30,   // Product code & Sale price
            xlarge: 38,  // Purchase code (top)
        },
        fontFamily: "'Courier New', monospace",
    },
};

/**
 * 
 * @returns {number}
 */


/**
 * Generate a single barcode label as Canvas
 * Label Order: Purchase Code (top) → Barcode → Product Code → Product Name → Sale Price
 * @param {Object} variant - Variant data
 * @param {Object} product - Product data
 * @param {Object} options - Optional config overrides
 * @returns {Promise<HTMLCanvasElement>}
 */
export async function generateBarcodeLabel(variant, product, options = {}) {
    return new Promise((resolve, reject) => {
        try {
            if (!variant?.system_barcode) {
                throw new Error(`No barcode for variant: ${variant?.variant_id}`);
            }

            // Create label canvas
            const canvas = document.createElement("canvas");
            const ctx = canvas.getContext("2d");
            
            const config = { ...LABEL_CONFIG, ...options };
            canvas.width = config.width;
            canvas.height = config.height;

            // White background
            ctx.fillStyle = "#FFFFFF";
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            // Draw border (optional, helps with cutting)
            ctx.strokeStyle = "#CCCCCC";
            ctx.lineWidth = 1;
            ctx.strokeRect(5, 5, canvas.width - 10, canvas.height - 10);

            // Create temporary canvas for barcode
            const barcodeCanvas = document.createElement("canvas");
            
            JsBarcode(barcodeCanvas, variant.system_barcode, {
                format: options.format || "CODE128",
                width: config.barcode.width,
                height: config.barcode.height,
                displayValue: false, // DISABLED: Human-readable number not needed for scanning
                // To re-enable barcode text below the bars, change displayValue to true
                // And uncomment the displayValue line above, then remove this comment
                margin: config.barcode.margin,
                lineColor: "#000000",
                background: "#FFFFFF",
            });

            // Calculate positions
            const barcodeWidth = barcodeCanvas.width;
            const barcodeHeight = barcodeCanvas.height;
            const centerX = (canvas.width - barcodeWidth) / 2;
            let currentY = config.margin;

            // Set baseline to top for predictable programmatic spacing
            ctx.textBaseline = "top";

            // ============================================
            // 1. PURCHASE CODE (TOP - Most Important)
            // ============================================
            // const purchaseCode = calculatePurchaseCode();
            // const purchaseCode = variant.purchase_code
           // In barcodeLabelGenerator.js
           // const purchaseCode = variant.purchase_code || (variant.purchase_price + variant.expenses + 1986);     // NOT GOOD 
           const purchaseCode = variant.purchase_code ;     // NOT GOOD 

            ctx.font = `bold ${config.text.fontSize.xlarge}px ${config.text.fontFamily}`;
            ctx.fillStyle = "#000000";
            ctx.textAlign = "center";
            ctx.fillText(`#${purchaseCode}`, canvas.width / 2, currentY);
            currentY += config.text.fontSize.xlarge + 8;

            // ============================================
            // 2. BARCODE IMAGE
            // ============================================
            ctx.drawImage(barcodeCanvas, centerX, currentY);
            currentY += barcodeHeight + 10;

            // ============================================
            // 3. PRODUCT CODE
            // ============================================
            ctx.font = `bold ${config.text.fontSize.large}px ${config.text.fontFamily}`;
            ctx.fillStyle = "#000000";
            ctx.textAlign = "center";
            ctx.fillText(`P.C- ${variant.product_code || variant.sku || "—"}`, canvas.width / 2, currentY);
            currentY += config.text.fontSize.large + 6;

            // ============================================
            // 4. PRODUCT NAME (using 'name' field, not 'title')
            // ============================================
            const productName = product?.name || "Unknown Product";
            ctx.font = `bold ${config.text.fontSize.medium}px ${config.text.fontFamily}`;
            ctx.fillStyle = "#000000";
            ctx.textAlign = "center";
            
            // Handle long names - wrap if needed
            const maxChars = 28;
            let displayName = productName;
            if (productName.length > maxChars) {
                displayName = productName.substring(0, maxChars - 3) + "...";
            }
            ctx.fillText(displayName, canvas.width / 2, currentY);
            currentY += config.text.fontSize.medium + 6;

            // ============================================
            // 5. SALE & MRP PRICES (Left: MRP, Right: Special Price)
            // ============================================
            ctx.font = `bold ${config.text.fontSize.medium}px ${config.text.fontFamily}`; // Using medium (24px) to prevent side-by-side overflow
            
            const mrp = variant.mrp || product?.mrp || 0;
            const salePrice = variant.special_price || product?.special_price || 0;

            // Draw MRP on the left corner
            ctx.textAlign = "left";
            ctx.fillStyle = "#000000";
            ctx.fillText(`MRP: ₹${Number(mrp).toLocaleString()}`, config.margin, currentY);

            // Draw Special Price on the right corner
            ctx.textAlign = "right";
            ctx.fillStyle = "#000000";
            ctx.fillText(`Special Price: ₹${Number(salePrice).toLocaleString()}`, canvas.width - config.margin, currentY);
            
            // Draw separator line at bottom (optional)
            ctx.strokeStyle = "#EEEEEE";
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(config.margin, canvas.height - 10);
            ctx.lineTo(canvas.width - config.margin, canvas.height - 10);
            ctx.stroke();

            resolve(canvas);
        } catch (error) {
            reject(error);
        }
    });
}

export async function generateBatchLabels(variantsWithProducts, options = {}) {
    return new Promise(async (resolve, reject) => {
        try {
            if (!variantsWithProducts?.length) {
                throw new Error("No variants provided");
            }

            const labelsPerRow = options.labelsPerRow || 2;
            
            // Calculate how many rows we actually need for this batch page
            const totalLabelsOnPage = variantsWithProducts.length;
            const labelsPerColumn = Math.min(options.labelsPerColumn || 4, Math.ceil(totalLabelsOnPage / labelsPerRow));
            
            const labelWidth = 500;  // Standard 50mm (5 cm)
            const labelHeight = 250; // Standard 25mm (2.5 cm)
            const gapX = 25;
            const gapY = 20;
            const marginX = 0;
            const marginY = 0;

            const pageWidth = (labelsPerRow * labelWidth) + ((labelsPerRow - 1) * gapX);
            const pageHeight = (labelsPerColumn * labelHeight) + ((labelsPerColumn - 1) * gapY);
            
            // Create page canvas
            const pageCanvas = document.createElement("canvas");
            pageCanvas.width = pageWidth;
            pageCanvas.height = pageHeight;
            const ctx = pageCanvas.getContext("2d");
            
            // White background
            ctx.fillStyle = "#FFFFFF";
            ctx.fillRect(0, 0, pageWidth, pageHeight);
            
            // Generate each label and place on page
            let index = 0;
            for (const item of variantsWithProducts) {
                if (index >= labelsPerRow * labelsPerColumn) break;
                
                const row = Math.floor(index / labelsPerRow);
                const col = index % labelsPerRow;
                
                const x = marginX + (col * (labelWidth + gapX));
                const y = marginY + (row * (labelHeight + gapY));
                
                try {
                    const labelCanvas = await generateBarcodeLabel(
                        item.variant, 
                        item.product, 
                        { width: labelWidth, height: labelHeight }
                    );
                    ctx.drawImage(labelCanvas, x, y, labelWidth, labelHeight);
                    labelCanvas.remove();
                } catch (err) {
                    console.error(`Failed to generate label for variant ${item.variant?.variant_id}:`, err);
                    // Draw error placeholder
                    ctx.fillStyle = "#FEE2E2";
                    ctx.fillRect(x, y, labelWidth, labelHeight);
                    ctx.fillStyle = "#DC2626";
                    ctx.font = "12px monospace";
                    ctx.fillText("Error", x + 10, y + 50);
                }
                
                index++;
            }
            
            resolve(pageCanvas);
        } catch (error) {
            reject(error);
        }
    });
}

/**
 * Download canvas as PNG
 * @param {HTMLCanvasElement} canvas 
 * @param {string} filename 
 */
export function downloadCanvasAsPNG(canvas, filename) {
    return new Promise((resolve, reject) => {
        try {
            const link = document.createElement("a");
            link.download = filename.endsWith(".png") ? filename : `${filename}.png`;
            link.href = canvas.toDataURL("image/png");
            link.click();
            resolve();
        } catch (error) {
            reject(error);
        }
    });
}

/**
 * Print canvas directly
 * @param {HTMLCanvasElement} canvas 
 */
export function printCanvas(canvases) {
    const printWindow = window.open("", "_blank");
    if (!printWindow) {
        throw new Error("Popup blocked. Please allow popups for this site.");
    }
    
    const canvasArray = Array.isArray(canvases) ? canvases : [canvases];
    const imgTags = canvasArray.map(c => `<img src="${c.toDataURL("image/png")}" />`).join('\\n');
    
    printWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>Print Barcode Labels</title>
            <style>
                html, body { margin: 0; padding: 0; background: white; width: 100%; }
                body { display: flex; flex-direction: column; align-items: flex-start; }
                img { max-width: 100%; object-fit: contain; object-position: left top; }
                @media print {
                    @page {
                        margin: 0;
                        size: auto;
                    }
                    body {
                        margin: 0;
                        padding: 0;
                        display: block;
                    }
                    img {
                        width: 100%;
                        height: auto;
                        max-height: 100vh;
                        object-fit: contain;
                        object-position: left top;
                        display: block;
                        page-break-after: always;
                    }
                }
            </style>
        </head>
        <body>
            ${imgTags}
            <script>
                window.onload = () => {
                    setTimeout(() => {
                        window.print();
                        window.onafterprint = () => window.close();
                    }, 300);
                };
            </script>
        </body>
        </html>
    `);
    printWindow.document.close();
}

// /**
//  * Production-grade Barcode Label Generator
//  * Features:
//  * - Multiple format support (CODE128, EAN13, CODE39)
//  * - Customizable label dimensions
//  * - Batch generation
//  * - Error handling with fallbacks
//  * - Memory efficient
//  */

// import JsBarcode from "jsbarcode";

// // Label configuration
// export const LABEL_CONFIG = {
//     // Standard 50mm x 30mm label (common thermal label size)
//     width: 500,  // pixels at 300dpi ~ 50mm
//     height: 300, // pixels at 300dpi ~ 30mm
//     margin: 20,
//     barcode: {
//         width: 2,
//         height: 100,
//         fontSize: 14,
//         margin: 5,
//     },
//     text: {
//         fontSize: {
//             small: 10,
//             medium: 12,
//             large: 14,
//         },
//         fontFamily: "'Courier New', monospace",
//     },
// };

// /**
//  * Generate a single barcode label as Canvas
//  * @param {Object} variant - Variant data
//  * @param {Object} product - Product data
//  * @param {Object} options - Optional config overrides
//  * @returns {Promise<HTMLCanvasElement>}
//  */
// export async function generateBarcodeLabel(variant, product, options = {}) {
//     return new Promise((resolve, reject) => {
//         try {
//             if (!variant?.system_barcode) {
//                 throw new Error(`No barcode for variant: ${variant?.variant_id}`);
//             }

//             // Create label canvas
//             const canvas = document.createElement("canvas");
//             const ctx = canvas.getContext("2d");
            
//             const config = { ...LABEL_CONFIG, ...options };
//             canvas.width = config.width;
//             canvas.height = config.height;

//             // White background
//             ctx.fillStyle = "#FFFFFF";
//             ctx.fillRect(0, 0, canvas.width, canvas.height);

//             // Draw border (optional, helps with cutting)
//             ctx.strokeStyle = "#CCCCCC";
//             ctx.lineWidth = 1;
//             ctx.strokeRect(5, 5, canvas.width - 10, canvas.height - 10);

//             // Create temporary canvas for barcode
//             const barcodeCanvas = document.createElement("canvas");
            
//             JsBarcode(barcodeCanvas, variant.system_barcode, {
//                 format: options.format || "CODE128",
//                 width: config.barcode.width,
//                 height: config.barcode.height,
//                 displayValue: true,
//                 fontSize: config.barcode.fontSize,
//                 margin: config.barcode.margin,
//                 lineColor: "#000000",
//                 background: "#FFFFFF",
//                 textMargin: 2,
//             });

//             // Calculate positions
//             const barcodeWidth = barcodeCanvas.width;
//             const barcodeHeight = barcodeCanvas.height;
//             const centerX = (canvas.width - barcodeWidth) / 2;
//             let currentY = config.margin;

//             // Draw barcode
//             ctx.drawImage(barcodeCanvas, centerX, currentY);
//             currentY += barcodeHeight + 15;

//             // Draw product info text
//             ctx.font = `${config.text.fontSize.medium}px ${config.text.fontFamily}`;
//             ctx.fillStyle = "#000000";
//             ctx.textAlign = "center";

//             // Product Name
//             const productName = product?.name || "Unknown Product";
//             ctx.font = `bold ${config.text.fontSize.large}px ${config.text.fontFamily}`;
//             ctx.fillText(productName, canvas.width / 2, currentY);
//             currentY += 25;

//             // Product Code
//             ctx.font = `${config.text.fontSize.small}px ${config.text.fontFamily}`;
//             ctx.fillStyle = "#666666";
//             ctx.fillText(`Code: ${variant.product_code || variant.sku || "—"}`, canvas.width / 2, currentY);
//             currentY += 20;

//             // Prices
//             ctx.fillStyle = "#000000";
//             ctx.font = `${config.text.fontSize.medium}px ${config.text.fontFamily}`;
            
//             if (variant.special_price) {
//                 ctx.fillStyle = "#E53E3E";
//                 ctx.fillText(`Special: ₹${Number(variant.special_price).toLocaleString()}`, canvas.width / 2, currentY);
//                 currentY += 20;
//             }
            
//             ctx.fillStyle = "#2F855A";
//             ctx.fillText(`Purchase: ₹${Number(variant.purchase_price || variant.cost_price || 0).toLocaleString()}`, canvas.width / 2, currentY);
            
//             // Draw separator line at bottom
//             ctx.strokeStyle = "#EEEEEE";
//             ctx.lineWidth = 1;
//             ctx.beginPath();
//             ctx.moveTo(config.margin, canvas.height - 25);
//             ctx.lineTo(canvas.width - config.margin, canvas.height - 25);
//             ctx.stroke();

//             resolve(canvas);
//         } catch (error) {
//             reject(error);
//         }
//     });
// }

// /**
//  * Generate multiple labels on a single canvas (for A4 sheet)
//  * @param {Array} variantsWithProducts - Array of {variant, product}
//  * @param {Object} options - Configuration
//  * @returns {Promise<HTMLCanvasElement>}
//  */
// export async function generateBatchLabels(variantsWithProducts, options = {}) {
//     return new Promise(async (resolve, reject) => {
//         try {
//             if (!variantsWithProducts?.length) {
//                 throw new Error("No variants provided");
//             }

//             // A4 dimensions at 300dpi: 2480 x 3508 pixels
//             // But we'll use standard 2x4 labels per page for thermal printer
//             const labelsPerRow = options.labelsPerRow || 2;
//             const labelsPerColumn = options.labelsPerColumn || 4;
//             const pageWidth = options.pageWidth || 1100;  // ~ 4 inches at 300dpi
//             const pageHeight = options.pageHeight || 1400; // ~ 5 inches at 300dpi
            
//             const labelWidth = Math.floor((pageWidth - 60) / labelsPerRow);
//             const labelHeight = Math.floor((pageHeight - 60) / labelsPerColumn);
            
//             // Create page canvas
//             const pageCanvas = document.createElement("canvas");
//             pageCanvas.width = pageWidth;
//             pageCanvas.height = pageHeight;
//             const ctx = pageCanvas.getContext("2d");
            
//             // White background
//             ctx.fillStyle = "#FFFFFF";
//             ctx.fillRect(0, 0, pageWidth, pageHeight);
            
//             // Generate each label and place on page
//             let index = 0;
//             for (const item of variantsWithProducts) {
//                 if (index >= labelsPerRow * labelsPerColumn) break;
                
//                 const row = Math.floor(index / labelsPerRow);
//                 const col = index % labelsPerRow;
                
//                 const x = 30 + (col * labelWidth);
//                 const y = 30 + (row * labelHeight);
                
//                 try {
//                     const labelCanvas = await generateBarcodeLabel(
//                         item.variant, 
//                         item.product, 
//                         { width: labelWidth - 10, height: labelHeight - 10 }
//                     );
//                     ctx.drawImage(labelCanvas, x, y, labelWidth - 10, labelHeight - 10);
//                 } catch (err) {
//                     console.error(`Failed to generate label for variant ${item.variant?.variant_id}:`, err);
//                     // Draw error placeholder
//                     ctx.fillStyle = "#FEE2E2";
//                     ctx.fillRect(x, y, labelWidth - 10, labelHeight - 10);
//                     ctx.fillStyle = "#DC2626";
//                     ctx.font = "12px monospace";
//                     ctx.fillText("Error generating label", x + 10, y + 50);
//                 }
                
//                 index++;
//             }
            
//             resolve(pageCanvas);
//         } catch (error) {
//             reject(error);
//         }
//     });
// }

// /**
//  * Download canvas as PNG
//  * @param {HTMLCanvasElement} canvas 
//  * @param {string} filename 
//  */
// export function downloadCanvasAsPNG(canvas, filename) {
//     return new Promise((resolve, reject) => {
//         try {
//             const link = document.createElement("a");
//             link.download = filename.endsWith(".png") ? filename : `${filename}.png`;
//             link.href = canvas.toDataURL("image/png");
//             link.click();
//             resolve();
//         } catch (error) {
//             reject(error);
//         }
//     });
// }

// /**
//  * Print canvas directly
//  * @param {HTMLCanvasElement} canvas 
//  */
// export function printCanvas(canvas) {
//     const printWindow = window.open("", "_blank");
//     if (!printWindow) {
//         throw new Error("Popup blocked. Please allow popups for this site.");
//     }
    
//     printWindow.document.write(`
//         <!DOCTYPE html>
//         <html>
//         <head>
//             <title>Print Barcode Labels</title>
//             <style>
//                 body { margin: 0; padding: 0; display: flex; justify-content: center; align-items: center; min-height: 100vh; background: white; }
//                 img { max-width: 100%; height: auto; }
//                 @media print {
//                     body { margin: 0; padding: 0; }
//                     img { max-width: 100%; page-break-after: avoid; }
//                 }
//             </style>
//         </head>
//         <body>
//             <img src="${canvas.toDataURL("image/png")}" />
//             <script>
//                 window.onload = () => {
//                     window.print();
//                     window.onafterprint = () => window.close();
//                 };
//             </script>
//         </body>
//         </html>
//     `);
//     printWindow.document.close();
// }