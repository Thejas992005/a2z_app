import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  ArrowLeft, 
  Upload, 
  Download, 
  Trash2, 
  Plus, 
  Type, 
  PenTool, 
  Square, 
  Circle, 
  MousePointer, 
  EyeOff, 
  Smile, 
  Undo2, 
  Redo2, 
  ZoomIn, 
  ZoomOut, 
  Sparkles,
  Lock,
  Unlock,
  Loader2
} from 'lucide-react';
import { fabric } from 'fabric';
import { createWorker } from 'tesseract.js';
import { saveAs } from 'file-saver';
import { getPDFPageCount, renderPageToCanvas, fileToArrayBuffer } from '../utils/pdfEngine';
import { saveEditedPDF } from '../utils/pdfEditorEngine';
import AdPlaceholder from './AdPlaceholder';

// Signature drawing pad helper component
const SignaturePad = ({ onSave, onCancel }) => {
  const canvasRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const contextRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    canvas.width = 460;
    canvas.height = 180;
    
    const context = canvas.getContext('2d');
    context.lineCap = 'round';
    context.strokeStyle = '#f3f4f6';
    context.lineWidth = 3;
    contextRef.current = context;
  }, []);

  const startDrawing = ({ nativeEvent }) => {
    const { offsetX, offsetY } = nativeEvent;
    contextRef.current.beginPath();
    contextRef.current.moveTo(offsetX, offsetY);
    setIsDrawing(true);
  };

  const draw = ({ nativeEvent }) => {
    if (!isDrawing) return;
    const { offsetX, offsetY } = nativeEvent;
    contextRef.current.lineTo(offsetX, offsetY);
    contextRef.current.stroke();
  };

  const stopDrawing = () => {
    contextRef.current.closePath();
    setIsDrawing(false);
  };

  const clear = () => {
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');
    context.clearRect(0, 0, canvas.width, canvas.height);
  };

  const save = () => {
    const canvas = canvasRef.current;
    // Check if empty by inspecting pixel data
    const context = canvas.getContext('2d');
    const buffer = new Uint32Array(
      context.getImageData(0, 0, canvas.width, canvas.height).data.buffer
    );
    const isEmpty = !buffer.some(color => color !== 0);
    
    if (isEmpty) return;
    onSave(canvas.toDataURL());
  };

  return (
    <div style={{ background: '#111827', border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '12px', padding: '1rem' }}>
      <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>Draw your signature below:</p>
      <canvas 
        ref={canvasRef}
        onMouseDown={startDrawing}
        onMouseMove={draw}
        onMouseUp={stopDrawing}
        onMouseLeave={stopDrawing}
        style={{ background: '#090d16', border: '1px dashed rgba(255,255,255,0.15)', borderRadius: '8px', cursor: 'crosshair', display: 'block' }}
      />
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '1rem' }}>
        <button onClick={clear} className="btn btn-secondary" style={{ padding: '0.4rem 1rem', fontSize: '0.85rem' }}>Clear</button>
        <button onClick={onCancel} className="btn btn-secondary" style={{ padding: '0.4rem 1rem', fontSize: '0.85rem' }}>Cancel</button>
        <button onClick={save} className="btn btn-primary" style={{ padding: '0.4rem 1rem', fontSize: '0.85rem' }}>Add Signature</button>
      </div>
    </div>
  );
};

const PageThumbnail = ({ fileBytes, pageNum, isBlank }) => {
  const canvasRef = useRef(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    if (isBlank) {
      setLoading(false);
      return;
    }
    const render = async () => {
      if (!canvasRef.current || !fileBytes) return;
      try {
        setLoading(true);
        await renderPageToCanvas(fileBytes, pageNum, canvasRef.current, 0.15);
        if (active) setLoading(false);
      } catch (err) {
        console.error('Error rendering thumbnail:', err);
        if (active) setLoading(false);
      }
    };
    render();
    return () => {
      active = false;
    };
  }, [fileBytes, pageNum, isBlank]);

  if (isBlank) {
    return (
      <div style={{ width: '100%', height: '100px', background: '#ffffff', borderRadius: '4px' }} />
    );
  }

  return (
    <div style={{ width: '100%', height: '100px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#ffffff', borderRadius: '4px', overflow: 'hidden', position: 'relative' }}>
      {loading && (
        <span style={{ fontSize: '0.6rem', color: '#6b7280', position: 'absolute' }}>Loading...</span>
      )}
      <canvas 
        ref={canvasRef} 
        style={{ 
          maxWidth: '100%', 
          maxHeight: '100%', 
          objectFit: 'contain',
          display: loading ? 'none' : 'block'
        }} 
      />
    </div>
  );
};

