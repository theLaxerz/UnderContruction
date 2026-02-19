/**
 * WebGL Atom Simulator
 * Renders protons (red), neutrons (blue), and electrons (green)
 * in a physically-inspired 3D atomic model.
 */
(function () {
    'use strict';

    const { mat4, mat3, vec3 } = glMatrix;

    // ─── Element Data ──────────────────────────────────────────────
    // { protons, neutrons, electronShells[] }
    const ELEMENTS = {
        1:  { name: 'Hydrogen',  p: 1,  n: 0,  shells: [1] },
        2:  { name: 'Helium',    p: 2,  n: 2,  shells: [2] },
        3:  { name: 'Lithium',   p: 3,  n: 4,  shells: [2, 1] },
        6:  { name: 'Carbon',    p: 6,  n: 6,  shells: [2, 4] },
        7:  { name: 'Nitrogen',  p: 7,  n: 7,  shells: [2, 5] },
        8:  { name: 'Oxygen',    p: 8,  n: 8,  shells: [2, 6] },
        10: { name: 'Neon',      p: 10, n: 10, shells: [2, 8] },
        11: { name: 'Sodium',    p: 11, n: 12, shells: [2, 8, 1] },
        14: { name: 'Silicon',   p: 14, n: 14, shells: [2, 8, 4] },
        26: { name: 'Iron',      p: 26, n: 30, shells: [2, 8, 14, 2] },
    };

    // ─── Colours ───────────────────────────────────────────────────
    const COLOR_PROTON   = [1.0, 0.27, 0.27];  // red
    const COLOR_NEUTRON  = [0.27, 0.53, 1.0];   // blue
    const COLOR_ELECTRON = [0.27, 1.0, 0.53];   // green

    // ─── Canvas & GL Setup ─────────────────────────────────────────
    const canvas = document.getElementById('glcanvas');
    const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
    if (!gl) {
        document.body.innerHTML = '<h1 style="color:#f44;text-align:center;margin-top:40vh">WebGL is not supported in this browser.</h1>';
        return;
    }

    function resize() {
        canvas.width = window.innerWidth * devicePixelRatio;
        canvas.height = window.innerHeight * devicePixelRatio;
        canvas.style.width = window.innerWidth + 'px';
        canvas.style.height = window.innerHeight + 'px';
        gl.viewport(0, 0, canvas.width, canvas.height);
    }
    window.addEventListener('resize', resize);
    resize();

    // ─── Shaders ───────────────────────────────────────────────────
    const VS_SOURCE = `
        attribute vec3 aPosition;
        attribute vec3 aNormal;

        uniform mat4 uModelView;
        uniform mat4 uProjection;
        uniform mat3 uNormalMatrix;

        varying vec3 vNormal;
        varying vec3 vPosition;

        void main() {
            vec4 mvPos = uModelView * vec4(aPosition, 1.0);
            vPosition = mvPos.xyz;
            vNormal = normalize(uNormalMatrix * aNormal);
            gl_Position = uProjection * mvPos;
        }
    `;

    const FS_SOURCE = `
        precision mediump float;

        varying vec3 vNormal;
        varying vec3 vPosition;

        uniform vec3 uColor;
        uniform vec3 uLightDir;
        uniform float uGlow;

        void main() {
            vec3 N = normalize(vNormal);
            vec3 L = normalize(uLightDir - vPosition);
            vec3 V = normalize(-vPosition);
            vec3 H = normalize(L + V);

            float diff = max(dot(N, L), 0.0);
            float spec = pow(max(dot(N, H), 0.0), 64.0);

            vec3 ambient = 0.15 * uColor;
            vec3 diffuse = 0.7 * diff * uColor;
            vec3 specular = 0.6 * spec * vec3(1.0);

            // Fresnel rim glow
            float rim = 1.0 - max(dot(V, N), 0.0);
            rim = pow(rim, 3.0) * uGlow;
            vec3 rimColor = uColor * rim * 0.8;

            vec3 color = ambient + diffuse + specular + rimColor;
            gl_FragColor = vec4(color, 1.0);
        }
    `;

    // Orbit ring shader
    const VS_RING = `
        attribute vec3 aPosition;
        uniform mat4 uModelView;
        uniform mat4 uProjection;
        void main() {
            gl_Position = uProjection * uModelView * vec4(aPosition, 1.0);
        }
    `;

    const FS_RING = `
        precision mediump float;
        uniform vec3 uColor;
        uniform float uAlpha;
        void main() {
            gl_FragColor = vec4(uColor, uAlpha);
        }
    `;

    function compileShader(type, source) {
        const shader = gl.createShader(type);
        gl.shaderSource(shader, source);
        gl.compileShader(shader);
        if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
            console.error('Shader compile error:', gl.getShaderInfoLog(shader));
            gl.deleteShader(shader);
            return null;
        }
        return shader;
    }

    function createProgram(vsSource, fsSource) {
        const vs = compileShader(gl.VERTEX_SHADER, vsSource);
        const fs = compileShader(gl.FRAGMENT_SHADER, fsSource);
        const prog = gl.createProgram();
        gl.attachShader(prog, vs);
        gl.attachShader(prog, fs);
        gl.linkProgram(prog);
        if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
            console.error('Program link error:', gl.getProgramInfoLog(prog));
            return null;
        }
        return prog;
    }

    const sphereProgram = createProgram(VS_SOURCE, FS_SOURCE);
    const ringProgram = createProgram(VS_RING, FS_RING);

    // Sphere program locations
    const sp = {
        aPosition:    gl.getAttribLocation(sphereProgram, 'aPosition'),
        aNormal:      gl.getAttribLocation(sphereProgram, 'aNormal'),
        uModelView:   gl.getUniformLocation(sphereProgram, 'uModelView'),
        uProjection:  gl.getUniformLocation(sphereProgram, 'uProjection'),
        uNormalMatrix:gl.getUniformLocation(sphereProgram, 'uNormalMatrix'),
        uColor:       gl.getUniformLocation(sphereProgram, 'uColor'),
        uLightDir:    gl.getUniformLocation(sphereProgram, 'uLightDir'),
        uGlow:        gl.getUniformLocation(sphereProgram, 'uGlow'),
    };

    // Ring program locations
    const rp = {
        aPosition:   gl.getAttribLocation(ringProgram, 'aPosition'),
        uModelView:  gl.getUniformLocation(ringProgram, 'uModelView'),
        uProjection: gl.getUniformLocation(ringProgram, 'uProjection'),
        uColor:      gl.getUniformLocation(ringProgram, 'uColor'),
        uAlpha:      gl.getUniformLocation(ringProgram, 'uAlpha'),
    };

    // ─── Sphere Geometry ───────────────────────────────────────────
    function createSphere(latBands, longBands) {
        const positions = [];
        const normals = [];
        const indices = [];

        for (let lat = 0; lat <= latBands; lat++) {
            const theta = lat * Math.PI / latBands;
            const sinT = Math.sin(theta);
            const cosT = Math.cos(theta);

            for (let lon = 0; lon <= longBands; lon++) {
                const phi = lon * 2 * Math.PI / longBands;
                const x = Math.cos(phi) * sinT;
                const y = cosT;
                const z = Math.sin(phi) * sinT;

                normals.push(x, y, z);
                positions.push(x, y, z);
            }
        }

        for (let lat = 0; lat < latBands; lat++) {
            for (let lon = 0; lon < longBands; lon++) {
                const first = lat * (longBands + 1) + lon;
                const second = first + longBands + 1;
                indices.push(first, second, first + 1);
                indices.push(second, second + 1, first + 1);
            }
        }

        const posBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, posBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(positions), gl.STATIC_DRAW);

        const normBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, normBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(normals), gl.STATIC_DRAW);

        const idxBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, idxBuffer);
        gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(indices), gl.STATIC_DRAW);

        return { posBuffer, normBuffer, idxBuffer, count: indices.length };
    }

    const sphereHi = createSphere(24, 24);   // high detail for close particles
    const sphereLo = createSphere(12, 12);   // low detail for electrons

    // ─── Ring Geometry ─────────────────────────────────────────────
    function createRing(radius, segments) {
        const positions = [];
        for (let i = 0; i <= segments; i++) {
            const a = (i / segments) * 2 * Math.PI;
            positions.push(Math.cos(a) * radius, 0, Math.sin(a) * radius);
        }
        const buf = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, buf);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(positions), gl.STATIC_DRAW);
        return { buffer: buf, count: segments + 1 };
    }

    // ─── Drawing helpers ───────────────────────────────────────────
    function drawSphere(viewMatrix, position, radius, color, glow, mesh) {
        gl.useProgram(sphereProgram);

        const modelView = mat4.create();
        mat4.translate(modelView, viewMatrix, position);
        mat4.scale(modelView, modelView, [radius, radius, radius]);

        const normalMatrix = mat3.create();
        mat3.normalFromMat4(normalMatrix, modelView);

        gl.uniformMatrix4fv(sp.uModelView, false, modelView);
        gl.uniformMatrix3fv(sp.uNormalMatrix, false, normalMatrix);
        gl.uniform3fv(sp.uColor, color);
        gl.uniform1f(sp.uGlow, glow);

        gl.bindBuffer(gl.ARRAY_BUFFER, mesh.posBuffer);
        gl.enableVertexAttribArray(sp.aPosition);
        gl.vertexAttribPointer(sp.aPosition, 3, gl.FLOAT, false, 0, 0);

        gl.bindBuffer(gl.ARRAY_BUFFER, mesh.normBuffer);
        gl.enableVertexAttribArray(sp.aNormal);
        gl.vertexAttribPointer(sp.aNormal, 3, gl.FLOAT, false, 0, 0);

        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, mesh.idxBuffer);
        gl.drawElements(gl.TRIANGLES, mesh.count, gl.UNSIGNED_SHORT, 0);
    }

    function drawRing(viewMatrix, radius, tiltX, tiltZ, color, alpha) {
        gl.useProgram(ringProgram);

        const ring = createRing(radius, 128);

        const modelView = mat4.create();
        mat4.copy(modelView, viewMatrix);

        // Apply tilt by building a rotation matrix
        const cosX = Math.cos(tiltX), sinX = Math.sin(tiltX);
        const cosZ = Math.cos(tiltZ), sinZ = Math.sin(tiltZ);
        const rotX = mat4.create();
        rotX[5] = cosX; rotX[6] = sinX; rotX[9] = -sinX; rotX[10] = cosX;
        const rotZ = mat4.create();
        rotZ[0] = cosZ; rotZ[1] = sinZ; rotZ[4] = -sinZ; rotZ[5] = cosZ;

        mat4.multiply(modelView, modelView, rotZ);
        mat4.multiply(modelView, modelView, rotX);

        gl.uniformMatrix4fv(rp.uModelView, false, modelView);
        gl.uniform3fv(rp.uColor, color);
        gl.uniform1f(rp.uAlpha, alpha);

        gl.bindBuffer(gl.ARRAY_BUFFER, ring.buffer);
        gl.enableVertexAttribArray(rp.aPosition);
        gl.vertexAttribPointer(rp.aPosition, 3, gl.FLOAT, false, 0, 0);

        gl.drawArrays(gl.LINE_STRIP, 0, ring.count);
    }

    // mat4.copy helper
    mat4.copy = function (out, a) {
        for (let i = 0; i < 16; i++) out[i] = a[i];
        return out;
    };

    // ─── Nucleus Layout ────────────────────────────────────────────
    // Pack nucleons in a roughly spherical cluster
    function layoutNucleus(protons, neutrons) {
        const total = protons + neutrons;
        const particles = [];
        const spacing = 0.42;

        // Simple sphere packing using golden spiral
        for (let i = 0; i < total; i++) {
            const phi = Math.acos(1 - 2 * (i + 0.5) / total);
            const theta = Math.PI * (1 + Math.sqrt(5)) * i;
            const layer = Math.cbrt((i + 1) / total);
            const r = layer * spacing * Math.cbrt(total) * 0.5;

            const x = r * Math.sin(phi) * Math.cos(theta);
            const y = r * Math.sin(phi) * Math.sin(theta);
            const z = r * Math.cos(phi);

            particles.push({
                pos: [x, y, z],
                isProton: i < protons,
                wobblePhase: Math.random() * Math.PI * 2,
                wobbleSpeed: 0.5 + Math.random() * 1.0,
                wobbleAmp: 0.02 + Math.random() * 0.02,
            });
        }
        return particles;
    }

    // ─── Electron Orbits ───────────────────────────────────────────
    function layoutElectrons(shells) {
        const electrons = [];
        const baseRadius = 2.0;
        shells.forEach((count, shellIdx) => {
            const orbitR = baseRadius + shellIdx * 1.2;
            const tiltX = shellIdx * 0.4 + 0.2;
            const tiltZ = shellIdx * 0.7;
            for (let i = 0; i < count; i++) {
                electrons.push({
                    orbitRadius: orbitR,
                    phase: (i / count) * Math.PI * 2,
                    speed: (1.5 - shellIdx * 0.25),
                    tiltX: tiltX,
                    tiltZ: tiltZ,
                    shellIndex: shellIdx,
                });
            }
        });
        return electrons;
    }

    // ─── Camera ────────────────────────────────────────────────────
    let camRotX = 0.3;
    let camRotY = 0;
    let camDist = 7;
    let dragging = false;
    let lastMouse = { x: 0, y: 0 };

    canvas.addEventListener('mousedown', (e) => {
        dragging = true;
        lastMouse = { x: e.clientX, y: e.clientY };
    });
    window.addEventListener('mouseup', () => dragging = false);
    window.addEventListener('mousemove', (e) => {
        if (!dragging) return;
        const dx = e.clientX - lastMouse.x;
        const dy = e.clientY - lastMouse.y;
        camRotY += dx * 0.008;
        camRotX += dy * 0.008;
        camRotX = Math.max(-Math.PI / 2 + 0.1, Math.min(Math.PI / 2 - 0.1, camRotX));
        lastMouse = { x: e.clientX, y: e.clientY };
    });

    canvas.addEventListener('wheel', (e) => {
        e.preventDefault();
        camDist += e.deltaY * 0.01;
        camDist = Math.max(3, Math.min(20, camDist));
        document.getElementById('zoom').value = camDist;
    }, { passive: false });

    // Touch support
    canvas.addEventListener('touchstart', (e) => {
        if (e.touches.length === 1) {
            dragging = true;
            lastMouse = { x: e.touches[0].clientX, y: e.touches[0].clientY };
        }
    });
    canvas.addEventListener('touchmove', (e) => {
        e.preventDefault();
        if (e.touches.length === 1 && dragging) {
            const dx = e.touches[0].clientX - lastMouse.x;
            const dy = e.touches[0].clientY - lastMouse.y;
            camRotY += dx * 0.008;
            camRotX += dy * 0.008;
            camRotX = Math.max(-Math.PI / 2 + 0.1, Math.min(Math.PI / 2 - 0.1, camRotX));
            lastMouse = { x: e.touches[0].clientX, y: e.touches[0].clientY };
        }
    }, { passive: false });
    canvas.addEventListener('touchend', () => dragging = false);

    // ─── State ─────────────────────────────────────────────────────
    let currentElement = 6;
    let nucleons = [];
    let electrons = [];
    let orbitSpeed = 1.0;

    function buildAtom(atomicNumber) {
        const el = ELEMENTS[atomicNumber];
        if (!el) return;
        currentElement = atomicNumber;
        nucleons = layoutNucleus(el.p, el.n);
        electrons = layoutElectrons(el.shells);
    }

    buildAtom(currentElement);

    // UI bindings
    document.getElementById('element').addEventListener('change', (e) => {
        buildAtom(parseInt(e.target.value));
    });
    document.getElementById('speed').addEventListener('input', (e) => {
        orbitSpeed = parseFloat(e.target.value);
    });
    document.getElementById('zoom').addEventListener('input', (e) => {
        camDist = parseFloat(e.target.value);
    });

    // ─── Render Loop ───────────────────────────────────────────────
    gl.enable(gl.DEPTH_TEST);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    gl.clearColor(0.02, 0.03, 0.06, 1.0);

    const projectionMatrix = mat4.create();
    const viewMatrix = mat4.create();
    let time = 0;

    function render(now) {
        requestAnimationFrame(render);

        const dt = 1 / 60;
        time += dt * orbitSpeed;

        resize();

        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

        // Projection
        const aspect = canvas.width / canvas.height;
        mat4.perspective(projectionMatrix, Math.PI / 4, aspect, 0.1, 100.0);

        // View (orbit camera)
        const eyeX = camDist * Math.sin(camRotY) * Math.cos(camRotX);
        const eyeY = camDist * Math.sin(camRotX);
        const eyeZ = camDist * Math.cos(camRotY) * Math.cos(camRotX);
        mat4.lookAt(viewMatrix, [eyeX, eyeY, eyeZ], [0, 0, 0], [0, 1, 0]);

        // ── Set shared uniforms for sphere program ──
        gl.useProgram(sphereProgram);
        gl.uniformMatrix4fv(sp.uProjection, false, projectionMatrix);
        gl.uniform3fv(sp.uLightDir, [5.0, 8.0, 6.0]);

        // ── Draw Nucleons ──
        nucleons.forEach((n) => {
            const wobble = Math.sin(time * n.wobbleSpeed + n.wobblePhase) * n.wobbleAmp;
            const pos = [
                n.pos[0] + wobble,
                n.pos[1] + wobble * 0.7,
                n.pos[2] + wobble * 0.5
            ];
            const color = n.isProton ? COLOR_PROTON : COLOR_NEUTRON;
            drawSphere(viewMatrix, pos, 0.2, color, 0.5, sphereHi);
        });

        // ── Draw Orbit Rings ──
        gl.useProgram(ringProgram);
        gl.uniformMatrix4fv(rp.uProjection, false, projectionMatrix);

        const el = ELEMENTS[currentElement];
        el.shells.forEach((count, shellIdx) => {
            const r = 2.0 + shellIdx * 1.2;
            const tiltX = shellIdx * 0.4 + 0.2;
            const tiltZ = shellIdx * 0.7;
            drawRing(viewMatrix, r, tiltX, tiltZ, [0.2, 0.5, 0.8], 0.2);
        });

        // ── Draw Electrons ──
        gl.useProgram(sphereProgram);
        gl.uniformMatrix4fv(sp.uProjection, false, projectionMatrix);

        electrons.forEach((e) => {
            const angle = time * e.speed + e.phase;
            // Position on a tilted orbit
            const x = Math.cos(angle) * e.orbitRadius;
            const y0 = 0;
            const z = Math.sin(angle) * e.orbitRadius;

            // Apply tilt
            const cosX = Math.cos(e.tiltX), sinX = Math.sin(e.tiltX);
            const cosZ = Math.cos(e.tiltZ), sinZ = Math.sin(e.tiltZ);

            // Rotate around X
            const y1 = y0 * cosX - z * sinX;
            const z1 = y0 * sinX + z * cosX;
            // Rotate around Z
            const x2 = x * cosZ - y1 * sinZ;
            const y2 = x * sinZ + y1 * cosZ;

            drawSphere(viewMatrix, [x2, y2, z1], 0.12, COLOR_ELECTRON, 1.5, sphereLo);
        });
    }

    requestAnimationFrame(render);
})();
