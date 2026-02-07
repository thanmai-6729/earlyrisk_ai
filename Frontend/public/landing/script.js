// ===== SIMPLE SMOOTH SCROLL (No Lenis) =====
// This is a lightweight smooth scroll that actually works

function bootLandingPage() {
    if (window.__SDD_LANDING_INITED) return;
    window.__SDD_LANDING_INITED = true;

    console.log('SilentDetect AI - Early Disease Detection System');

    // Initialize smooth scroll
    initSmoothScroll();

    // Initialize all other components
    initScrollProgress();
    initInputFields();
    initDashboardTabs();
    initMobileMenu();
    initNavigation();
    initDemoCalculator();
    initHealthSimulation();
    initButtonEvents();
}

function spaNavigate(path) {
    try {
        if (typeof path !== 'string') return;
        if (window.location.pathname === path) return;
        window.history.pushState({}, '', path);
        window.dispatchEvent(new PopStateEvent('popstate', { state: {} }));
    } catch {
        // Fallback to hard navigation if history APIs fail
        window.location.href = path;
    }
}

// Initialize (works in SPA where script may load after DOMContentLoaded)
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bootLandingPage);
} else {
    bootLandingPage();
}

// ===== SIMPLE SMOOTH SCROLL FUNCTION =====
function initSmoothScroll() {
    // Smooth scroll for all anchor links
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function(e) {
            e.preventDefault();
            const targetId = this.getAttribute('href');
            
            if (targetId === '#') return;
            
            const targetElement = document.querySelector(targetId);
            if (targetElement) {
                // Get the target position
                const targetPosition = targetElement.offsetTop - 80; // 80px offset for navbar
                const startPosition = window.pageYOffset;
                const distance = targetPosition - startPosition;
                const duration = 800; // milliseconds
                let startTime = null;
                
                // Animation function
                function animation(currentTime) {
                    if (startTime === null) startTime = currentTime;
                    const timeElapsed = currentTime - startTime;
                    const run = easeInOutQuad(timeElapsed, startPosition, distance, duration);
                    window.scrollTo(0, run);
                    
                    if (timeElapsed < duration) {
                        requestAnimationFrame(animation);
                    }
                }
                
                // Easing function
                function easeInOutQuad(t, b, c, d) {
                    t /= d / 2;
                    if (t < 1) return c / 2 * t * t + b;
                    t--;
                    return -c / 2 * (t * (t - 2) - 1) + b;
                }
                
                // Start animation
                requestAnimationFrame(animation);
                
                // Update active nav link
                document.querySelectorAll('.nav-link').forEach(link => {
                    link.classList.remove('active');
                });
                this.classList.add('active');
            }
        });
    });
}

// ===== SCROLL PROGRESS =====
function initScrollProgress() {
    const scrollProgress = document.querySelector('.scroll-progress');
    if (!scrollProgress) return;
    
    window.addEventListener('scroll', () => {
        const winScroll = document.body.scrollTop || document.documentElement.scrollTop;
        const height = document.documentElement.scrollHeight - document.documentElement.clientHeight;
        const scrolled = (winScroll / height) * 100;
        scrollProgress.style.width = scrolled + "%";
    });
}

// ===== INPUT FIELDS =====
function initInputFields() {
    // Number inputs
    const numberInputs = document.querySelectorAll('input[type="number"]');
    numberInputs.forEach(input => {
        input.addEventListener('input', function() {
            updateInputHint(this);
        });
        
        // Set initial state
        updateInputHint(input);
    });
    
    // Star rating for sleep
    const sleepStars = document.querySelectorAll('#sleep-stars span');
    const sleepInput = document.getElementById('sleep');
    
    sleepStars.forEach(star => {
        star.addEventListener('click', function() {
            const value = this.getAttribute('data-value');
            sleepInput.value = value;
            
            // Update stars
            sleepStars.forEach(s => {
                s.classList.remove('active');
                if (s.getAttribute('data-value') <= value) {
                    s.classList.add('active');
                }
            });
            
            // Update display
            document.querySelector('.sleep-value').textContent = `${value}/10`;
        });
    });
    
    // Stress slider
    const stressSlider = document.getElementById('stress-slider');
    const stressInput = document.getElementById('stress');
    
    if (stressSlider) {
        stressSlider.addEventListener('input', function() {
            const value = this.value;
            stressInput.value = value;
            document.querySelector('.stress-value').textContent = `${value}/10`;
        });
    }
}

