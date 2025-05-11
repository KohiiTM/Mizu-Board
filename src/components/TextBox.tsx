import React, { ChangeEvent, useEffect, useRef, useState } from "react";

interface TextBoxProps {
  id: string;
  x: number;
  y: number;
  text: string;
  width: number;
  height: number;
  isEditing: boolean;
  isSelected: boolean;
  onTextChange: (e: ChangeEvent<HTMLInputElement>) => void;
  onMouseDown: (e: React.MouseEvent<HTMLDivElement>) => void;
  onMouseMove: (e: React.MouseEvent<HTMLDivElement>) => void;
  onMouseUp: () => void;
  onDoubleClick: () => void;
  onBlur: () => void;
  onColorChange: (color: string) => void;
  onBackgroundColorChange: (color: string) => void;
  textColor: string;
  backgroundColor: string;
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
  onTextChange,
  onMouseDown,
  onMouseMove,
  onMouseUp,
  onDoubleClick,
  onBlur,
  onColorChange,
  onBackgroundColorChange,
  textColor,
  backgroundColor,
}) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [showControls, setShowControls] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isEditing]);

  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.button === 0) {
      // Left click
      e.stopPropagation();
      setIsDragging(true);
      onMouseDown(e);
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (isDragging) {
      e.stopPropagation();
      onMouseMove(e);
    }
  };

  const handleMouseUp = (e: React.MouseEvent<HTMLDivElement>) => {
    if (isDragging) {
      e.stopPropagation();
      setIsDragging(false);
      onMouseUp();
    }
  };

  const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isEditing && !isDragging) {
      e.stopPropagation();
      setShowControls(true);
    }
  };

  const handleDoubleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    e.stopPropagation();
    onDoubleClick();
  };

  return (
    <div
      className={`text-box ${isSelected ? "selected" : ""} ${
        isEditing ? "editing" : ""
      }`}
      style={{
        left: x,
        top: y,
        width,
        height,
        backgroundColor,
      }}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onDoubleClick={handleDoubleClick}
      onClick={handleClick}
    >
      {isEditing ? (
        <input
          ref={inputRef}
          type="text"
          value={text}
          onChange={onTextChange}
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
            overflow: "hidden",
            whiteSpace: "pre-wrap",
            wordBreak: "break-word",
          }}
        >
          {text}
        </div>
      )}
      {showControls && !isEditing && (
        <div className="text-box-controls">
          <input
            type="color"
            value={textColor}
            onChange={(e) => onColorChange(e.target.value)}
            title="Text Color"
          />
          <input
            type="color"
            value={backgroundColor}
            onChange={(e) => onBackgroundColorChange(e.target.value)}
            title="Background Color"
          />
        </div>
      )}
    </div>
  );
};

export default TextBox;
