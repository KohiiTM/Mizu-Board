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
  opacity: number;
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
      const { availWidth, availHeight } = window.screen;

      // maximum available screen size
      await appWindow.current.setSize(new LogicalSize(availWidth, availHeight));
      await appWindow.current.setPosition(new LogicalPosition(0, 0));
      await appWindow.current.setDecorations(false);
      await appWindow.current.setIgnoreCursorEvents(false);
      await appWindow.current.setFocus();
    } else {
      setTextBoxes([]);
      setSelectedTextBox(null);

      const { availWidth } = window.screen;
      const x = (availWidth - 400) / 2;
      await appWindow.current.setSize(new LogicalSize(400, 60));
      await appWindow.current.setPosition(new LogicalPosition(x, 20));
      await appWindow.current.setIgnoreCursorEvents(true);
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
          case "Backspace":
            if (selectedTextBox) {
              const selectedBox = textBoxes.find(
                (box) => box.id === selectedTextBox
              );
              if (selectedBox && !selectedBox.isEditing) {
                e.preventDefault();
                setTextBoxes((prev) =>
                  prev.filter((box) => box.id !== selectedTextBox)
                );
                setSelectedTextBox(null);
              }
            }
            break;
          case "Escape":
            if (selectedTextBox) {
              e.preventDefault();
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
  }, [isAnnotationMode, selectedTextBox, textBoxes]);

  const handleTextBoxMouseDown = (
    e: React.MouseEvent<HTMLDivElement>,
    id: string
  ) => {
    if (!isAnnotationMode || currentTool !== "mouse") return;
    e.stopPropagation();

    const box = textBoxes.find((b) => b.id === id);
    if (!box) return;

    const mouseX = e.clientX;
    const mouseY = e.clientY;
    const boxX = box.x;
    const boxY = box.y;

    setSelectedTextBox(id);

    const handleMouseMove = (e: MouseEvent) => {
      const deltaX = e.clientX - mouseX;
      const deltaY = e.clientY - mouseY;

      setTextBoxes((prev) =>
        prev.map((b) =>
          b.id === id
            ? {
                ...b,
                x: boxX + deltaX,
                y: boxY + deltaY,
              }
            : b
        )
      );
    };

    const handleMouseUp = () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
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

  const handleTextBoxOpacityChange = (id: string, opacity: number) => {
    setTextBoxes((prev) =>
      prev.map((box) => (box.id === id ? { ...box, opacity } : box))
    );
  };

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    if (!selectedTextBox) return;

    setTextBoxes((prev) =>
      prev.map((box) =>
        box.id === selectedTextBox ? { ...box, text: e.target.value } : box
      )
    );
  };

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (isAnnotationMode && currentTool === "mouse") {
        const target = e.target as HTMLElement;
        if (
          !target.closest(".text-box") &&
          !target.closest(".text-box-control-panel")
        ) {
          setSelectedTextBox(null);
        }
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isAnnotationMode, currentTool]);

  const handleTextBoxResize = (id: string, width: number, height: number) => {
    setTextBoxes((prevBoxes) =>
      prevBoxes.map((box) => (box.id === id ? { ...box, width, height } : box))
    );
  };

  return (
    <div className={`app-container ${isAnnotationMode ? "active" : ""}`}>
      <div className={`toolbar ${isAnnotationMode ? "active" : ""}`}>
        <button
          className={`toggle-mode ${isAnnotationMode ? "active" : ""}`}
          onClick={toggleAnnotationMode}
          title="Toggle Annotation Mode (Alt + A)"
        >
          {isAnnotationMode ? "Exit Annotation" : "Annotate Screen"}
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
              setTextBoxes((prev) => [
                ...prev,
                { ...newTextBox, opacity: 0.5 },
              ]);
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
              onDoubleClick={() => handleTextBoxDoubleClick(box.id)}
              onBlur={() => handleTextBoxBlur(box.id)}
              onColorChange={(color) => handleTextBoxColorChange(box.id, color)}
              onBackgroundColorChange={(color) =>
                handleTextBoxBackgroundColorChange(box.id, color)
              }
              onOpacityChange={(opacity) =>
                handleTextBoxOpacityChange(box.id, opacity)
              }
              textColor={box.textColor}
              backgroundColor={box.backgroundColor}
              opacity={box.opacity}
              onResize={(width, height) =>
                handleTextBoxResize(box.id, width, height)
              }
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default App;
