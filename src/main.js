import { DataManager } from "./dataManager";
import { workData, projectData, aboutData } from "./tempData";
// import { animate, nextAsteroid, prevAsteroid, jumpToAsteroid } from "./points";
import { AsteroidScene } from "./asteroidScene";
import { initChunkTextures } from "./TerrainChunkUtils";
import { appendAsteroidFrame, appendMainFrame, renderMainFrame, renderAsteroidFrame } from "./frames";

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

const typeIn = (el, speed = 40) => {
  const text = el.textContent;
  el.textContent = '';
  el.style.opacity = 1;
  if (!text) return Promise.resolve();
  return new Promise(resolve => {
    [...text].forEach((char, i) => {
      setTimeout(() => {
        el.textContent += char;
        if (i === text.length - 1) resolve();
      }, i * speed);
    });
  });
}

const countUp = (el, duration = 800) => {
  const raw = el.textContent;
  const match = raw.match(/^(\d+)(.*)/s);
  if (!match) return typeIn(el);
  const num = parseInt(match[1]);
  const suffix = match[2];
  const steps = 20;
  const stepTime = duration / steps;
  el.style.opacity = 1;
  return new Promise(resolve => {
    let step = 0;
    const interval = setInterval(() => {
      step++;
      const value = Math.round((step / steps) * num);
      el.textContent = `${String(value).padStart(2, '0')}${suffix}`;
      if (step >= steps) { clearInterval(interval); resolve(); }
    }, stepTime);
  });
}

const fadeInEl = (el, duration = 0.3) => {
  el.style.transition = 'none';
  el.style.height = '';
  el.style.overflow = '';
  el.style.opacity = 0;
  requestAnimationFrame(() => requestAnimationFrame(() => {
    el.style.transition = `opacity ${duration}s ease-in`;
    el.style.opacity = 1;
  }));
}

const loadData = (dataManager) => {
    const data = dataManager.displayCurrent();



    const textbox = document.querySelector(".textbox");
    if (!data) {
      textbox.classList.add("hidden");
      return;
    };

    const title = document.getElementById("textbox-title");
    const initiate = document.getElementById("initiate");
    const initiateNum = document.getElementById("initiate-num");
    const initiateMo = document.getElementById("initiate-mo");
    const initiateYr = document.getElementById("initiate-yr");
    const terminate = document.getElementById("terminate");
    const terminateNum = document.getElementById("terminate-num");
    const terminateMo = document.getElementById("terminate-mo");
    const terminateYr = document.getElementById("terminate-yr");
    const asteroidHighlight = document.querySelector(".asteroid-highlight");
    const asteroidTitle = document.getElementById("asteroid-title");
    const textboxBody = document.querySelector(".textbox-body");
    const backButton = document.getElementById("back-button");
    const prevButton = document.getElementById("prev-button");
    const nextButton = document.getElementById("next-button");

    title.innerText = `${data.position ?? ""}${data.position ? "|" : ""}${data.title}`;

    const startISO = data.start.toISOString().split("T")[0];
    initiate.dateTime = startISO;
    initiateNum.innerText = `${startISO.split("-").at(-1)}|`;
    initiateMo.innerText = data.start.toLocaleString("default", { month: "short" });
    initiateYr.innerText = `${startISO.split("-")[0]}`;

    if (data.end) {
        const endISO = data.end.toISOString().split("T")[0];
        terminate.dateTime = endISO;
        terminateNum.innerText = `${endISO.split("-").at(-2)}|`;
        terminateMo.innerText = data.end.toLocaleString("default", { month: "short" });
        terminateYr.innerText = `${endISO.split("-")[0]}`;
    } else {
        terminate.dateTime = null;
        terminateNum.innerText = "Unknown";
        terminateMo.innerText = "";
        terminateYr.innerText = "";
    }

    asteroidTitle.innerText = `${dataManager.displayType} ${String(dataManager.currentIndex + 1).padStart(2, '0')}`;

    const hgroups = data.points.map((point, idx) => {
        const hgroup = document.createElement("hgroup");
        const p = document.createElement("p");
        const h3 = document.createElement("h3");
        p.innerText = `${String(idx + 1).padStart(2, '0')}`;
        h3.innerText = point;
        p.style.opacity = 0;
        h3.style.opacity = 0;
        hgroup.style.opacity = 0;
        hgroup.style.height = '0';
        hgroup.style.overflow = 'hidden';

        hgroup.appendChild(p);
        hgroup.appendChild(h3);

        return hgroup;
    });

    textboxBody.replaceChildren(...hgroups);

    // TODO: show connect back button to project/experience list
    // backButton.classList.remove("hidden");
    // if (dataManager.displayedData.length === 1) backButton.classList.add("hidden");
    backButton.classList.add("hidden");

    prevButton.disabled = !dataManager.canDisplayPrevious();
    nextButton.disabled = !dataManager.canDisplayNext();

    title.style.opacity = 0;
    initiate.style.opacity = 0;
    terminate.style.opacity = 0;
    initiateNum.style.opacity = 0;
    terminateNum.style.opacity = 0;

    textbox.classList.remove("hidden");
    textbox.querySelector(':scope > svg')?.remove();
    const borderDone = appendMainFrame(textbox);
    asteroidHighlight.querySelector(':scope > svg')?.remove();
    appendAsteroidFrame(asteroidHighlight);

    (async () => {
        await sleep(borderDone + 50);
        await typeIn(title);
        initiate.style.opacity = 1;
        terminate.style.opacity = 1;
        await Promise.all([countUp(initiateNum), countUp(terminateNum)]);
        for (const hg of hgroups) {
            const p = hg.querySelector('p');
            const h3 = hg.querySelector('h3');
            fadeInEl(hg);
            await typeIn(p, 60);
            await typeIn(h3, 25);
        }
    })();

}

