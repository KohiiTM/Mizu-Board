import { useState, useRef, useEffect } from "react";
import { Window, LogicalSize, LogicalPosition } from "@tauri-apps/api/window";
import "./App.css";

type DrawingTool = "pen" | "eraser" | "text";

function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentTool, setCurrentTool] = useState<DrawingTool>("pen");
  const [color, setColor] = useState("#ff0000");
  const [lineWidth, setLineWidth] = useState(2);
  const [isAnnotationMode, setIsAnnotationMode] = useState(false);
  const appWindow = useRef<Window | null>(null);

  useEffect(() => {
    const initWindow = async () => {
      appWindow.current = Window.getCurrent();
      if (appWindow.current) {
        await appWindow.current.setSize(new LogicalSize(400, 60));
        await appWindow.current.setPosition(new LogicalPosition(0, 20));
        await appWindow.current.setFullscreen(false);
        await appWindow.current.setAlwaysOnTop(true);
        await appWindow.current.setIgnoreCursorEvents(true);
        await appWindow.current.setDecorations(false);
      }
    };
    initWindow();
  }, []);

  const toggleAnnotationMode = async () => {
    if (!appWindow.current) return;

    const newMode = !isAnnotationMode;
    setIsAnnotationMode(newMode);

    if (newMode) {
      await appWindow.current.setFullscreen(true);
      await appWindow.current.setIgnoreCursorEvents(false);
      await appWindow.current.setFocus();
    } else {
      await appWindow.current.setFullscreen(false);
      await appWindow.current.setIgnoreCursorEvents(true);

      const monitors = await Window.getAll();
      const currentMonitor = monitors[0];
      if (currentMonitor) {
        const monitorSize = await currentMonitor.innerSize();
        const x = (monitorSize.width - 400) / 2;
        await appWindow.current.setSize(new LogicalSize(400, 60));
        await appWindow.current.setPosition(new LogicalPosition(x, 20));
      }
    }
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();

    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;

    const ctx = canvas.getContext("2d");
    if (ctx) {
      ctx.scale(dpr, dpr);
    }

    const storeCanvasContent = () => {
      const tempCanvas = document.createElement("canvas");
      tempCanvas.width = canvas.width;
      tempCanvas.height = canvas.height;
      const tempCtx = tempCanvas.getContext("2d");
      if (tempCtx) {
        tempCtx.drawImage(canvas, 0, 0);
      }
      return tempCanvas;
    };

    const resizeCanvas = () => {
      const tempCanvas = storeCanvasContent();
      const rect = canvas.getBoundingClientRect();

      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;

      const ctx = canvas.getContext("2d");
      if (ctx && tempCanvas) {
        ctx.scale(dpr, dpr);
        ctx.drawImage(tempCanvas, 0, 0);
      }
    };

    resizeCanvas();
    window.addEventListener("resize", resizeCanvas);

    const handleKeyPress = async (e: KeyboardEvent) => {
      if (e.altKey && e.key === "a") {
        e.preventDefault();
        toggleAnnotationMode();
      }

      if (e.key === "F11" || (e.ctrlKey && e.key === "f")) {
        e.preventDefault();
        const isFullscreen = await appWindow.current?.isFullscreen();
        if (isFullscreen) {
          await appWindow.current?.setFullscreen(false);
        } else {
          await appWindow.current?.setFullscreen(true);
        }
      }

      if (isAnnotationMode) {
        switch (e.key) {
          case "p":
            setCurrentTool("pen");
            break;
          case "e":
            setCurrentTool("eraser");
            break;
          case "c":
            clearCanvas();
            break;
        }
      }
    };

    window.addEventListener("keydown", handleKeyPress);

    return () => {
      window.removeEventListener("resize", resizeCanvas);
      window.removeEventListener("keydown", handleKeyPress);
    };
  }, [isAnnotationMode]);

  const getCanvasCoordinates = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };

    const rect = canvas.getBoundingClientRect();

    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
  };

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isAnnotationMode) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    setIsDrawing(true);
    const { x, y } = getCanvasCoordinates(e);

    ctx.beginPath();
    ctx.moveTo(x, y);

    if (currentTool === "eraser") {
      ctx.globalCompositeOperation = "destination-out";
    } else {
      ctx.globalCompositeOperation = "source-over";
      ctx.strokeStyle = color;
    }

    ctx.lineWidth = lineWidth;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing || !isAnnotationMode) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const { x, y } = getCanvasCoordinates(e);

    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDrawing = () => {
    setIsDrawing(false);
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.globalCompositeOperation = "source-over";
  };

  return (
    <div className={`app-container ${isAnnotationMode ? "active" : ""}`}>
      <div className={`toolbar ${isAnnotationMode ? "active" : ""}`}>
        <button
          className={`toggle-mode ${isAnnotationMode ? "active" : ""}`}
          onClick={toggleAnnotationMode}
          title="Toggle Annotation Mode (Alt + A)"
        >
          {isAnnotationMode ? "Disable" : "Enable"} Annotation
        </button>
        {isAnnotationMode && (
          <>
            <button
              className={currentTool === "pen" ? "active" : ""}
              onClick={() => setCurrentTool("pen")}
              title="Pen Tool (P)"
            >
              Pen
            </button>
            <button
              className={currentTool === "eraser" ? "active" : ""}
              onClick={() => setCurrentTool("eraser")}
              title="Eraser Tool (E)"
            >
              Eraser
            </button>
            <input
              type="color"
              value={color}
              onChange={(e) => setColor(e.target.value)}
              title="Color Picker"
            />
            <input
              type="range"
              min="1"
              max="20"
              value={lineWidth}
              onChange={(e) => setLineWidth(Number(e.target.value))}
              title="Line Width"
            />
            <button
              onClick={clearCanvas}
              className="clear-button"
              title="Clear Canvas (C)"
            >
              Clear
            </button>
          </>
        )}
        <button
          onClick={() => Window.getCurrent().close()}
          title="Close Application"
        >
          Close
        </button>
      </div>
      {isAnnotationMode && (
        <canvas
          ref={canvasRef}
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onMouseOut={stopDrawing}
          className="drawing-canvas"
        />
      )}
    </div>
  );
}

export default App;
