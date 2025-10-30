export const sparkleVertexShader = `
  precision highp float;
  attribute float aSize;
  attribute float aSpeed;
  attribute float aPhase;
  attribute float aDrift;
  attribute float aSpin;

  uniform float uTime;
  uniform vec2 uViewport;
  uniform float uPixelRatio;

  varying float vTwinkle;
  varying float vFacing;

  // Simple hash noise
  float hash(float n) { return fract(sin(n) * 43758.5453123); }

  void main() {
    // Start from base position provided by BufferGeometry 'position' attribute (-1..1 logical space)
    vec3 pos = position;

    float t = uTime + aPhase;

    // Horizontal meander drift
    float drift = sin(t * 1.7 + aDrift) * 15.0 + sin(t * 0.9 + aDrift * 1.3) * 8.0;
    pos.x += drift;

    // Subtle Z wobble for parallax
    pos.z += sin(t * 1.1 + aDrift) * 0.2;

    // Convert from logical -1..1 space to clip using projection done by Three
    vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);

    // Face the camera: billboard point size (in pixels) with size attenuation
    float size = aSize;
    gl_PointSize = size * uPixelRatio;

    // Twinkle based on spin + time
    vTwinkle = 0.5 + 0.5 * sin(uTime * aSpin * 2.0 + aPhase * 6.2831);
    vFacing = 1.0;

    gl_Position = projectionMatrix * mvPosition;
  }
`;

export const sparkleFragmentShader = `
  precision highp float;
  uniform vec3 uBaseColor;
  uniform float uAlpha;
  uniform float uMetallic;
  uniform float uGloss;

  varying float vTwinkle;
  varying float vFacing;

  // Radial disc with soft edges rendered from point sprite
  void main() {
    vec2 uv = gl_PointCoord * 2.0 - 1.0; // -1..1
    float r = length(uv);
    // Flake silhouette: a rounded diamond-like shape
    float diamond = pow(abs(uv.x) + abs(uv.y), 0.8);
    float mask = smoothstep(1.0, 0.7, max(r, diamond));

    if (mask <= 0.01) discard;

    // Simple metallic-like highlight using Fresnel-ish term
    float fresnel = pow(1.0 - clamp(dot(normalize(vec3(uv, 1.0)), vec3(0.0, 0.0, 1.0)), 0.0, 1.0), 3.0);
    float spec = mix(0.05, 1.0, uGloss) * fresnel;

    vec3 base = uBaseColor;
    // Twinkle modulates brightness
    float sparkle = mix(0.55, 1.3, vTwinkle);
    vec3 color = base * sparkle + spec * uMetallic;

    float alpha = uAlpha * smoothstep(1.0, 0.2, r) * mix(0.7, 1.0, vFacing);
    gl_FragColor = vec4(color, alpha);
  }
`;