export const PDFEditor = ({ onBack }) => {
  const [file, setFile] = useState(null);
  const [fileBytes, setFileBytes] = useState(null);
  const [pagesList, setPagesList] = useState([]); // [{ id, pageNum, rotation: 0, isBlank: false }]
  const [activePageIndex, setActivePageIndex] = useState(0);
  
  // Fabric JS states
  const canvasesRef = useRef({}); // map of pageIndex -> fabric canvas instances
  const canvasStatesRef = useRef({}); // pageIdx -> Fabric JSON state
  const [activeObject, setActiveObject] = useState(null);
  const [activeTool, setActiveTool] = useState('select'); // 'select' | 'text' | 'draw' | 'highlighter' | 'rect' | 'circle' | 'whiteout' | 'redact'
  const [layersList, setLayersList] = useState([]);
  
  // Undo/Redo history stacks per page
  const historyRef = useRef({}); // pageIndex -> { undo: [], redo: [] }

  // Toolbar settings
  const [activeColor, setActiveColor] = useState('#6366f1');
  const [activeFontSize, setActiveFontSize] = useState(20);
  const [activeFontFamily, setActiveFontFamily] = useState('Helvetica');
  const [activeFontWeight, setActiveFontWeight] = useState('normal');
  const [activeFontStyle, setActiveFontStyle] = useState('normal');
  const [activeUnderline, setActiveUnderline] = useState(false);
  const [strokeWidth, setStrokeWidth] = useState(3);
  
  // Signature States
  const [showSigModal, setShowSigModal] = useState(false);
  const [sigType, setSigType] = useState('draw'); // 'draw' | 'type' | 'upload'
  const [sigName, setSigName] = useState('');
  const [sigFont, setSigFont] = useState('Caveat');

  // OCR States
  const [ocrLoading, setOcrLoading] = useState(false);
  const [ocrResult, setOcrResult] = useState('');
  const [showOcrModal, setShowOcrModal] = useState(false);
  
  // Process State
  const [processing, setProcessing] = useState(false);
  const [progressMsg, setProgressMsg] = useState('');
  const [zoomScale, setZoomScale] = useState(1);

  const fileInputRef = useRef(null);
  const imageInputRef = useRef(null);

  // Load standard cursive fonts for typed signature
  useEffect(() => {
    const link = document.createElement('link');
    link.href = 'https://fonts.googleapis.com/css2?family=Caveat:wght@700&family=Pacifico&family=Yellowtail&display=swap';
    link.rel = 'stylesheet';
    document.head.appendChild(link);
    return () => {
      document.head.removeChild(link);
    };
  }, []);

  // Handle PDF file select
  const handleFileChange = async (e) => {
    const selectedFile = e.target.files[0];
    if (!selectedFile) return;
    
    setProcessing(true);
    setProgressMsg('Loading PDF file...');
    try {
      const bytes = new Uint8Array(await fileToArrayBuffer(selectedFile));
      setFileBytes(bytes);
      setFile(selectedFile);
      
      const count = await getPDFPageCount(bytes);
      
      const list = Array.from({ length: count }, (_, i) => ({
        id: `page-${Date.now()}-${i}`,
        pageNum: i + 1,
        rotation: 0,
        isBlank: false
      }));
      setPagesList(list);
      setActivePageIndex(0);
    } catch (err) {
      console.error(err);
      alert('Failed to load PDF file. Is it password protected or corrupted?');
    } finally {
      setProcessing(false);
    }
  };

  const handleSwitchPage = (newIndex) => {
    if (newIndex === activePageIndex) return;
    
    const currentCanvas = canvasesRef.current[activePageIndex];
    if (currentCanvas) {
      canvasStatesRef.current[activePageIndex] = currentCanvas.toJSON();
    }
    
    setActivePageIndex(newIndex);
  };
  const applyToolConfiguration = useCallback((canvas) => {
    if (!canvas) return;
    canvas.isDrawingMode = false;
    canvas.selection = activeTool === 'select';
    
    canvas.forEachObject((obj) => {
      obj.selectable = activeTool === 'select';
      obj.hoverCursor = activeTool === 'select' ? 'move' : 'default';
    });

    if (activeTool === 'draw') {
      canvas.isDrawingMode = true;
      canvas.freeDrawingBrush = new fabric.PencilBrush(canvas);
      canvas.freeDrawingBrush.color = activeColor;
      canvas.freeDrawingBrush.width = strokeWidth;
    } else if (activeTool === 'highlighter') {
      canvas.isDrawingMode = true;
      canvas.freeDrawingBrush = new fabric.PencilBrush(canvas);
      const hex = activeColor.replace('#', '');
      const r = parseInt(hex.substring(0, 2), 16);
      const g = parseInt(hex.substring(2, 4), 16);
      const b = parseInt(hex.substring(4, 6), 16);
      canvas.freeDrawingBrush.color = `rgba(${r}, ${g}, ${b}, 0.35)`;
      canvas.freeDrawingBrush.width = 25;
    }
    canvas.renderAll();
  }, [activeTool, activeColor, strokeWidth]);

  const initFabricCanvas = async (pageIdx, container) => {
    if (!container) {
      if (canvasesRef.current[pageIdx]) {
        canvasesRef.current[pageIdx].dispose();
        delete canvasesRef.current[pageIdx];
      }
      return;
    }
    
    if (canvasesRef.current[pageIdx]) return;
    
    const pageItem = pagesList[pageIdx];
    if (!pageItem) return;

    const bgCanvas = container.querySelector('.pdf-bg-canvas');
    if (!bgCanvas) return;
    
    try {
      if (!pageItem.isBlank && fileBytes) {
        await renderPageToCanvas(fileBytes, pageItem.pageNum, bgCanvas, 1.25);
      } else {
        bgCanvas.width = 595 * 1.25;
        bgCanvas.height = 842 * 1.25;
        const ctx = bgCanvas.getContext('2d');
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, bgCanvas.width, bgCanvas.height);
      }

      const fabricCanvasElement = container.querySelector('.fabric-overlay-canvas');
      if (!fabricCanvasElement) return;
      
      fabricCanvasElement.width = bgCanvas.width;
      fabricCanvasElement.height = bgCanvas.height;

      const fCanvas = new fabric.Canvas(fabricCanvasElement, {
        width: bgCanvas.width,
        height: bgCanvas.height,
        backgroundColor: 'transparent',
        selection: true,
      });

      canvasesRef.current[pageIdx] = fCanvas;

      const saveState = () => {
        canvasStatesRef.current[pageIdx] = fCanvas.toJSON();
        saveHistoryState(pageIdx, fCanvas);
        updateLayersList(fCanvas);
      };

      fCanvas.on('object:added', saveState);
      fCanvas.on('object:modified', saveState);
      fCanvas.on('object:removed', saveState);

      fCanvas.on('selection:created', (e) => {
        setActiveObject(e.selected[0]);
      });
      fCanvas.on('selection:updated', (e) => {
        setActiveObject(e.selected[0]);
      });
      fCanvas.on('selection:cleared', () => {
        setActiveObject(null);
      });

      if (canvasStatesRef.current[pageIdx]) {
        fCanvas.loadFromJSON(canvasStatesRef.current[pageIdx], () => {
          fCanvas.renderAll();
          updateLayersList(fCanvas);
        });
      } else {
        if (!historyRef.current[pageIdx]) {
          historyRef.current[pageIdx] = { undo: [], redo: [] };
          saveHistoryState(pageIdx, fCanvas);
        }
        updateLayersList(fCanvas);
      }

      applyToolConfiguration(fCanvas);

    } catch (err) {
      console.error('Error rendering page preview:', err);
    }
  };

  const updateLayersList = (canvas) => {
    if (!canvas) {
      setLayersList([]);
      return;
    }
    setLayersList([...canvas.getObjects()].reverse());
  };

  const saveHistoryState = (pageIdx, canvas) => {
    const history = historyRef.current[pageIdx];
    if (!canvas || !history) return;

    const state = JSON.stringify(canvas.toJSON());
    if (history.undo.length > 0 && history.undo[history.undo.length - 1] === state) {
      return;
    }
    
    history.undo.push(state);
    history.redo = [];
  };

  const handleUndo = () => {
    const canvas = canvasesRef.current[activePageIndex];
    const history = historyRef.current[activePageIndex];
    if (!canvas || !history || history.undo.length <= 1) return;

    const currentState = history.undo.pop();
    history.redo.push(currentState);

    const previousState = history.undo[history.undo.length - 1];
    
    canvas.loadFromJSON(previousState, () => {
      canvas.renderAll();
      updateLayersList(canvas);
      canvasStatesRef.current[activePageIndex] = canvas.toJSON();
    });
  };

  const handleRedo = () => {
    const canvas = canvasesRef.current[activePageIndex];
    const history = historyRef.current[activePageIndex];
    if (!canvas || !history || history.redo.length === 0) return;

    const nextState = history.redo.pop();
    history.undo.push(nextState);

    canvas.loadFromJSON(nextState, () => {
      canvas.renderAll();
      updateLayersList(canvas);
      canvasStatesRef.current[activePageIndex] = canvas.toJSON();
    });
  };

  useEffect(() => {
    const canvas = canvasesRef.current[activePageIndex];
    if (canvas) {
      applyToolConfiguration(canvas);
    }
  }, [activePageIndex, applyToolConfiguration]);

  // Handle active object text styling changes
  const applyTextStyles = (prop, val) => {
    const canvas = canvasesRef.current[activePageIndex];
    if (!canvas || !activeObject) return;

    if (activeObject.type === 'textbox' || activeObject.type === 'i-text') {
      activeObject.set(prop, val);
      canvas.renderAll();
      saveHistoryState(activePageIndex);
    }
  };

  // Add Elements helper functions
  const addTextbox = () => {
    const canvas = canvasesRef.current[activePageIndex];
    if (!canvas) return;

    const textbox = new fabric.Textbox('Double click to edit text', {
      left: 100,
      top: 100,
      width: 250,
      fontSize: activeFontSize,
      fontFamily: activeFontFamily,
      fill: activeColor,
      fontWeight: activeFontWeight,
      fontStyle: activeFontStyle,
      underline: activeUnderline,
    });

    canvas.add(textbox);
    canvas.setActiveObject(textbox);
    setActiveTool('select');
  };

  const addShape = (type) => {
    const canvas = canvasesRef.current[activePageIndex];
    if (!canvas) return;

    let shapeObj;
    const baseStyle = {
      left: 150,
      top: 150,
      stroke: activeColor,
      strokeWidth: strokeWidth,
      fill: 'transparent',
    };

    if (type === 'rect') {
      shapeObj = new fabric.Rect({
        ...baseStyle,
        width: 120,
        height: 80,
      });
    } else if (type === 'circle') {
      shapeObj = new fabric.Circle({
        ...baseStyle,
        radius: 50,
      });
    } else if (type === 'line') {
      shapeObj = new fabric.Line([50, 50, 200, 50], {
        stroke: activeColor,
        strokeWidth: strokeWidth,
        left: 150,
        top: 150,
      });
    } else if (type === 'arrow') {
      shapeObj = new fabric.Path('M 0 0 L 120 0 M 120 0 L 100 -8 M 120 0 L 100 8', {
        stroke: activeColor,
        strokeWidth: strokeWidth,
        fill: 'transparent',
        left: 150,
        top: 150,
      });
    } else if (type === 'whiteout') {
      shapeObj = new fabric.Rect({
        left: 150,
        top: 150,
        width: 150,
        height: 40,
        fill: '#ffffff',
        stroke: 'transparent',
      });
    } else if (type === 'redact') {
      shapeObj = new fabric.Rect({
        left: 150,
        top: 150,
        width: 150,
        height: 40,
        fill: '#000000',
        stroke: 'transparent',
      });
    }

    if (shapeObj) {
      canvas.add(shapeObj);
      canvas.setActiveObject(shapeObj);
      setActiveTool('select');
    }
  };

  const triggerImageUpload = () => {
    imageInputRef.current.click();
  };

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const canvas = canvasesRef.current[activePageIndex];
      if (!canvas) return;

      fabric.Image.fromURL(event.target.result, (img) => {
        img.set({
          left: 120,
          top: 120,
          scaleX: 0.4,
          scaleY: 0.4,
        });
        canvas.add(img);
        canvas.setActiveObject(img);
      });
    };
    reader.readAsDataURL(file);
    e.target.value = null; // Reset input file
  };

  const addSignature = (dataURL) => {
    const canvas = canvasesRef.current[activePageIndex];
    if (!canvas) return;

    fabric.Image.fromURL(dataURL, (img) => {
      img.set({
        left: 150,
        top: 200,
        scaleX: 0.6,
        scaleY: 0.6,
      });
      canvas.add(img);
      canvas.setActiveObject(img);
      setShowSigModal(false);
    });
  };

  const addTypedSignature = () => {
    if (!sigName) return;
    const canvas = canvasesRef.current[activePageIndex];
    if (!canvas) return;

    const signatureText = new fabric.Textbox(sigName, {
      left: 150,
      top: 200,
      width: 250,
      fontFamily: sigFont,
      fontSize: 32,
      fill: activeColor === '#ffffff' ? '#000000' : activeColor, // ensure contrast
      editable: false,
    });

    canvas.add(signatureText);
    canvas.setActiveObject(signatureText);
    setShowSigModal(false);
  };

  // Perform Page manipulations
  const handleAddBlankPage = () => {
    const id = `blank-page-${Date.now()}`;
    const newPage = {
      id,
      pageNum: pagesList.length + 1,
      rotation: 0,
      isBlank: true
    };
    const newList = [...pagesList];
    newList.splice(activePageIndex + 1, 0, newPage);
    
    // Normalize page numbering
    const normalized = newList.map((item, index) => ({
      ...item,
      pageNum: index + 1
    }));
    
    setPagesList(normalized);
    setActivePageIndex(activePageIndex + 1);
  };

  const handleDeletePage = (pageIdx) => {
    if (pagesList.length <= 1) {
      alert('You cannot delete the only page in this document.');
      return;
    }
    
    const isConfirm = window.confirm(`Are you sure you want to delete page ${pageIdx + 1}?`);
    if (!isConfirm) return;

    // Delete canvas references
    if (canvasesRef.current[pageIdx]) {
      canvasesRef.current[pageIdx].dispose();
      delete canvasesRef.current[pageIdx];
    }
    delete historyRef.current[pageIdx];

    const newList = pagesList.filter((_, idx) => idx !== pageIdx);
    
    // Normalize numbering
    const normalized = newList.map((item, index) => ({
      ...item,
      pageNum: index + 1
    }));

    // Update index references in canvasesRef
    const newCanvases = {};
    const newHistory = {};
    newList.forEach((item, index) => {
      // Find original index
      const origIndex = pagesList.findIndex(orig => orig.id === item.id);
      if (canvasesRef.current[origIndex]) {
        newCanvases[index] = canvasesRef.current[origIndex];
      }
      if (historyRef.current[origIndex]) {
        newHistory[index] = historyRef.current[origIndex];
      }
    });

    canvasesRef.current = newCanvases;
    historyRef.current = newHistory;

    setPagesList(normalized);
    setActivePageIndex(Math.max(0, pageIdx - 1));
  };

  // Layer functions
  const deleteActiveObject = () => {
    const canvas = canvasesRef.current[activePageIndex];
    if (!canvas || !activeObject) return;
    canvas.remove(activeObject);
    canvas.discardActiveObject();
    canvas.renderAll();
    setActiveObject(null);
  };

  const moveLayer = (direction) => {
    const canvas = canvasesRef.current[activePageIndex];
    if (!canvas || !activeObject) return;

    if (direction === 'up') {
      canvas.bringForward(activeObject);
    } else if (direction === 'down') {
      canvas.sendBackwards(activeObject);
    } else if (direction === 'top') {
      canvas.bringToFront(activeObject);
    } else if (direction === 'bottom') {
      canvas.sendToBack(activeObject);
    }
    canvas.renderAll();
    updateLayersList(activePageIndex);
  };

  const toggleLayerLock = (obj) => {
    const canvas = canvasesRef.current[activePageIndex];
    if (!canvas || !obj) return;

    obj.set({
      lockMovementX: !obj.lockMovementX,
      lockMovementY: !obj.lockMovementY,
      lockScalingX: !obj.lockScalingX,
      lockScalingY: !obj.lockScalingY,
      lockRotation: !obj.lockRotation,
      hasControls: obj.lockMovementX, // toggle controls
    });
    
    canvas.renderAll();
    updateLayersList(activePageIndex);
  };

  const deleteLayerObj = (obj) => {
    const canvas = canvasesRef.current[activePageIndex];
    if (!canvas || !obj) return;
    canvas.remove(obj);
    canvas.discardActiveObject();
    canvas.renderAll();
    setActiveObject(null);
  };

  // Run Optical Character Recognition (OCR) on Current Page
  const runOCRText = async () => {
    const canvas = canvasesRef.current[activePageIndex];
    if (!canvas) return;

    // Get background canvas
    const container = document.getElementById(`editor-container-${activePageIndex}`);
    const bgCanvas = container.querySelector('.pdf-bg-canvas');
    if (!bgCanvas) return;

    setOcrLoading(true);
    setShowOcrModal(true);
    setOcrResult('Analyzing page text using OCR engine...');

    try {
      const text = await runOcrEngine(bgCanvas);
      setOcrResult(text || 'No text recognized on this page.');
    } catch (err) {
      console.error(err);
      setOcrResult('Error performing OCR recognition.');
    } finally {
      setOcrLoading(false);
    }
  };

  const runOcrEngine = async (canvasElement) => {
    const worker = await createWorker('eng');
    const ret = await worker.recognize(canvasElement);
    await worker.terminate();
    return ret.data.text;
  };

  const handleInsertOcrText = () => {
    if (!ocrResult || ocrResult.startsWith('Analyzing') || ocrResult.startsWith('Error')) return;
    const canvas = canvasesRef.current[activePageIndex];
    if (!canvas) return;

    const cleanLines = ocrResult.split('\n').filter(line => line.trim().length > 3).slice(0, 10);
    
    cleanLines.forEach((line, i) => {
      const textbox = new fabric.Textbox(line, {
        left: 80,
        top: 100 + i * 40,
        width: 400,
        fontSize: 16,
        fontFamily: 'Helvetica',
        fill: '#000000',
      });
      canvas.add(textbox);
    });

    setShowOcrModal(false);
  };

  // Export PDF with all page layers embedded
  const handleSavePDF = async () => {
    if (!file) return;

    setProcessing(true);
    setProgressMsg('Rendering edits and embedding layers...');

    try {
      // 1. Save current active page canvas state
      const currentCanvas = canvasesRef.current[activePageIndex];
      if (currentCanvas) {
        canvasStatesRef.current[activePageIndex] = currentCanvas.toJSON();
      }

      const pageEdits = [];

      // Gather canvas overlays
      for (let i = 0; i < pagesList.length; i++) {
        const editState = canvasStatesRef.current[i];
        
        if (!editState || !editState.objects || editState.objects.length === 0) {
          pageEdits.push({ pageIndex: i, overlayImage: null, textObjects: [] });
          continue;
        }

        // Split text vs non-text layers
        const textObjects = [];
        const nonTextObjects = [];

        editState.objects.forEach((obj) => {
          if (obj.type === 'textbox' || obj.type === 'i-text') {
            textObjects.push({
              text: obj.text,
              left: obj.left,
              top: obj.top,
              width: obj.width * (obj.scaleX || 1),
              height: obj.height * (obj.scaleY || 1),
              fontSize: obj.fontSize,
              fontFamily: obj.fontFamily,
              fontWeight: obj.fontWeight,
              fontStyle: obj.fontStyle,
              fill: obj.fill,
              lineHeight: obj.lineHeight,
              canvasWidth: editState.width || 743.75,
              canvasHeight: editState.height || 1052.5,
            });
          } else {
            nonTextObjects.push(obj);
          }
        });

        // If there are drawings/shapes, render to dataURL
        let overlayImage = null;
        if (nonTextObjects.length > 0) {
          const tempCanvasElement = document.createElement('canvas');
          tempCanvasElement.width = editState.width || 743.75;
          tempCanvasElement.height = editState.height || 1052.5;

          const tempStaticCanvas = new fabric.StaticCanvas(tempCanvasElement);

          // Clone state but only with non-text objects
          const cleanState = {
            ...editState,
            objects: nonTextObjects
          };

          await new Promise((resolve) => {
            tempStaticCanvas.loadFromJSON(cleanState, () => {
              tempStaticCanvas.renderAll();
              resolve();
            });
          });

          overlayImage = tempStaticCanvas.toDataURL({
            format: 'png',
            multiplier: 1.5, // High resolution scale
          });

          tempStaticCanvas.dispose();
        }

        pageEdits.push({
          pageIndex: i,
          overlayImage,
          textObjects,
        });
      }

      // Save using export engine
      const modifiedBytes = await saveEditedPDF(file, pageEdits);
      
      // Save file
      const baseName = file.name.substring(0, file.name.lastIndexOf('.')) || file.name;
      const blob = new Blob([modifiedBytes], { type: 'application/pdf' });
      saveAs(blob, `${baseName}_edited.pdf`);
    } catch (err) {
      console.error(err);
      alert('Error editing and rendering PDF document.');
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="container" style={{ paddingBottom: '3rem' }}>
      
      {/* Back Header & Title */}
      <div className="workspace-header" style={{ marginBottom: '1rem' }}>
        <button onClick={onBack} className="back-button" title="Back to Dashboard">
          <ArrowLeft size={18} />
        </button>
        <div>
          <h2 className="workspace-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Sparkles size={20} style={{ color: 'var(--primary-color)' }} />
            Advanced PDF Editor
          </h2>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
            Complete Figma-style in-browser PDF designer. Draw, redact, text, signatures and extract OCR.
          </p>
        </div>
      </div>

      {/* 1. Drag and Drop Uploader if file not loaded */}
      {!file && (
        <div 
          onClick={() => fileInputRef.current.click()}
          className="dropzone"
          style={{ minHeight: '350px' }}
        >
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleFileChange} 
            accept=".pdf" 
            style={{ display: 'none' }} 
          />
          <Upload className="dropzone-icon" />
          <h3 className="dropzone-title">Upload a PDF file to edit</h3>
          <p className="dropzone-desc">Drag and drop your PDF here, or click to browse</p>
          <button className="btn btn-primary">Select PDF File</button>
        </div>
      )}

      {/* 2. Workspace View */}
      {file && (
        <div style={{ display: 'grid', gridTemplateColumns: '240px 1fr 280px', gap: '1.25rem', marginTop: '1rem', height: 'calc(100vh - 180px)', minHeight: '600px' }}>
          
          {/* Left Panel - Page Previews */}
          <aside className="sidebar-panel" style={{ display: 'flex', flexDirection: 'column', height: '100%', overflowY: 'auto', padding: '1rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '0.5rem' }}>
              <span style={{ fontWeight: 600, fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Pages ({pagesList.length})</span>
              <button 
                onClick={handleAddBlankPage} 
                className="back-button"
                style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}
                title="Add blank page"
              >
                <Plus size={12} /> Add
              </button>
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', flex: 1 }}>
              {pagesList.map((page, index) => (
                <div 
                  key={page.id} 
                  onClick={() => handleSwitchPage(index)}
                  className={`page-preview-card ${index === activePageIndex ? 'selected' : ''}`}
                  style={{ cursor: 'pointer', padding: '0.5rem', width: '100%', border: index === activePageIndex ? '2px solid var(--primary-color)' : '1px solid var(--border-subtle)' }}
                >
                  <div style={{ height: '100px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#ffffff', borderRadius: '4px', overflow: 'hidden', position: 'relative' }}>
                    <span style={{ fontSize: '0.7rem', color: '#f3f4f6', position: 'absolute', top: 4, left: 4, zIndex: 10, background: 'rgba(10,15,30,0.7)', padding: '0.1rem 0.3rem', borderRadius: '3px' }}>
                      {page.isBlank ? 'Blank' : `p.${page.pageNum}`}
                    </span>
                    <PageThumbnail fileBytes={fileBytes} pageNum={page.pageNum} isBlank={page.isBlank} />
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', marginTop: '0.5rem', fontSize: '0.75rem' }}>
                    <span>Page {index + 1}</span>
                    <button 
                      onClick={(e) => { e.stopPropagation(); handleDeletePage(index); }}
                      style={{ background: 'none', border: 'none', color: 'var(--accent-rose)', cursor: 'pointer', padding: '0.25rem' }}
                      title="Delete Page"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </aside>

          {/* Center Panel - Main Editor Canvas */}
          <section style={{ display: 'flex', flexDirection: 'column', background: '#090d16', border: '1px solid var(--border-subtle)', borderRadius: '20px', overflow: 'hidden' }}>
            
            {/* Top Editor Toolbar */}
            <div style={{ background: '#111827', borderBottom: '1px solid var(--border-subtle)', padding: '0.5rem 1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
              
              {/* Drawing Tools */}
              <div style={{ display: 'flex', gap: '0.25rem', alignItems: 'center' }}>
                <button 
                  onClick={() => setActiveTool('select')} 
                  className={`back-button ${activeTool === 'select' ? 'active' : ''}`}
                  style={{ background: activeTool === 'select' ? 'rgba(99, 102, 241, 0.2)' : 'none', borderColor: activeTool === 'select' ? 'var(--primary-color)' : 'transparent' }}
                  title="Select / Move"
                >
                  <MousePointer size={15} />
                </button>
                <button 
                  onClick={() => { setActiveTool('text'); addTextbox(); }} 
                  className={`back-button ${activeTool === 'text' ? 'active' : ''}`}
                  style={{ background: activeTool === 'text' ? 'rgba(99, 102, 241, 0.2)' : 'none' }}
                  title="Add Text"
                >
                  <Type size={15} />
                </button>
                <button 
                  onClick={() => setActiveTool('draw')} 
                  className={`back-button ${activeTool === 'draw' ? 'active' : ''}`}
                  style={{ background: activeTool === 'draw' ? 'rgba(99, 102, 241, 0.2)' : 'none' }}
                  title="Freehand Pen"
                >
                  <PenTool size={15} />
                </button>
                <button 
                  onClick={() => setActiveTool('highlighter')} 
                  className={`back-button ${activeTool === 'highlighter' ? 'active' : ''}`}
                  style={{ background: activeTool === 'highlighter' ? 'rgba(99, 102, 241, 0.2)' : 'none' }}
                  title="Highlighter"
                >
                  <Smile size={15} />
                </button>
                
                <span style={{ width: '1px', height: '18px', background: 'var(--border-subtle)', margin: '0 0.25rem' }}></span>

                {/* Shape dropdown */}
                <button onClick={() => addShape('rect')} className="back-button" title="Rectangle" style={{ padding: '0.4rem' }}><Square size={15} /></button>
                <button onClick={() => addShape('circle')} className="back-button" title="Circle" style={{ padding: '0.4rem' }}><Circle size={15} /></button>
                <button onClick={() => addShape('arrow')} className="back-button" title="Arrow" style={{ padding: '0.4rem' }}>↗</button>
                <button onClick={() => addShape('line')} className="back-button" title="Line" style={{ padding: '0.4rem' }}>━</button>

                <span style={{ width: '1px', height: '18px', background: 'var(--border-subtle)', margin: '0 0.25rem' }}></span>

                {/* Whiteout / Redact */}
                <button 
                  onClick={() => addShape('whiteout')} 
                  className="back-button" 
                  style={{ color: '#ffffff', border: '1px solid rgba(255,255,255,0.2)', fontSize: '0.75rem', padding: '0.2rem 0.5rem' }} 
                  title="Whiteout (Erase Area)"
                >
                  Whiteout
                </button>
                <button 
                  onClick={() => addShape('redact')} 
                  className="back-button" 
                  style={{ background: '#000', color: '#ff4d4d', fontSize: '0.75rem', padding: '0.2rem 0.5rem' }} 
                  title="Redaction (Blackout)"
                >
                  Redact
                </button>
              </div>

              {/* Utility Tools */}
              <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
                <button onClick={triggerImageUpload} className="back-button" title="Insert Image" style={{ padding: '0.4rem' }}>
                  <EyeOff size={15} />
                  <input type="file" ref={imageInputRef} onChange={handleImageUpload} accept="image/*" style={{ display: 'none' }} />
                </button>
                <button onClick={() => setShowSigModal(true)} className="back-button" title="Place Signature" style={{ fontSize: '0.8rem', padding: '0.3rem 0.6rem' }}>
                  Signature
                </button>
                <button onClick={runOCRText} className="back-button" style={{ color: '#06b6d4', display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.8rem', padding: '0.3rem 0.6rem' }} title="OCR Page Scan">
                  <Sparkles size={13} /> OCR
                </button>

                <span style={{ width: '1px', height: '18px', background: 'var(--border-subtle)', margin: '0 0.25rem' }}></span>

                {/* Undo / Redo */}
                <button onClick={handleUndo} className="back-button" title="Undo"><Undo2 size={14} /></button>
                <button onClick={handleRedo} className="back-button" title="Redo"><Redo2 size={14} /></button>

                <span style={{ width: '1px', height: '18px', background: 'var(--border-subtle)', margin: '0 0.25rem' }}></span>

                {/* Zoom */}
                <button onClick={() => setZoomScale(Math.max(0.5, zoomScale - 0.1))} className="back-button"><ZoomOut size={14} /></button>
                <span style={{ fontSize: '0.75rem', minWidth: '35px', textAlign: 'center' }}>{Math.round(zoomScale * 100)}%</span>
                <button onClick={() => setZoomScale(Math.min(2.0, zoomScale + 0.1))} className="back-button"><ZoomIn size={14} /></button>
              </div>

            </div>

            {/* Editing Page Container */}
            <div style={{ flex: 1, overflow: 'auto', padding: '2rem', display: 'flex', justifyContent: 'center', alignItems: 'flex-start' }}>
              <div 
                style={{ 
                  transform: `scale(${zoomScale})`, 
                  transformOrigin: 'top center',
                  transition: 'transform 0.2s ease',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '2rem'
                }}
              >
                {pagesList.length > 0 && pagesList[activePageIndex] && (
                  <div 
                    key={activePageIndex}
                    id={`editor-container-${activePageIndex}`}
                    style={{ 
                      position: 'relative', 
                      boxShadow: '0 10px 30px rgba(0,0,0,0.5)', 
                      borderRadius: '8px', 
                      overflow: 'hidden',
                    }}
                    ref={(el) => initFabricCanvas(activePageIndex, el)}
                  >
                    {/* Rendered PDF background canvas */}
                    <canvas className="pdf-bg-canvas" style={{ display: 'block' }} />
                    
                    {/* Fabric JS Drawing Layer Overlay */}
                    <div style={{ position: 'absolute', top: 0, left: 0 }}>
                      <canvas className="fabric-overlay-canvas" />
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Bottom Saving / Processing Toolbar */}
            <div style={{ background: '#111827', borderTop: '1px solid var(--border-subtle)', padding: '0.75rem 1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                Active: Page {activePageIndex + 1} of {pagesList.length}
              </span>
              <button 
                onClick={handleSavePDF} 
                className="btn btn-primary"
                style={{ height: '36px', padding: '0 1.25rem', fontSize: '0.85rem' }}
                disabled={processing}
              >
                {processing ? (
                  <>
                    <Loader2 size={14} className="animate-spin" /> Rendering...
                  </>
                ) : (
                  <>
                    <Download size={14} /> Download PDF
                  </>
                )}
              </button>
            </div>
          </section>

          {/* Right Panel - Settings / Layers */}
          <aside className="sidebar-panel" style={{ display: 'flex', flexDirection: 'column', height: '100%', overflowY: 'auto', padding: '1rem' }}>
            
            {/* Properties Section */}
            <div style={{ marginBottom: '1.5rem' }}>
              <h4 style={{ fontSize: '0.9rem', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '0.5rem', marginBottom: '1rem', color: 'var(--text-secondary)' }}>
                Properties
              </h4>

              {/* Universal Color Picker */}
              <div className="form-group">
                <label className="form-label">Active Color</label>
                <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', marginTop: '0.25rem' }}>
                  {['#6366f1', '#10b981', '#06b6d4', '#f59e0b', '#ef4444', '#ffffff', '#000000'].map((color) => (
                    <button 
                      key={color}
                      onClick={() => {
                        setActiveColor(color);
                        if (activeObject) {
                          if (activeObject.type === 'textbox' || activeObject.type === 'i-text') {
                            applyTextStyles('fill', color);
                          } else {
                            activeObject.set('stroke', color);
                            activeObject.set('fill', color === '#ffffff' || color === '#000000' ? color : 'transparent');
                            canvasesRef.current[activePageIndex].renderAll();
                          }
                        }
                      }}
                      style={{ 
                        width: '24px', 
                        height: '24px', 
                        borderRadius: '50%', 
                        background: color, 
                        border: activeColor === color ? '2px solid var(--text-primary)' : '1px solid var(--border-subtle)',
                        cursor: 'pointer'
                      }}
                    />
                  ))}
                </div>
              </div>

              {/* Text specific styles */}
              {activeObject && (activeObject.type === 'textbox' || activeObject.type === 'i-text') && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  <div className="form-group">
                    <label className="form-label">Font Family</label>
                    <select 
                      value={activeObject.fontFamily} 
                      onChange={(e) => {
                        setActiveFontFamily(e.target.value);
                        applyTextStyles('fontFamily', e.target.value);
                      }}
                      className="form-input"
                      style={{ padding: '0.4rem' }}
                    >
                      <option value="Helvetica">Sans-Serif (Helvetica)</option>
                      <option value="Times New Roman">Serif (Times Roman)</option>
                      <option value="Courier New">Monospace (Courier)</option>
                      <option value="Caveat">Signature (Caveat)</option>
                      <option value="Pacifico">Script (Pacifico)</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Font Size</label>
                    <input 
                      type="number" 
                      value={activeObject.fontSize} 
                      onChange={(e) => {
                        const val = parseInt(e.target.value) || 12;
                        setActiveFontSize(val);
                        applyTextStyles('fontSize', val);
                      }}
                      className="form-input"
                      style={{ padding: '0.4rem' }}
                    />
                  </div>

                  <div style={{ display: 'flex', gap: '0.25rem' }}>
                    <button 
                      onClick={() => {
                        const newWeight = activeObject.fontWeight === 'bold' ? 'normal' : 'bold';
                        setActiveFontWeight(newWeight);
                        applyTextStyles('fontWeight', newWeight);
                      }}
                      className="back-button"
                      style={{ flex: 1, fontWeight: 'bold', background: activeObject.fontWeight === 'bold' ? 'rgba(255,255,255,0.1)' : 'none' }}
                    >
                      B
                    </button>
                    <button 
                      onClick={() => {
                        const newStyle = activeObject.fontStyle === 'italic' ? 'normal' : 'italic';
                        setActiveFontStyle(newStyle);
                        applyTextStyles('fontStyle', newStyle);
                      }}
                      className="back-button"
                      style={{ flex: 1, fontStyle: 'italic', background: activeObject.fontStyle === 'italic' ? 'rgba(255,255,255,0.1)' : 'none' }}
                    >
                      I
                    </button>
                    <button 
                      onClick={() => {
                        const newUnder = !activeObject.underline;
                        setActiveUnderline(newUnder);
                        applyTextStyles('underline', newUnder);
                      }}
                      className="back-button"
                      style={{ flex: 1, textDecoration: 'underline', background: activeObject.underline ? 'rgba(255,255,255,0.1)' : 'none' }}
                    >
                      U
                    </button>
                  </div>
                </div>
              )}

              {/* Stroke width for shapes */}
              {activeTool === 'draw' && (
                <div className="form-group">
                  <label className="form-label">Brush Width ({strokeWidth}px)</label>
                  <input 
                    type="range" 
                    min="1" 
                    max="15" 
                    value={strokeWidth} 
                    onChange={(e) => setStrokeWidth(parseInt(e.target.value))}
                    style={{ width: '100%', accentColor: 'var(--primary-color)' }}
                  />
                </div>
              )}

              {/* Selection Delete button */}
              {activeObject && (
                <button 
                  onClick={deleteActiveObject}
                  className="btn btn-secondary"
                  style={{ width: '100%', marginTop: '1rem', color: 'var(--accent-rose)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem' }}
                >
                  <Trash2 size={14} /> Delete Selection
                </button>
              )}
            </div>

            {/* Layer Stack Section */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
              <h4 style={{ fontSize: '0.9rem', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '0.5rem', marginBottom: '0.75rem', color: 'var(--text-secondary)' }}>
                Layers
              </h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', flex: 1, overflowY: 'auto', maxHeight: '200px' }}>
                {layersList.map((obj, i) => {
                  const isLocked = obj.lockMovementX;
                  return (
                    <div 
                      key={i} 
                      onClick={() => {
                        const canvas = canvasesRef.current[activePageIndex];
                        if (canvas) {
                          canvas.setActiveObject(obj);
                          canvas.renderAll();
                        }
                      }}
                      style={{ 
                        display: 'flex', 
                        justifyContent: 'space-between', 
                        alignItems: 'center', 
                        padding: '0.4rem 0.6rem', 
                        background: activeObject === obj ? 'rgba(99, 102, 241, 0.1)' : 'rgba(255,255,255,0.02)',
                        border: activeObject === obj ? '1px solid rgba(99, 102, 241, 0.4)' : '1px solid var(--border-subtle)',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        fontSize: '0.8rem'
                      }}
                    >
                      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '140px', textTransform: 'capitalize' }}>
                        {obj.type} {obj.text ? `(${obj.text.substring(0,8)}...)` : ''}
                      </span>
                      <div style={{ display: 'flex', gap: '0.2rem', alignItems: 'center' }} onClick={(e) => e.stopPropagation()}>
                        <button 
                          onClick={() => { setActiveObject(obj); moveLayer('up'); }} 
                          style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '0.7rem', padding: '0 0.15rem' }}
                          title="Bring Forward"
                        >
                          ▲
                        </button>
                        <button 
                          onClick={() => { setActiveObject(obj); moveLayer('down'); }} 
                          style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '0.7rem', padding: '0 0.15rem' }}
                          title="Send Backward"
                        >
                          ▼
                        </button>
                        <button 
                          onClick={() => toggleLayerLock(obj)} 
                          style={{ background: 'none', border: 'none', color: isLocked ? 'var(--primary-color)' : 'var(--text-muted)', cursor: 'pointer' }}
                          title={isLocked ? 'Unlock movement' : 'Lock movement'}
                        >
                          {isLocked ? <Lock size={12} /> : <Unlock size={12} />}
                        </button>
                        <button 
                          onClick={() => deleteLayerObj(obj)} 
                          style={{ background: 'none', border: 'none', color: 'var(--accent-rose)', cursor: 'pointer' }}
                          title="Delete object"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </div>
                  );
                })}
                {layersList.length === 0 && (
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textAlign: 'center', marginTop: '1rem' }}>No objects on this page.</p>
                )}
              </div>
            </div>

            {/* Side banner Advertisement placeholder */}
            <div style={{ marginTop: 'auto', paddingTop: '1.5rem' }}>
              <AdPlaceholder type="sidebar" />
            </div>
          </aside>

        </div>
      )}

      {/* Signature Modal */}
      {showSigModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', borderRadius: '16px', padding: '1.5rem', width: '500px', maxWidth: '90vw' }}>
            <h3 style={{ marginBottom: '1rem' }}>Add Signature</h3>
            
            <div className="categories-tabs" style={{ marginBottom: '1rem' }}>
              {['draw', 'type'].map((mode) => (
                <button 
                  key={mode} 
                  onClick={() => setSigType(mode)} 
                  className={`category-tab ${sigType === mode ? 'active' : ''}`}
                  style={{ textTransform: 'capitalize' }}
                >
                  {mode}
                </button>
              ))}
            </div>

            {sigType === 'draw' && (
              <SignaturePad 
                onSave={addSignature} 
                onCancel={() => setShowSigModal(false)} 
              />
            )}

            {sigType === 'type' && (
              <div>
                <div className="form-group">
                  <label className="form-label">Type your name:</label>
                  <input 
                    type="text" 
                    value={sigName} 
                    onChange={(e) => setSigName(e.target.value)} 
                    className="form-input" 
                    placeholder="e.g. John Doe"
                  />
                </div>
                
                <div className="form-group">
                  <label className="form-label">Signature Font Style:</label>
                  <select 
                    value={sigFont} 
                    onChange={(e) => setSigFont(e.target.value)} 
                    className="form-input"
                  >
                    <option value="Caveat">Caveat (Cursive)</option>
                    <option value="Pacifico">Pacifico (Bold Script)</option>
                    <option value="Yellowtail">Yellowtail (Brush Script)</option>
                  </select>
                </div>

                {/* Signature Preview */}
                {sigName && (
                  <div style={{ 
                    background: '#090d16', 
                    border: '1px dashed rgba(255,255,255,0.1)', 
                    borderRadius: '8px', 
                    padding: '2rem 1rem', 
                    textAlign: 'center', 
                    fontSize: '2.5rem', 
                    fontFamily: sigFont, 
                    color: '#6366f1',
                    marginBottom: '1rem' 
                  }}>
                    {sigName}
                  </div>
                )}

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                  <button onClick={() => setShowSigModal(false)} className="btn btn-secondary">Cancel</button>
                  <button onClick={addTypedSignature} className="btn btn-primary" disabled={!sigName}>Insert Signature</button>
                </div>
              </div>
            )}

          </div>
        </div>
      )}

      {/* OCR Scan Result Modal */}
      {showOcrModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', borderRadius: '16px', padding: '1.5rem', width: '600px', maxWidth: '90vw' }}>
            <h3 style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Sparkles size={18} style={{ color: '#06b6d4' }} /> OCR Page Text Recognition
            </h3>
            
            {ocrLoading ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '3rem 0' }}>
                <Loader2 size={40} className="animate-spin" style={{ color: '#06b6d4', marginBottom: '1rem' }} />
                <p style={{ color: 'var(--text-secondary)' }}>Scanning PDF image page for characters...</p>
              </div>
            ) : (
              <div>
                <textarea 
                  value={ocrResult} 
                  onChange={(e) => setOcrResult(e.target.value)} 
                  className="form-input" 
                  style={{ width: '100%', height: '220px', resize: 'vertical', fontFamily: 'monospace', fontSize: '0.85rem', background: '#090d16', padding: '0.75rem', marginBottom: '1rem' }}
                />
                
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <button 
                    onClick={() => { navigator.clipboard.writeText(ocrResult); alert('Copied to clipboard!'); }}
                    className="btn btn-secondary"
                    style={{ fontSize: '0.8rem', padding: '0.4rem 1rem' }}
                  >
                    Copy to Clipboard
                  </button>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button onClick={() => setShowOcrModal(false)} className="btn btn-secondary" style={{ fontSize: '0.8rem', padding: '0.4rem 1rem' }}>Close</button>
                    <button 
                      onClick={handleInsertOcrText} 
                      className="btn btn-primary" 
                      style={{ fontSize: '0.8rem', padding: '0.4rem 1rem' }}
                      disabled={!ocrResult || ocrResult.startsWith('No text')}
                    >
                      Insert Text Layers
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Full screen loader overlay when loading file */}
      {processing && progressMsg && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', zIndex: 2000 }}>
          <Loader2 size={50} className="animate-spin" style={{ color: 'var(--primary-color)', marginBottom: '1rem' }} />
          <p style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{progressMsg}</p>
        </div>
      )}

    </div>
  );
};

export default PDFEditor;
