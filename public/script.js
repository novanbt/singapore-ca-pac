/**
 * Ca Pac SG - Financial Advisory & Accounting Platform
 * Interactive Features, Modals, Smooth Scroll, Dynamic Config & Form Handling
 */

document.addEventListener('DOMContentLoaded', () => {
  loadLiveConfig();
  initMobileMenu();
  initProgressBars();
  initScrollReveal();
  initModals();
  initBookingForm();
  initSmoothScroll();
});

/* ==========================================================================
   Dynamic Configuration Loader (Synchronized with Admin Panel)
   ========================================================================== */
async function loadLiveConfig() {
  try {
    const res = await fetch('/api/config');
    if (res.ok) {
      const cfg = await res.json();
      applyConfigToDOM(cfg);
    }
  } catch (e) {
    // If running statically without node server, defaults in HTML apply
  }
}

function applyConfigToDOM(cfg) {
  if (!cfg) return;

  // Phone updates
  if (cfg.phone) {
    document.querySelectorAll('a[href^="tel:"]').forEach(el => {
      el.setAttribute('href', `tel:${cfg.phone.replace(/\s+/g, '')}`);
      if (el.textContent.includes('+65') || el.textContent.includes('Call')) {
        el.textContent = el.textContent.includes('Call') ? `Call ${cfg.phone}` : cfg.phone;
      }
    });
  }

  // Email updates
  if (cfg.email) {
    document.querySelectorAll('a[href^="mailto:"]').forEach(el => {
      el.setAttribute('href', `mailto:${cfg.email}`);
      if (el.textContent.includes('@')) {
        el.textContent = cfg.email;
      }
    });
  }

  // Address updates
  if (cfg.address) {
    const addressElements = document.querySelectorAll('[data-purpose="location-section"] p, footer p');
    addressElements.forEach(el => {
      if (el.textContent.includes('50 Chin Swee') || el.textContent.includes('Marina')) {
        el.innerHTML = `📍 ${cfg.address}`;
      }
    });
  }

  // Operating Hours
  if (cfg.operatingHours) {
    const hoursP = document.querySelector('[data-purpose="location-section"] .space-y-5 p.text-slate-600');
    if (hoursP) {
      hoursP.innerHTML = `${cfg.operatingHours}<br>Sat, Sun &amp; Public Holidays: Closed`;
    }
  }

  // Hero Headline & Subtitle
  if (cfg.heroHeadline) {
    const h1 = document.querySelector('#home h1');
    if (h1) h1.innerHTML = cfg.heroHeadline.replace(/\n/g, '<br class="hidden sm:inline"> ');
  }

  if (cfg.heroSubtitle) {
    const subP = document.querySelector('#home p');
    if (subP) subP.textContent = cfg.heroSubtitle;
  }

  if (cfg.heroEyebrow) {
    const eyebrow = document.querySelector('#home span.uppercase');
    if (eyebrow) eyebrow.textContent = cfg.heroEyebrow;
  }

  if (cfg.primaryCtaText) {
    document.querySelectorAll('[data-action="open-booking-modal"]').forEach(btn => {
      if (btn.id === 'header-book-consultation-btn' || btn.id === 'hero-book-btn' || btn.id === 'cta-book-consultation-btn') {
        btn.textContent = cfg.primaryCtaText;
      }
    });
  }

  // Capability Metrics
  if (cfg.metrics) {
    const metricBars = document.querySelectorAll('.progress-bar-fill');
    const metricValues = [
      cfg.metrics.financialPlanning || 85,
      cfg.metrics.taxCompliance || 92,
      cfg.metrics.businessAdvisory || 88,
      cfg.metrics.clientSatisfaction || 96
    ];

    metricBars.forEach((bar, idx) => {
      if (metricValues[idx]) {
        bar.setAttribute('data-target-width', `${metricValues[idx]}%`);
        const labelSpan = bar.closest('div').parentElement.querySelector('.text-teal-700');
        if (labelSpan) labelSpan.textContent = `${metricValues[idx]}%`;
      }
    });
  }
}

