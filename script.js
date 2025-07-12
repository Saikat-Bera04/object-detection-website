// DOM Elements
const video = document.getElementById('webcam');
const liveView = document.getElementById('liveView');
const canvas = document.getElementById('canvas');
const downloadLink = document.getElementById('downloadLink');
const captureButton = document.getElementById('captureButton');
const webcamButton = document.getElementById('webcamButton');
const trackingToggle = document.getElementById('trackingToggle');
const confidenceSlider = document.getElementById('confidence');
const confidenceValue = document.getElementById('confidenceValue');
const resolutionSelect = document.getElementById('resolution');
const modelSelect = document.getElementById('model');
const clearHistory = document.getElementById('clearHistory');
const objectCount = document.getElementById('objectCount');
const detectionSpeed = document.getElementById('detectionSpeed');
const fpsCounter = document.getElementById('fpsCounter');
const historyLogs = document.getElementById('historyLogs');
const detectionSound = document.getElementById('detectionSound');
const toggle = document.getElementById('toggle');
const body = document.body;
const loadingProgress = document.getElementById('loadingProgress');
const progressBar = document.querySelector('.progress');
const progressPercent = document.getElementById('progressPercent');

// App State
let model = null;
let children = [];
let isTracking = false;
let trackingHistory = {};
let lastDetectionTime = 0;
let frameCount = 0;
let lastFpsUpdate = 0;
let fps = 0;
let detectionInterval = 100; // ms between detections
let lastDetection = 0;
let isModelLoading = false;

// Initialize the app
function init() {
    // Set initial theme
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
        body.classList.add('dark-mode');
        toggle.checked = true;
    }

    // Event listeners
    toggle.addEventListener('change', toggleTheme);
    webcamButton.addEventListener('click', enableCam);
    captureButton.addEventListener('click', captureImage);
    trackingToggle.addEventListener('click', toggleTracking);
    confidenceSlider.addEventListener('input', updateConfidence);
    resolutionSelect.addEventListener('change', updateResolution);
    modelSelect.addEventListener('change', changeModel);
    clearHistory.addEventListener('click', clearDetectionHistory);

    // Initialize confidence display
    updateConfidence();

    // Start FPS counter
    requestAnimationFrame(updateFpsCounter);
}

// Theme toggle
function toggleTheme() {
    if (this.checked) {
        body.classList.add('dark-mode');
    } else {
        body.classList.remove('dark-mode');
    }
}

// Load model with progress indicator
async function loadModelWithProgress() {
    if (isModelLoading) return;
    isModelLoading = true;
    
    // Show loading started
    loadingProgress.classList.remove('hidden');
    progressPercent.textContent = '0%';
    
    // Start fake progress
    let fakeProgress = 0;
    const progressInterval = setInterval(() => {
        fakeProgress += Math.random() * 10;
        if (fakeProgress >= 80) clearInterval(progressInterval);
        progressBar.style.width = `${fakeProgress}%`;
        progressPercent.textContent = `${Math.floor(fakeProgress)}%`;
    }, 200);
    
    try {
        // Load the selected model
        const modelType = modelSelect.value;
        if (modelType === 'lite_mobilenet_v2') {
            model = await cocoSsd.load({
                base: 'lite_mobilenet_v2'
            });
        } else {
            model = await cocoSsd.load();
        }
        
        // Complete progress
        clearInterval(progressInterval);
        progressBar.style.width = '100%';
        progressPercent.textContent = '100%';
        setTimeout(() => loadingProgress.classList.add('hidden'), 500);
        
        addHistoryLog(`${modelType === 'lite_mobilenet_v2' ? 'Lite MobileNet' : 'COCO-SSD'} model loaded`);
    } catch (err) {
        console.error('Model loading failed:', err);
        loadingProgress.innerHTML = '<p style="color: red;">Model failed to load. Please refresh.</p>';
        throw err;
    } finally {
        isModelLoading = false;
    }
}

// Change model
async function changeModel() {
    try {
        await loadModelWithProgress();
    } catch (err) {
        console.error('Error changing model:', err);
    }
}

// Ensure model is loaded before enabling webcam
async function ensureModelLoaded() {
    if (model) return true;
    
    try {
        await loadModelWithProgress();
        return true;
    } catch (err) {
        console.error('Model loading failed:', err);
        return false;
    }
}

// Update confidence threshold
function updateConfidence() {
    const value = parseFloat(confidenceSlider.value);
    confidenceValue.textContent = `${Math.round(value * 100)}%`;
}

