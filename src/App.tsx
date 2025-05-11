import { useState, useRef, useEffect } from "react";
import { Window, LogicalSize, LogicalPosition } from "@tauri-apps/api/window";
import TextBox from "./components/TextBox";
import DrawingCanvas, { DrawingCanvasRef } from "./components/DrawingCanvas";
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
  const [currentTool, setCurrentTool] = useState<DrawingTool>("mouse");
  const [color, setColor] = useState("#ff0000");
  const [lineWidth, setLineWidth] = useState(2);
  const [isAnnotationMode, setIsAnnotationMode] = useState(false);
  const appWindow = useRef<Window | null>(null);
  const drawingCanvasRef = useRef<DrawingCanvasRef>(null);
  const [textBoxes, setTextBoxes] = useState<TextBox[]>([]);
  const [selectedTextBox, setSelectedTextBox] = useState<string | null>(null);
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
      setTextBoxes([]);
      setSelectedTextBox(null);

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

  useEffect(() => {
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
      window.removeEventListener("keydown", handleKeyPress);
    };
  }, [isAnnotationMode]);

  const getCanvasCoordinates = (
    e: React.MouseEvent<HTMLCanvasElement | HTMLDivElement>
  ) => {
    const target = e.currentTarget;
    const rect = target.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
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

  const handleTextChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!selectedTextBox) return;

    setTextBoxes((prev) =>
      prev.map((box) =>
        box.id === selectedTextBox ? { ...box, text: e.target.value } : box
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
              title="Object Eraser (E) - Click to remove strokes and text boxes"
            >
              Object Eraser
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
              onClick={() => {
                setTextBoxes([]);
                setSelectedTextBox(null);
                drawingCanvasRef.current?.clear();
              }}
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
          <DrawingCanvas
            ref={drawingCanvasRef}
            isAnnotationMode={isAnnotationMode}
            currentTool={currentTool}
            color={color}
            lineWidth={lineWidth}
            onTextBoxCreate={(newTextBox) => {
              setTextBoxes((prev) => [...prev, newTextBox]);
              setSelectedTextBox(newTextBox.id);
              setCurrentTool("mouse");
            }}
            onClear={() => {
              setTextBoxes([]);
              setSelectedTextBox(null);
            }}
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
              currentTool={currentTool}
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