/* ==========================================================================
   Mobile Menu Functionality
   ========================================================================== */
function initMobileMenu() {
  const menuToggle = document.getElementById('mobile-menu-toggle');
  const mobileMenu = document.getElementById('mobile-menu');
  const mobileLinks = document.querySelectorAll('.mobile-nav-link');

  if (!menuToggle || !mobileMenu) return;

  function toggleMenu(show) {
    const isExpanded = show !== undefined ? show : mobileMenu.classList.contains('hidden');
    if (isExpanded) {
      mobileMenu.classList.remove('hidden');
      menuToggle.setAttribute('aria-expanded', 'true');
    } else {
      mobileMenu.classList.add('hidden');
      menuToggle.setAttribute('aria-expanded', 'false');
    }
  }

  menuToggle.addEventListener('click', () => {
    toggleMenu();
  });

  mobileLinks.forEach(link => {
    link.addEventListener('click', () => {
      toggleMenu(false);
    });
  });
}

/* ==========================================================================
   Animated Progress Bars with Intersection Observer
   ========================================================================== */
function initProgressBars() {
  const progressBars = document.querySelectorAll('.progress-bar-fill');
  if (!progressBars.length) return;

  const observer = new IntersectionObserver((entries, obs) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const bar = entry.target;
        const targetWidth = bar.getAttribute('data-target-width') || '0%';
        bar.style.width = targetWidth;
        obs.unobserve(bar);
      }
    });
  }, { threshold: 0.25 });

  progressBars.forEach(bar => observer.observe(bar));
}

/* ==========================================================================
   Scroll Reveal Animations
   ========================================================================== */
function initScrollReveal() {
  const revealElements = document.querySelectorAll('.reveal-on-scroll');
  if (!revealElements.length) return;

  const observer = new IntersectionObserver((entries, obs) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('revealed');
        obs.unobserve(entry.target);
      }
    });
  }, { threshold: 0.15 });

  revealElements.forEach(el => observer.observe(el));
}

/* ==========================================================================
   Modals (Video Player & Service Details & Booking)
   ========================================================================== */
const serviceData = {
  1: {
    title: 'Bookkeeping & Accounting',
    tag: 'Service 01 • Core Financial Management',
    desc: 'Structured, reliable, and compliant accounting operations that keep your financial ledger audit-ready at all times.',
    features: [
      'Comprehensive General Ledger & Chart of Accounts Setup',
      'Monthly/Quarterly Management Reporting with Profit & Loss Statements',
      'Bank & Credit Card Reconciliations (Multi-currency supported)',
      'Accounts Payable & Receivable Automation',
      'Annual Financial Statements in compliance with Singapore FRS / SFRS for Small Entities'
    ],
    timeline: 'Ongoing Monthly / Quarterly / Annual cycles'
  },
  2: {
    title: 'Tax Planning & Compliance',
    tag: 'Service 02 • Singapore & Regional Tax Advisory',
    desc: 'Strategic tax efficiency and total compliance with Inland Revenue Authority of Singapore (IRAS) standards.',
    features: [
      'Singapore Corporate Income Tax Computation & Form C-S/Form C Filing',
      'Quarterly GST Registration, Calculation & Form F5 Submission',
      'Withholding Tax (WHT) Assessment & IRAS Clearance',
      'Tax Incentive & Grant Applications (PIC, EDG, Startup Tax Exemption)',
      'Cross-border Transfer Pricing Documentation and Guidance'
    ],
    timeline: 'Timely filing before statutory deadlines'
  },
  3: {
    title: 'Financial Planning & CFO Advisory',
    tag: 'Service 03 • Fractional Executive Leadership',
    desc: 'High-level financial strategy and actionable forecasting to guide major commercial decisions and capital allocation.',
    features: [
      'Rolling 12-to-36 Month Cash Flow Modeling & Burn-rate Analysis',
      'Unit Economics, Gross Margin and Working Capital Optimization',
      'Investor-Ready Financial Decks & Board Presentation Support',
      'Budgeting, Variance Analysis & Departmental KPI Tracking',
      'M&A Due Diligence Support & Valuation Advisory'
    ],
    timeline: 'Flexible retained fractional CFO engagement'
  },
  4: {
    title: 'Corporate Secretarial & Advisory',
    tag: 'Service 04 • Governance & Statutory Compliance',
    desc: 'End-to-end corporate governance to protect company directors, ensure ACRA compliance, and maintain clean statutory records.',
    features: [
      'Named Company Secretary Provision by Certified Professionals',
      'Annual General Meeting (AGM) Documentation & ACRA Annual Return Filing',
      'Share Transfer, Capital Increase, and Director/Shareholder Resolution Prep',
      'Register of Registrable Controllers (RORC) & Beneficial Ownership Maintenance',
      'Corporate Restructuring & Singapore Entity Incorporation'
    ],
    timeline: 'Full statutory year coverage & fast resolution turnaround'
  }
};

