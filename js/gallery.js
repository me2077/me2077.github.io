import PhotoSwipeLightbox from 'https://unpkg.com/photoswipe@5.4.4/dist/photoswipe-lightbox.esm.js';
document.addEventListener('DOMContentLoaded', () => {
  const rc = getComputedStyle(document.body).getPropertyValue('--wallpaper-config').trim().replace(/^['"]|['"]$/g, '');
  if (rc) {
    const sm = rc.match(/([#+@])/);
    let u = rc, ms = '';
    if (sm) {
      const idx = rc.indexOf(sm[0]);
      u = rc.substring(0, idx);
      ms = rc.substring(idx);
    }
    let br = 'no-repeat', bs = 'auto', mk = null, bgc = null, bbm = null, fts = [], op = 1;
    const reg = /([#+@])([^:+#@]+)(?::([^#+@]+))?/g;
    let m;
    while ((m = reg.exec(ms)) !== null) {
      const sym = m[1], k = m[2].trim(), v = m[3] ? m[3].trim() : true;
      if (sym === '#') {
        if (k === 'repeat') { br = 'repeat'; bs = 'auto'; }
        else if (k.startsWith('repeat:')) { br = 'repeat'; bs = v; }
      } else if (sym === '+') {
        if (k === 'mask') mk = `linear-gradient(${v}, ${v})`;
        else if (k === 'color') bgc = v;
        else if (k === 'blend') bbm = v;
        else if (k === 'sat') fts.push(`saturate(${v})`);
        else if (k === 'bright') fts.push(`brightness(${v})`);
        else if (k === 'contrast') fts.push(`contrast(${v})`);
        else if (k === 'gray') fts.push(`grayscale(${v})`);
      } else if (sym === '@') {
        op = !isNaN(k) ? k : v;
      }
    }
    const ers = ms.match(/#repeat:([^#+@]+)/);
    if (ers) { br = 'repeat'; bs = ers[1].trim(); }
    const be = document.body;
    let imgs = [];
    if (mk) imgs.push(mk);
    if (u) imgs.push(`url('${u}')`);
    if (imgs.length) be.style.backgroundImage = imgs.join(', ');
    be.style.backgroundRepeat = br === 'repeat' ? 'repeat' : 'no-repeat';
    be.style.backgroundSize = bs;
    be.style.backgroundAttachment = 'fixed';
    if (bgc) be.style.backgroundColor = bgc;
    if (bbm) be.style.backgroundBlendMode = bbm;
    if (fts.length) be.style.filter = fts.join(' ');
    be.style.opacity = op;
  }
  const fes = document.querySelectorAll('.scroll-transition-fade');
  if ('IntersectionObserver' in window) {
    const obs = new IntersectionObserver((es) => {
      es.forEach(e => {
        if (e.isIntersecting) e.target.classList.remove('below-viewport');
        else if (e.boundingClientRect.top > 0) e.target.classList.add('below-viewport');
      });
    }, { rootMargin: '0px 0px -10% 0px', threshold: 0.1 });
    fes.forEach(el => obs.observe(el));
  } else {
    fes.forEach(el => el.classList.remove('below-viewport'));
  }
  const lb = new PhotoSwipeLightbox({
    gallery: '#gallery--test-padding',
    children: 'a.gallery_card',
    pswpModule: () => import('https://unpkg.com/photoswipe@5.4.4/dist/photoswipe.esm.js'),
    padding: { top: 20, bottom: 20, left: 20, right: 20 },
    close: true,
    zoom: false,
    imageClickAction: 'close',
    bgClickAction: 'close',
    tapAction: 'close',
    doubleTapAction: 'zoom',
    showHideAnimationType: 'zoom',
    bgOpacity: 0.95
  });
  const ID = 1500;
  let it = null, isD = window.matchMedia('(min-width: 1025px)').matches, isH = false;
  function wa() {
    if (!lb.pswp || !lb.pswp.element) return;
    lb.pswp.element.classList.remove('pswp--arrows-idle');
    clearTimeout(it);
    if (!isH) {
      it = setTimeout(() => {
        if (lb.pswp && lb.pswp.element && !isH) lb.pswp.element.classList.add('pswp--arrows-idle');
      }, ID);
    }
  }
  function om() { if (isD) wa(); }
  lb.on('openingAnimationEnd', () => {
    if (!isD) return;
    wa();
    const el = lb.pswp.element;
    el.addEventListener('mousemove', om, { passive: true });
    el.querySelectorAll('.pswp__button--arrow').forEach(a => {
      a.addEventListener('mouseenter', () => { isH = true; wa(); });
      a.addEventListener('mouseleave', () => { isH = false; wa(); });
    });
  });
  lb.on('close', () => {
    clearTimeout(it);
    isH = false;
    if (lb.pswp && lb.pswp.element) {
      lb.pswp.element.classList.remove('pswp--arrows-idle');
      lb.pswp.element.removeEventListener('mousemove', om);
    }
  });
  window.addEventListener('resize', () => { isD = window.matchMedia('(min-width: 1025px)').matches; });
  lb.init();
});
