const drawMainFrame = (x, y, w, h) => {
  const relH = 687.5;
  const relW = 912;
  const smallChamfer = 18;
  const largeChamfer = 32;
  const hexSideLen = 110;
  const borderGap = 12;
  const insRLineX = w * (1 - smallChamfer / relW - borderGap / relW);
  const insBLineY = h - w * largeChamfer / relW;
  const insLLineX = w * (smallChamfer + borderGap) / relW
  const insTLineY = w * (largeChamfer / relW)

  return `
    M ${x + insRLineX} ${y + h * 166 / relH /* inside right border */}
    L ${x + insRLineX} ${y + h * (166 + 58) / relH}
    L ${x + insRLineX - w * smallChamfer / relW} ${y + h * (166 + 58) / relH + w * smallChamfer / relW}
    L ${x + insRLineX - w * smallChamfer / relW} ${y + h * (166 + 58 + hexSideLen) / relH + w * smallChamfer / relW}
    L ${x + insRLineX} ${y + h * (166 + 58 + hexSideLen) / relH + w * 2 * smallChamfer / relW}
    L ${x + insRLineX} ${y + h - w * largeChamfer / relW}
    L ${x + insRLineX} ${y + insBLineY /* bottom border */}
    L ${x + insRLineX - w * (513 / relW)} ${y + insBLineY}
    L ${x + insRLineX - w * (513 + largeChamfer) / relW} ${y + h}
    L ${x + insLLineX} ${y + h /* inside left border */}
    L ${x + insLLineX} ${y + h * (1 - 125 / relH)}
    L ${x + insLLineX + w * smallChamfer / relW} ${y + h * (1 - 125 / relH) - w * smallChamfer / relW}
    L ${x + insLLineX + w * smallChamfer / relW} ${y + h * (1 - (125 + hexSideLen) / relH) - w * smallChamfer / relW}
    L ${x + insLLineX} ${y + h * (1 - (125 + hexSideLen) / relH) - w * 2 * smallChamfer / relW}
    L ${x + insLLineX} ${y + insTLineY /* top border */}
    L ${x + insLLineX + w * 530 / relW} ${y + insTLineY}
    L ${x + insLLineX + w * (530 + largeChamfer) / relW} ${y}
    L ${x + insRLineX + w * borderGap / relW} ${y}
    L ${x + insRLineX + w * borderGap / relW} ${y + h * 224 / relH /* outside right border */}
    L ${x + w} ${y + h * 224 / relH + w * smallChamfer / relW}
    L ${x + w} ${y + h * (224 + hexSideLen) / relH + w * smallChamfer / relW}
    L ${x + insRLineX + w * borderGap / relW} ${y + h * (224 + hexSideLen) / relH + w * 2 * smallChamfer / relW}
    M ${x + insLLineX} ${y + h /* outside left border */}
    L ${x + insLLineX - w * borderGap / relW} ${y + h}
    L ${x + insLLineX - w * borderGap / relW} ${y + h * (1 - 125 / relH)}
    L ${x} ${y + h * (1 - 125 / relH) - w * smallChamfer / relW}
    L ${x} ${y + h * (1 - (125 + hexSideLen) / relH) - w * smallChamfer / relW}
    L ${x + insLLineX - w * borderGap / relW} ${y + h * (1 - (125 + hexSideLen) / relH) - w * 2 * smallChamfer / relW}
  `;
}

function drawAsteroidFrame(x, y, w, h) {
  const chamfer = 32;
  const relH = 192;
  const relW = 238;

  return `
    M ${x + w * chamfer / relW} ${y}
    L ${x + w} ${y}
    L ${x + w} ${y + h * (1 - chamfer / relH)}
    L ${x + w * (1 - chamfer / relW)} ${y + h}
    L ${x} ${y + h}
    L ${x} ${y + h * chamfer / relH}
    Z
  `;
}

const createSVG = (w, h) => {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('width', w);
  svg.setAttribute('height', h);
  svg.setAttribute('viewBox', `0 0 ${w} ${h}`);
  svg.style.position = 'absolute';
  svg.style.inset = '0';
  svg.style.pointerEvents = 'none';
  return svg;
}

const createPath = (d, stroke = '#6dbdaf') => {
  const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  path.setAttribute('fill', 'none');
  path.setAttribute('stroke', stroke);
  path.setAttribute('stroke-width', '2');
  path.setAttribute('d', d);
  return path;
}

const createGradient = (id, h) => {
  const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
  const grad = document.createElementNS('http://www.w3.org/2000/svg', 'linearGradient');
  grad.setAttribute('id', id);
  grad.setAttribute('x1', '0');
  grad.setAttribute('y1', '0');
  grad.setAttribute('x2', '0');
  grad.setAttribute('y2', h);
  grad.setAttribute('gradientUnits', 'userSpaceOnUse');

  const stops = [
    { offset: '0%',   opacity: '1' },
    { offset: '30%',  opacity: '0.25' },
    { offset: '70%',  opacity: '0.25' },
    { offset: '100%', opacity: '1' },
  ];

  stops.forEach(s => {
    const stop = document.createElementNS('http://www.w3.org/2000/svg', 'stop');
    stop.setAttribute('offset', s.offset);
    stop.setAttribute('stop-color', '#6dbdaf');
    stop.setAttribute('stop-opacity', s.opacity);
    grad.appendChild(stop);
  });

  defs.appendChild(grad);
  return defs;
}

const DRAW_DURATION = 0.6;

const fadeIn = (el) => {
  el.style.transition = 'none';
  el.style.opacity = 0;
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      el.style.transition = `opacity ${DRAW_DURATION}s ease-in-out`;
      el.style.opacity = 1;
    });
  });
}

const animatePath = (path) => {
  const length = path.getTotalLength();
  path.style.transition = 'none';
  path.style.strokeDasharray = length;
  path.style.strokeDashoffset = length;
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      path.style.transition = `stroke-dashoffset ${DRAW_DURATION}s ease-in-out`;
      path.style.strokeDashoffset = 0;
    });
  });
  return DRAW_DURATION * 1000;
}

const renderMainFrame = (container) => {
  const { width: w, height: h } = container.getBoundingClientRect();
  container.querySelector(':scope > svg')?.remove();
  const svg = createSVG(w, h);
  svg.appendChild(createGradient('mainFrameGrad', h));
  svg.appendChild(createPath(drawMainFrame(0, 0, w, h), 'url(#mainFrameGrad)'));
  container.appendChild(svg);
}

const renderAsteroidFrame = (container) => {
  const { width: w, height: h } = container.getBoundingClientRect();
  container.querySelector(':scope > svg')?.remove();
  const svg = createSVG(w, h);
  svg.appendChild(createPath(drawAsteroidFrame(0, 0, w, h)));
  container.style.position = 'relative';
  container.appendChild(svg);
}

const appendMainFrame = (container) => {
  renderMainFrame(container);
  const path = container.querySelector(':scope > svg path');
  fadeIn(container);
  return animatePath(path);
}

const appendAsteroidFrame = (container) => {
  renderAsteroidFrame(container);
  const path = container.querySelector(':scope > svg path');
  fadeIn(container);
  animatePath(path);
}

export { appendAsteroidFrame, appendMainFrame, renderMainFrame, renderAsteroidFrame };