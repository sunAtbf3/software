/**
 * Production-grade Barcode Label Modal
 * Features:
 * - Preview labels before printing
 * - Multiple download options
 * - Loading states
 * - Error handling
 * - Responsive design
 */

import React, { useState, useEffect, useRef } from "react";
import { X, Download, Printer, Loader2, ChevronLeft, ChevronRight, Grid, LayoutGrid, FileDown } from "lucide-react";
import { generateBarcodeLabel, generateBatchLabels, downloadCanvasAsPNG, printCanvas } from "../../../../../utils/barcodeLabelGenerator";
import { toast } from "../../../../shared/ToastConfig";

const LABEL_TYPE_WITH_PRICE = "with_price";
const LABEL_TYPE_WITHOUT_PRICE = "without_price";

const BarcodeLabelModal = ({ isOpen, onClose, variantsWithProducts }) => {
    const [loading, setLoading] = useState(false);
    const [generating, setGenerating] = useState(false);
    const [previewCanvas, setPreviewCanvas] = useState(null);
    const [currentPage, setCurrentPage] = useState(0);
    const [totalPages, setTotalPages] = useState(1);
    const [labelsPerPage, setLabelsPerPage] = useState(8); // 1 = Solo View, 8 = Grid View
    const [batchCanvases, setBatchCanvases] = useState([]);
    const [labelType, setLabelType] = useState(LABEL_TYPE_WITH_PRICE);
    const previewGenRef = useRef(0);

    // Track unique raw generated image strings for the individual layout renderer
    const [individualImages, setIndividualImages] = useState([]);

    const showPrices = labelType !== LABEL_TYPE_WITHOUT_PRICE;

    useEffect(() => {
        if (!isOpen) {
            setLabelType(LABEL_TYPE_WITH_PRICE);
        }
    }, [isOpen]);

    // Generate preview when modal opens or when layout / label type changes
    useEffect(() => {
        if (isOpen && variantsWithProducts?.length > 0) {
            generatePreview();
        }
        return () => {
            if (previewCanvas) previewCanvas.remove();
            batchCanvases.forEach(canvas => canvas?.remove());
        };
    }, [isOpen, variantsWithProducts, labelsPerPage, labelType]);

    const generatePreview = async () => {
        const genId = ++previewGenRef.current;
        setLoading(true);
        try {
            const drawOptions = { showPrices };
            // Generate individual high-res image buffers for every single variant asset up front
            const individualBuffers = await Promise.all(
                variantsWithProducts.map(async (item) => {
                    const canvas = await generateBarcodeLabel(item.variant, item.product, drawOptions);
                    const dataUrl = canvas.toDataURL();
                    canvas.remove();
                    return { ...item, dataUrl };
                })
            );
            if (genId !== previewGenRef.current) return;
            setIndividualImages(individualBuffers);

            if (variantsWithProducts.length === 1) {
                const canvas = await generateBarcodeLabel(
                    variantsWithProducts[0].variant,
                    variantsWithProducts[0].product,
                    drawOptions
                );
                if (genId !== previewGenRef.current) return;
                setPreviewCanvas(canvas);
                setBatchCanvases([]);
                setTotalPages(1);
            } else {
                const itemsPerPage = labelsPerPage;
                const pages = Math.ceil(variantsWithProducts.length / itemsPerPage);
                const canvases = [];

                // Keep print/export architecture aligned to the grid specs
                const layoutOptions = labelsPerPage === 1
                    ? { labelsPerRow: 1, labelsPerColumn: 1, showPrices }
                    : { labelsPerRow: 2, labelsPerColumn: 4, showPrices };

                for (let i = 0; i < pages; i++) {
                    const pageItems = variantsWithProducts.slice(
                        i * itemsPerPage,
                        (i + 1) * itemsPerPage
                    );
                    const pageCanvas = await generateBatchLabels(pageItems, layoutOptions);
                    canvases.push(pageCanvas);
                }

                if (genId !== previewGenRef.current) return;
                setBatchCanvases(canvases);
                setPreviewCanvas(null);
                setTotalPages(pages);
                setCurrentPage(prev => Math.min(prev, pages - 1));
            }
        } catch (error) {
            if (genId !== previewGenRef.current) return;
            console.error("Preview generation failed:", error);
            toast.error(`Failed to generate preview: ${error.message}`);
        } finally {
            if (genId === previewGenRef.current) setLoading(false);
        }
    };

    // ── Solo View: download only the currently visible label ────────────
    const handleDownloadCurrentLabel = async () => {
        setGenerating(true);
        try {
            const currentItem = individualImages[currentPage];
            if (!currentItem) return;

            // Re-generate a fresh canvas for this single variant to download
            const canvas = await generateBarcodeLabel(currentItem.variant, currentItem.product, { showPrices });
            const productName = currentItem.product?.name || "barcode";
            const variantCode = currentItem.variant?.product_code || currentItem.variant?.sku || currentPage + 1;
            await downloadCanvasAsPNG(
                canvas,
                `barcode-${productName.toLowerCase().replace(/\s+/g, "-")}-${variantCode}`
            );
            canvas.remove();
            toast.success("Label downloaded");
        } catch (error) {
            console.error("Download failed:", error);
            toast.error(`Download failed: ${error.message}`);
        } finally {
            setGenerating(false);
        }
    };

    // ── Single-variant download (unchanged path) ────────────────────────
    const handleDownload = async () => {
        setGenerating(true);
        try {
            if (variantsWithProducts.length === 1 && previewCanvas) {
                const productName = variantsWithProducts[0].product?.name || "barcode";
                await downloadCanvasAsPNG(
                    previewCanvas,
                    `barcode-${productName.toLowerCase().replace(/\s+/g, "-")}`
                );
                toast.success("Barcode label downloaded");
            } else if (batchCanvases.length > 0) {
                if (batchCanvases.length === 1) {
                    await downloadCanvasAsPNG(batchCanvases[0], "barcode-labels");
                    toast.success("Barcode labels downloaded");
                } else {
                    await downloadCanvasAsPNG(batchCanvases[currentPage], `barcode-labels-page-${currentPage + 1}`);
                    toast.success(`Page ${currentPage + 1} downloaded`);
                }
            }
        } catch (error) {
            console.error("Download failed:", error);
            toast.error(`Download failed: ${error.message}`);
        } finally {
            setGenerating(false);
        }
    };

    // ── Grid View: download ALL labels one by one ───────────────────────
    const handleDownloadAll = async () => {
        if (batchCanvases.length <= 1) {
            handleDownload();
            return;
        }
        setGenerating(true);
        toast.info("Preparing all pages for download...");
        try {
            for (let i = 0; i < batchCanvases.length; i++) {
                await downloadCanvasAsPNG(batchCanvases[i], `barcode-labels-page-${i + 1}`);
                await new Promise(resolve => setTimeout(resolve, 500));
            }
            toast.success(`${batchCanvases.length} pages downloaded`);
        } catch (error) {
            console.error("Batch download failed:", error);
            toast.error(`Download failed: ${error.message}`);
        } finally {
            setGenerating(false);
        }
    };

    // ── Generate Print-Optimized Canvases (Always 1 Row per Page) ─────────
    const getPrintOptimizedCanvases = async (items) => {
        // Enforce 2-up thermal standard: exactly 2 labels per row (page)
        const layoutOptions = { labelsPerRow: 2, labelsPerColumn: 1, showPrices };
        const pages = Math.ceil(items.length / 2);
        const canvases = [];
        
        for (let i = 0; i < pages; i++) {
            const pageItems = items.slice(i * 2, (i + 1) * 2);
            // If the row has only 1 item, duplicate it to fill the 2-Up row and avoid waste
            if (pageItems.length === 1) {
                pageItems.push(pageItems[0]);
            }
            const pageCanvas = await generateBatchLabels(pageItems, layoutOptions);
            canvases.push(pageCanvas);
        }
        return canvases;
    };

    const handlePrint = async () => {
        setGenerating(true);
        try {
            let itemsToPrint = [];
            if (isSoloView) {
                // Print only current single label, but properly positioned on a 2-up strip
                const currentItem = individualImages[currentPage];
                if (currentItem) itemsToPrint = [currentItem];
            } else {
                // Grid view: print only the items visible on current page
                itemsToPrint = pagedIndividualItems;
            }
            
            if (itemsToPrint.length > 0) {
                const printCanvases = await getPrintOptimizedCanvases(itemsToPrint);
                printCanvas(printCanvases);
                toast.success("Print job sent");
            }
        } catch (error) {
            console.error("Print failed:", error);
            toast.error(`Print failed: ${error.message}`);
        } finally {
            setGenerating(false);
        }
    };

    const handlePrintAll = async () => {
        setGenerating(true);
        try {
            if (individualImages.length > 0) {
                const printCanvases = await getPrintOptimizedCanvases(individualImages);
                printCanvas(printCanvases);
                toast.success(`Printing ${individualImages.length} labels`);
            }
        } catch (error) {
            console.error("Print all failed:", error);
            toast.error(`Print failed: ${error.message}`);
        } finally {
            setGenerating(false);
        }
    };

    if (!isOpen) return null;

    const isMultiPage = totalPages > 1;
    const isSoloView = labelsPerPage === 1;
    const totalVariants = variantsWithProducts.length;

    // Solo view: each "page" is exactly 1 label — currentPage is the label index
    // Grid view: each "page" is up to 8 labels
    const pagedIndividualItems = individualImages.slice(
        currentPage * labelsPerPage,
        (currentPage + 1) * labelsPerPage
    );

    return (
        <div className="fixed inset-0 z-50 overflow-y-auto">
            {/* Backdrop */}
            <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity" onClick={onClose} />

            {/* Modal Container */}
            <div className="relative min-h-screen flex items-center justify-center p-4 sm:p-6">
                <div className="relative bg-white rounded-xl shadow-2xl border border-gray-100 max-w-5xl w-full max-h-[85vh] overflow-hidden flex flex-col">

                    {/* Header */}
                    <div className="flex items-center justify-between px-6 py-4 border-b border-gray-150 gap-3">
                        <div className="min-w-0">
                            <h3 className="text-base font-bold text-gray-900 tracking-tight">
                                Barcode Asset Preview
                            </h3>
                            <p className="text-xs text-gray-500 font-medium mt-0.5">
                                {totalVariants} unique operational variant{totalVariants !== 1 ? "s" : ""} initialized
                            </p>
                        </div>
                        <div className="flex items-center gap-3 shrink-0">
                            <label className="flex items-center gap-2">
                                <span className="text-xs font-semibold text-gray-500 whitespace-nowrap">Label type</span>
                                <select
                                    value={labelType}
                                    onChange={(e) => setLabelType(e.target.value)}
                                    disabled={loading || generating}
                                    className="text-xs font-semibold border border-gray-200 rounded-lg px-2.5 py-1.5 bg-white text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-200 disabled:opacity-50"
                                >
                                    <option value={LABEL_TYPE_WITH_PRICE}>Label with price</option>
                                    <option value={LABEL_TYPE_WITHOUT_PRICE}>Label without price</option>
                                </select>
                            </label>
                            <button
                                onClick={onClose}
                                className="p-1.5 hover:bg-gray-100 border border-transparent hover:border-gray-200 rounded-lg transition-all text-gray-400 hover:text-gray-600"
                            >
                                <X size={18} />
                            </button>
                        </div>
                    </div>

                    {/* Asset Control Sub-header */}
                    {totalVariants > 1 && (
                        <div className="flex flex-row items-center justify-between px-6 py-2.5 border-b border-gray-100 bg-gray-50/70">

                            {/* View Switches (Solo vs Grid) */}
                            <div className="flex items-center bg-gray-200/60 p-0.5 rounded-lg border border-gray-200">
                                <button
                                    onClick={() => {
                                        setCurrentPage(0);
                                        setLabelsPerPage(1);
                                    }}
                                    className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${
                                        isSoloView
                                            ? "bg-white text-gray-900 shadow-sm"
                                            : "text-gray-600 hover:text-gray-900"
                                    }`}
                                >
                                    <LayoutGrid size={14} />
                                    <span>Solo View</span>
                                </button>
                                <button
                                    onClick={() => {
                                        setCurrentPage(0);
                                        setLabelsPerPage(8);
                                    }}
                                    className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${
                                        !isSoloView
                                            ? "bg-white text-gray-900 shadow-sm"
                                            : "text-gray-600 hover:text-gray-900"
                                    }`}
                                >
                                    <Grid size={14} />
                                    <span>Grid View</span>
                                </button>
                            </div>

                            {/* Solo View: label navigator ◀ N / total ▶ */}
                            {isSoloView && (
                                <div className="flex items-center bg-white border border-gray-200 rounded-lg px-1 py-0.5">
                                    <button
                                        onClick={() => setCurrentPage(prev => Math.max(0, prev - 1))}
                                        disabled={currentPage === 0}
                                        className="p-1 rounded-md text-gray-500 hover:bg-gray-50 hover:text-gray-800 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                                    >
                                        <ChevronLeft size={16} />
                                    </button>
                                    <span className="text-xs font-mono font-bold text-gray-700 min-w-[70px] text-center">
                                        {currentPage + 1} / {totalVariants}
                                    </span>
                                    <button
                                        onClick={() => setCurrentPage(prev => Math.min(totalVariants - 1, prev + 1))}
                                        disabled={currentPage === totalVariants - 1}
                                        className="p-1 rounded-md text-gray-500 hover:bg-gray-50 hover:text-gray-800 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                                    >
                                        <ChevronRight size={16} />
                                    </button>
                                </div>
                            )}

                            {/* Grid View: page navigator (only if more than 8 labels) */}
                            {!isSoloView && isMultiPage && (
                                <div className="flex items-center bg-white border border-gray-200 rounded-lg px-1 py-0.5">
                                    <button
                                        onClick={() => setCurrentPage(prev => Math.max(0, prev - 1))}
                                        disabled={currentPage === 0}
                                        className="p-1 rounded-md text-gray-500 hover:bg-gray-50 hover:text-gray-800 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                                    >
                                        <ChevronLeft size={16} />
                                    </button>
                                    <span className="text-xs font-mono font-bold text-gray-700 min-w-[70px] text-center">
                                        {currentPage + 1} / {totalPages}
                                    </span>
                                    <button
                                        onClick={() => setCurrentPage(prev => Math.min(totalPages - 1, prev + 1))}
                                        disabled={currentPage === totalPages - 1}
                                        className="p-1 rounded-md text-gray-500 hover:bg-gray-50 hover:text-gray-800 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                                    >
                                        <ChevronRight size={16} />
                                    </button>
                                </div>
                            )}

                            {/* Actions Group */}
                            <div className="flex items-center gap-2">
                                {isSoloView ? (
                                    // Solo View: download only the current label
                                    <button
                                        onClick={handleDownloadCurrentLabel}
                                        disabled={loading || generating}
                                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200/40 rounded-lg transition-colors disabled:opacity-50"
                                    >
                                        {generating ? <Loader2 size={13} className="animate-spin" /> : <Download size={13} />}
                                        Download This Label
                                    </button>
                                ) : (
                                    // Grid View: download all labels
                                    <button
                                        onClick={handleDownloadAll}
                                        disabled={loading || generating}
                                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200/40 rounded-lg transition-colors disabled:opacity-50"
                                    >
                                        {generating ? <Loader2 size={13} className="animate-spin" /> : <Download size={13} />}
                                        Download All
                                    </button>
                                )}
                                <button
                                    onClick={isSoloView ? handlePrint : handlePrintAll}
                                    disabled={loading || generating}
                                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-gray-700 bg-white hover:bg-gray-50 border border-gray-250 rounded-lg transition-colors disabled:opacity-50 shadow-sm"
                                >
                                    <Printer size={13} />
                                    <span>Print Queue</span>
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Viewport Workspace — always centered */}
                    <div className="flex-1 overflow-auto p-8 bg-slate-50/50 flex items-center justify-center min-h-[420px] border-b border-gray-100">
                        {loading ? (
                            <div className="text-center bg-white py-8 px-12 border border-gray-200 shadow-sm rounded-xl">
                                <Loader2 size={32} className="animate-spin text-blue-600 mx-auto mb-2.5" />
                                <p className="text-xs font-bold text-gray-700 uppercase tracking-wider">Syncing Layout Matrix...</p>
                            </div>
                        ) : pagedIndividualItems.length > 0 ? (
                            totalVariants === 1 ? (
                                /* Single variant — always centered */
                                <div className="flex items-center justify-center w-full">
                                    <div className="bg-white shadow-xl border border-gray-200 p-4 rounded-xl max-w-sm w-full">
                                        <img src={pagedIndividualItems[0].dataUrl} alt="Barcode Preview" className="w-full h-auto" />
                                    </div>
                                </div>
                            ) : isSoloView ? (
                                /* Solo View — one label centered, name + sku below */
                                <div className="flex items-center justify-center w-full">
                                    <div className="bg-white shadow-xl border border-gray-200 p-6 rounded-xl w-full max-w-sm text-center">
                                        <img
                                            src={pagedIndividualItems[0].dataUrl}
                                            alt="Barcode Focus View"
                                            className="w-full h-auto mx-auto object-contain"
                                            style={{ maxHeight: "360px" }}
                                        />
                                        <div className="mt-4 pt-3 border-t border-gray-100">
                                            <p className="text-sm font-bold text-gray-800">
                                                {pagedIndividualItems[0].product?.name}
                                            </p>
                                            <p className="text-xs font-mono text-gray-400 mt-0.5">
                                                {pagedIndividualItems[0].variant?.product_code || pagedIndividualItems[0].variant?.sku || "—"}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                /* Grid View — responsive grid, centered in viewport */
                                <div className="flex items-center justify-center w-full">
                                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 w-full max-w-4xl">
                                        {pagedIndividualItems.map((item, index) => (
                                            <div key={index} className="bg-white border border-gray-200 p-3 rounded-lg shadow-sm flex flex-col justify-between">
                                                <img src={item.dataUrl} alt="Grid Cell Item" className="w-full h-auto object-contain bg-white" />
                                                <div className="mt-2 text-center border-t border-gray-50 pt-1.5">
                                                    <p className="text-[11px] font-bold text-gray-700 truncate">{item.product?.name}</p>
                                                    <p className="text-[10px] font-mono text-gray-400 truncate">
                                                        {item.variant?.product_code || item.variant?.sku || "—"}
                                                    </p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )
                        ) : (
                            <div className="text-center text-gray-400 py-12">
                                <FileDown size={40} className="mx-auto mb-2 text-gray-300" />
                                <p className="text-xs font-medium text-gray-500">Asset buffer unavailable</p>
                            </div>
                        )}
                    </div>

                    {/* System Footer Bar */}
                    <div className="flex items-center justify-between px-6 py-3.5 bg-gray-50">
                        <div className="flex items-center gap-2 text-xs font-medium text-gray-500">
                            <span className="w-2 h-2 rounded-full bg-emerald-500" />
                            <span>System Dimension: Standard 50×25mm Thermal Matrix</span>
                        </div>
                        <div className="flex items-center gap-2">
                            {totalVariants === 1 && (
                                <>
                                    <button
                                        onClick={handleDownload}
                                        disabled={loading || generating}
                                        className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold text-blue-700 bg-blue-50 border border-blue-200/50 hover:bg-blue-100 rounded-lg transition-colors"
                                    >
                                        <Download size={14} />
                                        <span>Download Export</span>
                                    </button>
                                    <button
                                        onClick={handlePrint}
                                        disabled={loading || generating}
                                        className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 rounded-lg transition-colors shadow-sm"
                                    >
                                        <Printer size={14} />
                                        <span>Print Output</span>
                                    </button>
                                </>
                            )}
                            <button
                                onClick={onClose}
                                className="px-3.5 py-1.5 text-xs font-bold text-gray-600 hover:text-gray-900 rounded-lg hover:bg-gray-100 transition-colors"
                            >
                                Dismiss
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default BarcodeLabelModal;

// /**
//  * Production-grade Barcode Label Modal
//  * Features:
//  * - Preview labels before printing
//  * - Multiple download options
//  * - Loading states
//  * - Error handling
//  * - Responsive design
//  */

// import React, { useState, useEffect } from "react";
// import { X, Download, Printer, Loader2, ChevronLeft, ChevronRight, Grid, LayoutGrid, FileDown } from "lucide-react";
// import { generateBarcodeLabel, generateBatchLabels, downloadCanvasAsPNG, printCanvas } from "../../../../../utils/barcodeLabelGenerator";
// import { toast } from "react-toastify";

// const BarcodeLabelModal = ({ isOpen, onClose, variantsWithProducts }) => {
//     const [loading, setLoading] = useState(false);
//     const [generating, setGenerating] = useState(false);
//     const [previewCanvas, setPreviewCanvas] = useState(null);
//     const [currentPage, setCurrentPage] = useState(0);
//     const [totalPages, setTotalPages] = useState(1);
//     const [labelsPerPage, setLabelsPerPage] = useState(8); // 1 = Solo View, 8 = Grid View
//     const [batchCanvases, setBatchCanvases] = useState([]);
    
//     // Track unique raw generated image strings for the individual layout renderer
//     const [individualImages, setIndividualImages] = useState([]);

//     // Generate preview when modal opens or when layout view preference changes
//     useEffect(() => {
//         if (isOpen && variantsWithProducts?.length > 0) {
//             generatePreview();
//         }
//         return () => {
//             if (previewCanvas) previewCanvas.remove();
//             batchCanvases.forEach(canvas => canvas?.remove());
//         };
//     }, [isOpen, variantsWithProducts, labelsPerPage]);

//     const generatePreview = async () => {
//         setLoading(true);
//         try {
//             // Generate individual high-res image buffers for every single variant asset up front
//             const individualBuffers = await Promise.all(
//                 variantsWithProducts.map(async (item) => {
//                     const canvas = await generateBarcodeLabel(item.variant, item.product);
//                     const dataUrl = canvas.toDataURL();
//                     canvas.remove();
//                     return { ...item, dataUrl };
//                 })
//             );
//             setIndividualImages(individualBuffers);

//             if (variantsWithProducts.length === 1) {
//                 const canvas = await generateBarcodeLabel(
//                     variantsWithProducts[0].variant,
//                     variantsWithProducts[0].product
//                 );
//                 setPreviewCanvas(canvas);
//                 setBatchCanvases([]);
//                 setTotalPages(1);
//             } else {
//                 const itemsPerPage = labelsPerPage;
//                 const pages = Math.ceil(variantsWithProducts.length / itemsPerPage);
//                 const canvases = [];
                
//                 // Keep print/export architecture aligned to the grid specs
//                 const layoutOptions = labelsPerPage === 1 
//                     ? { labelsPerRow: 1, labelsPerColumn: 1 }
//                     : { labelsPerRow: 2, labelsPerColumn: 4 };
                
//                 for (let i = 0; i < pages; i++) {
//                     const pageItems = variantsWithProducts.slice(
//                         i * itemsPerPage,
//                         (i + 1) * itemsPerPage
//                     );
//                     const pageCanvas = await generateBatchLabels(pageItems, layoutOptions);
//                     canvases.push(pageCanvas);
//                 }
                
//                 setBatchCanvases(canvases);
//                 setPreviewCanvas(null);
//                 setTotalPages(pages);
//                 setCurrentPage(prev => Math.min(prev, pages - 1));
//             }
//         } catch (error) {
//             console.error("Preview generation failed:", error);
//             toast.error(`Failed to generate preview: ${error.message}`);
//         } finally {
//             setLoading(false);
//         }
//     };

//     const handleDownload = async () => {
//         setGenerating(true);
//         try {
//             if (variantsWithProducts.length === 1 && previewCanvas) {
//                 const productName = variantsWithProducts[0].product?.name || "barcode";
//                 await downloadCanvasAsPNG(
//                     previewCanvas,
//                     `barcode-${productName.toLowerCase().replace(/\s+/g, "-")}`
//                 );
//                 toast.success("Barcode label downloaded");
//             } else if (batchCanvases.length > 0) {
//                 if (batchCanvases.length === 1) {
//                     await downloadCanvasAsPNG(batchCanvases[0], "barcode-labels");
//                     toast.success("Barcode labels downloaded");
//                 } else {
//                     await downloadCanvasAsPNG(batchCanvases[currentPage], `barcode-labels-page-${currentPage + 1}`);
//                     toast.success(`Page ${currentPage + 1} downloaded`);
//                 }
//             }
//         } catch (error) {
//             console.error("Download failed:", error);
//             toast.error(`Download failed: ${error.message}`);
//         } finally {
//             setGenerating(false);
//         }
//     };

//     const handleDownloadAll = async () => {
//         if (batchCanvases.length <= 1) {
//             handleDownload();
//             return;
//         }
//         setGenerating(true);
//         toast.info("Preparing all pages for download...");
//         try {
//             for (let i = 0; i < batchCanvases.length; i++) {
//                 await downloadCanvasAsPNG(batchCanvases[i], `barcode-labels-page-${i + 1}`);
//                 await new Promise(resolve => setTimeout(resolve, 500));
//             }
//             toast.success(`${batchCanvases.length} pages downloaded`);
//         } catch (error) {
//             console.error("Batch download failed:", error);
//             toast.error(`Download failed: ${error.message}`);
//         } finally {
//             setGenerating(false);
//         }
//     };

//     const handlePrint = async () => {
//         setGenerating(true);
//         try {
//             if (variantsWithProducts.length === 1 && previewCanvas) {
//                 printCanvas(previewCanvas);
//             } else if (batchCanvases.length > 0) {
//                 printCanvas(batchCanvases[currentPage]);
//             }
//             toast.success("Print job sent");
//         } catch (error) {
//             console.error("Print failed:", error);
//             toast.error(`Print failed: ${error.message}`);
//         } finally {
//             setGenerating(false);
//         }
//     };

//     const handlePrintAll = async () => {
//         if (batchCanvases.length <= 1) {
//             handlePrint();
//             return;
//         }
//         setGenerating(true);
//         try {
//             const totalHeight = batchCanvases.reduce((sum, canvas) => sum + canvas.height, 0);
//             const maxWidth = Math.max(...batchCanvases.map(c => c.width));
            
//             const combinedCanvas = document.createElement("canvas");
//             combinedCanvas.width = maxWidth;
//             combinedCanvas.height = totalHeight;
//             const ctx = combinedCanvas.getContext("2d");
            
//             ctx.fillStyle = "#FFFFFF";
//             ctx.fillRect(0, 0, maxWidth, totalHeight);
            
//             let yOffset = 0;
//             for (const canvas of batchCanvases) {
//                 ctx.drawImage(canvas, 0, yOffset);
//                 yOffset += canvas.height;
//             }
            
//             printCanvas(combinedCanvas);
//             toast.success(`Printing ${batchCanvases.length} pages`);
//         } catch (error) {
//             console.error("Print all failed:", error);
//             toast.error(`Print failed: ${error.message}`);
//         } finally {
//             setGenerating(false);
//         }
//     };

//     if (!isOpen) return null;

//     const isMultiPage = totalPages > 1;
    
//     // Slice items mapped strictly to the current active pagination set
//     const pagedIndividualItems = individualImages.slice(
//         currentPage * labelsPerPage,
//         (currentPage + 1) * labelsPerPage
//     );

//     return (
//         <div className="fixed inset-0 z-50 overflow-y-auto">
//             {/* Backdrop */}
//             <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity" onClick={onClose} />
            
//             {/* Modal Container */}
//             <div className="relative min-h-screen flex items-center justify-center p-4 sm:p-6">
//                 <div className="relative bg-white rounded-xl shadow-2xl border border-gray-100 max-w-5xl w-full max-h-[85vh] overflow-hidden flex flex-col">
                    
//                     {/* Header */}
//                     <div className="flex items-center justify-between px-6 py-4 border-b border-gray-150">
//                         <div>
//                             <h3 className="text-base font-bold text-gray-900 tracking-tight">
//                                 Barcode Asset Preview
//                             </h3>
//                             <p className="text-xs text-gray-500 font-medium mt-0.5">
//                                 {variantsWithProducts.length} unique operational variant{variantsWithProducts.length !== 1 ? "s" : ""} initialized
//                             </p>
//                         </div>
//                         <button
//                             onClick={onClose}
//                             className="p-1.5 hover:bg-gray-100 border border-transparent hover:border-gray-200 rounded-lg transition-all text-gray-400 hover:text-gray-600"
//                         >
//                             <X size={18} />
//                         </button>
//                     </div>
                    
//                     {/* Asset Control Sub-header (Google Drive Layout Strip) */}
//                     {variantsWithProducts.length > 1 && (
//                         <div className="flex flex-row items-center justify-between px-6 py-2.5 border-b border-gray-100 bg-gray-50/70">
//                             {/* View Switches (Solo vs Grid Views) */}
//                             <div className="flex items-center bg-gray-200/60 p-0.5 rounded-lg border border-gray-200">
//                                 <button
//                                     onClick={() => {
//                                         setCurrentPage(0);
//                                         setLabelsPerPage(1); // One large item centered
//                                     }}
//                                     className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${
//                                         labelsPerPage === 1 
//                                             ? "bg-white text-gray-900 shadow-sm" 
//                                             : "text-gray-600 hover:text-gray-900"
//                                     }`}
//                                 >
//                                     <LayoutGrid size={14} />
//                                     <span>Solo View</span>
//                                 </button>
//                                 <button
//                                     onClick={() => {
//                                         setCurrentPage(0);
//                                         setLabelsPerPage(8); // Multi-card grid display style
//                                     }}
//                                     className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${
//                                         labelsPerPage === 8 
//                                             ? "bg-white text-gray-900 shadow-sm" 
//                                             : "text-gray-600 hover:text-gray-900"
//                                     }`}
//                                 >
//                                     <Grid size={14} />
//                                     <span>Grid View</span>
//                                 </button>
//                             </div>
                            
//                             {/* Sheet Pagination */}
//                             <div className="flex items-center gap-3">
//                                 {isMultiPage && (
//                                     <div className="flex items-center bg-white border border-gray-200 rounded-lg px-1 py-0.5">
//                                         <button
//                                             onClick={() => setCurrentPage(prev => Math.max(0, prev - 1))}
//                                             disabled={currentPage === 0}
//                                             className="p-1 rounded-md text-gray-500 hover:bg-gray-50 hover:text-gray-800 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
//                                         >
//                                             <ChevronLeft size={16} />
//                                         </button>
//                                         <span className="text-xs font-mono font-bold text-gray-700 min-w-[70px] text-center">
//                                             {currentPage + 1} / {totalPages}
//                                         </span>
//                                         <button
//                                             onClick={() => setCurrentPage(prev => Math.min(totalPages - 1, prev + 1))}
//                                             disabled={currentPage === totalPages - 1}
//                                             className="p-1 rounded-md text-gray-500 hover:bg-gray-50 hover:text-gray-800 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
//                                         >
//                                             <ChevronRight size={16} />
//                                         </button>
//                                     </div>
//                                 )}
//                             </div>
                            
//                             {/* Actions Group */}
//                             <div className="flex items-center gap-2">
//                                 <button
//                                     onClick={isMultiPage && batchCanvases.length > 1 ? handleDownloadAll : handleDownload}
//                                     disabled={loading || generating}
//                                     className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200/40 rounded-lg transition-colors disabled:opacity-50"
//                                 >
//                                     {generating ? <Loader2 size={13} className="animate-spin" /> : <Download size={13} />}
//                                     {isMultiPage && batchCanvases.length > 1 ? "Download Bundle" : "Download Asset"}
//                                 </button>
//                                 <button
//                                     onClick={isMultiPage && batchCanvases.length > 1 ? handlePrintAll : handlePrint}
//                                     disabled={loading || generating}
//                                     className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-gray-700 bg-white hover:bg-gray-50 border border-gray-250 rounded-lg transition-colors disabled:opacity-50 shadow-sm"
//                                 >
//                                     <Printer size={13} />
//                                     <span>Print Queue</span>
//                                 </button>
//                             </div>
//                         </div>
//                     )}
                    
//                     {/* Viewport Workspace */}
//                     <div className="flex-1 overflow-auto p-8 bg-slate-50/50 flex items-center justify-center min-h-[420px] border-b border-gray-100">
//                         {loading ? (
//                             <div className="text-center bg-white py-8 px-12 border border-gray-200 shadow-sm rounded-xl">
//                                 <Loader2 size={32} className="animate-spin text-blue-600 mx-auto mb-2.5" />
//                                 <p className="text-xs font-bold text-gray-700 uppercase tracking-wider">Syncing Layout Matrix...</p>
//                             </div>
//                         ) : pagedIndividualItems.length > 0 ? (
//                             variantsWithProducts.length === 1 ? (
//                                 /* Standard Fallback for Single Asset Output */
//                                 <div className="bg-white shadow-xl border border-gray-200 p-4 rounded-xl max-w-sm">
//                                     <img src={pagedIndividualItems[0].dataUrl} alt="Barcode Preview" className="w-full h-auto" />
//                                 </div>
//                             ) : labelsPerPage === 1 ? (
//                                 /* Solo View: Displays exactly 1 item frame front-and-center */
//                                 <div className="bg-white shadow-xl border border-gray-200 p-6 rounded-xl max-w-md w-full text-center">
//                                     <img src={pagedIndividualItems[0].dataUrl} alt="Barcode Focus View" className="w-full h-auto mx-auto object-contain" style={{ maxHeight: "360px" }} />
//                                     <div className="mt-4 pt-3 border-t border-gray-100">
//                                         <p className="text-sm font-bold text-gray-800">{pagedIndividualItems[0].product?.name}</p>
//                                         <p className="text-xs font-mono text-gray-400 mt-0.5">SKU: {pagedIndividualItems[0].variant?.sku || "—"}</p>
//                                     </div>
//                                 </div>
//                             ) : (
//                                 /* Grid View: Displays asset targets mapped side-by-side inside a responsive layout row */
//                                 <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 w-full max-w-4xl">
//                                     {pagedIndividualItems.map((item, index) => (
//                                         <div key={index} className="bg-white border border-gray-200 p-3 rounded-lg shadow-sm flex flex-col justify-between">
//                                             <img src={item.dataUrl} alt="Grid Cell Item" className="w-full h-auto object-contain bg-white" />
//                                             <div className="mt-2 text-center border-t border-gray-50 pt-1.5">
//                                                 <p className="text-[11px] font-bold text-gray-700 truncate">{item.product?.name}</p>
//                                                 <p className="text-[10px] font-mono text-gray-400 truncate">{item.variant?.sku || "—"}</p>
//                                             </div>
//                                         </div>
//                                     ))}
//                                 </div>
//                             )
//                         ) : (
//                             <div className="text-center text-gray-400 py-12">
//                                 <FileDown size={40} className="mx-auto mb-2 text-gray-300" />
//                                 <p className="text-xs font-medium text-gray-500">Asset buffer unavailable</p>
//                             </div>
//                         )}
//                     </div>
                    
//                     {/* System Footer Bar */}
//                     <div className="flex items-center justify-between px-6 py-3.5 bg-gray-50">
//                         <div className="flex items-center gap-2 text-xs font-medium text-gray-500">
//                             <span className="w-2 h-2 rounded-full bg-emerald-500" />
//                             <span>System Dimension: Standard 50×25mm Thermal Matrix</span>
//                         </div>
//                         <div className="flex items-center gap-2">
//                             {variantsWithProducts.length === 1 && (
//                                 <>
//                                     <button
//                                         onClick={handleDownload}
//                                         disabled={loading || generating}
//                                         className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold text-blue-700 bg-blue-50 border border-blue-200/50 hover:bg-blue-100 rounded-lg transition-colors"
//                                     >
//                                         <Download size={14} />
//                                         <span>Download Export</span>
//                                     </button>
//                                     <button
//                                         onClick={handlePrint}
//                                         disabled={loading || generating}
//                                         className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 rounded-lg transition-colors shadow-sm"
//                                     >
//                                         <Printer size={14} />
//                                         <span>Print Output</span>
//                                     </button>
//                                 </>
//                             )}
//                             <button
//                                 onClick={onClose}
//                                 className="px-3.5 py-1.5 text-xs font-bold text-gray-600 hover:text-gray-900 rounded-lg hover:bg-gray-100 transition-colors"
//                             >
//                                 Dismiss
//                             </button>
//                         </div>
//                     </div>
//                 </div>
//             </div>
//         </div>
//     );
// };

// export default BarcodeLabelModal;