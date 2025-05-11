import { useState, useRef, useEffect } from "react";
import { Window } from "@tauri-apps/api/window";
import "./App.css";

type DrawingTool = "pen" | "eraser" | "text";

function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentTool, setCurrentTool] = useState<DrawingTool>("pen");
  const [color, setColor] = useState("#ff0000");
  const [lineWidth, setLineWidth] = useState(2);

  // Function to clear the canvas
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

    // Store the current canvas content
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

    // Set canvas to full screen while preserving content
    const resizeCanvas = () => {
      const tempCanvas = storeCanvasContent();
      const oldWidth = canvas.width;
      const oldHeight = canvas.height;

      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;

      const ctx = canvas.getContext("2d");
      if (ctx && tempCanvas) {
        // Scale the content to fit the new dimensions
        const scaleX = canvas.width / oldWidth;
        const scaleY = canvas.height / oldHeight;
        ctx.scale(scaleX, scaleY);
        ctx.drawImage(tempCanvas, 0, 0);
        ctx.setTransform(1, 0, 0, 1, 0, 0); // Reset transform
      }
    };

    resizeCanvas();
    window.addEventListener("resize", resizeCanvas);

    // Add keyboard shortcut for toggling fullscreen
    const handleKeyPress = async (e: KeyboardEvent) => {
      if (e.key === "F11" || (e.ctrlKey && e.key === "f")) {
        e.preventDefault();
        const appWindow = Window.getCurrent();
        const isFullscreen = await appWindow.isFullscreen();
        if (isFullscreen) {
          await appWindow.setFullscreen(false);
        } else {
          await appWindow.setFullscreen(true);
        }
      }
    };

    window.addEventListener("keydown", handleKeyPress);

    return () => {
      window.removeEventListener("resize", resizeCanvas);
      window.removeEventListener("keydown", handleKeyPress);
    };
  }, []);

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    setIsDrawing(true);
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

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
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDrawing = () => {
    setIsDrawing(false);
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Reset composite operation after drawing
    ctx.globalCompositeOperation = "source-over";
  };

  return (
    <div className="app-container">
      <div className="toolbar">
        <button
          className={currentTool === "pen" ? "active" : ""}
          onClick={() => setCurrentTool("pen")}
        >
          Pen
        </button>
        <button
          className={currentTool === "eraser" ? "active" : ""}
          onClick={() => setCurrentTool("eraser")}
        >
          Eraser
        </button>
        <input
          type="color"
          value={color}
          onChange={(e) => setColor(e.target.value)}
        />
        <input
          type="range"
          min="1"
          max="20"
          value={lineWidth}
          onChange={(e) => setLineWidth(Number(e.target.value))}
        />
        <button onClick={clearCanvas} className="clear-button">
          Clear
        </button>
        <button onClick={() => Window.getCurrent().close()}>Close</button>
      </div>
      <canvas
        ref={canvasRef}
        onMouseDown={startDrawing}
        onMouseMove={draw}
        onMouseUp={stopDrawing}
        onMouseOut={stopDrawing}
        className="drawing-canvas"
      />
    </div>
  );
}

export default App;