function updateInputHint(input) {
    const hint = input.parentElement.querySelector('.input-hint');
    if (!hint) return;
    
    const value = parseFloat(input.value);
    
    // Update color based on health range
    if (input.id === 'glucose') {
        if (value < 100) {
            hint.className = 'input-hint good';
            hint.textContent = 'Normal (< 100 mg/dL)';
        } else if (value < 126) {
            hint.className = 'input-hint warning';
            hint.textContent = 'Prediabetes (100-125 mg/dL)';
        } else {
            hint.className = 'input-hint danger';
            hint.textContent = 'Diabetes (≥ 126 mg/dL)';
        }
    } else if (input.id === 'bmi') {
        if (value < 18.5) {
            hint.className = 'input-hint warning';
            hint.textContent = 'Underweight (< 18.5)';
        } else if (value < 25) {
            hint.className = 'input-hint good';
            hint.textContent = 'Normal (18.5-24.9)';
        } else if (value < 30) {
            hint.className = 'input-hint warning';
            hint.textContent = 'Overweight (25-29.9)';
        } else {
            hint.className = 'input-hint danger';
            hint.textContent = 'Obese (≥ 30)';
        }
    }
}

// ===== DASHBOARD TABS =====
function initDashboardTabs() {
    const tabs = document.querySelectorAll('.dashboard-tabs .tab');
    const tabContents = document.querySelectorAll('.tab-content');
    
    tabs.forEach(tab => {
        tab.addEventListener('click', function() {
            const tabId = this.getAttribute('data-tab');
            
            // Remove active class from all
            tabs.forEach(t => t.classList.remove('active'));
            tabContents.forEach(c => c.classList.remove('active'));
            
            // Add active class to clicked
            this.classList.add('active');
            document.getElementById(`${tabId}-tab`).classList.add('active');
        });
    });
}

// ===== MOBILE MENU =====
function initMobileMenu() {
    const mobileMenuBtn = document.querySelector('.mobile-menu-btn');
    const navMenu = document.querySelector('.nav-menu');
    
    if (mobileMenuBtn && navMenu) {
        mobileMenuBtn.addEventListener('click', function() {
            navMenu.classList.toggle('active');
            mobileMenuBtn.innerHTML = navMenu.classList.contains('active') 
                ? '<i class="fas fa-times"></i>' 
                : '<i class="fas fa-bars"></i>';
        });
        
        // Close menu when clicking a link
        document.querySelectorAll('.nav-link').forEach(link => {
            link.addEventListener('click', () => {
                navMenu.classList.remove('active');
                mobileMenuBtn.innerHTML = '<i class="fas fa-bars"></i>';
            });
        });
    }
}

// ===== NAVIGATION ACTIVE STATE =====
function initNavigation() {
    const sections = document.querySelectorAll('section');
    const navLinks = document.querySelectorAll('.nav-link');
    
    window.addEventListener('scroll', () => {
        let current = '';
        const scrollPos = window.scrollY + 100;
        
        sections.forEach(section => {
            const sectionTop = section.offsetTop;
            const sectionHeight = section.clientHeight;
            
            if (scrollPos >= sectionTop && scrollPos < sectionTop + sectionHeight) {
                current = section.getAttribute('id');
            }
        });
        
        navLinks.forEach(link => {
            link.classList.remove('active');
            if (link.getAttribute('href') === `#${current}`) {
                link.classList.add('active');
            }
        });
    });
}

