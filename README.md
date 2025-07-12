# object-detection-website
# Object Detection Web App with TensorFlow.js

![Demo Screenshot](demo-screen<img width="1467" height="747" alt="Screenshot 2025-07-12 at 1 02 12 PM" src="https://github.com/user-attachments/assets/6706a2f6-e814-43a3-94c9-af8b340aecb2" />
shot.png) *Replace with your actual screenshot*

## Overview

A real-time object detection web application that uses TensorFlow.js and the COCO-SSD model to detect people in video streams from your webcam. Features dark/light mode toggle, adjustable confidence thresholds, and resolution settings.

## Features

- 🎭 **Person Detection**: Specifically tuned to detect people with customizable confidence levels
- 🌓 **Dark/Light Mode**: Beautiful UI that adapts to user preference
- ⚡ **Real-time Processing**: Runs entirely in the browser with WebGL acceleration
- 📷 **Image Capture**: Save snapshots of detections
- 📱 **Responsive Design**: Works on both desktop and mobile devices
- 🔧 **Customizable Settings**: Adjust resolution and confidence thresholds

## Live Demo

[View Live Demo](https://saikat-bera04.github.io/object-detection-website/)  
*Replace with your actual GitHub Pages URL*

## Installation

To run locally:

1. Clone the repository:
```bash
git clone https://github.com/saikat-bera04/object-detection-website.git
```
2. Navigate to the project directory:
```bash
cd object-detection-website
```
3. Open `index.html` in your browser

No server required - runs completely client-side!

## How It Works

1. The app loads the TensorFlow.js and COCO-SSD models
2. When you enable webcam access, it starts processing video frames
3. Each frame is analyzed for person detection
4. Detection boxes are drawn around found persons
5. Statistics are updated in real-time

## Technical Stack

- **Frontend**: HTML5, CSS3, JavaScript
- **Machine Learning**: TensorFlow.js, COCO-SSD model
- **UI**: Glassmorphism design with CSS filters
- **Build**: Pure client-side (no build tools required)

## Customization

You can easily modify:
- Detection parameters in `script.js`
- UI colors in the `:root` CSS variables
- Confidence threshold default value
- Supported resolutions

## Deployment

To deploy to GitHub Pages:
1. Push your code to a GitHub repository
2. Go to Repository Settings > Pages
3. Select "Deploy from branch" and choose your main branch
4. Select the `/root` folder
5. Save - your app will be live at `https://username.github.io/repo-name/`

## Troubleshooting

**Webcam not working:**
- Ensure you've granted camera permissions
- Try a different browser (Chrome/Firefox recommended)

**Model not loading:**
- Check your internet connection
- Refresh the page to retry loading the TensorFlow.js model

**Performance issues:**
- Lower the resolution setting
- Increase the confidence threshold
- Close other tabs using heavy resources

## Contributing

Contributions are welcome! Please open an issue or pull request for any:
- Bug fixes
- Performance improvements
- New features
- Documentation updates

## License

MIT License - see [LICENSE](LICENSE) file for details

---

Created with ❤️ by Saikat Bera  
[![GitHub](https://img.shields.io/github/followers/your-username?style=social)](https://github.com/Saikat-Bera04)

*Replace all "Saikat-Bera04" references with your actual GitHub username*
