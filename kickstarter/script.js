/* ═══════════════════════════════════════════════════════════
   Ashenholm Kickstarter — Interactive Scripts
   ═══════════════════════════════════════════════════════════ */

document.addEventListener('DOMContentLoaded', () => {
    initNavScroll();
    initSmoothScroll();
    initFAQ();
    initScrollAnimations();
    initCountUp();
    initRosterMarquee();
});

/* ── Sticky Nav Background ─────────────────────────────────── */
function initNavScroll() {
    const nav = document.getElementById('main-nav');
    if (!nav) return;

    const onScroll = () => {
        if (window.scrollY > 80) {
            nav.classList.add('scrolled');
        } else {
            nav.classList.remove('scrolled');
        }
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
}

/* ── Smooth Scroll for Anchor Links ────────────────────────── */
function initSmoothScroll() {
    document.querySelectorAll('a[href^="#"]').forEach(link => {
        link.addEventListener('click', (e) => {
            const target = document.querySelector(link.getAttribute('href'));
            if (target) {
                e.preventDefault();
                const offset = 80; // nav height
                const top = target.getBoundingClientRect().top + window.scrollY - offset;
                window.scrollTo({ top, behavior: 'smooth' });
            }
        });
    });
}

/* ── FAQ Accordion ─────────────────────────────────────────── */
function initFAQ() {
    document.querySelectorAll('.faq-question').forEach(btn => {
        btn.addEventListener('click', () => {
            const item = btn.closest('.faq-item');
            const isOpen = item.classList.contains('open');

            // Close all
            document.querySelectorAll('.faq-item.open').forEach(openItem => {
                openItem.classList.remove('open');
            });

            // Toggle clicked
            if (!isOpen) {
                item.classList.add('open');
            }
        });
    });
}

/* ── Scroll-Triggered Animations ───────────────────────────── */
function initScrollAnimations() {
    const observerOptions = {
        root: null,
        rootMargin: '0px 0px -60px 0px',
        threshold: 0.1
    };

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const delay = parseInt(entry.target.dataset.delay || 0);
                setTimeout(() => {
                    entry.target.classList.add('visible');
                }, delay);
                observer.unobserve(entry.target);
            }
        });
    }, observerOptions);

    // Observe feature cards
    document.querySelectorAll('.feature-card').forEach(card => {
        observer.observe(card);
    });

    // Generic fade-in for sections
    const sectionObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.style.opacity = '1';
                entry.target.style.transform = 'translateY(0)';
                sectionObserver.unobserve(entry.target);
            }
        });
    }, { threshold: 0.05 });

    document.querySelectorAll('.pitch-point, .lore-block, .sim-event, .step-card, .reward-card, .stretch-goal, .roadmap-section-label, .roadmap-stats, .guardrail-card, .ai-trust-block, .dm-guardrails').forEach(el => {
        el.style.opacity = '0';
        el.style.transform = 'translateY(20px)';
        el.style.transition = `opacity 0.6s ease ${parseInt(el.dataset?.delay || 0)}ms, transform 0.6s ease ${parseInt(el.dataset?.delay || 0)}ms`;
        sectionObserver.observe(el);
    });
}

/* ── Count Up Animation ────────────────────────────────────── */
function initCountUp() {
    const statEls = document.querySelectorAll('.hero-stat .stat-number');
    let hasAnimated = false;

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting && !hasAnimated) {
                hasAnimated = true;
                animateStats();
                observer.disconnect();
            }
        });
    }, { threshold: 0.5 });

    if (statEls.length > 0) {
        observer.observe(statEls[0]);
    }

    function animateStats() {
        // Pledged amount
        const pledgedEl = statEls[0];
        if (pledgedEl) {
            animateValue(pledgedEl, 0, 12847, 2000, (val) => `$${val.toLocaleString()}`);
        }

        // Backers
        const backersEl = statEls[1];
        if (backersEl) {
            animateValue(backersEl, 0, 342, 2000, (val) => val.toLocaleString());
        }
    }

    function animateValue(el, start, end, duration, formatter) {
        const startTime = performance.now();

        function update(currentTime) {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);

            // Ease out cubic
            const eased = 1 - Math.pow(1 - progress, 3);
            const current = Math.floor(start + (end - start) * eased);

            el.textContent = formatter(current);

            if (progress < 1) {
                requestAnimationFrame(update);
            }
        }

        requestAnimationFrame(update);
    }
}

/* ── Roster Auto-scroll (subtle) ───────────────────────────── */
function initRosterMarquee() {
    const roster = document.querySelector('.roster-scroll');
    if (!roster) return;

    // Add a subtle shimmer effect on hover
    roster.querySelectorAll('.roster-item').forEach((item, i) => {
        item.style.animationDelay = `${i * 0.05}s`;
    });
}

/* ── Parallax on Hero ──────────────────────────────────────── */
window.addEventListener('scroll', () => {
    const heroImg = document.getElementById('hero-bg-img');
    if (heroImg && window.scrollY < window.innerHeight) {
        heroImg.style.transform = `translateY(${window.scrollY * 0.3}px) scale(1.1)`;
    }
}, { passive: true });