// ===== DEMO CALCULATOR =====
function initDemoCalculator() {
    const analyzeBtn = document.getElementById('analyzeBtn');
    if (!analyzeBtn) return;
    
    analyzeBtn.addEventListener('click', function() {
        // Get input values
        const data = {
            age: parseInt(document.getElementById('age').value) || 45,
            bmi: parseFloat(document.getElementById('bmi').value) || 27,
            glucose: parseInt(document.getElementById('glucose').value) || 105,
            sleep: parseInt(document.getElementById('sleep').value) || 7,
            stress: parseInt(document.getElementById('stress').value) || 5,
            familyDiabetes: document.getElementById('family-diabetes').checked,
            familyHypertension: document.getElementById('family-hypertension').checked
        };
        
        // Calculate risks
        const risks = calculateRisks(data);
        
        // Show results
        showResults(risks, data);
        
        // Animate results
        animateResults(risks);
    });
}

function calculateRisks(data) {
    let diabetesRisk = 0;
    let hypertensionRisk = 0;
    
    // Age factors
    if (data.age > 45) diabetesRisk += 15;
    if (data.age > 50) hypertensionRisk += 20;
    
    // BMI factors
    if (data.bmi > 25) diabetesRisk += (data.bmi - 25) * 2;
    if (data.bmi > 27) hypertensionRisk += (data.bmi - 27) * 1.5;
    
    // Glucose factors
    if (data.glucose > 100) diabetesRisk += (data.glucose - 100) * 0.8;
    if (data.glucose > 110) hypertensionRisk += 10;
    
    // Lifestyle factors
    diabetesRisk += (10 - data.sleep) * 3;
    hypertensionRisk += data.stress * 4;
    
    // Family history
    if (data.familyDiabetes) diabetesRisk += 25;
    if (data.familyHypertension) hypertensionRisk += 30;
    
    // Cap at 100
    diabetesRisk = Math.min(diabetesRisk, 100);
    hypertensionRisk = Math.min(hypertensionRisk, 100);
    
    return {
        diabetes: Math.round(diabetesRisk),
        hypertension: Math.round(hypertensionRisk)
    };
}

function showResults(risks, data) {
    // Hide placeholder, show results
    document.getElementById('resultsPlaceholder').style.display = 'none';
    document.getElementById('riskResults').style.display = 'block';
    
    // Update percentages
    document.getElementById('diabetesPercentage').textContent = `${risks.diabetes}%`;
    document.getElementById('hypertensionPercentage').textContent = `${risks.hypertension}%`;
    
    // Update risk details
    updateRiskDetails(risks, data);
    
    // Update prevention tips
    updatePreventionTips(risks);
}

function updateRiskDetails(risks, data) {
    const diabetesDetails = document.getElementById('diabetesDetails');
    const hypertensionDetails = document.getElementById('hypertensionDetails');
    
    // Diabetes details
    let diabetesText = '';
    if (risks.diabetes > 70) {
        diabetesText = 'High risk detected. Multiple factors indicate elevated diabetes risk.';
    } else if (risks.diabetes > 40) {
        diabetesText = 'Moderate risk. Early intervention recommended.';
    } else {
        diabetesText = 'Low current risk. Maintain healthy lifestyle.';
    }
    
    // Hypertension details
    let hypertensionText = '';
    if (risks.hypertension > 70) {
        hypertensionText = 'High hypertension risk. Stress management crucial.';
    } else if (risks.hypertension > 40) {
        hypertensionText = 'Moderate risk. Monitor blood pressure regularly.';
    } else {
        hypertensionText = 'Low current risk. Continue healthy habits.';
    }
    
    diabetesDetails.textContent = diabetesText;
    hypertensionDetails.textContent = hypertensionText;
}