// Update resolution
function updateResolution() {
    if (video.srcObject) {
        const resolution = resolutionSelect.value.split('x');
        const constraints = {
            video: {
                width: { ideal: parseInt(resolution[0]) },
                height: { ideal: parseInt(resolution[1]) },
                facingMode: 'environment'
            }
        };

        const stream = video.srcObject;
        const tracks = stream.getVideoTracks();
        tracks[0].applyConstraints(constraints)
            .then(() => {
                addHistoryLog(`Resolution changed to ${resolutionSelect.value}`);
            })
            .catch(err => {
                console.error('Error applying constraints:', err);
            });
    }
}

// Toggle object tracking
function toggleTracking() {
    isTracking = !isTracking;
    trackingToggle.innerHTML = `<i class="fas fa-crosshairs"></i> Tracking: ${isTracking ? 'ON' : 'OFF'}`;
    trackingToggle.style.background = isTracking ? 
        'linear-gradient(45deg, var(--green), var(--dark-green))' : 
        'linear-gradient(45deg, var(--cyan), var(--blue))';
    
    // Clear previous tracking history
    trackingHistory = {};
    
    addHistoryLog(`Object tracking ${isTracking ? 'enabled' : 'disabled'}`);
}

// Enable webcam
async function enableCam() {
    if (!await ensureModelLoaded()) {
        alert('Model failed to load. Please check your connection and refresh.');
        return;
    }
    
    // Hide the button
    webcamButton.classList.add('removed');
    captureButton.disabled = false;

    // Webcam constraints
    const resolution = resolutionSelect.value.split('x');
    const constraints = {
        video: {
            width: { ideal: parseInt(resolution[0]) },
            height: { ideal: parseInt(resolution[1]) },
            facingMode: 'environment'
        }
    };

    try {
        const stream = await navigator.mediaDevices.getUserMedia(constraints);
        video.srcObject = stream;
        video.addEventListener('loadeddata', () => {
            // Set canvas dimensions to match video
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            predictWebcam();
        });
        addHistoryLog('Webcam enabled');
    } catch (err) {
        console.error('Webcam error:', err);
        webcamButton.classList.remove('removed');
        webcamButton.textContent = 'Enable Webcam Failed';
        addHistoryLog('Webcam access denied', 'error');
    }
}

// Capture image with detections
function captureImage() {
    if (!video.srcObject) return;

    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    // Draw detections
    for (let i = 0; i < children.length; i++) {
        if (children[i].classList.contains('highlighter')) {
            const style = children[i].style;
            ctx.strokeStyle = '#00FF00';
            ctx.lineWidth = 2;
            ctx.setLineDash([5, 5]);
            ctx.strokeRect(
                parseFloat(style.left),
                parseFloat(style.top),
                parseFloat(style.width),
                parseFloat(style.height)
            );
            
            // Find corresponding label
            if (children[i+1] && children[i+1].classList.contains('object-label')) {
                const labelStyle = children[i+1].style;
                const labelText = children[i+1].textContent;
                
                ctx.fillStyle = 'rgba(0, 100, 0, 0.8)';
                ctx.fillRect(
                    parseFloat(labelStyle.left),
                    parseFloat(labelStyle.top) - 20,
                    ctx.measureText(labelText).width + 10,
                    20
                );
                
                ctx.fillStyle = 'white';
                ctx.font = '12px Arial';
                ctx.fillText(
                    labelText,
                    parseFloat(labelStyle.left) + 5,
                    parseFloat(labelStyle.top) - 5
                );
            }
        }
    }

    // Create download link
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    canvas.toBlob(function(blob) {
        const url = URL.createObjectURL(blob);
        downloadLink.href = url;
        downloadLink.download = `detection-${timestamp}.png`;
        downloadLink.click();
        setTimeout(() => URL.revokeObjectURL(url), 100);
    }, 'image/png', 0.9);

    addHistoryLog('Image captured and downloaded');
}

