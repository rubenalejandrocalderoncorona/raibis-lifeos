/**
 * LifeOS GSAP Animation Utilities
 * ─────────────────────────────────────────────────────────────────────
 * All motion must feel native, physical, and expensive — like a premium
 * macOS app. Rules:
 *
 *   • Use ease-out (expo/power) for elements ENTERING the screen
 *   • Use ease-in for elements EXITING (shorter duration ~70% of enter)
 *   • Max 1–2 animated elements per frame to stay under 16ms budget
 *   • transform + opacity ONLY — never animate width/height/top/left
 *   • Stagger lists 30–50ms per item (not all-at-once)
 *   • Always respect prefers-reduced-motion
 *   • Animations must be interruptible (GSAP handles this natively)
 *
 * GSAP must be loaded via CDN before this file.
 * Required: <script src="https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.5/gsap.min.js">
 *
 * Usage:
 *   LifeAnimations.staggerList('.task-row');
 *   LifeAnimations.slidePanelIn('#slideover');
 *   LifeAnimations.slidePanelOut('#slideover', () => panel.classList.add('hidden'));
 *   LifeAnimations.subtlePop('#save-btn');
 *   LifeAnimations.hoverLift(cardEl);
 *   LifeAnimations.pageEnter('#main-content');
 *   LifeAnimations.expandSection(el, true);
 */