function updatePreventionTips(risks) {
    const preventionTips = document.getElementById('preventionTips');
    
    let tipsHTML = '<h4><i class="fas fa-clipboard-list"></i> Prevention Recommendations</h4><ul>';
    
    // General tips
    tipsHTML += '<li><i class="fas fa-heartbeat"></i> Schedule regular health check-ups</li>';
    tipsHTML += '<li><i class="fas fa-apple-alt"></i> Maintain balanced diet with whole foods</li>';
    tipsHTML += '<li><i class="fas fa-running"></i> Exercise 30 minutes daily, 5 days a week</li>';
    
    // Specific tips based on risk
    if (risks.diabetes > 40) {
        tipsHTML += '<li><i class="fas fa-tint"></i> Monitor glucose levels weekly</li>';
        tipsHTML += '<li><i class="fas fa-ban"></i> Reduce sugar and refined carbohydrate intake</li>';
    }
    
    if (risks.hypertension > 40) {
        tipsHTML += '<li><i class="fas fa-heartbeat"></i> Check blood pressure regularly</li>';
        tipsHTML += '<li><i class="fas fa-salt"></i> Limit sodium intake to <2000mg/day</li>';
    }
    
    tipsHTML += '</ul>';
    
    preventionTips.innerHTML = tipsHTML;
}

function animateResults(risks) {
    // Animate risk bars
    setTimeout(() => {
        const diabetesBar = document.getElementById('diabetesBar');
        const hypertensionBar = document.getElementById('hypertensionBar');
        
        diabetesBar.style.width = `${risks.diabetes}%`;
        hypertensionBar.style.width = `${risks.hypertension}%`;
        
        // Set colors
        const diabetesColor = risks.diabetes > 70 ? '#ef4444' : 
                            risks.diabetes > 40 ? '#f59e0b' : '#10b981';
        const hypertensionColor = risks.hypertension > 70 ? '#ef4444' : 
                                 risks.hypertension > 40 ? '#f59e0b' : '#10b981';
        
        diabetesBar.style.background = diabetesColor;
        hypertensionBar.style.background = hypertensionColor;
    }, 100);
}

// ===== HEALTH SIMULATION =====
function initHealthSimulation() {
    const heartRateElement = document.getElementById('heartRate');
    const oxygenElement = document.getElementById('oxygenLevel');
    
    if (!heartRateElement || !oxygenElement) return;
    
    setInterval(() => {
        // Simulate slight variations
        const heartRate = 72 + Math.floor(Math.random() * 6) - 3;
        const oxygenLevel = 98 + (Math.random() > 0.7 ? -0.5 : 0);
        
        heartRateElement.textContent = `${heartRate} BPM`;
        oxygenElement.textContent = `${oxygenLevel.toFixed(1)}% O₂`;
    }, 3000);
}

// ===== BUTTON EVENTS =====
function initButtonEvents() {
    const loginToApp = '/login?returnTo=%2Fapp';

    // Start Detection Button
    const startDetectionBtn = document.getElementById('startDetectionBtn');
    if (startDetectionBtn) {
        startDetectionBtn.addEventListener('click', () => {
            spaNavigate('/demo');
        });
    }
    
    // View Demo Button
    const viewDemoBtn = document.getElementById('viewDemoBtn');
    if (viewDemoBtn) {
        viewDemoBtn.addEventListener('click', () => {
            spaNavigate(loginToApp);
        });
    }
    
    // Try Demo Button in Nav
    const tryDemoBtn = document.getElementById('tryDemoBtn');
    if (tryDemoBtn) {
        tryDemoBtn.addEventListener('click', () => {
            spaNavigate('/demo');
        });
    }

    // Login / Sign Up Button in Nav
    const loginSignupBtn = document.getElementById('loginSignupBtn');
    if (loginSignupBtn) {
        loginSignupBtn.addEventListener('click', () => {
            spaNavigate(loginToApp);
        });
    }
}