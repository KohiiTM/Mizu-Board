# Screen Annotation App

A Tauri-based screen annotation application that allows you to draw, write, and annotate directly on your screen. The application features a transparent window that can be toggled between windowed and fullscreen modes.

## Features

- **Drawing Tools**

  - Pen tool for freehand drawing
  - Eraser tool for removing annotations
  - Adjustable line width
  - Custom color picker
  - Clear canvas functionality

- **Window Management**

  - Resizable window
  - Toggle fullscreen mode (F11 or Ctrl+F)
  - Always-on-top window
  - Transparent background
  - Window decorations for easy management

- **Keyboard Shortcuts**
  - `F11` or `Ctrl+F`: Toggle fullscreen mode
  - `Alt+F4`: Close application (Windows)

## Getting Started

### Prerequisites

- Node.js (v14 or later)
- Rust (latest stable version)
- Tauri CLI

### Installation

1. Clone the repository:

```bash
git clone [repository-url]
cd tauri-app
```

2. Install dependencies:

```bash
npm install
```

3. Run the development server:

```bash
npm run tauri dev
```

### Building

To build the application:

```bash
npm run tauri build
```

The built application will be available in the `src-tauri/target/release` directory.

## Usage

1. **Drawing**

   - Select the Pen tool from the toolbar
   - Choose a color using the color picker
   - Adjust line width using the slider
   - Click and drag to draw

2. **Erasing**

   - Select the Eraser tool from the toolbar
   - Click and drag over areas you want to remove

3. **Clearing**

   - Click the "Clear" button to remove all annotations

4. **Window Management**
   - Drag the window by its title bar
   - Resize using window edges
   - Toggle fullscreen using F11 or Ctrl+F
   - Close using the window close button or toolbar close button

## Development

### Project Structure

```
tauri-app/
├── src/                 # Frontend source code
│   ├── App.tsx         # Main application component
│   └── App.css         # Application styles
├── src-tauri/          # Tauri backend code
│   └── tauri.conf.json # Tauri configuration
└── package.json        # Project dependencies
```

### Key Components

- `App.tsx`: Contains the main application logic, including:

  - Canvas drawing functionality
  - Tool selection
  - Window management
  - Event handling

- `App.css`: Defines the application's styling, including:
  - Transparent background
  - Toolbar layout
  - Button styles
  - Canvas positioning

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgments

- Built with [Tauri](https://tauri.app/)
- React for the frontend
- Canvas API for drawing functionality
