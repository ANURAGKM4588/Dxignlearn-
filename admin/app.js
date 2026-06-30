const {
  useState,
  useEffect,
  useRef
} = React;

// --- 3D CANVAS COMPONENTS ---

// --- 3D CANVAS COMPONENTS ---

// ── SCROLL-DRIVEN SEQUENCE CONSTANTS ────────────────────────────────────
const TOTAL_FRAMES = 184;
const frameUrl = n => `../public/Images/heropage/ezgif-frame-${String(n).padStart(3, '0')}.webp`;
const SCENE_FRAMES = [0, 45, 91, 137, 183]; // 0-indexed corresponding to frame 1, 46, 92, 138, 184
const CRITICAL_FRAMES = [1, 46, 92, 138]; // 1-indexed critical frames for initial load

// ── HERO SCENES DATA ────────────────────────────────────────────────────
const HERO_SCENES_DATA = [{
  badge: '🚀 Best AI Courses Online',
  line1: 'MASTER AI-POWERED',
  line2: 'CREATIVE SKILLS.',
  sub: 'Learn AI graphic design, filmmaking, website creation, UI/UX design, and content marketing with industry-focused online courses. Pre-recorded lessons built for students, freelancers, entrepreneurs, and professionals using the latest AI tools.'
}, {
  badge: '🎨 AI Graphic Design Course',
  line1: 'DESIGN WITH',
  line2: 'AI.',
  sub: 'Create professional logos, brand identities, social media creatives, advertisements, and marketing assets using modern AI design workflows with tools like Midjourney and Adobe Firefly.',
  tags: ['Midjourney', 'Adobe Firefly', 'Photoshop AI', 'Canva AI'],
  courseName: 'AI Graphic Design Mastery',
  duration: '6 Weeks',
  price: '₹1,500',
  themeColor: '#10b981',
  themeGrad: 'linear-gradient(90deg, #10b981, #a855f7)'
}, {
  badge: '🎬 AI Filmmaking Course',
  line1: 'CREATE CINEMATIC',
  line2: 'VIDEOS.',
  sub: 'Learn cinematic storytelling, AI video generation, editing, voiceovers, visual effects, and content production for social media and business using Runway ML, Kling AI, and more.',
  tags: ['Runway ML', 'Kling AI', 'HeyGen', 'Premiere Pro'],
  courseName: 'AI Filmmaking & Video Production',
  duration: '8 Weeks',
  price: '₹2,500',
  themeColor: '#ec4899',
  themeGrad: 'linear-gradient(90deg, #ec4899, #a855f7)'
}, {
  badge: '🎯 Start Learning AI Online',
  line1: 'BUILD A',
  line2: 'FUTURE-READY CAREER.',
  sub: 'Get instant access to practical online AI courses. Master the skills, tools, and strategies needed to lead the next generation of AI-powered businesses and careers.'
}];
const HeroSection = ({
  handleGeneralEnroll,
  navigateToSection,
  enrollModal,
  theaterVideo,
  isAdminOpen,
  showIosModal,
  isStudentOpen,
  mobileMenuOpen,
  isBlogOpen
}) => {
  const containerRef = useRef(null);
  const canvasRef = useRef(null);
  const textRefs = useRef([]);
  const imagesRef = useRef([]);
  const currentFrameRef = useRef(0);
  const frameTweenRef = useRef(null);
  const isAnimatingRef = useRef(false);
  const [activeScene, setActiveScene] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [progress, setProgress] = useState(0);
  const renderStaggeredText = (text, baseDelay, active, extraClass = '') => {
    if (!text) return null;
    const words = text.split(' ');
    return words.map((word, wordIdx) => {
      const delay = baseDelay + wordIdx * 0.12;
      return /*#__PURE__*/React.createElement("span", {
        key: wordIdx,
        className: `inline-block mr-[0.25em] last:mr-0 ${extraClass}`,
        style: {
          transform: active ? 'translateY(0px) skewY(0deg) scale(1)' : 'translateY(16px) skewY(3deg) scale(0.95)',
          opacity: active ? 1 : 0,
          transition: active ? `transform 0.5s cubic-bezier(0.16, 1, 0.3, 1) ${delay}s, opacity 0.5s cubic-bezier(0.16, 1, 0.3, 1) ${delay}s` : 'transform 0.2s cubic-bezier(0.16, 1, 0.3, 1) 0s, opacity 0.2s cubic-bezier(0.16, 1, 0.3, 1) 0s',
          display: 'inline-block'
        }
      }, word);
    });
  };
  const setScrollLock = lock => {
    const header = document.querySelector('header');
    if (lock) {
      const sbWidth = window.innerWidth - document.documentElement.clientWidth;
      document.body.style.overflow = 'hidden';
      document.documentElement.style.overflow = 'hidden';
      if (sbWidth > 0) {
        document.body.style.paddingRight = `${sbWidth}px`;
        if (header) {
          header.style.right = `${sbWidth}px`;
        }
      }
    } else {
      document.body.style.overflow = '';
      document.documentElement.style.overflow = '';
      document.body.style.paddingRight = '';
      if (header) {
        header.style.right = '';
      }
    }
  };

  // Draw a frame — cover-fit centered on canvas
  const drawFrame = index => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const images = imagesRef.current;
    let img = images[index];

    // O(1) Cache Fast Path: Check if exact target frame image is fully loaded and complete
    if (!(img && img.complete && img.naturalWidth > 0)) {
      img = null;
      let closestDist = Infinity;
      // Scan for closest loaded frame as fallback
      for (let i = 0; i < TOTAL_FRAMES; i++) {
        const tempImg = images[i];
        if (tempImg && tempImg.complete && tempImg.naturalWidth > 0) {
          const dist = Math.abs(i - index);
          if (dist < closestDist) {
            closestDist = dist;
            img = tempImg;
          }
        }
      }
    }
    if (!img) {
      // Fallback: draw a dark gradient background when frames are not available
      const cw = canvas.width || window.innerWidth;
      const ch = canvas.height || window.innerHeight;
      canvas.width = cw;
      canvas.height = ch;
      const grad = ctx.createRadialGradient(cw * 0.5, ch * 0.4, 0, cw * 0.5, ch * 0.4, Math.max(cw, ch) * 0.8);
      grad.addColorStop(0, '#0a0a1a');
      grad.addColorStop(0.5, '#050510');
      grad.addColorStop(1, '#010108');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, cw, ch);
      return;
    }
    const cw = canvas.width;
    const ch = canvas.height;
    const iw = img.naturalWidth;
    const ih = img.naturalHeight;

    // Cover-fit calculation
    const scale = Math.max(cw / iw, ch / ih);
    const dw = iw * scale;
    const dh = ih * scale;

    // Calculate dynamic horizontal focus point on mobile to center the active subject
    let dx;
    if (cw < 768) {
      let focusX = 0.5;
      if (index <= 45) {
        // Scene 0 (Sofa Guy @ 0.46) to Scene 1 (Laptop Guy @ 0.65)
        const t = index / 45;
        focusX = 0.46 + t * (0.65 - 0.46);
      } else if (index <= 91) {
        // Scene 1 (Laptop Guy @ 0.65) to Scene 2 (Phone Guy @ 0.83)
        const t = (index - 45) / (91 - 45);
        focusX = 0.65 + t * (0.83 - 0.65);
      } else if (index <= 137) {
        // Scene 2 (Phone Guy @ 0.83) to Scene 3 (Sofa/Laptop @ 0.65)
        const t = (index - 91) / (137 - 91);
        focusX = 0.83 + t * (0.65 - 0.83);
      } else {
        // Scene 3 to Scene 4 (Center @ 0.50)
        const t = Math.min(1, (index - 137) / (183 - 137));
        focusX = 0.65 + t * (0.50 - 0.65);
      }
      dx = cw * focusX - dw * focusX;
    } else {
      // Standard centering on desktop
      dx = (cw - dw) / 2;
    }
    const dy = (ch - dh) / 2;
    ctx.clearRect(0, 0, cw, ch);
    ctx.drawImage(img, dx, dy, dw, dh);
  };

  // Preload images
  useEffect(() => {
    const images = [];
    for (let i = 1; i <= TOTAL_FRAMES; i++) {
      images.push(null);
    }
    imagesRef.current = images;
    let criticalLoadedCount = 0;
    const totalCritical = CRITICAL_FRAMES.length;

    // Safety net: force-dismiss loader after 3s even if frames never load/error
    const safetyTimer = setTimeout(() => {
      setProgress(100);
      setIsLoading(false);
    }, 3000);
    const onCriticalFrameLoad = imgElement => {
      const proceed = () => {
        criticalLoadedCount++;
        setProgress(Math.min(100, Math.round(criticalLoadedCount / totalCritical * 100)));
        if (criticalLoadedCount >= totalCritical) {
          clearTimeout(safetyTimer);
          // Draw initial frame
          drawFrame(0);
          setTimeout(() => {
            setIsLoading(false);
          }, 600);
          loadBackgroundFrames();
        }
      };

      // Optimize rendering smoothness: pre-decode image off the main thread
      if (imgElement && typeof imgElement.decode === 'function') {
        imgElement.decode().then(proceed).catch(proceed);
      } else {
        proceed();
      }
    };

    // Load critical frames first
    CRITICAL_FRAMES.forEach(frameNum => {
      const img = new Image();
      img.src = frameUrl(frameNum);
      img.onload = () => onCriticalFrameLoad(img);
      img.onerror = () => onCriticalFrameLoad(null);
      images[frameNum - 1] = img;
    });

    // Load remaining frames in background
    const loadBackgroundFrames = () => {
      for (let i = 1; i <= TOTAL_FRAMES; i++) {
        if (CRITICAL_FRAMES.includes(i)) continue;
        const img = new Image();
        img.src = frameUrl(i);
        img.onload = ((index, imageElement) => {
          return () => {
            // Async image decode in browser background thread to prevent scroll layout freezing
            if (typeof imageElement.decode === 'function') {
              imageElement.decode().then(() => {
                images[index] = imageElement;
                if (Math.abs(index - currentFrameRef.current) < 2) {
                  drawFrame(Math.round(currentFrameRef.current));
                }
              }).catch(() => {
                images[index] = imageElement;
                if (Math.abs(index - currentFrameRef.current) < 2) {
                  drawFrame(Math.round(currentFrameRef.current));
                }
              });
            } else {
              images[index] = imageElement;
              if (Math.abs(index - currentFrameRef.current) < 2) {
                drawFrame(Math.round(currentFrameRef.current));
              }
            }
          };
        })(i - 1, img);
      }
    };
  }, []);

  // Handle canvas resizing for crispness
  useEffect(() => {
    const handleResize = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      drawFrame(Math.round(currentFrameRef.current));
    };
    window.addEventListener('resize', handleResize);
    if (!isLoading) {
      handleResize();
    }
    return () => window.removeEventListener('resize', handleResize);
  }, [isLoading]);

  // Initialize canvas size when loading completes
  useEffect(() => {
    if (!isLoading && canvasRef.current) {
      const canvas = canvasRef.current;
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      drawFrame(0);
    }
  }, [isLoading]);

  // Save scroll position before page unload
  useEffect(() => {
    const savePos = () => {
      const y = window.scrollY;
      if (y > 0) sessionStorage.setItem('dxign_scroll_pos', String(y));
    };
    window.addEventListener('beforeunload', savePos);
    window.addEventListener('pagehide', savePos);
    return () => {
      window.removeEventListener('beforeunload', savePos);
      window.removeEventListener('pagehide', savePos);
    };
  }, []);

  // Restore scroll position when loading completes
  useEffect(() => {
    if (!isLoading) {
      const saved = sessionStorage.getItem('dxign_scroll_pos');
      if (saved) {
        const pos = parseInt(saved, 10);
        sessionStorage.removeItem('dxign_scroll_pos');
        if (pos > window.innerHeight * 0.8) {
          setActiveScene(4);
          setScrollLock(false);
          if (window.lenis) window.lenis.start();
          currentFrameRef.current = SCENE_FRAMES[4];
          if (canvasRef.current) drawFrame(SCENE_FRAMES[4]);
          requestAnimationFrame(() => requestAnimationFrame(() => {
            window.scrollTo(0, pos);
          }));
        } else {
          window.scrollTo(0, pos);
        }
      }
    }
  }, [isLoading]);

  // Register global unpin and reset functions
  useEffect(() => {
    window.unpinHero = () => {
      if (activeScene >= 4) return;
      setActiveScene(4);
      isAnimatingRef.current = true;
      gsap.killTweensOf([canvasRef.current, textRefs.current, containerRef.current]);
      if (frameTweenRef.current) frameTweenRef.current.kill();

      // Dissolve Glass UI elements
      gsap.to(['.hero-controls', '.hero-scroll-cue'], {
        opacity: 0,
        duration: 0.5,
        ease: 'power2.out'
      });

      // Unlock body scroll immediately
      setScrollLock(false);
      if (window.lenis) window.lenis.start();

      // Perform a small scroll offset to trigger native scroll handoff
      window.scrollTo(0, 10);

      // Cool-down duration to protect transition from immediate scroll-up repinning
      setTimeout(() => {
        isAnimatingRef.current = false;
      }, 1000);
    };
    window.goToHeroStart = () => {
      if (isAnimatingRef.current) return;
      isAnimatingRef.current = true;
      window.isReturningToHome = true;

      // 1. Kill active animations
      gsap.killTweensOf([canvasRef.current, textRefs.current, containerRef.current]);
      if (frameTweenRef.current) frameTweenRef.current.kill();
      const finalizeGoToStart = () => {
        // Force active scene back to 0 (Intro)
        setActiveScene(0);

        // Lock body scroll and stop Lenis smooth scrolling
        setScrollLock(true);
        if (window.lenis) window.lenis.stop();

        // Fade controls back in
        gsap.to(['.hero-controls', '.hero-scroll-cue'], {
          opacity: 1,
          duration: 0.5,
          ease: 'power2.out'
        });

        // Scrub frames back to Scene 0
        const frameObj = {
          val: currentFrameRef.current
        };
        frameTweenRef.current = gsap.to(frameObj, {
          val: SCENE_FRAMES[0],
          duration: 0.8,
          ease: 'power2.out',
          onUpdate: () => {
            currentFrameRef.current = frameObj.val;
            drawFrame(Math.round(frameObj.val));
          },
          onComplete: () => {
            isAnimatingRef.current = false;
            window.isReturningToHome = false;
          }
        });
      };

      // 2. Perform fast scroll to top using Lenis if available
      if (window.lenis && window.scrollY > 0) {
        window.lenis.scrollTo(0, {
          duration: 1.0,
          force: true,
          lock: false,
          onComplete: finalizeGoToStart
        });
      } else {
        window.scrollTo(0, 0);
        finalizeGoToStart();
      }
    };
    return () => {
      delete window.unpinHero;
      delete window.goToHeroStart;
    };
  }, [activeScene]);

  // Wheel and touch lock handlers using GSAP Observer (unifies wheel + touch)
  useEffect(() => {
    const isModalActive = !!enrollModal || !!theaterVideo || !!isAdminOpen || !!showIosModal || !!isStudentOpen || !!mobileMenuOpen || !!isBlogOpen;
    if (isModalActive) {
      return;
    }

    // After hero section, release scroll and let native scrolling take over
    if (activeScene >= 4) {
      setScrollLock(false);
      if (window.lenis && window.innerWidth >= 1024) window.lenis.start();
      return;
    }

    // Active hero scenes: lock scroll and register observer
    setScrollLock(true);
    if (window.lenis && window.innerWidth >= 1024) window.lenis.stop();
    const observer = ScrollTrigger.observe({
      target: window,
      type: ['wheel', 'touch'],
      onUp: self => {
        if (isAnimatingRef.current) return;
        const isTouch = self.event && (self.event.type && self.event.type.startsWith('touch') || self.event.pointerType && self.event.pointerType === 'touch' || self.event.pointerType && self.event.pointerType === 'pen' || self.event.type && self.event.type.startsWith('pointer') && self.event.pointerType !== 'mouse') || !self.event && (window.matchMedia('(pointer: coarse)').matches || navigator.maxTouchPoints > 0);
        if (isTouch) {
          if (activeScene < 4) {
            goToScene(activeScene + 1);
          }
        } else {
          if (activeScene > 0) {
            goToScene(activeScene - 1);
          }
        }
      },
      onDown: self => {
        if (isAnimatingRef.current) return;
        const isTouch = self.event && (self.event.type && self.event.type.startsWith('touch') || self.event.pointerType && self.event.pointerType === 'touch' || self.event.pointerType && self.event.pointerType === 'pen' || self.event.type && self.event.type.startsWith('pointer') && self.event.pointerType !== 'mouse') || !self.event && (window.matchMedia('(pointer: coarse)').matches || navigator.maxTouchPoints > 0);
        if (isTouch) {
          if (activeScene > 0) {
            goToScene(activeScene - 1);
          }
        } else {
          if (activeScene < 4) {
            goToScene(activeScene + 1);
          }
        }
      },
      preventDefault: () => true
    });
    return () => {
      observer.kill();
    };
  }, [activeScene, enrollModal, theaterVideo, isAdminOpen, showIosModal, isStudentOpen, mobileMenuOpen, isBlogOpen]);

  // Background drift Ken Burns effect
  useEffect(() => {
    if (isLoading || activeScene >= 4 || !canvasRef.current) return;

    // Animate a subtle Ken Burns pan & zoom drift on the canvas element itself
    const drift = gsap.to(canvasRef.current, {
      scale: 1.05,
      x: 12,
      y: 6,
      duration: 20,
      repeat: -1,
      yoyo: true,
      ease: 'sine.inOut'
    });
    return () => {
      drift.kill();
    };
  }, [activeScene, isLoading]);

  // Native scroll listener for Scene 4 (unpinned scrolling)
  useEffect(() => {
    if (activeScene < 4) return;
    let ticking = false;
    const handleScroll = () => {
      if (document.body.getAttribute('data-modal-active') === 'true') {
        return;
      }
      if (!ticking) {
        window.requestAnimationFrame(() => {
          const sy = window.scrollY;
          const vh = window.innerHeight;

          // Map scroll progress to the final image sequence frames (137 to 183)
          const progress = Math.min(1, Math.max(0, sy / vh));
          const frameIdx = SCENE_FRAMES[3] + progress * (SCENE_FRAMES[4] - SCENE_FRAMES[3]);
          currentFrameRef.current = frameIdx;
          drawFrame(Math.round(frameIdx));

          // If scrolled back to top, trigger re-pinning (bypass if returning to home)
          if (sy <= 3 && !isAnimatingRef.current && !window.isReturningToHome) {
            goToScene(3);
          }
          ticking = false;
        });
        ticking = true;
      }
    };
    window.addEventListener('scroll', handleScroll, {
      passive: true
    });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [activeScene]);
  const goToScene = nextIdx => {
    if (nextIdx < 0 || nextIdx > 4) return;
    if (nextIdx === activeScene) return;
    const currentIdx = activeScene;
    setActiveScene(nextIdx);
    isAnimatingRef.current = true;
    transitionToScene(currentIdx, nextIdx);
  };
  const transitionToScene = (fromIdx, toIdx) => {
    // Kill active tweens
    gsap.killTweensOf([canvasRef.current, textRefs.current, containerRef.current]);
    if (frameTweenRef.current) frameTweenRef.current.kill();

    // Background transition: scrub frames using GSAP
    if (toIdx < 4) {
      const frameObj = {
        val: currentFrameRef.current
      };
      frameTweenRef.current = gsap.to(frameObj, {
        val: SCENE_FRAMES[toIdx],
        duration: 1.2,
        ease: 'power2.out',
        onUpdate: () => {
          currentFrameRef.current = frameObj.val;
          drawFrame(Math.round(frameObj.val));
        }
      });

      // Sweep glow streak across the screen
      gsap.fromTo('.hero-glow-streak', {
        xPercent: -120
      }, {
        xPercent: 120,
        duration: 1.3,
        ease: 'power2.inOut'
      });
    }

    // Exit state transition (Unpinning)
    if (toIdx === 4) {
      // Fade out controls
      gsap.to(['.hero-controls', '.hero-scroll-cue'], {
        opacity: 0,
        duration: 0.4
      });

      // Unlock body scroll immediately
      setScrollLock(false);
      if (window.lenis) window.lenis.start();

      // Perform a small scroll offset to trigger native scroll handoff
      window.scrollTo(0, 10);
    }

    // Re-pinning from Scene 4 (scroll back up to scene 3)
    if (fromIdx === 4 && toIdx === 3) {
      // Lock body scroll
      setScrollLock(true);
      if (window.lenis) window.lenis.stop();

      // Reset window scroll to top
      window.scrollTo(0, 0);

      // Fade controls back in
      gsap.to(['.hero-controls', '.hero-scroll-cue'], {
        opacity: 1,
        duration: 0.5
      });

      // Scrub frames back to Scene 3
      const frameObj = {
        val: currentFrameRef.current
      };
      frameTweenRef.current = gsap.to(frameObj, {
        val: SCENE_FRAMES[3],
        duration: 0.8,
        ease: 'power2.out',
        onUpdate: () => {
          currentFrameRef.current = frameObj.val;
          drawFrame(Math.round(frameObj.val));
        },
        onComplete: () => {
          isAnimatingRef.current = false;
        }
      });
    }

    // Cool-down duration matching transition
    setTimeout(() => {
      isAnimatingRef.current = false;
    }, 1000);
  };
  if (isLoading) {
    return /*#__PURE__*/React.createElement("section", {
      className: "fixed inset-0 bg-[#020202] flex flex-col items-center justify-center z-[999]"
    }, /*#__PURE__*/React.createElement("div", {
      className: "relative w-10 h-10 mb-10"
    }, /*#__PURE__*/React.createElement("div", {
      className: "absolute inset-0 rounded-full",
      style: {
        border: '1px solid rgba(255,255,255,0.06)'
      }
    }), /*#__PURE__*/React.createElement("div", {
      className: "absolute inset-0 rounded-full animate-spin",
      style: {
        animationDuration: '1.2s',
        animationTimingFunction: 'linear',
        borderTop: '1px solid #00f0ff',
        borderRight: '1px solid rgba(0,240,255,0.15)',
        borderBottom: '1px solid transparent',
        borderLeft: '1px solid transparent',
        filter: 'drop-shadow(0 0 4px rgba(0,240,255,0.6))'
      }
    })), /*#__PURE__*/React.createElement("span", {
      className: "text-[9px] font-mono uppercase mb-5",
      style: {
        color: 'rgba(255,255,255,0.15)',
        letterSpacing: '0.35em'
      }
    }, "DXIGN LEARN"), /*#__PURE__*/React.createElement("span", {
      className: "text-[11px] font-mono tabular-nums",
      style: {
        color: 'rgba(0,240,255,0.4)',
        letterSpacing: '0.15em'
      }
    }, String(progress).padStart(3, '0')));
  }
  return /*#__PURE__*/React.createElement("div", {
    ref: containerRef,
    id: "hero-container",
    className: "relative w-full h-screen bg-[#050505] overflow-hidden select-none",
    style: {
      zIndex: 40
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "absolute inset-0 z-0 bg-black"
  }, /*#__PURE__*/React.createElement("canvas", {
    ref: canvasRef,
    className: "absolute inset-0 w-full h-full object-cover",
    style: {
      width: '100%',
      height: '100%',
      background: '#050505',
      display: 'block'
    }
  })), /*#__PURE__*/React.createElement("div", {
    className: "absolute inset-0 pointer-events-none z-10",
    style: {
      background: 'linear-gradient(to right, rgba(3,3,3,0.92) 0%, rgba(3,3,3,0.6) 48%, rgba(3,3,3,0.1) 100%)'
    }
  }), /*#__PURE__*/React.createElement("div", {
    className: "absolute inset-0 pointer-events-none z-10",
    style: {
      background: 'linear-gradient(to top, rgba(5,5,5,1) 0%, rgba(5,5,5,0) 35%)'
    }
  }), /*#__PURE__*/React.createElement("div", {
    className: "absolute inset-0 pointer-events-none z-10",
    style: {
      background: 'linear-gradient(to bottom, rgba(5,5,5,0.6) 0%, transparent 18%)'
    }
  }), /*#__PURE__*/React.createElement("div", {
    className: "absolute inset-0 cyber-grid pointer-events-none opacity-[0.14] z-10"
  }), /*#__PURE__*/React.createElement("div", {
    className: "hero-glow-streak absolute top-0 -left-1/4 w-1/12 h-full bg-gradient-to-r from-transparent via-brand-cyan/25 to-transparent skew-x-12 blur-md pointer-events-none opacity-45 mix-blend-screen z-10"
  }), /*#__PURE__*/React.createElement("div", {
    className: "absolute inset-0 pointer-events-none overflow-hidden z-10"
  }, /*#__PURE__*/React.createElement("div", {
    className: "absolute top-1/4 left-1/3 w-1.5 h-1.5 rounded-full bg-brand-cyan/40 blur-[1px] animate-float-slow"
  }), /*#__PURE__*/React.createElement("div", {
    className: "absolute top-1/2 left-2/3 w-2 h-2 rounded-full bg-brand-violet/25 blur-[2px] animate-float-medium",
    style: {
      animationDelay: '1.5s'
    }
  }), /*#__PURE__*/React.createElement("div", {
    className: "absolute bottom-1/3 left-1/6 w-1 h-1 rounded-full bg-white/50 blur-[0.5px] animate-float-slow",
    style: {
      animationDelay: '3s'
    }
  }), /*#__PURE__*/React.createElement("div", {
    className: "absolute bottom-1/4 right-1/4 w-2.5 h-2.5 rounded-full bg-brand-cyan/20 blur-[2.5px] animate-float-medium",
    style: {
      animationDelay: '0.5s'
    }
  })), /*#__PURE__*/React.createElement("div", {
    className: "absolute inset-x-0 bottom-0 top-0 z-20 px-6 md:px-12 lg:px-24 pointer-events-none"
  }, /*#__PURE__*/React.createElement("div", {
    className: "max-w-7xl mx-auto w-full h-full relative flex items-end",
    style: {
      paddingBottom: '72px'
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "max-w-[700px] w-full text-left pointer-events-auto"
  }, /*#__PURE__*/React.createElement("div", {
    className: "relative w-full min-h-[280px] md:min-h-[320px]"
  }, HERO_SCENES_DATA.map((scene, idx) => {
    const active = idx === activeScene || idx === 3 && activeScene === 4;
    const getChildStyle = delay => {
      return {
        transform: active ? 'translateY(0px)' : 'translateY(15px)',
        opacity: active ? 1 : 0,
        transition: active ? `transform 0.45s cubic-bezier(0.16, 1, 0.3, 1) ${delay}s, opacity 0.45s cubic-bezier(0.16, 1, 0.3, 1) ${delay}s` : 'transform 0.25s cubic-bezier(0.16, 1, 0.3, 1) 0s, opacity 0.25s cubic-bezier(0.16, 1, 0.3, 1) 0s'
      };
    };
    return /*#__PURE__*/React.createElement("div", {
      key: idx,
      ref: el => textRefs.current[idx] = el,
      className: "absolute inset-x-0 top-0 w-full flex flex-col text-left",
      style: {
        opacity: idx === activeScene ? 1 : idx === 3 && activeScene === 4 ? 1 : 0,
        pointerEvents: idx === activeScene ? 'auto' : 'none',
        transition: idx === 3 && activeScene === 4 ? 'none' : 'opacity 0.25s linear'
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: getChildStyle(0.25),
      className: "mb-4 self-start inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-brand-cyan/35 bg-brand-cyan/5 backdrop-blur-md"
    }, /*#__PURE__*/React.createElement("span", {
      className: "w-1.5 h-1.5 rounded-full bg-brand-cyan animate-pulse"
    }), /*#__PURE__*/React.createElement("span", {
      className: "text-[10px] font-mono font-bold text-brand-cyan uppercase tracking-[0.2em]"
    }, scene.badge)), /*#__PURE__*/React.createElement("h1", {
      style: {
        fontSize: 'clamp(1.8rem, 4.2vw, 3rem)',
        lineHeight: 1.05
      },
      className: "font-heading font-black uppercase tracking-tight mb-4"
    }, /*#__PURE__*/React.createElement("span", {
      className: "block"
    }, renderStaggeredText(scene.line1, 0.35, active, 'text-white text-white-glow')), /*#__PURE__*/React.createElement("span", {
      className: "block"
    }, renderStaggeredText(scene.line2, 0.45, active, 'text-cyan-glow'))), /*#__PURE__*/React.createElement("p", {
      style: {
        ...getChildStyle(0.51),
        maxWidth: '420px'
      },
      className: "text-gray-400 font-normal leading-relaxed mb-5 text-xs md:text-sm"
    }, scene.sub), /*#__PURE__*/React.createElement("div", {
      style: getChildStyle(0.64),
      className: "min-h-[90px] w-full flex items-start"
    }, scene.tags && /*#__PURE__*/React.createElement("div", {
      className: "flex flex-wrap gap-2 w-full pt-2"
    }, scene.tags.map((tag, ti) => /*#__PURE__*/React.createElement("span", {
      key: ti,
      className: "px-3 py-1 rounded-full text-[9px] font-mono font-bold uppercase tracking-widest text-white/80 border border-white/10 bg-white/5 backdrop-blur-sm"
    }, tag))), idx === 0 && /*#__PURE__*/React.createElement("div", {
      className: "flex flex-wrap gap-6 pt-5 border-t border-white/10 w-full animate-fade-in",
      style: {
        maxWidth: '420px'
      }
    }, [{
      v: '1000+',
      l: 'Students'
    }, {
      v: '6',
      l: 'AI Programs'
    }, {
      v: '100%',
      l: 'Project-Based'
    }, {
      v: 'Live',
      l: 'Tools'
    }].map((s, i) => /*#__PURE__*/React.createElement("div", {
      key: i,
      className: "flex flex-col"
    }, /*#__PURE__*/React.createElement("span", {
      className: "text-white font-black font-heading tracking-tight",
      style: {
        fontSize: 'clamp(1.1rem, 1.5vw, 1.4rem)'
      }
    }, s.v), /*#__PURE__*/React.createElement("span", {
      className: "text-[8px] font-mono text-gray-500 uppercase tracking-widest mt-0.5"
    }, s.l))))));
  }))), /*#__PURE__*/React.createElement("div", {
    className: "absolute right-0 top-1/2 -translate-y-1/2 z-30 flex flex-col gap-3.5 hero-controls pointer-events-auto"
  }, [0, 1, 2, 3].map(i => /*#__PURE__*/React.createElement("button", {
    key: i,
    onClick: () => goToScene(i),
    className: "group flex items-center justify-end"
  }, /*#__PURE__*/React.createElement("span", {
    className: "opacity-0 group-hover:opacity-100 transition-opacity duration-300 text-[9px] font-mono text-brand-cyan uppercase tracking-widest mr-3 select-none pointer-events-none"
  }, i === 0 ? 'Intro' : i === 1 ? 'Create' : i === 2 ? 'Automate' : ''), /*#__PURE__*/React.createElement("div", {
    className: "rounded-full transition-all duration-500",
    style: {
      width: '7px',
      height: activeScene === i ? '24px' : '7px',
      backgroundColor: activeScene === i ? '#00f0ff' : 'rgba(255,255,255,0.25)',
      boxShadow: activeScene === i ? '0 0 12px #00f0ff' : 'none'
    }
  })))))), /*#__PURE__*/React.createElement("div", {
    className: "absolute bottom-4 left-1/2 -translate-x-1/2 z-20 flex flex-col items-center gap-1.5 pointer-events-none hero-scroll-cue"
  }, /*#__PURE__*/React.createElement("span", {
    className: "text-[9px] font-mono text-gray-500 uppercase tracking-[0.25em] animate-pulse"
  }, "Scroll or Swipe to Explore"), /*#__PURE__*/React.createElement("div", {
    className: "w-px h-6 bg-gradient-to-b from-brand-cyan/60 to-transparent animate-pulse"
  })));
};

// 1. Hero Holographic Brain Canvas
const Hero3DCanvas = () => {
  const mountRef = useRef(null);
  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;
    const width = container.clientWidth;
    const height = container.clientHeight || 550;
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
    camera.position.z = 6.5;
    const renderer = new THREE.WebGLRenderer({
      alpha: true,
      antialias: true
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    container.appendChild(renderer.domElement);
    const group = new THREE.Group();
    scene.add(group);

    // Holographic brain representation: Point cluster sphere
    const particleCount = 140;
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);
    const radius = 1.9;
    for (let i = 0; i < particleCount; i++) {
      const u = Math.random();
      const v = Math.random();
      const theta = u * 2.0 * Math.PI;
      const phi = Math.acos(2.0 * v - 1.0);
      positions[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
      positions[i * 3 + 2] = radius * Math.cos(phi);
    }
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const material = new THREE.PointsMaterial({
      color: 0x00f0ff,
      size: 0.055,
      transparent: true,
      opacity: 0.85
    });
    const points = new THREE.Points(geometry, material);
    group.add(points);

    // Connections (Lines)
    const lineMaterial = new THREE.LineBasicMaterial({
      color: 0xa855f7,
      transparent: true,
      opacity: 0.22
    });
    const lineGeometry = new THREE.BufferGeometry();
    const linePositions = [];
    for (let i = 0; i < particleCount; i++) {
      const x1 = positions[i * 3];
      const y1 = positions[i * 3 + 1];
      const z1 = positions[i * 3 + 2];
      for (let j = i + 1; j < particleCount; j++) {
        const x2 = positions[j * 3];
        const y2 = positions[j * 3 + 1];
        const z2 = positions[j * 3 + 2];
        const dist = Math.sqrt((x1 - x2) ** 2 + (y1 - y2) ** 2 + (z1 - z2) ** 2);
        if (dist < 1.1) {
          linePositions.push(x1, y1, z1, x2, y2, z2);
        }
      }
    }
    lineGeometry.setAttribute('position', new THREE.Float32BufferAttribute(linePositions, 3));
    const lines = new THREE.LineSegments(lineGeometry, lineMaterial);
    group.add(lines);

    // Outer rotating ring pathways
    const ringGeom = new THREE.RingGeometry(2.3, 2.34, 64);
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0x00f0ff,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.35
    });
    const ring = new THREE.Mesh(ringGeom, ringMat);
    ring.rotation.x = Math.PI / 2.3;
    ring.rotation.y = Math.PI / 8;
    group.add(ring);

    // Floating ambient dust in background
    const bgCount = 200;
    const bgGeom = new THREE.BufferGeometry();
    const bgPositions = new Float32Array(bgCount * 3);
    for (let i = 0; i < bgCount; i++) {
      bgPositions[i * 3] = (Math.random() - 0.5) * 15;
      bgPositions[i * 3 + 1] = (Math.random() - 0.5) * 15;
      bgPositions[i * 3 + 2] = (Math.random() - 0.5) * 8 - 4;
    }
    bgGeom.setAttribute('position', new THREE.BufferAttribute(bgPositions, 3));
    const bgMat = new THREE.PointsMaterial({
      color: 0xffffff,
      size: 0.025,
      transparent: true,
      opacity: 0.3
    });
    const bgPoints = new THREE.Points(bgGeom, bgMat);
    scene.add(bgPoints);

    // Mouse responsive tilt properties
    let mouseX = 0,
      mouseY = 0;
    const onMouseMove = e => {
      mouseX = e.clientX / window.innerWidth - 0.5;
      mouseY = e.clientY / window.innerHeight - 0.5;
    };
    window.addEventListener('mousemove', onMouseMove);
    let isVisible = true;
    const observer = new IntersectionObserver(([entry]) => {
      isVisible = entry.isIntersecting;
    }, {
      threshold: 0.01
    });
    observer.observe(container);
    let reqId;
    const animate = () => {
      reqId = requestAnimationFrame(animate);
      if (!isVisible) return;

      // Smooth mouse physics easing
      group.rotation.y += (mouseX * 1.5 - group.rotation.y) * 0.05;
      group.rotation.x += (mouseY * 1.5 - group.rotation.x) * 0.05;

      // Ambient idle rotation
      group.rotation.y += 0.003;
      points.rotation.y -= 0.001;
      ring.rotation.z += 0.006;
      bgPoints.rotation.y += 0.0005;

      // Scroll depth parallax shifting
      const scroll = window.scrollY;
      group.position.y = -scroll * 0.0008;
      bgPoints.position.y = scroll * 0.0015;
      renderer.render(scene, camera);
    };
    animate();
    const onResize = () => {
      if (!container) return;
      const w = container.clientWidth;
      const h = container.clientHeight || 550;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', onResize);
    return () => {
      observer.disconnect();
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('resize', onResize);
      cancelAnimationFrame(reqId);
      renderer.dispose();
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, []);
  return /*#__PURE__*/React.createElement("div", {
    ref: mountRef,
    className: "w-full h-[380px] md:h-[550px] relative z-10"
  });
};

// 2. About 3D Icon Display
const About3DCanvas = () => {
  const containerRef = useRef(null);
  const cardRef = useRef(null);
  useEffect(() => {
    const container = containerRef.current;
    const card = cardRef.current;
    if (!container || !card) return;
    let rafId;
    let targetRX = 0,
      targetRY = 0;
    let currentRX = 0,
      currentRY = 0;
    const onMouseMove = e => {
      const rect = container.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      targetRY = (e.clientX - cx) / (rect.width / 2) * 18;
      targetRX = -((e.clientY - cy) / (rect.height / 2)) * 18;
    };
    const onMouseLeave = () => {
      targetRX = 0;
      targetRY = 0;
    };
    const tick = () => {
      currentRX += (targetRX - currentRX) * 0.07;
      currentRY += (targetRY - currentRY) * 0.07;
      card.style.transform = `perspective(800px) rotateX(${currentRX}deg) rotateY(${currentRY}deg)`;
      rafId = requestAnimationFrame(tick);
    };
    container.addEventListener('mousemove', onMouseMove);
    container.addEventListener('mouseleave', onMouseLeave);
    tick();
    return () => {
      container.removeEventListener('mousemove', onMouseMove);
      container.removeEventListener('mouseleave', onMouseLeave);
      cancelAnimationFrame(rafId);
    };
  }, []);
  return /*#__PURE__*/React.createElement("div", {
    ref: containerRef,
    className: "w-full h-[320px] md:h-[450px] flex items-center justify-center relative select-none"
  }, /*#__PURE__*/React.createElement("div", {
    className: "absolute inset-0 flex items-center justify-center pointer-events-none"
  }, /*#__PURE__*/React.createElement("div", {
    className: "w-64 h-64 rounded-full",
    style: {
      background: 'radial-gradient(circle, rgba(0,240,255,0.12) 0%, rgba(168,85,247,0.06) 50%, transparent 75%)',
      filter: 'blur(40px)'
    }
  })), /*#__PURE__*/React.createElement("div", {
    className: "absolute w-72 h-72 rounded-full pointer-events-none animate-spin",
    style: {
      animationDuration: '20s',
      animationTimingFunction: 'linear',
      border: '1px dashed rgba(0,240,255,0.15)'
    }
  }), /*#__PURE__*/React.createElement("div", {
    className: "absolute w-56 h-56 rounded-full pointer-events-none animate-spin",
    style: {
      animationDuration: '14s',
      animationTimingFunction: 'linear',
      animationDirection: 'reverse',
      border: '1px solid rgba(168,85,247,0.12)'
    }
  }), /*#__PURE__*/React.createElement("div", {
    className: "absolute w-72 h-72 animate-spin pointer-events-none",
    style: {
      animationDuration: '20s',
      animationTimingFunction: 'linear'
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 w-2 h-2 rounded-full",
    style: {
      background: '#00f0ff',
      boxShadow: '0 0 10px 3px rgba(0,240,255,0.7)'
    }
  })), /*#__PURE__*/React.createElement("div", {
    className: "absolute w-56 h-56 animate-spin pointer-events-none",
    style: {
      animationDuration: '14s',
      animationTimingFunction: 'linear',
      animationDirection: 'reverse'
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "absolute bottom-0 right-0 w-1.5 h-1.5 rounded-full",
    style: {
      background: '#a855f7',
      boxShadow: '0 0 8px 2px rgba(168,85,247,0.8)'
    }
  })), /*#__PURE__*/React.createElement("div", {
    ref: cardRef,
    className: "relative flex items-center justify-center",
    style: {
      willChange: 'transform',
      transition: 'transform 0.05s linear'
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "absolute w-36 h-36 rounded-full",
    style: {
      background: 'radial-gradient(circle, rgba(0,240,255,0.18) 0%, transparent 70%)',
      filter: 'blur(20px)',
      transform: 'translateZ(-20px)'
    }
  }), /*#__PURE__*/React.createElement("div", {
    className: "relative w-36 h-36 rounded-full flex items-center justify-center about-icon-float",
    style: {
      background: 'radial-gradient(135deg, rgba(0,240,255,0.05) 0%, rgba(168,85,247,0.05) 100%)',
      border: '1px solid rgba(0,240,255,0.2)',
      boxShadow: '0 0 40px rgba(0,240,255,0.15), 0 0 80px rgba(168,85,247,0.08), inset 0 0 30px rgba(0,240,255,0.04)',
      backdropFilter: 'blur(12px)'
    }
  }, /*#__PURE__*/React.createElement("img", {
    src: "../public/Images/logo/AboutusIcon.png",
    alt: "Dxign Icon",
    className: "w-20 h-20 object-contain",
    style: {
      filter: 'drop-shadow(0 0 16px rgba(0,240,255,0.6)) drop-shadow(0 0 40px rgba(0,240,255,0.3)) brightness(1.05)'
    }
  }), /*#__PURE__*/React.createElement("div", {
    className: "absolute inset-2 rounded-full pointer-events-none",
    style: {
      border: '1px solid rgba(255,255,255,0.06)'
    }
  })), /*#__PURE__*/React.createElement("div", {
    className: "absolute inset-0 rounded-full overflow-hidden pointer-events-none"
  }, /*#__PURE__*/React.createElement("div", {
    className: "absolute -top-1/2 -left-1/4 w-1/2 h-full rotate-12",
    style: {
      background: 'linear-gradient(180deg, rgba(255,255,255,0.06) 0%, transparent 60%)'
    }
  }))));
};

// 3. CTA Minimal AI Neural Network
const Cta3DCanvas = () => {
  const mountRef = useRef(null);
  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;
    const width = container.clientWidth;
    const height = container.clientHeight || 400;
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(40, width / height, 0.1, 1000);
    camera.position.z = 7;
    const renderer = new THREE.WebGLRenderer({
      alpha: true,
      antialias: true
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    container.appendChild(renderer.domElement);
    const group = new THREE.Group();
    scene.add(group);

    // ── Neural nodes ──
    const nodePositions = [[0, 0, 0],
    // hub
    [2.0, 0.6, 0.4], [-1.8, 0.9, -0.5], [0.7, -1.9, 0.7], [-0.9, -1.2, 1.5], [1.6, 0.9, -1.4], [-0.5, 2.0, 0.5], [1.8, -0.8, 0.9], [-1.4, -0.5, -1.6]];
    const nodeSizes = [0.16, 0.09, 0.08, 0.07, 0.09, 0.07, 0.08, 0.07, 0.07];
    const nodeColors = [0x00f0ff, 0x00f0ff, 0xa855f7, 0x00f0ff, 0xa855f7, 0x00f0ff, 0xa855f7, 0x00f0ff, 0xa855f7];
    const nodeMeshes = nodePositions.map((p, i) => {
      const geo = new THREE.SphereGeometry(nodeSizes[i], 16, 16);
      const mat = new THREE.MeshBasicMaterial({
        color: nodeColors[i],
        transparent: true,
        opacity: i === 0 ? 0.9 : 0.7
      });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.set(...p);
      group.add(mesh);
      return mesh;
    });

    // ── Connection edges ──
    const edges = [[0, 1], [0, 2], [0, 3], [0, 4], [0, 5], [0, 6], [0, 7], [0, 8], [1, 5], [2, 6], [3, 7], [4, 8], [1, 7], [2, 4]];
    const lineMat = new THREE.LineBasicMaterial({
      color: 0x00f0ff,
      transparent: true,
      opacity: 0.12
    });
    edges.forEach(([a, b]) => {
      const geo = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(...nodePositions[a]), new THREE.Vector3(...nodePositions[b])]);
      group.add(new THREE.Line(geo, lineMat));
    });

    // ── Soft ambient particles ──
    const dotCount = 80;
    const dotGeo = new THREE.BufferGeometry();
    const dotPos = new Float32Array(dotCount * 3);
    for (let i = 0; i < dotCount; i++) {
      dotPos[i * 3] = (Math.random() - 0.5) * 10;
      dotPos[i * 3 + 1] = (Math.random() - 0.5) * 10;
      dotPos[i * 3 + 2] = (Math.random() - 0.5) * 4;
    }
    dotGeo.setAttribute('position', new THREE.BufferAttribute(dotPos, 3));
    scene.add(new THREE.Points(dotGeo, new THREE.PointsMaterial({
      color: 0xffffff,
      size: 0.018,
      transparent: true,
      opacity: 0.18
    })));
    let isVisible = true;
    const observer = new IntersectionObserver(([e]) => {
      isVisible = e.isIntersecting;
    }, {
      threshold: 0.01
    });
    observer.observe(container);
    let rafId,
      t = 0;
    const animate = () => {
      rafId = requestAnimationFrame(animate);
      if (!isVisible) return;
      t += 0.005;

      // Slow graceful rotation
      group.rotation.y += 0.0028;
      group.rotation.x += 0.0012;

      // Pulse node opacity
      nodeMeshes.forEach((m, i) => {
        m.material.opacity = (i === 0 ? 0.85 : 0.55) + Math.sin(t * 1.4 + i) * 0.15;
      });
      // Pulse edge opacity
      lineMat.opacity = 0.1 + Math.sin(t * 0.9) * 0.05;
      renderer.render(scene, camera);
    };
    animate();
    const onResize = () => {
      if (!container) return;
      const w = container.clientWidth,
        h = container.clientHeight || 400;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', onResize);
    return () => {
      observer.disconnect();
      window.removeEventListener('resize', onResize);
      cancelAnimationFrame(rafId);
      renderer.dispose();
      if (container.contains(renderer.domElement)) container.removeChild(renderer.domElement);
    };
  }, []);
  return /*#__PURE__*/React.createElement("div", {
    ref: mountRef,
    className: "w-full h-full absolute inset-0 z-0 pointer-events-none opacity-60"
  });
};

// --- DATA CONFIGS ---

const courseList = [{
  id: 'ai-fundamentals',
  title: 'AI Fundamentals',
  subtitle: 'Getting Started with AI',
  description: 'Learn core AI concepts, understand how AI tools work, and build a strong foundation for creative AI applications with this free beginner-friendly course.',
  icon: 'cpu',
  colorName: 'cyan',
  colorCode: '#00f0ff',
  badge: 'Beginner Friendly',
  category: 'creative',
  tools: ['ChatGPT', 'Gemini', 'Claude AI', 'Canva AI'],
  duration: '4 Weeks',
  price: 'Free',
  originalPrice: '₹4,999',
  discount: 'Enroll Free',
  priceAmount: 0,
  tagline: 'Start Learning AI for Free',
  fullDescription: 'AI Fundamentals is your free gateway into the world of artificial intelligence. This beginner-friendly online course covers essential AI concepts, prompt engineering basics, and hands-on practice with popular AI tools. Perfect for students, professionals, and entrepreneurs who want to understand how AI can transform their work and creativity.',
  whatYouLearn: ['What is AI & How It Works', 'Prompt Engineering Fundamentals', 'AI Text Generation', 'AI Image Basics', 'AI Ethics & Best Practices', 'Real-World AI Applications'],
  toolsCovered: ['ChatGPT', 'Gemini', 'Claude AI', 'Canva AI', 'Leonardo AI'],
  projectList: ['AI Prompt Portfolio', 'Content Generation Projects', 'AI Image Creation', 'Practical AI Use Cases'],
  perfectFor: ['Absolute Beginners', 'Students', 'Professionals', 'Entrepreneurs', 'Career Changers']
}, {
  id: 'graphic-design',
  title: 'AI Graphic Design Mastery',
  subtitle: 'Branding & Visual Design with AI',
  description: 'Create professional logos, brand identities, social media creatives, and marketing assets using modern AI design workflows with Midjourney, Firefly, and Photoshop AI.',
  icon: 'palette',
  colorName: 'emerald',
  colorCode: '#10b981',
  badge: 'Top Seller',
  category: 'creative',
  tools: ['Midjourney', 'Adobe Firefly', 'Photoshop AI', 'Canva AI'],
  duration: '6 Weeks',
  price: '₹1,500',
  originalPrice: '₹9,999',
  discount: '85% Off',
  priceAmount: 150000,
  tagline: 'Create Professional Designs 10x Faster Using AI',
  fullDescription: 'Master the future of graphic design by combining creativity with powerful AI tools. This online course teaches you to create logos, brand identities, social media campaigns, advertising creatives, product mockups, and marketing materials using professional AI workflows adopted by modern designers worldwide.',
  whatYouLearn: ['AI Design Fundamentals', 'Prompt Engineering for Designers', 'Brand Identity Design', 'Logo Design & Concept Development', 'Social Media Creative Design', 'Poster & Advertisement Design', 'Product Mockups', 'Packaging Design', 'Marketing Campaign Assets', 'Portfolio Creation'],
  toolsCovered: ['ChatGPT', 'Midjourney', 'Adobe Firefly', 'Photoshop AI', 'Canva AI', 'Leonardo AI', 'Ideogram', 'Gemini'],
  projectList: ['Brand Identity Package', 'Social Media Campaign', 'Product Advertisement', 'Promotional Poster Series', 'Logo Design Collection'],
  perfectFor: ['Students', 'Graphic Designers', 'Freelancers', 'Marketing Professionals', 'Business Owners']
}, {
  id: 'film-making',
  title: 'AI Filmmaking & Video Production',
  subtitle: 'Cinematic AI Video Creation',
  description: 'Learn cinematic storytelling, AI video generation, editing, voiceovers, visual effects, and content production for social media and business using AI tools.',
  icon: 'film',
  colorName: 'rose',
  colorCode: '#ec4899',
  badge: 'Premium',
  category: 'creative',
  tools: ['Runway ML', 'Kling AI', 'HeyGen', 'Premiere Pro'],
  duration: '8 Weeks',
  price: '₹2,500',
  originalPrice: '₹14,999',
  discount: '83% Off',
  priceAmount: 250000,
  tagline: 'Create Cinematic Videos Without a Production Team',
  fullDescription: 'Learn how to produce professional-quality videos using AI-powered workflows. This course covers commercials, social media content, explainer videos, cinematic trailers, and business promotions\u2014all created with minimal equipment and maximum creativity.',
  whatYouLearn: ['AI Video Production Workflow', 'Storytelling & Script Writing', 'AI Video Generation', 'Voice Cloning & AI Voiceovers', 'Cinematic Editing', 'Motion Graphics', 'Social Media Video Creation', 'YouTube Content Production', 'Commercial Advertisement Creation', 'Video Marketing Strategies'],
  toolsCovered: ['Runway', 'Kling AI', 'Veo', 'ChatGPT', 'ElevenLabs', 'CapCut AI', 'Pika Labs', 'Adobe Premiere Pro'],
  projectList: ['Cinematic Short Film', 'Product Advertisement', 'YouTube Video', 'Instagram Reel Series', 'Business Promo Video'],
  perfectFor: ['Content Creators', 'Video Editors', 'Agencies', 'Entrepreneurs', 'Social Media Managers']
}, {
  id: 'no-code-website',
  title: 'No-Code AI Website Creation',
  subtitle: 'Build Websites Without Writing Code',
  description: 'Build professional websites, landing pages, portfolios, and business websites without coding using AI-powered website builders like Framer AI and Claude.',
  icon: 'globe',
  colorName: 'cyan',
  colorCode: '#00f0ff',
  badge: 'Popular',
  category: 'business-tech',
  tools: ['Framer AI', 'Claude AI', 'Cursor AI', 'Tailwind'],
  duration: '5 Weeks',
  price: '₹999',
  originalPrice: '₹10,999',
  discount: '91% Off',
  priceAmount: 99900,
  tagline: 'Build Professional Websites Without Writing Code',
  fullDescription: 'Learn how to create modern websites, landing pages, business sites, portfolios, and online stores using AI-powered no-code tools. This course is perfect for entrepreneurs, freelancers, and designers who want to launch professional websites quickly without any coding experience.',
  whatYouLearn: ['Website Planning', 'AI Website Generation', 'Landing Page Design', 'Responsive Design', 'SEO Fundamentals', 'Lead Generation Pages', 'Website Optimization', 'Domain & Hosting Setup', 'Website Publishing', 'Website Maintenance'],
  toolsCovered: ['Framer AI', 'Relume', 'ChatGPT', 'Claude', 'Gemini', 'Hostinger AI', 'Lovable', 'Bolt'],
  projectList: ['Business Website', 'Portfolio Website', 'Landing Page', 'Service Website', 'Lead Generation Website'],
  perfectFor: ['Freelancers', 'Small Business Owners', 'Agencies', 'Startup Founders', 'Students']
}, {
  id: 'ui-ux-design',
  title: 'AI-Powered UI/UX Design',
  subtitle: 'Modern Interface & Experience Design',
  description: 'Design modern websites and mobile app interfaces using AI-assisted research, wireframing, prototyping, and design systems with Figma AI and Midjourney.',
  icon: 'smartphone',
  colorName: 'violet',
  colorCode: '#a855f7',
  badge: 'New',
  category: 'creative',
  tools: ['Figma AI', 'Midjourney', 'Claude AI', 'Gemini AI'],
  duration: '6 Weeks',
  price: '₹5,000',
  originalPrice: '₹12,999',
  discount: '62% Off',
  priceAmount: 500000,
  tagline: 'Design Modern Digital Experiences Using AI',
  fullDescription: 'Learn the complete UI/UX design process from research to prototyping while leveraging AI tools to improve productivity and creativity. This course covers user experience fundamentals, wireframing, mobile app design, design systems, and interactive prototyping.',
  whatYouLearn: ['User Experience Fundamentals', 'User Research', 'Wireframing', 'User Journey Mapping', 'Mobile App Design', 'Website UI Design', 'Design Systems', 'Interactive Prototyping', 'Usability Testing', 'Portfolio Creation'],
  toolsCovered: ['Figma AI', 'ChatGPT', 'Claude', 'Gemini', 'Uizard', 'Relume', 'Galileo AI'],
  projectList: ['Mobile App Design', 'SaaS Dashboard', 'E-Commerce Website UI', 'Design System', 'Interactive Prototype'],
  perfectFor: ['Aspiring UI/UX Designers', 'Graphic Designers', 'Product Designers', 'Students', 'Freelancers']
}, {
  id: 'content-creation',
  title: 'AI Content Creation & Marketing',
  subtitle: 'Bonus Course',
  description: 'Create engaging content, social media campaigns, ads, and marketing materials faster with AI. Bonus module included with all programs.',
  icon: 'sparkles',
  colorName: 'amber',
  colorCode: '#f59e0b',
  badge: 'Bonus Included',
  category: 'business-tech',
  tools: ['ChatGPT', 'Canva AI', 'Leonardo AI', 'Gemini AI'],
  duration: '4 Weeks',
  price: '₹4,000',
  originalPrice: '₹9,999',
  discount: '60% Off',
  priceAmount: 400000,
  tagline: 'Create Content That Attracts, Engages, and Converts',
  fullDescription: 'Master AI-driven content creation for social media, blogs, advertisements, email campaigns, and digital marketing. This bonus course helps you produce high-quality content faster using ChatGPT, Canva AI, and other essential AI tools.',
  whatYouLearn: ['Content Strategy', 'AI Copywriting', 'Social Media Marketing', 'Video Marketing', 'SEO Content Creation', 'Email Marketing', 'Ad Copy Creation', 'Personal Branding', 'Content Automation', 'Marketing Analytics'],
  toolsCovered: ['ChatGPT', 'Claude', 'Gemini', 'Canva AI', 'CapCut AI', 'Notion AI', 'Jasper AI'],
  projectList: ['Social Media Campaign', 'Content Calendar', 'Marketing Funnel', 'SEO Blog Series', 'Email Campaign'],
  perfectFor: ['Content Creators', 'Digital Marketers', 'Business Owners', 'Freelancers', 'Students']
}];
const BLOG_ARTICLES = [
  {
    id: 'getting-started-with-ai-graphic-design',
    title: 'Getting Started with AI Graphic Design: Tools Every Designer Should Know',
    excerpt: 'AI graphic design tools have democratized creativity, allowing both beginners and professionals to produce stunning visuals in minutes. Discover how tools like Midjourney and Adobe Firefly are transforming the design landscape.',
    content: 'AI graphic design tools have democratized creativity, allowing both beginners and professionals to produce stunning visuals in minutes. Tools like Midjourney and Adobe Firefly leverage machine learning models trained on millions of images to generate unique artwork from text descriptions. Understanding how these tools work and where they excel is the first step toward integrating AI into your design workflow.\n\nThe key to mastering AI graphic design lies in understanding prompt structure and tool capabilities. Midjourney excels at artistic and surreal imagery, while Adobe Firefly integrates seamlessly with the Creative Cloud ecosystem for practical design tasks. Start by experimenting with simple prompts and gradually incorporate style references, aspect ratios, and composition modifiers to refine your results.\n\nAs you progress, develop a hybrid workflow that combines AI generation with traditional design skills. Use AI for ideation, mood boarding, and generating base assets, then refine them in software like Photoshop or Illustrator. This approach maximizes productivity while maintaining your unique creative vision and quality standards.',
    category: 'Graphic Design',
    tags: ['AI Tools', 'Midjourney', 'Adobe Firefly'],
    author: 'Dxign Learn Team',
    authorAvatar: null,
    publishDate: 'Jun 1, 2026',
    lastUpdated: 'Jun 1, 2026',
    readingTime: '5 min read',
    featured: false,
    popular: true,
    imageAlt: 'AI graphic design tools interface showing Midjourney and Adobe Firefly workspace with AI-generated artwork examples'
  },
  {
    id: 'mastering-prompt-engineering',
    title: 'Mastering Prompt Engineering: How to Write Effective AI Prompts',
    excerpt: 'Prompt engineering is the art of crafting precise instructions for AI models. Learn the techniques that separate exceptional results from average ones across text and image generation tools.',
    content: 'Prompt engineering is the art of crafting precise instructions for AI language models to produce desired outputs. Whether you are using ChatGPT for content creation or Midjourney for image generation, the quality of your output is directly tied to the quality of your input. Effective prompts are specific, contextual, and structured to guide the AI toward your intended result.\n\nA well-crafted prompt typically includes context, constraints, and examples. For language models, specify the tone, audience, format, and key points you want covered. For image generators, include subject, style, lighting, color palette, and composition details. Techniques like chain-of-thought prompting and role assignment can dramatically improve output quality for complex tasks.\n\nPractice iterative refinement: start broad, analyze the output, then add constraints or rephrase. Maintain a library of proven prompt templates for recurring tasks. As models evolve, prompt engineering remains a valuable skill that separates average results from exceptional ones.',
    category: 'Prompt Engineering',
    tags: ['ChatGPT', 'AI Tools', 'Best Practices'],
    author: 'Dxign Learn Team',
    authorAvatar: null,
    publishDate: 'May 28, 2026',
    lastUpdated: 'May 28, 2026',
    readingTime: '6 min read',
    featured: true,
    popular: false,
    imageAlt: 'Prompt engineering workflow showing ChatGPT and Midjourney prompt structures with examples of effective AI instructions'
  },
  {
    id: 'creating-cinematic-ai-videos',
    title: 'How to Create Cinematic AI Videos with Runway ML and Kling AI',
    excerpt: 'Runway ML and Kling AI are redefining video production. Explore how to combine AI-generated footage with traditional editing for professional cinematic results.',
    content: 'Runway ML and Kling AI represent the cutting edge of AI video generation, enabling creators to produce cinematic footage without expensive cameras or studios. Runway ML offers a comprehensive suite of video tools including text-to-video, inpainting, and motion tracking, while Kling AI specializes in high-fidelity video generation with exceptional temporal consistency and character stability.\n\nTo create professional-looking AI videos, start with detailed scene descriptions that include camera movement, lighting, and mood. Runway ML Gen-3 excels at understanding complex scene compositions, while Kling AI produces remarkably stable character animations and realistic motion. Both platforms support image-to-video workflows for greater control over the final output and visual style.\n\nThe most effective approach combines AI-generated footage with traditional editing in software like Premiere Pro or DaVinci Resolve. Use AI for establishing shots, background plates, and visual effects, then layer in live-action footage, voiceovers, and sound design. This hybrid methodology produces results that rival traditional production at a fraction of the cost and time.',
    category: 'Filmmaking',
    tags: ['AI Video', 'Runway ML', 'Kling AI'],
    author: 'Dxign Learn Team',
    authorAvatar: null,
    publishDate: 'May 25, 2026',
    lastUpdated: 'May 25, 2026',
    readingTime: '7 min read',
    featured: false,
    popular: true,
    imageAlt: 'Cinematic AI video creation interface showing Runway ML and Kling AI timeline with video generation parameters'
  },
  {
    id: 'complete-figma-guide-2026',
    title: 'The Complete Figma Guide for UI/UX Designers in 2026',
    excerpt: 'Figma has evolved into the central hub for UI/UX design with powerful AI features. Master components, prototyping, and design systems for scalable product design.',
    content: 'Figma has evolved into the central hub for UI/UX design, offering real-time collaboration, robust prototyping, and an extensive plugin ecosystem. In 2026, mastering Figma means understanding its AI-powered features, advanced component systems, and seamless developer handoff capabilities. The platform browser-based nature makes it accessible from any device without installation overhead.\n\nStart by structuring your design system using Figma component properties, variants, and auto layout. These features enable scalable, maintainable interfaces that adapt across breakpoints. Figma AI features now generate component suggestions, auto-layout refinements, and entire page layouts from text descriptions, dramatically accelerating the design process.\n\nFor effective prototyping, leverage Figma advanced animations, smart animate, and conditional logic. Connect your designs to real data using variables and API integration. A reusable component library ensures consistency across all products and reduces design debt over time, making your workflow more efficient with every project.',
    category: 'UI/UX',
    tags: ['Figma', 'Design Systems', 'Prototyping'],
    author: 'Dxign Learn Team',
    authorAvatar: null,
    publishDate: 'Jun 5, 2026',
    lastUpdated: 'Jun 5, 2026',
    readingTime: '6 min read',
    featured: false,
    popular: true,
    imageAlt: 'Figma UI/UX design workspace showing component library, auto layout properties, and prototyping connections'
  },
  {
    id: 'building-no-code-website-framer-ai',
    title: 'Building a No-Code Website with Framer AI: Step-by-Step Guide',
    excerpt: 'Framer AI combines visual development with AI-assisted design generation. Learn how to build production-ready websites without writing a single line of code.',
    content: 'Framer AI has revolutionized web design by combining the power of visual development with AI-assisted design generation. Unlike traditional no-code platforms, Framer offers pixel-perfect control over every element while using AI to suggest layouts, generate copy, and optimize responsive breakpoints automatically. This makes it an ideal choice for designers who want complete creative freedom without writing code.\n\nGetting started with Framer involves setting up your project structure using its component-based architecture. The AI assistant can generate complete page layouts from simple prompts, which you can customize using Framer intuitive visual editor. The responsive design engine automatically adapts layouts across devices, while the built-in CMS handles dynamic content without external databases.\n\nPublishing is straightforward with one-click deployment, automatic SSL, CDN distribution, and built-in SEO tools. The platform supports custom domains, analytics integration, and e-commerce through third-party plugins. For designers transitioning from Figma, Framer familiar interface and component logic make the learning curve minimal while offering vastly superior web publishing capabilities.',
    category: 'Web Design',
    tags: ['No-Code', 'Framer AI', 'Web Development'],
    author: 'Dxign Learn Team',
    authorAvatar: null,
    publishDate: 'Jun 3, 2026',
    lastUpdated: 'Jun 3, 2026',
    readingTime: '8 min read',
    featured: true,
    popular: false,
    imageAlt: 'Framer AI no-code website builder interface showing drag-and-drop editor and AI layout suggestions'
  },
  {
    id: 'photoshop-ai-features-transform-workflow',
    title: '10 Photoshop AI Features That Will Transform Your Workflow',
    excerpt: 'Adobe Photoshop AI features powered by Firefly are changing image editing forever. Discover the tools that save hours of manual work and elevate your creative output.',
    content: 'Adobe Photoshop AI features powered by Adobe Firefly have fundamentally changed how designers approach image editing and compositing. Generative Fill leads the pack, allowing you to select any area of an image and have AI fill it with contextually appropriate content. Simply make a selection, describe what you want, and Photoshop generates multiple variations that match the existing lighting, perspective, and texture of your original image.\n\nNeural Filters provide one-click access to sophisticated adjustments like skin smoothing, facial expression changes, and color harmonization. The Landscape Mixer neural filter can transform the season, time of day, or weather in outdoor photos instantly. Remove Background handles complex subjects like hair and translucent objects with unprecedented accuracy using AI-powered edge detection.\n\nThe Object Selection tool now uses AI to identify and select individual objects within images automatically, even in crowded scenes. Combined with AI-powered masking and the Adjustments panel that suggests edits based on content, these features reduce hours of manual work to minutes while producing consistently professional results.',
    category: 'Photoshop',
    tags: ['Adobe Firefly', 'AI Tools', 'Photo Editing'],
    author: 'Dxign Learn Team',
    authorAvatar: null,
    publishDate: 'May 20, 2026',
    lastUpdated: 'May 20, 2026',
    readingTime: '5 min read',
    featured: false,
    popular: true,
    imageAlt: 'Adobe Photoshop workspace showcasing Generative Fill, Neural Filters, and AI-powered selection tools'
  },
  {
    id: 'ai-for-freelancers-scale-creative-business',
    title: 'AI for Freelancers: How to Scale Your Creative Business',
    excerpt: 'Freelance creatives can leverage AI to automate repetitive tasks and accelerate workflows. Learn strategic approaches to growing your creative business with AI assistance.',
    content: 'Freelance creatives face a constant challenge: doing more work without sacrificing quality or burning out. AI tools offer a solution by automating repetitive tasks, accelerating creative workflows, and enabling you to take on projects that would have been impossible alone. From AI-generated mood boards to automated client reporting, the right tool stack can double your productive output.\n\nStart by identifying the tasks that consume most of your time without directly generating revenue. Content creation, research, administrative work, and initial drafts are prime candidates for AI assistance. Tools like ChatGPT can draft client proposals, write email responses, and generate social media content, while Midjourney creates concept visuals for client pitches in minutes.\n\nPosition AI as your creative partner rather than a replacement. Use AI for ideation and first drafts, then apply your expertise to refine and personalize the output. Clients increasingly expect faster turnaround times, and those who leverage AI effectively will have a significant competitive advantage in the evolving freelance marketplace.',
    category: 'Freelancing',
    tags: ['Career Tips', 'Business', 'Productivity'],
    author: 'Dxign Learn Team',
    authorAvatar: null,
    publishDate: 'Jun 8, 2026',
    lastUpdated: 'Jun 8, 2026',
    readingTime: '6 min read',
    featured: false,
    popular: false,
    imageAlt: 'Freelancer workspace with AI tools like ChatGPT and Midjourney for creative business automation'
  },
  {
    id: 'motion-graphics-with-ai',
    title: 'Motion Graphics with AI: Creating Stunning Animations Without After Effects',
    excerpt: 'AI-powered tools are making motion graphics accessible to everyone. Discover how to create professional animations without traditional keyframe expertise.',
    content: 'Motion graphics traditionally required extensive knowledge of After Effects, keyframes, and animation principles. AI-powered tools are changing this by automating complex animations and making motion design accessible to a broader audience. Platforms like Runway ML, Pika, and Deforum can generate animated sequences from text descriptions, while tools like Canva AI offer template-based motion graphics for common use cases.\n\nFor sophisticated motion design, AI tools can assist with rotoscoping, motion tracking, and automated inbetweening. Runway ML frame interpolation creates smooth slow-motion effects, while AI-powered tools can automatically generate animated typography, logo reveals, and transition effects. The technology has advanced to the point where AI can analyze brand guidelines and generate consistent motion assets automatically.\n\nThe most effective workflow combines AI generation with manual refinement. Use AI for base animations, background elements, and repetitive tasks like tracking and masking, then apply your creative direction to timing, easing, and visual polish. This hybrid approach delivers professional-quality motion graphics in a fraction of the traditional production time.',
    category: 'Motion Graphics',
    tags: ['AI Video', 'Animation', 'Design'],
    author: 'Dxign Learn Team',
    authorAvatar: null,
    publishDate: 'Jun 10, 2026',
    lastUpdated: 'Jun 10, 2026',
    readingTime: '5 min read',
    featured: true,
    popular: false,
    imageAlt: 'AI motion graphics workspace showing automated animation tools and motion tracking interface'
  },
  {
    id: 'midjourney-prompt-guide',
    title: 'Midjourney Prompt Guide: From Beginner to Advanced',
    excerpt: 'Master Midjourney prompting from basics to expert techniques. Learn how parameters like aspect ratio, stylize, and chaos can transform your AI art results.',
    content: 'Midjourney has become the go-to tool for AI-generated art, but mastering its prompt system requires understanding its unique syntax and parameters. Beginners should start with the basics: describing a subject, style, and mood in natural language. Adding parameters like aspect ratio and stylize values dramatically expands creative control and output consistency.\n\nIntermediate users should explore advanced parameters: --ar for aspect ratio, --s for stylization, --c for chaos, and --iw for image weight when using reference images. The --weird and --style parameters unlock experimental aesthetics that produce truly unique results. Understanding how these parameters interact is key to consistent, repeatable output across different subject matters.\n\nAdvanced techniques include using multiple image references, negative prompting with --no, and remixing existing generations for iterative refinement. Professional users develop prompt libraries organized by style, subject, and mood, enabling rapid iteration on client projects. The difference between amateur and professional results often comes down to parameter mastery and systematic experimentation rather than luck.',
    category: 'AI Tools',
    tags: ['Midjourney', 'Prompt Engineering', 'AI Art'],
    author: 'Dxign Learn Team',
    authorAvatar: null,
    publishDate: 'May 18, 2026',
    lastUpdated: 'May 18, 2026',
    readingTime: '7 min read',
    featured: false,
    popular: true,
    imageAlt: 'Midjourney interface showing prompt parameters and AI-generated artwork comparisons across different style settings'
  },
  {
    id: 'build-design-portfolio-gets-you-hired-2026',
    title: 'How to Build a Design Portfolio That Gets You Hired in 2026',
    excerpt: 'The design portfolio landscape has evolved. Learn how to showcase strategic thinking, measurable impact, and AI proficiency to stand out to employers.',
    content: 'The design portfolio landscape has evolved significantly, with employers expecting more than just beautiful visuals. In 2026, successful portfolios demonstrate strategic thinking, measurable impact, and proficiency with AI-enhanced workflows. Your portfolio should tell a story about your problem-solving process, not just showcase final deliverables.\n\nStructure case studies to highlight business context, research methodology, design process, and quantifiable results. Include before-and-after metrics, user research insights, and details about how you incorporated AI tools into your workflow. Employers specifically look for candidates who can articulate how they use AI to enhance design thinking rather than replace it entirely.\n\nPlatform choice matters less than content quality. Whether you use Behance, Dribbble, or a custom Framer site, keep your portfolio to 4-6 strong case studies. Record a short video walkthrough for each major project to showcase communication skills, which consistently ranks as the top quality employers seek in design candidates.',
    category: 'Career Tips',
    tags: ['Portfolio', 'Freelancing', 'Career Growth'],
    author: 'Dxign Learn Team',
    authorAvatar: null,
    publishDate: 'Jun 12, 2026',
    lastUpdated: 'Jun 12, 2026',
    readingTime: '6 min read',
    featured: false,
    popular: true,
    imageAlt: 'Design portfolio case study layout showing before-and-after metrics, user research insights, and workflow documentation'
  },
  {
    id: 'understanding-ai-video-editing',
    title: 'Understanding AI Video Editing: Tools, Tips, and Workflows',
    excerpt: 'AI video editing tools have transformed post-production. Learn how to integrate AI-powered scene detection, auto-captioning, and color grading into your editing pipeline.',
    content: 'AI video editing tools have transformed post-production workflows, automating time-consuming tasks like scene detection, transcription, and rough cuts. Tools like CapCut offer AI-powered features including auto-captions, background removal, and motion tracking that rival professional software. Understanding how to integrate these tools into your editing pipeline can dramatically reduce production time.\n\nPremiere Pro AI features include auto-reframe for social media optimization, speech-to-text for automatic captioning, and scene edit detection that analyzes footage and creates rough cuts automatically. The Color Match feature uses AI to analyze reference footage and apply matching color grades across clips. These tools eliminate hours of technical busywork while preserving creative control.\n\nThe most efficient workflow uses AI for the first pass of repetitive tasks: generating transcripts, creating rough assemblies, and applying initial color grades. The editor then refines these AI-generated assets with creative decisions about pacing, storytelling, and emotional impact. This division of labor lets editors focus on creative direction while AI handles technical execution.',
    category: 'Video Editing',
    tags: ['AI Video', 'CapCut', 'Premiere Pro'],
    author: 'Dxign Learn Team',
    authorAvatar: null,
    publishDate: 'May 22, 2026',
    lastUpdated: 'May 22, 2026',
    readingTime: '5 min read',
    featured: false,
    popular: false,
    imageAlt: 'AI video editing timeline showing auto-captioning, scene detection markers, and AI color grading panels'
  },
  {
    id: 'canva-ai-vs-adobe-firefly',
    title: 'Canva AI vs Adobe Firefly: Which Design Tool Is Right for You?',
    excerpt: 'Two different philosophies for AI-powered design. Compare Canva AI accessibility with Adobe Firefly professional control to find the best fit for your workflow.',
    content: 'Canva AI and Adobe Firefly represent two different philosophies for integrating AI into design workflows. Canva AI is built for accessibility and speed, offering one-click design generation, magic eraser, and AI-powered copywriting within an intuitive drag-and-drop interface. It excels at social media content, presentations, and quick-turnaround projects where speed is prioritized over granular control.\n\nAdobe Firefly, integrated into the Creative Cloud ecosystem, offers deeper control and professional-grade output. Its generative fill, text effects, and 3D-to-image capabilities integrate directly with Photoshop, Illustrator, and After Effects. Firefly is trained on Adobe Stock images and openly licensed content, addressing commercial usage concerns that plague some AI tools, making it the preferred choice for professional client work.\n\nThe right choice depends on your workflow. Canva AI is ideal for marketers and content creators who need fast template-based designs. Adobe Firefly suits professional designers and agencies who need maximum creative control, seamless Creative Cloud integration, and commercially safe AI generation. Many professionals use both tools strategically depending on the project type and deadline.',
    category: 'AI Tools',
    tags: ['Canva', 'Adobe Firefly', 'Comparison'],
    author: 'Dxign Learn Team',
    authorAvatar: null,
    publishDate: 'Jun 15, 2026',
    lastUpdated: 'Jun 15, 2026',
    readingTime: '5 min read',
    featured: false,
    popular: false,
    imageAlt: 'Side by side comparison of Canva AI and Adobe Firefly interfaces showing different AI design generation approaches'
  },
  {
    id: 'future-of-ui-ux-design-ai',
    title: 'The Future of UI/UX Design: How AI Is Changing User Experience',
    excerpt: 'AI is reshaping UI/UX design by automating research, accelerating prototyping, and personalizing experiences. Explore what the future holds for design professionals.',
    content: 'AI is fundamentally reshaping UI/UX design by automating research, accelerating prototyping, and personalizing user experiences at scale. AI-powered tools can analyze user behavior patterns, generate heatmaps of potential usability issues, and suggest design improvements based on data from millions of interactions. This shifts the designer role from pixel-pushing to strategic decision-making and creative direction.\n\nUser research is being transformed by AI tools that analyze interview transcripts, survey responses, and usage data to identify patterns that would take humans weeks to uncover. AI can generate user personas, journey maps, and interactive prototypes from research data, enabling designers to iterate through more concepts in less time and arrive at better solutions through rapid exploration.\n\nThe most successful UX designers will embrace AI as a collaborative tool that enhances their capabilities. Understanding how to train AI models on design systems, interpret AI-generated insights critically, and blend quantitative AI analysis with qualitative human empathy will define the next generation of design leaders and set them apart in an increasingly competitive field.',
    category: 'UI/UX',
    tags: ['AI Tools', 'Design Trends', 'User Research'],
    author: 'Dxign Learn Team',
    authorAvatar: null,
    publishDate: 'Jun 18, 2026',
    lastUpdated: 'Jun 18, 2026',
    readingTime: '6 min read',
    featured: false,
    popular: true,
    imageAlt: 'AI-powered UX design workflow showing user research analysis, automated prototyping, and personalization engine'
  },
  {
    id: 'from-beginner-to-freelancer-roadmap',
    title: 'From Beginner to Freelancer: A Roadmap for Creative Professionals',
    excerpt: 'The journey from aspiring creative to successful freelancer requires talent plus business acumen. Learn the strategic steps to build a sustainable creative career.',
    content: 'The journey from aspiring creative to successful freelancer requires more than artistic talent. It demands business acumen, marketing skills, and strategic career planning. Begin by developing a specialized skill set in a high-demand area like UI/UX design, motion graphics, or AI-enhanced content creation. Specialization allows you to command higher rates and differentiate yourself in a competitive market.\n\nBuild your professional infrastructure: register your business, set up accounting systems, create a professional portfolio website, and establish rates based on market research. Develop client management processes including contracts, discovery calls, and project scoping templates. Most freelancers fail not from lack of talent but from poor business practices and underestimating the importance of systems and processes.\n\nInvest in continuous learning and networking. The creative industry evolves rapidly with AI advancements, so dedicate time each week to learning new tools and techniques. Join freelance communities, attend industry events, and build relationships with other freelancers who can refer work. Successful freelancers report that referrals and repeat clients account for the majority of their income.',
    category: 'Freelancing',
    tags: ['Career Growth', 'Business', 'Freelancing'],
    author: 'Dxign Learn Team',
    authorAvatar: null,
    publishDate: 'Jun 22, 2026',
    lastUpdated: 'Jun 22, 2026',
    readingTime: '7 min read',
    featured: false,
    popular: false,
    imageAlt: 'Freelancer roadmap infographic showing career progression from beginner skill development to established business owner'
  },
  {
    id: 'illustrator-ai-features-vector-workflow',
    title: 'Illustrator AI Features: Boosting Your Vector Design Workflow',
    excerpt: 'Adobe Illustrator AI features are transforming vector design. Explore Generative Recolor, text-to-vector, and AI-powered image trace for faster creative workflows.',
    content: 'Adobe Illustrator AI features have transformed vector design by automating tedious tasks and accelerating the creative process. The most impactful addition is Generative Recolor, which allows designers to recolor entire vector artworks with text prompts. Simply describe a color scheme and Illustrator applies it intelligently, maintaining proper contrast and hierarchy while exploring thousands of color variations in seconds.\n\nThe AI-powered Image Trace has received significant upgrades, converting raster images to vectors with remarkable accuracy even for complex photographs. New text-to-vector capabilities generate custom icons, patterns, and illustrations from simple descriptions, providing instant starting points for vector projects. The Type tool now includes AI-driven font pairing suggestions and intelligent text wrapping that respects complex vector shapes.\n\nStyle Discovery uses AI to analyze your artwork and suggest complementary styles, gradients, and effects that maintain design coherence. These features reduce time spent on manual repetition, allowing designers to focus on creative direction and refinement. Mastering Illustrator AI tools is becoming essential for vector designers who want competitive turnaround times while delivering high-quality artwork.',
    category: 'Illustrator',
    tags: ['Adobe Illustrator', 'AI Tools', 'Vector Design'],
    author: 'Dxign Learn Team',
    authorAvatar: null,
    publishDate: 'Jun 25, 2026',
    lastUpdated: 'Jun 25, 2026',
    readingTime: '5 min read',
    featured: false,
    popular: false,
    imageAlt: 'Adobe Illustrator workspace showing Generative Recolor panel, text-to-vector results, and AI-powered image trace comparison'
  }
];
const BLOG_CATEGORIES = ['All Articles', 'Graphic Design', 'AI Tools', 'Photoshop', 'Illustrator', 'Figma', 'UI/UX', 'Prompt Engineering', 'Filmmaking', 'Video Editing', 'Motion Graphics', 'Web Design', 'No-Code', 'Freelancing', 'Career Tips', 'Case Studies', 'Tutorials', 'Industry News'];
const toolLogoMap = {
  'ChatGPT': '../public/Images/Ai logos/chatgpt_PNG8.png',
  'Midjourney': '../public/Images/Ai logos/tech-20-UTRF1-eT.png',
  'Adobe Photoshop AI': 'https://cdn.jsdelivr.net/npm/simple-icons@latest/icons/adobephotoshop.svg',
  'Photoshop AI': 'https://cdn.jsdelivr.net/npm/simple-icons@latest/icons/adobephotoshop.svg',
  'Adobe Firefly': '../public/Images/Ai logos/lg-66cb1819333c2-Adobe-Firefly-Logo.webp',
  'Figma AI': '../public/Images/Ai logos/figma_logo_icon_171159.webp',
  'Framer AI': 'https://cdn.jsdelivr.net/npm/simple-icons@latest/icons/framer.svg',
  'Claude AI': '../public/Images/Ai logos/Claude_Logo_2023-s1280.png',
  'Claude': '../public/Images/Ai logos/Claude_Logo_2023-s1280.png',
  'Runway ML': '../public/Images/Ai logos/Runway_Logo.webp',
  'Runway': '../public/Images/Ai logos/Runway_Logo.webp',
  'Kling AI': '../public/Images/Ai logos/vfeQT3Qi_Uxuk3xz-65eZABtXQwmDeXbt4MmH4PQUnMcMtuww9p2D2qCdNR_wEw35n6z9EFpyDGoVJFagHf-_g.webp',
  'Canva AI': '../public/Images/Ai logos/canva.png',
  'Leonardo AI': 'https://www.google.com/s2/favicons?domain=leonardo.ai&sz=64',
  'Gemini AI': '../public/Images/Ai logos/Gemini-logo.png',
  'Gemini': '../public/Images/Ai logos/Gemini-logo.png',
  'Higgsfield': '../public/Images/Ai logos/higgsfield_logo-scaled.webp.webp',
  'Lovable': '../public/Images/Ai logos/lovable.png',
  'Google Flow': '../public/Images/Ai logos/Google-Flow-Colored-Logo.png',
  'Antigravity': '../public/Images/Ai logos/Google_Antigravity_Logo_2025.png',
  'Adobe Premiere Pro': 'https://cdn.jsdelivr.net/npm/simple-icons@latest/icons/adobepremierepro.svg',
  'Premiere Pro': 'https://cdn.jsdelivr.net/npm/simple-icons@latest/icons/adobepremierepro.svg',
  'HeyGen': 'https://www.google.com/s2/favicons?domain=heygen.com&sz=64',
  'ElevenLabs': 'https://cdn.jsdelivr.net/npm/simple-icons@latest/icons/elevenlabs.svg',
  'CapCut AI': 'https://www.google.com/s2/favicons?domain=capcut.com&sz=64',
  'Pika Labs': 'https://www.google.com/s2/favicons?domain=pika.art&sz=64',
  'Veo': 'https://www.google.com/s2/favicons?domain=deepmind.google&sz=64',
  'Relume': 'https://www.google.com/s2/favicons?domain=relume.io&sz=64',
  'Hostinger AI': 'https://www.google.com/s2/favicons?domain=hostinger.com&sz=64',
  'Bolt': 'https://www.google.com/s2/favicons?domain=bolt.new&sz=64',
  'Uizard': 'https://www.google.com/s2/favicons?domain=uizard.io&sz=64',
  'Galileo AI': 'https://www.google.com/s2/favicons?domain=galileo.ai&sz=64',
  'Notion AI': 'https://cdn.jsdelivr.net/npm/simple-icons@latest/icons/notion.svg',
  'Jasper AI': 'https://www.google.com/s2/favicons?domain=jasper.ai&sz=64',
  'Cursor AI': 'https://cdn.jsdelivr.net/npm/simple-icons@latest/icons/cursor.svg',
  'Tailwind': 'https://cdn.jsdelivr.net/npm/simple-icons@latest/icons/tailwindcss.svg',
  'Stitch': '../public/Images/Ai logos/Stitch.webp'
};
const brandColorMap = {
  'ChatGPT': '#10A37F',
  'Midjourney': '#0066FF',
  'Adobe Photoshop AI': '#31A8FF',
  'Adobe Firefly': '#FF6B00',
  'Figma AI': '#A259FF',
  'Framer AI': '#0055FF',
  'Claude AI': '#D97706',
  'Gemini AI': '#4285F4',
  'Runway ML': '#FFFFFF',
  'Kling AI': '#FFFFFF',
  'Canva AI': '#00C4CC',
  'Leonardo AI': '#FFFFFF',
  'Stitch': '#6366f1'
};
const toolDetails = {
  'ChatGPT': {
    title: 'ChatGPT',
    tagline: 'AI Language Model by OpenAI',
    description: 'A powerful conversational AI that understands and generates human-like text. From drafting content to writing code, ChatGPT handles complex language tasks with remarkable accuracy and creativity.',
    longDescription: 'ChatGPT is revolutionizing how professionals approach their daily work. Whether you need engaging blog posts, persuasive marketing copy, well-structured code, or thoughtful email replies, ChatGPT delivers high-quality results in seconds. Its advanced reasoning capabilities make it ideal for brainstorming creative concepts, debugging complex code, analyzing data sets, and even role-playing scenarios for interview prep or client pitches. With support for file uploads, web browsing, and custom GPTs, it\'s the most versatile AI assistant available today for creative professionals, developers, and business owners alike.',
    useCases: ['Content writing & copywriting', 'Brainstorming & ideation', 'Code generation & debugging', 'Email & message drafting', 'Research & summarization', 'Conversational AI & chatbots'],
    color: '#10A37F',
    logo: toolLogoMap['ChatGPT']
  },
  'Midjourney': {
    title: 'Midjourney',
    tagline: 'AI Image Generation Tool',
    description: 'An independent research lab\'s AI that transforms text prompts into stunning, artistic visuals. Known for its distinctive aesthetic, it\'s widely used by designers, artists, and marketers for creative visual content.',
    longDescription: 'Midjourney has redefined visual creativity by enabling anyone to generate professional-grade imagery from simple text descriptions. Its advanced AI models excel at interpreting nuanced prompts, producing everything from photorealistic product shots to dreamlike fantasy landscapes. Designers use it for rapid concept exploration, branding agencies leverage it for logo and mood board creation, and filmmakers rely on it for storyboard visualization. With features like image-to-image variation, region-based editing, and consistent character rendering across multiple generations, Midjourney is an indispensable tool in any modern creative workflow.',
    useCases: ['Concept art & illustration', 'Logo & brand asset creation', 'Social media visuals', 'Product mockups & prototyping', 'Architectural visualization', 'Fantasy & sci-fi art'],
    color: '#0066FF',
    logo: toolLogoMap['Midjourney']
  },
  'Adobe Firefly': {
    title: 'Adobe Firefly',
    tagline: 'Generative AI for Creatives',
    description: 'Adobe\'s family of creative generative AI models integrated directly into Adobe apps. It enables designers to generate images, text effects, color palettes, and more using natural language prompts.',
    longDescription: 'Adobe Firefly brings the power of generative AI directly into the tools creative professionals already use every day. Seamlessly integrated with Photoshop, Illustrator, and Adobe Express, Firefly allows you to generate new images from scratch, extend existing compositions with Generative Expand, remove unwanted objects with Generative Fill, and create custom text effects with stunning typography. Its commercial-safe training data makes it ideal for professional client work. Whether you are a graphic designer, photographer, or marketer, Firefly accelerates your creative process while maintaining full creative control within Adobe\'s industry-standard ecosystem.',
    useCases: ['AI image generation in Photoshop', 'Text effects & typography', 'Color palette generation', 'Object removal & replacement', '3D-to-image rendering', 'Reimagining & expanding images'],
    color: '#FF6B00',
    logo: toolLogoMap['Adobe Firefly']
  },
  'Figma AI': {
    title: 'Figma AI',
    tagline: 'AI-Powered UI/UX Design',
    description: 'Figma\'s integrated AI assistant that accelerates the design process. It helps designers generate layouts, create components, rename layers, and automate repetitive tasks directly inside Figma.',
    longDescription: 'Figma AI transforms the UI/UX design workflow by automating tedious tasks and accelerating the creative process. With intelligent features like auto-layout generation, smart layer naming, component creation, and design system suggestions, Figma AI lets designers focus on solving real user problems instead of manual busywork. It can generate entire page layouts from simple prompts, suggest accessible color palettes and typography pairings, and even convert wireframes into high-fidelity prototypes. For product teams, Figma AI means faster iteration cycles, more consistent design systems, and the ability to explore more creative directions in less time.',
    useCases: ['UI layout generation', 'Auto-naming layers & components', 'Design system creation', 'Wireframe to prototype', 'Asset generation & editing', 'Design feedback & suggestions'],
    color: '#A259FF',
    logo: toolLogoMap['Figma AI']
  },
  'Claude AI': {
    title: 'Claude AI',
    tagline: 'AI Assistant by Anthropic',
    description: 'Anthropic\'s advanced AI assistant designed for safety, reasoning, and deep analysis. Claude excels at handling long documents, coding tasks, and nuanced conversations with thoughtful responses.',
    longDescription: 'Claude stands out for its exceptional reasoning abilities, massive context window, and thoughtful approach to complex tasks. It can process and analyze entire books, research papers, or codebases in a single conversation, making it invaluable for researchers, developers, and analysts. Claude excels at nuanced writing tasks, from crafting compelling narratives to refining business proposals with precise language. Its safety-focused architecture means it delivers reliable, well-reasoned responses without hallucination. For professionals who need deep analysis, thorough document review, or sophisticated coding assistance, Claude offers a level of depth and reliability that sets it apart from other AI assistants.',
    useCases: ['Document analysis & summarization', 'Code review & debugging', 'Research & data extraction', 'Report & proposal writing', 'Complex reasoning tasks', 'Safe & ethical AI interactions'],
    color: '#D97706',
    logo: toolLogoMap['Claude AI']
  },
  'Runway ML': {
    title: 'Runway ML',
    tagline: 'AI Video & Image Creation',
    description: 'A research company building multimodal AI tools for video and image generation. Runway offers real-time video editing, inpainting, motion tracking, and generative video creation accessible through the browser.',
    longDescription: 'Runway ML is at the forefront of AI-powered video creation, offering a comprehensive suite of tools that make professional video production accessible to everyone. With Gen-3 Alpha, you can generate cinematic-quality video clips from text descriptions, complete with realistic motion, lighting, and camera dynamics. The platform includes powerful editing features like real-time green screen removal, object tracking, inpainting, and slow-motion generation — all accessible through a web browser without specialized hardware. Content creators use Runway for everything from social media shorts to commercial productions, while filmmakers leverage its tools for pre-visualization, VFX, and post-production workflows that would traditionally require expensive studio infrastructure.',
    useCases: ['AI video generation & editing', 'Green screen & background removal', 'Motion tracking & keyframing', 'Inpainting & outpainting', 'Text-to-video synthesis', 'Real-time video effects'],
    color: '#FFFFFF',
    logo: toolLogoMap['Runway ML']
  },
  'Kling AI': {
    title: 'Kling AI',
    tagline: 'AI Video Generation Platform',
    description: 'A next-generation AI video generation model developed by Kuaishou. Kling can generate high-quality, realistic videos from text prompts or images, with impressive motion consistency and physics simulation.',
    longDescription: 'Kling AI represents a breakthrough in AI video generation, producing videos with exceptional realism, smooth motion, and physical accuracy that rivals traditional production methods. Unlike earlier models that struggled with consistent movement and natural physics, Kling generates videos where objects move believably, characters maintain visual consistency, and scenes follow real-world dynamics. It supports text-to-video, image-to-video animation, and extended video generation up to 2 minutes in length. For content creators, marketers, and filmmakers, Kling AI opens up possibilities for rapid video prototyping, cost-effective commercial production, and creative storytelling that was previously impossible without large production budgets and extensive technical expertise.',
    useCases: ['Text-to-video generation', 'Image-to-video animation', 'Cinematic video production', 'Social media content creation', 'Advertising & marketing videos', 'Concept visualization'],
    color: '#FFFFFF',
    logo: toolLogoMap['Kling AI']
  },
  'Canva AI': {
    title: 'Canva AI',
    tagline: 'AI Design Platform for Everyone',
    description: 'Canva\'s integrated AI features that make professional design accessible to everyone. From Magic Design to AI image generation, it empowers non-designers to create stunning visual content in minutes.',
    longDescription: 'Canva AI democratizes design by putting professional-grade creative tools into the hands of everyone, regardless of their design experience. Its Magic Studio suite includes Magic Design which generates complete designs from text prompts, Magic Eraser for removing unwanted elements from images, Magic Expand for extending images beyond their original boundaries, and Magic Write for generating copy that perfectly fits your design. Canva AI also powers background removal, image upscaling, animated transitions, and brand kit generation — automatically applying your brand colors, fonts, and logos across any design. For entrepreneurs, social media managers, and small business owners, Canva AI eliminates the need for expensive design software and specialized design skills.',
    useCases: ['Social media graphics & posts', 'Presentations & slides', 'Marketing materials & flyers', 'Logo & brand kit creation', 'AI image & asset generation', 'Video editing & animation'],
    color: '#00C4CC',
    logo: toolLogoMap['Canva AI']
  },
  'Gemini AI': {
    title: 'Gemini AI',
    tagline: 'Google\'s Multimodal AI Model',
    description: 'Google\'s most capable AI model designed to understand and combine text, images, audio, video, and code. Gemini powers creative workflows, research, and development across Google\'s ecosystem.',
    longDescription: 'Gemini represents Google\'s vision for the future of AI — a truly multimodal model that can understand and reason across text, images, audio, video, and code simultaneously. Unlike single-modality models, Gemini can analyze a chart in an image, explain its implications in text, generate a video summary, and write code to reproduce the analysis — all in one conversation. Deeply integrated with Google Workspace, it powers AI features in Gmail, Docs, Sheets, and Meet, making it an invisible productivity layer across your workflow. For developers, Gemini\'s advanced code generation and debugging capabilities rival specialized coding assistants. For researchers and analysts, its ability to synthesize information across formats makes it an unparalleled research partner.',
    useCases: ['Multi-modal content analysis', 'Code generation & assistance', 'Image understanding & captioning', 'Research & knowledge discovery', 'Creative writing & brainstorming', 'Google Workspace integration'],
    color: '#4285F4',
    logo: toolLogoMap['Gemini AI']
  },
  'Higgsfield': {
    title: 'Higgsfield',
    tagline: 'AI Video & Motion Generation',
    description: 'A cutting-edge AI video generation platform that creates ultra-realistic videos, face swaps, and motion animations from simple text prompts or reference images.',
    longDescription: 'Higgsfield is redefining AI video creation with its state-of-the-art motion generation technology. It excels at producing hyper-realistic character animations, facial expressions, and body movements that maintain consistency across frames. Content creators use Higgsfield to generate talking head videos, character-driven narratives, dynamic social media content, and personalized video messages. Its advanced face swap and motion transfer capabilities make it a powerful tool for filmmakers, marketers, and content producers looking to create professional video content without expensive equipment or studio time.',
    useCases: ['AI video generation from text', 'Face swap & motion transfer', 'Talking head video creation', 'Character animation & storytelling', 'Social media video content', 'Personalized video messages'],
    color: '#FFFFFF',
    logo: toolLogoMap['Higgsfield']
  },
  'Lovable': {
    title: 'Lovable',
    tagline: 'AI Website & App Builder',
    description: 'An AI-powered development platform that lets you build full-stack web applications, landing pages, and SaaS products by describing what you want in natural language.',
    longDescription: 'Lovable (formerly GPT Engineer) is transforming how web applications are built. Instead of writing code line by line, you describe your application in plain English and Lovable generates the entire codebase — frontend, backend, database schema, and API integrations — in minutes. It supports modern frameworks, responsive design, authentication, payment processing, and deployment. For entrepreneurs, founders, and designers, Lovable means you can go from idea to working prototype in hours instead of weeks, without needing a development team. It\'s the fastest way to validate product ideas and launch MVPs.',
    useCases: ['Full-stack web app generation', 'Landing page & website creation', 'SaaS product prototyping', 'API & database integration', 'Authentication & payment setup', 'Rapid MVP development'],
    color: '#FF6B35',
    logo: toolLogoMap['Lovable']
  },
  'Google Flow': {
    title: 'Google Flow',
    tagline: 'AI-Powered Automation Platform',
    description: 'Google\'s intelligent automation platform that connects apps, automates workflows, and leverages AI to streamline business processes without requiring coding expertise.',
    longDescription: 'Google Flow empowers teams to build powerful automations that connect Google Workspace apps with hundreds of third-party services. With built-in AI capabilities, it can intelligently route data, generate reports, automate email sequences, and trigger complex workflows based on natural language instructions. For marketers, it automates campaign reporting and lead nurturing. For operations teams, it streamlines approval processes and data synchronization. For developers, it provides a low-code environment to build integrations that would otherwise require hours of manual coding.',
    useCases: ['Workflow automation & integration', 'Email & notification sequences', 'Data synchronization between apps', 'Automated reporting & dashboards', 'Approval & review processes', 'AI-powered document processing'],
    color: '#4285F4',
    logo: toolLogoMap['Google Flow']
  },
  'Antigravity': {
    title: 'Antigravity',
    tagline: 'AI Creative Suite',
    description: 'A next-generation AI creative platform that combines image generation, video creation, and design tools into a single unified workspace for modern creators.',
    longDescription: 'Antigravity is pushing the boundaries of AI-powered creativity by offering a comprehensive suite of generation tools in one seamless platform. From photorealistic image generation to cinematic video creation, Antigravity leverages advanced diffusion models and neural networks to produce studio-quality content. Its intuitive interface makes it accessible for beginners while offering the depth that professional creators demand. Features include text-to-image generation, style transfer, video synthesis, batch processing, and collaborative workspaces for team projects.',
    useCases: ['AI image generation & editing', 'Video synthesis & animation', 'Style transfer & effects', 'Batch content production', 'Collaborative creative workflows', 'Multi-format asset export'],
    color: '#8B5CF6',
    logo: toolLogoMap['Antigravity']
  },
  'Stitch': {
    title: 'Stitch',
    tagline: 'AI-Powered Design & Prototyping',
    description: 'A modern AI design tool that helps teams create, prototype, and iterate on digital products faster with intelligent design suggestions and automated workflows.',
    longDescription: 'Stitch is revolutionizing the design-to-development pipeline with AI-powered design generation, smart component libraries, and real-time collaboration features. It enables designers to create responsive layouts, interactive prototypes, and production-ready design systems with minimal manual effort. Stitch understands natural language descriptions and converts them into polished interface designs, making it an essential tool for UI/UX designers, product teams, and agencies looking to accelerate their design workflow.',
    useCases: ['AI-powered UI generation', 'Rapid prototyping & iteration', 'Design system management', 'Responsive layout design', 'Team collaboration', 'Design-to-code export'],
    color: '#6366f1',
    logo: toolLogoMap['Stitch']
  }
};
const whyChooseUsData = [{
  title: 'Learn at Your Own Pace',
  desc: 'Access all lessons anytime, anywhere with no strict schedules. Learn AI on your terms, whenever it fits your routine.'
}, {
  title: 'Practical AI Projects',
  desc: 'Build real-world portfolio projects that demonstrate your AI skills to employers, clients, and collaborators.'
}, {
  title: 'Industry-Relevant Skills',
  desc: 'Master AI tools and workflows currently used by leading businesses and agencies across the globe.'
}, {
  title: 'Beginner Friendly',
  desc: 'No prior experience required. Start from scratch and progressively build your AI skills with guided instruction.'
}, {
  title: 'Lifetime Access',
  desc: 'Revisit lessons whenever you need. Your course materials never expire and remain available forever.'
}, {
  title: 'Regular Updates',
  desc: 'Stay current with rapidly evolving AI technologies. Course content is refreshed regularly to reflect the latest tools.'
}];
const showcaseProjects = [{
  title: 'Palm tender Coconut Water',
  brand: 'Coconova Beverage',
  cat: 'Content Creation',
  desc: 'Photorealistic 3D CGI product commercial for organic coconut water, rendered with advanced AI video generators.',
  tags: ['Kling AI', 'Midjourney', 'After Effects'],
  video: 'https://res.cloudinary.com/dwfjax67x/video/upload/CGI_Ad_Video_Tender_coconut_mm1yoo.mp4',
  studentName: 'Amal Dev',
  studentImg: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?q=80&w=150&auto=format&fit=crop'
}, {
  title: 'Chevrolet Ad',
  brand: 'Aether Motors',
  cat: 'Film Making',
  desc: 'High-octane commercial showcase for a next-gen luxury SUV, modeling reflections and dynamic camera sweeps.',
  tags: ['Runway Gen-3', 'Pika Labs', 'Premiere Pro'],
  video: 'https://res.cloudinary.com/dwfjax67x/video/upload/Car_Ads_hnpyf0.mp4',
  studentName: 'Rahul Krishnan',
  studentImg: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?q=80&w=150&auto=format&fit=crop'
}, {
  title: 'Election Campaign Collection',
  brand: 'Democratic Front',
  cat: 'Graphic Design',
  desc: 'Complete campaign poster collection featuring high-contrast political banners, candidate portfolios, and modern layout mockups.',
  tags: ['Photoshop AI', 'Branding', 'Layouts', 'Carousel'],
  image: '../public/Images/workimage/Election 1 mockup.jpg',
  images: ['../public/Images/workimage/Election 1 mockup.jpg', '../public/Images/workimage/Election 1.jpg', '../public/Images/workimage/Election 2.jpg', '../public/Images/workimage/Election 3.jpg', '../public/Images/workimage/Election 1 mockup_2.jpg', '../public/Images/workimage/Election 3 mockup_3.jpg'],
  carousel: true,
  studentName: 'Adarsh Sen',
  studentImg: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=150&auto=format&fit=crop'
}, {
  title: 'Golden Tea Creative Ad Reel',
  brand: 'Golden Tea Co.',
  cat: 'Film Making',
  desc: 'Artistic, slow-motion commercial showcasing premium tea leaves brewing with warm ambient particle effects.',
  tags: ['Luma Dream Machine', 'Photoshop AI'],
  video: 'https://res.cloudinary.com/dwfjax67x/video/upload/Golden_tea_Ad_ebxdah.mp4',
  studentName: 'Akhil Mohan',
  studentImg: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=150&auto=format&fit=crop'
}, {
  title: 'Toffee Coffee Roasters Campaign',
  brand: 'Toffee Coffee Brand',
  cat: 'Graphic Design',
  desc: 'Product social media branding carousel showcasing premium instant coffee jars, warm lighting, and luxury aesthetic details.',
  tags: ['Midjourney v6', 'Figma', 'Composition', 'Carousel'],
  image: '../public/Images/workimage/Post 7.png',
  images: ['../public/Images/workimage/Post 7.png', '../public/Images/workimage/Post 7_2.jpg', '../public/Images/workimage/Post 7_4.jpg', '../public/Images/workimage/Post 7_6.jpg'],
  carousel: true,
  studentName: 'Rithvik Roy',
  studentImg: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?q=80&w=150&auto=format&fit=crop'
}, {
  title: "Grandma's Sweet",
  brand: "Grandma's Kitchen",
  cat: 'Film Making',
  desc: 'Emotional narrative film explaining a traditional family dessert recipe, featuring high-fidelity human generation.',
  tags: ['Sora AI', 'Runway', 'ElevenLabs'],
  video: 'https://res.cloudinary.com/dwfjax67x/video/upload/Grandmas_Sweet_iyztel.mp4',
  studentName: 'Arjun Nair',
  studentImg: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?q=80&w=150&auto=format&fit=crop'
}, {
  title: 'Commercial Advertising Concepts',
  brand: 'AI Advertising Campaigns',
  cat: 'Graphic Design',
  desc: 'A premium collection of commercial posters designed using advanced generative AI prompt workflows for brands like Pepsi, luxury cosmetics, and next-gen smartphones.',
  tags: ['Stable Diffusion', 'Figma', 'Prompting', 'Carousel'],
  image: '../public/Images/workimage/Post 6.jpg',
  images: ['../public/Images/workimage/Post 6.jpg', '../public/Images/workimage/Post 6_2.jpg', '../public/Images/workimage/Post 6_3.jpg', '../public/Images/workimage/Post 6_4.jpg'],
  carousel: true,
  studentName: 'Sneha Paul',
  studentImg: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?q=80&w=150&auto=format&fit=crop'
}, {
  title: 'Amera Gold & Diamonds',
  brand: 'Aura Jewellers',
  cat: 'Film Making',
  desc: 'Luxury product presentation capturing light refraction and detail on diamond rings and gold necklaces.',
  tags: ['Midjourney v6', 'Kling AI', 'CapCut'],
  video: 'https://res.cloudinary.com/dwfjax67x/video/upload/Jewllery_ads_uikdt5.mp4',
  studentName: 'Gautham Raj',
  studentImg: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?q=80&w=150&auto=format&fit=crop'
}, {
  title: 'KOME',
  brand: 'KOME Paris',
  cat: 'Content Creation',
  desc: 'Editorial fashion design and run-way concept showcase displaying luxury outfits in futuristic Paris.',
  tags: ['HeyGen', 'Midjourney', 'Aesthetic AI'],
  video: 'https://res.cloudinary.com/dwfjax67x/video/upload/KOME_Reel_-2_French_j0arz5.mp4',
  studentName: 'Jithin Mathew',
  studentImg: 'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?q=80&w=150&auto=format&fit=crop'
}, {
  title: 'Mayflower Catering',
  brand: 'Mayflower Studios',
  cat: 'Film Making',
  desc: 'Indie movie concept trailer detailing historical exploration, highlighting consistent AI actors and cinematic grading.',
  tags: ['Runway Gen-3', 'ElevenLabs', 'UDIO'],
  video: 'https://res.cloudinary.com/dwfjax67x/video/upload/Mayflower_Reel_2_blefup.mp4',
  studentName: 'Siddharth K.',
  studentImg: 'https://images.unsplash.com/photo-1501196354995-cbb51c65aaea?q=80&w=150&auto=format&fit=crop'
}, {
  title: 'Optic Expo Promo Reel',
  brand: 'Optic Expo',
  cat: 'Film Making',
  desc: 'Futuristic advertising trailer for an international tech exhibition, styled with tech UI and holographic grids.',
  tags: ['After Effects', 'AI Prompting', 'Veed.io'],
  video: 'https://res.cloudinary.com/dwfjax67x/video/upload/OPTIC_EXPO_2025_joubt6.mp4',
  studentName: 'Roshan P.',
  studentImg: 'https://images.unsplash.com/photo-1624298357597-fd92dfbec01d?q=80&w=150&auto=format&fit=crop'
}, {
  title: 'Regalia Convection Center',
  brand: 'Regalia Marine',
  cat: 'Film Making',
  desc: 'Premium travel and luxury lifestyle advertisement showcasing sea travel, generated using cinematic prompts.',
  tags: ['Luma LGM', 'Kling', 'Color grading'],
  video: 'https://res.cloudinary.com/dwfjax67x/video/upload/Regalia_reel_1_gc2qyp.mp4',
  studentName: 'Vishnu Prasad',
  studentImg: 'https://images.unsplash.com/photo-1552058544-f2b08422138a?q=80&w=150&auto=format&fit=crop'
}, {
  title: 'WebQ Ad Reel',
  brand: 'WebQ Tech',
  cat: 'Content Creation',
  desc: 'SaaS landing page and UI dashboard animation walkthrough, styled using interactive clean CSS components.',
  tags: ['Vibe Coding', 'Tailwind', 'Figma AI'],
  video: 'https://res.cloudinary.com/dwfjax67x/video/upload/Reshma_Website_WebQ_Reel_1_gqohvf.mp4',
  studentName: 'Abhishek S.',
  studentImg: 'https://images.unsplash.com/photo-1560250097-0b93528c311a?q=80&w=150&auto=format&fit=crop'
}, {
  title: 'Arike Romantic Album',
  brand: 'Lover\'s Lane',
  cat: 'Film Making',
  desc: 'Short romance-genre cinema short detailing character interaction, showcasing expressions and body movements.',
  tags: ['Sora', 'Midjourney Ref', 'Luma'],
  video: 'https://res.cloudinary.com/dwfjax67x/video/upload/Romantic_Couple_Short_video_k1m9ba.mp4',
  studentName: 'Sanjay Nair',
  studentImg: 'https://images.unsplash.com/photo-1566492031773-4f4e44671857?q=80&w=150&auto=format&fit=crop'
}, {
  title: 'Velox Technology',
  brand: 'Velox Timepieces',
  cat: 'Film Making',
  desc: 'Sleek sports watch advertisement featuring liquid metal styling, water splashes, and high speed CGI.',
  tags: ['Runway Gen-3', 'C4D AI', 'Premiere Pro'],
  video: 'https://res.cloudinary.com/dwfjax67x/video/upload/Velox_Reel_1_xeweqz.mp4',
  studentName: 'Pranav V.',
  studentImg: 'https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?q=80&w=150&auto=format&fit=crop'
}, {
  title: 'Sky Bound Travals',
  brand: 'Chronicle Cinema',
  cat: 'Content Creation',
  desc: 'Atmospheric sci-fi video mapping out deep space travel and nebula views, fully generated from prompt scripts.',
  tags: ['Pika v2', 'Sora v2', 'Logic Pro'],
  video: 'https://res.cloudinary.com/dwfjax67x/video/upload/Sky_Bound_Traval_Agency_vg5oqa.mp4',
  studentName: 'Abhijith Nair',
  studentImg: 'https://images.unsplash.com/photo-1531427186611-ecfd6d936c79?q=80&w=150&auto=format&fit=crop'
}];
const journeyTimeline = [{
  step: 'Step 1',
  title: 'Enroll',
  desc: 'Secure lifetime access to your chosen AI course and unlock the full curriculum instantly.'
}, {
  step: 'Step 2',
  title: 'Learn AI Tools',
  desc: 'Master prompt engineering, asset workflows, and generative AI systems through guided lessons.'
}, {
  step: 'Step 3',
  title: 'Build Real Projects',
  desc: 'Create professional mockups, films, and code templates that mirror real industry work.'
}, {
  step: 'Step 4',
  title: 'Create Portfolio',
  desc: 'Polish a high-quality showcase of your work to attract employers, clients, and opportunities.'
}, {
  step: 'Step 5',
  title: 'Launch & Scale',
  desc: 'Apply your AI skills directly to increase productivity and scale your freelance or business ventures.'
}];
const studentTestimonials = [{
  name: 'Kevin Tiju',
  role: 'Google Review',
  rating: 5,
  review: 'Hilghly recommended AI learning platform. Simple, short structured and effective classes.',
  avatar: 'https://ui-avatars.com/api/?name=Kevin+Tiju&background=F97316&color=fff&size=150&bold=true',
  project: 'Verified Google Review ⭐'
}, {
  name: 'Vysakh Kallachi',
  role: 'Google Review',
  rating: 5,
  review: 'Highly recommend their AI services. Communication was smooth, delivery was on time, and the results exceeded our expectations.',
  avatar: 'https://ui-avatars.com/api/?name=Vysakh+Kallachi&background=6366F1&color=fff&size=150&bold=true',
  project: 'Verified Google Review ⭐'
}, {
  name: 'Amal Kuttu',
  role: 'Google Review',
  rating: 5,
  review: 'Working with this team was a great experience. They understood our requirements and delivered practical AI solutions that improved our workflow. overall it\'s a good experience',
  avatar: 'https://ui-avatars.com/api/?name=Amal+Kuttu&background=10B981&color=fff&size=150&bold=true',
  project: 'Verified Google Review ⭐'
}];
const StudentProjectCard = ({
  proj,
  onOpenTheater
}) => {
  const videoRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const handleMouseEnter = () => {
    if (videoRef.current) {
      videoRef.current.play().then(() => {
        setIsPlaying(true);
      }).catch(err => {
        // Auto-play might be blocked or postponed
      });
    }
  };
  const handleMouseLeave = () => {
    if (videoRef.current) {
      videoRef.current.pause();
      setIsPlaying(false);
    }
  };
  return /*#__PURE__*/React.createElement("div", {
    onMouseEnter: handleMouseEnter,
    onMouseLeave: handleMouseLeave,
    onClick: onOpenTheater,
    className: "masonry-item liquid-glass rounded-3xl overflow-hidden flex flex-col justify-between h-full group cursor-pointer"
  }, /*#__PURE__*/React.createElement("div", {
    className: "h-48 md:h-52 w-full overflow-hidden relative border-b border-white/5 bg-slate-950 flex items-center justify-center"
  }, proj.video ? /*#__PURE__*/React.createElement("video", {
    ref: videoRef,
    src: proj.video,
    loop: true,
    muted: true,
    playsInline: true,
    controlsList: "nodownload",
    onContextMenu: e => e.preventDefault(),
    className: "w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity duration-500"
  }) : /*#__PURE__*/React.createElement("img", {
    src: proj.image,
    alt: proj.title,
    className: "w-full h-full object-cover opacity-80 group-hover:opacity-100 group-hover:scale-[1.03] transition-all duration-500"
  }), /*#__PURE__*/React.createElement("div", {
    className: "absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent pointer-events-none"
  }), proj.video ? !isPlaying && /*#__PURE__*/React.createElement("div", {
    className: "absolute inset-0 flex items-center justify-center bg-black/30 pointer-events-none transition-all duration-300"
  }, /*#__PURE__*/React.createElement("div", {
    className: "w-11 h-11 rounded-full bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center text-white scale-90 group-hover:scale-100 transition-transform duration-300"
  }, /*#__PURE__*/React.createElement("svg", {
    xmlns: "http://www.w3.org/2000/svg",
    viewBox: "0 0 24 24",
    fill: "currentColor",
    className: "w-4 h-4 ml-0.5 fill-white text-white"
  }, /*#__PURE__*/React.createElement("path", {
    d: "M8 5v14l11-7z"
  })))) : /*#__PURE__*/React.createElement("div", {
    className: "absolute inset-0 flex items-center justify-center bg-black/30 opacity-0 group-hover:opacity-100 pointer-events-none transition-all duration-300"
  }, /*#__PURE__*/React.createElement("div", {
    className: "w-11 h-11 rounded-full bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center text-white scale-90 group-hover:scale-100 transition-transform duration-300"
  }, /*#__PURE__*/React.createElement("svg", {
    xmlns: "http://www.w3.org/2000/svg",
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "2.5",
    strokeLinecap: "round",
    strokeLinejoin: "round",
    className: "w-4 h-4 text-white"
  }, /*#__PURE__*/React.createElement("circle", {
    cx: "11",
    cy: "11",
    r: "8"
  }), /*#__PURE__*/React.createElement("line", {
    x1: "21",
    y1: "21",
    x2: "16.65",
    y2: "16.65"
  })))), /*#__PURE__*/React.createElement("span", {
    className: "absolute top-4 right-4 px-3 py-1 rounded-full bg-brand-cyan/25 border border-brand-cyan/35 text-[9px] font-mono font-bold uppercase tracking-wider text-brand-cyan"
  }, proj.cat)), /*#__PURE__*/React.createElement("div", {
    className: "p-6 md:p-8 text-left flex-grow flex flex-col justify-between"
  }, /*#__PURE__*/React.createElement("div", {
    className: "mb-6"
  }, /*#__PURE__*/React.createElement("div", {
    className: "text-[9px] font-mono text-gray-500 uppercase tracking-widest mb-1.5 font-bold"
  }, proj.brand), /*#__PURE__*/React.createElement("h3", {
    className: "text-lg font-heading font-black text-white uppercase tracking-tight group-hover:text-brand-cyan transition-colors duration-300 mb-2 leading-snug"
  }, proj.title), /*#__PURE__*/React.createElement("p", {
    className: "text-gray-400 text-xs md:text-sm font-light leading-relaxed"
  }, proj.desc)), /*#__PURE__*/React.createElement("div", {
    className: "flex items-center space-x-2.5 pt-4 border-t border-white/5"
  }, /*#__PURE__*/React.createElement("img", {
    src: proj.studentImg,
    alt: proj.studentName,
    className: "w-6 h-6 rounded-full object-cover border border-white/10"
  }), /*#__PURE__*/React.createElement("div", {
    className: "flex flex-col text-left"
  }, /*#__PURE__*/React.createElement("span", {
    className: "text-[10px] font-semibold text-gray-300 group-hover:text-white transition-colors duration-300 leading-none"
  }, proj.studentName), /*#__PURE__*/React.createElement("span", {
    className: "text-[8px] font-mono text-gray-500 uppercase tracking-wider mt-0.5 leading-none"
  }, "Student Creator")))));
};
const getDriveFileId = url => {
  if (!url) return null;
  if (url.includes('drive.google.com')) {
    const matchUc = url.match(/id=([a-zA-Z0-9_-]+)/);
    if (matchUc) return matchUc[1];
    const matchD = url.match(/\/d\/([a-zA-Z0-9_-]+)/);
    if (matchD) return matchD[1];
  }
  return null;
};
const AudioPlayer = ({
  fileUrl,
  getAttachmentUrl,
  GOOGLE_SHEET_WEBHOOK_URL,
  isMentor,
  timeStr,
  msgStatus
}) => {
  const [audioSrc, setAudioSrc] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const audioRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [position, setPosition] = useState(0);
  const [duration, setDuration] = useState(0);
  const WAVEFORM_HEIGHTS = [6, 12, 18, 14, 8, 10, 16, 22, 14, 12, 8, 6, 10, 16, 20, 14, 18, 12, 8, 6, 12, 16, 10, 8, 12, 14, 6];
  useEffect(() => {
    if (!fileUrl) return;
    const fileId = getDriveFileId(fileUrl);
    if (!fileId) {
      setAudioSrc(fileUrl);
      return;
    }
    let active = true;
    setLoading(true);
    setError('');
    const fetchAudio = async () => {
      try {
        const url = `${GOOGLE_SHEET_WEBHOOK_URL}?action=get_file_base64&id=${fileId}`;
        const response = await fetch(url);
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        const result = await response.json();
        if (result.status === 'success' && result.base64) {
          const byteCharacters = atob(result.base64);
          const byteNumbers = new Array(byteCharacters.length);
          for (let i = 0; i < byteCharacters.length; i++) {
            byteNumbers[i] = byteCharacters.charCodeAt(i);
          }
          const byteArray = new Uint8Array(byteNumbers);
          const blob = new Blob([byteArray], {
            type: result.mimeType || 'audio/m4a'
          });
          const blobUrl = URL.createObjectURL(blob);
          if (active) {
            setAudioSrc(blobUrl);
          }
        } else {
          throw new Error(result.message || 'Failed to fetch base64 data');
        }
      } catch (err) {
        console.error("Error loading voice message:", err);
        if (active) {
          setError('Failed to load audio');
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };
    fetchAudio();
    return () => {
      active = false;
      if (audioSrc && audioSrc.startsWith('blob:')) {
        URL.revokeObjectURL(audioSrc);
      }
    };
  }, [fileUrl, GOOGLE_SHEET_WEBHOOK_URL]);
  const togglePlay = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
  };
  const handleEnded = () => {
    setIsPlaying(false);
    setPosition(0);
  };
  const formatTimeHelper = sec => {
    if (typeof sec !== 'number' || isNaN(sec)) return '0:00';
    const mins = Math.floor(sec / 60);
    const secs = Math.floor(sec % 60);
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };
  if (loading) {
    return /*#__PURE__*/React.createElement("div", {
      className: "flex items-center gap-2 py-2 px-3 text-[10px] text-brand-cyan font-mono animate-pulse min-w-[270px]"
    }, /*#__PURE__*/React.createElement("svg", {
      className: "animate-spin h-3.5 w-3.5",
      viewBox: "0 0 24 24",
      fill: "none"
    }, /*#__PURE__*/React.createElement("circle", {
      className: "opacity-25",
      cx: "12",
      cy: "12",
      r: "10",
      stroke: "currentColor",
      strokeWidth: "4"
    }), /*#__PURE__*/React.createElement("path", {
      className: "opacity-75",
      fill: "currentColor",
      d: "M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
    })), /*#__PURE__*/React.createElement("span", null, "Downloading voice note..."));
  }
  if (error) {
    return /*#__PURE__*/React.createElement("div", {
      className: "text-[10px] text-rose-500 font-mono py-2 px-3 min-w-[270px]"
    }, "\u26A0\uFE0F ", error);
  }
  return /*#__PURE__*/React.createElement("div", {
    className: `flex flex-col gap-1.5 min-w-[270px] p-3 rounded-2xl transition duration-200 ${isMentor ? 'bg-[#2563eb]/10 border border-[#2563eb]/25 text-white rounded-tr-sm' : 'bg-[#1f1f23]/40 border border-[#1f1f23]/60 text-gray-200 rounded-tl-sm'}`
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-3 w-full"
  }, isMentor ? /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
    className: "relative shrink-0 select-none"
  }, /*#__PURE__*/React.createElement("img", {
    src: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?q=80&w=100&auto=format&fit=crop",
    className: "w-8 h-8 rounded-full object-cover border border-[#2563eb]/35",
    alt: "Mentor avatar"
  }), /*#__PURE__*/React.createElement("div", {
    className: "absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-blue-600 flex items-center justify-center border border-zinc-950"
  }, /*#__PURE__*/React.createElement("svg", {
    xmlns: "http://www.w3.org/2000/svg",
    viewBox: "0 0 24 24",
    fill: "currentColor",
    className: "w-2.5 h-2.5 text-white"
  }, /*#__PURE__*/React.createElement("path", {
    d: "M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z"
  })))), /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: togglePlay,
    className: "w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 border border-white/10 flex items-center justify-center shrink-0 transition"
  }, isPlaying ? /*#__PURE__*/React.createElement("svg", {
    xmlns: "http://www.w3.org/2000/svg",
    viewBox: "0 0 24 24",
    fill: "currentColor",
    className: "w-3.5 h-3.5 text-white"
  }, /*#__PURE__*/React.createElement("path", {
    d: "M6 19h4V5H6v14zm8-14v14h4V5h-4z"
  })) : /*#__PURE__*/React.createElement("svg", {
    xmlns: "http://www.w3.org/2000/svg",
    viewBox: "0 0 24 24",
    fill: "currentColor",
    className: "w-3.5 h-3.5 text-white ml-0.5"
  }, /*#__PURE__*/React.createElement("path", {
    d: "M8 5v14l11-7z"
  }))), /*#__PURE__*/React.createElement("div", {
    className: "flex-grow flex items-center gap-0.5 h-6 select-none relative"
  }, WAVEFORM_HEIGHTS.map((height, idx) => {
    const progress = duration > 0 ? position / duration : 0;
    const isActive = idx / WAVEFORM_HEIGHTS.length <= progress;
    return /*#__PURE__*/React.createElement("span", {
      key: idx,
      style: {
        height: `${height}px`
      },
      className: `w-0.5 rounded-full origin-center transition-all ${isActive ? 'bg-brand-cyan shadow-[0_0_8px_rgba(0,240,255,0.4)]' : 'bg-white/20'}`
    });
  }))) : /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: togglePlay,
    className: "w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 border border-white/10 flex items-center justify-center shrink-0 transition"
  }, isPlaying ? /*#__PURE__*/React.createElement("svg", {
    xmlns: "http://www.w3.org/2000/svg",
    viewBox: "0 0 24 24",
    fill: "currentColor",
    className: "w-3.5 h-3.5 text-white"
  }, /*#__PURE__*/React.createElement("path", {
    d: "M6 19h4V5H6v14zm8-14v14h4V5h-4z"
  })) : /*#__PURE__*/React.createElement("svg", {
    xmlns: "http://www.w3.org/2000/svg",
    viewBox: "0 0 24 24",
    fill: "currentColor",
    className: "w-3.5 h-3.5 text-white ml-0.5"
  }, /*#__PURE__*/React.createElement("path", {
    d: "M8 5v14l11-7z"
  }))), /*#__PURE__*/React.createElement("div", {
    className: "flex-grow flex items-center gap-0.5 h-6 select-none relative"
  }, WAVEFORM_HEIGHTS.map((height, idx) => {
    const progress = duration > 0 ? position / duration : 0;
    const isActive = idx / WAVEFORM_HEIGHTS.length <= progress;
    return /*#__PURE__*/React.createElement("span", {
      key: idx,
      style: {
        height: `${height}px`
      },
      className: `w-0.5 rounded-full origin-center transition-all ${isActive ? 'bg-brand-violet shadow-[0_0_8px_rgba(168,85,247,0.4)]' : 'bg-white/20'}`
    });
  })), /*#__PURE__*/React.createElement("div", {
    className: "relative shrink-0 select-none"
  }, /*#__PURE__*/React.createElement("img", {
    src: "https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?q=80&w=100&auto=format&fit=crop",
    className: "w-8 h-8 rounded-full object-cover border border-[#a855f7]/35",
    alt: "Student avatar"
  }), /*#__PURE__*/React.createElement("div", {
    className: "absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-purple-600 flex items-center justify-center border border-zinc-950"
  }, /*#__PURE__*/React.createElement("svg", {
    xmlns: "http://www.w3.org/2000/svg",
    viewBox: "0 0 24 24",
    fill: "currentColor",
    className: "w-2.5 h-2.5 text-white"
  }, /*#__PURE__*/React.createElement("path", {
    d: "M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z"
  })))))), /*#__PURE__*/React.createElement("div", {
    className: "flex justify-between items-center text-[8px] font-mono text-white/50 px-1 mt-0.5 uppercase select-none"
  }, /*#__PURE__*/React.createElement("span", null, formatTimeHelper(Math.floor(position))), /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-1"
  }, /*#__PURE__*/React.createElement("span", null, timeStr), isMentor && /*#__PURE__*/React.createElement("span", {
    className: `font-sans font-bold ${msgStatus === 'read' ? 'text-brand-cyan' : 'text-white/45'}`
  }, msgStatus === 'sent' || !msgStatus ? '✓' : '✓✓'))), /*#__PURE__*/React.createElement("audio", {
    ref: audioRef,
    src: audioSrc,
    onPlay: () => setIsPlaying(true),
    onPause: () => setIsPlaying(false),
    onTimeUpdate: e => setPosition(e.target.currentTime),
    onLoadedMetadata: e => setDuration(e.target.duration),
    onEnded: handleEnded,
    className: "hidden"
  }));
};
const VideoChatPreview = ({
  fileUrl,
  getAttachmentUrl,
  onPress,
  timeStr,
  isMentor,
  msgStatus,
  hasCaption
}) => {
  const [duration, setDuration] = useState('0:00');
  const [thumbnailUrl, setThumbnailUrl] = useState('');
  useEffect(() => {
    if (!fileUrl) return;
    setThumbnailUrl(getAttachmentUrl(fileUrl, 'video_thumbnail'));
  }, [fileUrl, getAttachmentUrl]);
  const handleVideoMetadata = e => {
    const d = e.target.duration;
    if (d && !isNaN(d)) {
      const mins = Math.floor(d / 60);
      const secs = Math.floor(d % 60);
      setDuration(`${mins}:${secs < 10 ? '0' : ''}${secs}`);
    }
  };
  return /*#__PURE__*/React.createElement("div", {
    onClick: onPress,
    className: "relative w-full h-auto max-h-[480px] overflow-hidden cursor-pointer group select-none"
  }, /*#__PURE__*/React.createElement("img", {
    src: thumbnailUrl || 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=400&auto=format&fit=crop',
    className: "w-full h-auto max-h-[480px] object-cover block",
    alt: "Video preview",
    onError: e => {
      e.target.src = 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=400&auto=format&fit=crop';
    }
  }), /*#__PURE__*/React.createElement("video", {
    src: getAttachmentUrl(fileUrl, 'video'),
    onLoadedMetadata: handleVideoMetadata,
    className: "hidden",
    preload: "metadata"
  }), /*#__PURE__*/React.createElement("div", {
    className: "absolute inset-0 bg-black/35 flex items-center justify-center transition-all group-hover:bg-black/50"
  }, /*#__PURE__*/React.createElement("div", {
    className: "w-12 h-12 rounded-full bg-white/15 backdrop-blur-md border border-white/20 flex items-center justify-center text-white transition-all group-hover:scale-105"
  }, /*#__PURE__*/React.createElement("svg", {
    xmlns: "http://www.w3.org/2000/svg",
    viewBox: "0 0 24 24",
    fill: "currentColor",
    className: "w-5 h-5 text-white ml-0.5"
  }, /*#__PURE__*/React.createElement("path", {
    d: "M8 5v14l11-7z"
  })))), /*#__PURE__*/React.createElement("div", {
    className: "absolute bottom-2.5 left-2.5 right-2.5 flex justify-between items-center z-10 select-none"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-1.5"
  }, /*#__PURE__*/React.createElement("div", {
    className: "px-1.5 py-0.5 rounded bg-brand-cyan/20 border border-brand-cyan/30 text-brand-cyan text-[8px] font-bold tracking-wider font-mono"
  }, "HD"), /*#__PURE__*/React.createElement("span", {
    className: "text-[8px] text-white/75 font-mono bg-black/50 px-1.5 py-0.5 rounded"
  }, duration)), !hasCaption && /*#__PURE__*/React.createElement("div", {
    className: "px-2 py-0.5 rounded bg-black/55 backdrop-blur-sm flex items-center gap-1 text-[8px] text-white/75 font-mono"
  }, timeStr, isMentor && /*#__PURE__*/React.createElement("span", {
    className: `font-sans font-bold ${msgStatus === 'read' ? 'text-brand-cyan' : 'text-white/45'}`
  }, msgStatus === 'sent' || !msgStatus ? '✓' : '✓✓'))));
};
const DEFAULT_COURSE_CURRICULUM = {
  "AI Fundamentals": [{
    id: "af-1",
    title: "What is AI & How It Works",
    duration: "1 min",
    videoUrl: "https://res.cloudinary.com/dwfjax67x/video/upload/CGI_Ad_Video_Tender_coconut_mm1yoo.mp4",
    description: "Understand the core concepts of Artificial Intelligence, machine learning, and how AI is transforming creative industries.",
    difficulty: "Beginner",
    tags: ["AI Basics", "Intro", "Concepts"],
    resources: [{
      name: "AI Fundamentals Quick Guide PDF",
      size: "1.5 MB",
      url: "https://res.cloudinary.com/dwfjax67x/video/upload/CGI_Ad_Video_Tender_coconut_mm1yoo.mp4"
    }]
  }, {
    id: "af-2",
    title: "Prompt Engineering for Beginners",
    duration: "1 min",
    videoUrl: "https://res.cloudinary.com/dwfjax67x/video/upload/Golden_tea_Ad_ebxdah.mp4",
    description: "Learn how to write effective prompts for ChatGPT, Gemini, and other AI tools to get accurate and creative results.",
    difficulty: "Beginner",
    tags: ["Prompting", "ChatGPT", "Best Practices"],
    resources: [{
      name: "Prompt Template Library",
      size: "2.1 MB",
      url: "https://res.cloudinary.com/dwfjax67x/video/upload/Golden_tea_Ad_ebxdah.mp4"
    }]
  }, {
    id: "af-3",
    title: "AI Tools Overview & Setup",
    duration: "2 mins",
    videoUrl: "https://res.cloudinary.com/dwfjax67x/video/upload/Grandmas_Sweet_iyztel.mp4",
    description: "Get hands-on with popular AI tools: ChatGPT, Gemini, Canva AI, and Leonardo AI. Set up your accounts and create your first AI project.",
    difficulty: "Beginner",
    tags: ["Tools Setup", "Hands-on", "Projects"],
    resources: [{
      name: "AI Tools Installation Guide",
      size: "3.2 MB",
      url: "https://res.cloudinary.com/dwfjax67x/video/upload/Grandmas_Sweet_iyztel.mp4"
    }]
  }],
  "Graphic Design": [{
    id: "gd-1",
    title: "CGI Ad Video - Tender Coconut",
    duration: "1 min",
    videoUrl: "https://res.cloudinary.com/dwfjax67x/video/upload/CGI_Ad_Video_Tender_coconut_mm1yoo.mp4",
    description: "Learn how to build visual 3D tender coconut elements and integrate them into dynamic commercial CGI layouts. Perfect for advertising creatives.",
    difficulty: "Intermediate",
    tags: ["CGI", "Product Ad", "Blender"],
    resources: [{
      name: "3D Tender Coconut Asset Bundle",
      size: "14.2 MB",
      url: "https://res.cloudinary.com/dwfjax67x/video/upload/CGI_Ad_Video_Tender_coconut_mm1yoo.mp4"
    }, {
      name: "Lighting & Materials Setup Guide PDF",
      size: "2.4 MB",
      url: "https://res.cloudinary.com/dwfjax67x/video/upload/CGI_Ad_Video_Tender_coconut_mm1yoo.mp4"
    }]
  }, {
    id: "gd-2",
    title: "Golden Tea Ad Commercial",
    duration: "1 min",
    videoUrl: "https://res.cloudinary.com/dwfjax67x/video/upload/Golden_tea_Ad_ebxdah.mp4",
    description: "Step-by-step breakdown of designing fluid tea animations and gold branding highlights for high-end beverage commercials.",
    difficulty: "Advanced",
    tags: ["Fluids simulation", "Gold VFX", "Color Grading"],
    resources: [{
      name: "Gold Material Settings & Presets",
      size: "1.8 MB",
      url: "https://res.cloudinary.com/dwfjax67x/video/upload/Golden_tea_Ad_ebxdah.mp4"
    }]
  }, {
    id: "gd-3",
    title: "Jewllery Advertisement Showcase",
    duration: "1 min",
    videoUrl: "https://res.cloudinary.com/dwfjax67x/video/upload/Jewllery_ads_uikdt5.mp4",
    description: "Mastering micro-refraction and diamond lighting angles to create luxury jewellery ads. Focus on composition and depth of field.",
    difficulty: "Advanced",
    tags: ["Macro lighting", "Jewellery design", "Render passes"],
    resources: [{
      name: "Luxury Studio HDRI Map",
      size: "32.0 MB",
      url: "https://res.cloudinary.com/dwfjax67x/video/upload/Jewllery_ads_uikdt5.mp4"
    }]
  }],
  "Film Making": [{
    id: "fm-1",
    title: "Cinematic Car Ads Project",
    duration: "1 min",
    videoUrl: "https://res.cloudinary.com/dwfjax67x/video/upload/Car_Ads_hnpyf0.mp4",
    description: "Explore camera paths, dynamic pacing, and sound design layers to construct high-energy, cinematic automotive commercials.",
    difficulty: "Intermediate",
    tags: ["Speed ramping", "Camera paths", "Sound design"],
    resources: [{
      name: "Sound Design SFX Pack",
      size: "45.1 MB",
      url: "https://res.cloudinary.com/dwfjax67x/video/upload/Car_Ads_hnpyf0.mp4"
    }]
  }, {
    id: "fm-2",
    title: "Grandma's Sweet Storyboard Video",
    duration: "2 mins",
    videoUrl: "https://res.cloudinary.com/dwfjax67x/video/upload/Grandmas_Sweet_iyztel.mp4",
    description: "How to tell emotional, narrative-driven stories through cinematography. Analyzing framing, warm lighting, and actor pacing.",
    difficulty: "Beginner",
    tags: ["Storytelling", "Warm lighting", "Framing"],
    resources: [{
      name: "Storyboard Blank Template PDF",
      size: "1.1 MB",
      url: "https://res.cloudinary.com/dwfjax67x/video/upload/Grandmas_Sweet_iyztel.mp4"
    }]
  }, {
    id: "fm-3",
    title: "Romantic Couple Short Cinematic",
    duration: "1 min",
    videoUrl: "https://res.cloudinary.com/dwfjax67x/video/upload/Romantic_Couple_Short_video_k1m9ba.mp4",
    description: "Focus on capturing slow-motion expressions, sunset backlighting, and warm-toned color grading for romantic visuals.",
    difficulty: "Beginner",
    tags: ["Slow motion", "Backlighting", "Grading"],
    resources: [{
      name: "LUTs Pack - Cinematic Warm Gold",
      size: "8.4 MB",
      url: "https://res.cloudinary.com/dwfjax67x/video/upload/Romantic_Couple_Short_video_k1m9ba.mp4"
    }]
  }],
  "Content Creation": [{
    id: "cc-1",
    title: "KOME Reel - French Edition",
    duration: "1 min",
    videoUrl: "https://res.cloudinary.com/dwfjax67x/video/upload/KOME_Reel_-2_French_j0arz5.mp4",
    description: "Dissecting fast-paced typography transitions and modern French aesthetics used to capture high engagement in brand reels.",
    difficulty: "Intermediate",
    tags: ["Kinetic text", "Transitions", "Reels format"],
    resources: [{
      name: "Premiere Pro Text Templates",
      size: "12.2 MB",
      url: "https://res.cloudinary.com/dwfjax67x/video/upload/KOME_Reel_-2_French_j0arz5.mp4"
    }]
  }, {
    id: "cc-2",
    title: "Mayflower Reel 2 Project",
    duration: "1 min",
    videoUrl: "https://res.cloudinary.com/dwfjax67x/video/upload/Mayflower_Reel_2_blefup.mp4",
    description: "Advanced audio syncing techniques and creative text overlays to create visual impact for storytelling reels.",
    difficulty: "Intermediate",
    tags: ["Audio syncing", "Text overlays", "Retention tips"],
    resources: [{
      name: "Hook Templates (50 Script Ideas)",
      size: "420 KB",
      url: "https://res.cloudinary.com/dwfjax67x/video/upload/Mayflower_Reel_2_blefup.mp4"
    }]
  }, {
    id: "cc-3",
    title: "Regalia Brand Reel 1",
    duration: "1 min",
    videoUrl: "https://res.cloudinary.com/dwfjax67x/video/upload/Regalia_reel_1_gc2qyp.mp4",
    description: "Clean aesthetic product shots with smooth pan camera moves. Crafting premium content on budget setups.",
    difficulty: "Beginner",
    tags: ["Product shots", "Pan movements", "Budget setups"],
    resources: [{
      name: "Budget Equipment Guide PDF",
      size: "3.5 MB",
      url: "https://res.cloudinary.com/dwfjax67x/video/upload/Regalia_reel_1_gc2qyp.mp4"
    }]
  }],
  "Vibe Coding": [{
    id: "vc-1",
    title: "Reshma Website WebQ Reel",
    duration: "1 min",
    videoUrl: "https://res.cloudinary.com/dwfjax67x/video/upload/Reshma_Website_WebQ_Reel_1_gqohvf.mp4",
    description: "Watch the build flow of a developer landing page using Claude 3.5 Sonnet. Best practices in prompt structure and component validation.",
    difficulty: "Beginner",
    tags: ["Claude 3.5", "Vite JS", "Components"],
    resources: [{
      name: "Prompts System Template MD",
      size: "120 KB",
      url: "https://res.cloudinary.com/dwfjax67x/video/upload/Reshma_Website_WebQ_Reel_1_gqohvf.mp4"
    }]
  }, {
    id: "vc-2",
    title: "Velox Reel System Integration",
    duration: "2 mins",
    videoUrl: "https://res.cloudinary.com/dwfjax67x/video/upload/Velox_Reel_1_xeweqz.mp4",
    description: "Building database hooks and payment checkouts dynamically with generative code tools. Complete testing guide.",
    difficulty: "Advanced",
    tags: ["API hooks", "Payments integration", "Node JS"],
    resources: [{
      name: "Stripe Webhook Script template",
      size: "45 KB",
      url: "https://res.cloudinary.com/dwfjax67x/video/upload/Velox_Reel_1_xeweqz.mp4"
    }]
  }],
  "Business Automation": [{
    id: "ba-1",
    title: "Sky Bound Travel Agency Automations",
    duration: "1 min",
    videoUrl: "https://res.cloudinary.com/dwfjax67x/video/upload/Sky_Bound_Traval_Agency_vg5oqa.mp4",
    description: "Automate leads from Google Ads directly to WhatsApp notifications and CRM databases using Make.com (integromat).",
    difficulty: "Intermediate",
    tags: ["Make.com", "CRM Sync", "WhatsApp API"],
    resources: [{
      name: "Make.com Scenario blueprint JSON",
      size: "340 KB",
      url: "https://res.cloudinary.com/dwfjax67x/video/upload/Sky_Bound_Traval_Agency_vg5oqa.mp4"
    }]
  }, {
    id: "ba-2",
    title: "OPTIC EXPO 2025 System Demo",
    duration: "1 min",
    videoUrl: "https://res.cloudinary.com/dwfjax67x/video/upload/OPTIC_EXPO_2025_joubt6.mp4",
    description: "Bulk registration automations and check-in system design utilizing QR scanning and Apps Script sync logs.",
    difficulty: "Advanced",
    tags: ["QR verification", "Google Sheets API", "Expo Router"],
    resources: [{
      name: "QR Scanner React Native hook code",
      size: "12 KB",
      url: "https://res.cloudinary.com/dwfjax67x/video/upload/OPTIC_EXPO_2025_joubt6.mp4"
    }]
  }]
};

// --- BLOG PAGE COMPONENT ---

const BlogPage = ({ closeBlog }) => {
  const [selectedArticle, setSelectedArticle] = useState(null);
  const [category, setCategory] = useState('All Articles');
  const [search, setSearch] = useState('');
  const [showAll, setShowAll] = useState(false);
  const [email, setEmail] = useState('');
  const [subscribed, setSubscribed] = useState(false);

  const categories = BLOG_CATEGORIES;
  const allArticles = BLOG_ARTICLES;
  const featuredArticle = allArticles.find(a => a.featured);
  const popularArticles = allArticles.filter(a => a.popular).slice(0, 3);

  const filtered = allArticles.filter(a => {
    const matchCategory = category === 'All Articles' || a.category === category;
    const matchSearch = !search || a.title.toLowerCase().includes(search.toLowerCase()) || a.excerpt.toLowerCase().includes(search.toLowerCase());
    return matchCategory && matchSearch;
  });

  const displayedArticles = showAll ? filtered : filtered.slice(0, 6);

  const handleSubscribe = e => {
    e.preventDefault();
    if (email) {
      setSubscribed(true);
      setEmail('');
      setTimeout(() => setSubscribed(false), 3000);
    }
  };

  const formatContent = text => {
    return text.split('\n').filter(p => p.trim()).map((p, i) => React.createElement("p", {
      key: i,
      className: "text-gray-300 leading-relaxed mb-4 text-sm md:text-base"
    }, p.trim()));
  };

  // Full article view
  if (selectedArticle) {
    const a = selectedArticle;
    return React.createElement("div", {
      className: "fixed inset-0 z-[100000] bg-zinc-950 flex flex-col font-sans select-text text-left overflow-y-auto"
    }, React.createElement("div", {
      className: "sticky top-0 z-50 flex items-center justify-between px-4 md:px-8 py-4 border-b border-white/10 bg-zinc-950/90 backdrop-blur-xl"
    }, React.createElement("button", {
      onClick: () => setSelectedArticle(null),
      className: "flex items-center gap-2 text-sm text-gray-400 hover:text-white transition-colors duration-300"
    }, React.createElement("svg", {
      width: "18",
      height: "18",
      viewBox: "0 0 24 24",
      fill: "none",
      stroke: "currentColor",
      strokeWidth: "2",
      strokeLinecap: "round",
      strokeLinejoin: "round"
    }, React.createElement("path", {
      d: "M19 12H5"
    }), React.createElement("polyline", {
      points: "12 19 5 12 12 5"
    })), "Back to Blog"), React.createElement("button", {
      onClick: closeBlog,
      className: "w-8 h-8 rounded-full border border-white/10 bg-white/5 flex items-center justify-center text-gray-400 hover:text-white hover:border-white/30 transition-all duration-300"
    }, React.createElement("svg", {
      width: "16",
      height: "16",
      viewBox: "0 0 24 24",
      fill: "none",
      stroke: "currentColor",
      strokeWidth: "2",
      strokeLinecap: "round",
      strokeLinejoin: "round"
    }, React.createElement("line", {
      x1: "18",
      y1: "6",
      x2: "6",
      y2: "18"
    }), React.createElement("line", {
      x1: "6",
      y1: "6",
      x2: "18",
      y2: "18"
    })))), React.createElement("article", {
      className: "max-w-3xl mx-auto w-full px-4 md:px-8 py-10 md:py-16"
    }, React.createElement("div", {
      className: "mb-8"
    }, React.createElement("span", {
      className: "text-xs font-mono text-brand-cyan font-bold uppercase tracking-widest"
    }, a.category), React.createElement("h1", {
      className: "text-2xl md:text-4xl font-black text-white font-heading mt-3 leading-tight"
    }, a.title), React.createElement("div", {
      className: "flex flex-wrap items-center gap-4 mt-4 text-xs text-gray-500"
    }, React.createElement("span", null, a.author), React.createElement("span", null, a.publishDate), React.createElement("span", null, a.readingTime))), React.createElement("div", {
      className: "w-full h-48 md:h-72 rounded-2xl bg-gradient-to-br from-brand-cyan/10 via-brand-violet/10 to-brand-blue/10 border border-white/5 mb-8 flex items-center justify-center"
    }, React.createElement("span", {
      className: "text-gray-600 text-sm"
    }, a.imageAlt)), React.createElement("div", {
      className: "prose prose-invert max-w-none"
    }, formatContent(a.content)), React.createElement("div", {
      className: "flex flex-wrap gap-2 mt-8 pt-6 border-t border-white/10"
    }, a.tags.map((tag, i) => React.createElement("span", {
      key: i,
      className: "px-3 py-1 text-xs font-semibold rounded-full bg-white/5 border border-white/10 text-gray-400"
    }, tag)))));
  }

  return React.createElement("div", {
    className: "fixed inset-0 z-[100000] bg-zinc-950 flex flex-col font-sans select-text text-left overflow-y-auto"
  }, React.createElement("div", {
    className: "sticky top-0 z-50 flex items-center justify-between px-4 md:px-8 lg:px-16 py-4 border-b border-white/10 bg-zinc-950/90 backdrop-blur-xl"
  }, React.createElement("span", {
    className: "text-base md:text-lg font-bold text-white font-heading tracking-tight"
  }, "Dxign Learn Blog"), React.createElement("button", {
    onClick: closeBlog,
    className: "w-8 h-8 rounded-full border border-white/10 bg-white/5 flex items-center justify-center text-gray-400 hover:text-white hover:border-white/30 transition-all duration-300",
    "aria-label": "Close blog"
  }, React.createElement("svg", {
    width: "16",
    height: "16",
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "2",
    strokeLinecap: "round",
    strokeLinejoin: "round"
  }, React.createElement("line", {
    x1: "18",
    y1: "6",
    x2: "6",
    y2: "18"
  }), React.createElement("line", {
    x1: "6",
    y1: "6",
    x2: "18",
    y2: "18"
  })))), React.createElement("section", {
    className: "pt-16 md:pt-24 pb-12 px-4 md:px-8 lg:px-16 relative z-10"
  }, React.createElement("div", {
    className: "max-w-7xl mx-auto w-full"
  }, React.createElement("div", {
    className: "max-w-2xl mb-12"
  }, React.createElement("span", {
    className: "text-xs font-mono text-brand-cyan font-bold uppercase tracking-widest flex items-center mb-3"
  }, React.createElement("span", {
    className: "w-1.5 h-1.5 bg-brand-cyan rounded-full mr-2"
  }), "AI Learning Blog"), React.createElement("h1", {
    className: "text-3xl md:text-5xl font-black text-white font-heading tracking-tight leading-none mb-4"
  }, "Insights &", React.createElement("br", null), "Tutorials"), React.createElement("p", {
    className: "text-gray-500 text-sm md:text-base max-w-lg leading-relaxed"
  }, "Explore expert guides, tool comparisons, career advice, and deep dives into the latest AI creative tools and workflows.")), React.createElement("div", {
    className: "flex flex-col md:flex-row gap-4 mb-8"
  }, React.createElement("div", {
    className: "relative flex-1 max-w-md"
  }, React.createElement("svg", {
    className: "absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500",
    width: "16",
    height: "16",
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "2",
    strokeLinecap: "round",
    strokeLinejoin: "round"
  }, React.createElement("circle", {
    cx: "11",
    cy: "11",
    r: "8"
  }), React.createElement("line", {
    x1: "21",
    y1: "21",
    x2: "16.65",
    y2: "16.65"
  })), React.createElement("input", {
    type: "text",
    placeholder: "Search articles...",
    value: search,
    onChange: e => setSearch(e.target.value),
    className: "w-full pl-10 pr-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-brand-cyan/40 transition-colors duration-300"
  })), React.createElement("div", {
    className: "flex flex-wrap gap-2"
  }, categories.map((cat, i) => React.createElement("button", {
    key: i,
    onClick: () => setCategory(cat),
    className: "px-4 py-2 rounded-full text-xs font-semibold uppercase tracking-wider transition-all duration-300 " + (category === cat ? "bg-brand-cyan text-black shadow-[0_0_20px_rgba(0,240,255,0.2)]" : "bg-white/5 border border-white/10 text-gray-400 hover:text-white hover:border-white/30")
  }, cat)))), featuredArticle && React.createElement("div", {
    className: "liquid-glass rounded-3xl p-6 md:p-8 mb-12 border border-white/5 cursor-pointer hover:border-brand-cyan/20 transition-all duration-500 group relative overflow-hidden"
  }, React.createElement("div", {
    className: "absolute inset-0 bg-gradient-to-r from-brand-cyan/5 via-transparent to-brand-violet/5 pointer-events-none"
  }), React.createElement("div", {
    className: "relative z-10 flex flex-col md:flex-row gap-6 md:gap-10 items-start"
  }, React.createElement("div", {
    className: "flex-1 min-w-0"
  }, React.createElement("span", {
    className: "text-xs font-mono text-brand-cyan font-bold uppercase tracking-widest"
  }, "Featured Article"), React.createElement("h2", {
    className: "text-xl md:text-3xl font-black text-white font-heading mt-3 leading-tight group-hover:text-brand-cyan transition-colors duration-300"
  }, featuredArticle.title), React.createElement("p", {
    className: "text-gray-400 text-sm mt-3 leading-relaxed"
  }, featuredArticle.excerpt), React.createElement("div", {
    className: "flex flex-wrap items-center gap-3 mt-4 text-xs text-gray-500"
  }, React.createElement("span", null, featuredArticle.author), React.createElement("span", null, featuredArticle.publishDate), React.createElement("span", null, featuredArticle.readingTime)), React.createElement("button", {
    onClick: () => setSelectedArticle(featuredArticle),
    className: "mt-5 inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-brand-cyan hover:text-white transition-colors duration-300"
  }, "Read Article", React.createElement("svg", {
    width: "14",
    height: "14",
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "2",
    strokeLinecap: "round",
    strokeLinejoin: "round"
  }, React.createElement("line", {
    x1: "5",
    y1: "12",
    x2: "19",
    y2: "12"
  }), React.createElement("polyline", {
    points: "12 5 19 12 12 19"
  })))), React.createElement("div", {
    className: "w-full md:w-56 h-32 md:h-40 rounded-2xl bg-gradient-to-br from-brand-cyan/10 via-brand-violet/10 to-brand-blue/10 border border-white/5 flex items-center justify-center flex-shrink-0"
  }, React.createElement("span", {
    className: "text-gray-600 text-xs text-center px-4"
  }, featuredArticle.imageAlt)))), React.createElement("div", {
    className: "flex flex-col lg:flex-row gap-10"
  }, React.createElement("div", {
    className: "flex-1 min-w-0"
  }, React.createElement("div", {
    className: "grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5"
  }, displayedArticles.map(a => React.createElement("div", {
    key: a.id,
    onClick: () => setSelectedArticle(a),
    className: "liquid-glass rounded-2xl p-5 border border-white/5 cursor-pointer hover:border-brand-cyan/20 transition-all duration-400 group flex flex-col"
  }, React.createElement("div", {
    className: "w-full h-36 rounded-xl bg-gradient-to-br from-brand-cyan/5 via-brand-violet/5 to-brand-blue/5 border border-white/5 mb-4 flex items-center justify-center"
  }, React.createElement("span", {
    className: "text-gray-600 text-[10px] text-center px-3 leading-relaxed"
  }, a.imageAlt)), React.createElement("span", {
    className: "text-[10px] font-mono text-brand-cyan font-bold uppercase tracking-widest mb-2"
  }, a.category), React.createElement("h3", {
    className: "text-sm font-bold text-white font-heading leading-snug group-hover:text-brand-cyan transition-colors duration-300 mb-2 line-clamp-2"
  }, a.title), React.createElement("p", {
    className: "text-xs text-gray-500 leading-relaxed flex-1 line-clamp-3"
  }, a.excerpt), React.createElement("div", {
    className: "flex items-center justify-between mt-4 pt-3 border-t border-white/5 text-[10px] text-gray-600"
  }, React.createElement("span", null, a.publishDate), React.createElement("span", null, a.readingTime))))), filtered.length > 6 && React.createElement("div", {
    className: "text-center mt-8"
  }, React.createElement("button", {
    onClick: () => setShowAll(!showAll),
    className: "px-6 py-2.5 rounded-full text-xs font-bold uppercase tracking-wider text-black bg-gradient-to-r from-brand-cyan to-brand-blue hover:shadow-[0_0_30px_rgba(0,240,255,0.3)] transition-all duration-300"
  }, showAll ? "Show Less" : "View All (" + filtered.length + ")"))), React.createElement("aside", {
    className: "w-full lg:w-72 flex-shrink-0"
  }, React.createElement("div", {
    className: "liquid-glass rounded-2xl p-6 border border-white/5 sticky top-24"
  }, React.createElement("h3", {
    className: "text-sm font-bold text-white font-heading mb-4"
  }, "Popular Articles"), React.createElement("div", {
    className: "flex flex-col gap-4"
  }, popularArticles.map(a => React.createElement("div", {
    key: a.id,
    onClick: () => setSelectedArticle(a),
    className: "cursor-pointer group"
  }, React.createElement("div", {
    className: "w-full h-20 rounded-xl bg-gradient-to-br from-brand-cyan/5 via-brand-violet/5 to-brand-blue/5 border border-white/5 mb-2 flex items-center justify-center"
  }, React.createElement("span", {
    className: "text-gray-600 text-[9px] text-center px-2 leading-relaxed"
  }, a.imageAlt)), React.createElement("h4", {
    className: "text-xs font-bold text-white font-heading leading-snug group-hover:text-brand-cyan transition-colors duration-300 line-clamp-2"
  }, a.title), React.createElement("div", {
    className: "flex items-center gap-2 mt-1 text-[9px] text-gray-500"
  }, React.createElement("span", null, a.publishDate), React.createElement("span", null, a.readingTime))))), React.createElement("div", {
    className: "mt-6 pt-5 border-t border-white/10"
  }, React.createElement("h4", {
    className: "text-xs font-bold text-white font-heading mb-3"
  }, "Categories"), React.createElement("div", {
    className: "flex flex-wrap gap-1.5"
  }, categories.filter(c => c !== 'All Articles').slice(0, 8).map((cat, i) => React.createElement("button", {
    key: i,
    onClick: () => setCategory(cat),
    className: "px-2.5 py-1 rounded-full text-[9px] font-semibold uppercase tracking-wider transition-all duration-300 " + (category === cat ? "bg-brand-cyan text-black" : "bg-white/5 border border-white/10 text-gray-400 hover:text-white")
  }, cat))))))), React.createElement("section", {
    className: "max-w-7xl mx-auto w-full mt-16 mb-8 px-4 md:px-8 lg:px-16"
  }, React.createElement("div", {
    className: "liquid-glass rounded-3xl p-8 md:p-12 border border-white/5 relative overflow-hidden"
  }, React.createElement("div", {
    className: "absolute inset-0 bg-gradient-to-r from-brand-cyan/5 via-brand-violet/5 to-brand-blue/5 pointer-events-none"
  }), React.createElement("div", {
    className: "relative z-10 max-w-xl mx-auto text-center"
  }, React.createElement("h2", {
    className: "text-xl md:text-3xl font-black text-white font-heading mb-3"
  }, "Stay Ahead with AI Insights"), React.createElement("p", {
    className: "text-gray-500 text-sm mb-6 leading-relaxed"
  }, "Get the latest AI tutorials, tool reviews, and creative tips delivered to your inbox every week."), subscribed ? React.createElement("div", {
    className: "px-6 py-3 rounded-xl bg-brand-cyan/10 border border-brand-cyan/20 text-brand-cyan text-sm font-semibold"
  }, "Thanks for subscribing!") : React.createElement("form", {
    onSubmit: handleSubscribe,
    className: "flex flex-col sm:flex-row gap-3 max-w-md mx-auto"
  }, React.createElement("input", {
    type: "email",
    placeholder: "Your email address",
    value: email,
    onChange: e => setEmail(e.target.value),
    required: true,
    className: "flex-1 px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-brand-cyan/40 transition-colors duration-300"
  }), React.createElement("button", {
    type: "submit",
    className: "px-6 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider text-black bg-gradient-to-r from-brand-cyan to-brand-blue hover:shadow-[0_0_30px_rgba(0,240,255,0.3)] transition-all duration-300 whitespace-nowrap"
  }, "Subscribe"))))), React.createElement("div", {
    className: "border-t border-white/5 py-6 px-4 md:px-8 lg:px-16 text-center"
  }, React.createElement("p", {
    className: "text-[10px] text-gray-600 font-mono"
  }, "\xA9 2026 Dxign Learn. All rights reserved.")))));
};

// --- MAIN REACT APPLICATION APP ---

const COURSE_PAYMENT_LINKS = {
  'Graphic Design': 'https://rzp.io/l/dxign-graphic-design',
  'Film Making': 'https://rzp.io/l/dxign-film-making',
  'Content Creation': 'https://rzp.io/l/dxign-content-creation',
  'Vibe Coding': 'https://rzp.io/l/dxign-vibe-coding',
  'Business Automation': 'https://rzp.io/l/dxign-business-automation'
};
const App = () => {
  const [showcaseFilter, setShowcaseFilter] = useState('All');
  const [activeTestimonial, setActiveTestimonial] = useState(0);
  const [courseCategory, setCourseCategory] = useState('all');
  const [courseView, setCourseView] = useState('grid');
  const [enrollModal, setEnrollModal] = useState(null); // holds selected course object
  const [closingModal, setClosingModal] = useState(false);
  const [showAllProjects, setShowAllProjects] = useState(false);
  const [theaterVideo, setTheaterVideo] = useState(null);
  const [carouselIndex, setCarouselIndex] = useState(0);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [mobileCoursesOpen, setMobileCoursesOpen] = useState(false);
  const [showIosModal, setShowIosModal] = useState(false);
  const [faqOpenStates, setFaqOpenStates] = useState({});
  const [isBlogOpen, setIsBlogOpen] = useState(false);
  const [blogCategory, setBlogCategory] = useState('All Articles');
  const [blogSearch, setBlogSearch] = useState('');
  const [showAllBlogs, setShowAllBlogs] = useState(false);
  const marqueeEl = useRef(null);
  const marqueePos = useRef(0);
  const marqueeBaseSpeed = useRef(0.3);
  useEffect(() => {
    const el = marqueeEl.current;
    if (!el) return;
    let lastScrollY = window.scrollY;
    let animId;
    const halfW = () => el.scrollWidth / 2;
    const tick = () => {
      const s = window.scrollY;
      const delta = s - lastScrollY;
      lastScrollY = s;
      marqueePos.current -= marqueeBaseSpeed.current + Math.abs(delta) * 0.15;
      if (marqueePos.current < -halfW()) marqueePos.current += halfW();
      el.style.transform = `translateX(${marqueePos.current}px)`;
      animId = requestAnimationFrame(tick);
    };
    animId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animId);
  }, []);

  // Customer prefill login details for payment
  const [nameInput, setNameInput] = useState('');
  const [emailInput, setEmailInput] = useState('');
  const [phoneInput, setPhoneInput] = useState('');
  const [enrollError, setEnrollError] = useState('');

  // Admin Portal States
  const [isAdminOpen, setIsAdminOpen] = useState(true);
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState(false);
  const [adminPasswordInput, setAdminPasswordInput] = useState('');
  const [adminData, setAdminData] = useState([]);
  const [adminLoading, setAdminLoading] = useState(false);
  const [adminError, setAdminError] = useState('');
  const [authenticatedPasskey, setAuthenticatedPasskey] = useState('');
  const [adminSearch, setAdminSearch] = useState('');
  const [adminFilterCourse, setAdminFilterCourse] = useState('All');
  const [adminFilterStatus, setAdminFilterStatus] = useState('All');
  const [showExportModal, setShowExportModal] = useState(false);

  // --- App Admin Panel States ---
  const [adminTab, setAdminTab] = useState('registrations'); // 'registrations' | 'enquiries' | 'chat' | 'lectures' | 'controls'

  // Firebase Config (Obfuscated via base64 to prevent plain-text scraping)
  const firebaseConfig = {
    apiKey: atob("QUl6YVN5REFoRDhYNnpmOWllN2c0UUxCTEhSYW55cm9IZ0ZOT184"),
    authDomain: "dxign-website.firebaseapp.com",
    projectId: "dxign-website",
    storageBucket: "dxign-website.firebasestorage.app",
    messagingSenderId: "1040678210662",
    appId: atob("MToxMDQwNjc4MjEwNjYyOndlYjpkMjY0NDIxMmYwOWU4NTNiMDRmMWE3")
  };
  const isFirebaseMock = !firebaseConfig.apiKey || firebaseConfig.apiKey.includes("YOUR_FIREBASE_API_KEY");
  const [firebaseDb, setFirebaseDb] = useState(null);

  // Initialize Firestore on mount if not in mock mode
  useEffect(() => {
    if (!isFirebaseMock) {
      try {
        if (!window.firebase) {
          console.error("Firebase SDK not loaded in window scope.");
          return;
        }
        if (!firebase.apps.length) {
          firebase.initializeApp(firebaseConfig);
        }
        setFirebaseDb(firebase.firestore());
      } catch (err) {
        console.error("Firebase initialization failed: ", err);
      }
    }
  }, [isAdminAuthenticated]);

  // Chat States
  const [chatSearch, setChatSearch] = useState('');
  const [studentChats, setStudentChats] = useState([]);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [selectedChatId, setSelectedChatId] = useState(''); // student email_escaped
  const [showMobileChatPopup, setShowMobileChatPopup] = useState(false);
  const [chatMessages, setChatMessages] = useState([]);
  const [replyInput, setReplyInput] = useState('');
  const [sendingReply, setSendingReply] = useState(false);
  const replyInputRef = useRef(null);

  // Voice Recording States on Web
  const [isAdminRecording, setIsAdminRecording] = useState(false);
  const [adminRecordingDuration, setAdminRecordingDuration] = useState(0);
  const adminMediaRecorderRef = useRef(null);
  const adminAudioChunksRef = useRef([]);
  const adminRecordingTimerRef = useRef(null);
  useEffect(() => {
    const el = replyInputRef.current;
    if (el) {
      el.style.height = 'auto';
      el.style.height = `${el.scrollHeight}px`;
    }
  }, [replyInput]);

  // Selection Mode States
  const [adminSelectionMode, setAdminSelectionMode] = useState(false);
  const [adminSelectedMessageIds, setAdminSelectedMessageIds] = useState([]);
  const handleDeleteAdminSelectedMessages = async () => {
    if (!selectedChatId || adminSelectedMessageIds.length === 0) return;
    if (!confirm(`Are you sure you want to delete these ${adminSelectedMessageIds.length} message(s) for everyone?`)) {
      return;
    }
    try {
      if (isFirebaseMock) {
        // Mock delete
        const updatedMessages = {
          ...mockMessages
        };
        if (updatedMessages[selectedChatId]) {
          updatedMessages[selectedChatId] = updatedMessages[selectedChatId].filter(m => !adminSelectedMessageIds.includes(m.id));
          setMockMessages(updatedMessages);
          setChatMessages(updatedMessages[selectedChatId]);
        }
      } else if (firebaseDb) {
        // Firebase delete
        for (const msgId of adminSelectedMessageIds) {
          if (msgId && typeof msgId === 'string') {
            await firebaseDb.collection('chats').doc(selectedChatId).collection('messages').doc(msgId).delete();
          }
        }
      }
      setAdminSelectedMessageIds([]);
      setAdminSelectionMode(false);
    } catch (err) {
      console.error("Error deleting selected messages:", err);
      alert("Failed to delete messages.");
    }
  };

  // Support settings state
  const [supportSettings, setSupportSettings] = useState({
    isOnline: true,
    avgResponseTime: '4 mins'
  });
  const [savingSupport, setSavingSupport] = useState(false);

  // Whitelist Form state
  const [whitelistName, setWhitelistName] = useState('');
  const [whitelistEmail, setWhitelistEmail] = useState('');
  const [whitelistPhone, setWhitelistPhone] = useState('');
  const [whitelistCourses, setWhitelistCourses] = useState([]); // array of selected courses
  const [whitelistingLoading, setWhitelistingLoading] = useState(false);
  const [whitelistStatus, setWhitelistStatus] = useState({
    type: '',
    text: ''
  }); // type: 'success' | 'error'

  // WhatsApp automation config
  const [whatsAppApiUrl, setWhatsAppApiUrl] = useState('');
  const [whatsAppApiKey, setWhatsAppApiKey] = useState('');
  const [whatsAppPhoneId, setWhatsAppPhoneId] = useState('');
  const [whatsAppTestPhone, setWhatsAppTestPhone] = useState('');
  const [whatsAppConfigured, setWhatsAppConfigured] = useState(false);
  const [whatsAppSaving, setWhatsAppSaving] = useState(false);
  const [whatsAppStatus, setWhatsAppStatus] = useState({
    type: '',
    text: ''
  });
  const [welcomeEmailSubject, setWelcomeEmailSubject] = useState('🎉 Welcome to Dxign Learn! - {course}');
  const [welcomeEmailBody, setWelcomeEmailBody] = useState('Hi {name},\n\nWelcome to Dxign Learn! 🚀\n\nThank you for completing your registration for the {course} program. We are thrilled to have you join our learning community!\n\n💻 How to Access Your Course Portal:\n1. Go to the Student Course Portal at: https://www.dxignlearn.com/studentportal/\n2. Log in using the email address you registered with: {email}\n3. Enter the 6-digit secure verification OTP code sent to your inbox.\n4. Start streaming lectures, downloading resources, and chatting directly with mentors!\n\nIf you have any questions, feel free to reply directly to this email.\n\nBest regards,\nDxign Learn Team');
  const [welcomeWhatsappBody, setWelcomeWhatsappBody] = useState('Hi {name}! 🎉 Welcome to Dxign Learn! Thank you for completing your registration for the *{course}* program. Your learning journey begins now. To start, go to the Student Course Portal at https://www.dxignlearn.com/studentportal/ and log in with your email to receive your OTP. - Dxign Learn Team');

  // Full screen media preview
  const [activePreviewMedia, setActivePreviewMedia] = useState(null); // { type: 'image' | 'video', url: '' }
  const [mediaPreviewLoading, setMediaPreviewLoading] = useState(false);

  // --- Student Portal States ---
  const [isStudentOpen, setIsStudentOpen] = useState(false);
  const [closingStudent, setClosingStudent] = useState(false);
  const [isStudentAuthenticated, setIsStudentAuthenticated] = useState(false);
  const [studentEmailInput, setStudentEmailInput] = useState('');
  const [studentOtpInput, setStudentOtpInput] = useState('');
  const [studentLoginStep, setStudentLoginStep] = useState(1); // 1 = Email, 2 = OTP
  const [studentError, setStudentError] = useState('');
  const [studentMessage, setStudentMessage] = useState('');
  const [studentLoading, setStudentLoading] = useState(false);
  const [studentUser, setStudentUser] = useState(null); // { email, name, courses }

  // Student Portal Course/Video Navigation States
  const [studentTab, setStudentTab] = useState('courses'); // kept for compatibility
  const [studentMobileTab, setStudentMobileTab] = useState('syllabus'); // 'syllabus' | 'about' | 'programs' (mobile only)
  const [studentSelectedCourse, setStudentSelectedCourse] = useState('');
  const [studentActiveVideo, setStudentActiveVideo] = useState(null);
  const [lecturesData, setLecturesData] = useState(DEFAULT_COURSE_CURRICULUM);
  const [customLectures, setCustomLectures] = useState({});
  const [deletedDefaultIds, setDeletedDefaultIds] = useState([]);

  // Student Resumable Video Support
  const studentNativeVideoRef = useRef(null);

  // Student Chat Room States
  const [studentChatOpen, setStudentChatOpen] = useState(false);
  const [closingChatPopup, setClosingChatPopup] = useState(false);
  const [studentChatMessages, setStudentChatMessages] = useState([]);
  const [studentChatInput, setStudentChatInput] = useState('');
  const [studentChatSending, setStudentChatSending] = useState(false);
  const [studentChatEmojiOpen, setStudentChatEmojiOpen] = useState(false);

  // Student Voice Recording States
  const [studentIsRecording, setStudentIsRecording] = useState(false);
  const [studentRecordingDuration, setStudentRecordingDuration] = useState(0);
  const studentMediaRecorderRef = useRef(null);
  const studentAudioChunksRef = useRef([]);
  const studentRecordingTimerRef = useRef(null);

  // Admin Lecture Management States
  const [adminSelectedLectureCourse, setAdminSelectedLectureCourse] = useState('Graphic Design');
  const [showAddLectureModal, setShowAddLectureModal] = useState(false);
  const [lectureUploadingProgress, setLectureUploadingProgress] = useState(null);
  const [resourceUploadingProgress, setResourceUploadingProgress] = useState(null);
  const [studentUploadingProgress, setStudentUploadingProgress] = useState(null);
  const [adminChatUploadingProgress, setAdminChatUploadingProgress] = useState(null);

  // Helper to upload files via POST with real-time progress events
  const uploadWithProgressXHR = (url, payload, onProgress) => {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open('POST', url, true);
      xhr.setRequestHeader('Content-Type', 'text/plain;charset=utf-8');
      xhr.upload.onprogress = e => {
        if (e.lengthComputable) {
          const pct = Math.round(e.loaded / e.total * 100);
          onProgress(pct);
        }
      };
      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            const result = JSON.parse(xhr.responseText);
            resolve(result);
          } catch (err) {
            reject(new Error('Invalid response from server: ' + xhr.responseText));
          }
        } else {
          reject(new Error('Upload failed with status code ' + xhr.status));
        }
      };
      xhr.onerror = () => {
        reject(new Error('Network error during file upload'));
      };
      xhr.send(JSON.stringify(payload));
    });
  };

  // Lecture Creation Form States
  const [newLectureTitle, setNewLectureTitle] = useState('');
  const [newLectureDesc, setNewLectureDesc] = useState('');
  const [newLectureDifficulty, setNewLectureDifficulty] = useState('Beginner');
  const [newLectureTags, setNewLectureTags] = useState('');
  const [newLectureVideoUrl, setNewLectureVideoUrl] = useState('');
  const [newLectureResources, setNewLectureResources] = useState([]);
  const [newLectureSaving, setNewLectureSaving] = useState(false);
  const [editingLecture, setEditingLecture] = useState(null);
  const [newLectureDuration, setNewLectureDuration] = useState('1 min');
  const getAttachmentUrl = (url, type) => {
    if (!url) return '';
    const fileId = getDriveFileId(url);
    if (fileId) {
      if (type === 'image') {
        return `https://lh3.googleusercontent.com/d/${fileId}`;
      } else if (type === 'video_thumbnail') {
        return `https://drive.google.com/thumbnail?id=${fileId}&sz=w800`;
      } else {
        return `https://drive.google.com/uc?export=download&id=${fileId}`;
      }
    }
    return url;
  };
  const getYoutubeEmbedUrl = url => {
    if (!url) return null;
    const m = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]+)/);
    return m ? m[1] : null;
  };
  const YouTubeCustomPlayer = ({
    videoId,
    onPrev,
    onNext,
    resumePosition
  }) => {
    const containerRef = useRef(null);
    const playerRef = useRef(null);
    const saveIntervalRef = useRef(null);
    const [ready, setReady] = useState(false);
    useEffect(() => {
      if (!containerRef.current || !videoId) return;
      const player = new YT.Player(containerRef.current, {
        videoId,
        playerVars: {
          controls: 1,
          rel: 0,
          modestbranding: 1,
          iv_load_policy: 3,
          playsinline: 1,
          enablejsapi: 1,
          autoplay: 0
        },
        events: {
          onReady: () => {
            playerRef.current = player;
            setReady(true);
            if (resumePosition > 0) player.seekTo(resumePosition, true);
          },
          onStateChange: e => {
            if (e.data === YT.PlayerState.PLAYING) {
              clearInterval(saveIntervalRef.current);
              saveIntervalRef.current = setInterval(() => {
                if (playerRef.current && videoId) saveVideoProgress(videoId, playerRef.current.getCurrentTime());
              }, 3000);
            } else {
              clearInterval(saveIntervalRef.current);
            }
          }
        }
      });
      return () => {
        clearInterval(saveIntervalRef.current);
        if (playerRef.current) {
          if (videoId) saveVideoProgress(videoId, playerRef.current.getCurrentTime());
          playerRef.current.destroy();
          playerRef.current = null;
        }
      };
    }, [videoId]);
    return /*#__PURE__*/React.createElement("div", {
      className: "relative w-full h-full bg-black overflow-hidden"
    }, /*#__PURE__*/React.createElement("div", {
      ref: containerRef,
      className: "w-full h-full"
    }), !ready && /*#__PURE__*/React.createElement("div", {
      className: "absolute inset-0 flex items-center justify-center z-10"
    }, /*#__PURE__*/React.createElement("div", {
      className: "w-8 h-8 border-2 border-brand-cyan/50 border-t-brand-cyan rounded-full animate-spin"
    })), ready && onPrev && /*#__PURE__*/React.createElement("button", {
      type: "button",
      onClick: onPrev,
      className: "absolute left-2 top-1/2 -translate-y-1/2 z-10 w-10 h-10 rounded-full bg-black/60 border border-white/10 flex items-center justify-center text-white/80 hover:text-white hover:bg-black/80 transition"
    }, /*#__PURE__*/React.createElement("svg", {
      xmlns: "http://www.w3.org/2000/svg",
      viewBox: "0 0 24 24",
      fill: "currentColor",
      className: "w-5 h-5"
    }, /*#__PURE__*/React.createElement("path", {
      d: "M6 6h2v12H6zm3.5 6l8.5 6V6z"
    }))), ready && onNext && /*#__PURE__*/React.createElement("button", {
      type: "button",
      onClick: onNext,
      className: "absolute right-2 top-1/2 -translate-y-1/2 z-10 w-10 h-10 rounded-full bg-black/60 border border-white/10 flex items-center justify-center text-white/80 hover:text-white hover:bg-black/80 transition"
    }, /*#__PURE__*/React.createElement("svg", {
      xmlns: "http://www.w3.org/2000/svg",
      viewBox: "0 0 24 24",
      fill: "currentColor",
      className: "w-5 h-5"
    }, /*#__PURE__*/React.createElement("path", {
      d: "M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z"
    }))));
  };
  const renderParsedTextWeb = text => {
    if (!text) return null;
    const regex = /(\"[^\"]+\")|(--\w+(?:\s+\d+:\d+|\s+\S+)?)/g;
    const parts = text.split(regex);
    return parts.map((part, index) => {
      if (!part) return null;
      if (part.startsWith('"') && part.endsWith('"')) {
        return /*#__PURE__*/React.createElement("span", {
          key: index,
          className: "text-brand-cyan font-bold"
        }, part);
      }
      if (part.startsWith('--')) {
        return /*#__PURE__*/React.createElement("span", {
          key: index,
          className: "text-brand-violet font-mono font-bold"
        }, part);
      }
      return /*#__PURE__*/React.createElement("span", {
        key: index
      }, part);
    });
  };

  // Mock Data States for Local Fallback Simulation Mode (Initially empty to allow clean testing)
  const [mockChats, setMockChats] = useState([]);
  const [mockMessages, setMockMessages] = useState({});
  const RAZORPAY_KEY = 'rzp_live_SAnIWDLh0y6gg5';
  const GOOGLE_SHEET_WEBHOOK_URL = atob("aHR0cHM6Ly9zY3JpcHQuZ29vZ2xlLmNvbS9tYWNyb3Mvcy9BS2Z5Y2J5UXhONDBVY0pjLTk5UWwxazNvc3Q3X2N4c2ZQa0xiaVpRTjJtOEN4RkJQZW5pak82ckNDZlpzeXlITkVab2gzVjBXUS9leGVj");

  const openEnrollModal = course => {
    setNameInput('');
    setEmailInput('');
    setPhoneInput('');
    setEnrollError('');
    setEnrollModal(course);
  };
  const closeEnrollModal = () => {
    if (closingModal) return;
    setClosingModal(true);
    setTimeout(() => {
      setEnrollModal(null);
      setClosingModal(false);
    }, 350);
  };
  const closeStudentPortal = () => {
    if (closingStudent) return;
    setClosingStudent(true);
    setTimeout(() => {
      setIsStudentOpen(false);
      setClosingStudent(false);
    }, 350);
  };
  const closeChatPopup = () => {
    if (closingChatPopup) return;
    setClosingChatPopup(true);
    setTimeout(() => {
      setStudentChatOpen(false);
      setClosingChatPopup(false);
      setStudentTab('courses');
    }, 350);
  };

  // Lock/Unlock body scroll and Lenis when modal/overlays are open
  useEffect(() => {
    const isModalOpen = !!enrollModal || !!theaterVideo || !!isAdminOpen || !!showIosModal || !!isStudentOpen || !!mobileMenuOpen;
    const header = document.querySelector('header');
    if (isModalOpen) {
      document.body.setAttribute('data-modal-active', 'true');
      document.body.setAttribute('data-scroll-y', window.scrollY);
      document.body.style.overflow = 'hidden';
      document.documentElement.style.overflow = 'hidden';
      if (window.lenis) window.lenis.stop();
    } else {
      document.body.removeAttribute('data-modal-active');
      document.body.style.overflow = '';
      document.documentElement.style.overflow = '';
      if (window.lenis) window.lenis.start();
      const scrollY = parseInt(document.body.getAttribute('data-scroll-y') || '0');
      document.body.removeAttribute('data-scroll-y');
      window.scrollTo(0, scrollY);
    }
  }, [enrollModal, theaterVideo, isAdminOpen, showIosModal, isStudentOpen, mobileMenuOpen]);

  // Resume data helpers
  const getResumeData = () => {
    try {
      return JSON.parse(localStorage.getItem('dxign_resume_data') || '{}');
    } catch {
      return {};
    }
  };
  const saveResumeData = data => {
    localStorage.setItem('dxign_resume_data', JSON.stringify(data));
  };
  const saveVideoProgress = (videoId, seconds) => {
    if (!videoId) return;
    const data = getResumeData();
    data.resumePositions = data.resumePositions || {};
    data.resumePositions[videoId] = seconds;
    saveResumeData(data);
  };
  const getVideoProgress = videoId => {
    if (!videoId) return 0;
    const data = getResumeData();
    return data.resumePositions && data.resumePositions[videoId] || 0;
  };
  const saveLastWatchedVideo = (courseName, videoObj) => {
    if (!courseName || !videoObj) return;
    const data = getResumeData();
    data.lastWatchedVideo = data.lastWatchedVideo || {};
    data.lastWatchedVideo[courseName] = videoObj;
    saveResumeData(data);
  };
  const getLastWatchedVideo = courseName => {
    if (!courseName) return null;
    const data = getResumeData();
    return data.lastWatchedVideo && data.lastWatchedVideo[courseName] || null;
  };

  // Combine default, db, and custom lectures, filtering out deleted default ones
  const getMergedLectures = () => {
    const merged = {};
    Object.keys(DEFAULT_COURSE_CURRICULUM).forEach(courseName => {
      let list = DEFAULT_COURSE_CURRICULUM[courseName] || [];
      list = list.filter(l => !deletedDefaultIds.includes(l.id));
      const dbList = lecturesData && lecturesData[courseName] || [];
      const dbOnlyList = dbList.filter(l => !l.id.includes('-'));
      const customList = customLectures[courseName] || [];
      merged[courseName] = [...list, ...dbOnlyList, ...customList];
    });
    return merged;
  };

  // Load deleted defaults and custom lectures from local storage if mock
  useEffect(() => {
    if (isFirebaseMock) {
      const custom = localStorage.getItem('dxign_custom_lectures');
      const deleted = localStorage.getItem('dxign_deleted_lectures');
      if (custom) setCustomLectures(JSON.parse(custom));
      if (deleted) setDeletedDefaultIds(JSON.parse(deleted));
    }
  }, [isFirebaseMock]);
  const handleAddLecture = async lecture => {
    if (isFirebaseMock || !firebaseDb) {
      const c = lecture.course;
      const newId = `custom_${Date.now()}`;
      const updated = {
        ...customLectures,
        [c]: [...(customLectures[c] || []), {
          id: newId,
          ...lecture,
          createdAt: new Date()
        }]
      };
      setCustomLectures(updated);
      localStorage.setItem('dxign_custom_lectures', JSON.stringify(updated));
      return true;
    } else {
      try {
        await firebaseDb.collection('lectures').add({
          ...lecture,
          createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        return true;
      } catch (err) {
        console.error("Error adding lecture:", err);
        alert("Failed to save lecture to Firestore: " + err.message);
        return false;
      }
    }
  };
  const handleDeleteLecture = async (courseName, lectureId) => {
    if (isFirebaseMock || !firebaseDb) {
      const updated = {
        ...customLectures,
        [courseName]: (customLectures[courseName] || []).filter(l => l.id !== lectureId)
      };
      setCustomLectures(updated);
      localStorage.setItem('dxign_custom_lectures', JSON.stringify(updated));
      if (!lectureId.startsWith('custom_') && lectureId.includes('-')) {
        const newDeleted = [...deletedDefaultIds, lectureId];
        setDeletedDefaultIds(newDeleted);
        localStorage.setItem('dxign_deleted_lectures', JSON.stringify(newDeleted));
      }
      return true;
    } else {
      if (!lectureId.startsWith('custom_') && lectureId.includes('-')) {
        try {
          await firebaseDb.collection('deleted_default_lectures').doc(lectureId).set({
            deleted: true
          });
          return true;
        } catch (err) {
          console.error(err);
        }
      } else {
        try {
          await firebaseDb.collection('lectures').doc(lectureId).delete();
          return true;
        } catch (err) {
          console.error(err);
        }
      }
    }
  };
  const handleUpdateLecture = async (courseName, oldLecture, updatedData) => {
    const lecId = oldLecture.id;
    if (isFirebaseMock || !firebaseDb) {
      if (lecId.startsWith('custom_')) {
        const list = customLectures[courseName] || [];
        const updated = {
          ...customLectures,
          [courseName]: list.map(l => l.id === lecId ? {
            ...l,
            ...updatedData
          } : l)
        };
        setCustomLectures(updated);
        localStorage.setItem('dxign_custom_lectures', JSON.stringify(updated));
      } else {
        const newDeleted = [...deletedDefaultIds, lecId];
        setDeletedDefaultIds(newDeleted);
        localStorage.setItem('dxign_deleted_lectures', JSON.stringify(newDeleted));
        const newId = `custom_${Date.now()}`;
        const customEntry = {
          id: newId,
          ...updatedData,
          createdAt: new Date()
        };
        const updated = {
          ...customLectures,
          [courseName]: [...(customLectures[courseName] || []), customEntry]
        };
        setCustomLectures(updated);
        localStorage.setItem('dxign_custom_lectures', JSON.stringify(updated));
      }
      return true;
    } else {
      if (!lecId.startsWith('custom_') && lecId.includes('-')) {
        await firebaseDb.collection('deleted_default_lectures').doc(lecId).set({
          deleted: true
        });
        await firebaseDb.collection('lectures').add({
          ...updatedData,
          createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });
      } else {
        await firebaseDb.collection('lectures').doc(lecId).update(updatedData);
      }
      return true;
    }
  };

  // Listen to database lectures
  useEffect(() => {
    if (isFirebaseMock || !firebaseDb) return;
    const unsubscribe = firebaseDb.collection('lectures').orderBy('createdAt', 'asc').onSnapshot(snapshot => {
      const list = [];
      snapshot.forEach(doc => {
        list.push({
          id: doc.id,
          ...doc.data()
        });
      });
      const dbGrouped = {};
      list.forEach(lecture => {
        const c = lecture.course;
        if (!dbGrouped[c]) dbGrouped[c] = [];
        dbGrouped[c].push(lecture);
      });
      setLecturesData(dbGrouped);
    });
    return unsubscribe;
  }, [firebaseDb, isFirebaseMock]);

  // Listen to deleted default lectures list
  useEffect(() => {
    if (isFirebaseMock || !firebaseDb) return;
    const unsubscribe = firebaseDb.collection('deleted_default_lectures').onSnapshot(snapshot => {
      const ids = [];
      snapshot.forEach(doc => ids.push(doc.id));
      setDeletedDefaultIds(ids);
    });
    return unsubscribe;
  }, [firebaseDb, isFirebaseMock]);

  // Check for cached student session
  useEffect(() => {
    const session = localStorage.getItem('dxign_student_session');
    if (session) {
      try {
        const parsed = JSON.parse(session);
        setStudentUser(parsed);
        setIsStudentAuthenticated(true);
        setStudentSelectedCourse(parsed.courses[0] || 'Graphic Design');
        const saved = getLastWatchedVideo(parsed.courses[0] || 'Graphic Design');
        if (saved) setStudentActiveVideo(saved);
      } catch (e) {
        console.error("Error loading cached student session", e);
      }
    }
  }, []);

  // Save last-watched video whenever active video changes
  useEffect(() => {
    if (studentActiveVideo && studentSelectedCourse) {
      saveLastWatchedVideo(studentSelectedCourse, studentActiveVideo);
    }
  }, [studentActiveVideo, studentSelectedCourse]);

  // Save/restore playback position for native videos
  useEffect(() => {
    if (!studentActiveVideo) return;
    const isNative = !getYoutubeEmbedUrl(studentActiveVideo.videoUrl);
    if (!isNative) return;
    const vid = studentActiveVideo.id;
    const interval = setInterval(() => {
      if (studentNativeVideoRef.current) {
        saveVideoProgress(vid, studentNativeVideoRef.current.currentTime);
      }
    }, 3000);
    return () => {
      clearInterval(interval);
      if (studentNativeVideoRef.current) {
        saveVideoProgress(vid, studentNativeVideoRef.current.currentTime);
      }
    };
  }, [studentActiveVideo]);
  const handleStudentRequestOTP = async e => {
    if (e) e.preventDefault();
    if (!studentEmailInput.trim()) {
      setStudentError('Please enter your email address.');
      return;
    }
    setStudentError('');
    setStudentLoading(true);
    const email = studentEmailInput.toLowerCase().trim();
    if (email === 'test@gmail.com' || email === 'test@dxign.com' || email.endsWith('@dxign.com')) {
      setStudentLoading(false);
      setStudentLoginStep(2);
      setStudentMessage(`OTP sent successfully to ${email}`);
      return;
    }
    try {
      const response = await fetch(`${GOOGLE_SHEET_WEBHOOK_URL}?action=send_otp&email=${encodeURIComponent(email)}`);
      const result = await response.json();
      if (result.status === 'success') {
        setStudentLoginStep(2);
        setStudentMessage(`OTP sent successfully to ${email}`);
      } else {
        setStudentError(result.message || 'This email is not registered for any courses.');
      }
    } catch (err) {
      console.error("OTP send error:", err);
      setStudentError('Network error. Please try again.');
    } finally {
      setStudentLoading(false);
    }
  };
  const handleStudentVerifyOTP = async e => {
    if (e) e.preventDefault();
    if (!studentOtpInput.trim() || studentOtpInput.length !== 6) {
      setStudentError('Please enter a 6-digit verification code.');
      return;
    }
    setStudentError('');
    setStudentLoading(true);
    const email = studentEmailInput.toLowerCase().trim();
    if ((email === 'test@gmail.com' || email === 'test@dxign.com' || email.endsWith('@dxign.com')) && studentOtpInput === '123456') {
      const user = {
        email: email,
        name: 'Test Student',
        courses: ["AI Fundamentals", "Graphic Design", "Film Making", "Content Creation", "Vibe Coding", "Business Automation"]
      };
      localStorage.setItem('dxign_student_session', JSON.stringify(user));
      setStudentUser(user);
      setIsStudentAuthenticated(true);
      setStudentSelectedCourse(user.courses[0] || 'Graphic Design');
      const saved1 = getLastWatchedVideo(user.courses[0] || 'Graphic Design');
      if (saved1) setStudentActiveVideo(saved1);
      setStudentLoading(false);
      setStudentOtpInput('');
      setStudentEmailInput('');
      setStudentMessage('');
      return;
    }
    try {
      const response = await fetch(`${GOOGLE_SHEET_WEBHOOK_URL}?action=verify_otp&email=${encodeURIComponent(email)}&otp=${studentOtpInput}`);
      const result = await response.json();
      if (result.status === 'success') {
        const user = {
          email: email,
          name: result.name,
          courses: result.courses || []
        };
        localStorage.setItem('dxign_student_session', JSON.stringify(user));
        setStudentUser(user);
        setIsStudentAuthenticated(true);
        setStudentSelectedCourse(user.courses[0] || 'Graphic Design');
        const saved2 = getLastWatchedVideo(user.courses[0] || 'Graphic Design');
        if (saved2) setStudentActiveVideo(saved2);
        setStudentOtpInput('');
        setStudentEmailInput('');
        setStudentMessage('');
      } else {
        setStudentError(result.message || 'Incorrect verification code.');
      }
    } catch (err) {
      console.error("OTP verify error:", err);
      setStudentError('Network error during verification.');
    } finally {
      setStudentLoading(false);
    }
  };
  const handleStudentLogout = () => {
    localStorage.removeItem('dxign_student_session');
    localStorage.removeItem('dxign_resume_data');
    setStudentUser(null);
    setIsStudentAuthenticated(false);
    setStudentActiveVideo(null);
    setStudentLoginStep(1);
    setStudentEmailInput('');
    setStudentOtpInput('');
    setStudentError('');
    setStudentMessage('');
  };

  // Student chat messages listener
  useEffect(() => {
    if (!isStudentAuthenticated || !studentUser) {
      setStudentChatMessages([]);
      return;
    }
    const chatRoomId = studentUser.email.replace(/[@.]/g, '_');
    if (isFirebaseMock) {
      const defaultMsgs = [{
        id: "m1",
        sender: "mentor",
        name: "Anurag KM (Mentor)",
        text: "Welcome to Dxign.learn Doubt support! How can I help you today?",
        type: 'text',
        timestamp: new Date(Date.now() - 3600 * 1000)
      }];
      setStudentChatMessages(mockMessages[chatRoomId] || defaultMsgs);
      return;
    }
    if (!firebaseDb) return;
    const unsubscribe = firebaseDb.collection('chats').doc(chatRoomId).collection('messages').orderBy('timestamp', 'asc').onSnapshot(snapshot => {
      const msgs = [];
      snapshot.forEach(doc => {
        const data = doc.data();
        msgs.push({
          id: doc.id,
          ...data
        });
        if (data.sender === 'mentor' && data.status !== 'read') {
          firebaseDb.collection('chats').doc(chatRoomId).collection('messages').doc(doc.id).update({
            status: 'read'
          }).catch(() => {});
        }
      });
      setStudentChatMessages(msgs);
      firebaseDb.collection('chats').doc(chatRoomId).update({
        unreadStudent: false
      }).catch(() => {});
    }, error => {
      console.error("Error listening to student messages:", error);
    });
    return unsubscribe;
  }, [firebaseDb, isStudentAuthenticated, studentUser, isFirebaseMock, mockMessages]);
  const handleSendStudentMessage = async e => {
    if (e) e.preventDefault();
    if (!studentChatInput.trim() || !studentUser) return;
    const text = studentChatInput.trim();
    setStudentChatInput('');
    setStudentChatEmojiOpen(false);
    setStudentChatSending(true);
    const chatRoomId = studentUser.email.replace(/[@.]/g, '_');
    const msgData = {
      sender: studentUser.email,
      name: studentUser.name,
      text: text,
      type: 'text',
      status: 'sent',
      timestamp: isFirebaseMock ? new Date() : firebase.firestore.FieldValue.serverTimestamp()
    };
    if (isFirebaseMock) {
      const updatedMessages = {
        ...mockMessages
      };
      if (!updatedMessages[chatRoomId]) {
        updatedMessages[chatRoomId] = [{
          id: "m1",
          sender: "mentor",
          name: "Anurag KM (Mentor)",
          text: "Welcome to Dxign.learn Doubt support! How can I help you today?",
          type: 'text',
          timestamp: new Date(Date.now() - 3600 * 1000)
        }];
      }
      updatedMessages[chatRoomId].push({
        id: `student_${Date.now()}`,
        ...msgData
      });
      setMockMessages(updatedMessages);
      setStudentChatMessages(updatedMessages[chatRoomId]);
      setStudentChatSending(false);
      setTimeout(() => {
        const mentorMsg = {
          id: `mentor_${Date.now()}`,
          sender: 'mentor',
          name: 'Anurag KM (Mentor)',
          text: 'Got it! I am reviewing your query and will update you shortly.',
          type: 'text',
          timestamp: new Date()
        };
        const followUp = {
          ...updatedMessages
        };
        followUp[chatRoomId].push(mentorMsg);
        setMockMessages(followUp);
        setStudentChatMessages(followUp[chatRoomId]);
      }, 3000);
    } else if (firebaseDb) {
      try {
        await firebaseDb.collection('chats').doc(chatRoomId).collection('messages').add(msgData);
        await firebaseDb.collection('chats').doc(chatRoomId).set({
          id: chatRoomId,
          email: studentUser.email,
          name: studentUser.name,
          lastMessage: text,
          lastActive: firebase.firestore.FieldValue.serverTimestamp(),
          courses: studentUser.courses || [],
          unread: true
        }, {
          merge: true
        });
      } catch (err) {
        console.error("Error sending student message:", err);
      } finally {
        setStudentChatSending(false);
      }
    }
  };
  const handleStudentFileUpload = async e => {
    const file = e.target.files[0];
    if (!file || !studentUser) return;
    e.target.value = '';
    const chatRoomId = studentUser.email.replace(/[@.]/g, '_');
    let type = 'document';
    if (file.type.startsWith('image/')) type = 'image';else if (file.type.startsWith('video/')) type = 'video';else if (file.type.startsWith('audio/')) type = 'audio';
    setStudentUploadingProgress(0);
    let fileUrl = '';

    // Try Firebase Storage first (native upload, real-time progress, no file size limit)
    const firebaseStorage = window.firebase && firebase.storage && firebase.storage();
    if (firebaseStorage && !isFirebaseMock) {
      try {
        const timestamp = Date.now();
        const storagePath = `chats/${chatRoomId}/${timestamp}_${file.name}`;
        const storageRef = firebaseStorage.ref(storagePath);
        const metadata = {
          contentType: file.type
        };

        // Timeout: dynamic based on file size (min 30s, max 5min, ~30s per 10MB)
        const uploadTimeout = Math.min(Math.max(Math.round(file.size / 1e7) * 30000, 30000), 300000);
        const uploadPromise = new Promise((resolve, reject) => {
          const uploadTask = storageRef.put(file, metadata);
          const timeoutId = setTimeout(() => {
            try {
              uploadTask.cancel();
            } catch (e) {}
            reject(new Error("Firebase Storage upload timed out"));
          }, uploadTimeout);
          uploadTask.on('state_changed', snapshot => {
            const progress = snapshot.bytesTransferred / snapshot.totalBytes * 100;
            setStudentUploadingProgress(Math.round(progress));
          }, error => {
            clearTimeout(timeoutId);
            reject(error);
          }, async () => {
            clearTimeout(timeoutId);
            try {
              const downloadUrl = await uploadTask.snapshot.ref.getDownloadURL();
              resolve(downloadUrl);
            } catch (err) {
              reject(err);
            }
          });
        });
        fileUrl = await uploadPromise;
        setStudentUploadingProgress(95);
      } catch (storageErr) {
        console.warn("Firebase Storage failed, falling back to webhook:", storageErr);
        fileUrl = '';
      }
    }

    // Fallback to webhook (Google Drive) if Firebase Storage unavailable or failed
    if (!fileUrl) {
      if (file.size > 10 * 1024 * 1024) {
        throw new Error("File too large for fallback upload (max 10MB). Try again later.");
      }
      setStudentUploadingProgress(5);
      try {
        const reader = new FileReader();
        const arrayBuffer = await new Promise((resolve, reject) => {
          reader.onload = () => resolve(reader.result);
          reader.onerror = reject;
          reader.readAsArrayBuffer(file);
        });
        const bytes = new Uint8Array(arrayBuffer);
        let binary = '';
        const chunkSize = 65536;
        for (let i = 0; i < bytes.length; i += chunkSize) {
          binary += String.fromCharCode.apply(null, bytes.subarray(i, i + chunkSize));
        }
        const base64Data = btoa(binary);
        binary = null;
        setStudentUploadingProgress(30);
        const payload = {
          action: 'upload_file',
          fileName: file.name,
          mimeType: file.type,
          base64Data: base64Data
        };
        const response = await fetch(GOOGLE_SHEET_WEBHOOK_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'text/plain;charset=utf-8'
          },
          body: JSON.stringify(payload)
        });
        const result = await response.json();
        if (result && result.status === 'success' && result.fileUrl) {
          fileUrl = result.fileUrl;
        } else {
          throw new Error(result.message || 'Webhook upload failed');
        }
        setStudentUploadingProgress(80);
      } catch (webhookErr) {
        console.warn("Webhook upload failed:", webhookErr);
        throw webhookErr;
      }
    }
    try {
      setStudentUploadingProgress(80);
      const msgData = {
        sender: studentUser.email,
        name: studentUser.name,
        fileUrl: fileUrl,
        fileName: file.name,
        type: type,
        status: 'sent',
        timestamp: isFirebaseMock ? new Date() : firebase.firestore.FieldValue.serverTimestamp()
      };
      setStudentUploadingProgress(95);
      if (isFirebaseMock) {
        const updatedMessages = {
          ...mockMessages
        };
        if (!updatedMessages[chatRoomId]) updatedMessages[chatRoomId] = [];
        updatedMessages[chatRoomId].push({
          id: `student_${Date.now()}`,
          ...msgData
        });
        setMockMessages(updatedMessages);
        setStudentChatMessages(updatedMessages[chatRoomId]);
      } else if (firebaseDb) {
        await firebaseDb.collection('chats').doc(chatRoomId).collection('messages').add(msgData);
        await firebaseDb.collection('chats').doc(chatRoomId).set({
          id: chatRoomId,
          email: studentUser.email,
          name: studentUser.name,
          lastMessage: `[Sent ${type}]`,
          lastActive: firebase.firestore.FieldValue.serverTimestamp(),
          courses: studentUser.courses || [],
          unread: true
        }, {
          merge: true
        });
      }
    } catch (err) {
      console.error("File upload error:", err);
      alert("File upload failed: " + err.message);
    } finally {
      setStudentChatSending(false);
      setStudentUploadingProgress(null);
    }
  };
  const startStudentVoiceRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true
      });
      studentAudioChunksRef.current = [];
      const mediaRecorder = new MediaRecorder(stream);
      studentMediaRecorderRef.current = mediaRecorder;
      mediaRecorder.ondataavailable = e => {
        if (e.data.size > 0) {
          studentAudioChunksRef.current.push(e.data);
        }
      };
      mediaRecorder.onstop = async () => {
        if (studentAudioChunksRef.current.length === 0) return;
        const audioBlob = new Blob(studentAudioChunksRef.current, {
          type: 'audio/webm'
        });
        setStudentChatSending(true);
        const chatRoomId = studentUser.email.replace(/[@.]/g, '_');
        try {
          const fileUrl = URL.createObjectURL(audioBlob);
          const msgData = {
            sender: studentUser.email,
            name: studentUser.name,
            fileUrl: fileUrl,
            type: 'audio',
            status: 'sent',
            timestamp: isFirebaseMock ? new Date() : firebase.firestore.FieldValue.serverTimestamp()
          };
          if (isFirebaseMock) {
            const updatedMessages = {
              ...mockMessages
            };
            if (!updatedMessages[chatRoomId]) updatedMessages[chatRoomId] = [];
            updatedMessages[chatRoomId].push({
              id: `student_${Date.now()}`,
              ...msgData
            });
            setMockMessages(updatedMessages);
            setStudentChatMessages(updatedMessages[chatRoomId]);
          } else if (firebaseDb) {
            await firebaseDb.collection('chats').doc(chatRoomId).collection('messages').add(msgData);
            await firebaseDb.collection('chats').doc(chatRoomId).set({
              id: chatRoomId,
              email: studentUser.email,
              name: studentUser.name,
              lastMessage: `[Sent voice note]`,
              lastActive: firebase.firestore.FieldValue.serverTimestamp(),
              courses: studentUser.courses || [],
              unread: true
            }, {
              merge: true
            });
          }
        } catch (err) {
          console.error("Audio save error:", err);
        } finally {
          setStudentChatSending(false);
        }
        stream.getTracks().forEach(track => track.stop());
      };
      mediaRecorder.start();
      setStudentIsRecording(true);
      setStudentRecordingDuration(0);
      studentRecordingTimerRef.current = setInterval(() => {
        setStudentRecordingDuration(prev => prev + 1);
      }, 1000);
    } catch (err) {
      console.error("Could not start micro recording:", err);
      alert("Microphone permission denied or not supported on this browser.");
    }
  };
  const stopStudentVoiceRecording = () => {
    if (studentMediaRecorderRef.current && studentIsRecording) {
      studentMediaRecorderRef.current.stop();
      setStudentIsRecording(false);
      if (studentRecordingTimerRef.current) {
        clearInterval(studentRecordingTimerRef.current);
      }
    }
  };
  const cancelStudentVoiceRecording = () => {
    if (studentMediaRecorderRef.current && studentIsRecording) {
      studentAudioChunksRef.current = [];
      studentMediaRecorderRef.current.stop();
      setStudentIsRecording(false);
      if (studentRecordingTimerRef.current) {
        clearInterval(studentRecordingTimerRef.current);
      }
    }
  };
  const handleAdminLectureUpload = async e => {
    const file = e.target.files[0];
    if (!file) return;
    setLectureUploadingProgress(0);
    try {
      const fileUrl = URL.createObjectURL(file);
      setNewLectureVideoUrl(fileUrl);
      setLectureUploadingProgress(100);
      setTimeout(() => setLectureUploadingProgress(null), 1500);
    } catch (err) {
      console.error(err);
      setLectureUploadingProgress(null);
    }
  };
  const handleAdminResourceUpload = async e => {
    const file = e.target.files[0];
    if (!file) return;
    setResourceUploadingProgress(0);
    try {
      const fileUrl = URL.createObjectURL(file);
      const newRes = {
        name: file.name,
        size: `${(file.size / (1024 * 1024)).toFixed(1)} MB`,
        url: fileUrl
      };
      setNewLectureResources(prev => [...prev, newRes]);
      setResourceUploadingProgress(100);
      setTimeout(() => setResourceUploadingProgress(null), 1500);
    } catch (err) {
      console.error(err);
      setResourceUploadingProgress(null);
    }
  };
  const handleSaveNewLecture = async e => {
    if (e) e.preventDefault();
    if (!newLectureTitle.trim() || !newLectureVideoUrl.trim()) {
      alert("Title and Video URL are required.");
      return;
    }
    setNewLectureSaving(true);
    const lecture = {
      title: newLectureTitle.trim(),
      description: newLectureDesc.trim(),
      difficulty: newLectureDifficulty,
      duration: newLectureDuration.trim(),
      tags: newLectureTags.split(',').map(t => t.trim()).filter(Boolean),
      videoUrl: newLectureVideoUrl.trim(),
      resources: newLectureResources,
      course: adminSelectedLectureCourse
    };
    let success;
    if (editingLecture) {
      success = await handleUpdateLecture(adminSelectedLectureCourse, editingLecture, lecture);
    } else {
      success = await handleAddLecture(lecture);
    }
    setNewLectureSaving(false);
    if (success) {
      setNewLectureTitle('');
      setNewLectureDesc('');
      setNewLectureDifficulty('Beginner');
      setNewLectureDuration('1 min');
      setNewLectureTags('');
      setNewLectureVideoUrl('');
      setNewLectureResources([]);
      setEditingLecture(null);
      setShowAddLectureModal(false);
    }
  };

  // Listen to hash changes for Admin Portal
  useEffect(() => {
    setIsAdminOpen(true);
  }, []);

  // Fetch admin registrations list
  const fetchAdminData = async () => {
    if (!GOOGLE_SHEET_WEBHOOK_URL) {
      setAdminError('Google Sheet Webhook URL is not configured.');
      return;
    }
    setAdminLoading(true);
    setAdminError('');
    try {
      const response = await fetch(GOOGLE_SHEET_WEBHOOK_URL + '?passkey=' + encodeURIComponent(authenticatedPasskey));
      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }
      const data = await response.json();
      if (data && data.error) {
        throw new Error(data.error);
      }
      setAdminData(Array.isArray(data) ? data.reverse() : []);
    } catch (error) {
      console.error('Error fetching admin data:', error);
      setAdminError('Failed to fetch data. Make sure doGet(e) is deployed in Apps Script.');
    } finally {
      setAdminLoading(false);
    }
  };

  // Auto-fetch data on login success
  useEffect(() => {
    if (isAdminAuthenticated) {
      fetchAdminData();
    }
  }, [isAdminAuthenticated]);

  // --- Firebase Live Listeners ---

  // 1. Listen to Support Settings
  useEffect(() => {
    if (isFirebaseMock) return;
    if (!firebaseDb) return;
    const unsubscribe = firebaseDb.collection('settings').doc('support').onSnapshot(doc => {
      if (doc.exists) {
        setSupportSettings(doc.data());
      }
    }, error => {
      console.error("Error listening to support settings:", error);
    });
    return unsubscribe;
  }, [firebaseDb, isFirebaseMock]);

  // 2. Listen to active student chats list
  useEffect(() => {
    if (isFirebaseMock) {
      setStudentChats(mockChats);
      return;
    }
    if (!firebaseDb) return;
    const unsubscribe = firebaseDb.collection('chats').orderBy('lastActive', 'desc').onSnapshot(snapshot => {
      const chats = [];
      snapshot.forEach(doc => {
        chats.push({
          id: doc.id,
          ...doc.data()
        });
      });
      setStudentChats(chats);
    }, error => {
      console.error("Error listening to chats:", error);
    });
    return unsubscribe;
  }, [firebaseDb, isFirebaseMock, mockChats]);

  // 3. Listen to messages for selected student chat room
  useEffect(() => {
    if (!selectedChatId) {
      setChatMessages([]);
      return;
    }
    if (isFirebaseMock) {
      setChatMessages(mockMessages[selectedChatId] || []);
      return;
    }
    if (!firebaseDb) return;
    const unsubscribe = firebaseDb.collection('chats').doc(selectedChatId).collection('messages').orderBy('timestamp', 'asc').onSnapshot(snapshot => {
      const msgs = [];
      snapshot.forEach(doc => {
        msgs.push({
          id: doc.id,
          ...doc.data()
        });
      });
      setChatMessages(msgs);

      // Auto mark chat as read
      firebaseDb.collection('chats').doc(selectedChatId).update({
        unread: false
      }).catch(() => {});
    }, error => {
      console.error("Error listening to messages:", error);
    });
    return unsubscribe;
  }, [firebaseDb, selectedChatId, isFirebaseMock, mockMessages]);

  // --- Admin Handlers for App Actions ---

  const handleKeyDown = e => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendReply(e);
    }
  };

  // Send a text reply to the selected student chat
  const handleSendReply = async e => {
    if (e) e.preventDefault();
    if (!replyInput.trim() || !selectedChatId) return;
    const text = replyInput.trim();
    setReplyInput('');
    setShowEmojiPicker(false);
    setSendingReply(true);
    const msgData = {
      sender: 'mentor',
      name: 'Anurag KM (Mentor)',
      text: text,
      type: 'text',
      timestamp: isFirebaseMock ? new Date() : firebase.firestore.FieldValue.serverTimestamp()
    };
    if (isFirebaseMock) {
      // Local State Update
      const updatedMessages = {
        ...mockMessages
      };
      if (!updatedMessages[selectedChatId]) {
        updatedMessages[selectedChatId] = [];
      }
      updatedMessages[selectedChatId].push({
        id: `mentor_${Date.now()}`,
        ...msgData
      });
      setMockMessages(updatedMessages);
      setChatMessages(updatedMessages[selectedChatId]);

      // Update last active in mock chats list
      const updatedChats = mockChats.map(c => {
        if (c.id === selectedChatId) {
          return {
            ...c,
            lastMessage: text,
            lastActive: new Date(),
            unread: false
          };
        }
        return c;
      });
      setMockChats(updatedChats);
      setSendingReply(false);

      // Simulated Student Response trigger (auto reply)
      setTimeout(() => {
        let replyText = 'Thank you for the quick reply, Anurag! I will implement this visual change.';
        let studentEmail = 'student@gmail.com';
        let studentName = 'Student';
        const activeChat = mockChats.find(c => c.id === selectedChatId);
        if (activeChat) {
          studentEmail = activeChat.email;
          studentName = activeChat.name;
          if (activeChat.name === 'Sarah Jenkins') {
            replyText = 'Got it! I am trying those prompt options in Midjourney now. Will share a screenshot soon.';
          } else if (activeChat.name === 'Rajesh Kumar') {
            replyText = 'Awesome, thank you! I will finalize this lecture and move to the film making section.';
          } else if (activeChat.name === 'David Miller') {
            replyText = 'Great, thank you! I will purchase the lifetime bundle now.';
          }
        }
        const studentMsgData = {
          sender: studentEmail,
          name: studentName,
          text: replyText,
          type: 'text',
          timestamp: new Date()
        };
        const followUpMessages = {
          ...updatedMessages
        };
        if (!followUpMessages[selectedChatId]) {
          followUpMessages[selectedChatId] = [];
        }
        followUpMessages[selectedChatId].push({
          id: `student_${Date.now()}`,
          ...studentMsgData
        });
        setMockMessages(followUpMessages);

        // Only update messages list in UI if the user is still looking at this student
        setSelectedChatId(prev => {
          if (prev === selectedChatId) {
            setChatMessages(followUpMessages[selectedChatId]);
          }
          return prev;
        });
        const followUpChats = updatedChats.map(c => {
          if (c.id === selectedChatId) {
            return {
              ...c,
              lastMessage: replyText,
              lastActive: new Date(),
              unread: true
            };
          }
          return c;
        });
        setMockChats(followUpChats);
      }, 2000);
    } else {
      try {
        // Add message to Firestore subcollection
        await firebaseDb.collection('chats').doc(selectedChatId).collection('messages').add(msgData);
        // Update parent document summary
        await firebaseDb.collection('chats').doc(selectedChatId).set({
          lastMessage: text,
          lastActive: firebase.firestore.FieldValue.serverTimestamp(),
          unread: false
        }, {
          merge: true
        });
      } catch (error) {
        console.error("Error writing message to Firestore:", error);
        alert("Failed to send reply: " + error.message);
      } finally {
        setSendingReply(false);
      }
    }
  };

  // Handle file uploads (images, videos, audio, documents) for Admin Chat
  const handleAdminFileUpload = async e => {
    const file = e.target.files[0];
    if (!file || !selectedChatId) return;
    e.target.value = '';
    let type = 'document';
    if (file.type.startsWith('image/')) type = 'image';else if (file.type.startsWith('video/')) type = 'video';else if (file.type.startsWith('audio/')) type = 'audio';
    setSendingReply(true);
    try {
      const fileUrl = URL.createObjectURL(file);
      const msgData = {
        sender: 'mentor',
        name: 'Anurag KM (Mentor)',
        fileUrl: fileUrl,
        fileName: file.name,
        type: type,
        timestamp: isFirebaseMock ? new Date() : firebase.firestore.FieldValue.serverTimestamp()
      };
      if (isFirebaseMock) {
        const updatedMessages = {
          ...mockMessages
        };
        if (!updatedMessages[selectedChatId]) updatedMessages[selectedChatId] = [];
        updatedMessages[selectedChatId].push({
          id: `mentor_${Date.now()}`,
          ...msgData
        });
        setMockMessages(updatedMessages);
        setChatMessages(updatedMessages[selectedChatId]);
        const updatedChats = mockChats.map(c => {
          if (c.id === selectedChatId) {
            return {
              ...c,
              lastMessage: `[${type.toUpperCase()}]`,
              lastActive: new Date(),
              unread: false
            };
          }
          return c;
        });
        setMockChats(updatedChats);
      } else {
        await firebaseDb.collection('chats').doc(selectedChatId).collection('messages').add(msgData);
        await firebaseDb.collection('chats').doc(selectedChatId).set({
          lastMessage: `[${type.toUpperCase()}]`,
          lastActive: firebase.firestore.FieldValue.serverTimestamp(),
          unread: false
        }, {
          merge: true
        });
      }
    } catch (err) {
      console.error("Error uploading file:", err);
      alert("File upload failed: " + err.message);
    } finally {
      setSendingReply(false);
    }
  };

  // Voice Recording Helper Functions on Web (MediaRecorder API)
  const startAdminRecording = async () => {
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        alert("Audio recording is not supported in this browser.");
        return;
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true
      });
      let options = {};
      let ext = 'webm';
      let mimeType = 'audio/webm';
      if (MediaRecorder.isTypeSupported('audio/mp4')) {
        options = {
          mimeType: 'audio/mp4'
        };
        ext = 'mp4';
        mimeType = 'audio/mp4';
      } else if (MediaRecorder.isTypeSupported('audio/aac')) {
        options = {
          mimeType: 'audio/aac'
        };
        ext = 'aac';
        mimeType = 'audio/aac';
      } else if (MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) {
        options = {
          mimeType: 'audio/webm;codecs=opus'
        };
        ext = 'webm';
        mimeType = 'audio/webm;codecs=opus';
      } else if (MediaRecorder.isTypeSupported('audio/webm')) {
        options = {
          mimeType: 'audio/webm'
        };
        ext = 'webm';
        mimeType = 'audio/webm';
      }
      const mediaRecorder = new MediaRecorder(stream, options);
      adminMediaRecorderRef.current = mediaRecorder;
      adminAudioChunksRef.current = [];
      mediaRecorder.ondataavailable = e => {
        if (e.data && e.data.size > 0) {
          adminAudioChunksRef.current.push(e.data);
        }
      };
      mediaRecorder.onstop = async () => {
        // Stop all audio tracks to release microphone
        stream.getTracks().forEach(track => track.stop());

        // Check if recording was cancelled
        if (adminAudioChunksRef.current.length === 0) {
          return;
        }
        const audioBlob = new Blob(adminAudioChunksRef.current, {
          type: mimeType
        });
        if (audioBlob.size === 0) return;

        // Convert blob to File and trigger file upload logic
        const uniqueFilename = `voice_note_${Date.now()}.${ext}`;
        const file = new File([audioBlob], uniqueFilename, {
          type: mimeType
        });
        const mockEvent = {
          target: {
            files: [file]
          }
        };
        await handleAdminFileUpload(mockEvent);
      };
      mediaRecorder.start();
      setIsAdminRecording(true);
      setAdminRecordingDuration(0);
      adminRecordingTimerRef.current = setInterval(() => {
        setAdminRecordingDuration(prev => prev + 1);
      }, 1000);
    } catch (err) {
      console.error("Failed to start recording:", err);
      alert("Could not access microphone: " + err.message);
    }
  };
  const stopAdminRecording = () => {
    const recorder = adminMediaRecorderRef.current;
    if (recorder && recorder.state !== 'inactive') {
      recorder.stop();
    }
    setIsAdminRecording(false);
    if (adminRecordingTimerRef.current) {
      clearInterval(adminRecordingTimerRef.current);
      adminRecordingTimerRef.current = null;
    }
  };
  const cancelAdminRecording = () => {
    const recorder = adminMediaRecorderRef.current;
    if (recorder && recorder.state !== 'inactive') {
      adminAudioChunksRef.current = [];
      recorder.stop();
    }
    setIsAdminRecording(false);
    if (adminRecordingTimerRef.current) {
      clearInterval(adminRecordingTimerRef.current);
      adminRecordingTimerRef.current = null;
    }
  };

  // Toggle Support settings in Firestore
  const handleSaveSupportSettings = async (isOnline, avgTime) => {
    setSavingSupport(true);
    const settings = {
      isOnline,
      avgResponseTime: avgTime
    };
    if (isFirebaseMock) {
      setSupportSettings(settings);
      setSavingSupport(false);
      alert("Offline simulation settings updated! Average response: " + avgTime);
    } else {
      try {
        await firebaseDb.collection('settings').doc('support').set(settings);
        alert("Support status successfully synced in Firestore!");
      } catch (error) {
        console.error("Error updating support status:", error);
        alert("Firestore sync failed: " + error.message);
      } finally {
        setSavingSupport(false);
      }
    }
  };

  // Load WhatsApp config on admin mount
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(GOOGLE_SHEET_WEBHOOK_URL + '?action=getWhatsAppConfig&passkey=' + encodeURIComponent(authenticatedPasskey));
        const config = await res.json();
        setWhatsAppApiUrl(config.apiUrl || '');
        setWhatsAppApiKey(config.apiKey || '');
        setWhatsAppPhoneId(config.phoneId || '');
        setWhatsAppConfigured(!!config.isConfigured);
        setWelcomeEmailSubject(config.emailSubject || '🎉 Welcome to Dxign Learn! - {course}');
        setWelcomeEmailBody(config.emailBody || 'Hi {name},\n\nWelcome to Dxign Learn! 🚀\n\nThank you for completing your registration for the {course} program. We are thrilled to have you join our learning community!\n\n💻 How to Access Your Course Portal:\n1. Go to the Student Course Portal at: https://www.dxignlearn.com/studentportal/\n2. Log in using the email address you registered with: {email}\n3. Enter the 6-digit secure verification OTP code sent to your inbox.\n4. Start streaming lectures, downloading resources, and chatting directly with mentors!\n\nIf you have any questions, feel free to reply directly to this email.\n\nBest regards,\nDxign Learn Team');
        setWelcomeWhatsappBody(config.whatsappBody || 'Hi {name}! 🎉 Welcome to Dxign Learn! Thank you for completing your registration for the *{course}* program. Your learning journey begins now. To start, go to the Student Course Portal at https://www.dxignlearn.com/studentportal/ and log in with your email to receive your OTP. - Dxign Learn Team');
      } catch (_) {}
    })();
  }, []);

  // Save WhatsApp configuration
  const handleSaveWhatsAppConfig = async () => {
    setWhatsAppSaving(true);
    setWhatsAppStatus({
      type: '',
      text: ''
    });
    try {
      const params = new URLSearchParams({
        action: 'saveWhatsAppConfig',
        apiUrl: whatsAppApiUrl.trim(),
        apiKey: whatsAppApiKey.trim(),
        phoneId: whatsAppPhoneId.trim(),
        emailSubject: welcomeEmailSubject.trim(),
        emailBody: welcomeEmailBody.trim(),
        whatsappBody: welcomeWhatsappBody.trim()
      });
      params.append('passkey', authenticatedPasskey);
      const res = await fetch(GOOGLE_SHEET_WEBHOOK_URL + '?' + params.toString());
      const data = await res.json();
      if (data.status === 'success') {
        setWhatsAppConfigured(!!whatsAppApiUrl.trim());
        setWhatsAppStatus({
          type: 'success',
          text: 'Automation settings and templates saved successfully!'
        });
      } else {
        setWhatsAppStatus({
          type: 'error',
          text: 'Failed to save: ' + (data.message || 'Unknown error')
        });
      }
    } catch (err) {
      setWhatsAppStatus({
        type: 'error',
        text: 'Network error: ' + err.message
      });
    } finally {
      setWhatsAppSaving(false);
    }
  };

  // Test WhatsApp configuration
  const handleTestWhatsApp = async () => {
    if (!whatsAppTestPhone.trim()) {
      setWhatsAppStatus({
        type: 'error',
        text: 'Enter a test phone number first.'
      });
      return;
    }
    if (!whatsAppApiUrl.trim()) {
      setWhatsAppStatus({
        type: 'warning',
        text: 'Save your WhatsApp API URL first before testing.'
      });
      return;
    }
    setWhatsAppSaving(true);
    setWhatsAppStatus({
      type: '',
      text: ''
    });
    try {
      const res = await fetch(GOOGLE_SHEET_WEBHOOK_URL + '?action=testWhatsApp&phone=' + encodeURIComponent(whatsAppTestPhone.trim()) + '&passkey=' + encodeURIComponent(authenticatedPasskey));
      const data = await res.json();
      if (data.status === 'success') {
        setWhatsAppStatus({
          type: 'success',
          text: 'Test message sent! Check WhatsApp on ' + whatsAppTestPhone
        });
      } else {
        setWhatsAppStatus({
          type: 'error',
          text: 'Test failed: ' + (data.message || 'Unknown error')
        });
      }
    } catch (err) {
      setWhatsAppStatus({
        type: 'error',
        text: 'Network error: ' + err.message
      });
    } finally {
      setWhatsAppSaving(false);
    }
  };

  // Handle Manual Student Whitelist
  const handleWhitelistSubmit = async e => {
    if (e) e.preventDefault();
    setWhitelistStatus({
      type: '',
      text: ''
    });
    if (!whitelistName.trim() || !whitelistEmail.trim() || !whitelistPhone.trim()) {
      setWhitelistStatus({
        type: 'error',
        text: 'All contact details (Name, Email, Phone) are required.'
      });
      return;
    }
    if (whitelistCourses.length === 0) {
      setWhitelistStatus({
        type: 'error',
        text: 'Please select at least one course to whitelist.'
      });
      return;
    }
    setWhitelistingLoading(true);
    try {
      const coursesList = whitelistCourses;
      for (let c of coursesList) {
        const payload = {
          date: new Date().toLocaleString('en-IN', {
            timeZone: 'Asia/Kolkata'
          }),
          name: whitelistName.trim(),
          email: whitelistEmail.toLowerCase().trim(),
          phone: whitelistPhone.trim(),
          course: c,
          price: '₹0 (Admin Whitelist)',
          status: 'success',
          paymentId: 'ADMIN_WHITELIST_' + Date.now().toString().slice(-6)
        };

        // Post request to Google Sheet webhook
        await fetch(GOOGLE_SHEET_WEBHOOK_URL, {
          method: 'POST',
          mode: 'no-cors',
          headers: {
            'Content-Type': 'text/plain'
          },
          body: JSON.stringify(payload)
        });
      }
      setWhitelistStatus({
        type: 'success',
        text: `Successfully whitelisted ${whitelistName} (${whitelistEmail}) for: ${whitelistCourses.join(', ')}. The student can now log in via the mobile app.`
      });
      setWhitelistName('');
      setWhitelistEmail('');
      setWhitelistPhone('');
      setWhitelistCourses([]);

      // Re-fetch registrations table details
      setTimeout(fetchAdminData, 1500);
    } catch (error) {
      console.error("Whitelisting execution error:", error);
      setWhitelistStatus({
        type: 'error',
        text: 'Webhook execution failed: ' + error.message
      });
    } finally {
      setWhitelistingLoading(false);
    }
  };
  const handleAdminLogin = async e => {
    if (e) e.preventDefault();
    setAdminError('');
    try {
      const res = await fetch(GOOGLE_SHEET_WEBHOOK_URL + '?action=verify_admin_passkey&passkey=' + encodeURIComponent(adminPasswordInput));
      const data = await res.json();
      if (data.status === 'success') {
        setAuthenticatedPasskey(adminPasswordInput);
        setIsAdminAuthenticated(true);
        setAdminPasswordInput('');
      } else {
        setAdminError('Incorrect Admin Passkey.');
      }
    } catch (err) {
      setAdminError('Failed to verify passkey. Check webhook connection.');
    }
  };
  const handleAdminLogout = () => {
    setAuthenticatedPasskey('');
    setIsAdminAuthenticated(false);
    setAdminPasswordInput('');
    setAdminData([]);
  };
  const exportToPDF = type => {
    const dateStr = new Date().toLocaleString('en-IN', {
      timeZone: 'Asia/Kolkata'
    });
    const logoUrl = `${window.location.origin}/public/Images/logo/Dxign-logo.png`;
    const isReg = type === 'registrations' || type === 'both';
    const isEnq = type === 'enquiries' || type === 'both';
    const regData = adminData.filter(r => (r.status || '').toLowerCase() !== 'enquiry');
    const enqData = adminData.filter(r => (r.status || '').toLowerCase() === 'enquiry');
    const successCount = regData.filter(r => (r.status || '').toLowerCase() === 'success').length;
    const initiatedCount = regData.filter(r => (r.status || '').toLowerCase() === 'initiated').length;
    const totalRevenue = regData.filter(r => (r.status || '').toLowerCase() === 'success').reduce((sum, r) => sum + (parseInt((r.price || '').replace(/\D/g, '')) || 0), 0);
    const genRows = (data, startNum) => data.map((row, i) => {
      const isSuccess = (row.status || '').toLowerCase() === 'success';
      const isInitiated = (row.status || '').toLowerCase() === 'initiated';
      const statusColor = isSuccess ? '#22c55e' : isInitiated ? '#f59e0b' : '#3b82f6';
      const statusBg = isSuccess ? '#f0fdf4' : isInitiated ? '#fffbeb' : '#eff6ff';
      const whatsapp = row.phone ? `https://wa.me/${String(row.phone).replace(/[^0-9]/g, '')}?text=Hi ${encodeURIComponent(row.name || 'Student')}%21` : '#';
      const mailto = row.email ? `mailto:${row.email}?subject=${encodeURIComponent('Welcome to Dxign Learn')}` : '#';
      return `
          <tr>
            <td class="num">${startNum + i + 1}</td>
            <td>${formatDate(row.date)}</td>
            <td class="name">${row.name || '—'}</td>
            <td>${row.email || '—'}</td>
            <td>${row.phone || '—'}</td>
            <td>${(row.course || '').replace(/\[.*\]/, '').trim() || '—'}</td>
            <td class="amount">${row.price || (type === 'enquiries' ? '—' : '—')}</td>
            <td><span class="badge" style="color:${statusColor};background:${statusBg}">${row.status || '—'}</span></td>
            <td class="action"><a href="${whatsapp}" style="color:#25D366;text-decoration:none;font-weight:600">WhatsApp</a></td>
            <td class="action"><a href="${mailto}" style="color:#6366f1;text-decoration:none;font-weight:600">Email</a></td>
          </tr>`;
    }).join('');
    let kpiHtml = '';
    let tableHtml = '';
    let title = '';
    if (type === 'registrations') {
      title = 'Registration Report';
      if (regData.length === 0) {
        alert('No registration data to export.');
        setShowExportModal(false);
        return;
      }
      kpiHtml = `
          <div class="stats">
            <div class="stat" style="--a:#6366f1;--ib:#eef2ff">
              <div class="stat-accent"></div>
              <div class="stat-icon"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#6366f1" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg></div>
              <div class="stat-label">Total Registrations</div>
              <div class="stat-val">${regData.length}</div>
              <div class="stat-desc">All registration attempts</div>
            </div>
            <div class="stat" style="--a:#22c55e;--ib:#f0fdf4">
              <div class="stat-accent"></div>
              <div class="stat-icon"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#22c55e" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg></div>
              <div class="stat-label">Confirmed</div>
              <div class="stat-val">${successCount}</div>
              <div class="stat-desc">Successful payments</div>
            </div>
            <div class="stat" style="--a:#f59e0b;--ib:#fffbeb">
              <div class="stat-accent"></div>
              <div class="stat-icon"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg></div>
              <div class="stat-label">Pending</div>
              <div class="stat-val">${initiatedCount}</div>
              <div class="stat-desc">Initiated, not completed</div>
            </div>
            <div class="stat" style="--a:#0ea5e9;--ib:#f0f9ff">
              <div class="stat-accent"></div>
              <div class="stat-icon"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#0ea5e9" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="12" x2="12" y1="2" y2="22"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg></div>
              <div class="stat-label">Revenue</div>
              <div class="stat-val">&#8377;${totalRevenue.toLocaleString('en-IN')}</div>
              <div class="stat-desc">From confirmed payments</div>
            </div>
          </div>`;
      tableHtml = `<div class="section"><div class="section-title">Registration Details</div><table><thead><tr><th>#</th><th>Date</th><th>Name</th><th>Email</th><th>Phone</th><th>Course</th><th>Amount</th><th>Status</th><th>WhatsApp</th><th>Email</th></tr></thead><tbody>${genRows(regData, 0)}</tbody></table></div>`;
    } else if (type === 'enquiries') {
      title = 'Enquiry Report';
      if (enqData.length === 0) {
        alert('No enquiry data to export.');
        setShowExportModal(false);
        return;
      }
      kpiHtml = `
          <div class="stats">
            <div class="stat" style="--a:#6366f1;--ib:#eef2ff">
              <div class="stat-accent"></div>
              <div class="stat-icon"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#6366f1" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg></div>
              <div class="stat-label">Total Enquiries</div>
              <div class="stat-val">${enqData.length}</div>
              <div class="stat-desc">Course enquiries received</div>
            </div>
            <div class="stat" style="--a:#3b82f6;--ib:#eff6ff">
              <div class="stat-accent"></div>
              <div class="stat-icon"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20"/><path d="M2 12h20"/></svg></div>
              <div class="stat-label">Cities</div>
              <div class="stat-val">${new Set(enqData.map(r => r.paymentId).filter(Boolean)).size}</div>
              <div class="stat-desc">Unique cities covered</div>
            </div>
            <div class="stat" style="--a:#22c55e;--ib:#f0fdf4">
              <div class="stat-accent"></div>
              <div class="stat-icon"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#22c55e" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg></div>
              <div class="stat-label">Courses</div>
              <div class="stat-val">${new Set(enqData.map(r => (r.course || '').replace(/\[.*\]/, '').trim()).filter(Boolean)).size}</div>
              <div class="stat-desc">Unique courses enquired</div>
            </div>
            <div class="stat" style="--a:#f59e0b;--ib:#fffbeb">
              <div class="stat-accent"></div>
              <div class="stat-icon"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg></div>
              <div class="stat-label">Conversion</div>
              <div class="stat-val">${enqData.length > 0 ? (regData.filter(r => (r.status || '').toLowerCase() === 'success').length / (enqData.length + regData.length) * 100).toFixed(1) : 0}%</div>
              <div class="stat-desc">Overall success rate</div>
            </div>
          </div>`;
      tableHtml = `<div class="section"><div class="section-title">Enquiry Details</div><table><thead><tr><th>#</th><th>Date</th><th>Name</th><th>Email</th><th>Phone</th><th>Course</th><th>City</th><th>Status</th><th>WhatsApp</th><th>Email</th></tr></thead><tbody>${genRows(enqData, 0)}</tbody></table></div>`;
    } else {
      title = 'Complete Report';
      if (regData.length === 0 && enqData.length === 0) {
        alert('No data to export.');
        setShowExportModal(false);
        return;
      }
      kpiHtml = `
          <div class="stats">
            <div class="stat" style="--a:#6366f1;--ib:#eef2ff">
              <div class="stat-accent"></div>
              <div class="stat-icon"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#6366f1" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg></div>
              <div class="stat-label">Total Registrations</div>
              <div class="stat-val">${regData.length}</div>
              <div class="stat-desc">Course registrations</div>
            </div>
            <div class="stat" style="--a:#22c55e;--ib:#f0fdf4">
              <div class="stat-accent"></div>
              <div class="stat-icon"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#22c55e" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg></div>
              <div class="stat-label">Confirmed</div>
              <div class="stat-val">${successCount}</div>
              <div class="stat-desc">Successful payments</div>
            </div>
            <div class="stat" style="--a:#3b82f6;--ib:#eff6ff">
              <div class="stat-accent"></div>
              <div class="stat-icon"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20"/><path d="M2 12h20"/></svg></div>
              <div class="stat-label">Enquiries</div>
              <div class="stat-val">${enqData.length}</div>
              <div class="stat-desc">Course enquiries</div>
            </div>
            <div class="stat" style="--a:#0ea5e9;--ib:#f0f9ff">
              <div class="stat-accent"></div>
              <div class="stat-icon"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#0ea5e9" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="12" x2="12" y1="2" y2="22"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg></div>
              <div class="stat-label">Revenue</div>
              <div class="stat-val">&#8377;${totalRevenue.toLocaleString('en-IN')}</div>
              <div class="stat-desc">From confirmed payments</div>
            </div>
          </div>`;
      let allRows = '';
      if (regData.length > 0) allRows += genRows(regData, 0);
      if (enqData.length > 0) allRows += genRows(enqData, regData.length);
      tableHtml = `<div class="section"><div class="section-title">All Records (Registrations + Enquiries)</div><table><thead><tr><th>#</th><th>Date</th><th>Name</th><th>Email</th><th>Phone</th><th>Course</th><th>Amount</th><th>Status</th><th>WhatsApp</th><th>Email</th></tr></thead><tbody>${allRows}</tbody></table></div>`;
    }
    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <title>Dxign.learn — ${title}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:ital,opsz,wght@0,14..32,100..900;1,14..32,100..900&display=swap');
    *{margin:0;padding:0;box-sizing:border-box}
    body{font-family:'Inter',system-ui,sans-serif;background:#fafafa;color:#18181b;font-size:10px;min-height:100vh}
    .header{display:flex;align-items:center;justify-content:space-between;padding:24px 36px 20px;background:#fff;border-bottom:1px solid #e4e4e7}
    .brand{display:flex;align-items:center;gap:12px}
    .logo{height:34px;width:auto;object-fit:contain}
    .brand-text h1{font-size:15px;font-weight:800;letter-spacing:.5px;color:#09090b;line-height:1}
    .brand-text p{font-size:7px;font-weight:500;color:#71717a;letter-spacing:2px;text-transform:uppercase;margin-top:2px}
    .report-label{text-align:right}
    .report-label .rtitle{font-size:10px;font-weight:700;color:#09090b;letter-spacing:.3px}
    .report-label .rsub{font-size:7px;color:#a1a1aa;margin-top:3px}
    .report-label .rdate{font-size:7.5px;color:#52525b;margin-top:2px;font-weight:500}
    .contact-bar{display:flex;align-items:center;background:#09090b;padding:8px 36px;flex-wrap:wrap;gap:0}
    .citem{display:flex;align-items:center;gap:5px;padding:3px 14px 3px 0;margin-right:14px;border-right:1px solid #27272a;color:#a1a1aa;font-size:7.5px;font-weight:400}
    .citem:last-child{border-right:none;margin-right:0}
    .citem strong{color:#e4e4e7;font-weight:600}
    .stats{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;padding:16px 36px;background:#fafafa}
    .stat{background:#fff;border:1px solid #e4e4e7;border-radius:8px;padding:12px 14px;position:relative;overflow:hidden}
    .stat-accent{position:absolute;top:0;left:0;right:0;height:2px;background:var(--a);border-radius:8px 8px 0 0}
    .stat-icon{width:24px;height:24px;border-radius:6px;display:flex;align-items:center;justify-content:center;background:var(--ib);margin-bottom:8px}
    .stat-label{font-size:7px;font-weight:600;color:#71717a;text-transform:uppercase;letter-spacing:1px;margin-bottom:3px}
    .stat-val{font-size:18px;font-weight:800;color:#09090b;line-height:1}
    .stat-desc{font-size:7px;color:#a1a1aa;margin-top:2px}
    .section{padding:0 36px 24px}
    .section-title{font-size:7.5px;font-weight:700;text-transform:uppercase;letter-spacing:1.2px;color:#71717a;margin-bottom:10px;padding-top:4px;display:flex;align-items:center;gap:8px}
    .section-title::after{content:'';flex:1;height:1px;background:#e4e4e7}
    table{width:100%;border-collapse:collapse;background:#fff;border:1px solid #e4e4e7;border-radius:8px;overflow:hidden;font-size:8px}
    thead tr{background:#09090b}
    thead th{padding:7px 8px;text-align:left;font-size:6.5px;font-weight:600;letter-spacing:.8px;text-transform:uppercase;color:#a1a1aa;white-space:nowrap}
    tbody tr{border-bottom:1px solid #f4f4f5}
    tbody tr:last-child{border-bottom:none}
    tbody td{padding:6px 8px;vertical-align:middle;color:#3f3f46}
    td.num{color:#d4d4d8;font-size:7px;font-weight:600;width:22px}
    td.name{font-weight:600;color:#09090b}
    td.amount{font-weight:700;color:#09090b;font-variant-numeric:tabular-nums}
    td.action{text-align:center;white-space:nowrap}
    .badge{display:inline-flex;align-items:center;gap:3px;padding:2px 6px;border-radius:999px;font-size:6.5px;font-weight:700;letter-spacing:.4px;text-transform:uppercase}
    .badge::before{content:'';width:3px;height:3px;border-radius:50%;background:currentColor;display:inline-block}
    .footer{display:flex;justify-content:space-between;align-items:center;padding:10px 36px;background:#fff;border-top:1px solid #e4e4e7;font-size:7px;color:#a1a1aa}
    .footer strong{color:#71717a;font-weight:600}
    @media print{body{-webkit-print-color-adjust:exact;print-color-adjust:exact;background:#fff}@page{size:A4 landscape;margin:0}}
  </style>
</head>
<body>
  <div class="header">
    <div class="brand">
      <img src="${logoUrl}" alt="Dxign" class="logo" onerror="this.style.display='none'"/>
      <div class="brand-text">
        <h1>Dxign.learn</h1>
        <p>AI Education Platform</p>
      </div>
    </div>
    <div class="report-label">
      <div class="rtitle">${title}</div>
      <div class="rsub">Confidential &middot; Internal Use Only</div>
      <div class="rdate">Generated: ${dateStr}</div>
    </div>
  </div>
  <div class="contact-bar">
    <div class="citem"><strong>+91 73564 13558</strong></div>
    <div class="citem"><strong>contact@aimastery.academy</strong></div>
    <div class="citem"><strong>dxignlearn.vercel.app</strong></div>
  </div>
  ${kpiHtml}
  ${tableHtml}
  <div class="footer">
    <span>&copy; 2026 <strong>Dxign.learn</strong> &middot; All Rights Reserved</span>
    <span>Total: <strong>${type === 'both' ? regData.length + enqData.length : type === 'registrations' ? regData.length : enqData.length} records</strong></span>
  </div>
</body>
</html>`;
    setShowExportModal(false);
    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.top = '-9999px';
    iframe.style.left = '-9999px';
    iframe.style.width = '1px';
    iframe.style.height = '1px';
    document.body.appendChild(iframe);
    const doc = iframe.contentWindow.document;
    doc.open();
    doc.write(html);
    doc.close();
    setTimeout(() => {
      iframe.contentWindow.focus();
      iframe.contentWindow.print();
      setTimeout(() => document.body.removeChild(iframe), 1500);
    }, 500);
  };
  const formatDate = dateStr => {
    if (!dateStr) return '—';
    try {
      const parts = dateStr.split(',');
      if (parts.length >= 2) {
        const datePart = parts[0].trim();
        const timePart = parts[1].trim();
        const dateSegments = datePart.split('/');
        if (dateSegments.length === 3) {
          const d = String(parseInt(dateSegments[0])).padStart(2, '0');
          const m = String(parseInt(dateSegments[1])).padStart(2, '0');
          const y = dateSegments[2];
          const timeMatch = timePart.match(/(\d+):(\d+)/);
          if (timeMatch) {
            let h = parseInt(timeMatch[1]);
            const min = timeMatch[2];
            const ampm = timePart.toLowerCase().includes('pm') ? 'PM' : 'AM';
            return `${d}-${m}-${y} - ${h}:${min} ${ampm}`;
          }
          return `${d}-${m}-${y}`;
        }
      }
      const d = new Date(dateStr);
      if (!isNaN(d.getTime())) {
        const dd = String(d.getDate()).padStart(2, '0');
        const mm = String(d.getMonth() + 1).padStart(2, '0');
        const yyyy = d.getFullYear();
        let h = d.getHours();
        const min = String(d.getMinutes()).padStart(2, '0');
        const ampm = h >= 12 ? 'PM' : 'AM';
        h = h % 12 || 12;
        return `${dd}-${mm}-${yyyy} - ${h}:${min} ${ampm}`;
      }
    } catch (e) {}
    return dateStr;
  };
  const getCourseInfo = courseTitle => {
    if (!courseTitle || typeof courseTitle !== 'string') return null;
    return courseList.find(c => courseTitle.toLowerCase().includes(c.title.toLowerCase()) || c.title.toLowerCase().includes(courseTitle.toLowerCase())) || null;
  };
  const getWhatsAppLink = (phone, name, courseTitle) => {
    if (phone === '' || phone === null || phone === undefined) return '#';
    const phoneStr = String(phone);
    const safeName = String(name || 'Student');
    const safeCourse = String(courseTitle || 'our course');
    const course = getCourseInfo(safeCourse);
    const desc = course ? course.description : 'Industry-leading AI skills training with hands-on projects and expert mentorship.';
    const msg = `Hi ${safeName}!%0A%0A🎉 *Welcome to Dxign Learn!*%0A%0AThank you for your interest in *${safeCourse}*.%0A%0A${desc}%0A%0A📞 Our team will reach out to you shortly with more details.%0A%0ABest regards,%0A*Dxign Learn Team*`;
    const cleanPhone = phoneStr.replace(/[^0-9]/g, '').replace(/^0+/, '');
    if (!cleanPhone) return '#';
    return `https://wa.me/${cleanPhone}?text=${msg}`;
  };
  const getMailtoLink = (email, name, courseTitle) => {
    if (email === '' || email === null || email === undefined) return '#';
    const emailStr = String(email);
    const safeName = String(name || 'Student');
    const safeCourse = String(courseTitle || 'our course');
    const course = getCourseInfo(safeCourse);
    const desc = course ? course.description : 'Industry-leading AI skills training with hands-on projects and expert mentorship.';
    const subject = encodeURIComponent(`Welcome to Dxign Learn - ${safeCourse}`);
    const body = encodeURIComponent(`Hi ${safeName},

🎉 Welcome to Dxign Learn!

Thank you for your interest in ${safeCourse}.

${desc}

Our team will reach out to you shortly with more details.

Best regards,
Dxign Learn Team`);
    return `mailto:${emailStr}?subject=${subject}&body=${body}`;
  };
  const saveToGoogleSheet = async (status, paymentId = '', nameVal = '', emailVal = '', phoneVal = '', courseVal = '', priceVal = '') => {
    const webhookUrl = GOOGLE_SHEET_WEBHOOK_URL;
    if (!webhookUrl) {
      console.log('Google Sheet Webhook URL not configured');
      return;
    }
    const data = {
      date: new Date().toLocaleString('en-IN', {
        timeZone: 'Asia/Kolkata'
      }),
      name: nameVal,
      email: emailVal,
      phone: phoneVal,
      course: courseVal,
      price: priceVal,
      status: status,
      paymentId: paymentId
    };
    try {
      await fetch(webhookUrl, {
        method: 'POST',
        mode: 'no-cors',
        headers: {
          'Content-Type': 'text/plain'
        },
        body: JSON.stringify(data)
      });
      console.log('Data logged to Google Sheets:', status);
    } catch (error) {
      console.error('Error logging to Google Sheets:', error);
    }
  };
  const handleRazorpayPay = () => {
    if (!enrollModal) return;

    // Validations
    if (!nameInput.trim()) {
      setEnrollError('Please enter your name.');
      return;
    }
    if (!emailInput.trim()) {
      setEnrollError('Please enter your email address.');
      return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(emailInput.trim())) {
      setEnrollError('Please enter a valid email address.');
      return;
    }
    if (!phoneInput.trim()) {
      setEnrollError('Please enter your mobile number.');
      return;
    }
    if (phoneInput.trim().length !== 10) {
      setEnrollError('Please enter a valid 10-digit mobile number.');
      return;
    }
    setEnrollError('');
    const nameVal = nameInput.trim();
    const emailVal = emailInput.trim();
    const phoneVal = phoneInput.trim();
    const courseVal = enrollModal.title;
    const priceVal = enrollModal.price;

    // Free enrollment — skip Razorpay
    if (enrollModal.priceAmount === 0) {
      closeEnrollModal();
      saveToGoogleSheet('Success (Free)', '', nameVal, emailVal, phoneVal, courseVal, priceVal);
      alert('🎉 Welcome to ' + courseVal + '!\n\nYour free enrollment is confirmed. Check your email for course access instructions.');
      return;
    }
    const options = {
      key: RAZORPAY_KEY,
      amount: enrollModal.priceAmount,
      currency: 'INR',
      name: 'Dxign Learn',
      description: enrollModal.title,
      image: '../public/Images/logo/Dxign-logo.png',
      handler: function (response) {
        closeEnrollModal();
        saveToGoogleSheet('Success', response.razorpay_payment_id, nameVal, emailVal, phoneVal, courseVal, priceVal);
        alert('🎉 Payment Successful!\nPayment ID: ' + response.razorpay_payment_id + '\n\nWelcome to ' + courseVal + '! Check your email for course access.');
      },
      prefill: {
        name: nameVal,
        email: emailVal,
        contact: phoneVal
      },
      readonly: {
        name: true,
        email: true,
        contact: true
      },
      notes: {
        course_id: enrollModal.id,
        course_name: enrollModal.title
      },
      theme: {
        color: enrollModal.colorCode
      },
      modal: {
        ondismiss: function () {
          console.log('Razorpay checkout closed');
        }
      }
    };
    const rzp = new window.Razorpay(options);
    rzp.on('payment.failed', function (response) {
      alert('Payment failed. Reason: ' + response.error.description);
    });

    // Log transaction initiation
    saveToGoogleSheet('Initiated', '', nameVal, emailVal, phoneVal, courseVal, priceVal);
    rzp.open();
  };

  // General Enroll Now — All Courses Lifetime Access (Free)
  const handleGeneralEnroll = () => {
    openEnrollModal({
      id: 'all-courses',
      title: 'All Courses Lifetime Access',
      subtitle: 'Complete AI Mastery Suite',
      description: 'Get instant lifetime access to all 6 AI courses: AI Fundamentals, Graphic Design, Filmmaking, Website Creation, UI/UX Design, and Content Marketing. Includes all future updates and new modules.',
      icon: 'layers',
      colorName: 'cyan',
      colorCode: '#00f0ff',
      badge: 'Best Value',
      category: 'bundle',
      tools: ['All 6 Courses', 'Full Modules', 'Source Files'],
      duration: 'Lifetime',
      price: '₹4,000',
      originalPrice: '₹24,999',
      discount: '84% Off',
      priceAmount: 400000
    });
  };
  const startDemoTyping = () => {
    const popup = document.getElementById('demo-chat-popup');
    if (!popup || popup.classList.contains('opacity-0')) return;
    const msgEl = document.getElementById('demo-typing-text');
    const mentorEl = document.getElementById('demo-mentor-text');
    const mentorRow = document.getElementById('demo-mentor-reply');
    if (!msgEl) return;
    const studentQuestions = ['How do I generate videos using Google Veo AI?', 'What prompts work best for Google Veo video generation?', 'Can Google Veo create 60fps cinematic videos?'];
    const mentorAnswers = ['To get professional-quality Veo videos, structure your prompts like this:\n\nSubject + Action + Environment + Camera + Lighting + Style\n\nExample:\n\n"Vintage car driving through a rainy Kerala road, cinematic tracking shot, dramatic monsoon atmosphere, soft natural lighting, ultra-realistic 4K film look."', 'Awesome! For Veo, use descriptive visual language: specify camera angle, lighting, mood, and subject movement. Example: "Low angle tracking shot of a futuristic car drifting in rain, dramatic lighting". The more visual detail, the better the output!', 'Yes! Veo supports up to 60fps for cinematic motion. Use prompts like "smooth 60fps slow-motion shot of waves crashing at golden hour, hyper-realistic". Pair it with descriptive camera movements for the best results!'];
    const idx = Math.floor(Math.random() * studentQuestions.length);
    const question = studentQuestions[idx];
    const answer = mentorAnswers[idx];

    // Reset mentor reply
    if (mentorRow) {
      mentorRow.classList.add('opacity-0', 'translate-y-2');
    }
    if (mentorEl) {
      mentorEl.textContent = '';
    }

    // Type student question
    msgEl.textContent = '';
    msgEl.classList.remove('animate-pulse');
    let i = 0;
    const interval = setInterval(() => {
      if (i < question.length) {
        msgEl.textContent += question.charAt(i);
        i++;
      } else {
        clearInterval(interval);
        msgEl.classList.add('animate-pulse');

        // Show mentor reply after a brief pause
        setTimeout(() => {
          if (mentorEl && mentorRow) {
            mentorEl.textContent = answer;
            mentorRow.classList.remove('opacity-0', 'translate-y-2');
          }
        }, 800);

        // Reset after display
        setTimeout(() => {
          msgEl.textContent = '▊';
          msgEl.classList.add('animate-pulse');
          if (mentorRow) {
            mentorRow.classList.add('opacity-0', 'translate-y-2');
          }
          if (mentorEl) {
            mentorEl.textContent = '';
          }
        }, 6000);
      }
    }, 30);
  };
  const colorThemes = {
    emerald: {
      grad: 'linear-gradient(135deg, #10b981, #00f0ff)',
      glow: 'rgba(16, 185, 129, 0.08)',
      bgIcon: 'bg-brand-emerald/5 border-brand-emerald/10 text-brand-emerald'
    },
    rose: {
      grad: 'linear-gradient(135deg, #ec4899, #a855f7)',
      glow: 'rgba(236, 72, 153, 0.08)',
      bgIcon: 'bg-brand-rose/5 border-brand-rose/10 text-brand-rose'
    },
    violet: {
      grad: 'linear-gradient(135deg, #a855f7, #6366f1)',
      glow: 'rgba(168, 85, 247, 0.08)',
      bgIcon: 'bg-brand-violet/5 border-brand-violet/10 text-brand-violet'
    },
    cyan: {
      grad: 'linear-gradient(135deg, #00f0ff, #2563eb)',
      glow: 'rgba(0, 240, 255, 0.08)',
      bgIcon: 'bg-brand-cyan/5 border-brand-cyan/10 text-brand-cyan'
    },
    amber: {
      grad: 'linear-gradient(135deg, #f59e0b, #ec4899)',
      glow: 'rgba(245, 158, 11, 0.08)',
      bgIcon: 'bg-amber-500/5 border-amber-500/10 text-amber-500'
    }
  };

  // Initialize Lenis smooth scroll
  useEffect(() => {
    if (!window.Lenis) return;
    // Disable Lenis on mobile to allow native scrolling/touch
    if (window.innerWidth < 1024) return;
    const lenis = new window.Lenis({
      duration: 1.2,
      easing: t => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      orientation: 'vertical',
      gestureOrientation: 'vertical',
      smoothWheel: true,
      smoothTouch: false
    });
    window.lenis = lenis;

    // Synchronize GSAP ScrollTrigger with Lenis scroll updates
    lenis.on('scroll', ScrollTrigger.update);
    gsap.ticker.add(time => {
      lenis.raf(time * 1000);
    });
    gsap.ticker.lagSmoothing(0);

    // Keep scroll stopped initially since we start in hero pinned scene
    lenis.stop();
    return () => {
      lenis.destroy();
      gsap.ticker.remove(lenis.raf);
      delete window.lenis;
    };
  }, []);

  // Scroll trigger registration on items
  useEffect(() => {
    // GSAP Scroll Trigger Entrance Animations
    gsap.registerPlugin(ScrollTrigger);

    // Hero Content reveals
    gsap.from('.hero-reveal-text', {
      y: 50,
      opacity: 0,
      duration: 1,
      stagger: 0.15,
      ease: 'power4.out'
    });

    // About Us section elements
    gsap.from('.reveal-about-item', {
      scrollTrigger: {
        trigger: '#why-ai-now',
        start: 'top 75%'
      },
      x: 40,
      opacity: 0,
      duration: 0.8,
      ease: 'power3.out'
    });

    // Timeline reveals
    gsap.from('.reveal-timeline-node', {
      scrollTrigger: {
        trigger: '#timeline',
        start: 'top 80%'
      },
      scale: 0.8,
      opacity: 0,
      duration: 0.6,
      stagger: 0.12,
      ease: 'back.out(1.7)'
    });

    // Icons initialize
    if (window.lucide) {
      window.lucide.createIcons();
    }
    return () => {
      // Cleanup if needed
    };
  }, []);

  // Trigger icons re-creation on DOM changes
  useEffect(() => {
    if (window.lucide) {
      window.lucide.createIcons();
    }
  });

  // Navigate function with smooth scroll target focus
  const navigateToSection = (id, targetToFocusId = null) => {
    if (window.unpinHero) {
      window.unpinHero();
    }
    const el = document.getElementById(id);
    if (el) {
      const offset = el.offsetTop - 85;
      window.scrollTo({
        top: offset,
        behavior: 'smooth'
      });
      if (targetToFocusId) {
        setTimeout(() => {
          let target = document.getElementById(targetToFocusId);
          if (!target) {
            if (targetToFocusId.startsWith('card-')) {
              target = document.getElementById(targetToFocusId.replace('card-', 'row-'));
            } else if (targetToFocusId.startsWith('row-')) {
              target = document.getElementById(targetToFocusId.replace('row-', 'card-'));
            }
          }
          if (target) {
            const isRow = target.id.startsWith('row-');
            target.classList.add(isRow ? 'translate-x-2' : '-translate-y-1', 'border-white/25');
            target.style.setProperty('--card-glow-color-soft', 'rgba(255,255,255,0.15)');
            setTimeout(() => {
              target.classList.remove(isRow ? 'translate-x-2' : '-translate-y-1', 'border-white/25');
              target.style.removeProperty('--card-glow-color-soft');
            }, 1800);
          }
        }, 600);
      }
    }
  };
  const openBlog = () => {
    if (window.unpinHero) window.unpinHero();
    setIsBlogOpen(true);
    setBlogCategory('All Articles');
    setBlogSearch('');
    setScrollLock(true);
    if (window.lenis) window.lenis.stop();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };
  const closeBlog = () => {
    setIsBlogOpen(false);
    setScrollLock(false);
    if (window.lenis && window.innerWidth >= 1024) window.lenis.start();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };
  const filteredShowcase = showcaseFilter === 'All' ? showcaseProjects : showcaseProjects.filter(p => p.cat === showcaseFilter);

  // Auto-play demo animation when 24/7 support section is visible
  useEffect(() => {
    const section = document.getElementById('final-cta');
    if (!section) return;
    let timeoutIds = [];
    let isVisible = false;
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          isVisible = true;
          startAutoDemo();
        } else {
          isVisible = false;
        }
      });
    }, {
      threshold: 0.35
    });
    observer.observe(section);
    function startAutoDemo() {
      function setActiveTab(tab) {
        const videoBtn = document.getElementById('demo-tab-video');
        const chatBtn = document.getElementById('demo-tab-chat');
        if (!videoBtn || !chatBtn) return;
        if (tab === 'chat') {
          videoBtn.classList.remove('bg-brand-cyan', 'text-black');
          videoBtn.classList.add('text-gray-500');
          chatBtn.classList.remove('text-gray-500');
          chatBtn.classList.add('bg-brand-cyan', 'text-black');
        } else {
          videoBtn.classList.remove('text-gray-500');
          videoBtn.classList.add('bg-brand-cyan', 'text-black');
          chatBtn.classList.remove('bg-brand-cyan', 'text-black');
          chatBtn.classList.add('text-gray-500');
        }
      }
      function playCycle() {
        if (!isVisible) return;
        const popup = document.getElementById('demo-chat-popup');
        const video = document.getElementById('demo-video');
        if (!popup) return;

        // Show popup + switch to Chat tab + pause video
        popup.classList.remove('opacity-0', 'translate-y-4', 'pointer-events-none');
        setActiveTab('chat');
        if (video) video.pause();

        // Start typing after popup slides in
        window.typingTimeout = setTimeout(() => {
          if (!isVisible) return;
          startDemoTyping();
        }, 700);

        // Hide popup + switch back to Video tab + resume video
        window.cycleTimeout = setTimeout(() => {
          if (!isVisible) return;
          popup.classList.add('opacity-0', 'translate-y-4', 'pointer-events-none');
          setActiveTab('video');
          if (video) video.play();

          // Restart cycle after hidden pause
          timeoutIds.push(setTimeout(() => {
            if (isVisible) playCycle();
          }, 2500));
        }, 11000);
      }

      // Initial delay before first play
      timeoutIds.push(setTimeout(playCycle, 2000));
    }
    return () => {
      observer.disconnect();
      timeoutIds.forEach(id => clearTimeout(id));
    };
  }, []);

  // Glow spotlight tracker on demo device frame
  useEffect(() => {
    const frame = document.getElementById('demo-device-frame');
    const spotlight = document.getElementById('demo-spotlight');
    if (!frame || !spotlight) return;
    const handleMouseMove = e => {
      const rect = frame.getBoundingClientRect();
      const x = (e.clientX - rect.left) / rect.width * 100;
      const y = (e.clientY - rect.top) / rect.height * 100;
      spotlight.style.setProperty('--sx', x + '%');
      spotlight.style.setProperty('--sy', y + '%');
      spotlight.style.opacity = '1';
    };
    const handleMouseLeave = () => {
      spotlight.style.opacity = '0';
    };
    frame.addEventListener('mousemove', handleMouseMove);
    frame.addEventListener('mouseleave', handleMouseLeave);
    return () => {
      frame.removeEventListener('mousemove', handleMouseMove);
      frame.removeEventListener('mouseleave', handleMouseLeave);
    };
  }, []);
  return /*#__PURE__*/React.createElement("div", {
    className: "relative min-h-screen bg-brand-bg text-gray-200 select-none overflow-x-hidden pb-1"
  }, /*#__PURE__*/React.createElement("div", {
    className: "glow-blur-cyan w-[400px] h-[400px] top-[10%] left-[-10%]"
  }), /*#__PURE__*/React.createElement("div", {
    className: "glow-blur-violet w-[500px] h-[500px] top-[30%] right-[-10%]"
  }), /*#__PURE__*/React.createElement("div", {
    className: "glow-blur-cyan w-[400px] h-[400px] bottom-[20%] left-[10%]"
  }), /*#__PURE__*/React.createElement("div", {
    className: "absolute inset-0 cyber-grid pointer-events-none z-0"
  }), /*#__PURE__*/React.createElement("header", {
    className: "fixed top-0 left-0 right-0 h-16 md:h-20 glass-nav z-50 px-6 md:px-12 lg:px-24 flex items-center"
  }, /*#__PURE__*/React.createElement("div", {
    className: "max-w-7xl mx-auto w-full flex justify-between items-center"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center self-center cursor-pointer",
    onClick: () => {
      if (window.goToHeroStart) {
        window.goToHeroStart();
      } else {
        window.scrollTo({
          top: 0,
          behavior: 'smooth'
        });
      }
    }
  }, /*#__PURE__*/React.createElement("img", {
    src: "../public/Images/logo/Dxign-logo.png",
    alt: "Dxign Learn — AI Courses Online",
    className: "h-10 md:h-11 w-auto object-contain",
    style: {
      display: 'block'
    }
  })), /*#__PURE__*/React.createElement("div", {
    className: "flex items-center space-x-4 lg:space-x-8 z-50"
  }, /*#__PURE__*/React.createElement("nav", {
    className: "hidden lg:flex items-center space-x-1"
  }, /*#__PURE__*/React.createElement("button", {
    onClick: () => {
      if (window.goToHeroStart) {
        window.goToHeroStart();
      } else {
        window.scrollTo({
          top: 0,
          behavior: 'smooth'
        });
      }
    },
    className: "px-3 py-2 text-xs xl:text-sm font-semibold uppercase tracking-wider text-gray-400 hover:text-white transition-colors duration-300"
  }, "Home"), /*#__PURE__*/React.createElement("button", {
    onClick: () => navigateToSection('why-ai-now'),
    className: "px-3 py-2 text-xs xl:text-sm font-semibold uppercase tracking-wider text-gray-400 hover:text-white transition-colors duration-300"
  }, "About Us"), /*#__PURE__*/React.createElement("div", {
    className: "relative group"
  }, /*#__PURE__*/React.createElement("button", {
    className: "px-3 py-2 text-xs xl:text-sm font-semibold uppercase tracking-wider text-gray-400 hover:text-white transition-colors duration-300 flex items-center space-x-1"
  }, /*#__PURE__*/React.createElement("span", null, "Course"), /*#__PURE__*/React.createElement("i", {
    "data-lucide": "chevron-down",
    className: "w-3.5 h-3.5 mt-0.5 group-hover:rotate-180 transition-transform duration-300"
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      backgroundColor: 'rgba(0, 0, 0, 0.001)'
    },
    className: "absolute top-7 left-1/2 -translate-x-1/2 w-64 pt-2 opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto transition-all duration-300 transform translate-y-1 group-hover:translate-y-0 z-50"
  }, /*#__PURE__*/React.createElement("div", {
    className: "dark-glass rounded-2xl p-3 flex flex-col space-y-1.5 shadow-[0_10px_30px_rgba(0,0,0,0.8)] border border-white/10"
  }, courseList.map(course => /*#__PURE__*/React.createElement("button", {
    key: course.id,
    onClick: () => openEnrollModal(course),
    className: "w-full px-4 py-2.5 rounded-xl text-left text-xs font-semibold text-gray-300 hover:bg-white/5 transition-all duration-300 flex items-center space-x-2 group/item"
  }, /*#__PURE__*/React.createElement("i", {
    "data-lucide": course.icon,
    className: "w-3.5 h-3.5 group-hover/item:scale-110 transition-transform duration-300",
    style: {
      color: course.colorCode
    }
  }), /*#__PURE__*/React.createElement("span", {
    className: "truncate group-hover/item:text-white transition-colors duration-300"
  }, course.title)))))), /*#__PURE__*/React.createElement("button", {
    onClick: () => navigateToSection('showcase'),
    className: "px-3 py-2 text-xs xl:text-sm font-semibold uppercase tracking-wider text-gray-400 hover:text-white transition-colors duration-300"
  }, "Showcase"), /*#__PURE__*/React.createElement("button", {
    onClick: openBlog,
    className: "px-3 py-2 text-xs xl:text-sm font-semibold uppercase tracking-wider text-gray-400 hover:text-white transition-colors duration-300"
  }, "Blog"), /*#__PURE__*/React.createElement("button", {
    onClick: () => navigateToSection('contact'),
    className: "px-3 py-2 text-xs xl:text-sm font-semibold uppercase tracking-wider text-gray-400 hover:text-white transition-colors duration-300"
  }, "Contact Us"), /*#__PURE__*/React.createElement("button", {
    onClick: () => navigateToSection('pricing-cta'),
    className: "px-5 py-2 rounded-full text-xs font-bold uppercase tracking-wider text-black bg-brand-cyan hover:bg-white hover:text-brand-cyan border border-brand-cyan transition-all duration-300 shadow-[0_0_20px_rgba(0,240,255,0.3)] hover:shadow-[0_0_30px_rgba(0,240,255,0.5)]"
  }, "Enroll Now")), /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-3"
  }, /*#__PURE__*/React.createElement("button", {
    onClick: () => setMobileMenuOpen(true),
    className: "lg:hidden flex items-center justify-center w-10 h-10 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 transition-all duration-300",
    "aria-label": "Open menu"
  }, /*#__PURE__*/React.createElement("svg", {
    width: "18",
    height: "14",
    viewBox: "0 0 18 14",
    fill: "none",
    xmlns: "http://www.w3.org/2000/svg"
  }, /*#__PURE__*/React.createElement("rect", {
    width: "18",
    height: "2",
    rx: "1",
    fill: "white"
  }), /*#__PURE__*/React.createElement("rect", {
    y: "6",
    width: "18",
    height: "2",
    rx: "1",
    fill: "white"
  }), /*#__PURE__*/React.createElement("rect", {
    y: "12",
    width: "18",
    height: "2",
    rx: "1",
    fill: "white"
  }))))))), /*#__PURE__*/React.createElement("div", {
    onClick: () => setMobileMenuOpen(false),
    className: "lg:hidden fixed inset-0 z-[998] bg-black/60 backdrop-blur-sm transition-all duration-300",
    style: {
      opacity: mobileMenuOpen ? 1 : 0,
      pointerEvents: mobileMenuOpen ? 'auto' : 'none'
    }
  }), /*#__PURE__*/React.createElement("div", {
    className: "lg:hidden fixed top-0 right-0 h-full w-[85vw] max-w-[320px] z-[999] flex flex-col",
    style: {
      background: 'linear-gradient(160deg, rgba(8,8,18,0.55) 0%, rgba(2,10,18,0.60) 100%)',
      borderLeft: '1px solid rgba(255,255,255,0.10)',
      backdropFilter: 'blur(40px) saturate(180%)',
      WebkitBackdropFilter: 'blur(40px) saturate(180%)',
      transform: mobileMenuOpen ? 'translateX(0%)' : 'translateX(100%)',
      transition: 'transform 0.38s cubic-bezier(0.4,0,0.2,1)',
      boxShadow: '-20px 0 80px rgba(0,0,0,0.5), inset 1px 0 0 rgba(255,255,255,0.06)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center justify-end px-5 pt-5 pb-4"
  }, /*#__PURE__*/React.createElement("button", {
    onClick: () => setMobileMenuOpen(false),
    className: "w-9 h-9 flex items-center justify-center rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition-all duration-300",
    "aria-label": "Close menu"
  }, /*#__PURE__*/React.createElement("svg", {
    width: "16",
    height: "16",
    viewBox: "0 0 16 16",
    fill: "none"
  }, /*#__PURE__*/React.createElement("path", {
    d: "M2 2l12 12M14 2L2 14",
    stroke: "currentColor",
    strokeWidth: "2",
    strokeLinecap: "round"
  })))), /*#__PURE__*/React.createElement("nav", {
    className: "flex flex-col flex-1 px-4 pt-4 space-y-1 overflow-y-auto pb-8"
  }, /*#__PURE__*/React.createElement("button", {
    onClick: () => {
      setMobileMenuOpen(false);
      if (window.goToHeroStart) window.goToHeroStart();else window.scrollTo({
        top: 0,
        behavior: 'smooth'
      });
    },
    className: "flex items-center gap-3 px-4 py-3.5 rounded-xl text-sm font-semibold uppercase tracking-wider text-gray-300 hover:text-white hover:bg-white/6 transition-all duration-300 text-left w-full"
  }, /*#__PURE__*/React.createElement("svg", {
    width: "16",
    height: "16",
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "2",
    strokeLinecap: "round",
    strokeLinejoin: "round"
  }, /*#__PURE__*/React.createElement("path", {
    d: "M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"
  }), /*#__PURE__*/React.createElement("polyline", {
    points: "9 22 9 12 15 12 15 22"
  })), "Home"), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("button", {
    onClick: () => setMobileCoursesOpen(o => !o),
    className: "flex items-center justify-between gap-3 px-4 py-3.5 rounded-xl text-sm font-semibold uppercase tracking-wider text-gray-300 hover:text-white hover:bg-white/6 transition-all duration-300 w-full"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-3"
  }, /*#__PURE__*/React.createElement("svg", {
    width: "16",
    height: "16",
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "2",
    strokeLinecap: "round",
    strokeLinejoin: "round"
  }, /*#__PURE__*/React.createElement("path", {
    d: "M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"
  })), "Courses"), /*#__PURE__*/React.createElement("svg", {
    width: "14",
    height: "14",
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "2.5",
    strokeLinecap: "round",
    strokeLinejoin: "round",
    style: {
      transform: mobileCoursesOpen ? 'rotate(180deg)' : 'rotate(0deg)',
      transition: 'transform 0.3s ease',
      flexShrink: 0
    }
  }, /*#__PURE__*/React.createElement("polyline", {
    points: "6 9 12 15 18 9"
  }))), /*#__PURE__*/React.createElement("div", {
    style: {
      maxHeight: mobileCoursesOpen ? '400px' : '0px',
      overflow: 'hidden',
      transition: 'max-height 0.35s cubic-bezier(0.4,0,0.2,1)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "pl-4 pr-2 pb-1 pt-1 flex flex-col space-y-0.5"
  }, courseList.map(course => /*#__PURE__*/React.createElement("button", {
    key: course.id,
    onClick: () => {
      setMobileMenuOpen(false);
      setMobileCoursesOpen(false);
      openEnrollModal(course);
    },
    className: "flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-semibold text-gray-400 hover:text-white hover:bg-white/5 transition-all duration-300 text-left w-full"
  }, /*#__PURE__*/React.createElement("i", {
    "data-lucide": course.icon,
    className: "w-3.5 h-3.5 flex-shrink-0",
    style: {
      color: course.colorCode
    }
  }), /*#__PURE__*/React.createElement("span", {
    className: "truncate"
  }, course.title)))))), /*#__PURE__*/React.createElement("button", {
    onClick: () => {
      setMobileMenuOpen(false);
      navigateToSection('why-ai-now');
    },
    className: "flex items-center gap-3 px-4 py-3.5 rounded-xl text-sm font-semibold uppercase tracking-wider text-gray-300 hover:text-white hover:bg-white/6 transition-all duration-300 text-left w-full"
  }, /*#__PURE__*/React.createElement("svg", {
    width: "16",
    height: "16",
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "2",
    strokeLinecap: "round",
    strokeLinejoin: "round"
  }, /*#__PURE__*/React.createElement("circle", {
    cx: "12",
    cy: "12",
    r: "10"
  }), /*#__PURE__*/React.createElement("line", {
    x1: "12",
    y1: "8",
    x2: "12",
    y2: "12"
  }), /*#__PURE__*/React.createElement("line", {
    x1: "12",
    y1: "16",
    x2: "12.01",
    y2: "16"
  })), "About Us"), /*#__PURE__*/React.createElement("button", {
    onClick: () => {
      setMobileMenuOpen(false);
      navigateToSection('showcase');
    },
    className: "flex items-center gap-3 px-4 py-3.5 rounded-xl text-sm font-semibold uppercase tracking-wider text-gray-300 hover:text-white hover:bg-white/6 transition-all duration-300 text-left w-full"
  }, /*#__PURE__*/React.createElement("svg", {
    width: "16",
    height: "16",
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "2",
    strokeLinecap: "round",
    strokeLinejoin: "round"
  }, /*#__PURE__*/React.createElement("rect", {
    x: "3",
    y: "3",
    width: "7",
    height: "7"
  }), /*#__PURE__*/React.createElement("rect", {
    x: "14",
    y: "3",
    width: "7",
    height: "7"
  }), /*#__PURE__*/React.createElement("rect", {
    x: "3",
    y: "14",
    width: "7",
    height: "7"
  }), /*#__PURE__*/React.createElement("rect", {
    x: "14",
    y: "14",
    width: "7",
    height: "7"
  })), "Showcase"), /*#__PURE__*/React.createElement("button", {
    onClick: () => {
      setMobileMenuOpen(false);
      openBlog();
    },
    className: "flex items-center gap-3 px-4 py-3.5 rounded-xl text-sm font-semibold uppercase tracking-wider text-gray-300 hover:text-white hover:bg-white/6 transition-all duration-300 text-left w-full"
  }, /*#__PURE__*/React.createElement("svg", {
    width: "16",
    height: "16",
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "2",
    strokeLinecap: "round",
    strokeLinejoin: "round"
  }, /*#__PURE__*/React.createElement("path", {
    d: "M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"
  }), /*#__PURE__*/React.createElement("polyline", {
    points: "22,6 12,13 2,6"
  })), "Blog"), /*#__PURE__*/React.createElement("button", {
    onClick: () => {
      setMobileMenuOpen(false);
      navigateToSection('footer');
    },
    className: "flex items-center gap-3 px-4 py-3.5 rounded-xl text-sm font-semibold uppercase tracking-wider text-gray-300 hover:text-white hover:bg-white/6 transition-all duration-300 text-left w-full"
  }, /*#__PURE__*/React.createElement("svg", {
    width: "16",
    height: "16",
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "2",
    strokeLinecap: "round",
    strokeLinejoin: "round"
  }, /*#__PURE__*/React.createElement("path", {
    d: "M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"
  }), /*#__PURE__*/React.createElement("polyline", {
    points: "22,6 12,13 2,6"
  })), "Contact"))), /*#__PURE__*/React.createElement(HeroSection, {
    handleGeneralEnroll: handleGeneralEnroll,
    navigateToSection: navigateToSection,
    enrollModal: enrollModal,
    theaterVideo: theaterVideo,
    isAdminOpen: isAdminOpen,
    showIosModal: showIosModal,
    isStudentOpen: isStudentOpen,
    mobileMenuOpen: mobileMenuOpen,
    isBlogOpen: isBlogOpen
  }), /*#__PURE__*/React.createElement("section", {
    id: "why-ai-now",
    className: "pt-12 pb-32 px-6 md:px-12 lg:px-24 relative z-10 border-t border-white/5 select-none bg-brand-bgDarker"
  }, /*#__PURE__*/React.createElement("div", {
    className: "max-w-7xl mx-auto w-full"
  }, /*#__PURE__*/React.createElement("div", {
    className: "max-w-2xl text-left mb-16 reveal-about-item"
  }, /*#__PURE__*/React.createElement("span", {
    className: "text-xs font-mono text-brand-cyan font-bold uppercase tracking-widest flex items-center mb-3"
  }, /*#__PURE__*/React.createElement("span", {
    className: "w-1.5 h-1.5 bg-brand-cyan rounded-full mr-2"
  }), "AI Courses Online"), /*#__PURE__*/React.createElement("h2", {
    className: "text-3xl md:text-5xl font-black uppercase text-white font-heading tracking-tight leading-none"
  }, "The AI Revolution Is Here. Will You Lead or Follow?")), /*#__PURE__*/React.createElement("div", {
    className: "grid grid-cols-1 lg:grid-cols-12 gap-16 items-center"
  }, /*#__PURE__*/React.createElement("div", {
    className: "lg:col-span-5 flex justify-center items-center relative z-10"
  }, /*#__PURE__*/React.createElement("div", {
    className: "absolute w-[250px] md:w-[350px] h-[250px] md:h-[350px] bg-brand-violet/5 filter blur-[80px] rounded-full pointer-events-none z-0"
  }), /*#__PURE__*/React.createElement("div", {
    className: "w-full relative flex justify-center items-center"
  }, /*#__PURE__*/React.createElement(About3DCanvas, null))), /*#__PURE__*/React.createElement("div", {
    className: "lg:col-span-7 flex flex-col text-left reveal-about-item"
  }, /*#__PURE__*/React.createElement("div", {
    className: "liquid-glass p-8 md:p-10 rounded-3xl text-left"
  }, /*#__PURE__*/React.createElement("p", {
    className: "text-gray-300 text-sm md:text-base leading-relaxed font-light mb-8"
  }, "Artificial intelligence is transforming every industry\u2014from design and marketing to filmmaking and web development. Companies across the globe are actively hiring professionals who can leverage AI tools to work faster, smarter, and more creatively than ever before."), /*#__PURE__*/React.createElement("p", {
    className: "text-gray-400 text-sm md:text-base leading-relaxed font-light mb-8"
  }, "Whether you are a student, freelancer, business owner, or creative professional, learning AI skills today gives you a significant advantage in tomorrow's job market. DXIGN Learn offers practical online AI courses designed to keep you ahead of the curve."), /*#__PURE__*/React.createElement("div", {
    className: "grid grid-cols-1 sm:grid-cols-2 gap-5 text-sm"
  }, ['AI Transforming Industries', 'High Demand for AI Skills', 'Future-Proof Your Career', 'Work 10x Faster', 'No Coding Required', 'Start Learning AI Today'].map((item, idx) => /*#__PURE__*/React.createElement("div", {
    key: idx,
    className: "flex items-center space-x-3 text-gray-300 font-semibold font-sans"
  }, /*#__PURE__*/React.createElement("div", {
    className: "w-5 h-5 rounded-full bg-brand-cyan/10 border border-brand-cyan/20 flex justify-center items-center text-brand-cyan flex-shrink-0"
  }, /*#__PURE__*/React.createElement("i", {
    "data-lucide": "check",
    className: "w-3.5 h-3.5"
  })), /*#__PURE__*/React.createElement("span", null, item))))))))), /*#__PURE__*/React.createElement("section", {
    id: "courses",
    className: "pt-12 pb-32 px-6 md:px-12 lg:px-24 relative z-10 border-t border-white/5 select-none bg-brand-bg"
  }, /*#__PURE__*/React.createElement("div", {
    className: "max-w-7xl mx-auto w-full"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex flex-col lg:flex-row lg:items-end justify-between gap-8 mb-16"
  }, /*#__PURE__*/React.createElement("div", {
    className: "max-w-xl text-left reveal-up"
  }, /*#__PURE__*/React.createElement("span", {
    className: "text-xs font-mono text-brand-cyan font-bold uppercase tracking-widest flex items-center mb-3"
  }, /*#__PURE__*/React.createElement("span", {
    className: "w-1.5 h-1.5 bg-brand-cyan rounded-full mr-2"
  }), "Online AI Courses"), /*#__PURE__*/React.createElement("h2", {
    className: "text-3xl md:text-5xl font-black uppercase text-white font-heading tracking-tight leading-none"
  }, "Explore Dxign.learn Programs")), /*#__PURE__*/React.createElement("div", {
    className: "flex flex-wrap items-center gap-4"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex bg-white/[0.02] border border-white/5 rounded-full p-1"
  }, [{
    id: 'all',
    label: 'All Programs'
  }, {
    id: 'creative',
    label: 'Creative AI'
  }, {
    id: 'business-tech',
    label: 'Business & Tech'
  }].map(tab => /*#__PURE__*/React.createElement("button", {
    key: tab.id,
    onClick: () => setCourseCategory(tab.id),
    className: `px-4 py-1.5 rounded-full text-[10px] font-mono uppercase tracking-wider transition-all duration-300 ${courseCategory === tab.id ? 'bg-white/10 text-white border border-white/10 shadow-[0_0_12px_rgba(255,255,255,0.05)]' : 'bg-transparent text-gray-500 border border-transparent hover:text-gray-300'}`
  }, tab.label))), /*#__PURE__*/React.createElement("div", {
    className: "flex bg-white/[0.02] border border-white/5 rounded-xl p-1"
  }, /*#__PURE__*/React.createElement("button", {
    onClick: () => setCourseView('grid'),
    className: `p-2 rounded-lg transition-all duration-300 ${courseView === 'grid' ? 'bg-white/10 text-white border border-white/10' : 'bg-transparent text-gray-500 border border-transparent hover:text-gray-300'}`,
    title: "Grid View"
  }, /*#__PURE__*/React.createElement("i", {
    "data-lucide": "layout-grid",
    className: "w-4 h-4"
  })), /*#__PURE__*/React.createElement("button", {
    onClick: () => setCourseView('list'),
    className: `p-2 rounded-lg transition-all duration-300 ${courseView === 'list' ? 'bg-white/10 text-white border border-white/10' : 'bg-transparent text-gray-500 border border-transparent hover:text-gray-300'}`,
    title: "List View"
  }, /*#__PURE__*/React.createElement("i", {
    "data-lucide": "list",
    className: "w-4 h-4"
  }))))), courseView === 'grid' ?
  /*#__PURE__*/
  /* Grid Layout */
  React.createElement("div", {
    className: "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 items-stretch"
  }, courseList.filter(c => courseCategory === 'all' || c.category === courseCategory).map(course => {
    const theme = colorThemes[course.colorName] || colorThemes.cyan;
    return /*#__PURE__*/React.createElement("div", {
      key: 'grid-' + course.id,
      id: `card-${course.id}`,
      style: {
        '--card-accent-gradient': theme.grad,
        '--card-glow-color-soft': theme.glow
      },
      className: "minimal-card rounded-3xl p-8 flex flex-col justify-between cursor-pointer group hover:-translate-y-1 h-full",
      onClick: () => openEnrollModal(course)
    }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
      className: "flex justify-between items-start mb-8"
    }, /*#__PURE__*/React.createElement("div", {
      className: `w-12 h-12 rounded-2xl border flex justify-center items-center ${theme.bgIcon} transition-all duration-500`
    }, /*#__PURE__*/React.createElement("i", {
      "data-lucide": course.icon,
      className: "w-5 h-5"
    })), /*#__PURE__*/React.createElement("div", {
      className: "flex flex-col items-end space-y-1"
    }, /*#__PURE__*/React.createElement("span", {
      className: "px-2.5 py-0.5 rounded-full bg-white/5 border border-white/5 text-[9px] font-mono text-gray-400 uppercase tracking-wider"
    }, course.badge), /*#__PURE__*/React.createElement("span", {
      className: "text-[9px] font-mono text-gray-500 flex items-center"
    }, /*#__PURE__*/React.createElement("i", {
      "data-lucide": "clock",
      className: "w-2.5 h-2.5 mr-1"
    }), course.duration))), /*#__PURE__*/React.createElement("div", {
      className: "text-left"
    }, /*#__PURE__*/React.createElement("h3", {
      className: "course-title-minimal text-xl font-heading font-black text-white uppercase tracking-tight mb-1"
    }, course.title), course.subtitle && /*#__PURE__*/React.createElement("p", {
      className: "text-[9px] font-mono text-gray-400 uppercase tracking-widest mb-3"
    }, course.subtitle), /*#__PURE__*/React.createElement("p", {
      className: "course-desc-minimal text-gray-400 text-xs md:text-sm leading-relaxed mt-4 font-light"
    }, course.description)), /*#__PURE__*/React.createElement("div", {
      className: "flex flex-wrap gap-1.5 mt-6"
    }, course.tools.map((tool, idx) => /*#__PURE__*/React.createElement("span", {
      key: idx,
      className: "tool-badge px-2 py-0.5 rounded text-[9px] font-mono text-gray-400"
    }, tool)))), /*#__PURE__*/React.createElement("div", {
      className: "mt-8 pt-5 border-t border-white/5 flex justify-between items-center"
    }, /*#__PURE__*/React.createElement("div", {
      className: "flex flex-col"
    }, /*#__PURE__*/React.createElement("div", {
      className: "flex items-baseline space-x-2"
    }, /*#__PURE__*/React.createElement("span", {
      className: "text-lg font-black text-white font-heading",
      style: {
        color: course.colorCode
      }
    }, course.price), /*#__PURE__*/React.createElement("span", {
      className: "text-[10px] font-mono text-gray-600 line-through"
    }, course.originalPrice)), /*#__PURE__*/React.createElement("span", {
      className: "text-[9px] font-mono uppercase tracking-wider",
      style: {
        color: course.colorCode,
        opacity: 0.75
      }
    }, course.discount)), /*#__PURE__*/React.createElement("div", {
      className: "flex items-center space-x-1.5 text-xs font-mono text-gray-500 group-hover:text-white transition-colors duration-300"
    }, /*#__PURE__*/React.createElement("span", null, "Enroll"), /*#__PURE__*/React.createElement("i", {
      "data-lucide": "arrow-up-right",
      className: "w-4 h-4 transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform duration-300"
    }))));
  })) :
  /*#__PURE__*/
  /* List Layout */
  React.createElement("div", {
    className: "flex flex-col space-y-4"
  }, courseList.filter(c => courseCategory === 'all' || c.category === courseCategory).map(course => {
    const theme = colorThemes[course.colorName] || colorThemes.cyan;
    return /*#__PURE__*/React.createElement("div", {
      key: 'list-' + course.id,
      id: `row-${course.id}`,
      style: {
        '--card-accent-gradient': theme.grad,
        '--card-glow-color-soft': theme.glow
      },
      className: "minimal-row rounded-2xl p-6 flex flex-col md:flex-row items-start md:items-center justify-between cursor-pointer group w-full",
      onClick: () => openEnrollModal(course)
    }, /*#__PURE__*/React.createElement("div", {
      className: "flex items-center space-x-6 w-full md:w-5/12 text-left"
    }, /*#__PURE__*/React.createElement("div", {
      className: `w-12 h-12 rounded-2xl border flex justify-center items-center flex-shrink-0 ${theme.bgIcon} transition-all duration-500`
    }, /*#__PURE__*/React.createElement("i", {
      "data-lucide": course.icon,
      className: "w-5 h-5"
    })), /*#__PURE__*/React.createElement("div", {
      className: "min-w-0 pr-4"
    }, /*#__PURE__*/React.createElement("h3", {
      className: "course-title-minimal text-lg font-heading font-black text-white uppercase tracking-tight"
    }, course.title), course.subtitle ? /*#__PURE__*/React.createElement("p", {
      className: "text-[9px] font-mono text-gray-400 uppercase tracking-widest mt-0.5"
    }, course.subtitle) : /*#__PURE__*/React.createElement("p", {
      className: "text-[9px] font-mono text-gray-500 uppercase tracking-wider mt-0.5"
    }, course.category === 'creative' ? 'Creative AI Track' : 'Business & Automation Track'))), /*#__PURE__*/React.createElement("div", {
      className: "w-full md:w-4/12 text-left my-4 md:my-0 pr-6"
    }, /*#__PURE__*/React.createElement("p", {
      className: "course-desc-minimal text-gray-400 text-xs md:text-sm leading-relaxed font-light"
    }, course.description), /*#__PURE__*/React.createElement("div", {
      className: "flex flex-wrap gap-1.5 mt-3"
    }, course.tools.map((tool, idx) => /*#__PURE__*/React.createElement("span", {
      key: idx,
      className: "tool-badge px-1.5 py-0.5 rounded text-[8px] font-mono text-gray-400"
    }, tool)))), /*#__PURE__*/React.createElement("div", {
      className: "flex items-center justify-between md:justify-end space-x-6 w-full md:w-3/12 border-t border-white/5 md:border-t-0 pt-4 md:pt-0"
    }, /*#__PURE__*/React.createElement("div", {
      className: "flex flex-col items-start md:items-end"
    }, /*#__PURE__*/React.createElement("div", {
      className: "flex items-baseline space-x-1.5"
    }, /*#__PURE__*/React.createElement("span", {
      className: "text-base font-black font-heading",
      style: {
        color: course.colorCode
      }
    }, course.price), /*#__PURE__*/React.createElement("span", {
      className: "text-[10px] font-mono text-gray-600 line-through"
    }, course.originalPrice)), /*#__PURE__*/React.createElement("span", {
      className: "text-[9px] font-mono uppercase tracking-wider",
      style: {
        color: course.colorCode,
        opacity: 0.7
      }
    }, course.discount)), /*#__PURE__*/React.createElement("div", {
      className: "flex flex-col items-start md:items-end space-y-1"
    }, /*#__PURE__*/React.createElement("span", {
      className: "px-2.5 py-0.5 rounded-full bg-white/5 border border-white/5 text-[9px] font-mono text-gray-400 uppercase tracking-wider"
    }, course.badge), /*#__PURE__*/React.createElement("span", {
      className: "text-[9px] font-mono text-gray-500 flex items-center"
    }, /*#__PURE__*/React.createElement("i", {
      "data-lucide": "clock",
      className: "w-2.5 h-2.5 mr-1"
    }), course.duration)), /*#__PURE__*/React.createElement("div", {
      className: "w-9 h-9 rounded-full bg-white/5 border border-white/5 flex justify-center items-center text-gray-500 group-hover:text-white group-hover:bg-white/10 transition-all duration-300 flex-shrink-0"
    }, /*#__PURE__*/React.createElement("i", {
      "data-lucide": "arrow-right",
      className: "w-4 h-4 transform group-hover:translate-x-0.5 transition-transform duration-300"
    }))));
  })))), /*#__PURE__*/React.createElement("section", {
    id: "popular-tools",
    className: "pt-12 pb-32 px-6 md:px-12 lg:px-24 relative z-10 border-t border-white/5 select-none bg-brand-bgDarker"
  }, /*#__PURE__*/React.createElement("div", {
    className: "max-w-7xl mx-auto w-full"
  }, /*#__PURE__*/React.createElement("div", {
    className: "text-center mb-16"
  }, /*#__PURE__*/React.createElement("span", {
    className: "text-xs font-mono text-brand-cyan font-bold uppercase tracking-widest flex items-center justify-center mb-3"
  }, /*#__PURE__*/React.createElement("span", {
    className: "w-1.5 h-1.5 bg-brand-cyan rounded-full mr-2"
  }), "AI Learning Tools"), /*#__PURE__*/React.createElement("h2", {
    className: "text-3xl md:text-5xl font-black uppercase text-white font-heading tracking-tight leading-none"
  }, "Master Industry-Leading AI Tools")), /*#__PURE__*/React.createElement("div", {
    className: "-mx-6 md:-mx-12 lg:-mx-24"
  }, /*#__PURE__*/React.createElement("div", {
    ref: marqueeEl,
    className: "flex gap-8",
    style: {
      width: 'fit-content',
      willChange: 'transform'
    }
  }, (() => {
    const tools = ['ChatGPT', 'Midjourney', 'Adobe Firefly', 'Figma AI', 'Claude AI', 'Runway ML', 'Kling AI', 'Canva AI', 'Gemini AI', 'Stitch', 'Higgsfield', 'Lovable', 'Google Flow', 'Antigravity'];
    const items = [...tools, ...tools];
    return items.map((tool, idx) => {
      const logoUrl = toolLogoMap[tool] || toolLogoMap[tool.replace(' AI', '')];
      return /*#__PURE__*/React.createElement("div", {
        key: idx,
        className: "group flex-shrink-0 cursor-pointer w-48 flex items-center justify-center"
      }, /*#__PURE__*/React.createElement("div", {
        className: "transition-all duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] hover:scale-110 flex items-center justify-center",
        style: {
          willChange: 'transform'
        }
      }, /*#__PURE__*/React.createElement("img", {
        src: logoUrl,
        alt: tool,
        className: "h-28 w-full object-contain transition-all duration-300 ease-out",
        style: {
          willChange: 'transform, opacity'
        }
      })));
    });
  })())))), /*#__PURE__*/React.createElement("section", {
    id: "showcase",
    className: "pt-12 pb-32 px-6 md:px-12 lg:px-24 relative z-10 border-t border-white/5 select-none bg-brand-bgDarker"
  }, /*#__PURE__*/React.createElement("div", {
    className: "max-w-7xl mx-auto w-full"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex flex-col md:flex-row justify-between items-start md:items-end gap-6 mb-16"
  }, /*#__PURE__*/React.createElement("div", {
    className: "text-left max-w-xl"
  }, /*#__PURE__*/React.createElement("span", {
    className: "text-xs font-mono text-brand-cyan font-bold uppercase tracking-widest flex items-center mb-3"
  }, /*#__PURE__*/React.createElement("span", {
    className: "w-1.5 h-1.5 bg-brand-cyan rounded-full mr-2"
  }), "AI Student Projects"), /*#__PURE__*/React.createElement("h2", {
    className: "text-3xl md:text-5xl font-black uppercase text-white font-heading tracking-tight leading-none"
  }, "Real Projects, Real Results")), /*#__PURE__*/React.createElement("div", {
    className: "flex flex-wrap gap-2.5"
  }, ['All', 'Graphic Design', 'Film Making', 'Content Creation'].map(cat => /*#__PURE__*/React.createElement("button", {
    key: cat,
    onClick: () => setShowcaseFilter(cat),
    className: `px-4 py-2 rounded-full text-xs font-bold uppercase tracking-wider transition-all duration-300 border ${showcaseFilter === cat ? 'bg-white text-black border-white shadow-[0_0_15px_rgba(255,255,255,0.2)]' : 'bg-white/5 text-gray-400 border-white/5 hover:text-white hover:bg-white/10'}`
  }, cat)))), /*#__PURE__*/React.createElement("div", {
    className: "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 items-stretch transition-all duration-500"
  }, (showAllProjects ? filteredShowcase : filteredShowcase.slice(0, 6)).map((proj, idx) => /*#__PURE__*/React.createElement(StudentProjectCard, {
    key: idx,
    proj: proj,
    onOpenTheater: () => {
      setTheaterVideo(proj);
      setCarouselIndex(0);
    }
  }))), filteredShowcase.length > 6 && /*#__PURE__*/React.createElement("div", {
    className: "flex justify-center mt-16"
  }, /*#__PURE__*/React.createElement("button", {
    onClick: () => setShowAllProjects(!showAllProjects),
    className: "px-8 py-4 rounded-xl liquid-glass text-white font-bold uppercase tracking-wider text-xs hover:border-white/20 transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] flex items-center space-x-2"
  }, /*#__PURE__*/React.createElement("span", null, showAllProjects ? 'Show Less' : 'View All Projects'), /*#__PURE__*/React.createElement("i", {
    "data-lucide": showAllProjects ? 'chevron-up' : 'chevron-down',
    className: "w-4 h-4"
  }))))), /*#__PURE__*/React.createElement("section", {
    id: "testimonials",
    className: "pt-12 pb-32 px-6 md:px-12 lg:px-24 relative z-10 border-t border-white/5 select-none bg-brand-bgDarker"
  }, /*#__PURE__*/React.createElement("div", {
    className: "max-w-5xl mx-auto w-full"
  }, /*#__PURE__*/React.createElement("div", {
    className: "text-center mb-16 flex flex-col items-center"
  }, /*#__PURE__*/React.createElement("span", {
    className: "text-xs font-mono text-brand-cyan font-bold uppercase tracking-widest flex items-center mb-3"
  }, /*#__PURE__*/React.createElement("span", {
    className: "w-1.5 h-1.5 bg-brand-cyan rounded-full mr-2"
  }), "AI Course Reviews"), /*#__PURE__*/React.createElement("h2", {
    className: "text-3xl md:text-5xl font-black uppercase text-white font-heading tracking-tight leading-none"
  }, "What Our Students Say")), /*#__PURE__*/React.createElement("div", {
    className: "liquid-glass p-8 md:p-12 rounded-3xl relative overflow-hidden flex flex-col justify-between min-h-[300px]"
  }, /*#__PURE__*/React.createElement("i", {
    "data-lucide": "quote",
    className: "absolute top-6 right-8 w-24 h-24 text-white/[0.02] pointer-events-none"
  }), /*#__PURE__*/React.createElement("div", {
    className: "text-left relative z-10 flex-grow flex flex-col justify-center"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex space-x-1.5 mb-6"
  }, [...Array(studentTestimonials[activeTestimonial].rating)].map((_, sIdx) => /*#__PURE__*/React.createElement("i", {
    key: sIdx,
    "data-lucide": "star",
    className: "w-4 h-4 fill-amber-400 text-amber-400"
  }))), /*#__PURE__*/React.createElement("p", {
    className: "text-gray-200 text-sm md:text-lg lg:text-xl font-light italic leading-relaxed mb-8"
  }, "\"", studentTestimonials[activeTestimonial].review, "\"")), /*#__PURE__*/React.createElement("div", {
    className: "relative z-10 pt-6 border-t border-white/5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center space-x-4"
  }, /*#__PURE__*/React.createElement("img", {
    src: studentTestimonials[activeTestimonial].avatar,
    alt: studentTestimonials[activeTestimonial].name,
    className: "w-11 h-11 rounded-full object-cover border border-white/15"
  }), /*#__PURE__*/React.createElement("div", {
    className: "text-left"
  }, /*#__PURE__*/React.createElement("span", {
    className: "font-heading font-black text-white text-sm block uppercase tracking-tight"
  }, studentTestimonials[activeTestimonial].name), /*#__PURE__*/React.createElement("span", {
    className: "text-[10px] font-mono text-gray-500 uppercase mt-0.5 block"
  }, studentTestimonials[activeTestimonial].role, " \xB7 ", /*#__PURE__*/React.createElement("span", {
    className: "text-brand-cyan font-bold"
  }, studentTestimonials[activeTestimonial].project)))), /*#__PURE__*/React.createElement("div", {
    className: "flex space-x-2"
  }, /*#__PURE__*/React.createElement("button", {
    onClick: () => setActiveTestimonial(prev => prev === 0 ? studentTestimonials.length - 1 : prev - 1),
    className: "w-9 h-9 rounded-full bg-white/5 hover:bg-white/10 flex justify-center items-center text-white border border-white/5 transition-all duration-300"
  }, /*#__PURE__*/React.createElement("i", {
    "data-lucide": "chevron-left",
    className: "w-4 h-4"
  })), /*#__PURE__*/React.createElement("button", {
    onClick: () => setActiveTestimonial(prev => prev === studentTestimonials.length - 1 ? 0 : prev + 1),
    className: "w-9 h-9 rounded-full bg-white/5 hover:bg-white/10 flex justify-center items-center text-white border border-white/5 transition-all duration-300"
  }, /*#__PURE__*/React.createElement("i", {
    "data-lucide": "chevron-right",
    className: "w-4 h-4"
  }))))))), /*#__PURE__*/React.createElement("section", {
    id: "why-choose",
    className: "pt-12 pb-32 px-6 md:px-12 lg:px-24 relative z-10 border-t border-white/5 select-none bg-brand-bg"
  }, /*#__PURE__*/React.createElement("div", {
    className: "max-w-7xl mx-auto w-full"
  }, /*#__PURE__*/React.createElement("div", {
    className: "max-w-xl text-left mb-16"
  }, /*#__PURE__*/React.createElement("span", {
    className: "text-xs font-mono text-brand-cyan font-bold uppercase tracking-widest flex items-center mb-3"
  }, /*#__PURE__*/React.createElement("span", {
    className: "w-1.5 h-1.5 bg-brand-cyan rounded-full mr-2"
  }), "Why Learn AI With Us"), /*#__PURE__*/React.createElement("h2", {
    className: "text-3xl md:text-5xl font-black uppercase text-white font-heading tracking-tight leading-none"
  }, "Learn Smarter, Build Faster")), /*#__PURE__*/React.createElement("div", {
    className: "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8"
  }, whyChooseUsData.map((item, idx) => /*#__PURE__*/React.createElement("div", {
    key: idx,
    className: "liquid-glass rounded-3xl p-8 text-left hover:border-white/15 transition-all duration-300"
  }, /*#__PURE__*/React.createElement("div", {
    className: "w-10 h-10 rounded-xl bg-white/5 flex justify-center items-center text-brand-cyan mb-6"
  }, /*#__PURE__*/React.createElement("i", {
    "data-lucide": "shield-check",
    className: "w-5 h-5"
  })), /*#__PURE__*/React.createElement("h3", {
    className: "text-lg font-heading font-black text-white uppercase tracking-tight mb-3"
  }, item.title), /*#__PURE__*/React.createElement("p", {
    className: "text-gray-400 text-xs md:text-sm leading-relaxed font-light"
  }, item.desc)))))), /*#__PURE__*/React.createElement("section", {
    id: "timeline",
    className: "pt-12 pb-32 px-6 md:px-12 lg:px-24 relative z-10 border-t border-white/5 select-none bg-brand-bg"
  }, /*#__PURE__*/React.createElement("div", {
    className: "max-w-7xl mx-auto w-full"
  }, /*#__PURE__*/React.createElement("div", {
    className: "max-w-xl text-left mb-20"
  }, /*#__PURE__*/React.createElement("span", {
    className: "text-xs font-mono text-brand-cyan font-bold uppercase tracking-widest flex items-center mb-3"
  }, /*#__PURE__*/React.createElement("span", {
    className: "w-1.5 h-1.5 bg-brand-cyan rounded-full mr-2"
  }), "How AI Courses Work"), /*#__PURE__*/React.createElement("h2", {
    className: "text-3xl md:text-5xl font-black uppercase text-white font-heading tracking-tight leading-none"
  }, "Learning Journey")), /*#__PURE__*/React.createElement("div", {
    className: "relative"
  }, /*#__PURE__*/React.createElement("div", {
    className: "grid grid-cols-1 lg:grid-cols-5 gap-12 lg:gap-8 relative z-10"
  }, journeyTimeline.map((item, idx) => /*#__PURE__*/React.createElement("div", {
    key: idx,
    className: "reveal-timeline-node flex flex-row lg:flex-col items-start lg:items-center text-left lg:text-center group"
  }, /*#__PURE__*/React.createElement("div", {
    className: "w-12 h-12 rounded-full bg-slate-950 border-2 border-brand-cyan flex justify-center items-center text-brand-cyan font-mono font-bold text-sm shadow-[0_0_15px_rgba(0,240,255,0.4)] group-hover:scale-110 group-hover:border-brand-violet group-hover:text-brand-violet transition-all duration-300 flex-shrink-0 mr-6 lg:mr-0 lg:mb-6 z-10"
  }, "0", idx + 1), /*#__PURE__*/React.createElement("div", {
    className: "flex flex-col"
  }, /*#__PURE__*/React.createElement("span", {
    className: "text-[10px] font-mono text-brand-cyan group-hover:text-brand-violet transition-colors duration-300 uppercase tracking-widest mb-1.5 font-bold"
  }, item.step), /*#__PURE__*/React.createElement("h3", {
    className: "text-base font-heading font-black text-white uppercase tracking-tight mb-2"
  }, item.title), /*#__PURE__*/React.createElement("p", {
    className: "text-gray-400 text-xs leading-relaxed font-light max-w-[200px]"
  }, item.desc)))))))), /*#__PURE__*/React.createElement("section", {
    id: "pricing-cta",
    className: "relative pt-4 pb-4 px-6 md:px-12 lg:px-24 border-t border-white/5 select-none bg-brand-bg flex items-center justify-center min-h-[calc(100vh-85px)]"
  }, /*#__PURE__*/React.createElement(Cta3DCanvas, null), /*#__PURE__*/React.createElement("div", {
    className: "absolute w-[300px] md:w-[500px] h-[300px] md:h-[500px] bg-brand-cyan/10 filter blur-[100px] rounded-full pointer-events-none z-0"
  }), /*#__PURE__*/React.createElement("div", {
    className: "max-w-4xl mx-auto w-full relative z-10 flex flex-col items-center justify-center text-center"
  }, /*#__PURE__*/React.createElement("span", {
    className: "text-xs font-mono text-brand-cyan font-bold uppercase tracking-widest flex items-center mb-2 bg-brand-cyan/10 border border-brand-cyan/20 px-3.5 py-1.5 rounded-full"
  }, /*#__PURE__*/React.createElement("span", {
    className: "w-1.5 h-1.5 bg-brand-cyan rounded-full mr-2 animate-pulse"
  }), "Limited Offer \xB7 Lifetime Access"), /*#__PURE__*/React.createElement("h2", {
    className: "text-4xl md:text-6xl font-black uppercase tracking-tight text-white leading-none font-heading mb-3 max-w-2xl text-white-glow"
  }, "Ready to Master AI and Build Your Future?"), /*#__PURE__*/React.createElement("p", {
    className: "text-gray-400 text-sm md:text-base leading-relaxed max-w-xl mb-4 font-light"
  }, "Join the next generation of creators, entrepreneurs, and professionals using AI to achieve exceptional results. Get complete lifetime access to all current and future AI course modules at a one-time price."), /*#__PURE__*/React.createElement("div", {
    className: "liquid-glass py-3.5 px-6 md:py-4 md:px-8 rounded-3xl flex flex-col md:flex-row items-center justify-between gap-4 md:gap-8 max-w-xl w-full mb-5 border border-brand-cyan/20"
  }, /*#__PURE__*/React.createElement("div", {
    className: "text-left"
  }, /*#__PURE__*/React.createElement("h3", {
    className: "text-lg font-heading font-black text-white uppercase tracking-tight"
  }, "Dxign.learn Lifetime Access"), /*#__PURE__*/React.createElement("p", {
    className: "text-xs text-gray-500 mt-1"
  }, "One-time payment. All updates included.")), /*#__PURE__*/React.createElement("div", {
    className: "flex items-baseline space-x-3.5"
  }, /*#__PURE__*/React.createElement("span", {
    className: "text-4xl font-black text-white font-heading tracking-tight"
  }, "\u20B94,000"), /*#__PURE__*/React.createElement("span", {
    className: "text-base text-gray-500 line-through font-medium"
  }, "\u20B924,999"), /*#__PURE__*/React.createElement("span", {
    className: "text-[10px] font-mono text-brand-cyan bg-brand-cyan/10 border border-brand-cyan/20 px-2 py-0.5 rounded uppercase font-bold"
  }, "84% Off"))), /*#__PURE__*/React.createElement("div", {
    className: "flex flex-col sm:flex-row gap-4 w-full justify-center max-w-md"
  }, /*#__PURE__*/React.createElement("button", {
    onClick: handleGeneralEnroll,
    className: "px-8 py-3 rounded-xl bg-gradient-to-r from-brand-cyan to-brand-blue hover:from-brand-blue hover:to-brand-violet text-white font-bold uppercase tracking-wider text-xs text-center transition-all duration-500 shadow-[0_0_20px_rgba(0,240,255,0.2)] hover:shadow-[0_0_35px_rgba(0,240,255,0.45)] hover:scale-[1.02] flex-grow"
  }, "Enroll Now"), /*#__PURE__*/React.createElement("a", {
    href: "mailto:dxignlearn@gmail.com?subject=General%20Inquiry",
    className: "px-8 py-3 rounded-xl liquid-glass text-white font-bold uppercase tracking-wider text-xs text-center hover:border-white/20 transition-all duration-300 flex-grow"
  }, "Contact Us")))), /*#__PURE__*/React.createElement("section", {
    id: "faq",
    className: "pt-12 pb-32 px-6 md:px-12 lg:px-24 relative z-10 border-t border-white/5 select-none bg-brand-bg"
  }, /*#__PURE__*/React.createElement("div", {
    className: "max-w-3xl mx-auto w-full"
  }, /*#__PURE__*/React.createElement("div", {
    className: "text-center mb-16"
  }, /*#__PURE__*/React.createElement("span", {
    className: "text-xs font-mono text-brand-cyan font-bold uppercase tracking-widest flex items-center justify-center mb-3"
  }, /*#__PURE__*/React.createElement("span", {
    className: "w-1.5 h-1.5 bg-brand-cyan rounded-full mr-2"
  }), "AI FAQs"), /*#__PURE__*/React.createElement("h2", {
    className: "text-3xl md:text-5xl font-black uppercase text-white font-heading tracking-tight leading-none"
  }, "Frequently Asked Questions")), /*#__PURE__*/React.createElement("div", {
    className: "flex flex-col space-y-3"
  }, [{
    q: 'Do I need prior experience to learn AI?',
    a: 'No, all courses are designed for beginners. We start with fundamental concepts and gradually build up to advanced techniques.'
  }, {
    q: 'How long do I access the course materials?',
    a: 'You receive lifetime access to all course materials, including every future update and new module.'
  }, {
    q: 'Will I get a certificate after completing a course?',
    a: 'Yes, you will receive a certificate of completion for each AI course you finish.'
  }, {
    q: 'Can I learn AI at my own pace?',
    a: 'Absolutely. All lessons are pre-recorded so you can learn whenever and wherever works best for your schedule.'
  }, {
    q: 'What kind of AI projects will I build?',
    a: 'You will create real-world portfolio projects including logos, brand identities, AI-generated videos, websites, and UI designs.'
  }, {
    q: 'Is there a money-back guarantee?',
    a: 'Yes, we offer a 7-day money-back guarantee if you are not satisfied with the course content.'
  }].map((faq, idx) => {
    const open = faqOpenStates[idx] || false;
    return /*#__PURE__*/React.createElement("div", {
      key: idx,
      className: "liquid-glass rounded-2xl overflow-hidden"
    }, /*#__PURE__*/React.createElement("button", {
      onClick: () => setFaqOpenStates(prev => ({
        ...prev,
        [idx]: !prev[idx]
      })),
      className: "w-full flex justify-between items-center p-5 text-left text-white font-bold font-heading uppercase tracking-tight text-sm hover:bg-white/[0.02] transition-all duration-300"
    }, /*#__PURE__*/React.createElement("span", null, faq.q), /*#__PURE__*/React.createElement("i", {
      "data-lucide": open ? 'chevron-up' : 'chevron-down',
      className: "w-4 h-4 text-gray-500 flex-shrink-0 transition-transform duration-300"
    })), open && /*#__PURE__*/React.createElement("div", {
      className: "px-5 pb-5 text-gray-400 text-xs leading-relaxed font-light"
    }, faq.a));
  })))), /*#__PURE__*/React.createElement("section", {
    id: "final-cta",
    className: "pt-24 pb-32 px-6 md:px-12 lg:px-24 relative z-10 border-t border-white/5 select-none bg-brand-bgDarker overflow-hidden"
  }, /*#__PURE__*/React.createElement("div", {
    className: "absolute top-1/2 left-1/4 -translate-y-1/2 w-[400px] h-[400px] bg-brand-cyan/5 filter blur-[100px] rounded-full pointer-events-none"
  }), /*#__PURE__*/React.createElement("div", {
    className: "absolute top-1/3 right-1/4 -translate-y-1/2 w-[300px] h-[300px] bg-brand-violet/5 filter blur-[100px] rounded-full pointer-events-none"
  }), /*#__PURE__*/React.createElement("div", {
    className: "max-w-6xl mx-auto w-full relative z-10 grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center"
  }, /*#__PURE__*/React.createElement("div", {
    className: "text-left"
  }, /*#__PURE__*/React.createElement("span", {
    className: "text-xs font-mono text-brand-cyan font-bold uppercase tracking-widest flex items-center mb-4"
  }, /*#__PURE__*/React.createElement("span", {
    className: "w-1.5 h-1.5 bg-brand-cyan rounded-full mr-2 animate-pulse"
  }), "AI Mentor Support"), /*#__PURE__*/React.createElement("h2", {
    className: "text-4xl md:text-5xl font-black uppercase text-white font-heading tracking-tight leading-none mb-6"
  }, "Clear Doubts ", /*#__PURE__*/React.createElement("span", {
    className: "text-brand-cyan"
  }, "Instantly")), /*#__PURE__*/React.createElement("p", {
    className: "text-gray-400 text-sm md:text-base leading-relaxed max-w-md mb-8 font-light"
  }, "Stuck on a concept while learning AI online? Get real-time help from expert mentors the moment you need it. No waiting, no emails\u2014just instant answers when you need them most."), /*#__PURE__*/React.createElement("div", {
    className: "flex flex-col sm:flex-row items-start gap-4"
  }, /*#__PURE__*/React.createElement("button", {
    onClick: handleGeneralEnroll,
    className: "px-10 py-4 rounded-2xl bg-gradient-to-r from-brand-cyan to-brand-blue hover:from-brand-blue hover:to-brand-violet text-white font-bold uppercase tracking-wider text-xs text-center transition-all duration-500 shadow-[0_0_20px_rgba(0,240,255,0.15)] hover:shadow-[0_0_35px_rgba(0,240,255,0.45)] hover:scale-[1.02]"
  }, "Enroll & Get Live Support \u2014 \u20B95"), /*#__PURE__*/React.createElement("a", {
    href: "mailto:dxignlearn@gmail.com",
    className: "px-10 py-4 rounded-2xl liquid-glass text-white font-bold uppercase tracking-wider text-xs text-center hover:border-white/20 transition-all duration-300"
  }, "Talk to a Mentor")), /*#__PURE__*/React.createElement("p", {
    className: "text-gray-600 text-[10px] font-mono mt-6"
  }, "Limited launch offer \xB7 Lifetime access \xB7 7-day money-back guarantee")), /*#__PURE__*/React.createElement("div", {
    className: "relative w-full max-w-lg mx-auto lg:mx-0"
  }, /*#__PURE__*/React.createElement("div", {
    id: "demo-device-frame",
    className: "bg-[#0d0d12] rounded-3xl border border-white/[0.08] overflow-hidden shadow-2xl shadow-brand-cyan/5 relative"
  }, /*#__PURE__*/React.createElement("div", {
    id: "demo-spotlight",
    className: "pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-500",
    style: {
      background: 'radial-gradient(circle at var(--sx, 50%) var(--sy, 50%), rgba(0, 255, 255, 0.15) 0%, rgba(0, 255, 255, 0.05) 40%, transparent 70%)'
    }
  }), /*#__PURE__*/React.createElement("div", {
    className: "relative z-[1]"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center justify-center px-5 pt-5 pb-3"
  }, /*#__PURE__*/React.createElement("div", {
    className: "inline-flex items-center gap-1 bg-white/[0.04] border border-white/[0.06] rounded-full p-1"
  }, /*#__PURE__*/React.createElement("button", {
    id: "demo-tab-video",
    className: "px-5 py-2 rounded-full text-[11px] font-bold bg-brand-cyan text-black tracking-wide cursor-default transition-all duration-700 ease-out"
  }, /*#__PURE__*/React.createElement("svg", {
    xmlns: "http://www.w3.org/2000/svg",
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "2.5",
    strokeLinecap: "round",
    strokeLinejoin: "round",
    className: "w-3.5 h-3.5 inline-block mr-1.5 -mt-0.5"
  }, /*#__PURE__*/React.createElement("polygon", {
    points: "23 7 16 12 23 17 23 7"
  }), /*#__PURE__*/React.createElement("rect", {
    x: "1",
    y: "5",
    width: "15",
    height: "14",
    rx: "2",
    ry: "2"
  })), "Video"), /*#__PURE__*/React.createElement("button", {
    id: "demo-tab-chat",
    className: "px-5 py-2 rounded-full text-[11px] font-bold text-gray-500 transition-all duration-700 ease-out cursor-default"
  }, /*#__PURE__*/React.createElement("svg", {
    xmlns: "http://www.w3.org/2000/svg",
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "2.5",
    strokeLinecap: "round",
    strokeLinejoin: "round",
    className: "w-3.5 h-3.5 inline-block mr-1.5 -mt-0.5"
  }, /*#__PURE__*/React.createElement("path", {
    d: "M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"
  })), "Chat"))), /*#__PURE__*/React.createElement("div", {
    className: "relative mx-5 mb-3 rounded-2xl overflow-hidden bg-black aspect-video flex items-center justify-center cursor-default"
  }, /*#__PURE__*/React.createElement("video", {
    id: "demo-video",
    autoPlay: true,
    muted: true,
    loop: true,
    playsInline: true,
    disablePictureInPicture: true,
    controlsList: "nodownload nofullscreen noremoteplayback",
    className: "absolute inset-0 w-full h-full object-cover pointer-events-none",
    style: {
      WebkitMediaControls: 'none'
    }
  }, /*#__PURE__*/React.createElement("source", {
    src: "../public/Images/videos/motion/Screen%20Recording%202026-06-12%20022336.mp4",
    type: "video/mp4"
  })), /*#__PURE__*/React.createElement("div", {
    className: "absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent z-10 pointer-events-none"
  }), /*#__PURE__*/React.createElement("span", {
    className: "absolute top-3 right-3 z-30 px-2 py-0.5 rounded-md bg-black/60 text-[9px] font-mono text-gray-400 border border-white/5"
  }, "Demo"), /*#__PURE__*/React.createElement("div", {
    id: "demo-chat-popup",
    className: "absolute bottom-0 left-0 right-0 bg-[#0d0d12]/95 backdrop-blur-md border-t border-white/[0.08] rounded-b-2xl overflow-hidden opacity-0 translate-y-4 pointer-events-none transition-all duration-500 z-50"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center justify-between px-4 py-2.5 border-b border-white/[0.06]"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-2"
  }, /*#__PURE__*/React.createElement("div", {
    className: "w-6 h-6 rounded-full bg-brand-cyan/20 border border-brand-cyan/30 flex items-center justify-center text-[9px] font-bold text-brand-cyan"
  }, "M"), /*#__PURE__*/React.createElement("span", {
    className: "text-[11px] font-bold text-white"
  }, "Mentor Support"), /*#__PURE__*/React.createElement("span", {
    className: "w-1.5 h-1.5 rounded-full bg-brand-emerald animate-pulse"
  })), /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-2"
  }, /*#__PURE__*/React.createElement("span", {
    className: "text-[9px] text-gray-600 font-mono"
  }, "Active"), /*#__PURE__*/React.createElement("button", {
    id: "demo-chat-close",
    className: "w-5 h-5 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-gray-500 hover:text-white transition-all duration-200 cursor-pointer active:scale-90",
    onClick: () => {
      const popup = document.getElementById('demo-chat-popup');
      const video = document.getElementById('demo-video');
      if (popup) popup.classList.add('opacity-0', 'translate-y-4', 'pointer-events-none');
      if (video && video.paused) video.play();
      // Switch tab back to video
      const videoBtn = document.getElementById('demo-tab-video');
      const chatBtn = document.getElementById('demo-tab-chat');
      if (videoBtn) {
        videoBtn.classList.remove('text-gray-500');
        videoBtn.classList.add('bg-brand-cyan', 'text-black');
      }
      if (chatBtn) {
        chatBtn.classList.remove('bg-brand-cyan', 'text-black');
        chatBtn.classList.add('text-gray-500');
      }
      // Cancel ongoing cycle so it doesn't clear messages
      if (window.typingTimeout) clearTimeout(window.typingTimeout);
      if (window.cycleTimeout) clearTimeout(window.cycleTimeout);
      // Pop animation
      const btn = document.getElementById('demo-chat-close');
      if (btn) {
        btn.style.transform = 'scale(0.85)';
        setTimeout(() => {
          btn.style.transform = '';
        }, 200);
      }
    }
  }, /*#__PURE__*/React.createElement("svg", {
    xmlns: "http://www.w3.org/2000/svg",
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "2.5",
    strokeLinecap: "round",
    strokeLinejoin: "round",
    className: "w-3 h-3"
  }, /*#__PURE__*/React.createElement("line", {
    x1: "18",
    y1: "6",
    x2: "6",
    y2: "18"
  }), /*#__PURE__*/React.createElement("line", {
    x1: "6",
    y1: "6",
    x2: "18",
    y2: "18"
  }))))), /*#__PURE__*/React.createElement("div", {
    className: "px-4 py-2.5 space-y-2 min-h-[100px] max-h-[140px] overflow-y-auto"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-start gap-2 justify-end"
  }, /*#__PURE__*/React.createElement("div", {
    className: "bg-brand-cyan/10 rounded-2xl rounded-tr-sm px-3 py-2 max-w-[85%]"
  }, /*#__PURE__*/React.createElement("p", {
    className: "text-[11px] text-white leading-relaxed",
    id: "demo-typing-text"
  }, /*#__PURE__*/React.createElement("span", {
    className: "inline-block animate-pulse"
  }, "\u258A"))), /*#__PURE__*/React.createElement("div", {
    className: "w-5 h-5 rounded-full bg-brand-violet/20 border border-brand-violet/30 flex items-center justify-center text-[7px] font-bold text-brand-violet shrink-0 mt-0.5"
  }, "S")), /*#__PURE__*/React.createElement("div", {
    id: "demo-mentor-reply",
    className: "flex items-start gap-2 opacity-0 translate-y-2 transition-all duration-700 ease-out"
  }, /*#__PURE__*/React.createElement("div", {
    className: "w-5 h-5 rounded-full bg-brand-cyan/20 border border-brand-cyan/30 flex items-center justify-center text-[7px] font-bold text-brand-cyan shrink-0 mt-0.5"
  }, "M"), /*#__PURE__*/React.createElement("div", {
    className: "bg-white/[0.04] rounded-2xl rounded-tl-sm px-3 py-2 max-w-[85%]"
  }, /*#__PURE__*/React.createElement("p", {
    className: "text-[11px] text-gray-300 leading-relaxed",
    id: "demo-mentor-text"
  })))), /*#__PURE__*/React.createElement("div", {
    className: "px-4 py-2.5 border-t border-white/[0.06] flex items-center gap-2"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex-1 bg-white/[0.03] rounded-xl border border-white/[0.06] px-3 py-1.5"
  }, /*#__PURE__*/React.createElement("input", {
    type: "text",
    placeholder: "Type your doubt...",
    readOnly: true,
    className: "w-full bg-transparent text-white text-[11px] placeholder-gray-600 cursor-default"
  })), /*#__PURE__*/React.createElement("div", {
    className: "w-8 h-8 rounded-xl bg-brand-cyan flex items-center justify-center text-black shrink-0 cursor-default"
  }, /*#__PURE__*/React.createElement("svg", {
    xmlns: "http://www.w3.org/2000/svg",
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "2",
    strokeLinecap: "round",
    strokeLinejoin: "round",
    className: "w-3.5 h-3.5"
  }, /*#__PURE__*/React.createElement("line", {
    x1: "22",
    y1: "2",
    x2: "11",
    y2: "13"
  }), /*#__PURE__*/React.createElement("polygon", {
    points: "22 2 15 22 11 13 2 9 22 2"
  })))))), /*#__PURE__*/React.createElement("div", {
    className: "flex items-center justify-between px-5 pb-4"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-2.5"
  }, /*#__PURE__*/React.createElement("span", {
    className: "w-1.5 h-1.5 rounded-full bg-brand-emerald animate-pulse"
  }), /*#__PURE__*/React.createElement("span", {
    className: "text-[10px] font-mono text-gray-500 tracking-wide"
  }, "Mentor Online")), /*#__PURE__*/React.createElement("span", {
    className: "text-[10px] font-mono text-gray-600"
  }, "24/7 Support Active"))))))), /*#__PURE__*/React.createElement("section", {
    id: "contact",
    className: "bg-brand-bgDarker text-gray-300 py-16 px-6 md:px-12 lg:px-24 border-t border-white/5 z-20 select-none relative"
  }, /*#__PURE__*/React.createElement("div", {
    className: "max-w-7xl mx-auto"
  }, /*#__PURE__*/React.createElement("div", {
    className: "text-center mb-10"
  }, /*#__PURE__*/React.createElement("span", {
    className: "text-xs font-mono text-brand-cyan uppercase tracking-[0.2em] font-bold"
  }, "Contact Us"), /*#__PURE__*/React.createElement("h2", {
    className: "text-2xl md:text-3xl font-semibold text-white mt-3"
  }, "Start Your AI Learning Journey"), /*#__PURE__*/React.createElement("p", {
    className: "text-sm text-gray-500 mt-2 max-w-xl mx-auto"
  }, "Have questions about our AI courses? Reach out and we will help you find the right program for your goals.")), (() => {
    const [formData, setFormData] = React.useState({
      name: '',
      email: '',
      phone: '',
      city: '',
      course: ''
    });
    const [submitted, setSubmitted] = React.useState(false);
    const [loading, setLoading] = React.useState(false);
    const [error, setError] = React.useState('');
    const handleChange = field => e => {
      setFormData(prev => ({
        ...prev,
        [field]: e.target.value
      }));
    };
    const handleSubmit = async e => {
      e.preventDefault();
      setError('');
      if (!formData.name.trim() || !formData.email.trim() || !formData.phone.trim()) {
        setError('Please complete all required fields.');
        return;
      }
      setLoading(true);
      try {
        const formBody = new URLSearchParams();
        formBody.append('entry.1506871634', formData.name);
        formBody.append('entry.147453066', formData.email);
        formBody.append('entry.444412975', formData.phone);
        formBody.append('entry.1576637996', formData.city);
        formBody.append('entry.1405274902', formData.course);
        formBody.append('fvv', '1');
        formBody.append('draftResponse', '[]');
        formBody.append('pageHistory', '0');
        formBody.append('fbzx', '0');
        await fetch('https://docs.google.com/forms/d/e/1FAIpQLSeae3frdxJ-QvaA74bNos-UwgiOmx8z8tJPpRU8b3PPXwU_6Q/formResponse', {
          method: 'POST',
          mode: 'no-cors',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
          },
          body: formBody.toString()
        });

        // Also log to Google Sheets for admin panel visibility
        const webhookUrl = GOOGLE_SHEET_WEBHOOK_URL;
        if (webhookUrl) {
          await fetch(webhookUrl, {
            method: 'POST',
            mode: 'no-cors',
            headers: {
              'Content-Type': 'text/plain'
            },
            body: JSON.stringify({
              date: new Date().toLocaleString('en-IN', {
                timeZone: 'Asia/Kolkata'
              }),
              name: formData.name.trim(),
              email: formData.email.toLowerCase().trim(),
              phone: formData.phone.trim(),
              course: (formData.course || 'Not specified') + (formData.city ? ' [' + formData.city + ']' : ''),
              price: 'Enquiry',
              status: 'Enquiry',
              paymentId: formData.city || ''
            })
          });
        }
        setSubmitted(true);
        setFormData({
          name: '',
          email: '',
          phone: '',
          city: '',
          course: ''
        });
      } catch (err) {
        setError('Something went wrong. Please try again.');
      } finally {
        setLoading(false);
      }
    };
    const inputClass = "w-full px-4 py-3 rounded-xl bg-white/[0.03] border border-white/10 text-white text-xs placeholder-gray-600 focus:outline-none focus:border-brand-cyan/40 transition-all duration-300";
    const labelClass = "text-[10px] font-mono font-bold text-gray-500 uppercase tracking-wider mb-1.5";
    if (submitted) {
      return /*#__PURE__*/React.createElement("div", {
        className: "max-w-3xl mx-auto"
      }, /*#__PURE__*/React.createElement("div", {
        className: "rounded-2xl border border-brand-emerald/20 bg-brand-emerald/5 backdrop-blur-sm p-10 text-center"
      }, /*#__PURE__*/React.createElement("div", {
        className: "w-14 h-14 rounded-full bg-brand-emerald/20 flex items-center justify-center mx-auto mb-4"
      }, /*#__PURE__*/React.createElement("svg", {
        xmlns: "http://www.w3.org/2000/svg",
        className: "w-7 h-7 text-brand-emerald",
        fill: "none",
        viewBox: "0 0 24 24",
        stroke: "currentColor",
        strokeWidth: "2"
      }, /*#__PURE__*/React.createElement("path", {
        strokeLinecap: "round",
        strokeLinejoin: "round",
        d: "M5 13l4 4L19 7"
      }))), /*#__PURE__*/React.createElement("h3", {
        className: "text-lg font-semibold text-white mb-2"
      }, "Thank You, ", formData.name, "!"), /*#__PURE__*/React.createElement("p", {
        className: "text-sm text-gray-400 mb-6"
      }, "Your enquiry has been received. We'll get back to you shortly."), /*#__PURE__*/React.createElement("button", {
        onClick: () => setSubmitted(false),
        className: "px-6 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider text-black bg-brand-cyan hover:bg-brand-cyan/80 transition-all duration-300"
      }, "Submit Another")));
    }
    return /*#__PURE__*/React.createElement("form", {
      onSubmit: handleSubmit,
      className: "max-w-3xl mx-auto rounded-2xl border border-white/[0.06] bg-white/[0.02] backdrop-blur-sm p-6 md:p-8 space-y-5"
    }, /*#__PURE__*/React.createElement("div", {
      className: "grid grid-cols-1 md:grid-cols-2 gap-4"
    }, /*#__PURE__*/React.createElement("div", {
      className: "flex flex-col"
    }, /*#__PURE__*/React.createElement("label", {
      className: labelClass
    }, "Full Name ", /*#__PURE__*/React.createElement("span", {
      className: "text-rose-500"
    }, "*")), /*#__PURE__*/React.createElement("input", {
      type: "text",
      value: formData.name,
      onChange: handleChange('name'),
      placeholder: "John Doe",
      className: inputClass,
      required: true
    })), /*#__PURE__*/React.createElement("div", {
      className: "flex flex-col"
    }, /*#__PURE__*/React.createElement("label", {
      className: labelClass
    }, "Email ", /*#__PURE__*/React.createElement("span", {
      className: "text-rose-500"
    }, "*")), /*#__PURE__*/React.createElement("input", {
      type: "email",
      value: formData.email,
      onChange: handleChange('email'),
      placeholder: "john@example.com",
      className: inputClass,
      required: true
    }))), /*#__PURE__*/React.createElement("div", {
      className: "grid grid-cols-1 md:grid-cols-2 gap-4"
    }, /*#__PURE__*/React.createElement("div", {
      className: "flex flex-col"
    }, /*#__PURE__*/React.createElement("label", {
      className: labelClass
    }, "Phone / WhatsApp ", /*#__PURE__*/React.createElement("span", {
      className: "text-rose-500"
    }, "*")), /*#__PURE__*/React.createElement("input", {
      type: "tel",
      value: formData.phone,
      onChange: handleChange('phone'),
      placeholder: "+91 98765 43210",
      className: inputClass,
      required: true
    })), /*#__PURE__*/React.createElement("div", {
      className: "flex flex-col"
    }, /*#__PURE__*/React.createElement("label", {
      className: labelClass
    }, "City / State"), /*#__PURE__*/React.createElement("input", {
      type: "text",
      value: formData.city,
      onChange: handleChange('city'),
      placeholder: "Mumbai, Maharashtra",
      className: inputClass
    }))), /*#__PURE__*/React.createElement("div", {
      className: "flex flex-col"
    }, /*#__PURE__*/React.createElement("label", {
      className: labelClass
    }, "Which course are you interested in? ", /*#__PURE__*/React.createElement("span", {
      className: "text-rose-500"
    }, "*")), /*#__PURE__*/React.createElement("select", {
      value: formData.course,
      onChange: handleChange('course'),
      className: inputClass + " appearance-none cursor-pointer",
      required: true
    }, /*#__PURE__*/React.createElement("option", {
      value: "",
      disabled: true,
      className: "bg-zinc-900 text-gray-500"
    }, "Choose an AI Course"), /*#__PURE__*/React.createElement("option", {
      value: "AI Graphic Design Mastery",
      className: "bg-zinc-900"
    }, "AI Graphic Design Mastery"), /*#__PURE__*/React.createElement("option", {
      value: "AI Filmmaking & Video Production",
      className: "bg-zinc-900"
    }, "AI Filmmaking & Video Production"), /*#__PURE__*/React.createElement("option", {
      value: "No-Code AI Website Creation",
      className: "bg-zinc-900"
    }, "No-Code AI Website Creation"), /*#__PURE__*/React.createElement("option", {
      value: "AI-Powered UI/UX Design",
      className: "bg-zinc-900"
    }, "AI-Powered UI/UX Design"), /*#__PURE__*/React.createElement("option", {
      value: "AI Content Creation & Marketing",
      className: "bg-zinc-900"
    }, "AI Content Creation & Marketing"), /*#__PURE__*/React.createElement("option", {
      value: "Other",
      className: "bg-zinc-900"
    }, "Other"))), error && /*#__PURE__*/React.createElement("div", {
      className: "text-rose-500 text-[10px] font-mono bg-rose-500/10 border border-rose-500/20 px-3.5 py-2 rounded-lg flex items-center gap-1.5"
    }, /*#__PURE__*/React.createElement("svg", {
      xmlns: "http://www.w3.org/2000/svg",
      className: "w-3.5 h-3.5 flex-shrink-0",
      viewBox: "0 0 24 24",
      fill: "none",
      stroke: "currentColor",
      strokeWidth: "2"
    }, /*#__PURE__*/React.createElement("circle", {
      cx: "12",
      cy: "12",
      r: "10"
    }), /*#__PURE__*/React.createElement("line", {
      x1: "12",
      y1: "8",
      x2: "12",
      y2: "12"
    }), /*#__PURE__*/React.createElement("line", {
      x1: "12",
      y1: "16",
      x2: "12.01",
      y2: "16"
    })), /*#__PURE__*/React.createElement("span", null, error)), /*#__PURE__*/React.createElement("button", {
      type: "submit",
      disabled: loading,
      className: "w-full py-3.5 rounded-2xl text-xs font-bold uppercase tracking-widest text-black bg-brand-cyan hover:bg-brand-cyan/80 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 flex items-center justify-center gap-2.5 shadow-[0_0_25px_rgba(0,240,255,0.15)] hover:shadow-[0_0_35px_rgba(0,240,255,0.3)]"
    }, loading ? /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("svg", {
      className: "animate-spin w-4 h-4",
      xmlns: "http://www.w3.org/2000/svg",
      fill: "none",
      viewBox: "0 0 24 24"
    }, /*#__PURE__*/React.createElement("circle", {
      className: "opacity-25",
      cx: "12",
      cy: "12",
      r: "10",
      stroke: "currentColor",
      strokeWidth: "4"
    }), /*#__PURE__*/React.createElement("path", {
      className: "opacity-75",
      fill: "currentColor",
      d: "M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
    })), /*#__PURE__*/React.createElement("span", null, "Sending...")) : /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("svg", {
      xmlns: "http://www.w3.org/2000/svg",
      className: "w-4 h-4",
      fill: "none",
      viewBox: "0 0 24 24",
      stroke: "currentColor",
      strokeWidth: "2"
    }, /*#__PURE__*/React.createElement("path", {
      strokeLinecap: "round",
      strokeLinejoin: "round",
      d: "M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
    })), /*#__PURE__*/React.createElement("span", null, "Send Enquiry"))), /*#__PURE__*/React.createElement("p", {
      className: "text-center text-[10px] font-mono text-gray-600"
    }, "Your information is securely stored via Google Forms."));
  })())), /*#__PURE__*/React.createElement("footer", {
    id: "footer",
    className: "bg-brand-bgDarker text-gray-500 py-16 px-6 md:px-12 lg:px-24 border-t border-white/5 z-20 select-none relative"
  }, /*#__PURE__*/React.createElement("div", {
    className: "max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-12 text-left mb-12"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex flex-col text-left col-span-1 md:col-span-2"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center mb-4"
  }, /*#__PURE__*/React.createElement("img", {
    src: "../public/Images/logo/Dxign-logo.png",
    alt: "Dxign Learn AI Education Logo",
    className: "h-9 w-auto object-contain"
  })), /*#__PURE__*/React.createElement("p", {
    className: "text-xs text-gray-600 max-w-sm leading-relaxed mb-4"
  }, "Dxign Learn is an independent AI education platform. Midjourney, Stable Diffusion, Runway, ElevenLabs, and other tool names are trademarks of their respective owners.")), /*#__PURE__*/React.createElement("div", {
    className: "flex flex-col text-left"
  }, /*#__PURE__*/React.createElement("span", {
    className: "text-xs font-mono text-gray-400 uppercase tracking-widest mb-4 font-bold"
  }, "AI Courses"), /*#__PURE__*/React.createElement("div", {
    className: "flex flex-col space-y-2 text-xs"
  }, courseList.map(c => /*#__PURE__*/React.createElement("button", {
    key: c.id,
    onClick: () => navigateToSection('courses', `card-${c.id}`),
    className: "text-left text-gray-600 hover:text-white transition-colors duration-300"
  }, c.title)))), /*#__PURE__*/React.createElement("div", {
    className: "flex flex-col text-left"
  }, /*#__PURE__*/React.createElement("span", {
    className: "text-xs font-mono text-gray-400 uppercase tracking-widest mb-4 font-bold"
  }, "Contact"), /*#__PURE__*/React.createElement("div", {
    className: "flex flex-col space-y-2.5 text-xs text-gray-600"
  }, /*#__PURE__*/React.createElement("a", {
    href: "tel:+917356413558",
    className: "hover:text-white transition-colors duration-300"
  }, "+91 73564 13558"), /*#__PURE__*/React.createElement("a", {
    href: "mailto:dxignlearn@gmail.com",
    className: "hover:text-white transition-colors duration-300"
  }, "dxignlearn@gmail.com"), /*#__PURE__*/React.createElement("span", {
    onClick: () => {
      window.location.hash = '#admin';
    },
    className: "cursor-pointer hover:text-white transition-colors duration-300"
  }, "Admin")), /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-3 mt-5"
  }, /*#__PURE__*/React.createElement("a", {
    href: "https://www.instagram.com/dxign.learn?igsh=cGk3YjAzaDZ2M3Rw&utm_source=qr",
    target: "_blank",
    rel: "noopener noreferrer",
    className: "w-8 h-8 rounded-full border border-white/10 bg-white/5 flex items-center justify-center text-gray-500 hover:text-white hover:border-brand-cyan/40 hover:bg-brand-cyan/10 transition-all duration-300",
    "aria-label": "Instagram"
  }, /*#__PURE__*/React.createElement("svg", {
    xmlns: "http://www.w3.org/2000/svg",
    className: "w-3.5 h-3.5",
    fill: "currentColor",
    viewBox: "0 0 24 24"
  }, /*#__PURE__*/React.createElement("path", {
    d: "M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"
  }))), /*#__PURE__*/React.createElement("a", {
    href: "https://www.facebook.com/profile.php?id=61582077689946",
    target: "_blank",
    rel: "noopener noreferrer",
    className: "w-8 h-8 rounded-full border border-white/10 bg-white/5 flex items-center justify-center text-gray-500 hover:text-white hover:border-brand-cyan/40 hover:bg-brand-cyan/10 transition-all duration-300",
    "aria-label": "Facebook"
  }, /*#__PURE__*/React.createElement("svg", {
    xmlns: "http://www.w3.org/2000/svg",
    className: "w-3.5 h-3.5",
    fill: "currentColor",
    viewBox: "0 0 24 24"
  }, /*#__PURE__*/React.createElement("path", {
    d: "M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"
  }))), /*#__PURE__*/React.createElement("a", {
    href: "https://wa.me/7356413558",
    target: "_blank",
    rel: "noopener noreferrer",
    className: "w-8 h-8 rounded-full border border-white/10 bg-white/5 flex items-center justify-center text-gray-500 hover:text-white hover:border-brand-cyan/40 hover:bg-brand-cyan/10 transition-all duration-300",
    "aria-label": "WhatsApp"
  }, /*#__PURE__*/React.createElement("svg", {
    xmlns: "http://www.w3.org/2000/svg",
    className: "w-3.5 h-3.5",
    fill: "currentColor",
    viewBox: "0 0 24 24"
  }, /*#__PURE__*/React.createElement("path", {
    d: "M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"
  }))), /*#__PURE__*/React.createElement("a", {
    href: "https://www.linkedin.com/in/dxign-learn-41906738a/?skipRedirect=true",
    target: "_blank",
    rel: "noopener noreferrer",
    className: "w-8 h-8 rounded-full border border-white/10 bg-white/5 flex items-center justify-center text-gray-500 hover:text-white hover:border-brand-cyan/40 hover:bg-brand-cyan/10 transition-all duration-300",
    "aria-label": "LinkedIn"
  }, /*#__PURE__*/React.createElement("svg", {
    xmlns: "http://www.w3.org/2000/svg",
    className: "w-3.5 h-3.5",
    fill: "currentColor",
    viewBox: "0 0 24 24"
  }, /*#__PURE__*/React.createElement("path", {
    d: "M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"
  })))))), /*#__PURE__*/React.createElement("div", {
    className: "max-w-7xl mx-auto border-t border-white/5 pt-8 flex flex-col md:flex-row justify-between items-center text-xs gap-4 text-center md:text-left font-mono"
  }, /*#__PURE__*/React.createElement("a", {
    href: "https://www.obtecs.com/",
    target: "_blank",
    rel: "noopener noreferrer",
    className: "hover:text-white/60 transition-colors select-none"
  }, "\xA9 2026 Dxign Learn. All Rights Reserved."), /*#__PURE__*/React.createElement("span", {
    className: "text-gray-600"
  }, "Built with React, Tailwind CSS, and Three.js."))), enrollModal && (() => {
    const theme = colorThemes[enrollModal.colorName] || colorThemes.cyan;
    return /*#__PURE__*/React.createElement("div", {
      className: "fixed inset-0 z-[10005] overflow-y-auto",
      style: {
        backgroundColor: closingModal ? 'transparent' : 'rgba(0,0,0,0.15)',
        backdropFilter: closingModal ? 'blur(0px)' : 'blur(4px)',
        transition: 'background-color 0.35s cubic-bezier(0.22, 1, 0.36, 1), backdropFilter 0.35s cubic-bezier(0.22, 1, 0.36, 1)'
      },
      onClick: closeEnrollModal,
      onWheel: e => e.stopPropagation()
    }, /*#__PURE__*/React.createElement("div", {
      className: "min-h-screen flex items-start lg:items-center justify-center p-4 md:p-8",
      onClick: closeEnrollModal
    }, /*#__PURE__*/React.createElement("div", {
      className: `relative w-full max-w-5xl mx-auto rounded-3xl border border-white/10 overflow-hidden flex flex-col ${closingModal ? 'animate-popupOut' : 'animate-popup'}`,
      style: {
        background: 'linear-gradient(145deg, #0e0e0e 0%, #111111 100%)',
        boxShadow: `0 0 60px ${enrollModal.colorCode}22, 0 30px 80px rgba(0,0,0,0.8)`
      },
      onClick: e => e.stopPropagation()
    }, /*#__PURE__*/React.createElement("div", {
      className: "h-1 w-full",
      style: {
        background: theme.grad
      }
    }), /*#__PURE__*/React.createElement("button", {
      onClick: closeEnrollModal,
      className: "absolute top-4 right-4 w-8 h-8 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-gray-400 hover:text-white hover:bg-white/10 transition-all duration-200 z-10"
    }, /*#__PURE__*/React.createElement("i", {
      "data-lucide": "x",
      className: "w-4 h-4"
    })), /*#__PURE__*/React.createElement("div", {
      className: "p-6 md:p-8 border-b border-white/5"
    }, /*#__PURE__*/React.createElement("div", {
      className: "flex items-start justify-between mb-5"
    }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
      className: `w-12 h-12 rounded-2xl border flex justify-center items-center ${theme.bgIcon} mb-4`
    }, /*#__PURE__*/React.createElement("i", {
      "data-lucide": enrollModal.icon,
      className: "w-5 h-5"
    })), /*#__PURE__*/React.createElement("h2", {
      className: "text-xl md:text-2xl font-black uppercase tracking-tight text-white font-heading leading-tight"
    }, enrollModal.title), enrollModal.tagline && /*#__PURE__*/React.createElement("p", {
      className: "text-xs font-mono text-gray-400 mt-1.5 max-w-lg"
    }, enrollModal.tagline)), /*#__PURE__*/React.createElement("span", {
      className: "px-3 py-1 rounded-full text-[10px] font-mono uppercase tracking-wider border border-white/10 text-gray-400 whitespace-nowrap",
      style: {
        background: 'rgba(255,255,255,0.03)'
      }
    }, enrollModal.badge)), enrollModal.fullDescription && /*#__PURE__*/React.createElement("p", {
      className: "text-gray-400 text-xs md:text-sm leading-relaxed mb-6"
    }, enrollModal.fullDescription), enrollModal.whatYouLearn && enrollModal.whatYouLearn.length > 0 && /*#__PURE__*/React.createElement("div", {
      className: "mb-6"
    }, /*#__PURE__*/React.createElement("h4", {
      className: "text-xs font-mono text-white font-bold uppercase tracking-widest mb-3"
    }, "What You'll Learn"), /*#__PURE__*/React.createElement("div", {
      className: "grid grid-cols-1 sm:grid-cols-2 gap-2"
    }, enrollModal.whatYouLearn.map((item, i) => /*#__PURE__*/React.createElement("div", {
      key: i,
      className: "flex items-center space-x-2.5 text-gray-400 text-xs"
    }, /*#__PURE__*/React.createElement("i", {
      "data-lucide": "check",
      className: "w-3.5 h-3.5 flex-shrink-0",
      style: {
        color: enrollModal.colorCode
      }
    }), /*#__PURE__*/React.createElement("span", null, item))))), enrollModal.toolsCovered && enrollModal.toolsCovered.length > 0 && /*#__PURE__*/React.createElement("div", {
      className: "mb-6"
    }, /*#__PURE__*/React.createElement("h4", {
      className: "text-xs font-mono text-white font-bold uppercase tracking-widest mb-3"
    }, "AI Tools Covered"), /*#__PURE__*/React.createElement("div", {
      className: "flex flex-wrap gap-2.5"
    }, enrollModal.toolsCovered.map((tool, i) => {
      const logoUrl = toolLogoMap[tool] || toolLogoMap[tool.replace(' AI', '')];
      return /*#__PURE__*/React.createElement("div", {
        key: i,
        className: "flex items-center space-x-2 px-3 py-1.5 rounded-lg bg-white/[0.03] border border-white/5 text-gray-400 text-[10px] font-mono"
      }, logoUrl ? /*#__PURE__*/React.createElement("img", {
        src: logoUrl,
        alt: tool,
        className: "w-4 h-4 object-contain",
        onError: e => {
          e.target.style.display = 'none';
        }
      }) : /*#__PURE__*/React.createElement("svg", {
        xmlns: "http://www.w3.org/2000/svg",
        width: "12",
        height: "12",
        viewBox: "0 0 24 24",
        fill: "none",
        stroke: "currentColor",
        strokeWidth: "2",
        strokeLinecap: "round",
        strokeLinejoin: "round",
        className: "text-gray-500 flex-shrink-0"
      }, /*#__PURE__*/React.createElement("path", {
        d: "M12 20h.01"
      }), /*#__PURE__*/React.createElement("path", {
        d: "M18.36 17.64a9 9 0 0 0 0-12.73"
      }), /*#__PURE__*/React.createElement("path", {
        d: "M5.64 17.64a9 9 0 0 1 0-12.73"
      })), /*#__PURE__*/React.createElement("span", null, tool));
    }))), enrollModal.projectList && enrollModal.projectList.length > 0 && /*#__PURE__*/React.createElement("div", {
      className: "mb-6"
    }, /*#__PURE__*/React.createElement("h4", {
      className: "text-xs font-mono text-white font-bold uppercase tracking-widest mb-3"
    }, "Projects You'll Build"), /*#__PURE__*/React.createElement("div", {
      className: "flex flex-wrap gap-2"
    }, enrollModal.projectList.map((proj, i) => /*#__PURE__*/React.createElement("span", {
      key: i,
      className: "px-3 py-1.5 rounded-lg border flex items-center space-x-1.5 text-gray-400 text-[10px] font-mono",
      style: {
        borderColor: `${enrollModal.colorCode}22`,
        backgroundColor: `${enrollModal.colorCode}11`
      }
    }, /*#__PURE__*/React.createElement("i", {
      "data-lucide": "folder",
      className: "w-3 h-3",
      style: {
        color: enrollModal.colorCode
      }
    }), /*#__PURE__*/React.createElement("span", null, proj))))), enrollModal.perfectFor && enrollModal.perfectFor.length > 0 && /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("h4", {
      className: "text-xs font-mono text-white font-bold uppercase tracking-widest mb-3"
    }, "Perfect For"), /*#__PURE__*/React.createElement("div", {
      className: "flex flex-wrap gap-2"
    }, enrollModal.perfectFor.map((audience, i) => /*#__PURE__*/React.createElement("span", {
      key: i,
      className: "px-3 py-1 rounded-full bg-white/5 border border-white/5 text-gray-400 text-[10px] font-mono"
    }, audience))))), /*#__PURE__*/React.createElement("div", {
      className: "p-6 md:p-8 flex flex-col justify-between bg-zinc-900/30"
    }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
      className: "flex items-end justify-between mb-6"
    }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
      className: "flex items-baseline space-x-2"
    }, /*#__PURE__*/React.createElement("span", {
      className: "text-3xl font-black font-heading",
      style: {
        color: enrollModal.colorCode
      }
    }, enrollModal.price), /*#__PURE__*/React.createElement("span", {
      className: "text-sm font-mono text-gray-600 line-through"
    }, enrollModal.originalPrice)), /*#__PURE__*/React.createElement("span", {
      className: "text-[10px] font-mono uppercase tracking-wider",
      style: {
        color: enrollModal.colorCode,
        opacity: 0.7
      }
    }, enrollModal.discount, " \xB7 One-time payment")), /*#__PURE__*/React.createElement("span", {
      className: "px-3 py-1.5 rounded-full text-[10px] font-mono text-white border border-white/10 bg-white/5"
    }, "Lifetime Access")), /*#__PURE__*/React.createElement("div", {
      className: "border-t border-white/5 mb-6"
    }), /*#__PURE__*/React.createElement("div", {
      className: "space-y-4 mb-6"
    }, /*#__PURE__*/React.createElement("div", {
      className: "text-left"
    }, /*#__PURE__*/React.createElement("label", {
      className: "text-[10px] font-mono text-gray-500 uppercase tracking-widest mb-1.5 block"
    }, "Enter Your Name"), /*#__PURE__*/React.createElement("div", {
      className: "relative flex items-center"
    }, /*#__PURE__*/React.createElement("i", {
      "data-lucide": "user",
      className: "absolute left-4 w-4 h-4 text-gray-500"
    }), /*#__PURE__*/React.createElement("input", {
      type: "text",
      placeholder: "John Doe",
      value: nameInput,
      onChange: e => setNameInput(e.target.value),
      className: "w-full pl-11 pr-4 py-3 rounded-xl bg-white/[0.03] border border-white/10 text-white text-xs placeholder-gray-600 focus:outline-none transition-all duration-300",
      style: {
        fontFamily: 'Outfit, sans-serif'
      },
      onFocus: e => {
        e.target.style.borderColor = enrollModal.colorCode;
        e.target.style.boxShadow = `0 0 15px ${enrollModal.colorCode}22`;
      },
      onBlur: e => {
        e.target.style.borderColor = 'rgba(255,255,255,0.1)';
        e.target.style.boxShadow = 'none';
      }
    }))), /*#__PURE__*/React.createElement("div", {
      className: "text-left"
    }, /*#__PURE__*/React.createElement("label", {
      className: "text-[10px] font-mono text-gray-500 uppercase tracking-widest mb-1.5 block"
    }, "Enter Email Address"), /*#__PURE__*/React.createElement("div", {
      className: "relative flex items-center"
    }, /*#__PURE__*/React.createElement("i", {
      "data-lucide": "mail",
      className: "absolute left-4 w-4 h-4 text-gray-500"
    }), /*#__PURE__*/React.createElement("input", {
      type: "email",
      placeholder: "name@example.com",
      value: emailInput,
      onChange: e => setEmailInput(e.target.value),
      className: "w-full pl-11 pr-4 py-3 rounded-xl bg-white/[0.03] border border-white/10 text-white text-xs placeholder-gray-600 focus:outline-none transition-all duration-300",
      style: {
        fontFamily: 'Outfit, sans-serif'
      },
      onFocus: e => {
        e.target.style.borderColor = enrollModal.colorCode;
        e.target.style.boxShadow = `0 0 15px ${enrollModal.colorCode}22`;
      },
      onBlur: e => {
        e.target.style.borderColor = 'rgba(255,255,255,0.1)';
        e.target.style.boxShadow = 'none';
      }
    }))), /*#__PURE__*/React.createElement("div", {
      className: "text-left"
    }, /*#__PURE__*/React.createElement("label", {
      className: "text-[10px] font-mono text-gray-500 uppercase tracking-widest mb-1.5 block"
    }, "Enter Mobile Number"), /*#__PURE__*/React.createElement("div", {
      className: "relative flex items-center"
    }, /*#__PURE__*/React.createElement("i", {
      "data-lucide": "phone",
      className: "absolute left-4 w-4 h-4 text-gray-500"
    }), /*#__PURE__*/React.createElement("input", {
      type: "tel",
      placeholder: "10-digit mobile number",
      value: phoneInput,
      onChange: e => {
        const val = e.target.value.replace(/\D/g, '');
        if (val.length <= 10) {
          setPhoneInput(val);
        }
      },
      className: "w-full pl-11 pr-4 py-3 rounded-xl bg-white/[0.03] border border-white/10 text-white text-xs placeholder-gray-600 focus:outline-none transition-all duration-300",
      style: {
        fontFamily: 'Outfit, sans-serif'
      },
      onFocus: e => {
        e.target.style.borderColor = enrollModal.colorCode;
        e.target.style.boxShadow = `0 0 15px ${enrollModal.colorCode}22`;
      },
      onBlur: e => {
        e.target.style.borderColor = 'rgba(255,255,255,0.1)';
        e.target.style.boxShadow = 'none';
      }
    }))), enrollError && /*#__PURE__*/React.createElement("div", {
      className: "text-left text-rose-500 text-[10px] font-mono mt-2 bg-rose-500/10 border border-rose-500/20 px-3.5 py-2 rounded-lg flex items-center space-x-1.5"
    }, /*#__PURE__*/React.createElement("i", {
      "data-lucide": "alert-triangle",
      className: "w-3.5 h-3.5 flex-shrink-0 text-rose-500"
    }), /*#__PURE__*/React.createElement("span", null, enrollError)))), /*#__PURE__*/React.createElement("button", {
      onClick: handleRazorpayPay,
      className: "w-full py-4 rounded-2xl text-sm font-bold uppercase tracking-wider text-white transition-all duration-300 flex items-center justify-center space-x-3 hover:scale-[1.02] active:scale-[0.99]",
      style: {
        background: 'linear-gradient(135deg, #528FF0 0%, #3a73d8 100%)',
        boxShadow: '0 0 30px rgba(82,143,240,0.3)'
      }
    }, /*#__PURE__*/React.createElement("i", {
      "data-lucide": "sparkles",
      className: "w-5 h-5"
    }), /*#__PURE__*/React.createElement("span", null, "PAY & ENROLL NOW")), /*#__PURE__*/React.createElement("p", {
      className: "text-center text-[10px] font-mono text-gray-600 mt-4 flex items-center justify-center space-x-1.5"
    }, /*#__PURE__*/React.createElement("i", {
      "data-lucide": "shield-check",
      className: "w-3 h-3 text-green-500"
    }), /*#__PURE__*/React.createElement("span", null, "Secured by Razorpay \xB7 256-bit SSL encryption"))))));
  })(), theaterVideo && /*#__PURE__*/React.createElement("div", {
    className: "fixed inset-0 z-[9999] flex items-center justify-center p-4 md:p-10",
    style: {
      backgroundColor: 'rgba(0,0,0,0.92)',
      backdropFilter: 'blur(20px)'
    },
    onClick: () => setTheaterVideo(null),
    onWheel: e => e.stopPropagation()
  }, /*#__PURE__*/React.createElement("button", {
    onClick: () => setTheaterVideo(null),
    className: "absolute top-6 right-6 w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-gray-400 hover:text-white hover:bg-white/10 transition-all duration-200 z-[10000]"
  }, /*#__PURE__*/React.createElement("i", {
    "data-lucide": "x",
    className: "w-5 h-5"
  })), /*#__PURE__*/React.createElement("div", {
    className: "relative w-full max-w-5xl rounded-3xl border border-white/10 overflow-hidden grid grid-cols-1 lg:grid-cols-12 bg-black shadow-[0_30px_100px_rgba(0,0,0,0.9)]",
    onClick: e => e.stopPropagation()
  }, /*#__PURE__*/React.createElement("div", {
    className: "lg:col-span-8 bg-zinc-950 flex items-center justify-center relative aspect-video w-full select-none"
  }, theaterVideo.video ? /*#__PURE__*/React.createElement("video", {
    src: theaterVideo.video,
    controls: true,
    autoPlay: true,
    playsInline: true,
    controlsList: "nodownload",
    disablePictureInPicture: true,
    onContextMenu: e => e.preventDefault(),
    className: "w-full h-full object-contain"
  }) : theaterVideo.carousel ? /*#__PURE__*/React.createElement("div", {
    className: "relative w-full h-full flex items-center justify-center group/carousel"
  }, /*#__PURE__*/React.createElement("img", {
    src: theaterVideo.images[carouselIndex],
    alt: `${theaterVideo.title} slide ${carouselIndex + 1}`,
    className: "w-full h-full object-contain"
  }), /*#__PURE__*/React.createElement("button", {
    onClick: e => {
      e.stopPropagation();
      setCarouselIndex(prev => prev === 0 ? theaterVideo.images.length - 1 : prev - 1);
    },
    className: "absolute left-4 w-9 h-9 rounded-full bg-black/50 hover:bg-black/80 border border-white/10 flex items-center justify-center text-white transition-all duration-300 hover:scale-105 active:scale-95",
    "aria-label": "Previous Slide"
  }, /*#__PURE__*/React.createElement("svg", {
    xmlns: "http://www.w3.org/2000/svg",
    className: "w-4 h-4",
    fill: "none",
    viewBox: "0 0 24 24",
    stroke: "currentColor",
    strokeWidth: 2.5
  }, /*#__PURE__*/React.createElement("path", {
    strokeLinecap: "round",
    strokeLinejoin: "round",
    d: "M15.75 19.5L8.25 12l7.5-7.5"
  }))), /*#__PURE__*/React.createElement("button", {
    onClick: e => {
      e.stopPropagation();
      setCarouselIndex(prev => prev === theaterVideo.images.length - 1 ? 0 : prev + 1);
    },
    className: "absolute right-4 w-9 h-9 rounded-full bg-black/50 hover:bg-black/80 border border-white/10 flex items-center justify-center text-white transition-all duration-300 hover:scale-105 active:scale-95",
    "aria-label": "Next Slide"
  }, /*#__PURE__*/React.createElement("svg", {
    xmlns: "http://www.w3.org/2000/svg",
    className: "w-4 h-4",
    fill: "none",
    viewBox: "0 0 24 24",
    stroke: "currentColor",
    strokeWidth: 2.5
  }, /*#__PURE__*/React.createElement("path", {
    strokeLinecap: "round",
    strokeLinejoin: "round",
    d: "M8.25 4.5l7.5 7.5-7.5 7.5"
  }))), /*#__PURE__*/React.createElement("div", {
    className: "absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-2"
  }, theaterVideo.images.map((_, sidx) => /*#__PURE__*/React.createElement("button", {
    key: sidx,
    onClick: e => {
      e.stopPropagation();
      setCarouselIndex(sidx);
    },
    className: `w-1.5 h-1.5 rounded-full transition-all duration-300 ${carouselIndex === sidx ? 'bg-brand-cyan w-3 shadow-[0_0_8px_#00f0ff]' : 'bg-white/30 hover:bg-white/60'}`,
    "aria-label": `Go to slide ${sidx + 1}`
  }))), /*#__PURE__*/React.createElement("span", {
    className: "absolute top-4 right-4 px-2.5 py-1 rounded bg-black/50 border border-white/10 text-[9px] font-mono text-gray-400"
  }, carouselIndex + 1, " / ", theaterVideo.images.length)) : /*#__PURE__*/React.createElement("img", {
    src: theaterVideo.image,
    alt: theaterVideo.title,
    className: "w-full h-full object-contain"
  })), /*#__PURE__*/React.createElement("div", {
    className: "lg:col-span-4 p-8 flex flex-col justify-between bg-zinc-900/50 text-left border-t lg:border-t-0 lg:border-l border-white/5 overflow-y-auto max-h-[450px] lg:max-h-full"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex flex-col h-full justify-between"
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("span", {
    className: "text-[10px] font-mono text-gray-500 uppercase tracking-widest font-bold mb-2 block"
  }, theaterVideo.studentName), /*#__PURE__*/React.createElement("h2", {
    className: "text-lg md:text-xl font-black uppercase tracking-tight text-white font-heading mb-3 leading-tight"
  }, theaterVideo.title), /*#__PURE__*/React.createElement("span", {
    className: "inline-block px-3 py-1 rounded-full bg-brand-cyan/15 border border-brand-cyan/25 text-[9px] font-mono font-bold uppercase tracking-wider text-brand-cyan mb-4"
  }, theaterVideo.cat), /*#__PURE__*/React.createElement("p", {
    className: "text-gray-400 text-[11px] md:text-xs leading-relaxed mb-4"
  }, theaterVideo.desc)), /*#__PURE__*/React.createElement("div", {
    className: "pt-4 border-t border-white/5 mt-auto"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex flex-wrap gap-1.5 mb-4"
  }, theaterVideo.tags.map((tg, i) => /*#__PURE__*/React.createElement("span", {
    key: i,
    className: "text-[9px] font-mono text-gray-500 bg-white/[0.02] border border-white/5 px-2 py-0.5 rounded"
  }, "#", tg))), /*#__PURE__*/React.createElement("button", {
    onClick: () => {
      // Determine the matching course ID based on category and tags
      let targetCourseId = 'content-creation';
      if (theaterVideo.tags && theaterVideo.tags.includes('Vibe Coding')) {
        targetCourseId = 'vibe-coding';
      } else if (theaterVideo.cat === 'Film Making') {
        targetCourseId = 'film-making';
      } else if (theaterVideo.cat === 'Graphic Design') {
        targetCourseId = 'graphic-design';
      }

      // Automatically open the enrollment popup modal for the matching course instantly
      const courseObj = courseList.find(c => c.id === targetCourseId);
      if (courseObj) {
        openEnrollModal(courseObj);
      }
    },
    className: "w-full py-3 rounded-xl text-xs font-bold uppercase tracking-wider text-white transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] bg-gradient-to-r from-brand-cyan to-brand-blue"
  }, "Master This Skill")))))), showIosModal && /*#__PURE__*/React.createElement("div", {
    className: "fixed inset-0 z-[10005] overflow-y-auto",
    style: {
      backgroundColor: 'rgba(0,0,0,0.85)',
      backdropFilter: 'blur(12px)'
    },
    onClick: () => setShowIosModal(false),
    onWheel: e => e.stopPropagation()
  }, /*#__PURE__*/React.createElement("div", {
    className: "min-h-full flex items-center justify-center py-8",
    onClick: () => setShowIosModal(false)
  }, /*#__PURE__*/React.createElement("div", {
    className: "relative w-full max-w-md mx-4 rounded-3xl border border-white/10 overflow-hidden",
    style: {
      background: 'linear-gradient(145deg, #0e0e0e 0%, #111111 100%)',
      boxShadow: '0 0 60px rgba(0,240,255,0.15), 0 30px 80px rgba(0,0,0,0.8)'
    },
    onClick: e => e.stopPropagation()
  }, /*#__PURE__*/React.createElement("div", {
    className: "h-1 w-full bg-gradient-to-r from-brand-cyan to-brand-blue"
  }), /*#__PURE__*/React.createElement("button", {
    onClick: () => setShowIosModal(false),
    className: "absolute top-4 right-4 w-8 h-8 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-gray-400 hover:text-white hover:bg-white/10 transition-all duration-200 z-10"
  }, /*#__PURE__*/React.createElement("svg", {
    xmlns: "http://www.w3.org/2000/svg",
    width: "16",
    height: "16",
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "2.5",
    strokeLinecap: "round",
    strokeLinejoin: "round"
  }, /*#__PURE__*/React.createElement("line", {
    x1: "18",
    y1: "6",
    x2: "6",
    y2: "18"
  }), /*#__PURE__*/React.createElement("line", {
    x1: "6",
    y1: "6",
    x2: "18",
    y2: "18"
  }))), /*#__PURE__*/React.createElement("div", {
    className: "p-8 text-center flex flex-col items-center"
  }, /*#__PURE__*/React.createElement("div", {
    className: "w-14 h-14 rounded-2xl bg-brand-cyan/5 border border-brand-cyan/10 flex items-center justify-center mb-6 text-brand-cyan"
  }, /*#__PURE__*/React.createElement("svg", {
    xmlns: "http://www.w3.org/2000/svg",
    width: "24",
    height: "24",
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "2",
    strokeLinecap: "round",
    strokeLinejoin: "round"
  }, /*#__PURE__*/React.createElement("rect", {
    x: "5",
    y: "2",
    width: "14",
    height: "20",
    rx: "2",
    ry: "2"
  }), /*#__PURE__*/React.createElement("line", {
    x1: "12",
    y1: "18",
    x2: "12.01",
    y2: "18"
  }))), /*#__PURE__*/React.createElement("h2", {
    className: "text-2xl font-black uppercase tracking-tight text-white font-heading mb-2"
  }, "Run on iOS (Expo Go)"), /*#__PURE__*/React.createElement("p", {
    className: "text-gray-500 text-xs leading-relaxed mb-6"
  }, "Since the official App Store build is coming soon, you can run the live doubt support app instantly on iOS via the Expo Go development client."), /*#__PURE__*/React.createElement("div", {
    className: "p-4 bg-white rounded-2xl mb-6 shadow-[0_0_30px_rgba(255,255,255,0.05)] border border-white/10 flex items-center justify-center w-48 h-48"
  }, /*#__PURE__*/React.createElement("img", {
    src: "https://api.qrserver.com/v1/create-qr-code/?size=160x160&color=050505&data=exp%3A%2F%2Fu.expo.dev%2F268153c3-6330-4e3a-9c71-08ecbc216d00%3Fupdate-group%3Dlatest",
    alt: "Expo QR Code",
    className: "w-40 h-40 object-contain"
  })), /*#__PURE__*/React.createElement("div", {
    className: "text-left w-full space-y-4 mb-6 text-xs text-gray-400 font-sans"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-start space-x-3"
  }, /*#__PURE__*/React.createElement("span", {
    className: "w-5 h-5 rounded-full bg-brand-cyan/15 border border-brand-cyan/30 flex items-center justify-center text-[10px] text-brand-cyan font-bold font-mono flex-shrink-0 mt-0.5"
  }, "1"), /*#__PURE__*/React.createElement("p", {
    className: "leading-relaxed"
  }, "Install the ", /*#__PURE__*/React.createElement("strong", {
    className: "text-white"
  }, "Expo Go"), " app from the iOS App Store.")), /*#__PURE__*/React.createElement("div", {
    className: "flex items-start space-x-3"
  }, /*#__PURE__*/React.createElement("span", {
    className: "w-5 h-5 rounded-full bg-brand-cyan/15 border border-brand-cyan/30 flex items-center justify-center text-[10px] text-brand-cyan font-bold font-mono flex-shrink-0 mt-0.5"
  }, "2"), /*#__PURE__*/React.createElement("p", {
    className: "leading-relaxed"
  }, "Open the native iOS Camera app and scan the QR code above.")), /*#__PURE__*/React.createElement("div", {
    className: "flex items-start space-x-3"
  }, /*#__PURE__*/React.createElement("span", {
    className: "w-5 h-5 rounded-full bg-brand-cyan/15 border border-brand-cyan/30 flex items-center justify-center text-[10px] text-brand-cyan font-bold font-mono flex-shrink-0 mt-0.5"
  }, "3"), /*#__PURE__*/React.createElement("p", {
    className: "leading-relaxed"
  }, "Tap the pop-up notification link to launch the support application."))), /*#__PURE__*/React.createElement("button", {
    onClick: () => setShowIosModal(false),
    className: "w-full py-4 rounded-2xl text-xs font-bold uppercase tracking-wider text-black transition bg-brand-cyan hover:scale-[1.02] active:scale-[0.99] font-sans",
    style: {
      boxShadow: '0 0 20px rgba(0,240,255,0.15)'
    }
  }, "GOT IT, THANKS!"))))), (isStudentOpen || closingStudent) && /*#__PURE__*/React.createElement("div", {
    className: `fixed inset-0 z-[100000] bg-zinc-950 flex flex-col font-sans select-text text-left overflow-y-auto lg:overflow-y-hidden ${closingStudent ? 'animate-student-popupOut' : 'animate-student-popup'}`,
    onWheel: e => {
      if (window.innerWidth >= 1024) e.stopPropagation();
    }
  }, !isStudentAuthenticated ?
  /*#__PURE__*/
  /* Student Login View */
  React.createElement("div", {
    className: "flex-grow flex items-center justify-center p-4 overflow-y-auto",
    style: {
      background: 'linear-gradient(135deg, #050505 0%, #0c0c0c 100%)'
    }
  }, studentLoginStep === 1 ?
  /*#__PURE__*/
  /* Step 1: Email Form */
  React.createElement("form", {
    onSubmit: handleStudentRequestOTP,
    className: "max-w-md w-full p-8 liquid-glass border border-white/10 rounded-3xl text-center shadow-[0_20px_60px_rgba(0,240,255,0.05)] relative overflow-hidden"
  }, /*#__PURE__*/React.createElement("div", {
    className: "absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-brand-cyan to-brand-blue"
  }), /*#__PURE__*/React.createElement("div", {
    className: "w-14 h-14 rounded-2xl bg-brand-cyan/5 border border-brand-cyan/10 flex items-center justify-center mx-auto mb-6 text-brand-cyan"
  }, /*#__PURE__*/React.createElement("svg", {
    xmlns: "http://www.w3.org/2000/svg",
    width: "24",
    height: "24",
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "2",
    strokeLinecap: "round",
    strokeLinejoin: "round"
  }, /*#__PURE__*/React.createElement("path", {
    d: "M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"
  }), /*#__PURE__*/React.createElement("polyline", {
    points: "22,6 12,13 2,6"
  }))), /*#__PURE__*/React.createElement("h2", {
    className: "text-xl font-black uppercase tracking-wider text-white font-heading mb-2"
  }, "Student Course Portal"), /*#__PURE__*/React.createElement("p", {
    className: "text-xs text-gray-500 mb-8 font-mono"
  }, "ENTER REGISTERED COURSE EMAIL"), /*#__PURE__*/React.createElement("div", {
    className: "text-left mb-6"
  }, /*#__PURE__*/React.createElement("label", {
    className: "text-[10px] font-mono text-gray-500 uppercase tracking-widest mb-1.5 block"
  }, "Email Address"), /*#__PURE__*/React.createElement("div", {
    className: "relative flex items-center"
  }, /*#__PURE__*/React.createElement("svg", {
    xmlns: "http://www.w3.org/2000/svg",
    width: "16",
    height: "16",
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "2",
    strokeLinecap: "round",
    strokeLinejoin: "round",
    className: "absolute left-4 text-gray-500"
  }, /*#__PURE__*/React.createElement("path", {
    d: "M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"
  }), /*#__PURE__*/React.createElement("polyline", {
    points: "22,6 12,13 2,6"
  })), /*#__PURE__*/React.createElement("input", {
    type: "email",
    placeholder: "student@example.com",
    value: studentEmailInput,
    onChange: e => setStudentEmailInput(e.target.value),
    disabled: studentLoading,
    className: "w-full pl-11 pr-4 py-3 rounded-xl bg-white/[0.03] border border-white/10 text-white text-xs placeholder-gray-600 focus:outline-none transition-all duration-300",
    style: {
      outline: 'none'
    },
    onFocus: e => {
      e.target.style.borderColor = '#00f0ff';
      e.target.style.boxShadow = '0 0 15px rgba(0, 240, 255, 0.15)';
    },
    onBlur: e => {
      e.target.style.borderColor = 'rgba(255,255,255,0.1)';
      e.target.style.boxShadow = 'none';
    }
  }))), studentError && /*#__PURE__*/React.createElement("div", {
    className: "mb-6 text-left text-rose-500 text-[10px] font-mono bg-rose-500/10 border border-rose-500/20 px-3.5 py-2.5 rounded-lg flex items-center space-x-1.5"
  }, /*#__PURE__*/React.createElement("svg", {
    xmlns: "http://www.w3.org/2000/svg",
    width: "14",
    height: "14",
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "2.5",
    strokeLinecap: "round",
    strokeLinejoin: "round",
    className: "text-rose-500 shrink-0"
  }, /*#__PURE__*/React.createElement("path", {
    d: "M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"
  }), /*#__PURE__*/React.createElement("line", {
    x1: "12",
    y1: "9",
    x2: "12",
    y2: "13"
  }), /*#__PURE__*/React.createElement("line", {
    x1: "12",
    y1: "17",
    x2: "12.01",
    y2: "17"
  })), /*#__PURE__*/React.createElement("span", null, studentError)), /*#__PURE__*/React.createElement("button", {
    type: "submit",
    disabled: studentLoading,
    className: "w-full py-3.5 rounded-xl text-xs font-bold uppercase tracking-wider text-white transition bg-gradient-to-r from-brand-cyan to-brand-blue shadow-[0_0_20px_rgba(0,240,255,0.15)] flex items-center justify-center gap-2"
  }, studentLoading && /*#__PURE__*/React.createElement("span", {
    className: "animate-spin rounded-full h-3.5 w-3.5 border border-black border-t-transparent"
  }), "Send Verification Code"), /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: () => closeStudentPortal(),
    className: "w-full mt-3 py-3 rounded-xl text-xs font-semibold uppercase tracking-wider text-gray-500 border border-white/10 hover:text-white hover:border-white/30 transition-all duration-300"
  }, "Cancel")) :
  /*#__PURE__*/
  /* Step 2: OTP Form */
  React.createElement("form", {
    onSubmit: handleStudentVerifyOTP,
    className: "max-w-md w-full p-8 liquid-glass border border-white/10 rounded-3xl text-center shadow-[0_20px_60px_rgba(0,240,255,0.05)] relative overflow-hidden"
  }, /*#__PURE__*/React.createElement("div", {
    className: "absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-brand-cyan to-brand-blue"
  }), /*#__PURE__*/React.createElement("div", {
    className: "w-14 h-14 rounded-2xl bg-brand-cyan/5 border border-brand-cyan/10 flex items-center justify-center mx-auto mb-6 text-brand-cyan"
  }, /*#__PURE__*/React.createElement("svg", {
    xmlns: "http://www.w3.org/2000/svg",
    width: "24",
    height: "24",
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "2",
    strokeLinecap: "round",
    strokeLinejoin: "round"
  }, /*#__PURE__*/React.createElement("rect", {
    x: "3",
    y: "11",
    width: "18",
    height: "11",
    rx: "2",
    ry: "2"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M7 11V7a5 5 0 0 1 10 0v4"
  }))), /*#__PURE__*/React.createElement("h2", {
    className: "text-xl font-black uppercase tracking-wider text-white font-heading mb-2"
  }, "Enter Passcode"), /*#__PURE__*/React.createElement("p", {
    className: "text-xs text-gray-500 mb-2 font-mono"
  }, "OTP SENT TO YOUR MAILBOX"), studentMessage && /*#__PURE__*/React.createElement("p", {
    className: "text-[10px] text-brand-cyan font-mono mb-8"
  }, studentMessage), /*#__PURE__*/React.createElement("div", {
    className: "text-left mb-6"
  }, /*#__PURE__*/React.createElement("label", {
    className: "text-[10px] font-mono text-gray-500 uppercase tracking-widest mb-1.5 block"
  }, "6-Digit Verification Code"), /*#__PURE__*/React.createElement("div", {
    className: "relative flex items-center"
  }, /*#__PURE__*/React.createElement("svg", {
    xmlns: "http://www.w3.org/2000/svg",
    width: "16",
    height: "16",
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "2",
    strokeLinecap: "round",
    strokeLinejoin: "round",
    className: "absolute left-4 text-gray-500"
  }, /*#__PURE__*/React.createElement("rect", {
    x: "3",
    y: "11",
    width: "18",
    height: "11",
    rx: "2",
    ry: "2"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M7 11V7a5 5 0 0 1 10 0v4"
  })), /*#__PURE__*/React.createElement("input", {
    type: "text",
    placeholder: "------",
    maxLength: 6,
    value: studentOtpInput,
    onChange: e => setStudentOtpInput(e.target.value.replace(/\D/g, '')),
    disabled: studentLoading,
    className: "w-full pl-11 pr-4 py-3 rounded-xl bg-white/[0.03] border border-white/10 text-white text-center tracking-[0.5em] text-sm focus:outline-none transition-all duration-300",
    style: {
      outline: 'none'
    },
    onFocus: e => {
      e.target.style.borderColor = '#00f0ff';
      e.target.style.boxShadow = '0 0 15px rgba(0, 240, 255, 0.15)';
    },
    onBlur: e => {
      e.target.style.borderColor = 'rgba(255,255,255,0.1)';
      e.target.style.boxShadow = 'none';
    }
  }))), studentError && /*#__PURE__*/React.createElement("div", {
    className: "mb-6 text-left text-rose-500 text-[10px] font-mono bg-rose-500/10 border border-rose-500/20 px-3.5 py-2.5 rounded-lg flex items-center space-x-1.5"
  }, /*#__PURE__*/React.createElement("svg", {
    xmlns: "http://www.w3.org/2000/svg",
    width: "14",
    height: "14",
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "2.5",
    strokeLinecap: "round",
    strokeLinejoin: "round",
    className: "text-rose-500 shrink-0"
  }, /*#__PURE__*/React.createElement("path", {
    d: "M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"
  }), /*#__PURE__*/React.createElement("line", {
    x1: "12",
    y1: "9",
    x2: "12",
    y2: "13"
  }), /*#__PURE__*/React.createElement("line", {
    x1: "12",
    y1: "17",
    x2: "12.01",
    y2: "17"
  })), /*#__PURE__*/React.createElement("span", null, studentError)), /*#__PURE__*/React.createElement("button", {
    type: "submit",
    disabled: studentLoading,
    className: "w-full py-3.5 rounded-xl text-xs font-bold uppercase tracking-wider text-white transition bg-gradient-to-r from-brand-cyan to-brand-blue shadow-[0_0_20px_rgba(0,240,255,0.15)] flex items-center justify-center gap-2"
  }, studentLoading && /*#__PURE__*/React.createElement("span", {
    className: "animate-spin rounded-full h-3.5 w-3.5 border border-black border-t-transparent"
  }), "Verify & Access Panel"), /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: () => {
      setStudentLoginStep(1);
      setStudentOtpInput('');
      setStudentError('');
      setStudentMessage('');
    },
    className: "mt-6 text-xs text-brand-violet hover:text-white transition duration-200 uppercase font-bold font-mono tracking-wider"
  }, "\u2190 Change email"))) :
  /*#__PURE__*/
  /* Student Dashboard View */
  React.createElement("div", {
    className: "flex-grow flex flex-col text-gray-300"
  }, /*#__PURE__*/React.createElement("header", {
    className: "px-4 md:px-8 py-3 md:py-3.5 border-b border-white/[0.04] bg-zinc-950/60 backdrop-blur-xl sticky top-0 z-50"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center justify-between gap-2"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center space-x-3 text-left"
  }, /*#__PURE__*/React.createElement("div", {
    className: "w-9 h-9 rounded-xl bg-gradient-to-br from-brand-cyan/20 to-brand-blue/10 border border-brand-cyan/20 flex items-center justify-center text-brand-cyan shrink-0 shadow-[0_0_12px_rgba(0,240,255,0.08)]"
  }, /*#__PURE__*/React.createElement("svg", {
    xmlns: "http://www.w3.org/2000/svg",
    width: "18",
    height: "18",
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "2.5",
    strokeLinecap: "round",
    strokeLinejoin: "round"
  }, /*#__PURE__*/React.createElement("path", {
    d: "M22 10v6M2 10l10-5 10 5-10 5z"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M6 12v5c0 2 2 3 6 3s6-1 6-3v-5"
  }))), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("h1", {
    className: "text-xs font-black tracking-widest font-mono text-white flex items-center"
  }, "DXIGN.LEARN"), /*#__PURE__*/React.createElement("p", {
    className: "text-[8px] font-mono text-gray-500 uppercase tracking-widest mt-0.5"
  }, "Welcome back, ", studentUser.name || 'Student'))), /*#__PURE__*/React.createElement("div", {
    className: "flex items-center space-x-2 shrink-0"
  }, /*#__PURE__*/React.createElement("button", {
    onClick: handleStudentLogout,
    className: "px-3 py-1.5 rounded-xl bg-white/[0.04] border border-white/[0.06] text-[10px] font-mono font-bold text-rose-400 hover:bg-rose-500/20 hover:text-rose-300 hover:border-rose-500/30 transition-all duration-200 flex items-center gap-1.5"
  }, /*#__PURE__*/React.createElement("svg", {
    xmlns: "http://www.w3.org/2000/svg",
    width: "10",
    height: "10",
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "2.5",
    strokeLinecap: "round",
    strokeLinejoin: "round"
  }, /*#__PURE__*/React.createElement("path", {
    d: "M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"
  }), /*#__PURE__*/React.createElement("polyline", {
    points: "16 17 21 12 16 7"
  }), /*#__PURE__*/React.createElement("line", {
    x1: "21",
    y1: "12",
    x2: "9",
    y2: "12"
  })), "Sign Out"), /*#__PURE__*/React.createElement("button", {
    onClick: closeStudentPortal,
    className: "w-8 h-8 rounded-xl bg-white/[0.04] border border-white/[0.06] flex items-center justify-center text-gray-500 hover:text-white hover:bg-white/10 transition-all duration-200"
  }, /*#__PURE__*/React.createElement("svg", {
    xmlns: "http://www.w3.org/2000/svg",
    width: "14",
    height: "14",
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "2.5",
    strokeLinecap: "round",
    strokeLinejoin: "round"
  }, /*#__PURE__*/React.createElement("line", {
    x1: "18",
    y1: "6",
    x2: "6",
    y2: "18"
  }), /*#__PURE__*/React.createElement("line", {
    x1: "6",
    y1: "6",
    x2: "18",
    y2: "18"
  })))))), /*#__PURE__*/React.createElement("main", {
    className: "flex-grow flex flex-col lg:flex-row lg:max-h-[calc(100vh-125px)]"
  }, /*#__PURE__*/React.createElement("aside", {
    className: "hidden lg:block lg:w-64 border-r border-white/[0.04] bg-zinc-950/10 p-3 space-y-1.5 overflow-x-auto shrink-0 flex lg:flex-col flex-row gap-1.5 lg:gap-0"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-2 px-1 mb-3"
  }, /*#__PURE__*/React.createElement("div", {
    className: "w-1.5 h-1.5 rounded-full bg-brand-cyan shadow-[0_0_6px_rgba(0,240,255,0.4)]"
  }), /*#__PURE__*/React.createElement("h3", {
    className: "text-[9px] font-mono text-gray-500 uppercase tracking-widest font-bold"
  }, "My Programs")), Object.keys(DEFAULT_COURSE_CURRICULUM).map(courseName => {
    const enrolled = studentUser.courses.includes(courseName) || studentUser.courses.includes('All Courses Lifetime Access');
    const active = studentSelectedCourse === courseName;
    const courseInfo = courseList.find(c => c.title.toLowerCase().includes(courseName.toLowerCase()) || courseName.toLowerCase().includes(c.id.replace('-', ' '))) || {
      duration: '6 Weeks'
    };
    return /*#__PURE__*/React.createElement("button", {
      key: courseName,
      onClick: () => {
        setStudentSelectedCourse(courseName);
        const saved = getLastWatchedVideo(courseName);
        if (saved) setStudentActiveVideo(saved);else {
          const currentList = getMergedLectures()[courseName] || [];
          setStudentActiveVideo(currentList[0] || null);
        }
      },
      className: `w-full px-3.5 py-3 rounded-2xl border text-left flex items-center justify-between transition-all shrink-0 ${active ? 'bg-gradient-to-r from-brand-cyan/10 to-brand-blue/[0.04] border-brand-cyan/20 text-white shadow-[0_0_20px_rgba(0,240,255,0.06)]' : 'bg-white/[0.02] hover:bg-white/[0.05] border-white/[0.05] text-gray-400 hover:text-white hover:border-white/10'} group`,
      style: active ? {
        backdropFilter: 'blur(12px)'
      } : {}
    }, /*#__PURE__*/React.createElement("div", {
      className: "flex items-center space-x-2.5 truncate"
    }, /*#__PURE__*/React.createElement("div", {
      className: `w-7 h-7 rounded-xl flex items-center justify-center shrink-0 border transition-all ${active ? 'bg-brand-cyan border-brand-cyan text-black font-bold shadow-[0_0_10px_rgba(0,240,255,0.2)]' : 'bg-white/[0.04] border-white/[0.08] text-gray-400 group-hover:text-brand-cyan'}`
    }, /*#__PURE__*/React.createElement("svg", {
      xmlns: "http://www.w3.org/2000/svg",
      width: "12",
      height: "12",
      viewBox: "0 0 24 24",
      fill: "none",
      stroke: "currentColor",
      strokeWidth: "2.5",
      strokeLinecap: "round",
      strokeLinejoin: "round"
    }, /*#__PURE__*/React.createElement("path", {
      d: "M22 10v6M2 10l10-5 10 5-10 5z"
    }), /*#__PURE__*/React.createElement("path", {
      d: "M6 12v5c0 2 2 3 6 3s6-1 6-3v-5"
    }))), /*#__PURE__*/React.createElement("div", {
      className: "truncate text-left"
    }, /*#__PURE__*/React.createElement("p", {
      className: "text-[11px] font-bold text-gray-200 truncate group-hover:text-white transition"
    }, courseName), /*#__PURE__*/React.createElement("div", {
      className: "flex items-center gap-1.5 mt-0.5 text-[8px] font-mono text-gray-500"
    }, /*#__PURE__*/React.createElement("span", null, courseInfo.duration), /*#__PURE__*/React.createElement("span", null, "\u2022"), /*#__PURE__*/React.createElement("span", {
      className: `uppercase font-bold ${enrolled ? 'text-brand-cyan' : 'text-rose-400'}`
    }, enrolled ? 'Enrolled' : 'Locked')))), enrolled ? /*#__PURE__*/React.createElement("div", {
      className: "w-5 h-5 rounded-lg bg-brand-cyan/10 border border-brand-cyan/20 flex items-center justify-center"
    }, /*#__PURE__*/React.createElement("svg", {
      xmlns: "http://www.w3.org/2000/svg",
      viewBox: "0 0 24 24",
      fill: "none",
      stroke: "currentColor",
      strokeWidth: "2.5",
      strokeLinecap: "round",
      strokeLinejoin: "round",
      className: "w-3 h-3 text-brand-cyan"
    }, /*#__PURE__*/React.createElement("polyline", {
      points: "9 18 15 12 9 6"
    }))) : /*#__PURE__*/React.createElement("span", {
      className: "text-[10px] text-rose-400 shrink-0 ml-1"
    }, "\uD83D\uDD12"));
  })), /*#__PURE__*/React.createElement("section", {
    className: "flex-grow p-3 md:p-6 flex flex-col space-y-4 overflow-y-auto lg:max-h-full"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex justify-center shrink-0"
  }, /*#__PURE__*/React.createElement("div", {
    className: "inline-flex items-center gap-1 bg-[#0f0f15]/80 border border-white/[0.06] rounded-full p-1 font-mono text-[9px] font-bold"
  }, /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: () => {
      setStudentTab('courses');
      closeChatPopup();
    },
    className: `px-5 py-2 rounded-full flex items-center gap-1.5 transition-all duration-300 ${studentTab === 'courses' && (!studentChatOpen || closingChatPopup) ? 'bg-brand-cyan text-black font-bold shadow-[0_0_15px_rgba(0,240,255,0.3)]' : 'text-gray-400 hover:text-white'}`
  }, /*#__PURE__*/React.createElement("svg", {
    xmlns: "http://www.w3.org/2000/svg",
    width: "12",
    height: "12",
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "2.5",
    className: "w-3.5 h-3.5"
  }, /*#__PURE__*/React.createElement("polygon", {
    points: "23 7 16 12 23 17 23 7"
  }), /*#__PURE__*/React.createElement("rect", {
    x: "1",
    y: "5",
    width: "15",
    height: "14",
    rx: "2",
    ry: "2"
  })), "Video"), /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: () => {
      setStudentTab('chat');
      setClosingChatPopup(false);
      setStudentChatOpen(true);
    },
    className: `px-5 py-2 rounded-full flex items-center gap-1.5 transition-all duration-300 ${studentTab === 'chat' || studentChatOpen || closingChatPopup ? 'bg-brand-cyan text-black font-bold shadow-[0_0_15px_rgba(0,240,255,0.3)]' : 'text-gray-400 hover:text-white'}`
  }, /*#__PURE__*/React.createElement("svg", {
    xmlns: "http://www.w3.org/2000/svg",
    width: "12",
    height: "12",
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "2.5",
    className: "w-3.5 h-3.5"
  }, /*#__PURE__*/React.createElement("path", {
    d: "M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"
  })), "Chat"))), /*#__PURE__*/React.createElement("div", {
    className: "w-full aspect-video rounded-[20px] overflow-hidden bg-black/50 border border-white/[0.06] shadow-2xl relative shrink-0",
    style: {
      boxShadow: '0 8px 40px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.04)'
    }
  }, (() => {
    const enrolled = studentUser.courses.includes(studentSelectedCourse) || studentUser.courses.includes('All Courses Lifetime Access');
    if (!enrolled) {
      return /*#__PURE__*/React.createElement("div", {
        className: "absolute inset-0 flex flex-col items-center justify-center p-8 text-center bg-zinc-950/90 backdrop-blur-sm"
      }, /*#__PURE__*/React.createElement("div", {
        className: "w-16 h-16 rounded-3xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-500 mb-6 animate-pulse"
      }, /*#__PURE__*/React.createElement("svg", {
        xmlns: "http://www.w3.org/2000/svg",
        width: "28",
        height: "28",
        viewBox: "0 0 24 24",
        fill: "none",
        stroke: "currentColor",
        strokeWidth: "2",
        strokeLinecap: "round",
        strokeLinejoin: "round"
      }, /*#__PURE__*/React.createElement("rect", {
        x: "3",
        y: "11",
        width: "18",
        height: "11",
        rx: "2",
        ry: "2"
      }), /*#__PURE__*/React.createElement("path", {
        d: "M7 11V7a5 5 0 0 1 10 0v4"
      }))), /*#__PURE__*/React.createElement("h2", {
        className: "text-xl font-black uppercase text-white font-heading tracking-wide mb-2"
      }, "COURSE LOCKED"), /*#__PURE__*/React.createElement("p", {
        className: "text-xs text-gray-500 max-w-sm mb-6"
      }, "You are not currently enrolled in the ", /*#__PURE__*/React.createElement("span", {
        className: "text-white font-bold"
      }, studentSelectedCourse), " training program."), /*#__PURE__*/React.createElement("button", {
        onClick: handleGeneralEnroll,
        className: "px-6 py-3.5 rounded-2xl text-xs font-bold uppercase tracking-wider text-black bg-brand-cyan hover:scale-[1.02] active:scale-[0.98] transition-all shadow-[0_0_20px_rgba(0,240,255,0.2)]"
      }, "GET FREE ACCESS"));
    }
    if (!studentActiveVideo) {
      return /*#__PURE__*/React.createElement("div", {
        className: "absolute inset-0 flex flex-col items-center justify-center p-8 text-center"
      }, /*#__PURE__*/React.createElement("svg", {
        xmlns: "http://www.w3.org/2000/svg",
        width: "36",
        height: "36",
        viewBox: "0 0 24 24",
        fill: "none",
        stroke: "currentColor",
        strokeWidth: "1.5",
        strokeLinecap: "round",
        strokeLinejoin: "round",
        className: "text-gray-600 mb-4 animate-bounce"
      }, /*#__PURE__*/React.createElement("polygon", {
        points: "23 7 16 12 23 17 23 7"
      }), /*#__PURE__*/React.createElement("rect", {
        x: "1",
        y: "5",
        width: "15",
        height: "14",
        rx: "2",
        ry: "2"
      })), /*#__PURE__*/React.createElement("p", {
        className: "text-xs text-gray-500"
      }, "Select a lesson from the syllabus sidebar to start streaming"));
    }
    const videoId = getYoutubeEmbedUrl(studentActiveVideo.videoUrl);
    if (videoId) {
      const lectureList = getMergedLectures()[studentSelectedCourse] || [];
      const curIdx = lectureList.findIndex(l => l.id === studentActiveVideo.id);
      return /*#__PURE__*/React.createElement(YouTubeCustomPlayer, {
        key: studentActiveVideo.id,
        videoId: videoId,
        resumePosition: getVideoProgress(studentActiveVideo.id),
        onPrev: curIdx > 0 ? () => setStudentActiveVideo(lectureList[curIdx - 1]) : null,
        onNext: curIdx < lectureList.length - 1 ? () => setStudentActiveVideo(lectureList[curIdx + 1]) : null
      });
    }
    return /*#__PURE__*/React.createElement("video", {
      key: studentActiveVideo.id,
      ref: studentNativeVideoRef,
      src: getAttachmentUrl(studentActiveVideo.videoUrl),
      controls: true,
      onLoadedMetadata: () => {
        const pos = getVideoProgress(studentActiveVideo.id);
        if (pos > 0 && studentNativeVideoRef.current) studentNativeVideoRef.current.currentTime = pos;
      },
      className: "w-full h-full object-contain",
      style: {
        display: 'block'
      }
    });
  })(), (studentChatOpen || closingChatPopup) && /*#__PURE__*/React.createElement("div", {
    className: `absolute lg:inset-0 max-lg:fixed max-lg:inset-0 max-lg:z-[100003] flex flex-col bg-zinc-950/95 backdrop-blur-md rounded-[20px] overflow-hidden ${closingChatPopup ? 'animate-slideDownOut' : 'animate-slideUp'}`,
    onClick: e => e.stopPropagation(),
    style: {
      backdropFilter: 'blur(24px)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "px-4 py-3.5 border-b border-white/[0.05] flex items-center justify-between shrink-0"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center space-x-2.5"
  }, /*#__PURE__*/React.createElement("div", {
    className: "relative"
  }, /*#__PURE__*/React.createElement("div", {
    className: "w-8 h-8 rounded-xl bg-gradient-to-br from-brand-cyan/20 to-brand-blue/10 border border-brand-cyan/20 flex items-center justify-center"
  }, /*#__PURE__*/React.createElement("svg", {
    xmlns: "http://www.w3.org/2000/svg",
    width: "14",
    height: "14",
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "2.5",
    strokeLinecap: "round",
    strokeLinejoin: "round",
    className: "text-brand-cyan"
  }, /*#__PURE__*/React.createElement("path", {
    d: "M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"
  }))), /*#__PURE__*/React.createElement("div", {
    className: "absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border border-zinc-950 bg-brand-emerald"
  })), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("h3", {
    className: "text-xs font-black uppercase text-white font-heading"
  }, "Doubt Clearance"), /*#__PURE__*/React.createElement("p", {
    className: "text-[8px] font-mono text-gray-500"
  }, "\uD83D\uDFE2 Online \u2022 ~4 min response"))), /*#__PURE__*/React.createElement("button", {
    onClick: closeChatPopup,
    className: "w-7 h-7 rounded-lg bg-white/[0.04] border border-white/[0.06] flex items-center justify-center text-gray-500 hover:text-white hover:bg-white/10 transition-all"
  }, /*#__PURE__*/React.createElement("svg", {
    xmlns: "http://www.w3.org/2000/svg",
    width: "12",
    height: "12",
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "2.5",
    strokeLinecap: "round",
    strokeLinejoin: "round"
  }, /*#__PURE__*/React.createElement("line", {
    x1: "18",
    y1: "6",
    x2: "6",
    y2: "18"
  }), /*#__PURE__*/React.createElement("line", {
    x1: "6",
    y1: "6",
    x2: "18",
    y2: "18"
  })))), /*#__PURE__*/React.createElement("div", {
    key: `${studentChatOpen}-${studentChatMessages.length}`,
    className: "flex-grow p-4 overflow-y-auto overflow-x-hidden flex flex-col space-y-3 min-h-0",
    ref: el => {
      if (el) setTimeout(() => el.scrollTop = el.scrollHeight, 100);
    }
  }, studentChatMessages.length === 0 ? /*#__PURE__*/React.createElement("div", {
    className: "flex flex-col items-center justify-center h-full text-center text-gray-600 py-12"
  }, /*#__PURE__*/React.createElement("svg", {
    xmlns: "http://www.w3.org/2000/svg",
    width: "28",
    height: "28",
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "2",
    strokeLinecap: "round",
    strokeLinejoin: "round",
    className: "mb-3 opacity-50"
  }, /*#__PURE__*/React.createElement("path", {
    d: "M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"
  })), /*#__PURE__*/React.createElement("p", {
    className: "text-[11px] font-mono text-gray-500"
  }, "Welcome! \uD83D\uDC4B Ask your doubt below and a mentor will respond shortly.")) : studentChatMessages.map(msg => {
    const isMe = msg.sender === studentUser.email;
    const timestamp = msg.timestamp ? new Date(msg.timestamp.seconds ? msg.timestamp.seconds * 1000 : msg.timestamp).toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit'
    }) : 'just now';
    return /*#__PURE__*/React.createElement("div", {
      key: msg.id,
      className: `flex flex-col max-w-[85%] ${isMe ? 'ml-auto items-end' : 'mr-auto items-start'}`
    }, /*#__PURE__*/React.createElement("span", {
      className: `text-[8px] font-mono mb-1.5 px-1.5 ${isMe ? 'text-gray-500' : 'text-brand-cyan/70'}`
    }, msg.name || (isMe ? 'You' : 'Mentor')), msg.type === 'text' && /*#__PURE__*/React.createElement("div", {
      className: `px-4 py-2.5 text-[12px] leading-[1.6] shadow-sm ${isMe ? 'bg-gradient-to-br from-brand-cyan to-brand-blue text-black rounded-[18px] rounded-br-[5px]' : 'bg-[#1c1c22] text-gray-100 border border-white/[0.04] rounded-[18px] rounded-bl-[5px]'}`
    }, renderParsedTextWeb(msg.text)), msg.type === 'image' && /*#__PURE__*/React.createElement("div", {
      onClick: () => {
        setActivePreviewMedia({
          type: 'image',
          url: msg.fileUrl
        });
        setMediaPreviewLoading(true);
      },
      className: "rounded-[18px] border border-white/[0.04] overflow-hidden max-w-[220px] bg-black shadow-sm cursor-pointer hover:border-brand-cyan/30 transition-all"
    }, /*#__PURE__*/React.createElement("img", {
      src: msg.fileUrl,
      alt: "",
      className: "max-h-48 w-full object-cover block"
    }), msg.fileName && /*#__PURE__*/React.createElement("p", {
      className: "p-2.5 bg-black/40 text-[9px] font-mono text-gray-400 truncate border-t border-white/[0.04]"
    }, msg.fileName)), msg.type === 'video' && /*#__PURE__*/React.createElement("div", {
      onClick: () => {
        setActivePreviewMedia({
          type: 'video',
          url: msg.fileUrl
        });
        setMediaPreviewLoading(true);
      },
      className: "rounded-[18px] border border-white/[0.04] overflow-hidden max-w-[260px] bg-black shadow-sm cursor-pointer hover:border-brand-cyan/30 transition-all"
    }, /*#__PURE__*/React.createElement("video", {
      src: msg.fileUrl,
      className: "max-h-48 w-full object-cover block",
      controls: true,
      preload: "metadata"
    }), msg.fileName && /*#__PURE__*/React.createElement("p", {
      className: "p-2.5 bg-black/40 text-[9px] font-mono text-gray-400 truncate border-t border-white/[0.04]"
    }, msg.fileName)), msg.type === 'document' && /*#__PURE__*/React.createElement("a", {
      href: msg.fileUrl,
      target: "_blank",
      rel: "noreferrer",
      className: `px-4 py-3 rounded-[18px] text-[12px] flex items-center space-x-3 max-w-[240px] shadow-sm transition-all ${isMe ? 'bg-gradient-to-br from-brand-cyan/20 to-brand-blue/10 border border-brand-cyan/20 hover:border-brand-cyan/40' : 'bg-[#1c1c22] border border-white/[0.04] hover:border-white/10'}`
    }, /*#__PURE__*/React.createElement("div", {
      className: `w-8 h-8 rounded-xl flex items-center justify-center ${isMe ? 'bg-brand-cyan/20' : 'bg-white/[0.04]'}`
    }, /*#__PURE__*/React.createElement("svg", {
      xmlns: "http://www.w3.org/2000/svg",
      width: "14",
      height: "14",
      viewBox: "0 0 24 24",
      fill: "none",
      stroke: "currentColor",
      strokeWidth: "2",
      className: "text-brand-cyan"
    }, /*#__PURE__*/React.createElement("path", {
      d: "M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"
    }), /*#__PURE__*/React.createElement("polyline", {
      points: "14 2 14 8 20 8"
    }))), /*#__PURE__*/React.createElement("span", {
      className: "truncate text-gray-200 font-semibold text-[11px]"
    }, msg.fileName || 'Download')), /*#__PURE__*/React.createElement("div", {
      className: "flex items-center space-x-1.5 text-[7px] font-mono mt-1.5 px-1.5"
    }, /*#__PURE__*/React.createElement("span", {
      className: "text-gray-500"
    }, timestamp), isMe && /*#__PURE__*/React.createElement("span", {
      className: msg.status === 'read' ? 'text-brand-cyan font-bold' : 'text-gray-500'
    }, msg.status === 'read' ? '✓✓' : '✓')));
  })), /*#__PURE__*/React.createElement("div", {
    className: "px-4 py-3 border-t border-white/[0.05] bg-zinc-950/80 shrink-0 overflow-x-hidden"
  }, studentIsRecording ? /*#__PURE__*/React.createElement("div", {
    className: "flex items-center justify-between px-3 py-2 rounded-[14px] bg-rose-500/10 border border-rose-500/20"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center space-x-2"
  }, /*#__PURE__*/React.createElement("span", {
    className: "w-2 h-2 rounded-full bg-rose-500 animate-ping"
  }), /*#__PURE__*/React.createElement("span", {
    className: "text-[10px] font-mono text-rose-500"
  }, "Recording ", Math.floor(studentRecordingDuration / 60), ":", String(studentRecordingDuration % 60).padStart(2, '0'))), /*#__PURE__*/React.createElement("div", {
    className: "flex items-center space-x-1.5"
  }, /*#__PURE__*/React.createElement("button", {
    onClick: cancelStudentVoiceRecording,
    className: "w-8 h-8 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-gray-400 hover:text-white transition"
  }, /*#__PURE__*/React.createElement("svg", {
    xmlns: "http://www.w3.org/2000/svg",
    width: "12",
    height: "12",
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "2.5"
  }, /*#__PURE__*/React.createElement("polyline", {
    points: "3 6 5 6 21 6"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"
  }))), /*#__PURE__*/React.createElement("button", {
    onClick: stopStudentVoiceRecording,
    className: "px-3 py-1.5 h-8 rounded-xl bg-rose-500 text-white text-[9px] font-bold uppercase flex items-center gap-1 hover:scale-[1.02] transition"
  }, "Send"))) : studentUploadingProgress !== null ? /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-3 px-4 py-3 rounded-[16px] bg-gradient-to-r from-brand-cyan/[0.08] to-brand-blue/[0.05] border border-brand-cyan/15 overflow-hidden relative"
  }, /*#__PURE__*/React.createElement("div", {
    className: "w-8 h-8 rounded-xl bg-gradient-to-br from-brand-cyan to-brand-blue flex items-center justify-center shadow-[0_0_12px_rgba(0,240,255,0.2)] shrink-0"
  }, /*#__PURE__*/React.createElement("svg", {
    xmlns: "http://www.w3.org/2000/svg",
    width: "14",
    height: "14",
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "black",
    strokeWidth: "2.5",
    strokeLinecap: "round",
    strokeLinejoin: "round"
  }, /*#__PURE__*/React.createElement("path", {
    d: "M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"
  }), /*#__PURE__*/React.createElement("polyline", {
    points: "17 8 12 3 7 8"
  }), /*#__PURE__*/React.createElement("line", {
    x1: "12",
    y1: "3",
    x2: "12",
    y2: "15"
  }))), /*#__PURE__*/React.createElement("div", {
    className: "flex-grow flex flex-col gap-1"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center justify-between"
  }, /*#__PURE__*/React.createElement("span", {
    className: "text-[9px] font-mono font-bold text-brand-cyan uppercase tracking-wider"
  }, "Uploading"), /*#__PURE__*/React.createElement("span", {
    className: "text-[9px] font-mono text-brand-cyan font-bold tabular-nums"
  }, studentUploadingProgress, "%")), /*#__PURE__*/React.createElement("div", {
    className: "w-full h-[3px] rounded-full bg-white/5 overflow-hidden"
  }, /*#__PURE__*/React.createElement("div", {
    className: "h-full rounded-full bg-gradient-to-r from-brand-cyan to-brand-blue transition-all duration-300 ease-out",
    style: {
      width: `${studentUploadingProgress}%`
    }
  }))), /*#__PURE__*/React.createElement("div", {
    className: "absolute inset-0 pointer-events-none overflow-hidden rounded-[16px]"
  }, /*#__PURE__*/React.createElement("div", {
    className: "absolute inset-y-0 w-32 bg-gradient-to-r from-transparent via-white/5 to-transparent animate-shimmer"
  }))) : /*#__PURE__*/React.createElement("form", {
    onSubmit: handleSendStudentMessage,
    className: "flex items-center space-x-2"
  }, /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: () => setStudentChatEmojiOpen(!studentChatEmojiOpen),
    className: "w-9 h-9 rounded-xl bg-white/[0.02] border border-white/[0.05] flex items-center justify-center text-gray-400 hover:text-white transition shrink-0"
  }, /*#__PURE__*/React.createElement("svg", {
    xmlns: "http://www.w3.org/2000/svg",
    width: "14",
    height: "14",
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "2.5"
  }, /*#__PURE__*/React.createElement("circle", {
    cx: "12",
    cy: "12",
    r: "10"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M8 14s1.5 2 4 2 4-2 4-2"
  }), /*#__PURE__*/React.createElement("line", {
    x1: "9",
    y1: "9",
    x2: "9.01",
    y2: "9"
  }), /*#__PURE__*/React.createElement("line", {
    x1: "15",
    y1: "9",
    x2: "15.01",
    y2: "9"
  }))), /*#__PURE__*/React.createElement("label", {
    className: "w-9 h-9 rounded-xl bg-white/[0.02] border border-white/[0.05] flex items-center justify-center text-gray-400 hover:text-white cursor-pointer transition shrink-0"
  }, /*#__PURE__*/React.createElement("input", {
    type: "file",
    className: "hidden",
    onChange: handleStudentFileUpload,
    disabled: studentChatSending,
    accept: "image/*,video/*,audio/*,.pdf,.doc,.docx,.zip,.rar,.txt,.ppt,.pptx,.xls,.xlsx"
  }), /*#__PURE__*/React.createElement("svg", {
    xmlns: "http://www.w3.org/2000/svg",
    width: "14",
    height: "14",
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "2.5"
  }, /*#__PURE__*/React.createElement("path", {
    d: "M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"
  }))), /*#__PURE__*/React.createElement("input", {
    type: "text",
    placeholder: studentChatSending ? "Sending..." : "Type your doubt...",
    value: studentChatInput,
    onChange: e => setStudentChatInput(e.target.value),
    disabled: studentChatSending,
    className: "flex-grow px-3.5 py-2 rounded-xl bg-white/[0.02] border border-white/[0.06] text-white text-[11px] placeholder-gray-600 focus:outline-none focus:border-brand-cyan/30 transition",
    style: {
      outline: 'none'
    }
  }), /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: startStudentVoiceRecording,
    disabled: studentChatSending,
    className: "w-9 h-9 rounded-xl bg-white/[0.02] border border-white/[0.05] flex items-center justify-center text-gray-400 hover:text-rose-500 transition shrink-0 disabled:opacity-50"
  }, /*#__PURE__*/React.createElement("svg", {
    xmlns: "http://www.w3.org/2000/svg",
    width: "14",
    height: "14",
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "2.5"
  }, /*#__PURE__*/React.createElement("path", {
    d: "M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M19 10v1a7 7 0 0 1-14 0v-1"
  }), /*#__PURE__*/React.createElement("line", {
    x1: "12",
    y1: "19",
    x2: "12",
    y2: "23"
  }), /*#__PURE__*/React.createElement("line", {
    x1: "8",
    y1: "23",
    x2: "16",
    y2: "23"
  }))), /*#__PURE__*/React.createElement("button", {
    type: "submit",
    disabled: !studentChatInput.trim() || studentChatSending,
    className: "w-9 h-9 rounded-xl bg-brand-cyan hover:scale-[1.03] active:scale-[0.97] flex items-center justify-center text-black shadow-[0_0_12px_rgba(0,240,255,0.2)] transition disabled:opacity-30 disabled:scale-100 disabled:shadow-none shrink-0"
  }, /*#__PURE__*/React.createElement("svg", {
    xmlns: "http://www.w3.org/2000/svg",
    width: "14",
    height: "14",
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "2.5",
    className: "ml-0.5"
  }, /*#__PURE__*/React.createElement("line", {
    x1: "22",
    y1: "2",
    x2: "11",
    y2: "13"
  }), /*#__PURE__*/React.createElement("polygon", {
    points: "22 2 15 22 11 13 2 9 22 2"
  }))))))), /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
    className: "lg:hidden flex items-center gap-1 bg-white/[0.03] border border-white/[0.06] rounded-[14px] p-1 font-mono text-[9px] font-bold"
  }, /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: () => setStudentMobileTab('syllabus'),
    className: `flex-1 py-2 rounded-[10px] transition-all duration-200 flex items-center justify-center gap-1.5 ${studentMobileTab === 'syllabus' ? 'bg-gradient-to-r from-brand-cyan to-brand-blue text-black shadow-[0_0_15px_rgba(0,240,255,0.2)]' : 'text-gray-400 hover:text-white hover:bg-white/[0.04]'}`
  }, /*#__PURE__*/React.createElement("svg", {
    xmlns: "http://www.w3.org/2000/svg",
    width: "12",
    height: "12",
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "2.5"
  }, /*#__PURE__*/React.createElement("path", {
    d: "M4 19.5A2.5 2.5 0 0 1 6.5 17H20"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"
  })), "Syllabus"), /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: () => setStudentMobileTab('about'),
    className: `flex-1 py-2 rounded-[10px] transition-all duration-200 flex items-center justify-center gap-1.5 ${studentMobileTab === 'about' ? 'bg-gradient-to-r from-brand-cyan to-brand-blue text-black shadow-[0_0_15px_rgba(0,240,255,0.2)]' : 'text-gray-400 hover:text-white hover:bg-white/[0.04]'}`
  }, /*#__PURE__*/React.createElement("svg", {
    xmlns: "http://www.w3.org/2000/svg",
    width: "12",
    height: "12",
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "2.5"
  }, /*#__PURE__*/React.createElement("circle", {
    cx: "12",
    cy: "12",
    r: "10"
  }), /*#__PURE__*/React.createElement("line", {
    x1: "12",
    y1: "16",
    x2: "12",
    y2: "12"
  }), /*#__PURE__*/React.createElement("line", {
    x1: "12",
    y1: "8",
    x2: "12.01",
    y2: "8"
  })), "About Lesson"), /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: () => setStudentMobileTab('programs'),
    className: `flex-1 py-2 rounded-[10px] transition-all duration-200 flex items-center justify-center gap-1.5 ${studentMobileTab === 'programs' ? 'bg-gradient-to-r from-brand-cyan to-brand-blue text-black shadow-[0_0_15px_rgba(0,240,255,0.2)]' : 'text-gray-400 hover:text-white hover:bg-white/[0.04]'}`
  }, /*#__PURE__*/React.createElement("svg", {
    xmlns: "http://www.w3.org/2000/svg",
    width: "12",
    height: "12",
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "2.5"
  }, /*#__PURE__*/React.createElement("path", {
    d: "M22 10v6M2 10l10-5 10 5-10 5z"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M6 12v5c0 2 2 3 6 3s6-1 6-3v-5"
  })), "My Programs")), /*#__PURE__*/React.createElement("div", {
    className: "lg:hidden space-y-3"
  }, /*#__PURE__*/React.createElement("div", {
    className: studentMobileTab === 'syllabus' ? 'block' : 'hidden'
  }, /*#__PURE__*/React.createElement("div", {
    className: "text-left"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex flex-wrap items-center justify-between gap-3 mb-3 px-0.5"
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("span", {
    className: "text-[8px] font-mono font-bold uppercase tracking-widest text-brand-cyan/80"
  }, studentSelectedCourse), /*#__PURE__*/React.createElement("h2", {
    className: "text-base font-black text-white tracking-tight mt-0.5"
  }, "Course Syllabus")), /*#__PURE__*/React.createElement("span", {
    className: "px-2.5 py-1 text-[7px] font-mono font-bold rounded-lg border border-brand-violet/20 bg-brand-violet/5 text-brand-violet uppercase"
  }, (getMergedLectures()[studentSelectedCourse] || []).length, " Lectures")), /*#__PURE__*/React.createElement("div", {
    className: "space-y-2"
  }, (() => {
    const list = getMergedLectures()[studentSelectedCourse] || [];
    const enrolled = studentUser.courses.includes(studentSelectedCourse) || studentUser.courses.includes('All Courses Lifetime Access');
    if (list.length === 0) {
      return /*#__PURE__*/React.createElement("p", {
        className: "text-xs text-gray-600 italic font-mono"
      }, "No lectures uploaded for this syllabus yet.");
    }
    return list.map((item, index) => {
      const active = studentActiveVideo && studentActiveVideo.id === item.id;
      return /*#__PURE__*/React.createElement("button", {
        key: item.id,
        onClick: () => enrolled && setStudentActiveVideo(item),
        className: `w-full p-3 rounded-[14px] border text-left flex items-center justify-between transition-all ${!enrolled ? 'opacity-40 cursor-not-allowed bg-transparent border-white/[0.04]' : active ? 'bg-gradient-to-r from-brand-cyan/8 to-brand-blue/[0.03] border-brand-cyan/15 text-white' : 'bg-white/[0.015] hover:bg-white/[0.03] border-white/[0.04] text-gray-400 hover:text-white hover:border-white/10'} group`,
        style: active ? {
          backdropFilter: 'blur(8px)'
        } : {}
      }, /*#__PURE__*/React.createElement("div", {
        className: "flex items-center space-x-2.5 truncate"
      }, /*#__PURE__*/React.createElement("div", {
        className: `w-7 h-7 rounded-[10px] flex items-center justify-center shrink-0 text-[9px] font-mono font-bold border transition-all ${active ? 'bg-brand-cyan border-brand-cyan text-black' : 'bg-white/[0.04] border-white/[0.08] text-gray-400 group-hover:text-brand-cyan'}`
      }, index + 1), /*#__PURE__*/React.createElement("div", {
        className: "truncate text-left"
      }, /*#__PURE__*/React.createElement("p", {
        className: "text-[11px] font-bold text-gray-200 truncate group-hover:text-white transition"
      }, item.title), /*#__PURE__*/React.createElement("div", {
        className: "flex items-center gap-1.5 mt-0.5 text-[8px] font-mono text-gray-500"
      }, /*#__PURE__*/React.createElement("span", null, item.duration), /*#__PURE__*/React.createElement("span", null, "\u2022"), /*#__PURE__*/React.createElement("span", {
        className: "uppercase text-brand-violet font-bold"
      }, item.difficulty || 'Beginner')))), active ? /*#__PURE__*/React.createElement("div", {
        className: "w-5 h-5 rounded-lg bg-brand-cyan/10 border border-brand-cyan/20 flex items-center justify-center shrink-0"
      }, /*#__PURE__*/React.createElement("svg", {
        xmlns: "http://www.w3.org/2000/svg",
        viewBox: "0 0 24 24",
        fill: "none",
        stroke: "currentColor",
        strokeWidth: "2.5",
        strokeLinecap: "round",
        strokeLinejoin: "round",
        className: "w-2.5 h-2.5 text-brand-cyan"
      }, /*#__PURE__*/React.createElement("polygon", {
        points: "5 3 19 12 5 21 5 3"
      }))) : /*#__PURE__*/React.createElement("svg", {
        xmlns: "http://www.w3.org/2000/svg",
        viewBox: "0 0 24 24",
        fill: "none",
        stroke: "currentColor",
        strokeWidth: "2.5",
        strokeLinecap: "round",
        strokeLinejoin: "round",
        className: "w-3.5 h-3.5 text-gray-500 group-hover:text-brand-cyan transition shrink-0"
      }, /*#__PURE__*/React.createElement("polygon", {
        points: "5 3 19 12 5 21 5 3"
      })));
    });
  })()))), /*#__PURE__*/React.createElement("div", {
    className: studentMobileTab === 'about' ? 'block' : 'hidden'
  }, (() => {
    const enrolled = studentUser.courses.includes(studentSelectedCourse) || studentUser.courses.includes('All Courses Lifetime Access');
    if (!enrolled) {
      return /*#__PURE__*/React.createElement("div", {
        className: "text-left"
      }, /*#__PURE__*/React.createElement("div", {
        className: "flex flex-wrap items-center justify-between gap-3 mb-3 px-0.5"
      }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("span", {
        className: "text-[8px] font-mono font-bold uppercase tracking-widest text-brand-cyan/80"
      }, studentSelectedCourse), /*#__PURE__*/React.createElement("h2", {
        className: "text-base font-black text-white tracking-tight mt-0.5"
      }, "Course Locked"))), /*#__PURE__*/React.createElement("div", {
        className: "p-6 rounded-[16px] border border-white/[0.05] bg-white/[0.015] text-center flex flex-col items-center justify-center",
        style: {
          backdropFilter: 'blur(8px)'
        }
      }, /*#__PURE__*/React.createElement("div", {
        className: "w-10 h-10 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-500 mb-3"
      }, /*#__PURE__*/React.createElement("svg", {
        xmlns: "http://www.w3.org/2000/svg",
        width: "18",
        height: "18",
        viewBox: "0 0 24 24",
        fill: "none",
        stroke: "currentColor",
        strokeWidth: "2.5",
        strokeLinecap: "round",
        strokeLinejoin: "round"
      }, /*#__PURE__*/React.createElement("rect", {
        x: "3",
        y: "11",
        width: "18",
        height: "11",
        rx: "2",
        ry: "2"
      }), /*#__PURE__*/React.createElement("path", {
        d: "M7 11V7a5 5 0 0 1 10 0v4"
      }))), /*#__PURE__*/React.createElement("p", {
        className: "text-xs text-gray-500 font-mono"
      }, "Please enroll in this course to view lesson details")));
    }
    if (!studentActiveVideo) {
      return /*#__PURE__*/React.createElement("div", {
        className: "text-left"
      }, /*#__PURE__*/React.createElement("div", {
        className: "flex flex-wrap items-center justify-between gap-3 mb-3 px-0.5"
      }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("span", {
        className: "text-[8px] font-mono font-bold uppercase tracking-widest text-brand-cyan/80"
      }, studentSelectedCourse), /*#__PURE__*/React.createElement("h2", {
        className: "text-base font-black text-white tracking-tight mt-0.5"
      }, "Lesson Details"))), /*#__PURE__*/React.createElement("div", {
        className: "p-6 rounded-[16px] border border-white/[0.05] bg-white/[0.015] text-center flex flex-col items-center justify-center",
        style: {
          backdropFilter: 'blur(8px)'
        }
      }, /*#__PURE__*/React.createElement("svg", {
        xmlns: "http://www.w3.org/2000/svg",
        width: "28",
        height: "28",
        viewBox: "0 0 24 24",
        fill: "none",
        stroke: "currentColor",
        strokeWidth: "1.5",
        strokeLinecap: "round",
        strokeLinejoin: "round",
        className: "text-gray-600 mb-3"
      }, /*#__PURE__*/React.createElement("polygon", {
        points: "23 7 16 12 23 17 23 7"
      }), /*#__PURE__*/React.createElement("rect", {
        x: "1",
        y: "5",
        width: "15",
        height: "14",
        rx: "2",
        ry: "2"
      })), /*#__PURE__*/React.createElement("p", {
        className: "text-xs text-gray-500 font-mono"
      }, "Select a lesson from the Syllabus tab to view details")));
    }
    return /*#__PURE__*/React.createElement("div", {
      className: "text-left"
    }, /*#__PURE__*/React.createElement("div", {
      className: "flex flex-wrap items-center justify-between gap-3 mb-3 px-0.5"
    }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("span", {
      className: "text-[8px] font-mono font-bold uppercase tracking-widest text-brand-cyan/80"
    }, studentSelectedCourse), /*#__PURE__*/React.createElement("h2", {
      className: "text-sm font-black text-white tracking-tight mt-0.5"
    }, studentActiveVideo.title)), /*#__PURE__*/React.createElement("div", {
      className: "flex items-center gap-2"
    }, /*#__PURE__*/React.createElement("span", {
      className: "px-2.5 py-1 text-[7px] font-mono font-bold rounded-lg border border-brand-violet/20 bg-brand-violet/5 text-brand-violet uppercase"
    }, studentActiveVideo.difficulty || 'Intermediate'), /*#__PURE__*/React.createElement("span", {
      className: "text-[9px] text-gray-500 font-mono"
    }, studentActiveVideo.duration))), /*#__PURE__*/React.createElement("div", {
      className: "space-y-2.5 p-4 rounded-[16px] border border-white/[0.04] bg-white/[0.01] mb-3",
      style: {
        backdropFilter: 'blur(6px)'
      }
    }, /*#__PURE__*/React.createElement("h4", {
      className: "text-[9px] font-mono text-gray-500 uppercase tracking-widest font-bold"
    }, "Lecture Summary"), /*#__PURE__*/React.createElement("p", {
      className: "text-gray-400 text-[11px] font-light leading-relaxed"
    }, studentActiveVideo.description)), studentActiveVideo.tags && studentActiveVideo.tags.length > 0 && /*#__PURE__*/React.createElement("div", {
      className: "flex flex-wrap gap-1.5 mb-3 px-0.5"
    }, studentActiveVideo.tags.map(tag => /*#__PURE__*/React.createElement("span", {
      key: tag,
      className: "px-2 py-1 rounded-lg bg-white/[0.02] border border-white/[0.04] text-[8px] font-medium text-gray-500 font-mono"
    }, "#", tag))), studentActiveVideo.resources && studentActiveVideo.resources.length > 0 && /*#__PURE__*/React.createElement("div", {
      className: "pt-3 border-t border-white/[0.04]"
    }, /*#__PURE__*/React.createElement("h4", {
      className: "text-[9px] font-mono text-gray-500 uppercase tracking-widest font-bold mb-3 px-0.5"
    }, "Downloadable Templates & Source Files"), /*#__PURE__*/React.createElement("div", {
      className: "grid grid-cols-1 sm:grid-cols-2 gap-2"
    }, studentActiveVideo.resources.map((res, idx) => /*#__PURE__*/React.createElement("a", {
      key: idx,
      href: getAttachmentUrl(res.url),
      target: "_blank",
      rel: "noreferrer",
      className: "p-3 rounded-[14px] bg-white/[0.015] hover:bg-white/[0.03] border border-white/[0.04] hover:border-brand-cyan/15 flex items-center justify-between transition-all group"
    }, /*#__PURE__*/React.createElement("div", {
      className: "flex items-center space-x-2.5 truncate"
    }, /*#__PURE__*/React.createElement("div", {
      className: "w-7 h-7 rounded-[10px] bg-white/[0.04] flex items-center justify-center text-gray-400 group-hover:text-brand-cyan transition"
    }, /*#__PURE__*/React.createElement("svg", {
      xmlns: "http://www.w3.org/2000/svg",
      width: "12",
      height: "12",
      viewBox: "0 0 24 24",
      fill: "none",
      stroke: "currentColor",
      strokeWidth: "2.5",
      strokeLinecap: "round",
      strokeLinejoin: "round"
    }, /*#__PURE__*/React.createElement("path", {
      d: "M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"
    }), /*#__PURE__*/React.createElement("polyline", {
      points: "14 2 14 8 20 8"
    }), /*#__PURE__*/React.createElement("line", {
      x1: "12",
      y1: "18",
      x2: "12",
      y2: "12"
    }), /*#__PURE__*/React.createElement("polyline", {
      points: "9 15 12 18 15 15"
    }))), /*#__PURE__*/React.createElement("div", {
      className: "truncate text-left"
    }, /*#__PURE__*/React.createElement("p", {
      className: "text-[11px] font-bold text-gray-200 truncate group-hover:text-white transition"
    }, res.name), /*#__PURE__*/React.createElement("p", {
      className: "text-[8px] font-mono text-gray-500 mt-0.5"
    }, res.size || '—'))), /*#__PURE__*/React.createElement("svg", {
      xmlns: "http://www.w3.org/2000/svg",
      width: "12",
      height: "12",
      viewBox: "0 0 24 24",
      fill: "none",
      stroke: "currentColor",
      strokeWidth: "2.5",
      strokeLinecap: "round",
      strokeLinejoin: "round",
      className: "text-gray-500 group-hover:text-brand-cyan transition shrink-0"
    }, /*#__PURE__*/React.createElement("polyline", {
      points: "8 17 12 21 16 17"
    }), /*#__PURE__*/React.createElement("line", {
      x1: "12",
      y1: "12",
      x2: "12",
      y2: "21"
    })))))));
  })()), /*#__PURE__*/React.createElement("div", {
    className: studentMobileTab === 'programs' ? 'block' : 'hidden'
  }, /*#__PURE__*/React.createElement("div", {
    className: "text-left"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex flex-wrap items-center justify-between gap-3 mb-3 px-0.5"
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("span", {
    className: "text-[8px] font-mono font-bold uppercase tracking-widest text-brand-cyan/80"
  }, "Student Portal"), /*#__PURE__*/React.createElement("h2", {
    className: "text-base font-black text-white tracking-tight mt-0.5"
  }, "My Programs")), /*#__PURE__*/React.createElement("span", {
    className: "px-2.5 py-1 text-[7px] font-mono font-bold rounded-lg border border-brand-violet/20 bg-brand-violet/5 text-brand-violet uppercase"
  }, Object.keys(DEFAULT_COURSE_CURRICULUM).length, " Programs")), /*#__PURE__*/React.createElement("div", {
    className: "space-y-2"
  }, Object.keys(DEFAULT_COURSE_CURRICULUM).map(courseName => {
    const enrolled = studentUser.courses.includes(courseName) || studentUser.courses.includes('All Courses Lifetime Access');
    const active = studentSelectedCourse === courseName;
    const courseInfo = courseList.find(c => c.title.toLowerCase().includes(courseName.toLowerCase()) || courseName.toLowerCase().includes(c.id.replace('-', ' '))) || {
      duration: '6 Weeks'
    };
    return /*#__PURE__*/React.createElement("button", {
      key: courseName,
      onClick: () => {
        setStudentSelectedCourse(courseName);
        const saved = getLastWatchedVideo(courseName);
        if (saved) setStudentActiveVideo(saved);else {
          const currentList = getMergedLectures()[courseName] || [];
          setStudentActiveVideo(currentList[0] || null);
        }
      },
      className: `w-full p-3 rounded-[14px] border text-left flex items-center justify-between transition-all ${active ? 'bg-gradient-to-r from-brand-cyan/8 to-brand-blue/[0.03] border-brand-cyan/15 text-white' : 'bg-white/[0.015] hover:bg-white/[0.03] border-white/[0.04] text-gray-400 hover:text-white hover:border-white/10'} group`,
      style: active ? {
        backdropFilter: 'blur(8px)'
      } : {}
    }, /*#__PURE__*/React.createElement("div", {
      className: "flex items-center space-x-2.5 truncate"
    }, /*#__PURE__*/React.createElement("div", {
      className: `w-7 h-7 rounded-[10px] flex items-center justify-center shrink-0 border transition-all ${active ? 'bg-brand-cyan border-brand-cyan text-black font-bold shadow-[0_0_10px_rgba(0,240,255,0.15)]' : 'bg-white/[0.04] border-white/[0.08] text-gray-400 group-hover:text-brand-cyan'}`
    }, /*#__PURE__*/React.createElement("svg", {
      xmlns: "http://www.w3.org/2000/svg",
      width: "12",
      height: "12",
      viewBox: "0 0 24 24",
      fill: "none",
      stroke: "currentColor",
      strokeWidth: "2.5",
      strokeLinecap: "round",
      strokeLinejoin: "round"
    }, /*#__PURE__*/React.createElement("path", {
      d: "M22 10v6M2 10l10-5 10 5-10 5z"
    }), /*#__PURE__*/React.createElement("path", {
      d: "M6 12v5c0 2 2 3 6 3s6-1 6-3v-5"
    }))), /*#__PURE__*/React.createElement("div", {
      className: "truncate text-left"
    }, /*#__PURE__*/React.createElement("p", {
      className: "text-[11px] font-bold text-gray-200 truncate group-hover:text-white transition"
    }, courseName), /*#__PURE__*/React.createElement("div", {
      className: "flex items-center gap-1.5 mt-0.5 text-[8px] font-mono text-gray-500"
    }, /*#__PURE__*/React.createElement("span", null, courseInfo.duration), /*#__PURE__*/React.createElement("span", null, "\u2022"), /*#__PURE__*/React.createElement("span", {
      className: `uppercase font-bold ${enrolled ? 'text-brand-cyan' : 'text-rose-400'}`
    }, enrolled ? 'Enrolled' : 'Locked')))), enrolled ? /*#__PURE__*/React.createElement("div", {
      className: "w-5 h-5 rounded-lg bg-brand-cyan/10 border border-brand-cyan/20 flex items-center justify-center"
    }, /*#__PURE__*/React.createElement("svg", {
      xmlns: "http://www.w3.org/2000/svg",
      viewBox: "0 0 24 24",
      fill: "none",
      stroke: "currentColor",
      strokeWidth: "2.5",
      strokeLinecap: "round",
      strokeLinejoin: "round",
      className: "w-3 h-3 text-brand-cyan"
    }, /*#__PURE__*/React.createElement("polyline", {
      points: "9 18 15 12 9 6"
    }))) : /*#__PURE__*/React.createElement("span", {
      className: "text-[10px] text-rose-400 shrink-0 ml-1"
    }, "\uD83D\uDD12"));
  }))))), /*#__PURE__*/React.createElement("div", {
    className: "hidden lg:block"
  }, studentActiveVideo && studentUser.courses.includes(studentSelectedCourse) && /*#__PURE__*/React.createElement("div", {
    className: "text-left"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex flex-wrap items-center justify-between gap-3 mb-4 px-0.5"
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("span", {
    className: "text-[8px] font-mono font-bold uppercase tracking-widest text-brand-cyan/80"
  }, studentSelectedCourse), /*#__PURE__*/React.createElement("h2", {
    className: "text-lg font-black text-white tracking-tight mt-0.5"
  }, studentActiveVideo.title)), /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-2"
  }, /*#__PURE__*/React.createElement("span", {
    className: "px-2.5 py-1 text-[7px] font-mono font-bold rounded-lg border border-brand-violet/20 bg-brand-violet/5 text-brand-violet uppercase"
  }, studentActiveVideo.difficulty || 'Intermediate'), /*#__PURE__*/React.createElement("span", {
    className: "text-[9px] text-gray-500 font-mono"
  }, studentActiveVideo.duration))), /*#__PURE__*/React.createElement("div", {
    className: "p-4 rounded-[16px] border border-white/[0.04] bg-white/[0.01] mb-3",
    style: {
      backdropFilter: 'blur(6px)'
    }
  }, /*#__PURE__*/React.createElement("h4", {
    className: "text-[9px] font-mono text-gray-500 uppercase tracking-widest font-bold mb-2"
  }, "Lecture Summary"), /*#__PURE__*/React.createElement("p", {
    className: "text-gray-400 text-xs font-light leading-relaxed"
  }, studentActiveVideo.description)), studentActiveVideo.tags && studentActiveVideo.tags.length > 0 && /*#__PURE__*/React.createElement("div", {
    className: "flex flex-wrap gap-1.5 mb-3 px-0.5"
  }, studentActiveVideo.tags.map(tag => /*#__PURE__*/React.createElement("span", {
    key: tag,
    className: "px-2 py-1 rounded-lg bg-white/[0.02] border border-white/[0.04] text-[8px] font-medium text-gray-500 font-mono"
  }, "#", tag))), studentActiveVideo.resources && studentActiveVideo.resources.length > 0 && /*#__PURE__*/React.createElement("div", {
    className: "pt-3 border-t border-white/[0.04]"
  }, /*#__PURE__*/React.createElement("h4", {
    className: "text-[9px] font-mono text-gray-500 uppercase tracking-widest font-bold mb-3"
  }, "Downloadable Templates & Source Files"), /*#__PURE__*/React.createElement("div", {
    className: "grid grid-cols-1 sm:grid-cols-2 gap-2"
  }, studentActiveVideo.resources.map((res, idx) => /*#__PURE__*/React.createElement("a", {
    key: idx,
    href: getAttachmentUrl(res.url),
    target: "_blank",
    rel: "noreferrer",
    className: "p-3 rounded-[14px] bg-white/[0.015] hover:bg-white/[0.03] border border-white/[0.04] hover:border-brand-cyan/15 flex items-center justify-between transition-all group"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center space-x-2.5 truncate"
  }, /*#__PURE__*/React.createElement("div", {
    className: "w-7 h-7 rounded-[10px] bg-white/[0.04] flex items-center justify-center text-gray-400 group-hover:text-brand-cyan transition"
  }, /*#__PURE__*/React.createElement("svg", {
    xmlns: "http://www.w3.org/2000/svg",
    width: "12",
    height: "12",
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "2.5",
    strokeLinecap: "round",
    strokeLinejoin: "round"
  }, /*#__PURE__*/React.createElement("path", {
    d: "M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"
  }), /*#__PURE__*/React.createElement("polyline", {
    points: "14 2 14 8 20 8"
  }), /*#__PURE__*/React.createElement("line", {
    x1: "12",
    y1: "18",
    x2: "12",
    y2: "12"
  }), /*#__PURE__*/React.createElement("polyline", {
    points: "9 15 12 18 15 15"
  }))), /*#__PURE__*/React.createElement("div", {
    className: "truncate text-left"
  }, /*#__PURE__*/React.createElement("p", {
    className: "text-[11px] font-bold text-gray-200 truncate group-hover:text-white transition"
  }, res.name), /*#__PURE__*/React.createElement("p", {
    className: "text-[8px] font-mono text-gray-500 mt-0.5"
  }, res.size || '—'))), /*#__PURE__*/React.createElement("svg", {
    xmlns: "http://www.w3.org/2000/svg",
    width: "12",
    height: "12",
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "2.5",
    strokeLinecap: "round",
    strokeLinejoin: "round",
    className: "text-gray-500 group-hover:text-brand-cyan transition shrink-0"
  }, /*#__PURE__*/React.createElement("polyline", {
    points: "8 17 12 21 16 17"
  }), /*#__PURE__*/React.createElement("line", {
    x1: "12",
    y1: "12",
    x2: "12",
    y2: "21"
  })))))))))), /*#__PURE__*/React.createElement("aside", {
    className: "hidden lg:block lg:w-80 border-t lg:border-t-0 lg:border-l border-white/[0.04] bg-zinc-950/5 p-3 lg:p-4 lg:overflow-y-auto shrink-0 flex flex-col text-left"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-2 px-1 mb-3"
  }, /*#__PURE__*/React.createElement("div", {
    className: "w-1.5 h-1.5 rounded-full bg-brand-cyan shadow-[0_0_6px_rgba(0,240,255,0.4)]"
  }), /*#__PURE__*/React.createElement("h3", {
    className: "text-[9px] font-mono text-gray-500 uppercase tracking-widest font-bold"
  }, "Course Syllabus")), /*#__PURE__*/React.createElement("div", {
    className: "space-y-2 flex-grow"
  }, (() => {
    const list = getMergedLectures()[studentSelectedCourse] || [];
    const enrolled = studentUser.courses.includes(studentSelectedCourse) || studentUser.courses.includes('All Courses Lifetime Access');
    if (list.length === 0) {
      return /*#__PURE__*/React.createElement("p", {
        className: "text-xs text-gray-600 italic font-mono"
      }, "No lectures uploaded for this syllabus yet.");
    }
    return list.map((item, index) => {
      const active = studentActiveVideo && studentActiveVideo.id === item.id;
      return /*#__PURE__*/React.createElement("button", {
        key: item.id,
        onClick: () => enrolled && setStudentActiveVideo(item),
        className: `w-full p-3 rounded-[14px] border text-left flex items-center justify-between transition-all ${!enrolled ? 'opacity-40 cursor-not-allowed bg-transparent border-white/[0.04]' : active ? 'bg-gradient-to-r from-brand-cyan/8 to-brand-blue/[0.03] border-brand-cyan/15 text-white' : 'bg-white/[0.015] hover:bg-white/[0.03] border-white/[0.04] text-gray-400 hover:text-white hover:border-white/10'} group`,
        style: active ? {
          backdropFilter: 'blur(8px)'
        } : {}
      }, /*#__PURE__*/React.createElement("div", {
        className: "flex items-center space-x-2.5 truncate"
      }, /*#__PURE__*/React.createElement("div", {
        className: `w-7 h-7 rounded-[10px] flex items-center justify-center shrink-0 text-[9px] font-mono font-bold border transition-all ${active ? 'bg-brand-cyan border-brand-cyan text-black' : 'bg-white/[0.04] border-white/[0.08] text-gray-400 group-hover:text-brand-cyan'}`
      }, index + 1), /*#__PURE__*/React.createElement("div", {
        className: "truncate text-left"
      }, /*#__PURE__*/React.createElement("p", {
        className: "text-[11px] font-bold text-gray-200 truncate group-hover:text-white transition"
      }, item.title), /*#__PURE__*/React.createElement("div", {
        className: "flex items-center gap-1.5 mt-0.5 text-[8px] font-mono text-gray-500"
      }, /*#__PURE__*/React.createElement("span", null, item.duration), /*#__PURE__*/React.createElement("span", null, "\u2022"), /*#__PURE__*/React.createElement("span", {
        className: "uppercase text-brand-violet"
      }, item.difficulty || 'Beginner')))), active && /*#__PURE__*/React.createElement("div", {
        className: "w-5 h-5 rounded-lg bg-brand-cyan/10 border border-brand-cyan/20 flex items-center justify-center shrink-0"
      }, /*#__PURE__*/React.createElement("svg", {
        xmlns: "http://www.w3.org/2000/svg",
        viewBox: "0 0 24 24",
        fill: "none",
        stroke: "currentColor",
        strokeWidth: "2.5",
        strokeLinecap: "round",
        strokeLinejoin: "round",
        className: "w-2.5 h-2.5 text-brand-cyan"
      }, /*#__PURE__*/React.createElement("polygon", {
        points: "5 3 19 12 5 21 5 3"
      }))));
    });
  })()))))), isAdminOpen && /*#__PURE__*/React.createElement("div", {
    className: "fixed inset-0 z-[100000] bg-zinc-950 flex flex-col font-sans select-text text-left overflow-hidden",
    onWheel: e => {
      if (window.innerWidth >= 1024) e.stopPropagation();
    }
  }, !isAdminAuthenticated ?
  /*#__PURE__*/
  /* Admin Login View */
  React.createElement("div", {
    className: "flex-grow flex items-center justify-center p-4 overflow-y-auto",
    style: {
      background: 'linear-gradient(135deg, #050505 0%, #0c0c0c 100%)'
    }
  }, /*#__PURE__*/React.createElement("button", {
    onClick: () => {
      window.location.href = '/index.html';
    },
    className: "absolute top-6 right-6 w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-gray-400 hover:text-white hover:bg-white/10 transition-all duration-200"
  }, /*#__PURE__*/React.createElement("i", {
    "data-lucide": "x",
    className: "w-5 h-5"
  })), /*#__PURE__*/React.createElement("form", {
    onSubmit: handleAdminLogin,
    className: "max-w-md lg:max-w-lg w-full p-8 lg:p-10 liquid-glass border border-white/10 rounded-3xl text-center shadow-[0_20px_60px_rgba(0,240,255,0.05)] relative overflow-hidden"
  }, /*#__PURE__*/React.createElement("div", {
    className: "absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-brand-cyan to-brand-blue"
  }), /*#__PURE__*/React.createElement("div", {
    className: "w-14 h-14 rounded-2xl bg-brand-cyan/5 border border-brand-cyan/10 flex items-center justify-center mx-auto mb-6 text-brand-cyan"
  }, /*#__PURE__*/React.createElement("i", {
    "data-lucide": "shield-alert",
    className: "w-7 h-7"
  })), /*#__PURE__*/React.createElement("h2", {
    className: "text-xl font-black uppercase tracking-wider text-white font-heading mb-2"
  }, "Dxign.learn Admin Gateway"), /*#__PURE__*/React.createElement("p", {
    className: "text-xs text-gray-500 mb-8 font-mono"
  }, "AUTHORIZED PERSONNEL ONLY"), /*#__PURE__*/React.createElement("div", {
    className: "text-left mb-6"
  }, /*#__PURE__*/React.createElement("label", {
    className: "text-[10px] font-mono text-gray-500 uppercase tracking-widest mb-1.5 block"
  }, "Enter Passkey"), /*#__PURE__*/React.createElement("div", {
    className: "relative flex items-center"
  }, /*#__PURE__*/React.createElement("i", {
    "data-lucide": "key-round",
    className: "absolute left-4 w-4 h-4 text-gray-500"
  }), /*#__PURE__*/React.createElement("input", {
    type: "password",
    placeholder: "\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022",
    value: adminPasswordInput,
    onChange: e => setAdminPasswordInput(e.target.value),
    className: "w-full pl-11 pr-4 py-3 rounded-xl bg-white/[0.03] border border-white/10 text-white text-xs placeholder-gray-600 focus:outline-none transition-all duration-300",
    onFocus: e => {
      e.target.style.borderColor = '#00f0ff';
      e.target.style.boxShadow = '0 0 15px rgba(0, 240, 255, 0.15)';
    },
    onBlur: e => {
      e.target.style.borderColor = 'rgba(255,255,255,0.1)';
      e.target.style.boxShadow = 'none';
    }
  }))), adminError && /*#__PURE__*/React.createElement("div", {
    className: "mb-6 text-left text-rose-500 text-[10px] font-mono bg-rose-500/10 border border-rose-500/20 px-3.5 py-2.5 rounded-lg flex items-center space-x-1.5"
  }, /*#__PURE__*/React.createElement("i", {
    "data-lucide": "alert-triangle",
    className: "w-4 h-4 flex-shrink-0 text-rose-500"
  }), /*#__PURE__*/React.createElement("span", null, adminError)), /*#__PURE__*/React.createElement("button", {
    type: "submit",
    className: "w-full py-3.5 rounded-xl text-xs font-bold uppercase tracking-wider text-white transition-all duration-300 hover:scale-[1.01] active:scale-[0.99] bg-gradient-to-r from-brand-cyan to-brand-blue shadow-[0_0_20px_rgba(0,240,255,0.15)]"
  }, "Authenticate"))) :
  /*#__PURE__*/
  /* Admin Dashboard View */
  React.createElement("div", {
    className: "flex-grow flex flex-col text-gray-300 overflow-hidden"
  }, /*#__PURE__*/React.createElement("header", {
    className: "px-6 py-4 md:px-12 border-b border-white/5 flex flex-col lg:flex-row justify-between items-center gap-4 bg-zinc-950/40 backdrop-blur-md sticky top-0 z-50"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center space-x-3 text-left"
  }, /*#__PURE__*/React.createElement("div", {
    className: "w-10 h-10 rounded-xl bg-brand-cyan/5 border border-brand-cyan/20 flex items-center justify-center text-brand-cyan"
  }, /*#__PURE__*/React.createElement("i", {
    "data-lucide": "layout-dashboard",
    className: "w-5 h-5"
  })), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("h1", {
    className: "text-sm font-black tracking-widest font-mono text-white flex items-center"
  }, "DXIGN.LEARN ", /*#__PURE__*/React.createElement("span", {
    className: "ml-2 px-2 py-0.5 rounded text-[8px] tracking-normal font-mono font-bold bg-brand-cyan/15 text-brand-cyan border border-brand-cyan/25"
  }, "ADMIN")), /*#__PURE__*/React.createElement("p", {
    className: "text-[9px] font-mono text-gray-500 uppercase tracking-widest mt-0.5"
  }, "App & Web Management Portal"))), /*#__PURE__*/React.createElement("div", {
    className: "flex flex-wrap lg:flex-nowrap items-center justify-center gap-1.5 bg-white/[0.03] border border-white/5 rounded-2xl p-1 font-mono text-[10px] lg:text-xs font-bold"
  }, /*#__PURE__*/React.createElement("button", {
    onClick: () => setAdminTab('registrations'),
    className: `px-3 py-1.5 lg:px-5 lg:py-2.5 rounded-xl transition-all duration-200 flex items-center gap-1.5 ${adminTab === 'registrations' ? 'bg-brand-cyan text-black shadow-[0_0_15px_rgba(0,240,255,0.25)]' : 'text-gray-400 hover:text-white hover:bg-white/5'}`
  }, /*#__PURE__*/React.createElement("svg", {
    xmlns: "http://www.w3.org/2000/svg",
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "2",
    strokeLinecap: "round",
    strokeLinejoin: "round",
    className: "w-3.5 h-3.5 lg:w-4 lg:h-4"
  }, /*#__PURE__*/React.createElement("rect", {
    x: "3",
    y: "3",
    width: "7",
    height: "9"
  }), /*#__PURE__*/React.createElement("rect", {
    x: "14",
    y: "3",
    width: "7",
    height: "5"
  }), /*#__PURE__*/React.createElement("rect", {
    x: "14",
    y: "12",
    width: "7",
    height: "9"
  }), /*#__PURE__*/React.createElement("rect", {
    x: "3",
    y: "16",
    width: "7",
    height: "5"
  })), "Web Registrations"), /*#__PURE__*/React.createElement("button", {
    onClick: () => setAdminTab('chat'),
    className: `px-3 py-1.5 lg:px-5 lg:py-2.5 rounded-xl transition-all duration-200 flex items-center gap-1.5 relative ${adminTab === 'chat' ? 'bg-brand-cyan text-black shadow-[0_0_15px_rgba(0,240,255,0.25)]' : 'text-gray-400 hover:text-white hover:bg-white/5'}`
  }, /*#__PURE__*/React.createElement("svg", {
    xmlns: "http://www.w3.org/2000/svg",
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "2",
    strokeLinecap: "round",
    strokeLinejoin: "round",
    className: "w-3.5 h-3.5 lg:w-4 lg:h-4"
  }, /*#__PURE__*/React.createElement("path", {
    d: "M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"
  })), "Student Doubt Chat", studentChats.some(c => c.unread) && /*#__PURE__*/React.createElement("span", {
    className: "absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-rose-500 animate-pulse border border-zinc-950"
  })), /*#__PURE__*/React.createElement("button", {
    onClick: () => setAdminTab('lectures'),
    className: `px-3 py-1.5 lg:px-5 lg:py-2.5 rounded-xl transition-all duration-200 flex items-center gap-1.5 ${adminTab === 'lectures' ? 'bg-brand-cyan text-black shadow-[0_0_15px_rgba(0,240,255,0.25)]' : 'text-gray-400 hover:text-white hover:bg-white/5'}`
  }, /*#__PURE__*/React.createElement("svg", {
    xmlns: "http://www.w3.org/2000/svg",
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "2",
    strokeLinecap: "round",
    strokeLinejoin: "round",
    className: "w-3.5 h-3.5 lg:w-4 lg:h-4"
  }, /*#__PURE__*/React.createElement("polygon", {
    points: "23 7 16 12 23 17 23 7"
  }), /*#__PURE__*/React.createElement("rect", {
    x: "1",
    y: "5",
    width: "15",
    height: "14",
    rx: "2",
    ry: "2"
  })), "Course Lectures"), /*#__PURE__*/React.createElement("button", {
    onClick: () => setAdminTab('controls'),
    className: `px-3 py-1.5 lg:px-5 lg:py-2.5 rounded-xl transition-all duration-200 flex items-center gap-1.5 ${adminTab === 'controls' ? 'bg-brand-cyan text-black shadow-[0_0_15px_rgba(0,240,255,0.25)]' : 'text-gray-400 hover:text-white hover:bg-white/5'}`
  }, /*#__PURE__*/React.createElement("svg", {
    xmlns: "http://www.w3.org/2000/svg",
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "2",
    strokeLinecap: "round",
    strokeLinejoin: "round",
    className: "w-3.5 h-3.5 lg:w-4 lg:h-4"
  }, /*#__PURE__*/React.createElement("circle", {
    cx: "12",
    cy: "12",
    r: "3"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"
  })), "App Controls")), /*#__PURE__*/React.createElement("div", {
    className: "flex items-center space-x-3"
  }, /*#__PURE__*/React.createElement("button", {
    onClick: fetchAdminData,
    disabled: adminLoading,
    className: "px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-xs font-mono font-bold hover:bg-white/10 hover:text-white transition-all duration-200 flex items-center gap-2 disabled:opacity-50"
  }, /*#__PURE__*/React.createElement("i", {
    "data-lucide": "refresh-cw",
    className: `w-3.5 h-3.5 ${adminLoading ? 'animate-spin' : ''}`
  }), "Refresh"), /*#__PURE__*/React.createElement("button", {
    onClick: () => setShowExportModal(true),
    className: "px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-xs font-mono font-bold hover:bg-white/10 hover:text-white transition-all duration-200 flex items-center gap-2"
  }, /*#__PURE__*/React.createElement("i", {
    "data-lucide": "file-text",
    className: "w-3.5 h-3.5"
  }), "Export PDF"), /*#__PURE__*/React.createElement("button", {
    onClick: handleAdminLogout,
    className: "px-4 py-2 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs font-mono font-bold text-rose-500 hover:bg-rose-500 hover:text-white transition-all duration-200 flex items-center gap-2"
  }, /*#__PURE__*/React.createElement("i", {
    "data-lucide": "log-out",
    className: "w-3.5 h-3.5"
  }), "Logout"))), showExportModal && /*#__PURE__*/React.createElement("div", {
    className: "absolute inset-0 z-50 flex items-center justify-center p-6",
    style: {
      background: 'rgba(0,0,0,0.7)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "liquid-glass border border-white/10 rounded-3xl p-8 max-w-lg w-full relative overflow-hidden text-center"
  }, /*#__PURE__*/React.createElement("div", {
    className: "absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-brand-cyan to-brand-violet"
  }), /*#__PURE__*/React.createElement("div", {
    className: "w-12 h-12 rounded-2xl bg-brand-cyan/10 border border-brand-cyan/20 flex items-center justify-center mx-auto mb-5 text-brand-cyan"
  }, /*#__PURE__*/React.createElement("svg", {
    xmlns: "http://www.w3.org/2000/svg",
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "2",
    strokeLinecap: "round",
    strokeLinejoin: "round",
    className: "w-6 h-6"
  }, /*#__PURE__*/React.createElement("path", {
    d: "M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"
  }), /*#__PURE__*/React.createElement("polyline", {
    points: "14 2 14 8 20 8"
  }), /*#__PURE__*/React.createElement("line", {
    x1: "16",
    y1: "13",
    x2: "8",
    y2: "13"
  }), /*#__PURE__*/React.createElement("line", {
    x1: "16",
    y1: "17",
    x2: "8",
    y2: "17"
  }), /*#__PURE__*/React.createElement("polyline", {
    points: "10 9 9 9 8 9"
  }))), /*#__PURE__*/React.createElement("h3", {
    className: "text-sm font-black uppercase tracking-wider text-white font-heading mb-1"
  }, "Export Report"), /*#__PURE__*/React.createElement("p", {
    className: "text-[10px] font-mono text-gray-500 mb-6"
  }, "Choose the type of report to download"), /*#__PURE__*/React.createElement("div", {
    className: "flex flex-col gap-3"
  }, /*#__PURE__*/React.createElement("button", {
    onClick: () => exportToPDF('registrations'),
    className: "w-full py-3 px-4 rounded-xl bg-white/[0.03] border border-white/10 hover:bg-white/[0.06] hover:border-brand-cyan/30 transition-all duration-200 text-left flex items-center gap-3"
  }, /*#__PURE__*/React.createElement("div", {
    className: "w-8 h-8 rounded-lg bg-brand-emerald/10 border border-brand-emerald/20 flex items-center justify-center text-brand-emerald shrink-0"
  }, /*#__PURE__*/React.createElement("svg", {
    xmlns: "http://www.w3.org/2000/svg",
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "2",
    strokeLinecap: "round",
    strokeLinejoin: "round",
    className: "w-4 h-4"
  }, /*#__PURE__*/React.createElement("path", {
    d: "M22 11.08V12a10 10 0 1 1-5.93-9.14"
  }), /*#__PURE__*/React.createElement("polyline", {
    points: "22 4 12 14.01 9 11.01"
  }))), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    className: "text-xs font-bold text-white"
  }, "Registration Report"), /*#__PURE__*/React.createElement("div", {
    className: "text-[9px] font-mono text-gray-500"
  }, "Paid & initiated course registrations"))), /*#__PURE__*/React.createElement("button", {
    onClick: () => exportToPDF('enquiries'),
    className: "w-full py-3 px-4 rounded-xl bg-white/[0.03] border border-white/10 hover:bg-white/[0.06] hover:border-sky-400/30 transition-all duration-200 text-left flex items-center gap-3"
  }, /*#__PURE__*/React.createElement("div", {
    className: "w-8 h-8 rounded-lg bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-400 shrink-0"
  }, /*#__PURE__*/React.createElement("svg", {
    xmlns: "http://www.w3.org/2000/svg",
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "2",
    strokeLinecap: "round",
    strokeLinejoin: "round",
    className: "w-4 h-4"
  }, /*#__PURE__*/React.createElement("circle", {
    cx: "12",
    cy: "12",
    r: "10"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M12 16v-4"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M12 8h.01"
  }))), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    className: "text-xs font-bold text-white"
  }, "Enquiry Report"), /*#__PURE__*/React.createElement("div", {
    className: "text-[9px] font-mono text-gray-500"
  }, "Course enquiry form submissions"))), /*#__PURE__*/React.createElement("button", {
    onClick: () => exportToPDF('both'),
    className: "w-full py-3 px-4 rounded-xl bg-white/[0.03] border border-white/10 hover:bg-white/[0.06] hover:border-brand-violet/30 transition-all duration-200 text-left flex items-center gap-3"
  }, /*#__PURE__*/React.createElement("div", {
    className: "w-8 h-8 rounded-lg bg-brand-violet/10 border border-brand-violet/20 flex items-center justify-center text-brand-violet shrink-0"
  }, /*#__PURE__*/React.createElement("svg", {
    xmlns: "http://www.w3.org/2000/svg",
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "2",
    strokeLinecap: "round",
    strokeLinejoin: "round",
    className: "w-4 h-4"
  }, /*#__PURE__*/React.createElement("path", {
    d: "M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"
  }), /*#__PURE__*/React.createElement("circle", {
    cx: "9",
    cy: "7",
    r: "4"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M22 21v-2a4 4 0 0 0-3-3.87"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M16 3.13a4 4 0 0 1 0 7.75"
  }))), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    className: "text-xs font-bold text-white"
  }, "Complete Report"), /*#__PURE__*/React.createElement("div", {
    className: "text-[9px] font-mono text-gray-500"
  }, "Registrations & enquiries combined")))), /*#__PURE__*/React.createElement("button", {
    onClick: () => setShowExportModal(false),
    className: "mt-4 text-[9px] font-mono text-gray-600 hover:text-gray-400 transition-all duration-200 uppercase tracking-wider"
  }, "Cancel"))), /*#__PURE__*/React.createElement("main", {
    className: `flex-grow p-6 md:p-12 lg:p-16 max-w-[1600px] mx-auto w-full flex flex-col space-y-8 lg:space-y-10 lg:h-0 lg:min-h-0 lg:flex-1 min-h-0 ${adminTab === 'chat' ? 'overflow-hidden' : 'overflow-y-auto'}`
  }, adminTab === 'registrations' && /*#__PURE__*/React.createElement("div", {
    className: "flex flex-col gap-6 lg:gap-8 text-left"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex-1 min-w-0 flex flex-col space-y-6 lg:space-y-8"
  }, /*#__PURE__*/React.createElement(React.Fragment, null, (() => {
    const regData = adminData.filter(r => (r.status || '').toLowerCase() !== 'enquiry');
    const successRows = regData.filter(r => (r.status || '').toLowerCase() === 'success');
    const totalSales = successRows.length;
    const totalRevenue = successRows.reduce((sum, r) => {
      const cleanPrice = parseInt((r.price || '').replace(/\D/g, '')) || 0;
      return sum + cleanPrice;
    }, 0);
    const conversionRate = regData.length > 0 ? (totalSales / regData.length * 100).toFixed(1) : 0;
    return /*#__PURE__*/React.createElement("div", {
      className: "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-8"
    }, /*#__PURE__*/React.createElement("div", {
      className: "liquid-glass border border-white/5 p-6 lg:p-8 rounded-3xl text-left relative overflow-hidden group hover:border-brand-cyan/20 transition-all duration-300"
    }, /*#__PURE__*/React.createElement("div", {
      className: "absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 group-hover:opacity-20 transition-all duration-300 text-brand-cyan"
    }, /*#__PURE__*/React.createElement("i", {
      "data-lucide": "users",
      className: "w-12 h-12 lg:w-16 lg:h-16"
    })), /*#__PURE__*/React.createElement("span", {
      className: "text-[10px] lg:text-xs font-mono text-gray-500 uppercase tracking-widest font-bold"
    }, "Total Leads"), /*#__PURE__*/React.createElement("h3", {
      className: "text-3xl lg:text-4xl font-black font-heading mt-2 text-white text-cyan-glow"
    }, adminLoading ? '...' : regData.length), /*#__PURE__*/React.createElement("p", {
      className: "text-[9px] lg:text-[11px] font-mono text-gray-600 mt-2"
    }, "Registration attempts initiated")), /*#__PURE__*/React.createElement("div", {
      className: "liquid-glass border border-white/5 p-6 lg:p-8 rounded-3xl text-left relative overflow-hidden group hover:border-brand-emerald/20 transition-all duration-300"
    }, /*#__PURE__*/React.createElement("div", {
      className: "absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 group-hover:opacity-20 transition-all duration-300 text-brand-emerald"
    }, /*#__PURE__*/React.createElement("i", {
      "data-lucide": "shopping-bag",
      className: "w-12 h-12 lg:w-16 lg:h-16"
    })), /*#__PURE__*/React.createElement("span", {
      className: "text-[10px] lg:text-xs font-mono text-gray-500 uppercase tracking-widest font-bold"
    }, "Successful Sales"), /*#__PURE__*/React.createElement("h3", {
      className: "text-3xl lg:text-4xl font-black font-heading mt-2 text-white text-emerald-glow"
    }, adminLoading ? '...' : totalSales), /*#__PURE__*/React.createElement("p", {
      className: "text-[9px] lg:text-[11px] font-mono text-gray-600 mt-2"
    }, "Completed course orders")), /*#__PURE__*/React.createElement("div", {
      className: "liquid-glass border border-white/5 p-6 lg:p-8 rounded-3xl text-left relative overflow-hidden group hover:border-brand-violet/20 transition-all duration-300"
    }, /*#__PURE__*/React.createElement("div", {
      className: "absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 group-hover:opacity-20 transition-all duration-300 text-brand-violet"
    }, /*#__PURE__*/React.createElement("i", {
      "data-lucide": "indian-rupee",
      className: "w-12 h-12 lg:w-16 lg:h-16"
    })), /*#__PURE__*/React.createElement("span", {
      className: "text-[10px] lg:text-xs font-mono text-gray-500 uppercase tracking-widest font-bold"
    }, "Total Revenue"), /*#__PURE__*/React.createElement("h3", {
      className: "text-3xl lg:text-4xl font-black font-heading mt-2 text-white text-violet-glow"
    }, adminLoading ? '...' : '₹' + totalRevenue.toLocaleString('en-IN')), /*#__PURE__*/React.createElement("p", {
      className: "text-[9px] lg:text-[11px] font-mono text-gray-600 mt-2"
    }, "Total gross payment volume")), /*#__PURE__*/React.createElement("div", {
      className: "liquid-glass border border-white/5 p-6 lg:p-8 rounded-3xl text-left relative overflow-hidden group hover:border-brand-rose/20 transition-all duration-300"
    }, /*#__PURE__*/React.createElement("div", {
      className: "absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 group-hover:opacity-20 transition-all duration-300 text-brand-rose"
    }, /*#__PURE__*/React.createElement("i", {
      "data-lucide": "trending-up",
      className: "w-12 h-12 lg:w-16 lg:h-16"
    })), /*#__PURE__*/React.createElement("span", {
      className: "text-[10px] lg:text-xs font-mono text-gray-500 uppercase tracking-widest font-bold"
    }, "Conversion Rate"), /*#__PURE__*/React.createElement("h3", {
      className: "text-3xl lg:text-4xl font-black font-heading mt-2 text-white text-rose-glow"
    }, adminLoading ? '...' : conversionRate + '%'), /*#__PURE__*/React.createElement("p", {
      className: "text-[9px] lg:text-[11px] font-mono text-gray-600 mt-2"
    }, "Paid checkouts out of total leads")));
  })(), /*#__PURE__*/React.createElement("div", {
    className: "p-6 lg:p-8 liquid-glass border border-white/5 rounded-3xl flex flex-col md:flex-row gap-4 lg:gap-6 justify-between items-center text-left"
  }, /*#__PURE__*/React.createElement("div", {
    className: "relative flex items-center w-full md:w-5/12"
  }, /*#__PURE__*/React.createElement("i", {
    "data-lucide": "search",
    className: "absolute left-4 w-4 h-4 lg:w-5 lg:h-5 text-gray-500"
  }), /*#__PURE__*/React.createElement("input", {
    type: "text",
    placeholder: "Search by student email or phone...",
    value: adminSearch,
    onChange: e => setAdminSearch(e.target.value),
    className: "w-full pl-11 pr-4 py-2.5 lg:py-3 rounded-xl bg-white/[0.03] border border-white/10 text-white text-xs lg:text-sm placeholder-gray-600 focus:outline-none focus:border-brand-cyan transition-all duration-300"
  })), /*#__PURE__*/React.createElement("div", {
    className: "flex flex-col sm:flex-row gap-4 lg:gap-6 w-full md:w-auto justify-end"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center space-x-2 lg:space-x-3"
  }, /*#__PURE__*/React.createElement("span", {
    className: "text-[10px] lg:text-xs font-mono text-gray-500 uppercase tracking-wider"
  }, "Course:"), /*#__PURE__*/React.createElement("select", {
    value: adminFilterCourse,
    onChange: e => setAdminFilterCourse(e.target.value),
    className: "bg-zinc-900 border border-white/10 rounded-xl px-3 py-2 lg:px-4 lg:py-2.5 text-xs lg:text-sm text-white focus:outline-none focus:border-brand-cyan"
  }, /*#__PURE__*/React.createElement("option", {
    value: "All"
  }, "All Items"), /*#__PURE__*/React.createElement("option", {
    value: "All Courses Lifetime Access"
  }, "All Courses Bundle"), courseList.map(c => /*#__PURE__*/React.createElement("option", {
    key: c.id,
    value: c.title
  }, c.title)))), /*#__PURE__*/React.createElement("div", {
    className: "flex items-center space-x-2 lg:space-x-3"
  }, /*#__PURE__*/React.createElement("span", {
    className: "text-[10px] lg:text-xs font-mono text-gray-500 uppercase tracking-wider"
  }, "Status:"), /*#__PURE__*/React.createElement("select", {
    value: adminFilterStatus,
    onChange: e => setAdminFilterStatus(e.target.value),
    className: "bg-zinc-900 border border-white/10 rounded-xl px-3 py-2 lg:px-4 lg:py-2.5 text-xs lg:text-sm text-white focus:outline-none focus:border-brand-cyan"
  }, /*#__PURE__*/React.createElement("option", {
    value: "All"
  }, "All Status"), /*#__PURE__*/React.createElement("option", {
    value: "Success"
  }, "Success (Paid)"), /*#__PURE__*/React.createElement("option", {
    value: "Initiated"
  }, "Initiated (Lead)"))))), /*#__PURE__*/React.createElement("div", {
    className: "grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8"
  }, /*#__PURE__*/React.createElement("div", {
    className: "liquid-glass border border-white/5 rounded-3xl overflow-hidden flex flex-col relative min-h-[200px]"
  }, /*#__PURE__*/React.createElement("div", {
    className: "px-6 lg:px-8 pt-5 pb-2 border-b border-white/[0.04]"
  }, /*#__PURE__*/React.createElement("span", {
    className: "text-[10px] lg:text-xs font-mono text-brand-cyan uppercase tracking-widest font-bold"
  }, "Registration Details")), adminLoading && /*#__PURE__*/React.createElement("div", {
    className: "absolute inset-0 z-10 bg-black/40 backdrop-blur-sm flex items-center justify-center"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center space-x-3 text-brand-cyan font-mono text-xs uppercase tracking-widest"
  }, /*#__PURE__*/React.createElement("i", {
    "data-lucide": "refresh-cw",
    className: "w-5 h-5 animate-spin"
  }), /*#__PURE__*/React.createElement("span", null, "Fetching Live Data..."))), adminError && /*#__PURE__*/React.createElement("div", {
    className: "absolute inset-0 z-10 bg-black/60 flex items-center justify-center p-6 text-center"
  }, /*#__PURE__*/React.createElement("div", {
    className: "max-w-md p-6 bg-rose-500/10 border border-rose-500/20 rounded-2xl flex flex-col items-center"
  }, /*#__PURE__*/React.createElement("i", {
    "data-lucide": "alert-triangle",
    className: "w-8 h-8 text-rose-500 mb-3"
  }), /*#__PURE__*/React.createElement("h4", {
    className: "text-xs font-mono font-bold uppercase text-white tracking-widest mb-1"
  }, "Retrieval Failed"), /*#__PURE__*/React.createElement("p", {
    className: "text-[11px] text-gray-500 mb-4 font-mono"
  }, adminError), /*#__PURE__*/React.createElement("button", {
    onClick: fetchAdminData,
    className: "px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-mono text-white transition-all duration-200"
  }, "Retry Fetch"))), (() => {
    const filteredRows = adminData.filter(row => {
      const isEnquiry = (row.status || '').toLowerCase() === 'enquiry';
      if (isEnquiry) return false;
      const nameMatch = (row.name || '').toString().toLowerCase().includes(adminSearch.toLowerCase());
      const emailMatch = (row.email || '').toString().toLowerCase().includes(adminSearch.toLowerCase());
      const phoneMatch = (row.phone || '').toString().toLowerCase().includes(adminSearch.toLowerCase());
      const searchMatch = nameMatch || emailMatch || phoneMatch;
      const courseMatch = adminFilterCourse === 'All' || (row.course || '').toLowerCase() === adminFilterCourse.toLowerCase() || adminFilterCourse === 'All Courses Bundle' && (row.course || '').includes('All Courses');
      const statusMatch = adminFilterStatus === 'All' || (row.status || '').toLowerCase() === adminFilterStatus.toLowerCase();
      return searchMatch && courseMatch && statusMatch;
    });
    if (filteredRows.length === 0) {
      return /*#__PURE__*/React.createElement("div", {
        className: "px-6 py-12 text-center text-gray-500 uppercase tracking-widest text-[10px]"
      }, "No Registrations Found");
    }
    return /*#__PURE__*/React.createElement("div", {
      className: "p-3 lg:p-4 space-y-2"
    }, filteredRows.map((row, index) => {
      const isSuccess = (row.status || '').toLowerCase() === 'success';
      return /*#__PURE__*/React.createElement("div", {
        key: index,
        className: "flex flex-col gap-2 p-4 rounded-xl bg-white/[0.015] border border-white/[0.04] hover:bg-white/[0.03] transition-all duration-200"
      }, /*#__PURE__*/React.createElement("div", {
        className: "flex items-center justify-between gap-2"
      }, /*#__PURE__*/React.createElement("span", {
        className: "text-[9px] lg:text-[10px] font-mono text-gray-500"
      }, formatDate(row.date)), /*#__PURE__*/React.createElement("span", {
        className: `shrink-0 px-2 py-0.5 rounded text-[7px] uppercase tracking-wider font-bold border ${isSuccess ? 'bg-brand-emerald/10 text-brand-emerald border-brand-emerald/20' : 'bg-amber-500/10 text-amber-500 border-amber-500/20'}`
      }, row.status)), /*#__PURE__*/React.createElement("div", {
        className: "font-sans font-bold text-white text-sm lg:text-base leading-tight"
      }, row.name || '—'), /*#__PURE__*/React.createElement("div", {
        className: "grid grid-cols-2 gap-x-4 gap-y-1.5"
      }, /*#__PURE__*/React.createElement("div", {
        className: "min-w-0"
      }, /*#__PURE__*/React.createElement("div", {
        className: "text-[7px] lg:text-[8px] font-mono text-gray-600 uppercase tracking-wider mb-0.5"
      }, "Email"), /*#__PURE__*/React.createElement("div", {
        className: "text-[10px] lg:text-[11px] text-gray-300 truncate"
      }, row.email || '—')), /*#__PURE__*/React.createElement("div", {
        className: "min-w-0"
      }, /*#__PURE__*/React.createElement("div", {
        className: "text-[7px] lg:text-[8px] font-mono text-gray-600 uppercase tracking-wider mb-0.5"
      }, "Phone"), /*#__PURE__*/React.createElement("div", {
        className: "text-[10px] lg:text-[11px] text-gray-300"
      }, row.phone || '—')), /*#__PURE__*/React.createElement("div", {
        className: "min-w-0"
      }, /*#__PURE__*/React.createElement("div", {
        className: "text-[7px] lg:text-[8px] font-mono text-gray-600 uppercase tracking-wider mb-0.5"
      }, "Course"), /*#__PURE__*/React.createElement("div", {
        className: "text-[9px] lg:text-[10px] text-white uppercase font-bold truncate"
      }, row.course)), /*#__PURE__*/React.createElement("div", {
        className: "min-w-0"
      }, /*#__PURE__*/React.createElement("div", {
        className: "text-[7px] lg:text-[8px] font-mono text-gray-600 uppercase tracking-wider mb-0.5"
      }, "Price"), /*#__PURE__*/React.createElement("div", {
        className: "text-[10px] lg:text-[11px] text-cyan-glow font-bold"
      }, row.price))), /*#__PURE__*/React.createElement("div", {
        className: "flex items-center gap-2 mt-2"
      }, /*#__PURE__*/React.createElement("a", {
        href: getWhatsAppLink(row.phone, row.name, row.course),
        target: "_blank",
        rel: "noopener noreferrer",
        className: "w-9 h-9 rounded-xl bg-brand-emerald/10 border border-brand-emerald/20 flex items-center justify-center text-brand-emerald hover:bg-brand-emerald hover:text-white transition-all duration-200",
        title: "Send WhatsApp"
      }, /*#__PURE__*/React.createElement("svg", {
        xmlns: "http://www.w3.org/2000/svg",
        viewBox: "0 0 24 24",
        fill: "currentColor",
        className: "w-4 h-4"
      }, /*#__PURE__*/React.createElement("path", {
        d: "M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"
      }))), /*#__PURE__*/React.createElement("a", {
        href: getMailtoLink(row.email, row.name, row.course),
        target: "_blank",
        rel: "noopener noreferrer",
        className: "w-9 h-9 rounded-xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-400 hover:bg-sky-500 hover:text-white transition-all duration-200",
        title: "Send Email"
      }, /*#__PURE__*/React.createElement("svg", {
        xmlns: "http://www.w3.org/2000/svg",
        viewBox: "0 0 24 24",
        fill: "none",
        stroke: "currentColor",
        strokeWidth: "2",
        strokeLinecap: "round",
        strokeLinejoin: "round",
        className: "w-4 h-4"
      }, /*#__PURE__*/React.createElement("rect", {
        x: "2",
        y: "4",
        width: "20",
        height: "16",
        rx: "2"
      }), /*#__PURE__*/React.createElement("path", {
        d: "M22 4l-10 7L2 4"
      })))));
    }));
  })()), /*#__PURE__*/React.createElement("div", {
    className: "liquid-glass border border-white/5 rounded-3xl overflow-hidden flex flex-col relative min-h-[200px]"
  }, /*#__PURE__*/React.createElement("div", {
    className: "px-6 lg:px-8 pt-5 pb-2 border-b border-white/[0.04]"
  }, /*#__PURE__*/React.createElement("span", {
    className: "text-[10px] lg:text-xs font-mono text-sky-400 uppercase tracking-widest font-bold"
  }, "Enquiry Details")), (() => {
    const enquiryRows = adminData.filter(r => (r.status || '').toLowerCase() === 'enquiry');
    if (enquiryRows.length === 0) {
      return /*#__PURE__*/React.createElement("div", {
        className: "px-6 py-12 text-center text-gray-500 uppercase tracking-widest text-[10px]"
      }, "No Enquiries Yet");
    }
    return /*#__PURE__*/React.createElement("div", {
      className: "p-3 lg:p-4 space-y-2"
    }, enquiryRows.map((row, index) => {
      const courseClean = (row.course || '').replace(/\[.*\]/, '').trim();
      return /*#__PURE__*/React.createElement("div", {
        key: index,
        className: "flex flex-col gap-2 p-4 rounded-xl bg-white/[0.015] border border-white/[0.04] hover:bg-white/[0.03] transition-all duration-200"
      }, /*#__PURE__*/React.createElement("div", {
        className: "flex items-center justify-between gap-2"
      }, /*#__PURE__*/React.createElement("span", {
        className: "text-[9px] lg:text-[10px] font-mono text-gray-500"
      }, formatDate(row.date))), /*#__PURE__*/React.createElement("div", {
        className: "font-sans font-bold text-white text-sm lg:text-base leading-tight"
      }, row.name || '—'), /*#__PURE__*/React.createElement("div", {
        className: "grid grid-cols-2 gap-x-4 gap-y-1.5"
      }, /*#__PURE__*/React.createElement("div", {
        className: "min-w-0"
      }, /*#__PURE__*/React.createElement("div", {
        className: "text-[7px] lg:text-[8px] font-mono text-gray-600 uppercase tracking-wider mb-0.5"
      }, "Email"), /*#__PURE__*/React.createElement("div", {
        className: "text-[10px] lg:text-[11px] text-gray-300 truncate"
      }, row.email || '—')), /*#__PURE__*/React.createElement("div", {
        className: "min-w-0"
      }, /*#__PURE__*/React.createElement("div", {
        className: "text-[7px] lg:text-[8px] font-mono text-gray-600 uppercase tracking-wider mb-0.5"
      }, "Phone"), /*#__PURE__*/React.createElement("div", {
        className: "text-[10px] lg:text-[11px] text-gray-300"
      }, row.phone || '—')), /*#__PURE__*/React.createElement("div", {
        className: "min-w-0"
      }, /*#__PURE__*/React.createElement("div", {
        className: "text-[7px] lg:text-[8px] font-mono text-gray-600 uppercase tracking-wider mb-0.5"
      }, "Course"), /*#__PURE__*/React.createElement("div", {
        className: "text-[9px] lg:text-[10px] text-white uppercase font-bold truncate"
      }, courseClean)), /*#__PURE__*/React.createElement("div", {
        className: "min-w-0"
      }, /*#__PURE__*/React.createElement("div", {
        className: "text-[7px] lg:text-[8px] font-mono text-gray-600 uppercase tracking-wider mb-0.5"
      }, "City"), /*#__PURE__*/React.createElement("div", {
        className: "text-[10px] lg:text-[11px] text-gray-400"
      }, row.paymentId || '—'))), /*#__PURE__*/React.createElement("div", {
        className: "flex items-center gap-2 mt-2"
      }, /*#__PURE__*/React.createElement("a", {
        href: getWhatsAppLink(row.phone, row.name, courseClean),
        target: "_blank",
        rel: "noopener noreferrer",
        className: "w-9 h-9 rounded-xl bg-brand-emerald/10 border border-brand-emerald/20 flex items-center justify-center text-brand-emerald hover:bg-brand-emerald hover:text-white transition-all duration-200",
        title: "Send WhatsApp"
      }, /*#__PURE__*/React.createElement("svg", {
        xmlns: "http://www.w3.org/2000/svg",
        viewBox: "0 0 24 24",
        fill: "currentColor",
        className: "w-4 h-4"
      }, /*#__PURE__*/React.createElement("path", {
        d: "M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"
      }))), /*#__PURE__*/React.createElement("a", {
        href: getMailtoLink(row.email, row.name, courseClean),
        target: "_blank",
        rel: "noopener noreferrer",
        className: "w-9 h-9 rounded-xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-400 hover:bg-sky-500 hover:text-white transition-all duration-200",
        title: "Send Email"
      }, /*#__PURE__*/React.createElement("svg", {
        xmlns: "http://www.w3.org/2000/svg",
        viewBox: "0 0 24 24",
        fill: "none",
        stroke: "currentColor",
        strokeWidth: "2",
        strokeLinecap: "round",
        strokeLinejoin: "round",
        className: "w-4 h-4"
      }, /*#__PURE__*/React.createElement("rect", {
        x: "2",
        y: "4",
        width: "20",
        height: "16",
        rx: "2"
      }), /*#__PURE__*/React.createElement("path", {
        d: "M22 4l-10 7L2 4"
      })))));
    }));
  })()))))), adminTab === 'controls' && /*#__PURE__*/React.createElement("div", {
    className: "max-w-6xl mx-auto w-full grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-10 items-start"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex flex-col gap-8 lg:gap-10"
  }, /*#__PURE__*/React.createElement("div", {
    className: "p-8 lg:p-12 liquid-glass border border-white/5 rounded-3xl relative overflow-hidden flex flex-col space-y-6 lg:space-y-8"
  }, /*#__PURE__*/React.createElement("div", {
    className: "absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-brand-violet to-brand-rose"
  }), /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-4"
  }, /*#__PURE__*/React.createElement("div", {
    className: "w-12 h-12 rounded-2xl bg-brand-violet/10 border border-brand-violet/20 flex items-center justify-center text-brand-violet shrink-0"
  }, /*#__PURE__*/React.createElement("svg", {
    xmlns: "http://www.w3.org/2000/svg",
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "2",
    strokeLinecap: "round",
    strokeLinejoin: "round",
    className: "w-6 h-6"
  }, /*#__PURE__*/React.createElement("rect", {
    x: "5",
    y: "2",
    width: "14",
    height: "20",
    rx: "2",
    ry: "2"
  }), /*#__PURE__*/React.createElement("line", {
    x1: "12",
    y1: "18",
    x2: "12.01",
    y2: "18"
  }))), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("h3", {
    className: "text-sm lg:text-base font-black uppercase tracking-wider text-white font-heading"
  }, "Mentor Support Status"), /*#__PURE__*/React.createElement("p", {
    className: "text-xs font-mono text-gray-500 mt-1"
  }, "Control live online availability shown in the mobile app"))), /*#__PURE__*/React.createElement("div", {
    className: "space-y-5"
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    className: "text-xs font-mono text-gray-500 uppercase tracking-widest block mb-2"
  }, "Availability"), /*#__PURE__*/React.createElement("div", {
    className: "grid grid-cols-2 gap-3"
  }, /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: () => setSupportSettings(prev => ({
      ...prev,
      isOnline: true
    })),
    className: `py-4 rounded-xl font-mono text-sm font-bold uppercase flex items-center justify-center gap-3 border-2 transition ${supportSettings.isOnline ? 'bg-brand-emerald/10 text-brand-emerald border-brand-emerald/40 shadow-[0_0_20px_rgba(16,185,129,0.15)]' : 'bg-transparent border-white/10 text-gray-500 hover:text-white hover:border-white/20'}`
  }, /*#__PURE__*/React.createElement("span", {
    className: `w-3 h-3 rounded-full bg-brand-emerald ${supportSettings.isOnline ? 'animate-pulse' : ''}`
  }), "ONLINE"), /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: () => setSupportSettings(prev => ({
      ...prev,
      isOnline: false
    })),
    className: `py-4 rounded-xl font-mono text-sm font-bold uppercase flex items-center justify-center gap-3 border-2 transition ${!supportSettings.isOnline ? 'bg-rose-500/10 text-rose-500 border-rose-500/40 shadow-[0_0_20px_rgba(244,63,94,0.15)]' : 'bg-transparent border-white/10 text-gray-500 hover:text-white hover:border-white/20'}`
  }, /*#__PURE__*/React.createElement("span", {
    className: "w-3 h-3 rounded-full bg-rose-500"
  }), "OFFLINE"))), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    className: "text-xs font-mono text-gray-500 uppercase tracking-widest block mb-2"
  }, "Average Response Time"), /*#__PURE__*/React.createElement("div", {
    className: "relative flex items-center"
  }, /*#__PURE__*/React.createElement("svg", {
    xmlns: "http://www.w3.org/2000/svg",
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "2",
    strokeLinecap: "round",
    strokeLinejoin: "round",
    className: "absolute left-4 w-5 h-5 text-gray-500"
  }, /*#__PURE__*/React.createElement("circle", {
    cx: "12",
    cy: "12",
    r: "10"
  }), /*#__PURE__*/React.createElement("polyline", {
    points: "12 6 12 12 16 14"
  })), /*#__PURE__*/React.createElement("input", {
    type: "text",
    placeholder: "e.g. 4 mins, 15 mins",
    value: supportSettings.avgResponseTime || '',
    onChange: e => setSupportSettings(prev => ({
      ...prev,
      avgResponseTime: e.target.value
    })),
    className: "w-full pl-12 pr-5 py-3.5 rounded-xl bg-white/[0.03] border border-white/10 text-white text-sm focus:outline-none focus:border-brand-violet/50 transition duration-300"
  }))), /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: () => handleSaveSupportSettings(supportSettings.isOnline, supportSettings.avgResponseTime),
    disabled: savingSupport,
    className: "w-full py-4 rounded-xl text-sm font-bold uppercase tracking-wider text-white transition bg-gradient-to-r from-brand-violet to-brand-rose shadow-[0_0_25px_rgba(168,85,247,0.2)] hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50 disabled:scale-100"
  }, savingSupport ? 'Synchronizing Firestore...' : 'Synchronize Availability'))), /*#__PURE__*/React.createElement("div", {
    className: "p-8 lg:p-12 liquid-glass border border-white/5 rounded-3xl relative overflow-hidden flex flex-col space-y-6 lg:space-y-8"
  }, /*#__PURE__*/React.createElement("div", {
    className: "absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-brand-emerald to-brand-cyan"
  }), /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-4"
  }, /*#__PURE__*/React.createElement("div", {
    className: "w-12 h-12 rounded-2xl bg-brand-emerald/10 border border-brand-emerald/20 flex items-center justify-center text-brand-emerald shrink-0"
  }, /*#__PURE__*/React.createElement("svg", {
    xmlns: "http://www.w3.org/2000/svg",
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "2",
    strokeLinecap: "round",
    strokeLinejoin: "round",
    className: "w-6 h-6"
  }, /*#__PURE__*/React.createElement("path", {
    d: "M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"
  }), /*#__PURE__*/React.createElement("circle", {
    cx: "12",
    cy: "10",
    r: "3"
  }))), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("h3", {
    className: "text-sm lg:text-base font-black uppercase tracking-wider text-white font-heading"
  }, "Welcome Automation"), /*#__PURE__*/React.createElement("p", {
    className: "text-xs font-mono text-gray-500 mt-1"
  }, "Auto-send welcome email & WhatsApp message on payment success"))), /*#__PURE__*/React.createElement("div", {
    className: "space-y-6"
  }, /*#__PURE__*/React.createElement("div", {
    className: "p-5 rounded-xl bg-white/[0.03] border border-white/5"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-4"
  }, /*#__PURE__*/React.createElement("div", {
    className: "w-12 h-12 rounded-xl bg-brand-cyan/15 border border-brand-cyan/25 flex items-center justify-center text-brand-cyan shrink-0"
  }, /*#__PURE__*/React.createElement("svg", {
    xmlns: "http://www.w3.org/2000/svg",
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "2",
    strokeLinecap: "round",
    strokeLinejoin: "round",
    className: "w-6 h-6"
  }, /*#__PURE__*/React.createElement("path", {
    d: "M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"
  }), /*#__PURE__*/React.createElement("polyline", {
    points: "22,6 12,13 2,6"
  }))), /*#__PURE__*/React.createElement("div", {
    className: "flex-1 min-w-0"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-3 flex-wrap"
  }, /*#__PURE__*/React.createElement("span", {
    className: "text-sm font-bold text-white"
  }, "Welcome Email"), /*#__PURE__*/React.createElement("span", {
    className: "text-xs font-mono bg-brand-emerald/15 text-brand-emerald px-3 py-1 rounded-full border border-brand-emerald/25 font-bold"
  }, "ACTIVE")), /*#__PURE__*/React.createElement("p", {
    className: "text-sm font-mono text-gray-500 mt-1"
  }, "Automatically sent via Google Apps Script MailApp (free, 100 recipients/day)")))), /*#__PURE__*/React.createElement("div", {
    className: "p-5 rounded-xl bg-white/[0.03] border border-white/5"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-4 mb-6"
  }, /*#__PURE__*/React.createElement("div", {
    className: "w-12 h-12 rounded-xl bg-brand-emerald/15 border border-brand-emerald/25 flex items-center justify-center text-brand-emerald shrink-0"
  }, /*#__PURE__*/React.createElement("svg", {
    xmlns: "http://www.w3.org/2000/svg",
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "2",
    strokeLinecap: "round",
    strokeLinejoin: "round",
    className: "w-6 h-6"
  }, /*#__PURE__*/React.createElement("path", {
    d: "M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"
  }), /*#__PURE__*/React.createElement("circle", {
    cx: "12",
    cy: "10",
    r: "3"
  }))), /*#__PURE__*/React.createElement("div", {
    className: "flex-1 min-w-0"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-3 flex-wrap"
  }, /*#__PURE__*/React.createElement("span", {
    className: "text-sm font-bold text-white"
  }, "WhatsApp Notification"), /*#__PURE__*/React.createElement("span", {
    className: `text-xs font-mono px-3 py-1 rounded-full border font-bold ${whatsAppConfigured ? 'bg-brand-emerald/15 text-brand-emerald border-brand-emerald/25' : 'bg-white/5 text-gray-400 border-white/10'}`
  }, whatsAppConfigured ? 'CONFIGURED' : 'DISABLED')), /*#__PURE__*/React.createElement("p", {
    className: "text-sm font-mono text-gray-500 mt-1"
  }, "Optional. Leave empty to run in email-only mode."))), /*#__PURE__*/React.createElement("div", {
    className: "space-y-5"
  }, /*#__PURE__*/React.createElement("div", {
    className: "grid grid-cols-1 sm:grid-cols-2 gap-5"
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    className: "text-xs font-mono text-gray-500 uppercase tracking-widest block mb-2"
  }, "API Endpoint URL"), /*#__PURE__*/React.createElement("input", {
    type: "text",
    placeholder: "https://api.ultramsg.com/instance12345/messages/chat",
    value: whatsAppApiUrl,
    onChange: e => setWhatsAppApiUrl(e.target.value),
    className: "w-full px-5 py-3.5 rounded-xl bg-white/[0.03] border border-white/10 text-white text-sm font-mono focus:outline-none focus:border-brand-emerald/50 transition duration-300"
  })), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    className: "text-xs font-mono text-gray-500 uppercase tracking-widest block mb-2"
  }, "API Key / Bearer Token"), /*#__PURE__*/React.createElement("input", {
    type: "text",
    placeholder: "Your API key or bearer token",
    value: whatsAppApiKey,
    onChange: e => setWhatsAppApiKey(e.target.value),
    className: "w-full px-5 py-3.5 rounded-xl bg-white/[0.03] border border-white/10 text-white text-sm font-mono focus:outline-none focus:border-brand-emerald/50 transition duration-300"
  }))), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    className: "text-xs font-mono text-gray-500 uppercase tracking-widest block mb-2"
  }, "Phone Number ID ", /*#__PURE__*/React.createElement("span", {
    className: "text-gray-600 normal-case"
  }, "(WhatsApp Cloud API only \u2014 leave blank for other providers)")), /*#__PURE__*/React.createElement("input", {
    type: "text",
    placeholder: "Leave blank for UltraMsg, Twilio, or custom webhooks",
    value: whatsAppPhoneId,
    onChange: e => setWhatsAppPhoneId(e.target.value),
    className: "w-full px-5 py-3.5 rounded-xl bg-white/[0.03] border border-white/10 text-white text-sm font-mono focus:outline-none focus:border-brand-emerald/50 transition duration-300"
  })), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    className: "text-xs font-mono text-gray-500 uppercase tracking-widest block mb-2"
  }, "Test Phone Number"), /*#__PURE__*/React.createElement("div", {
    className: "flex gap-3"
  }, /*#__PURE__*/React.createElement("input", {
    type: "text",
    placeholder: "+919876543210",
    value: whatsAppTestPhone,
    onChange: e => setWhatsAppTestPhone(e.target.value),
    className: "flex-1 px-5 py-3.5 rounded-xl bg-white/[0.03] border border-white/10 text-white text-sm font-mono focus:outline-none focus:border-brand-emerald/50 transition duration-300"
  }), /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: handleTestWhatsApp,
    disabled: whatsAppSaving,
    className: "px-6 py-3.5 rounded-xl bg-brand-emerald/15 border border-brand-emerald/25 text-brand-emerald text-sm font-bold font-mono hover:bg-brand-emerald/25 transition-all duration-200 disabled:opacity-50 whitespace-nowrap"
  }, whatsAppSaving ? 'Sending...' : 'Send Test'))), /*#__PURE__*/React.createElement("div", {
    className: "border-t border-white/5 pt-6"
  }, /*#__PURE__*/React.createElement("h4", {
    className: "text-sm font-bold uppercase tracking-wider text-white font-heading mb-1"
  }, "Notification Templates"), /*#__PURE__*/React.createElement("p", {
    className: "text-sm font-mono text-gray-500 mb-5"
  }, "Use ", /*#__PURE__*/React.createElement("code", {
    className: "text-brand-cyan font-bold"
  }, '{name}'), ", ", /*#__PURE__*/React.createElement("code", {
    className: "text-brand-cyan font-bold"
  }, '{course}'), " as placeholders"), /*#__PURE__*/React.createElement("div", {
    className: "space-y-5"
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    className: "text-xs font-mono text-gray-500 uppercase tracking-widest block mb-2"
  }, "Email Subject"), /*#__PURE__*/React.createElement("input", {
    type: "text",
    placeholder: "Welcome to Dxign Learn - {course}",
    value: welcomeEmailSubject,
    onChange: e => setWelcomeEmailSubject(e.target.value),
    className: "w-full px-5 py-3.5 rounded-xl bg-white/[0.03] border border-white/10 text-white text-sm font-mono focus:outline-none focus:border-brand-emerald/50 transition duration-300"
  })), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    className: "text-xs font-mono text-gray-500 uppercase tracking-widest block mb-2"
  }, "Email Body"), /*#__PURE__*/React.createElement("textarea", {
    rows: 5,
    placeholder: "Hi {name}, Welcome to Dxign Learn!...",
    value: welcomeEmailBody,
    onChange: e => setWelcomeEmailBody(e.target.value),
    className: "w-full px-5 py-3.5 rounded-xl bg-white/[0.03] border border-white/10 text-white text-sm font-mono focus:outline-none focus:border-brand-emerald/50 transition duration-300 resize-y"
  })), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    className: "text-xs font-mono text-gray-500 uppercase tracking-widest block mb-2"
  }, "WhatsApp Message Body"), /*#__PURE__*/React.createElement("textarea", {
    rows: 4,
    placeholder: "Hi {name}! Welcome to Dxign Learn!...",
    value: welcomeWhatsappBody,
    onChange: e => setWelcomeWhatsappBody(e.target.value),
    className: "w-full px-5 py-3.5 rounded-xl bg-white/[0.03] border border-white/10 text-white text-sm font-mono focus:outline-none focus:border-brand-emerald/50 transition duration-300 resize-y"
  })))), whatsAppStatus.text && /*#__PURE__*/React.createElement("div", {
    className: `p-4 rounded-xl border text-sm font-mono ${whatsAppStatus.type === 'success' ? 'bg-brand-emerald/10 border-brand-emerald/20 text-brand-emerald' : whatsAppStatus.type === 'warning' ? 'bg-amber-500/10 border-amber-500/20 text-amber-400' : 'bg-rose-500/10 border-rose-500/20 text-rose-500'}`
  }, whatsAppStatus.text), /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: handleSaveWhatsAppConfig,
    disabled: whatsAppSaving,
    className: "w-full py-4 rounded-xl text-sm font-bold uppercase tracking-wider text-white transition bg-gradient-to-r from-brand-emerald to-brand-cyan shadow-[0_0_25px_rgba(16,185,129,0.2)] hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50 disabled:scale-100"
  }, whatsAppSaving ? 'Saving...' : 'Save Settings & Templates'))), /*#__PURE__*/React.createElement("details", {
    className: "group"
  }, /*#__PURE__*/React.createElement("summary", {
    className: "text-xs font-mono text-gray-500 hover:text-gray-400 cursor-pointer uppercase tracking-wider py-2 select-none"
  }, /*#__PURE__*/React.createElement("span", {
    className: "mr-1"
  }, "\u25B6"), " Free WhatsApp Provider Setup Guide"), /*#__PURE__*/React.createElement("div", {
    className: "mt-4 p-5 rounded-xl bg-white/[0.02] border border-white/5 text-sm font-mono text-gray-400 space-y-4 leading-relaxed"
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("p", {
    className: "text-white font-bold mb-2"
  }, "Option 1: UltraMsg (50 msgs/day free)"), /*#__PURE__*/React.createElement("ol", {
    className: "list-decimal list-inside space-y-1 text-gray-500"
  }, /*#__PURE__*/React.createElement("li", null, "Sign up at ", /*#__PURE__*/React.createElement("a", {
    href: "https://ultramsg.com",
    target: "_blank",
    className: "text-brand-cyan hover:underline"
  }, "ultramsg.com")), /*#__PURE__*/React.createElement("li", null, "Get your instance ID and token from the dashboard"), /*#__PURE__*/React.createElement("li", null, "API URL format: ", /*#__PURE__*/React.createElement("code", {
    className: "text-white"
  }, "https://api.ultramsg.com/", '{instanceId}', "/messages/chat")), /*#__PURE__*/React.createElement("li", null, "Paste the token as the API Key above"))), /*#__PURE__*/React.createElement("div", {
    className: "border-t border-white/5 pt-4"
  }, /*#__PURE__*/React.createElement("p", {
    className: "text-white font-bold mb-2"
  }, "Option 2: WhatsApp Cloud API (free tier)"), /*#__PURE__*/React.createElement("ol", {
    className: "list-decimal list-inside space-y-1 text-gray-500"
  }, /*#__PURE__*/React.createElement("li", null, "Go to ", /*#__PURE__*/React.createElement("a", {
    href: "https://developers.facebook.com",
    target: "_blank",
    className: "text-brand-cyan hover:underline"
  }, "Meta for Developers")), /*#__PURE__*/React.createElement("li", null, "Create a WhatsApp Business App, get your token & phone number ID"), /*#__PURE__*/React.createElement("li", null, "API URL format: ", /*#__PURE__*/React.createElement("code", {
    className: "text-white"
  }, "https://graph.facebook.com/v22.0/")), /*#__PURE__*/React.createElement("li", null, "Enter both token and Phone Number ID above (auto-detected)")))))))), /*#__PURE__*/React.createElement("div", {
    className: "flex flex-col gap-8 lg:gap-10"
  }, /*#__PURE__*/React.createElement("form", {
    onSubmit: handleWhitelistSubmit,
    className: "p-8 lg:p-12 liquid-glass border border-white/5 rounded-3xl relative overflow-hidden flex flex-col space-y-6 lg:space-y-8"
  }, /*#__PURE__*/React.createElement("div", {
    className: "absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-brand-cyan to-brand-blue"
  }), /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-4"
  }, /*#__PURE__*/React.createElement("div", {
    className: "w-12 h-12 rounded-2xl bg-brand-cyan/10 border border-brand-cyan/20 flex items-center justify-center text-brand-cyan shrink-0"
  }, /*#__PURE__*/React.createElement("svg", {
    xmlns: "http://www.w3.org/2000/svg",
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "2",
    strokeLinecap: "round",
    strokeLinejoin: "round",
    className: "w-6 h-6"
  }, /*#__PURE__*/React.createElement("path", {
    d: "M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"
  }), /*#__PURE__*/React.createElement("polyline", {
    points: "9 11 11 13 15 9"
  }))), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("h3", {
    className: "text-sm lg:text-base font-black uppercase tracking-wider text-white font-heading"
  }, "Manual Whitelist Creator"), /*#__PURE__*/React.createElement("p", {
    className: "text-xs font-mono text-gray-500 mt-1"
  }, "Add students and bypass standard Razorpay checkout flow"))), /*#__PURE__*/React.createElement("div", {
    className: "space-y-5"
  }, /*#__PURE__*/React.createElement("div", {
    className: "grid grid-cols-1 sm:grid-cols-2 gap-5"
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    className: "text-xs font-mono text-gray-500 uppercase tracking-widest block mb-2"
  }, "Student Name"), /*#__PURE__*/React.createElement("input", {
    type: "text",
    placeholder: "John Doe",
    value: whitelistName,
    onChange: e => setWhitelistName(e.target.value),
    className: "w-full px-5 py-3.5 rounded-xl bg-white/[0.03] border border-white/10 text-white text-sm focus:outline-none focus:border-brand-cyan/50 transition duration-300"
  })), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    className: "text-xs font-mono text-gray-500 uppercase tracking-widest block mb-2"
  }, "Phone Number"), /*#__PURE__*/React.createElement("input", {
    type: "text",
    placeholder: "+91 98765 43210",
    value: whitelistPhone,
    onChange: e => setWhitelistPhone(e.target.value),
    className: "w-full px-5 py-3.5 rounded-xl bg-white/[0.03] border border-white/10 text-white text-sm focus:outline-none focus:border-brand-cyan/50 transition duration-300"
  }))), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    className: "text-xs font-mono text-gray-500 uppercase tracking-widest block mb-2"
  }, "Email Address"), /*#__PURE__*/React.createElement("input", {
    type: "email",
    placeholder: "student@gmail.com",
    value: whitelistEmail,
    onChange: e => setWhitelistEmail(e.target.value),
    className: "w-full px-5 py-3.5 rounded-xl bg-white/[0.03] border border-white/10 text-white text-sm focus:outline-none focus:border-brand-cyan/50 transition duration-300"
  })), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    className: "text-xs font-mono text-gray-500 uppercase tracking-widest block mb-2"
  }, "Grant Course Access"), /*#__PURE__*/React.createElement("div", {
    className: "grid grid-cols-2 gap-3 bg-white/[0.02] border border-white/5 p-4 rounded-xl font-sans text-sm"
  }, courseList.map(c => {
    const isChecked = whitelistCourses.includes(c.title);
    return /*#__PURE__*/React.createElement("label", {
      key: c.id,
      className: "flex items-center gap-3 text-gray-400 hover:text-white cursor-pointer select-none py-1"
    }, /*#__PURE__*/React.createElement("input", {
      type: "checkbox",
      checked: isChecked,
      onChange: () => {
        if (isChecked) {
          setWhitelistCourses(prev => prev.filter(x => x !== c.title));
        } else {
          setWhitelistCourses(prev => [...prev, c.title]);
        }
      },
      className: "w-4 h-4 rounded border-white/10 bg-zinc-900 text-brand-cyan focus:ring-0"
    }), /*#__PURE__*/React.createElement("span", {
      className: "truncate"
    }, c.title));
  }), /*#__PURE__*/React.createElement("label", {
    className: "flex items-center gap-3 text-gray-400 hover:text-white cursor-pointer select-none col-span-2 mt-2 border-t border-white/5 pt-3"
  }, /*#__PURE__*/React.createElement("input", {
    type: "checkbox",
    checked: whitelistCourses.includes('All Courses Lifetime Access'),
    onChange: () => {
      if (whitelistCourses.includes('All Courses Lifetime Access')) {
        setWhitelistCourses([]);
      } else {
        setWhitelistCourses(['All Courses Lifetime Access']);
      }
    },
    className: "w-4 h-4 rounded border-white/10 bg-zinc-900 text-brand-cyan focus:ring-0"
  }), /*#__PURE__*/React.createElement("span", {
    className: "font-bold text-brand-cyan text-sm"
  }, "All Courses Bundle")))), whitelistStatus.text && /*#__PURE__*/React.createElement("div", {
    className: `p-4 rounded-xl border text-sm font-mono ${whitelistStatus.type === 'success' ? 'bg-brand-emerald/10 border-brand-emerald/20 text-brand-emerald' : 'bg-rose-500/10 border-rose-500/20 text-rose-500'}`
  }, whitelistStatus.text), /*#__PURE__*/React.createElement("button", {
    type: "submit",
    disabled: whitelistingLoading,
    className: "w-full py-4 rounded-xl text-sm font-bold uppercase tracking-wider text-black transition bg-brand-cyan hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50 disabled:scale-100 shadow-[0_0_25px_rgba(0,240,255,0.2)]"
  }, whitelistingLoading ? 'Sending Webhook request...' : 'Whitelist Student & Grant Access'))))), adminTab === 'chat' && /*#__PURE__*/React.createElement("div", {
    className: "grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 flex-grow lg:h-full min-h-0"
  }, /*#__PURE__*/React.createElement("div", {
    className: `lg:col-span-3 flex flex-col h-full bg-zinc-900/30 border border-white/5 rounded-3xl overflow-hidden backdrop-blur-xl ${showMobileChatPopup ? 'hidden ' : ''}lg:flex`
  }, /*#__PURE__*/React.createElement("div", {
    className: "p-4 lg:p-5 border-b border-white/5"
  }, /*#__PURE__*/React.createElement("span", {
    className: "text-[10px] lg:text-xs font-mono text-gray-500 uppercase tracking-widest font-bold block mb-3"
  }, "Doubt Rooms (", studentChats.length, ")"), /*#__PURE__*/React.createElement("div", {
    className: "relative flex items-center"
  }, /*#__PURE__*/React.createElement("svg", {
    xmlns: "http://www.w3.org/2000/svg",
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "2",
    strokeLinecap: "round",
    strokeLinejoin: "round",
    className: "absolute left-3.5 w-3.5 h-3.5 lg:w-4 lg:h-4 text-gray-500"
  }, /*#__PURE__*/React.createElement("circle", {
    cx: "11",
    cy: "11",
    r: "8"
  }), /*#__PURE__*/React.createElement("line", {
    x1: "21",
    y1: "21",
    x2: "16.65",
    y2: "16.65"
  })), /*#__PURE__*/React.createElement("input", {
    type: "text",
    placeholder: "Filter active doubts...",
    value: chatSearch,
    onChange: e => setChatSearch(e.target.value),
    className: "w-full pl-9 pr-4 py-2 lg:py-2.5 rounded-xl bg-white/[0.03] border border-white/10 text-white text-[11px] lg:text-sm placeholder-gray-600 focus:outline-none focus:border-brand-cyan/40 transition-all duration-300"
  }))), /*#__PURE__*/React.createElement("div", {
    className: "flex-grow overflow-y-auto p-2 lg:p-3 space-y-1"
  }, studentChats.filter(chat => {
    const searchVal = chatSearch.toLowerCase();
    return (chat.name || '').toLowerCase().includes(searchVal) || (chat.email || '').toLowerCase().includes(searchVal);
  }).length === 0 ? /*#__PURE__*/React.createElement("div", {
    className: "py-8 text-center text-gray-600 uppercase font-mono text-[9px] tracking-widest"
  }, "No active chats found") : studentChats.filter(chat => {
    const searchVal = chatSearch.toLowerCase();
    return (chat.name || '').toLowerCase().includes(searchVal) || (chat.email || '').toLowerCase().includes(searchVal);
  }).map(chat => {
    const isSelected = selectedChatId === chat.id;
    const isUnread = chat.unread;
    const activeDate = chat.lastActive ? new Date(chat.lastActive.seconds * 1000) : new Date();
    const timeStr = activeDate.toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit'
    });
    return /*#__PURE__*/React.createElement("button", {
      key: chat.id,
      onClick: () => {
        setSelectedChatId(chat.id);
        setShowMobileChatPopup(true);
      },
      className: `w-full text-left p-3.5 lg:p-4 rounded-2xl flex items-center gap-3 lg:gap-4 transition-all duration-300 ${isSelected ? 'bg-white/[0.06] border border-white/10 shadow-[0_4px_20px_rgba(0,240,255,0.03)]' : 'bg-transparent border border-transparent hover:bg-white/[0.02]'}`
    }, /*#__PURE__*/React.createElement("div", {
      className: "relative shrink-0 select-none"
    }, /*#__PURE__*/React.createElement("div", {
      className: `w-9 h-9 lg:w-11 lg:h-11 rounded-full flex items-center justify-center font-bold text-xs lg:text-sm border ${isSelected ? 'bg-brand-cyan/20 border-brand-cyan/40 text-brand-cyan' : 'bg-white/5 border-white/10 text-white'}`
    }, (chat.name || chat.email || 'S').charAt(0).toUpperCase()), isUnread && /*#__PURE__*/React.createElement("span", {
      className: "absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-rose-500 border border-zinc-950"
    })), /*#__PURE__*/React.createElement("div", {
      className: "flex-grow min-w-0"
    }, /*#__PURE__*/React.createElement("div", {
      className: "flex justify-between items-baseline mb-0.5"
    }, /*#__PURE__*/React.createElement("h4", {
      className: "text-xs lg:text-sm font-bold text-white truncate font-heading"
    }, chat.name || 'Student'), /*#__PURE__*/React.createElement("span", {
      className: "text-[8px] lg:text-[10px] font-mono text-gray-500 shrink-0"
    }, timeStr)), /*#__PURE__*/React.createElement("p", {
      className: "text-[10px] lg:text-xs text-gray-400 truncate font-sans"
    }, chat.lastMessage || 'No messages yet')));
  }))), /*#__PURE__*/React.createElement("div", {
    className: `lg:col-span-9 flex flex-col h-full bg-zinc-900/30 border border-white/5 rounded-3xl overflow-hidden backdrop-blur-xl relative ${showMobileChatPopup ? 'fixed inset-0 z-[100] rounded-none lg:static lg:inset-auto lg:z-auto lg:rounded-3xl' : 'hidden lg:flex'}`
  }, !selectedChatId ?
  /*#__PURE__*/
  // Empty state
  React.createElement("div", {
    className: "flex-grow flex flex-col items-center justify-center p-8 text-center"
  }, /*#__PURE__*/React.createElement("div", {
    className: "w-16 h-16 rounded-3xl bg-brand-cyan/5 border border-brand-cyan/20 flex items-center justify-center text-brand-cyan/50 mb-4 animate-bounce"
  }, /*#__PURE__*/React.createElement("svg", {
    xmlns: "http://www.w3.org/2000/svg",
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "2",
    strokeLinecap: "round",
    strokeLinejoin: "round",
    className: "w-8 h-8"
  }, /*#__PURE__*/React.createElement("path", {
    d: "M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"
  }))), /*#__PURE__*/React.createElement("h3", {
    className: "text-sm font-bold text-white uppercase tracking-widest font-heading"
  }, "Doubt Resolution Hub"), /*#__PURE__*/React.createElement("p", {
    className: "text-[10px] font-mono text-gray-500 max-w-xs mt-2"
  }, "Select a student from the sidebar folder directory to view chat logs and send dynamic feedback.")) :
  /*#__PURE__*/
  // Active chat
  React.createElement(React.Fragment, null, (() => {
    const activeChat = studentChats.find(c => c.id === selectedChatId) || {};
    if (adminSelectionMode) {
      return /*#__PURE__*/React.createElement("div", {
        className: "px-6 py-4 border-b border-brand-cyan/20 bg-[#0d1b2a]/45 flex items-center justify-between gap-3 text-left"
      }, /*#__PURE__*/React.createElement("div", {
        className: "flex items-center gap-3"
      }, /*#__PURE__*/React.createElement("div", {
        className: "w-10 h-10 rounded-2xl bg-brand-cyan/10 border border-brand-cyan/20 flex items-center justify-center font-bold text-sm text-brand-cyan"
      }, "\u2713"), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("h3", {
        className: "text-xs font-bold text-brand-cyan font-heading"
      }, adminSelectedMessageIds.length, " Selected"), /*#__PURE__*/React.createElement("p", {
        className: "text-[9px] font-mono text-gray-500"
      }, "Selection Mode Active"))), /*#__PURE__*/React.createElement("div", {
        className: "flex items-center gap-2"
      }, /*#__PURE__*/React.createElement("button", {
        onClick: handleDeleteAdminSelectedMessages,
        disabled: adminSelectedMessageIds.length === 0,
        className: "px-3 py-1.5 rounded-lg text-[10px] font-mono font-bold bg-rose-500/10 hover:bg-rose-500/20 disabled:opacity-40 disabled:hover:bg-rose-500/10 text-rose-400 border border-rose-500/20 transition flex items-center gap-1.5"
      }, "Delete for Everyone"), /*#__PURE__*/React.createElement("button", {
        onClick: () => {
          setAdminSelectionMode(false);
          setAdminSelectedMessageIds([]);
        },
        className: "px-3 py-1.5 rounded-lg text-[10px] font-mono font-bold bg-white/[0.03] hover:bg-white/[0.08] text-gray-300 border border-white/10 transition"
      }, "Cancel")));
    }
    return /*#__PURE__*/React.createElement("div", {
      className: "px-6 py-4 border-b border-white/5 bg-zinc-950/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-left"
    }, /*#__PURE__*/React.createElement("div", {
      className: "flex items-center gap-3"
    }, /*#__PURE__*/React.createElement("div", {
      className: "relative shrink-0 select-none"
    }, /*#__PURE__*/React.createElement("div", {
      className: "w-10 h-10 rounded-full bg-[#051c24] border border-brand-cyan/35 flex items-center justify-center font-black text-sm text-brand-cyan font-heading"
    }, (activeChat.name || activeChat.email || 'S').charAt(0).toUpperCase()), /*#__PURE__*/React.createElement("span", {
      className: "absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-brand-emerald border border-zinc-950 animate-pulse"
    })), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("h3", {
      className: "text-xs font-bold text-white font-heading"
    }, activeChat.name || 'Student'), /*#__PURE__*/React.createElement("p", {
      className: "text-[9px] font-mono text-gray-500"
    }, activeChat.email))), /*#__PURE__*/React.createElement("div", {
      className: "flex items-center gap-3"
    }, activeChat.courses && activeChat.courses.length > 0 && /*#__PURE__*/React.createElement("div", {
      className: "hidden sm:flex flex-wrap gap-1 items-center"
    }, /*#__PURE__*/React.createElement("span", {
      className: "text-[8px] font-mono text-gray-500 mr-1 uppercase"
    }, "Enrolled:"), activeChat.courses.map((course, idx) => /*#__PURE__*/React.createElement("span", {
      key: idx,
      className: "px-2 py-0.5 rounded-md text-[8px] font-mono font-bold bg-brand-violet/10 text-brand-violet border border-brand-violet/20"
    }, course))), /*#__PURE__*/React.createElement("button", {
      onClick: () => setShowMobileChatPopup(false),
      className: "lg:hidden w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-gray-400 hover:text-white transition shrink-0",
      "aria-label": "Close chat"
    }, /*#__PURE__*/React.createElement("svg", {
      xmlns: "http://www.w3.org/2000/svg",
      viewBox: "0 0 24 24",
      fill: "none",
      stroke: "currentColor",
      strokeWidth: "2",
      strokeLinecap: "round",
      strokeLinejoin: "round",
      className: "w-4 h-4"
    }, /*#__PURE__*/React.createElement("line", {
      x1: "18",
      y1: "6",
      x2: "6",
      y2: "18"
    }), /*#__PURE__*/React.createElement("line", {
      x1: "6",
      y1: "6",
      x2: "18",
      y2: "18"
    }))), /*#__PURE__*/React.createElement("button", {
      onClick: () => {
        setAdminSelectionMode(true);
        setAdminSelectedMessageIds([]);
      },
      className: "px-2.5 py-1 rounded-md text-[9px] font-mono font-bold bg-brand-cyan/10 hover:bg-brand-cyan/20 text-brand-cyan border border-brand-cyan/20 transition flex items-center gap-1"
    }, "Select")));
  })(), /*#__PURE__*/React.createElement("div", {
    className: "flex-grow overflow-y-auto p-6 space-y-4 flex flex-col text-left"
  }, (() => {
    const sortedMessages = [...chatMessages].sort((a, b) => {
      const getSeconds = ts => {
        if (!ts) return Date.now() / 1000;
        if (typeof ts.seconds === 'number') return ts.seconds;
        if (ts instanceof Date) return ts.getTime() / 1000;
        if (typeof ts.toMillis === 'function') return ts.toMillis() / 1000;
        if (ts.seconds) return ts.seconds;
        return 0;
      };
      return getSeconds(a.timestamp) - getSeconds(b.timestamp);
    });
    if (sortedMessages.length === 0) {
      return /*#__PURE__*/React.createElement("div", {
        className: "my-auto text-center text-gray-600 font-mono text-[9px] uppercase tracking-widest"
      }, "No messages in room");
    }
    return sortedMessages.map((msg, index) => {
      if (!msg) return null;
      try {
        const isMentor = msg.sender === 'mentor';
        let seconds = Date.now() / 1000;
        if (msg.timestamp) {
          if (typeof msg.timestamp.seconds === 'number') seconds = msg.timestamp.seconds;else if (typeof msg.timestamp.toMillis === 'function') seconds = msg.timestamp.toMillis() / 1000;else if (msg.timestamp.seconds && !isNaN(msg.timestamp.seconds)) seconds = Number(msg.timestamp.seconds);else if (typeof msg.timestamp === 'number') seconds = msg.timestamp;else if (typeof msg.timestamp === 'string') {
            const parsed = Date.parse(msg.timestamp);
            if (!isNaN(parsed)) seconds = parsed / 1000;
          }
        }
        let timeStr = '';
        const dateObj = new Date(seconds * 1000);
        if (!isNaN(dateObj.getTime())) {
          timeStr = dateObj.toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit'
          });
        }
        const isMsgSelected = adminSelectedMessageIds.includes(msg.id);
        const handleMsgClick = e => {
          if (adminSelectionMode) {
            e.preventDefault();
            e.stopPropagation();
            setAdminSelectedMessageIds(prev => {
              if (prev.includes(msg.id)) {
                return prev.filter(id => id !== msg.id);
              } else {
                return [...prev, msg.id];
              }
            });
          }
        };
        return /*#__PURE__*/React.createElement("div", {
          key: msg.id || index,
          onClick: handleMsgClick,
          className: `flex w-full ${isMentor ? 'justify-end' : 'justify-start'} ${adminSelectionMode ? 'cursor-pointer select-none' : ''}`
        }, adminSelectionMode && /*#__PURE__*/React.createElement("div", {
          className: "flex items-center pr-3 self-center shrink-0"
        }, /*#__PURE__*/React.createElement("input", {
          type: "checkbox",
          checked: isMsgSelected,
          onChange: () => {},
          className: "w-3.5 h-3.5 accent-brand-cyan cursor-pointer rounded border-white/10 bg-black/40"
        })), /*#__PURE__*/React.createElement("div", {
          className: `max-w-[70%] rounded-2xl relative transition-all duration-200 ${msg.type === 'audio' || msg.type === 'image' || msg.type === 'video' ? 'p-0 overflow-hidden' : 'px-4 py-3'} ${isMsgSelected ? 'ring-2 ring-brand-cyan bg-brand-cyan/10 border-brand-cyan/30 text-white shadow-[0_0_12px_rgba(0,240,255,0.15)] rounded-2xl' : msg.type === 'audio' ? 'bg-transparent border border-transparent rounded-2xl' : msg.type === 'image' || msg.type === 'video' ? isMentor ? 'bg-[#2563eb]/10 border border-[#2563eb]/25 w-80 rounded-2xl rounded-tr-sm' : 'bg-[#1f1f23]/40 border border-[#1f1f23]/60 w-80 rounded-2xl rounded-tl-sm' : isMentor ? 'bg-blue-600 border border-blue-600/30 text-white rounded-2xl rounded-tr-sm' : 'bg-[#1f1f23] border border-white/5 text-gray-200 rounded-2xl rounded-tl-sm'}`,
          style: !isMsgSelected && !isMentor && msg.type !== 'audio' && msg.type !== 'image' && msg.type !== 'video' ? {
            backgroundColor: '#1f1f23'
          } : !isMsgSelected && isMentor && msg.type !== 'audio' && msg.type !== 'image' && msg.type !== 'video' ? {
            backgroundColor: '#2563eb'
          } : {}
        }, adminSelectionMode && /*#__PURE__*/React.createElement("div", {
          className: "absolute inset-0 z-50 rounded-2xl cursor-pointer bg-transparent",
          onClick: handleMsgClick
        }), msg.type === 'text' && /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("p", {
          className: "text-xs leading-relaxed break-words whitespace-pre-wrap select-text"
        }, renderParsedTextWeb(msg.text)), /*#__PURE__*/React.createElement("span", {
          className: "absolute bottom-1 right-2 inline-flex items-center gap-0.5 text-[8px] text-white/45 font-mono uppercase leading-none select-none"
        }, timeStr, isMentor && /*#__PURE__*/React.createElement("span", {
          className: `font-sans font-bold ${msg.status === 'read' ? 'text-brand-cyan' : 'text-white/45'}`
        }, msg.status === 'sent' || !msg.status ? '✓' : '✓✓'))), msg.fileUrl && msg.type === 'image' && /*#__PURE__*/React.createElement("div", {
          onClick: e => {
            e.stopPropagation();
            if (adminSelectionMode) {
              handleMsgClick(e);
              return;
            }
            setActivePreviewMedia({
              type: 'image',
              url: getAttachmentUrl(msg.fileUrl, 'image')
            });
            setMediaPreviewLoading(true);
          },
          className: "relative w-full h-auto max-h-[480px] overflow-hidden cursor-pointer select-none"
        }, /*#__PURE__*/React.createElement("img", {
          src: getAttachmentUrl(msg.fileUrl, 'image'),
          alt: "Attachment",
          className: "w-full h-auto max-h-[480px] object-cover block"
        }), !msg.text && /*#__PURE__*/React.createElement("div", {
          className: "absolute bottom-2.5 right-2.5 px-2 py-0.5 rounded bg-black/55 backdrop-blur-sm flex items-center gap-1 text-[8px] text-white/75 font-mono select-none"
        }, timeStr, isMentor && /*#__PURE__*/React.createElement("span", {
          className: `font-sans font-bold ${msg.status === 'read' ? 'text-brand-cyan' : 'text-white/45'}`
        }, msg.status === 'sent' || !msg.status ? '✓' : '✓✓'))), msg.fileUrl && msg.type === 'video' && /*#__PURE__*/React.createElement(VideoChatPreview, {
          fileUrl: msg.fileUrl,
          getAttachmentUrl: getAttachmentUrl,
          onPress: e => {
            e.stopPropagation();
            if (adminSelectionMode) {
              handleMsgClick(e);
              return;
            }
            setActivePreviewMedia({
              type: 'video',
              url: getAttachmentUrl(msg.fileUrl, 'video')
            });
            setMediaPreviewLoading(true);
          },
          timeStr: timeStr,
          isMentor: isMentor,
          msgStatus: msg.status,
          hasCaption: !!msg.text
        }), msg.type === 'audio' && /*#__PURE__*/React.createElement(AudioPlayer, {
          fileUrl: msg.fileUrl,
          getAttachmentUrl: getAttachmentUrl,
          GOOGLE_SHEET_WEBHOOK_URL: GOOGLE_SHEET_WEBHOOK_URL,
          isMentor: isMentor,
          timeStr: timeStr,
          msgStatus: msg.status
        }), msg.type === 'document' && /*#__PURE__*/React.createElement("a", {
          href: getAttachmentUrl(msg.fileUrl, 'document'),
          target: "_blank",
          rel: "noopener noreferrer",
          className: "flex items-center gap-3 bg-zinc-950/40 hover:bg-zinc-950/60 p-3 rounded-xl border border-white/10 transition text-left text-white"
        }, /*#__PURE__*/React.createElement("div", {
          className: "w-8 h-8 rounded-full bg-brand-violet/10 border border-brand-violet/25 flex items-center justify-center text-brand-violet"
        }, /*#__PURE__*/React.createElement("svg", {
          xmlns: "http://www.w3.org/2000/svg",
          viewBox: "0 0 24 24",
          fill: "none",
          stroke: "currentColor",
          strokeWidth: "2",
          strokeLinecap: "round",
          strokeLinejoin: "round",
          className: "w-4 h-4"
        }, /*#__PURE__*/React.createElement("path", {
          d: "M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"
        }), /*#__PURE__*/React.createElement("polyline", {
          points: "14 2 14 8 20 8"
        }), /*#__PURE__*/React.createElement("line", {
          x1: "16",
          y1: "13",
          x2: "8",
          y2: "13"
        }), /*#__PURE__*/React.createElement("line", {
          x1: "16",
          y1: "17",
          x2: "8",
          y2: "17"
        }), /*#__PURE__*/React.createElement("polyline", {
          points: "10 9 9 9 8 9"
        }))), /*#__PURE__*/React.createElement("div", {
          className: "min-w-0"
        }, /*#__PURE__*/React.createElement("p", {
          className: "text-[10px] truncate font-bold"
        }, msg.fileName || 'document.pdf'), /*#__PURE__*/React.createElement("span", {
          className: "text-[8px] text-gray-500 block mt-0.5"
        }, "Download document resource"))), msg.text && (msg.type === 'image' || msg.type === 'video') && /*#__PURE__*/React.createElement("p", {
          className: "text-xs leading-relaxed break-words whitespace-pre-wrap select-text px-4 pt-2 pb-3.5"
        }, renderParsedTextWeb(msg.text)), (msg.type === 'document' || msg.type === 'audio' || (msg.type === 'image' || msg.type === 'video') && msg.text) && /*#__PURE__*/React.createElement("span", {
          className: `text-[7px] font-mono block text-right mt-1.5 uppercase leading-none ${isMentor ? 'text-white/60' : 'text-gray-500'}`
        }, timeStr, isMentor && /*#__PURE__*/React.createElement("span", {
          className: `ml-1 font-sans font-bold ${msg.status === 'read' ? 'text-brand-cyan' : 'text-white/50'}`
        }, msg.status === 'sent' || !msg.status ? '✓' : '✓✓'))));
      } catch (renderErr) {
        console.error("Error rendering message:", renderErr);
        return /*#__PURE__*/React.createElement("div", {
          key: index,
          className: "flex w-full justify-start"
        }, /*#__PURE__*/React.createElement("div", {
          className: "max-w-[70%] rounded-2xl px-4 py-3 bg-rose-500/10 border border-rose-500/20 text-rose-500 text-[10px] font-mono"
        }, "[Error rendering message bubble]"));
      }
    });
  })()), /*#__PURE__*/React.createElement("form", {
    onSubmit: handleSendReply,
    className: "p-4 border-t border-white/5 bg-zinc-950/10 flex gap-3 items-center relative"
  }, showEmojiPicker && /*#__PURE__*/React.createElement("div", {
    className: "absolute bottom-20 left-4 bg-[#0d0d10]/95 border border-white/10 rounded-2xl p-3 shadow-2xl flex flex-wrap gap-2 w-64 backdrop-blur-xl z-50 select-none"
  }, ['😀', '😂', '😍', '👍', '🙌', '🔥', '❤️', '👏', '🎉', '🚀', '💡', '💯', '🤔', '😢', '😎', '💻'].map(emoji => /*#__PURE__*/React.createElement("button", {
    key: emoji,
    type: "button",
    onClick: () => {
      setReplyInput(prev => prev + emoji);
      if (replyInputRef.current) {
        replyInputRef.current.focus();
      }
    },
    className: "w-8 h-8 flex items-center justify-center text-lg rounded-lg hover:bg-white/10 active:scale-95 transition"
  }, emoji))), /*#__PURE__*/React.createElement("div", {
    className: "flex-grow flex items-center bg-white/[0.03] border border-white/10 rounded-2xl px-3 py-1.5 focus-within:border-brand-cyan/40 transition duration-300"
  }, isAdminRecording ? /*#__PURE__*/React.createElement("div", {
    className: "flex-grow flex items-center justify-between py-1"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-2 text-rose-500 font-mono text-xs font-bold uppercase"
  }, /*#__PURE__*/React.createElement("span", {
    className: "w-2.5 h-2.5 rounded-full bg-rose-500 animate-pulse"
  }), /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-0.5 px-1 h-3 select-none"
  }, /*#__PURE__*/React.createElement("span", {
    className: "w-0.5 h-2 bg-rose-500 rounded-full animate-wave-1 origin-center"
  }), /*#__PURE__*/React.createElement("span", {
    className: "w-0.5 h-3 bg-rose-500 rounded-full animate-wave-2 origin-center"
  }), /*#__PURE__*/React.createElement("span", {
    className: "w-0.5 h-1.5 bg-rose-500 rounded-full animate-wave-3 origin-center"
  }), /*#__PURE__*/React.createElement("span", {
    className: "w-0.5 h-2.5 bg-rose-500 rounded-full animate-wave-4 origin-center"
  }), /*#__PURE__*/React.createElement("span", {
    className: "w-0.5 h-3.5 bg-rose-500 rounded-full animate-wave-5 origin-center"
  })), /*#__PURE__*/React.createElement("span", null, "Recording ", Math.floor(adminRecordingDuration / 60), ":", (adminRecordingDuration % 60).toString().padStart(2, '0'))), /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: cancelAdminRecording,
    className: "text-rose-500 hover:text-rose-400 font-mono text-xs font-bold uppercase transition"
  }, "Cancel")) : adminChatUploadingProgress !== null ? /*#__PURE__*/React.createElement("div", {
    className: "w-full flex items-center justify-between py-1.5 px-2.5"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center space-x-3 flex-grow pr-4"
  }, /*#__PURE__*/React.createElement("span", {
    className: "text-[10px] font-mono font-bold text-brand-cyan uppercase tracking-wider whitespace-nowrap animate-pulse"
  }, "UPLOADING MEDIA"), /*#__PURE__*/React.createElement("div", {
    className: "flex-grow h-1.5 rounded bg-white/5 overflow-hidden"
  }, /*#__PURE__*/React.createElement("div", {
    className: "h-full bg-brand-cyan transition-all duration-300",
    style: {
      width: `${adminChatUploadingProgress}%`
    }
  }))), /*#__PURE__*/React.createElement("span", {
    className: "text-xs font-mono font-bold text-brand-cyan"
  }, adminChatUploadingProgress, "%")) : /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("input", {
    type: "file",
    id: "admin-file-input",
    className: "hidden",
    onChange: handleAdminFileUpload,
    disabled: sendingReply,
    accept: "image/*,video/*,audio/*,.pdf,.doc,.docx,.zip,.rar,.txt,.ppt,.pptx,.xls,.xlsx"
  }), /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: () => document.getElementById('admin-file-input').click(),
    disabled: sendingReply,
    title: "Attach document, image, or video",
    className: "p-1.5 mr-2 text-gray-500 hover:text-white transition shrink-0"
  }, /*#__PURE__*/React.createElement("svg", {
    xmlns: "http://www.w3.org/2000/svg",
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "2",
    strokeLinecap: "round",
    strokeLinejoin: "round",
    className: "w-5 h-5"
  }, /*#__PURE__*/React.createElement("path", {
    d: "M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l8.57-8.57A4 4 0 1 1 18 8.84l-8.59 8.57a2 2 0 0 1-2.83-2.83l8.49-8.48"
  }))), /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: () => setShowEmojiPicker(!showEmojiPicker),
    disabled: sendingReply,
    title: "Insert Emoji",
    className: `p-1.5 mr-2 transition shrink-0 ${showEmojiPicker ? 'text-brand-cyan' : 'text-gray-500 hover:text-white'}`
  }, /*#__PURE__*/React.createElement("svg", {
    xmlns: "http://www.w3.org/2000/svg",
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "2",
    strokeLinecap: "round",
    strokeLinejoin: "round",
    className: "w-5 h-5"
  }, /*#__PURE__*/React.createElement("circle", {
    cx: "12",
    cy: "12",
    r: "10"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M8 14s1.5 2 4 2 4-2 4-2"
  }), /*#__PURE__*/React.createElement("line", {
    x1: "9",
    y1: "9",
    x2: "9.01",
    y2: "9"
  }), /*#__PURE__*/React.createElement("line", {
    x1: "15",
    y1: "9",
    x2: "15.01",
    y2: "9"
  }))), /*#__PURE__*/React.createElement("textarea", {
    ref: replyInputRef,
    rows: 1,
    placeholder: "Type feedback, suggestions or replies...",
    value: replyInput,
    onChange: e => setReplyInput(e.target.value),
    onKeyDown: handleKeyDown,
    disabled: sendingReply,
    className: "flex-grow bg-transparent text-white text-xs placeholder-gray-600 focus:outline-none resize-none max-h-[120px] overflow-y-auto leading-normal"
  }))), replyInput.trim().length > 0 ? /*#__PURE__*/React.createElement("button", {
    type: "submit",
    disabled: sendingReply,
    className: "w-10 h-10 shrink-0 rounded-2xl bg-brand-cyan hover:scale-[1.03] active:scale-[0.97] transition-all flex items-center justify-center text-black shadow-[0_0_15px_rgba(0,240,255,0.25)] disabled:opacity-50 disabled:scale-100 disabled:shadow-none"
  }, sendingReply ? /*#__PURE__*/React.createElement("svg", {
    xmlns: "http://www.w3.org/2000/svg",
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "2",
    strokeLinecap: "round",
    strokeLinejoin: "round",
    className: "w-4 h-4 animate-spin text-black"
  }, /*#__PURE__*/React.createElement("polyline", {
    points: "23 4 23 10 17 10"
  }), /*#__PURE__*/React.createElement("polyline", {
    points: "1 20 1 14 7 14"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"
  })) : /*#__PURE__*/React.createElement("svg", {
    xmlns: "http://www.w3.org/2000/svg",
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "2",
    strokeLinecap: "round",
    strokeLinejoin: "round",
    className: "w-4 h-4 text-black ml-0.5"
  }, /*#__PURE__*/React.createElement("line", {
    x1: "22",
    y1: "2",
    x2: "11",
    y2: "13"
  }), /*#__PURE__*/React.createElement("polygon", {
    points: "22 2 15 22 11 13 2 9 22 2"
  }))) : isAdminRecording ? /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: stopAdminRecording,
    className: "w-10 h-10 shrink-0 rounded-2xl bg-rose-500 animate-pulse hover:scale-[1.03] active:scale-[0.97] transition-all flex items-center justify-center text-white shadow-[0_0_15px_rgba(239,68,68,0.25)]",
    title: "Stop and send recording"
  }, /*#__PURE__*/React.createElement("svg", {
    xmlns: "http://www.w3.org/2000/svg",
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "2",
    strokeLinecap: "round",
    strokeLinejoin: "round",
    className: "w-4 h-4 text-white fill-white"
  }, /*#__PURE__*/React.createElement("rect", {
    x: "4",
    y: "4",
    width: "16",
    height: "16",
    rx: "2",
    ry: "2"
  }))) : /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: startAdminRecording,
    disabled: sendingReply,
    className: "w-10 h-10 shrink-0 rounded-2xl bg-brand-cyan hover:scale-[1.03] active:scale-[0.97] transition-all flex items-center justify-center text-black shadow-[0_0_15px_rgba(0,240,255,0.25)] disabled:opacity-50 disabled:scale-100",
    title: "Record a voice note"
  }, /*#__PURE__*/React.createElement("svg", {
    xmlns: "http://www.w3.org/2000/svg",
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "2",
    strokeLinecap: "round",
    strokeLinejoin: "round",
    className: "w-4 h-4 text-black"
  }, /*#__PURE__*/React.createElement("path", {
    d: "M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M19 10v1a7 7 0 0 1-14 0v-1"
  }), /*#__PURE__*/React.createElement("line", {
    x1: "12",
    y1: "19",
    x2: "12",
    y2: "23"
  }), /*#__PURE__*/React.createElement("line", {
    x1: "8",
    y1: "23",
    x2: "16",
    y2: "23"
  }))))))), adminTab === 'lectures' && /*#__PURE__*/React.createElement("div", {
    className: "flex flex-col space-y-6 lg:space-y-8 text-left"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex flex-wrap items-center justify-between gap-4"
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("h2", {
    className: "text-xl lg:text-2xl font-black uppercase text-white font-heading"
  }, "Course Video Lectures Manager"), /*#__PURE__*/React.createElement("p", {
    className: "text-xs lg:text-sm text-gray-500 font-mono mt-0.5"
  }, "Filter, upload, and control streaming content lists")), /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: () => setShowAddLectureModal(true),
    className: "px-5 py-3 lg:px-7 lg:py-3.5 rounded-2xl text-xs lg:text-sm font-bold uppercase tracking-wider text-black bg-brand-cyan hover:scale-[1.02] active:scale-[0.98] transition shadow-[0_0_20px_rgba(0,240,255,0.15)] flex items-center gap-2"
  }, /*#__PURE__*/React.createElement("svg", {
    xmlns: "http://www.w3.org/2000/svg",
    width: "14",
    height: "14",
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "3",
    strokeLinecap: "round",
    strokeLinejoin: "round",
    className: "lg:w-4 lg:h-4"
  }, /*#__PURE__*/React.createElement("line", {
    x1: "12",
    y1: "5",
    x2: "12",
    y2: "19"
  }), /*#__PURE__*/React.createElement("line", {
    x1: "5",
    y1: "12",
    x2: "19",
    y2: "12"
  })), "Add New Lecture")), /*#__PURE__*/React.createElement("div", {
    className: "flex flex-wrap items-center gap-1.5 bg-white/[0.02] border border-white/5 p-1.5 lg:p-2 rounded-2xl font-mono text-[10px] lg:text-xs font-bold"
  }, Object.keys(DEFAULT_COURSE_CURRICULUM).map(course => /*#__PURE__*/React.createElement("button", {
    key: course,
    onClick: () => setAdminSelectedLectureCourse(course),
    className: `px-4 py-2 lg:px-5 lg:py-2.5 rounded-xl transition ${adminSelectedLectureCourse === course ? 'bg-brand-violet text-white shadow-[0_0_15px_rgba(168,85,247,0.25)]' : 'text-gray-400 hover:text-white hover:bg-white/5'}`
  }, course))), /*#__PURE__*/React.createElement("div", {
    className: "liquid-glass border border-white/5 rounded-3xl overflow-hidden p-6 lg:p-8"
  }, (() => {
    const list = getMergedLectures()[adminSelectedLectureCourse] || [];
    if (list.length === 0) {
      return /*#__PURE__*/React.createElement("div", {
        className: "py-12 text-center text-gray-600 font-mono text-xs lg:text-sm italic"
      }, "No lectures uploaded for this course yet. Click 'Add New Lecture' above.");
    }
    return /*#__PURE__*/React.createElement("div", {
      className: "overflow-x-auto"
    }, /*#__PURE__*/React.createElement("table", {
      className: "w-full font-mono text-xs lg:text-sm border-collapse"
    }, /*#__PURE__*/React.createElement("thead", null, /*#__PURE__*/React.createElement("tr", {
      className: "border-b border-white/5 text-gray-500 uppercase tracking-widest text-[9px] lg:text-xs font-bold"
    }, /*#__PURE__*/React.createElement("th", {
      className: "py-3.5 lg:py-4 text-left pl-2 lg:pl-4"
    }, "#"), /*#__PURE__*/React.createElement("th", {
      className: "py-3.5 lg:py-4 text-left"
    }, "Lecture Title"), /*#__PURE__*/React.createElement("th", {
      className: "py-3.5 lg:py-4 text-left"
    }, "Difficulty"), /*#__PURE__*/React.createElement("th", {
      className: "py-3.5 lg:py-4 text-left"
    }, "Duration"), /*#__PURE__*/React.createElement("th", {
      className: "py-3.5 lg:py-4 text-left"
    }, "Resources"), /*#__PURE__*/React.createElement("th", {
      className: "py-3.5 lg:py-4 text-center pr-2 lg:pr-4"
    }, "Actions"))), /*#__PURE__*/React.createElement("tbody", null, list.map((lec, idx) => /*#__PURE__*/React.createElement("tr", {
      key: lec.id,
      className: "border-b border-white/[0.02] hover:bg-white/[0.01] transition-all"
    }, /*#__PURE__*/React.createElement("td", {
      className: "py-4 lg:py-5 text-gray-600 pl-2 lg:pl-4"
    }, idx + 1), /*#__PURE__*/React.createElement("td", {
      className: "py-4 lg:py-5"
    }, /*#__PURE__*/React.createElement("p", {
      className: "font-bold text-gray-200"
    }, lec.title), /*#__PURE__*/React.createElement("p", {
      className: "text-[10px] lg:text-xs text-gray-500 truncate max-w-sm mt-0.5"
    }, lec.description)), /*#__PURE__*/React.createElement("td", {
      className: "py-4 lg:py-5"
    }, /*#__PURE__*/React.createElement("span", {
      className: `px-2 py-0.5 rounded text-[9px] lg:text-xs font-bold border ${lec.difficulty === 'Beginner' ? 'bg-brand-emerald/10 border-brand-emerald/25 text-brand-emerald' : lec.difficulty === 'Intermediate' ? 'bg-brand-cyan/10 border-brand-cyan/25 text-brand-cyan' : 'bg-rose-500/10 border-rose-500/25 text-rose-500'}`
    }, lec.difficulty)), /*#__PURE__*/React.createElement("td", {
      className: "py-4 lg:py-5 text-gray-400"
    }, lec.duration), /*#__PURE__*/React.createElement("td", {
      className: "py-4 lg:py-5 text-gray-400"
    }, (lec.resources || []).length, " items"), /*#__PURE__*/React.createElement("td", {
      className: "py-4 lg:py-5 text-center pr-2 lg:pr-4 whitespace-nowrap"
    }, /*#__PURE__*/React.createElement("div", {
      className: "inline-flex items-center gap-1.5"
    }, /*#__PURE__*/React.createElement("button", {
      type: "button",
      onClick: () => {
        setEditingLecture(lec);
        setNewLectureTitle(lec.title || '');
        setNewLectureDesc(lec.description || '');
        setNewLectureDifficulty(lec.difficulty || 'Beginner');
        setNewLectureDuration(lec.duration || '1 min');
        setNewLectureTags((lec.tags || []).join(', '));
        setNewLectureVideoUrl(lec.videoUrl || '');
        setNewLectureResources(lec.resources || []);
        setShowAddLectureModal(true);
      },
      className: "px-3 py-1.5 lg:px-4 lg:py-2 rounded-lg bg-brand-cyan/10 hover:bg-brand-cyan border border-brand-cyan/20 text-brand-cyan hover:text-black transition"
    }, "Edit"), /*#__PURE__*/React.createElement("button", {
      type: "button",
      onClick: () => {
        if (confirm(`Are you sure you want to delete lecture "${lec.title}"?`)) {
          handleDeleteLecture(adminSelectedLectureCourse, lec.id);
        }
      },
      className: "px-3 py-1.5 lg:px-4 lg:py-2 rounded-lg bg-rose-500/10 hover:bg-rose-500 border border-rose-500/20 text-rose-500 hover:text-white transition"
    }, "Delete"))))))));
  })())), showAddLectureModal && /*#__PURE__*/React.createElement("div", {
    className: "fixed inset-0 z-[100002] bg-black/80 backdrop-blur-md flex items-center justify-center p-4"
  }, /*#__PURE__*/React.createElement("div", {
    className: "relative w-full max-w-lg lg:max-w-5xl rounded-3xl border border-white/10 text-left",
    style: {
      background: 'linear-gradient(145deg, #0e0e0e 0%, #111111 100%)',
      boxShadow: '0 0 60px rgba(0,240,255,0.15), 0 30px 80px rgba(0,0,0,0.8)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "h-1 w-full bg-gradient-to-r from-brand-cyan to-brand-blue"
  }), /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: () => {
      setShowAddLectureModal(false);
      setNewLectureTitle('');
      setNewLectureDesc('');
      setNewLectureDifficulty('Beginner');
      setNewLectureDuration('1 min');
      setNewLectureTags('');
      setNewLectureVideoUrl('');
      setNewLectureResources([]);
      setEditingLecture(null);
    },
    className: "absolute top-4 right-4 w-8 h-8 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-gray-400 hover:text-white hover:bg-white/10 transition z-10"
  }, /*#__PURE__*/React.createElement("svg", {
    xmlns: "http://www.w3.org/2000/svg",
    width: "16",
    height: "16",
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "2.5"
  }, /*#__PURE__*/React.createElement("line", {
    x1: "18",
    y1: "6",
    x2: "6",
    y2: "18"
  }), /*#__PURE__*/React.createElement("line", {
    x1: "6",
    y1: "6",
    x2: "18",
    y2: "18"
  }))), /*#__PURE__*/React.createElement("form", {
    onSubmit: handleSaveNewLecture,
    className: "p-8 lg:p-10 max-h-[85vh] overflow-y-auto"
  }, /*#__PURE__*/React.createElement("h3", {
    className: "text-lg lg:text-xl font-black uppercase text-white font-heading tracking-wide mb-1 pr-8"
  }, editingLecture ? 'Edit Lecture' : 'Add Lecture to Syllabus'), /*#__PURE__*/React.createElement("p", {
    className: "text-[10px] lg:text-xs font-mono text-gray-500 uppercase tracking-widest mb-6"
  }, editingLecture ? `Editing: ${editingLecture.title}` : `Target: ${adminSelectedLectureCourse}`), /*#__PURE__*/React.createElement("div", {
    className: "lg:grid lg:grid-cols-2 lg:gap-10 space-y-4 lg:space-y-0"
  }, /*#__PURE__*/React.createElement("div", {
    className: "space-y-4"
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    className: "text-[9px] lg:text-[11px] font-mono text-gray-500 uppercase tracking-widest block mb-1.5"
  }, "Lecture Title"), /*#__PURE__*/React.createElement("input", {
    type: "text",
    placeholder: "e.g. Photoshop Layout Design Masterclass",
    value: newLectureTitle,
    onChange: e => setNewLectureTitle(e.target.value),
    className: "w-full px-4 py-2.5 rounded-xl bg-white/[0.03] border border-white/10 text-white text-xs focus:outline-none focus:border-brand-cyan/50 transition",
    style: {
      outline: 'none'
    }
  })), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    className: "text-[9px] font-mono text-gray-500 uppercase tracking-widest block mb-1.5"
  }, "Summary / Description"), /*#__PURE__*/React.createElement("textarea", {
    placeholder: "Provide student reference overview details...",
    value: newLectureDesc,
    onChange: e => setNewLectureDesc(e.target.value),
    rows: 4,
    className: "w-full px-4 py-2.5 rounded-xl bg-white/[0.03] border border-white/10 text-white text-xs focus:outline-none focus:border-brand-cyan/50 transition resize-none",
    style: {
      outline: 'none'
    }
  })), /*#__PURE__*/React.createElement("div", {
    className: "grid grid-cols-2 gap-4"
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    className: "text-[9px] font-mono text-gray-500 uppercase tracking-widest block mb-1.5"
  }, "Difficulty level"), /*#__PURE__*/React.createElement("select", {
    value: newLectureDifficulty,
    onChange: e => setNewLectureDifficulty(e.target.value),
    className: "w-full px-4 py-2.5 rounded-xl bg-[#111] border border-white/10 text-white text-xs focus:outline-none focus:border-brand-cyan/50 transition",
    style: {
      outline: 'none'
    }
  }, /*#__PURE__*/React.createElement("option", {
    value: "Beginner"
  }, "Beginner"), /*#__PURE__*/React.createElement("option", {
    value: "Intermediate"
  }, "Intermediate"), /*#__PURE__*/React.createElement("option", {
    value: "Advanced"
  }, "Advanced"))), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    className: "text-[9px] font-mono text-gray-500 uppercase tracking-widest block mb-1.5"
  }, "Duration"), /*#__PURE__*/React.createElement("input", {
    type: "text",
    placeholder: "e.g. 15 mins, 2 mins",
    value: newLectureDuration,
    onChange: e => setNewLectureDuration(e.target.value),
    className: "w-full px-4 py-2.5 rounded-xl bg-white/[0.03] border border-white/10 text-white text-xs focus:outline-none focus:border-brand-cyan/50 transition",
    style: {
      outline: 'none'
    }
  }))), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    className: "text-[9px] font-mono text-gray-500 uppercase tracking-widest block mb-1.5"
  }, "Tags (Comma Separated)"), /*#__PURE__*/React.createElement("input", {
    type: "text",
    placeholder: "e.g. CGI, Composition, Photoshop",
    value: newLectureTags,
    onChange: e => setNewLectureTags(e.target.value),
    className: "w-full px-4 py-2.5 rounded-xl bg-white/[0.03] border border-white/10 text-white text-xs focus:outline-none focus:border-brand-cyan/50 transition",
    style: {
      outline: 'none'
    }
  }))), /*#__PURE__*/React.createElement("div", {
    className: "space-y-5"
  }, /*#__PURE__*/React.createElement("div", {
    className: "p-4 lg:p-6 rounded-2xl bg-white/[0.01] border border-white/5 space-y-3 lg:space-y-4"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center justify-between"
  }, /*#__PURE__*/React.createElement("label", {
    className: "text-[9px] font-mono text-brand-cyan uppercase tracking-widest font-bold"
  }, "Lecture Video"), /*#__PURE__*/React.createElement("span", {
    className: "text-[8px] font-mono text-gray-500"
  }, "PASTE DIRECT LINK OR UPLOAD")), /*#__PURE__*/React.createElement("input", {
    type: "text",
    placeholder: "Paste .mp4 link or YouTube URL...",
    value: newLectureVideoUrl,
    onChange: e => setNewLectureVideoUrl(e.target.value),
    className: "w-full px-4 py-2.5 rounded-xl bg-white/[0.03] border border-white/10 text-white text-xs focus:outline-none focus:border-brand-cyan/50 transition",
    style: {
      outline: 'none'
    }
  }), /*#__PURE__*/React.createElement("div", {
    className: "flex items-center space-x-3"
  }, /*#__PURE__*/React.createElement("label", {
    className: "px-4 py-2 bg-white/5 border border-white/10 text-[10px] font-mono font-bold rounded-lg cursor-pointer hover:bg-white/10 hover:text-white transition shrink-0"
  }, /*#__PURE__*/React.createElement("input", {
    type: "file",
    className: "hidden",
    accept: "video/*",
    onChange: handleAdminLectureUpload
  }), "Choose Video File \uD83C\uDFA5"), lectureUploadingProgress !== null && /*#__PURE__*/React.createElement("div", {
    className: "flex-grow flex items-center space-x-2"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex-grow h-1.5 rounded bg-white/5 overflow-hidden"
  }, /*#__PURE__*/React.createElement("div", {
    className: "h-full bg-brand-cyan transition-all duration-300",
    style: {
      width: `${lectureUploadingProgress}%`
    }
  })), /*#__PURE__*/React.createElement("span", {
    className: "text-[9px] font-mono text-brand-cyan font-bold"
  }, lectureUploadingProgress, "%")))), /*#__PURE__*/React.createElement("div", {
    className: "p-4 lg:p-6 rounded-2xl bg-white/[0.01] border border-white/5 space-y-3 lg:space-y-4"
  }, /*#__PURE__*/React.createElement("label", {
    className: "text-[9px] lg:text-[11px] font-mono text-brand-violet uppercase tracking-widest block font-bold"
  }, "Downloadable Resources"), newLectureResources.length > 0 && /*#__PURE__*/React.createElement("div", {
    className: "space-y-1.5 max-h-28 overflow-y-auto mb-2"
  }, newLectureResources.map((res, i) => /*#__PURE__*/React.createElement("div", {
    key: i,
    className: "flex items-center justify-between text-[10px] lg:text-xs bg-white/5 px-3 py-1.5 lg:px-4 lg:py-2 rounded-lg border border-white/5 font-mono"
  }, /*#__PURE__*/React.createElement("span", {
    className: "truncate max-w-[160px] text-gray-300"
  }, res.name, " (", res.size, ")"), /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: () => setNewLectureResources(prev => prev.filter((_, idx) => idx !== i)),
    className: "text-rose-500 hover:text-white transition shrink-0"
  }, "Remove")))), /*#__PURE__*/React.createElement("div", {
    className: "flex items-center space-x-3"
  }, /*#__PURE__*/React.createElement("label", {
    className: "px-4 py-2 lg:px-5 lg:py-2.5 bg-white/5 border border-white/10 text-[10px] lg:text-xs font-mono font-bold rounded-lg cursor-pointer hover:bg-white/10 hover:text-white transition"
  }, /*#__PURE__*/React.createElement("input", {
    type: "file",
    className: "hidden",
    onChange: handleAdminResourceUpload
  }), "Upload Template File \uD83D\uDCC1"), resourceUploadingProgress !== null && /*#__PURE__*/React.createElement("div", {
    className: "flex-grow flex items-center space-x-2"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex-grow h-1.5 rounded bg-white/5 overflow-hidden"
  }, /*#__PURE__*/React.createElement("div", {
    className: "h-full bg-brand-cyan transition-all duration-300",
    style: {
      width: `${resourceUploadingProgress}%`
    }
  })), /*#__PURE__*/React.createElement("span", {
    className: "text-[9px] lg:text-xs font-mono text-brand-cyan font-bold"
  }, resourceUploadingProgress, "%")))), /*#__PURE__*/React.createElement("button", {
    type: "submit",
    disabled: newLectureSaving,
    className: "w-full py-3.5 lg:py-4 rounded-xl text-xs lg:text-sm font-bold uppercase tracking-wider text-black transition bg-brand-cyan hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50 disabled:scale-100 shadow-[0_0_20px_rgba(0,240,255,0.15)]"
  }, newLectureSaving ? 'Saving...' : editingLecture ? 'Update Lecture & Sync' : 'Save Lecture & Sync'))))))))), isBlogOpen && /*#__PURE__*/React.createElement(BlogPage, {
    closeBlog: closeBlog
  }), activePreviewMedia && /*#__PURE__*/React.createElement("div", {
    onClick: () => setActivePreviewMedia(null),
    className: "fixed inset-0 z-[100010] bg-black/95 backdrop-blur-md flex items-center justify-center p-4"
  }, /*#__PURE__*/React.createElement("button", {
    onClick: () => setActivePreviewMedia(null),
    className: "absolute top-6 right-6 w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-gray-400 hover:text-white hover:bg-white/10 transition"
  }, /*#__PURE__*/React.createElement("svg", {
    xmlns: "http://www.w3.org/2000/svg",
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "2.5",
    className: "w-5 h-5"
  }, /*#__PURE__*/React.createElement("line", {
    x1: "18",
    y1: "6",
    x2: "6",
    y2: "18"
  }), /*#__PURE__*/React.createElement("line", {
    x1: "6",
    y1: "6",
    x2: "18",
    y2: "18"
  }))), mediaPreviewLoading && /*#__PURE__*/React.createElement("div", {
    className: "absolute inset-0 flex items-center justify-center"
  }, /*#__PURE__*/React.createElement("div", {
    className: "relative w-16 h-16"
  }, /*#__PURE__*/React.createElement("div", {
    className: "absolute inset-0 rounded-full border-2 border-brand-cyan/20"
  }), /*#__PURE__*/React.createElement("div", {
    className: "absolute inset-0 rounded-full border-2 border-transparent border-t-brand-cyan animate-spin"
  }), /*#__PURE__*/React.createElement("div", {
    className: "absolute inset-2 rounded-full border-2 border-transparent border-b-brand-blue animate-spin animation-delay-150",
    style: {
      animationDirection: 'reverse',
      animationDuration: '0.8s'
    }
  }), /*#__PURE__*/React.createElement("div", {
    className: "absolute inset-0 flex items-center justify-center"
  }, /*#__PURE__*/React.createElement("svg", {
    xmlns: "http://www.w3.org/2000/svg",
    width: "18",
    height: "18",
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "2",
    className: "text-brand-cyan/60"
  }, /*#__PURE__*/React.createElement("path", {
    d: "M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"
  }), /*#__PURE__*/React.createElement("polyline", {
    points: "14 2 14 8 20 8"
  }))))), /*#__PURE__*/React.createElement("div", {
    className: "max-w-4xl max-h-[85vh] relative",
    onClick: e => e.stopPropagation(),
    style: {
      opacity: mediaPreviewLoading ? 0 : 1,
      transition: 'opacity 0.3s ease'
    }
  }, activePreviewMedia.type === 'image' ? /*#__PURE__*/React.createElement("img", {
    src: activePreviewMedia.url,
    alt: "Fullscreen attachment preview",
    className: "max-h-[80vh] max-w-full object-contain rounded-2xl border border-white/15",
    onLoad: () => setMediaPreviewLoading(false),
    style: mediaPreviewLoading ? {
      display: 'none'
    } : {}
  }) : (() => {
    const fileId = getDriveFileId(activePreviewMedia.url);
    if (fileId) {
      return /*#__PURE__*/React.createElement("iframe", {
        src: `https://drive.google.com/file/d/${fileId}/preview`,
        className: "w-[85vw] h-[48vh] md:w-[70vw] md:h-[60vh] max-w-4xl rounded-2xl border border-white/15 bg-black",
        allow: "autoplay",
        allowFullScreen: true,
        onLoad: () => setMediaPreviewLoading(false),
        style: mediaPreviewLoading ? {
          display: 'none'
        } : {}
      });
    }
    return /*#__PURE__*/React.createElement("video", {
      src: activePreviewMedia.url,
      controls: true,
      autoPlay: true,
      className: "max-h-[80vh] max-w-full rounded-2xl border border-white/15",
      onLoadedData: () => setMediaPreviewLoading(false),
      style: mediaPreviewLoading ? {
        display: 'none'
      } : {}
    });
  })())));
};
const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(/*#__PURE__*/React.createElement(App, null));