document.addEventListener("DOMContentLoaded", async () => {
    await initChunkTextures();
    const scene = new AsteroidScene();
    await scene.addAsteroids();
    scene.setupAnimation();
    scene.animate();
    requestAnimationFrame(() => {
        document.getElementById('scene-container').classList.add('scene-loaded');
    });

    const data = new DataManager(aboutData, workData, projectData);
    console.log(data.about, data.work, data.projects);

    const backButton = document.getElementById("back-button");
    const prevButton = document.getElementById("prev-button");
    const nextButton = document.getElementById("next-button");

    const textbox = document.querySelector(".textbox");

    const isMobile = () => window.innerWidth < 768;

    const pushRoute = (data) => {
        const section = data.displayType;
        if (section === 'home') {
            history.pushState(null, '', '/');
        } else if (data.displayedData.length === 1) {
            history.pushState(null, '', `/${section}`);
        } else {
            history.pushState(null, '', `/${section}/${data.displayCurrent().path}`);
        }
    };

    prevButton.addEventListener("click", async () => {
        console.log("prev clicked");
        data.displayPrevious();
        pushRoute(data);
        textbox.classList.add("hidden");
        if (!isMobile()) await scene.prevAsteroid();
        loadData(data);
    });

    nextButton.addEventListener("click", async () => {
        console.log("next clicked");
        data.displayNext();
        pushRoute(data);
        textbox.classList.add("hidden");
        if (!isMobile()) await scene.nextAsteroid();
        loadData(data);
    });

    document.querySelectorAll('[data-nav]').forEach(link => {
        link.addEventListener('click', async e => {
            e.preventDefault();
            const section = e.currentTarget.dataset.nav;
            data.setDisplay(section);
            pushRoute(data);
            textbox.classList.add("hidden");
            if (!isMobile()) {
                if (section === 'home') {
                    scene.setIdle();
                } else {
                    await scene.jumpToAsteroid(Math.floor(Math.random() * 10));
                }
            }
            loadData(data);
        });
    });

    const burger = document.querySelector('.burger');
    const navUl = document.querySelector('header nav ul');
    burger.addEventListener('click', () => {
        const open = navUl.classList.toggle('open');
        burger.setAttribute('aria-expanded', open);
    });
    navUl.querySelectorAll('a').forEach(a => {
        a.addEventListener('click', () => {
            navUl.classList.remove('open');
            burger.setAttribute('aria-expanded', false);
        });
    });

    const homeLink = document.querySelector("a.title");
    homeLink.addEventListener("click", async e => {
        e.preventDefault();
        data.setDisplay("home");
        pushRoute(data);
        scene.setIdle();
        loadData(data);
    });


    const navigateTo = async (pathname) => {
        const parts = pathname.split('/').filter(Boolean);
        const section = parts[0] || 'home';
        const path = parts[1] || null;

        const validSections = ['home', 'about', 'work', 'projects'];
        if (!validSections.includes(section)) {
            history.replaceState(null, '', '/');
            return;
        }

        let index = 0;
        data.setDisplay(section);
        if (path && data.displayedData) {
            const found = data.displayedData.findIndex(d => d.path === path);
            if (found === -1) {
                history.replaceState(null, '', '/');
                return;
            }
            index = found;
            data.setDisplay(section, index);
        }

        textbox.classList.add("hidden");
        if (!isMobile()) {
            if (section === 'home') {
                scene.setIdle();
            } else {
                await scene.jumpToAsteroid(Math.floor(Math.random() * 10));
            }
        }
        if (section !== 'home') loadData(data);
    };

    window.addEventListener('popstate', () => navigateTo(window.location.pathname));

    await navigateTo(window.location.pathname);

    const asteroidHighlight = document.querySelector(".asteroid-highlight");

    const resizeObserver = new ResizeObserver(() => {
        if (textbox.querySelector(':scope > svg')) renderMainFrame(textbox);
        if (asteroidHighlight.querySelector(':scope > svg')) renderAsteroidFrame(asteroidHighlight);
    });

    resizeObserver.observe(textbox);
    resizeObserver.observe(asteroidHighlight);

});