// Predict objects in webcam stream
async function predictWebcam() {
    if (!model || !video.srcObject) return;

    const now = performance.now();
    
    // Throttle detections to reduce CPU usage
    if (now - lastDetection < detectionInterval) {
        requestAnimationFrame(predictWebcam);
        return;
    }
    lastDetection = now;

    // Store current time for FPS calculation
    const startTime = performance.now();

    try {
        const predictions = await model.detect(video);
        
        // Calculate detection time
        const endTime = performance.now();
        const detectTime = endTime - startTime;
        detectionSpeed.textContent = `${Math.round(detectTime)} ms`;
        
        // Remove previous detections
        for (let i = 0; i < children.length; i++) {
            liveView.removeChild(children[i]);
        }
        children = [];
        
        // Process new detections
        const confidenceThreshold = parseFloat(confidenceSlider.value);
        const objectCounts = {};
        
        for (let i = 0; i < predictions.length; i++) {
            if (predictions[i].score >= confidenceThreshold) {
                // Count objects
                const className = predictions[i].class;
                objectCounts[className] = (objectCounts[className] || 0) + 1;
                
                // Create green highlight box
                const highlighter = document.createElement('div');
                highlighter.className = 'highlighter';
                highlighter.style = `left: ${predictions[i].bbox[0]}px; 
                                   top: ${predictions[i].bbox[1]}px; 
                                   width: ${predictions[i].bbox[2]}px; 
                                   height: ${predictions[i].bbox[3]}px;`;
                
                // Create label
                const label = document.createElement('div');
                label.className = 'object-label';
                label.textContent = `${predictions[i].class} - ${Math.round(predictions[i].score * 100)}%`;
                label.style = `left: ${predictions[i].bbox[0]}px; 
                             top: ${predictions[i].bbox[1] - 25}px;`;
                
                liveView.appendChild(highlighter);
                liveView.appendChild(label);
                children.push(highlighter);
                children.push(label);
                
                // Object tracking
                if (isTracking) {
                    trackObject(predictions[i], i);
                }
            }
        }
        
        // Update object count
        objectCount.textContent = Object.values(objectCounts).reduce((a, b) => a + b, 0);
        
        // Add to history if new objects detected
        if (Object.keys(objectCounts).length > 0) {
            const timestamp = new Date().toLocaleTimeString();
            const objectsList = Object.entries(objectCounts)
                .map(([obj, count]) => `${count} ${obj}`)
                .join(', ');
            addHistoryLog(`Detected: ${objectsList} at ${timestamp}`);
        }
        
    } catch (err) {
        console.error('Detection error:', err);
    }
    
    // Continue detection loop
    requestAnimationFrame(predictWebcam);
}

// Track objects between frames
function trackObject(prediction, id) {
    const centerX = prediction.bbox[0] + prediction.bbox[2] / 2;
    const centerY = prediction.bbox[1] + prediction.bbox[3] / 2;
    
    if (trackingHistory[id]) {
        // Draw line from previous position
        const line = document.createElement('div');
        line.className = 'tracking-line';
        
        const prevPos = trackingHistory[id];
        const dx = centerX - prevPos.x;
        const dy = centerY - prevPos.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        const angle = Math.atan2(dy, dx);
        
        line.style = `left: ${prevPos.x}px; 
                     top: ${prevPos.y}px; 
                     width: ${distance}px; 
                     height: 2px; 
                     transform-origin: 0 0; 
                     transform: rotate(${angle}rad);`;
        
        liveView.appendChild(line);
        children.push(line);
    }
    
    // Update tracking history
    trackingHistory[id] = {
        x: centerX,
        y: centerY,
        class: prediction.class,
        timestamp: Date.now()
    };
    
    // Clean up old tracking data
    const now = Date.now();
    Object.keys(trackingHistory).forEach(id => {
        if (now - trackingHistory[id].timestamp > 1000) {
            delete trackingHistory[id];
        }
    });
}

// Add entry to detection history
function addHistoryLog(message, type = 'info') {
    const logEntry = document.createElement('div');
    logEntry.className = `log-entry ${type}`;
    
    const timestamp = new Date().toLocaleTimeString();
    logEntry.innerHTML = `
        <span class="log-message">${message}</span>
        <span class="log-time">${timestamp}</span>
    `;
    
    historyLogs.prepend(logEntry);
    
    // Limit history to 50 entries
    if (historyLogs.children.length > 50) {
        historyLogs.removeChild(historyLogs.lastChild);
    }
}

// Clear detection history
function clearDetectionHistory() {
    historyLogs.innerHTML = '';
    addHistoryLog('Detection history cleared');
}

