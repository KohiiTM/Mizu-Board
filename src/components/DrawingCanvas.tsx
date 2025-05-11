import React, { useRef, useEffect, useState } from "react";
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

const DrawingCanvas: React.FC<DrawingCanvasProps> = ({
  isAnnotationMode,
  currentTool,
  color,
  lineWidth,
  onTextBoxCreate,
  onClear,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentStroke, setCurrentStroke] = useState<Point[]>([]);
  const [strokes, setStrokes] = useState<Stroke[]>([]);
  const roughCanvasRef = useRef<RoughCanvas | null>(null);
  const [isCreatingTextBox, setIsCreatingTextBox] = useState(false);
  const [textBoxStartPos, setTextBoxStartPos] = useState({ x: 0, y: 0 });
  const [currentMousePos, setCurrentMousePos] = useState({ x: 0, y: 0 });

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

    ctx.clearRect(0, 0, canvas.width, canvas.height);

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

    if (isCreatingTextBox) {
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
      ctx.setLineDash([]);
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
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isAnnotationMode) return;

    const { x, y } = getCanvasCoordinates(e);
    setCurrentMousePos({ x, y });

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

      const canvas = canvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          redrawStrokes();
        }
      }
      return;
    }

    if (isDrawing && currentTool === "pen") {
      if (currentStroke.length > 0) {
        setStrokes((prev) => [
          ...prev,
          { points: currentStroke, color, width: lineWidth },
        ]);
      }
      setIsDrawing(false);
      setCurrentStroke([]);
    }
  };

  return (
    <canvas
      ref={canvasRef}
      onMouseDown={startDrawing}
      onMouseMove={draw}
      onMouseUp={stopDrawing}
      onMouseOut={stopDrawing}
      className="drawing-canvas"
    />
  );
};

export default DrawingCanvas;