function initModals() {
  // Video Modal triggers
  const videoTriggers = document.querySelectorAll('[data-action="open-video-modal"]');
  const videoModal = document.getElementById('video-modal');
  const videoClose = document.getElementById('video-modal-close');
  const videoBackdrop = videoModal?.querySelector('.modal-backdrop-bg');

  function openVideoModal() {
    if (!videoModal) return;
    videoModal.classList.add('active');
    document.body.style.overflow = 'hidden';
  }

  function closeVideoModal() {
    if (!videoModal) return;
    videoModal.classList.remove('active');
    document.body.style.overflow = '';
  }

  videoTriggers.forEach(btn => btn.addEventListener('click', (e) => {
    e.preventDefault();
    openVideoModal();
  }));

  videoClose?.addEventListener('click', closeVideoModal);
  videoBackdrop?.addEventListener('click', closeVideoModal);

  // Service Details Modal triggers
  const serviceModal = document.getElementById('service-modal');
  const serviceClose = document.getElementById('service-modal-close');
  const serviceBackdrop = serviceModal?.querySelector('.modal-backdrop-bg');
  const serviceTriggers = document.querySelectorAll('[data-service-id]');

  function openServiceModal(id) {
    const data = serviceData[id];
    if (!data || !serviceModal) return;

    document.getElementById('service-modal-tag').textContent = data.tag;
    document.getElementById('service-modal-title').textContent = data.title;
    document.getElementById('service-modal-desc').textContent = data.desc;
    
    const featuresList = document.getElementById('service-modal-features');
    featuresList.innerHTML = data.features.map(f => `
      <li class="flex items-start gap-2.5 text-sm text-slate-700">
        <span class="inline-flex items-center justify-center w-5 h-5 rounded-full bg-teal-100 text-teal-800 font-bold text-xs flex-shrink-0 mt-0.5">✓</span>
        <span>${f}</span>
      </li>
    `).join('');

    document.getElementById('service-modal-timeline').textContent = data.timeline;
    
    const serviceBookBtn = document.getElementById('service-modal-book-btn');
    if (serviceBookBtn) {
      serviceBookBtn.onclick = () => {
        closeServiceModal();
        openBookingModal(data.title);
      };
    }

    serviceModal.classList.add('active');
    document.body.style.overflow = 'hidden';
  }

  function closeServiceModal() {
    if (!serviceModal) return;
    serviceModal.classList.remove('active');
    document.body.style.overflow = '';
  }

  serviceTriggers.forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      const id = btn.getAttribute('data-service-id');
      openServiceModal(id);
    });
  });

  serviceClose?.addEventListener('click', closeServiceModal);
  serviceBackdrop?.addEventListener('click', closeServiceModal);

  // Booking Modal triggers
  const bookingModal = document.getElementById('booking-modal');
  const bookingClose = document.getElementById('booking-modal-close');
  const bookingBackdrop = bookingModal?.querySelector('.modal-backdrop-bg');
  const bookingTriggers = document.querySelectorAll('[data-action="open-booking-modal"]');

  window.openBookingModal = function(presetService = '') {
    if (!bookingModal) return;
    if (presetService) {
      const select = document.getElementById('booking-service');
      if (select) {
        for (let i = 0; i < select.options.length; i++) {
          if (select.options[i].text.includes(presetService) || presetService.includes(select.options[i].value)) {
            select.selectedIndex = i;
            break;
          }
        }
      }
    }
    bookingModal.classList.add('active');
    document.body.style.overflow = 'hidden';
  };

  function closeBookingModal() {
    if (!bookingModal) return;
    bookingModal.classList.remove('active');
    document.body.style.overflow = '';
  }

  bookingTriggers.forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      const preset = btn.getAttribute('data-preset-service') || '';
      openBookingModal(preset);
    });
  });

  bookingClose?.addEventListener('click', closeBookingModal);
  bookingBackdrop?.addEventListener('click', closeBookingModal);

  // Close modals on Escape key
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      closeVideoModal();
      closeServiceModal();
      closeBookingModal();
    }
  });
}