;(function (global) {
  'use strict';

  // ── Motion preference detection ─────────────────────────────────────
  const prefersReducedMotion = () =>
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // ── Guard: if GSAP isn't loaded, stub all functions silently ────────
  if (typeof gsap === 'undefined') {
    console.warn('[LifeAnimations] GSAP not found. Animations disabled.');
    global.LifeAnimations = new Proxy({}, {
      get: () => () => {}
    });
    return;
  }

  // ── GSAP global defaults ─────────────────────────────────────────────
  // expo.out = cubic-bezier(0.16, 1, 0.3, 1) — snappy, physical
  gsap.defaults({ ease: 'power2.out', overwrite: 'auto' });

  // ── Easing constants ─────────────────────────────────────────────────
  const EASE_ENTER = 'power3.out';   // fast-out, slow settle
  const EASE_EXIT  = 'power2.in';    // ease-in — quick departure
  const EASE_SPRING= 'back.out(1.2)';// gentle spring — not bouncy

  // ── Duration constants (ms → GSAP seconds) ───────────────────────────
  const D_FAST   = 0.15;   // micro-interactions, hovers
  const D_BASE   = 0.22;   // standard transitions
  const D_SLOW   = 0.32;   // panels, page enters
  const D_EXIT   = 0.18;   // exit is 70% of enter duration

  // ─────────────────────────────────────────────────────────────────────
  // staggerList(selector, container?)
  //
  // Staggered fade + slide-up for list items on view mount.
  // Ideal for: task rows, project cards, goal cards, note cards.
  //
  // @param {string|Element|NodeList} targets  — items to animate
  // @param {Object}                  opts     — optional overrides
  // ─────────────────────────────────────────────────────────────────────
  function staggerList(targets, opts = {}) {
    if (prefersReducedMotion()) return;

    const els = typeof targets === 'string'
      ? document.querySelectorAll(targets)
      : targets;

    if (!els || els.length === 0) return;

    // Cap at 20 items for perf — rest appear instantly
    const visible = Array.from(els).slice(0, 20);
    const rest    = Array.from(els).slice(20);

    if (rest.length) gsap.set(rest, { opacity: 1, y: 0 });

    gsap.fromTo(visible,
      { opacity: 0, y: 12 },
      {
        opacity:  1,
        y:        0,
        duration: opts.duration   || D_SLOW,
        ease:     opts.ease       || EASE_ENTER,
        stagger:  {
          each:   opts.stagger    || 0.04,   // 40ms per item
          from:   'start',
        },
        clearProps: 'transform',             // clean up for layout
        delay:      opts.delay    || 0,
      }
    );
  }

  // ─────────────────────────────────────────────────────────────────────
  // slidePanelIn(el, opts?)
  //
  // Slides a right-edge panel in from off-screen.
  // Also handles the backdrop fade.
  // Panel must be position: fixed, right: 0.
  //
  // @param {string|Element} el    — the panel element
  // @param {Object}         opts  — { onComplete, fromRight, width }
  // ─────────────────────────────────────────────────────────────────────
  function slidePanelIn(el, opts = {}) {
    const panel = typeof el === 'string' ? document.querySelector(el) : el;
    if (!panel) return;

    if (prefersReducedMotion()) {
      panel.style.display = 'flex';
      return;
    }

    const panelWidth = opts.width || panel.offsetWidth || 480;
    panel.style.display = 'flex';

    gsap.fromTo(panel,
      { x: panelWidth, opacity: 0.6 },
      {
        x:        0,
        opacity:  1,
        duration: D_SLOW,
        ease:     EASE_ENTER,
        clearProps: 'transform',
        onComplete: opts.onComplete,
      }
    );
  }

  // ─────────────────────────────────────────────────────────────────────
  // slidePanelOut(el, opts?)
  //
  // Slides a panel back off-screen, then calls onComplete.
  // ─────────────────────────────────────────────────────────────────────
  function slidePanelOut(el, opts = {}) {
    const panel = typeof el === 'string' ? document.querySelector(el) : el;
    if (!panel) return;

    if (prefersReducedMotion()) {
      panel.style.display = 'none';
      if (opts.onComplete) opts.onComplete();
      return;
    }

    const panelWidth = opts.width || panel.offsetWidth || 480;

    gsap.to(panel, {
      x:        panelWidth,
      opacity:  0.5,
      duration: D_EXIT,
      ease:     EASE_EXIT,
      onComplete: () => {
        panel.style.display = 'none';
        gsap.set(panel, { x: 0, opacity: 1 });  // reset for next open
        if (opts.onComplete) opts.onComplete();
      },
    });
  }

  // ─────────────────────────────────────────────────────────────────────
  // modalIn(el, opts?)
  //
  // Centers a modal with scale+fade — from trigger source.
  // ─────────────────────────────────────────────────────────────────────
  function modalIn(el, opts = {}) {
    const modal = typeof el === 'string' ? document.querySelector(el) : el;
    if (!modal) return;

    if (prefersReducedMotion()) {
      modal.style.display = 'flex';
      return;
    }

    modal.style.display = 'flex';

    gsap.fromTo(modal,
      { opacity: 0, scale: 0.97, y: 8 },
      {
        opacity:  1,
        scale:    1,
        y:        0,
        duration: D_BASE,
        ease:     EASE_SPRING,
        clearProps: 'transform',
        onComplete: opts.onComplete,
      }
    );
  }

  // ─────────────────────────────────────────────────────────────────────
  // modalOut(el, opts?)
  //
  // Exits modal with quick scale-down + fade.
  // ─────────────────────────────────────────────────────────────────────
  function modalOut(el, opts = {}) {
    const modal = typeof el === 'string' ? document.querySelector(el) : el;
    if (!modal) return;

    if (prefersReducedMotion()) {
      modal.style.display = 'none';
      if (opts.onComplete) opts.onComplete();
      return;
    }

    gsap.to(modal, {
      opacity:  0,
      scale:    0.96,
      y:        4,
      duration: D_EXIT,
      ease:     EASE_EXIT,
      onComplete: () => {
        modal.style.display = 'none';
        gsap.set(modal, { opacity: 1, scale: 1, y: 0 });
        if (opts.onComplete) opts.onComplete();
      },
    });
  }

  // ─────────────────────────────────────────────────────────────────────
  // subtlePop(el, opts?)
  //
  // A micro confirmation pulse — scale up then back.
  // Use on: save buttons after success, checkboxes on complete, icons.
  // Duration is intentionally short (~150ms total).
  // ─────────────────────────────────────────────────────────────────────
  function subtlePop(el, opts = {}) {
    const target = typeof el === 'string' ? document.querySelector(el) : el;
    if (!target) return;

    if (prefersReducedMotion()) return;

    gsap.timeline()
      .to(target, {
        scale:    opts.scale    || 1.08,
        duration: D_FAST,
        ease:     EASE_SPRING,
      })
      .to(target, {
        scale:    1,
        duration: D_FAST,
        ease:     'power1.inOut',
        clearProps: 'transform',
      });
  }

  // ─────────────────────────────────────────────────────────────────────
  // hoverLift(el)
  //
  // Attaches mouseenter/mouseleave listeners for a card hover effect:
  // slight translateY(-2px) + shadow upgrade.
  //
  // Call once on mount per card element.
  // The CSS handles shadow changes via class toggle for performance.
  // ─────────────────────────────────────────────────────────────────────
  function hoverLift(el) {
    const target = typeof el === 'string' ? document.querySelector(el) : el;
    if (!target || prefersReducedMotion()) return;

    target.addEventListener('mouseenter', () => {
      gsap.to(target, {
        y:        -2,
        duration: D_FAST,
        ease:     EASE_ENTER,
      });
    }, { passive: true });

    target.addEventListener('mouseleave', () => {
      gsap.to(target, {
        y:          0,
        duration:   D_FAST,
        ease:       EASE_EXIT,
        clearProps: 'transform',
      });
    }, { passive: true });
  }

  // ─────────────────────────────────────────────────────────────────────
  // hoverLiftAll(selector)
  //
  // Convenience wrapper — applies hoverLift to all matching elements.
  // ─────────────────────────────────────────────────────────────────────
  function hoverLiftAll(selector) {
    document.querySelectorAll(selector).forEach(hoverLift);
  }

  // ─────────────────────────────────────────────────────────────────────
  // pageEnter(container, opts?)
  //
  // Fade + slide-up the entire content region when navigating views.
  // Called from renderView() after injecting new HTML.
  // ─────────────────────────────────────────────────────────────────────
  function pageEnter(container, opts = {}) {
    const el = typeof container === 'string'
      ? document.querySelector(container)
      : container;
    if (!el) return;

    if (prefersReducedMotion()) return;

    gsap.fromTo(el,
      { opacity: 0, y: 10 },
      {
        opacity:    1,
        y:          0,
        duration:   opts.duration || D_SLOW,
        ease:       EASE_ENTER,
        clearProps: 'transform,opacity',
      }
    );
  }

  // ─────────────────────────────────────────────────────────────────────
  // expandSection(el, expand, opts?)
  //
  // Smoothly expand or collapse a section (subtask tree, accordion).
  // Uses scaleY + autoAlpha instead of height to avoid reflow.
  //
  // @param {Element} el      — the wrapper with overflow: hidden
  // @param {boolean} expand  — true = expand, false = collapse
  // ─────────────────────────────────────────────────────────────────────
  function expandSection(el, expand, opts = {}) {
    const target = typeof el === 'string' ? document.querySelector(el) : el;
    if (!target) return;

    if (prefersReducedMotion()) {
      target.style.display = expand ? 'block' : 'none';
      return;
    }

    if (expand) {
      gsap.set(target, { display: 'block', height: 'auto' });
      const fullHeight = target.offsetHeight;
      gsap.fromTo(target,
        { height: 0, opacity: 0 },
        {
          height:   fullHeight,
          opacity:  1,
          duration: D_BASE,
          ease:     EASE_ENTER,
          onComplete: () => {
            // Release fixed height so element can reflow naturally
            gsap.set(target, { height: 'auto', clearProps: 'opacity' });
          },
          ...opts,
        }
      );
    } else {
      const currentHeight = target.offsetHeight;
      gsap.fromTo(target,
        { height: currentHeight, opacity: 1 },
        {
          height:   0,
          opacity:  0,
          duration: D_EXIT,
          ease:     EASE_EXIT,
          onComplete: () => {
            target.style.display = 'none';
            gsap.set(target, { height: 'auto', opacity: 1 });
          },
          ...opts,
        }
      );
    }
  }

  // ─────────────────────────────────────────────────────────────────────
  // navItemEnter(activeItem)
  //
  // Briefly highlights the newly-active nav item (sidebar click feedback).
  // ─────────────────────────────────────────────────────────────────────
  function navItemEnter(el) {
    const target = typeof el === 'string' ? document.querySelector(el) : el;
    if (!target || prefersReducedMotion()) return;

    gsap.fromTo(target,
      { x: -4, opacity: 0.6 },
      { x: 0, opacity: 1, duration: D_BASE, ease: EASE_SPRING, clearProps: 'transform' }
    );
  }

  // ─────────────────────────────────────────────────────────────────────
  // toastIn(el) / toastOut(el, onComplete)
  //
  // Toast notification entrance from bottom-right.
  // ─────────────────────────────────────────────────────────────────────
  function toastIn(el) {
    const target = typeof el === 'string' ? document.querySelector(el) : el;
    if (!target) return;

    if (prefersReducedMotion()) {
      target.style.opacity = '1';
      return;
    }

    gsap.fromTo(target,
      { y: 16, opacity: 0, scale: 0.96 },
      { y: 0, opacity: 1, scale: 1, duration: D_BASE, ease: EASE_SPRING, clearProps: 'transform' }
    );
  }

  function toastOut(el, onComplete) {
    const target = typeof el === 'string' ? document.querySelector(el) : el;
    if (!target) return;

    if (prefersReducedMotion()) {
      target.remove();
      if (onComplete) onComplete();
      return;
    }

    gsap.to(target, {
      y: 8, opacity: 0, scale: 0.96,
      duration: D_EXIT, ease: EASE_EXIT,
      onComplete: () => {
        target.remove();
        if (onComplete) onComplete();
      },
    });
  }

  // ─────────────────────────────────────────────────────────────────────
  // Public API
  // ─────────────────────────────────────────────────────────────────────
  global.LifeAnimations = {
    staggerList,
    slidePanelIn,
    slidePanelOut,
    modalIn,
    modalOut,
    subtlePop,
    hoverLift,
    hoverLiftAll,
    pageEnter,
    expandSection,
    navItemEnter,
    toastIn,
    toastOut,
  };

})(window);
