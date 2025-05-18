import React, {
  useRef,
  useEffect,
  useState,
  forwardRef,
  useImperativeHandle,
} from "react";
import { getStroke } from "perfect-freehand";
import { RoughCanvas } from "roughjs/bin/canvas";

interface Point {
  x: number;
  y: number;
  pressure?: number;
}

interface Stroke {
  points: Point[];
  color: string;
  width: number;
  id: string;
}

interface DrawingCanvasProps {
  isAnnotationMode: boolean;
  currentTool: string;
  color: string;
  lineWidth: number;
  onTextBoxCreate?: (textBox: {
    id: string;
    x: number;
    y: number;
    text: string;
    width: number;
    height: number;
    isEditing: boolean;
    textColor: string;
    backgroundColor: string;
  }) => void;
  onClear?: () => void;
}

export interface DrawingCanvasRef {
  clear: () => void;
}

const DrawingCanvas = forwardRef<DrawingCanvasRef, DrawingCanvasProps>(
  (
    {
      isAnnotationMode,
      currentTool,
      color,
      lineWidth,
      onTextBoxCreate,
      onClear,
    },
    ref
  ) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [isDrawing, setIsDrawing] = useState(false);
    const [currentStroke, setCurrentStroke] = useState<Point[]>([]);
    const [strokes, setStrokes] = useState<Stroke[]>([]);
    const roughCanvasRef = useRef<RoughCanvas | null>(null);
    const [isCreatingTextBox, setIsCreatingTextBox] = useState(false);
    const [textBoxStartPos, setTextBoxStartPos] = useState({ x: 0, y: 0 });
    const [currentMousePos, setCurrentMousePos] = useState({ x: 0, y: 0 });

    useImperativeHandle(ref, () => ({
      clear: () => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        ctx.clearRect(0, 0, canvas.width, canvas.height);
        setStrokes([]);
        setCurrentStroke([]);
        setIsCreatingTextBox(false);
        onClear?.();
      },
    }));

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
        roughCanvasRef.current = new RoughCanvas(canvas);
      }

      const resizeCanvas = () => {
        const dpr = window.devicePixelRatio || 1;
        const rect = canvas.getBoundingClientRect();

        canvas.width = rect.width * dpr;
        canvas.height = rect.height * dpr;

        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.scale(dpr, dpr);
          roughCanvasRef.current = new RoughCanvas(canvas);
          redrawStrokes();
        }
      };

      window.addEventListener("resize", resizeCanvas);
      return () => window.removeEventListener("resize", resizeCanvas);
    }, []);

    useEffect(() => {
      if (!isAnnotationMode) {
        clearCanvas();
      }
    }, [isAnnotationMode]);

    // Add effect to handle tool changes
    useEffect(() => {
      if (currentTool !== "text") {
        setIsCreatingTextBox(false);
        setCurrentMousePos({ x: 0, y: 0 });
        setTextBoxStartPos({ x: 0, y: 0 });

        // Clear the canvas and redraw
        const canvas = canvasRef.current;
        if (canvas) {
          const ctx = canvas.getContext("2d");
          if (ctx) {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.setLineDash([]); // Reset line dash
          }
        }
        redrawStrokes();
      }
    }, [currentTool]);

    const getCanvasCoordinates = (e: React.MouseEvent<HTMLCanvasElement>) => {
      const canvas = canvasRef.current;
      if (!canvas) return { x: 0, y: 0 };

      const rect = canvas.getBoundingClientRect();
      return {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
        pressure: (e as any).pressure || 0.5,
      };
    };

    const clearCanvas = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      ctx.clearRect(0, 0, canvas.width, canvas.height);
      setStrokes([]);
      setCurrentStroke([]);
      setIsCreatingTextBox(false);
      onClear?.();
    };

    const redrawStrokes = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      // Clear the entire canvas
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.setLineDash([]); // Reset line dash

      // Only draw strokes if we're not in text tool mode
      if (currentTool !== "text") {
        strokes.forEach((stroke) => {
          const outlinePoints = getStroke(stroke.points, {
            size: stroke.width,
            thinning: 0.5,
            smoothing: 0.5,
            streamline: 0.5,
          });

          ctx.fillStyle = stroke.color;
          ctx.beginPath();
          ctx.moveTo(outlinePoints[0][0], outlinePoints[0][1]);
          for (let i = 1; i < outlinePoints.length; i++) {
            ctx.lineTo(outlinePoints[i][0], outlinePoints[i][1]);
          }
          ctx.closePath();
          ctx.fill();
        });

        if (currentStroke.length > 0) {
          const outlinePoints = getStroke(currentStroke, {
            size: lineWidth,
            thinning: 0.5,
            smoothing: 0.5,
            streamline: 0.5,
          });

          ctx.fillStyle = color;
          ctx.beginPath();
          ctx.moveTo(outlinePoints[0][0], outlinePoints[0][1]);
          for (let i = 1; i < outlinePoints.length; i++) {
            ctx.lineTo(outlinePoints[i][0], outlinePoints[i][1]);
          }
          ctx.closePath();
          ctx.fill();
        }
      }

      // Only draw textbox outline if we're actively creating one
      if (isCreatingTextBox && currentTool === "text") {
        ctx.beginPath();
        ctx.strokeStyle = "#4caf50";
        ctx.lineWidth = 2;
        ctx.setLineDash([5, 5]);
        ctx.strokeRect(
          textBoxStartPos.x,
          textBoxStartPos.y,
          currentMousePos.x - textBoxStartPos.x,
          currentMousePos.y - textBoxStartPos.y
        );
        ctx.setLineDash([]); // Reset line dash after drawing
      }
    };

    const startDrawing = (e: React.MouseEvent<HTMLCanvasElement>) => {
      if (!isAnnotationMode) return;

      const { x, y } = getCanvasCoordinates(e);
      setCurrentMousePos({ x, y });

      if (currentTool === "text") {
        setIsCreatingTextBox(true);
        setTextBoxStartPos({ x, y });
        return;
      }

      if (currentTool === "pen") {
        setIsDrawing(true);
        setCurrentStroke([{ x, y, pressure: (e as any).pressure || 0.5 }]);
      }

      if (currentTool === "eraser") {
        const eraserPoint = { x, y };
        setStrokes((prev) =>
          prev.filter((stroke) => {
            return !stroke.points.some((p) => {
              const dx = p.x - eraserPoint.x;
              const dy = p.y - eraserPoint.y;
              return Math.sqrt(dx * dx + dy * dy) < lineWidth * 2;
            });
          })
        );
        redrawStrokes();
      }
    };

    const draw = (e: React.MouseEvent<HTMLCanvasElement>) => {
      if (!isAnnotationMode) return;

      const { x, y } = getCanvasCoordinates(e);
      setCurrentMousePos({ x, y });

      // redraw if actively creating a textbox
      if (isCreatingTextBox && currentTool === "text") {
        redrawStrokes();
        return;
      }

      if (isDrawing && currentTool === "pen") {
        setCurrentStroke((prev) => [
          ...prev,
          { x, y, pressure: (e as any).pressure || 0.5 },
        ]);
        redrawStrokes();
      }
    };

    const stopDrawing = (e: React.MouseEvent<HTMLCanvasElement>) => {
      if (isCreatingTextBox && currentTool === "text") {
        const { x: mouseX, y: mouseY } = getCanvasCoordinates(e);
        setCurrentMousePos({ x: mouseX, y: mouseY });

        const width = Math.abs(mouseX - textBoxStartPos.x);
        const height = Math.abs(mouseY - textBoxStartPos.y);

        const minWidth = 100;
        const minHeight = 20;

        const newTextBox = {
          id: Date.now().toString(),
          x: Math.min(textBoxStartPos.x, mouseX),
          y: Math.min(textBoxStartPos.y, mouseY),
          text: "",
          width: Math.max(width, minWidth),
          height: Math.max(height, minHeight),
          isEditing: true,
          textColor: "#000000",
          backgroundColor: "#ffffff",
        };

        onTextBoxCreate?.(newTextBox);
        setIsCreatingTextBox(false);
        setCurrentMousePos({ x: 0, y: 0 });
        setTextBoxStartPos({ x: 0, y: 0 }); // Reset textbox start position

        // Clear the canvas and redraw
        const canvas = canvasRef.current;
        if (canvas) {
          const ctx = canvas.getContext("2d");
          if (ctx) {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.setLineDash([]); // Reset line dash
          }
        }
        redrawStrokes();
        return;
      }

      if (isDrawing && currentTool === "pen") {
        if (currentStroke.length > 0) {
          setStrokes((prev) => [
            ...prev,
            {
              points: currentStroke,
              color,
              width: lineWidth,
              id: Date.now().toString(),
            },
          ]);
        }
        setIsDrawing(false);
        setCurrentStroke([]);
      }
    };

    return (
      <canvas
        ref={canvasRef}
        data-tool={currentTool}
        onMouseDown={startDrawing}
        onMouseMove={draw}
        onMouseUp={stopDrawing}
        onMouseOut={stopDrawing}
        className="drawing-canvas"
      />
    );
  }
);

export default DrawingCanvas;
