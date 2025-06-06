# timenest
![logo.png](/build/logo.png)
A powerful productivity app that combines time boxing for daily planning with a Pomodoro timer for task execution. Built with Electron for cross-platform compatibility and a modern, user-friendly interface.
![src1](/readme_resources/src1.png)


## Features

- 📅 **Time Boxing Scheduler**
  - Visual timeline with 24-hour view
  - Drag-and-drop task scheduling
  - Flexible time block management

  ![src2](/readme_resources/src2.png)

- ⏱️ **Advanced Pomodoro Timer**
  - Customizable work duration (1-60 minutes)
  - Adjustable break duration (1-30 minutes)
  - Floating timer window for easy access
  - Timer settings customization
  - Visual and audio notifications

  ![src4](/readme_resources/src4.png)

- ✅ **Task Management**
  - Create, edit, and delete tasks
  - Task priority levels (High, Medium, Low)
  - Task completion tracking
  - Task details and notes
  - Visual task status indicators

  ![src3](/readme_resources/src3.png)

- 🎨 **Modern UI/UX**
  - Dark/Light theme support
  - Responsive design for different screen sizes
  - Custom window controls
  - Smooth animations and transitions
  - Modern glass-morphism design

  ![src4](/readme_resources/src4.png)

- ⚙️ **Customizable Settings**
  - Work/break duration customization
  - Sound notifications toggle
  - System notifications control
  - Dark mode preference
  - Auto-start options for breaks and sessions

## Getting Started

### Prerequisites

- Node.js (v14 or higher)
- npm or yarn

### Installation

1. Clone the repository:
```bash
git clone https://github.com/yourusername/timenest.git
cd timenest
```

2. Install dependencies:
```bash
npm install
```

### Development

To run the app in development mode:
```bash
npm start
```

### Building

To build the app for your platform:
```bash
npm run build
```

This will create platform-specific installers in the `dist` directory.

## Project Structure

```
timenest/
├── src/
│   ├── main/           # Main process files
│   ├── renderer/       # Renderer process files
│   │   ├── scripts/    # Application logic
│   │   ├── styles/     # CSS styles
│   │   └── index.html  # Main window
│   ├── shared/         # Shared utilities and types
│   └── assets/         # Images, sounds, etc.
├── package.json
└── README.md
```

## Technologies

- Electron
- Chart.js (for analytics)
- Electron Store (for data persistence)
- Modern CSS (with CSS variables for theming)
- Native system notifications

## License

MIT 