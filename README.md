# Atom Simulator

A 3D atom simulator built with WebGL (OpenGL ES 2.0) that renders an interactive atomic model with color-coded subatomic particles.

## Particles

| Particle | Color | Description |
|----------|-------|-------------|
| Proton   | Red   | Positive charge, in nucleus |
| Neutron  | Blue  | Neutral, in nucleus |
| Electron | Green | Negative charge, orbiting |

## Features

- **10 elements** from Hydrogen to Iron
- **3D rendering** with Phong shading, specular highlights, and rim glow
- **Interactive camera** - click and drag to orbit, scroll to zoom
- **Adjustable orbit speed** and zoom controls
- **Touch support** for mobile devices
- **No dependencies** - pure WebGL, no build step required

## Usage

Open `index.html` in any modern browser. No server required.

## Controls

- **Click + drag**: Rotate the view
- **Scroll wheel**: Zoom in/out
- **Element dropdown**: Switch between elements
- **Speed slider**: Adjust electron orbit speed
- **Zoom slider**: Fine-tune camera distance