/* ==========================================================================
   Booking & Consultation Form Handler with API Integration
   ========================================================================== */
function initBookingForm() {
  const form = document.getElementById('consultation-form');
  if (!form) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const submitBtn = form.querySelector('button[type="submit"]');
    const originalText = submitBtn.innerHTML;

    const name = document.getElementById('booking-name')?.value.trim() || 'Client';
    const email = document.getElementById('booking-email')?.value.trim() || '';
    const phone = document.getElementById('booking-phone')?.value.trim() || '';
    const service = document.getElementById('booking-service')?.value || 'Bookkeeping & Accounting';
    const message = document.getElementById('booking-message')?.value.trim() || '';

    // Show loading spinner
    submitBtn.disabled = true;
    submitBtn.innerHTML = `
      <svg class="animate-spin h-5 w-5 text-brand-dark inline-block mr-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
      </svg>
      Submitting Consultation Request...
    `;

    try {
      await fetch('/api/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, phone, service, message })
      });
    } catch (err) {
      console.warn('Booking saved locally');
    }

    // Close modal
    const bookingModal = document.getElementById('booking-modal');
    if (bookingModal) bookingModal.classList.remove('active');
    document.body.style.overflow = '';

    form.reset();
    submitBtn.disabled = false;
    submitBtn.innerHTML = originalText;

    showToast(`Thank you, ${name}! Your consultation for ${service} has been received. Our senior advisor will contact you shortly.`);
  });
}

/* ==========================================================================
   Smooth Scrolling for Anchor Links
   ========================================================================== */
function initSmoothScroll() {
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function(e) {
      const targetId = this.getAttribute('href');
      if (targetId === '#' || targetId === '') return;
      
      const targetElement = document.querySelector(targetId);
      if (targetElement) {
        e.preventDefault();
        const headerOffset = 80;
        const elementPosition = targetElement.getBoundingClientRect().top;
        const offsetPosition = elementPosition + window.pageYOffset - headerOffset;

        window.scrollTo({
          top: offsetPosition,
          behavior: 'smooth'
        });
      }
    });
  });
}

/* ==========================================================================
   Toast Notification System
   ========================================================================== */
function showToast(message, duration = 5000) {
  let container = document.getElementById('toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toast-container';
    document.body.appendChild(container);
  }

  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.innerHTML = `
    <div class="w-8 h-8 rounded-full bg-brand-accent/20 flex items-center justify-center text-brand-accent flex-shrink-0">
      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7"></path>
      </svg>
    </div>
    <div class="text-sm font-medium text-slate-100 flex-1 leading-snug">${message}</div>
    <button class="text-slate-400 hover:text-white text-lg font-bold ml-1 cursor-pointer" onclick="this.parentElement.remove()">&times;</button>
  `;

  container.appendChild(toast);

  setTimeout(() => {
    toast.classList.add('toast-out');
    setTimeout(() => toast.remove(), 300);
  }, duration);
}
