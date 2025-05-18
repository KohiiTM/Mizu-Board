import React, {
  ChangeEvent,
  useEffect,
  useRef,
  useState,
  KeyboardEvent,
} from "react";

interface TextBoxProps {
  id: string;
  x: number;
  y: number;
  text: string;
  width: number;
  height: number;
  isEditing: boolean;
  isSelected: boolean;
  currentTool: string;
  onTextChange: (e: ChangeEvent<HTMLTextAreaElement>) => void;
  onMouseDown: (e: React.MouseEvent<HTMLDivElement>) => void;
  onMouseMove: () => void;
  onMouseUp: () => void;
  onDoubleClick: () => void;
  onBlur: () => void;
  onColorChange: (color: string) => void;
  onBackgroundColorChange: (color: string) => void;
  onOpacityChange: (opacity: number) => void;
  textColor: string;
  backgroundColor: string;
  opacity: number;
  onResize: (width: number, height: number) => void;
}

const TextBox: React.FC<TextBoxProps> = ({
  id,
  x,
  y,
  text,
  width,
  height,
  isEditing,
  isSelected,
  currentTool,
  onTextChange,
  onMouseDown,
  onMouseMove,
  onMouseUp,
  onDoubleClick,
  onBlur,
  onColorChange,
  onBackgroundColorChange,
  onOpacityChange,
  textColor,
  backgroundColor,
  opacity,
  onResize,
}) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [resizeDirection, setResizeDirection] = useState<string | null>(null);
  const dragStartPos = useRef({ x: 0, y: 0 });
  const initialSize = useRef({ width: 0, height: 0 });

  useEffect(() => {
    if (isEditing && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [isEditing]);

  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (currentTool !== "mouse") return;
    if (e.button === 0) {
      e.stopPropagation();
      setIsDragging(true);
      dragStartPos.current = { x: e.clientX, y: e.clientY };
      onMouseDown(e);
    }
  };

  const handleResizeStart = (
    e: React.MouseEvent<HTMLDivElement>,
    direction: string
  ) => {
    if (currentTool !== "mouse") return;
    e.stopPropagation();
    setIsResizing(true);
    setResizeDirection(direction);
    dragStartPos.current = { x: e.clientX, y: e.clientY };
    initialSize.current = { width, height };
  };

  const handleResizeMove = (e: MouseEvent) => {
    if (!isResizing || !resizeDirection) return;

    const dx = e.clientX - dragStartPos.current.x;
    const dy = e.clientY - dragStartPos.current.y;
    let newWidth = initialSize.current.width;
    let newHeight = initialSize.current.height;

    if (resizeDirection.includes("e"))
      newWidth = Math.max(100, initialSize.current.width + dx);
    if (resizeDirection.includes("w"))
      newWidth = Math.max(100, initialSize.current.width - dx);
    if (resizeDirection.includes("s"))
      newHeight = Math.max(50, initialSize.current.height + dy);
    if (resizeDirection.includes("n"))
      newHeight = Math.max(50, initialSize.current.height - dy);

    onResize(newWidth, newHeight);
  };

  const handleResizeEnd = () => {
    setIsResizing(false);
    setResizeDirection(null);
  };

  useEffect(() => {
    if (isResizing) {
      window.addEventListener("mousemove", handleResizeMove);
      window.addEventListener("mouseup", handleResizeEnd);
    }
    return () => {
      window.removeEventListener("mousemove", handleResizeMove);
      window.removeEventListener("mouseup", handleResizeEnd);
    };
  }, [isResizing]);

  const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (currentTool !== "mouse") return;
    e.stopPropagation();
  };

  const handleDoubleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (currentTool !== "mouse") return;
    e.stopPropagation();
    onDoubleClick();
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Tab") {
      e.preventDefault();
      const start = e.currentTarget.selectionStart;
      const end = e.currentTarget.selectionEnd;
      const newText = text.substring(0, start) + "    " + text.substring(end);
      const event = {
        target: { value: newText },
      } as ChangeEvent<HTMLTextAreaElement>;
      onTextChange(event);

      setTimeout(() => {
        if (textareaRef.current) {
          textareaRef.current.selectionStart =
            textareaRef.current.selectionEnd = start + 4;
        }
      }, 0);
    }
  };

  const handleControlPanelClick = (e: React.MouseEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleControlPanelMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  };

  return (
    <>
      <div
        className={`text-box ${isSelected ? "selected" : ""} ${
          isEditing ? "editing" : ""
        }`}
        style={{
          position: "absolute",
          left: x,
          top: y,
          width,
          height,
          backgroundColor,
          opacity,
          pointerEvents: currentTool === "mouse" ? "auto" : "none",
          cursor: isEditing ? "text" : "grab",
          userSelect: "none",
          touchAction: "none",
          zIndex: isSelected ? 2 : 1,
        }}
        data-id={id}
        onMouseDown={handleMouseDown}
        onClick={handleClick}
        onDoubleClick={handleDoubleClick}
      >
        {isEditing ? (
          <textarea
            ref={textareaRef}
            value={text}
            onChange={onTextChange}
            onKeyDown={handleKeyDown}
            onBlur={onBlur}
            style={{
              width: "100%",
              height: "100%",
              border: "none",
              outline: "none",
              background: "transparent",
              color: textColor,
              fontSize: "14px",
              padding: "4px",
              resize: "none",
              fontFamily: "monospace",
              lineHeight: "1.5",
              whiteSpace: "pre",
              overflow: "auto",
              cursor: "text",
            }}
          />
        ) : (
          <div
            style={{
              width: "100%",
              height: "100%",
              color: textColor,
              fontSize: "14px",
              padding: "4px",
              overflow: "auto",
              whiteSpace: "pre-wrap",
              wordBreak: "break-word",
              fontFamily: "monospace",
              lineHeight: "1.5",
              cursor: "inherit",
            }}
          >
            {text}
          </div>
        )}
        {isSelected && !isEditing && (
          <>
            <div
              className="resize-handle n"
              onMouseDown={(e) => handleResizeStart(e, "n")}
            />
            <div
              className="resize-handle e"
              onMouseDown={(e) => handleResizeStart(e, "e")}
            />
            <div
              className="resize-handle s"
              onMouseDown={(e) => handleResizeStart(e, "s")}
            />
            <div
              className="resize-handle w"
              onMouseDown={(e) => handleResizeStart(e, "w")}
            />
            <div
              className="resize-handle ne"
              onMouseDown={(e) => handleResizeStart(e, "ne")}
            />
            <div
              className="resize-handle nw"
              onMouseDown={(e) => handleResizeStart(e, "nw")}
            />
            <div
              className="resize-handle se"
              onMouseDown={(e) => handleResizeStart(e, "se")}
            />
            <div
              className="resize-handle sw"
              onMouseDown={(e) => handleResizeStart(e, "sw")}
            />
          </>
        )}
      </div>
      {isSelected && (
        <div
          className="text-box-control-panel"
          style={{ left: x + width + 12, top: y }}
          onClick={handleControlPanelClick}
          onMouseDown={handleControlPanelMouseDown}
        >
          <div className="control-group">
            <label>Text Color</label>
            <input
              type="color"
              value={textColor}
              onChange={(e) => onColorChange(e.target.value)}
              title="Text Color"
              onClick={(e) => e.stopPropagation()}
            />
          </div>
          <div className="control-group">
            <label>Background</label>
            <input
              type="color"
              value={backgroundColor}
              onChange={(e) => onBackgroundColorChange(e.target.value)}
              title="Background Color"
              onClick={(e) => e.stopPropagation()}
            />
          </div>
          <div className="control-group">
            <label>Opacity</label>
            <div className="opacity-control">
              <input
                type="range"
                min="0"
                max="1"
                step="0.1"
                value={opacity}
                onChange={(e) => onOpacityChange(parseFloat(e.target.value))}
                onMouseDown={(e) => e.stopPropagation()}
                title="Opacity"
                className="opacity-slider"
              />
              <span className="opacity-value">
                {Math.round(opacity * 100)}%
              </span>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default TextBox;
