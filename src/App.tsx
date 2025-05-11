import { useState, useRef, useEffect } from "react";
import { Window, LogicalSize, LogicalPosition } from "@tauri-apps/api/window";
import TextBox from "./components/TextBox";
import "./App.css";

type DrawingTool = "pen" | "eraser" | "text" | "mouse";

interface TextBox {
  id: string;
  x: number;
  y: number;
  text: string;
  width: number;
  height: number;
  isEditing: boolean;
  textColor: string;
  backgroundColor: string;
}

function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentTool, setCurrentTool] = useState<DrawingTool>("pen");
  const [color, setColor] = useState("#ff0000");
  const [lineWidth, setLineWidth] = useState(2);
  const [isAnnotationMode, setIsAnnotationMode] = useState(false);
  const appWindow = useRef<Window | null>(null);
  const [textBoxes, setTextBoxes] = useState<TextBox[]>([]);
  const [selectedTextBox, setSelectedTextBox] = useState<string | null>(null);
  const [isCreatingTextBox, setIsCreatingTextBox] = useState(false);
  const [textBoxStartPos, setTextBoxStartPos] = useState({ x: 0, y: 0 });
  const [isDraggingTextBox, setIsDraggingTextBox] = useState(false);
  const [dragStartPos, setDragStartPos] = useState({ x: 0, y: 0 });

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
      const canvas = canvasRef.current;
      if (!canvas) return null;

      const tempCanvas = document.createElement("canvas");
      tempCanvas.width = canvas.width;
      tempCanvas.height = canvas.height;
      const tempCtx = tempCanvas.getContext("2d");
      if (tempCtx) {
        tempCtx.drawImage(canvas, 0, 0);
      }
      return {
        canvas: tempCanvas,
        textBoxes: textBoxes,
      };
    };

    const resizeCanvas = () => {
      const content = storeCanvasContent();
      if (!content) return;

      const canvas = canvasRef.current;
      if (!canvas) return;

      const dpr = window.devicePixelRatio || 1;
      const rect = canvas.getBoundingClientRect();

      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;

      const ctx = canvas.getContext("2d");
      if (ctx && content.canvas) {
        ctx.scale(dpr, dpr);
        ctx.drawImage(content.canvas, 0, 0);
      }

      // Adjust text box positions based on scale
      const scaleX = canvas.width / content.canvas.width;
      const scaleY = canvas.height / content.canvas.height;

      setTextBoxes((prev) =>
        prev.map((box) => ({
          ...box,
          x: box.x * scaleX,
          y: box.y * scaleY,
          width: box.width * scaleX,
          height: box.height * scaleY,
        }))
      );
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
          case "t":
            setCurrentTool("text");
            break;
          case "m":
            setCurrentTool("mouse");
            break;
          case "c":
            clearCanvas();
            break;
          case "Delete":
            if (selectedTextBox) {
              setTextBoxes((prev) =>
                prev.filter((box) => box.id !== selectedTextBox)
              );
              setSelectedTextBox(null);
            }
            break;
          case "Escape":
            if (selectedTextBox) {
              handleTextBoxBlur(selectedTextBox);
            }
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
    if (!isAnnotationMode || currentTool === "mouse") return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const { x, y } = getCanvasCoordinates(e);

    if (currentTool === "text") {
      setIsCreatingTextBox(true);
      setTextBoxStartPos({ x, y });
      return;
    }

    if (currentTool === "eraser") {
      const clickedTextBox = textBoxes.find(
        (box) =>
          x >= box.x &&
          x <= box.x + box.width &&
          y >= box.y &&
          y <= box.y + box.height
      );
      if (clickedTextBox) {
        setTextBoxes((prev) =>
          prev.filter((box) => box.id !== clickedTextBox.id)
        );
        if (selectedTextBox === clickedTextBox.id) {
          setSelectedTextBox(null);
        }
        return;
      }
    }

    setIsDrawing(true);
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
    if (!isAnnotationMode || currentTool === "mouse") return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const { x, y } = getCanvasCoordinates(e);

    if (isCreatingTextBox && currentTool === "text") {
      // Draw a preview rectangle
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.beginPath();
      ctx.strokeStyle = "#4caf50";
      ctx.lineWidth = 2;
      ctx.setLineDash([5, 5]);
      ctx.strokeRect(
        textBoxStartPos.x,
        textBoxStartPos.y,
        x - textBoxStartPos.x,
        y - textBoxStartPos.y
      );
      ctx.setLineDash([]);
      return;
    }

    if (!isDrawing) return;

    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDrawing = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (isCreatingTextBox && currentTool === "text") {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const { x: mouseX, y: mouseY } = getCanvasCoordinates(e);

      const width = Math.abs(mouseX - textBoxStartPos.x);
      const height = Math.abs(mouseY - textBoxStartPos.y);

      // Ensure minimum size
      const minWidth = 100;
      const minHeight = 20;

      const newTextBox: TextBox = {
        id: Date.now().toString(),
        x: Math.min(textBoxStartPos.x, mouseX),
        y: Math.min(textBoxStartPos.y, mouseY),
        text: "",
        width: Math.max(width, minWidth),
        height: Math.max(height, minHeight),
        isEditing: true,
        textColor: "#000000", // Default to black
        backgroundColor: "#ffffff", // Default to white
      };

      setTextBoxes((prev) => [...prev, newTextBox]);
      setSelectedTextBox(newTextBox.id);
      setIsCreatingTextBox(false);
      setCurrentTool("mouse");

      // Clear the preview rectangle
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      }
      return;
    }

    setIsDrawing(false);
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.globalCompositeOperation = "source-over";
  };

  const handleTextBoxClick = (id: string) => {
    setSelectedTextBox(id);
    setTextBoxes((prev) =>
      prev.map((box) => ({
        ...box,
        isEditing: box.id === id,
      }))
    );
  };

  const handleTextChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!selectedTextBox) return;

    setTextBoxes((prev) =>
      prev.map((box) =>
        box.id === selectedTextBox ? { ...box, text: e.target.value } : box
      )
    );
  };

  const handleTextBoxMouseDown = (
    e: React.MouseEvent<HTMLDivElement>,
    id: string
  ) => {
    if (!isAnnotationMode || currentTool !== "mouse") return;
    e.stopPropagation();

    const { x, y } = getCanvasCoordinates(
      e as unknown as React.MouseEvent<HTMLCanvasElement>
    );
    setIsDraggingTextBox(true);
    setDragStartPos({ x, y });
    setSelectedTextBox(id);
  };

  const handleTextBoxMove = (
    e: React.MouseEvent<HTMLDivElement>,
    id: string
  ) => {
    if (!isAnnotationMode || !isDraggingTextBox || !e.buttons) return;

    const { x, y } = getCanvasCoordinates(
      e as unknown as React.MouseEvent<HTMLCanvasElement>
    );
    const deltaX = x - dragStartPos.x;
    const deltaY = y - dragStartPos.y;

    setTextBoxes((prev) =>
      prev.map((box) =>
        box.id === id
          ? {
              ...box,
              x: box.x + deltaX,
              y: box.y + deltaY,
            }
          : box
      )
    );

    setDragStartPos({ x, y });
  };

  const handleTextBoxMouseUp = () => {
    setIsDraggingTextBox(false);
  };

  const handleTextBoxDoubleClick = (id: string) => {
    if (!isAnnotationMode || currentTool !== "mouse") return;
    setSelectedTextBox(id);
    setTextBoxes((prev) =>
      prev.map((box) => ({
        ...box,
        isEditing: box.id === id,
      }))
    );
  };

  const handleTextBoxBlur = (id: string) => {
    setSelectedTextBox(null);
    setTextBoxes((prev) =>
      prev.map((box) => (box.id === id ? { ...box, isEditing: false } : box))
    );
  };

  const handleTextBoxColorChange = (id: string, color: string) => {
    setTextBoxes((prev) =>
      prev.map((box) => (box.id === id ? { ...box, textColor: color } : box))
    );
  };

  const handleTextBoxBackgroundColorChange = (id: string, color: string) => {
    setTextBoxes((prev) =>
      prev.map((box) =>
        box.id === id ? { ...box, backgroundColor: color } : box
      )
    );
  };

  // Add click outside handler to hide controls
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (isAnnotationMode && currentTool === "mouse") {
        const target = e.target as HTMLElement;
        if (!target.closest(".text-box")) {
          setSelectedTextBox(null);
        }
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isAnnotationMode, currentTool]);

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
              className={currentTool === "mouse" ? "active" : ""}
              onClick={() => setCurrentTool("mouse")}
              title="Mouse Tool (M)"
            >
              Mouse
            </button>
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
            <button
              className={currentTool === "text" ? "active" : ""}
              onClick={() => setCurrentTool("text")}
              title="Text Tool (T)"
            >
              Text
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
        <div className="canvas-container">
          <canvas
            ref={canvasRef}
            onMouseDown={startDrawing}
            onMouseMove={draw}
            onMouseUp={stopDrawing}
            onMouseOut={stopDrawing}
            className="drawing-canvas"
          />
          {textBoxes.map((box) => (
            <TextBox
              key={box.id}
              id={box.id}
              x={box.x}
              y={box.y}
              text={box.text}
              width={box.width}
              height={box.height}
              isEditing={box.isEditing}
              isSelected={selectedTextBox === box.id}
              onTextChange={handleTextChange}
              onMouseDown={(e) => handleTextBoxMouseDown(e, box.id)}
              onMouseMove={(e) => handleTextBoxMove(e, box.id)}
              onMouseUp={handleTextBoxMouseUp}
              onDoubleClick={() => handleTextBoxDoubleClick(box.id)}
              onBlur={() => handleTextBoxBlur(box.id)}
              onColorChange={(color) => handleTextBoxColorChange(box.id, color)}
              onBackgroundColorChange={(color) =>
                handleTextBoxBackgroundColorChange(box.id, color)
              }
              textColor={box.textColor}
              backgroundColor={box.backgroundColor}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default App;
