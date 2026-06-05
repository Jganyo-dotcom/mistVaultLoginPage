(function () {
  'use strict';

  /* ─── Configuration Parameters ─── */
  const TIMER_SECONDS = 300;
  const CIRCUMFERENCE = 2 * Math.PI * 32; 

  let timerInterval = null;
  let secondsLeft   = TIMER_SECONDS;
  let currentEmail  = '';

  /* ─── DOM References ─── */
  const loginPage      = document.getElementById('page-login');
  const verifyPage     = document.getElementById('page-verify');
  const loginForm      = document.getElementById('login-form');
  const verifyForm     = document.getElementById('verify-form');
  const emailInput     = document.getElementById('email');
  const passwordInput  = document.getElementById('password');
  const loginBtn       = document.getElementById('login-btn');
  const verifyBtn      = document.getElementById('verify-btn');
  const verifyEmail    = document.getElementById('verify-email');
  const timerRing      = document.getElementById('timer-ring');
  const timerTimeEl    = document.getElementById('timer-display');
  const resendBtn      = document.getElementById('resend-btn');
  const otpGroup       = document.getElementById('otp-group');
  const otpInputs      = Array.from(otpGroup.querySelectorAll('input'));
  const successOverlay = document.getElementById('success-overlay');
  const verifyUI       = document.getElementById('verify-ui');
  const pwToggle       = document.getElementById('pw-toggle');
  const eyeIcon        = document.getElementById('eye-icon');

  /* ─── React-Toastify System Engine ─── */
  function showToast(message, type = 'success') {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    
    let icon = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/></svg>`;
    if (type === 'success') icon = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>`;
    if (type === 'error')   icon = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>`;

    toast.innerHTML = `${icon}<span>${message}</span>`;
    container.appendChild(toast);

    setTimeout(() => {
      toast.classList.add('hide');
      toast.addEventListener('animationend', () => toast.remove());
    }, 4000);
  }

  /* ─── Password Obfuscation Toggle ─── */
  pwToggle.addEventListener('click', () => {
    const isPassword = passwordInput.type === 'password';
    passwordInput.type = isPassword ? 'text' : 'password';
    eyeIcon.innerHTML = isPassword
      ? `<path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19M1 1l22 22"/><circle cx="12" cy="12" r="3"/>`
      : `<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>`;
  });

  /* ─── Utilities ─── */
  function setLoading(btn, isLoading) {
    btn.disabled = isLoading;
    btn.classList.toggle('loading', isLoading);
  }

  function formatTime(totalSeconds) {
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  }

  function switchPage(fromPage, toPage) {
    fromPage.classList.remove('active');
    toPage.classList.add('active');
  }

  /* ─── Dynamic OTP Timer ─── */
  function updateTimerUI() {
    const fraction = secondsLeft / TIMER_SECONDS;
    const offset   = CIRCUMFERENCE * (1 - fraction);
    timerRing.style.strokeDashoffset = offset;
    timerTimeEl.textContent = formatTime(secondsLeft);

    timerRing.style.stroke = secondsLeft <= 30 ? 'var(--danger)' : secondsLeft <= 90 ? 'var(--warning)' : 'var(--accent)';
  }

  function startTimer() {
    clearInterval(timerInterval);
    secondsLeft = TIMER_SECONDS;
    updateTimerUI();
    resendBtn.disabled = true;
    otpInputs.forEach(input => input.disabled = false);
    verifyBtn.disabled = false;

    timerInterval = setInterval(() => {
      secondsLeft--;
      updateTimerUI();

      if (secondsLeft <= 0) {
        clearInterval(timerInterval);
        timerTimeEl.textContent = '00:00';
        showToast('The 2FA token timeframe has run out. Please re-issue code.', 'error');
        otpInputs.forEach(input => input.disabled = true);
        verifyBtn.disabled = true;
        resendBtn.disabled = false;
      }
    }, 1000);
  }

  /* ─── OTP Field Handlers ─── */
  otpInputs.forEach((input, idx) => {
    input.addEventListener('input', e => {
      const val = e.target.value.replace(/\D/g, '');
      e.target.value = val;
      if (val && idx < otpInputs.length - 1) otpInputs[idx + 1].focus();
    });

    input.addEventListener('keydown', e => {
      if (e.key === 'Backspace' && !input.value && idx > 0) otpInputs[idx - 1].focus();
      if (e.key === 'ArrowLeft' && idx > 0) otpInputs[idx - 1].focus();
      if (e.key === 'ArrowRight' && idx < otpInputs.length - 1) otpInputs[idx + 1].focus();
    });

    input.addEventListener('paste', e => {
      e.preventDefault();
      const paste = (e.clipboardData || window.clipboardData).getData('text').replace(/\D/g, '');
      paste.split('').forEach((ch, i) => {
        if (otpInputs[i]) otpInputs[i].value = ch;
      });
      const focusIndex = Math.min(paste.length, otpInputs.length - 1);
      otpInputs[focusIndex].focus();
    });
  });

  function getOtpValue() { return otpInputs.map(input => input.value).join(''); }
  
  function shakeOtp() {
    otpInputs.forEach(input => input.classList.add('error'));
    otpGroup.style.animation = 'none';
    otpGroup.offsetHeight; // Trigger DOM reflow
    otpGroup.style.animation = 'shake .4s ease-in-out';
    setTimeout(() => otpInputs.forEach(input => input.classList.remove('error')), 1000);
  }

  /* ─── Live API Processing Backend Handlers ─── */

  // 1. Initial Authentication Form submission
  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = emailInput.value.trim();
    const password = passwordInput.value;

    if (!email || !password) {
      showToast('Please declare structural account variables (Email & Password).', 'warning');
      return;
    }

    setLoading(loginBtn, true);

    try {
      const response = await fetch('https://medsec.onrender.com/api/login-hospital', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier :email, password })
      });

      const data = await response.json();

      if (response.ok) {
        currentEmail = email;
        verifyEmail.textContent = email.replace(/(.{3}).+(@.+)/, '$1***$2');
        switchPage(loginPage, verifyPage);
        otpInputs.forEach(input => input.value = '');
        successOverlay.classList.remove('visible');
        verifyUI.style.display = '';
        startTimer();
        showToast('Dynamic identity confirmation pass sent to inbox.', 'success');
        setTimeout(() => otpInputs[0].focus(), 200);
      } else {
        showToast(data.message || 'Verification credentials refused.', 'error');
      }
    } catch (err) {
      showToast('Server communications interruption encountered.', 'error');
    } finally {
      setLoading(loginBtn, false);
    }
  });

  // 2. Multi-Factor Token Validation Submission
  verifyForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const otp = getOtpValue();

    if (otp.length < 6) {
      showToast('Incomplete payload. All 6 character modules required.', 'warning');
      shakeOtp();
      return;
    }

    setLoading(verifyBtn, true);

    try {
      const response = await fetch('https://medsec.onrender.com/api/verify-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: currentEmail, otp: otp })
      });

      const data = await response.json();

      if (response.ok) {
        clearInterval(timerInterval);
        verifyUI.style.display = 'none';
        successOverlay.classList.add('visible');
        showToast('Security verification completed.', 'success');
        
        setTimeout(() => {
          window.location.href = data.redirectUrl || '/dashboard';
        }, 2000);
      } else {
        showToast(data.message || 'MFA cryptographic match exception.', 'error');
        shakeOtp();
      }
    } catch (err) {
      showToast('Gateway sync timeout.', 'error');
    } finally {
      setLoading(verifyBtn, false);
    }
  });

  // 3. Resend OTP Request Trigger
  resendBtn.addEventListener('click', async () => {
    resendBtn.disabled = true;

    try {
      const response = await fetch('/api/auth/resend-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: currentEmail })
      });

      const data = await response.json();

      if (response.ok) {
        otpInputs.forEach(input => input.value = '');
        startTimer();
        showToast('Refreshed security key distributed.', 'success');
        otpInputs[0].focus();
      } else {
        showToast(data.message || 'Key transmission request rejected.', 'error');
        resendBtn.disabled = false;
      }
    } catch (err) {
      showToast('Transmission failure.', 'error');
      resendBtn.disabled = false;
    }
  });

  /* Initialization structural setup */
  timerRing.style.strokeDasharray = CIRCUMFERENCE;
  timerRing.style.strokeDashoffset = 0;

})();