// Update FPS counter
function updateFpsCounter(timestamp) {
    frameCount++;
    
    if (timestamp >= lastFpsUpdate + 1000) {
        fps = Math.round((frameCount * 1000) / (timestamp - lastFpsUpdate));
        fpsCounter.textContent = fps;
        frameCount = 0;
        lastFpsUpdate = timestamp;
    }
    // Add this to your existing script.js

// Update the predictWebcam function
async function predictWebcam() {
    if (!model || !video.srcObject) return;

    const now = performance.now();
    if (now - lastDetection < detectionInterval) {
        requestAnimationFrame(predictWebcam);
        return;
    }
    lastDetection = now;

    try {
        const predictions = await model.detect(video);
        
        // Clear previous detections
        for (let i = 0; i < children.length; i++) {
            liveView.removeChild(children[i]);
        }
        children = [];
        
        const confidenceThreshold = parseFloat(confidenceSlider.value);
        const objectCounts = {};
        
        for (let i = 0; i < predictions.length; i++) {
            if (predictions[i].score >= confidenceThreshold) {
                const className = predictions[i].class;
                objectCounts[className] = (objectCounts[className] || 0) + 1;
                
                const bbox = predictions[i].bbox;
                
                // Create highlight box
                const highlighter = document.createElement('div');
                highlighter.className = 'highlighter';
                highlighter.style.cssText = `
                    left: ${bbox[0]}px;
                    top: ${bbox[1]}px;
                    width: ${bbox[2]}px;
                    height: ${bbox[3]}px;
                `;
                
                // Create label
                const label = document.createElement('div');
                label.className = 'object-label';
                label.textContent = `${className} - ${Math.round(predictions[i].score * 100)}%`;
                label.style.cssText = `
                    left: ${bbox[0]}px;
                    top: ${bbox[1]}px;
                `;
                
                liveView.appendChild(highlighter);
                liveView.appendChild(label);
                children.push(highlighter);
                children.push(label);
                
                if (isTracking) {
                    trackObject(predictions[i], i, bbox[0] + bbox[2]/2, bbox[1] + bbox[3]/2);
                }
            }
        }
        
        objectCount.textContent = Object.values(objectCounts).reduce((a, b) => a + b, 0);
        
        if (Object.keys(objectCounts).length > 0) {
            const timestamp = new Date().toLocaleTimeString();
            const objectsList = Object.entries(objectCounts)
                .map(([obj, count]) => `${count} ${obj}`)
                .join(', ');
            addHistoryLog(`Detected: ${objectsList} at ${timestamp}`);
        }
        
    } catch (err) {
        console.error('Detection error:', err);
    }
    
    requestAnimationFrame(predictWebcam);
}

// Update trackObject function
function trackObject(prediction, id, centerX, centerY) {
    if (trackingHistory[id]) {
        const line = document.createElement('div');
        line.className = 'tracking-line';
        
        const prevPos = trackingHistory[id];
        const dx = centerX - prevPos.x;
        const dy = centerY - prevPos.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        const angle = Math.atan2(dy, dx);
        
        line.style.cssText = `
            left: ${prevPos.x}px;
            top: ${prevPos.y}px;
            width: ${distance}px;
            transform: rotate(${angle}rad);
        `;
        
        liveView.appendChild(line);
        children.push(line);
    }
    
    trackingHistory[id] = {
        x: centerX,
        y: centerY,
        class: prediction.class,
        timestamp: Date.now()
    };
    
    const now = Date.now();
    Object.keys(trackingHistory).forEach(id => {
        if (now - trackingHistory[id].timestamp > 1000) {
            delete trackingHistory[id];
        }
    });
}
        
    

// Update trackObject function
function trackObject(prediction, id, centerX, centerY) {
    if (trackingHistory[id]) {
        const line = document.createElement('div');
        line.className = 'tracking-line';
        
        const prevPos = trackingHistory[id];
        const dx = centerX - prevPos.x;
        const dy = centerY - prevPos.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        const angle = Math.atan2(dy, dx);
        
        line.style = `left: ${prevPos.x}px; 
                     top: ${prevPos.y}px; 
                     width: ${distance}px; 
                     transform: rotate(${angle}rad);`;
        
        liveView.appendChild(line);
        children.push(line);
    }
    
    trackingHistory[id] = {
        x: centerX,
        y: centerY,
        class: prediction.class,
        timestamp: Date.now()
    };
    
    const now = Date.now();
    Object.keys(trackingHistory).forEach(id => {
        if (now - trackingHistory[id].timestamp > 1000) {
            delete trackingHistory[id];
        }
    });
}

// Update theme toggle to switch GIFs
function toggleTheme() {
    const lightGif = document.getElementById('lightGif');
    const darkGif = document.getElementById('darkGif');
    
    if (this.checked) {
        body.classList.add('dark-mode');
        lightGif.classList.remove('active');
        darkGif.classList.add('active');
    } else {
        body.classList.remove('dark-mode');
        darkGif.classList.remove('active');
        lightGif.classList.add('active');
    }
}

// Initialize GIFs on load
function initGifs() {
    const lightGif = document.getElementById('lightGif');
    const darkGif = document.getElementById('darkGif');
    
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
        darkGif.classList.add('active');
        lightGif.classList.remove('active');
    } else {
        lightGif.classList.add('active');
        darkGif.classList.remove('active');
    }
}

// Update your init function
function init() {
    initGifs();
    
    // Set initial theme
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
        body.classList.add('dark-mode');
        toggle.checked = true;
    }

    // Rest of your init code...
}
    requestAnimationFrame(updateFpsCounter);
}

// Initialize the app when DOM is loaded
document.addEventListener('DOMContentLoaded', init);
