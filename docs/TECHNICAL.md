# Technical Documentation

## Architecture Overview

The Screen Annotation App is built using a Tauri + React architecture, combining the power of Rust for system-level operations with React for the user interface.

### Core Technologies

- **Frontend**: React with TypeScript
- **Backend**: Rust (Tauri)
- **Drawing**: HTML5 Canvas API
- **Window Management**: Tauri Window API

## Implementation Details

### Canvas Drawing System

The drawing system is implemented in `App.tsx` using the HTML5 Canvas API. Key components include:

#### Drawing State Management

```typescript
const [isDrawing, setIsDrawing] = useState(false);
const [currentTool, setCurrentTool] = useState<"pen" | "eraser">("pen");
const [color, setColor] = useState("#000000");
const [lineWidth, setLineWidth] = useState(2);
```

#### Drawing Functions

- `startDrawing`: Initializes drawing state and sets up the canvas context
- `draw`: Handles the actual drawing operation
- `stopDrawing`: Cleans up drawing state
- `clearCanvas`: Resets the canvas to its initial state

### Window Management

Window management is handled through the Tauri Window API:

```typescript
import { Window } from "@tauri-apps/api/window";

// Fullscreen toggle
const handleKeyPress = async (e: KeyboardEvent) => {
  if (e.key === "F11" || (e.ctrlKey && e.key === "f")) {
    const window = Window.getCurrent();
    const isFullscreen = await window.isFullscreen();
    await window.setFullscreen(!isFullscreen);
  }
};
```

### Canvas Persistence

The application implements canvas persistence during window resizing:

1. **Content Storage**

```typescript
const storeCanvasContent = () => {
  const canvas = canvasRef.current;
  if (canvas) {
    const tempCanvas = document.createElement("canvas");
    tempCanvas.width = canvas.width;
    tempCanvas.height = canvas.height;
    const tempCtx = tempCanvas.getContext("2d");
    if (tempCtx) {
      tempCtx.drawImage(canvas, 0, 0);
      return tempCanvas;
    }
  }
  return null;
};
```

2. **Content Restoration**

```typescript
const resizeCanvas = () => {
  const canvas = canvasRef.current;
  if (canvas) {
    const storedContent = storeCanvasContent();
    // ... resize logic ...
    if (storedContent) {
      ctx.drawImage(storedContent, 0, 0, canvas.width, canvas.height);
    }
  }
};
```

### Tool System

The application implements a tool system with the following features:

1. **Tool Selection**

```typescript
const handleToolChange = (tool: "pen" | "eraser") => {
  setCurrentTool(tool);
};
```

2. **Tool-Specific Drawing**

```typescript
if (currentTool === "eraser") {
  ctx.globalCompositeOperation = "destination-out";
} else {
  ctx.globalCompositeOperation = "source-over";
}
```

## CSS Architecture

The styling system is implemented in `App.css` with the following key features:

### Transparency System

```css
:root,
html,
body,
#root,
.app-container,
.drawing-canvas {
  background-color: transparent !important;
}
```

### Toolbar Layout

```css
.toolbar {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  background: rgba(0, 0, 0, 0.7);
  padding: 8px;
  display: flex;
  gap: 8px;
  align-items: center;
  z-index: 1000;
}
```

## Performance Considerations

1. **Canvas Optimization**

   - Using `requestAnimationFrame` for smooth drawing
   - Efficient canvas clearing and redrawing
   - Proper cleanup of event listeners

2. **Window Management**
   - Efficient fullscreen toggling
   - Smooth window resizing with content preservation

## Security Considerations

1. **Window Management**

   - Proper window state handling
   - Secure window manipulation through Tauri API

2. **Canvas Operations**
   - Safe canvas context operations
   - Proper cleanup of resources

## Future Improvements

1. **Drawing Features**

   - Add more drawing tools (shapes, text)
   - Implement undo/redo functionality
   - Add layer support

2. **Performance**

   - Implement canvas virtualization for large drawings
   - Add drawing optimization for better performance

3. **User Experience**
   - Add tool presets
   - Implement keyboard shortcuts for all tools
   - Add touch support for mobile devices

## Testing

The application can be tested using the following methods:

1. **Manual Testing**

   - Drawing functionality
   - Window management
   - Tool switching
   - Canvas persistence

2. **Automated Testing**
   - Unit tests for drawing functions
   - Integration tests for window management
   - End-to-end tests for user workflows

## Debugging

Common debugging scenarios and solutions:

1. **Canvas Issues**

   - Check canvas context initialization
   - Verify drawing state management
   - Monitor canvas size changes

2. **Window Management**
   - Verify Tauri window API calls
   - Check window state transitions
   - Monitor event handling

## Contributing Guidelines

When contributing to the project, please follow these guidelines:

1. **Code Style**

   - Follow TypeScript best practices
   - Use consistent naming conventions
   - Document complex functions

2. **Testing**

   - Add tests for new features
   - Update existing tests as needed
   - Verify all functionality works as expected

3. **Documentation**
   - Update README.md for user-facing changes
   - Update TECHNICAL.md for implementation changes
   - Add inline documentation for complex logic
