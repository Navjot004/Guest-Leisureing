// Auth Handling Script (Login & Register)
document.addEventListener('DOMContentLoaded', () => {
  // Check if already logged in
  const token = localStorage.getItem('token');
  const userStr = localStorage.getItem('user');
  if (token && userStr) {
    try {
      const user = JSON.parse(userStr);
      // If user visits login/register while authenticated, offer quick redirect
      const quickBanner = document.getElementById('already-logged-banner');
      if (quickBanner) {
        quickBanner.style.display = 'block';
        quickBanner.innerHTML = `
          <div style="background: rgba(212, 175, 55, 0.15); border: 1px solid var(--gold-primary); padding: 12px; border-radius: 8px; margin-bottom: 20px; text-align: center;">
            <p>Signed in as <strong>${user.name}</strong> (${user.role})</p>
            <a href="${user.role === 'superadmin' ? '/admin-dashboard.html' : '/guest-dashboard.html'}" class="btn btn-gold btn-sm" style="margin-top: 8px;">
              Go to Dashboard &rarr;
            </a>
          </div>
        `;
      }
    } catch (e) {}
  }

  // Password visibility toggle
  document.querySelectorAll('.toggle-password').forEach((btn) => {
    btn.addEventListener('click', () => {
      const targetId = btn.getAttribute('data-target');
      const input = document.getElementById(targetId);
      if (input) {
        if (input.type === 'password') {
          input.type = 'text';
          btn.textContent = '👁️';
        } else {
          input.type = 'password';
          btn.textContent = '🔒';
        }
      }
    });
  });

  // Login Tabs Switcher (Guest vs Super Admin)
  const tabGuest = document.getElementById('tab-guest');
  const tabAdmin = document.getElementById('tab-admin');
  const identifierInput = document.getElementById('login-identifier');
  const passwordInput = document.getElementById('login-password');
  const adminNotice = document.getElementById('admin-callout');
  const loginHeaderTitle = document.getElementById('login-header-title');

  if (tabGuest && tabAdmin) {
    tabGuest.addEventListener('click', () => {
      tabGuest.classList.add('active');
      tabAdmin.classList.remove('active');
      if (adminNotice) adminNotice.style.display = 'none';
      if (loginHeaderTitle) loginHeaderTitle.textContent = 'Guest & VIP Login';
      identifierInput.placeholder = 'guest@example.com';
      identifierInput.value = '';
      passwordInput.value = '';
    });

    tabAdmin.addEventListener('click', () => {
      tabAdmin.classList.add('active');
      tabGuest.classList.remove('active');
      if (adminNotice) adminNotice.style.display = 'flex';
      if (loginHeaderTitle) loginHeaderTitle.textContent = 'Super Admin Control Center';
      identifierInput.placeholder = 'Enter Admin ID (10001)';
      identifierInput.value = '10001';
      passwordInput.value = 'Master@2026';
    });
  }

  // Auto-Fill Super Admin button
  const autofillBtn = document.getElementById('btn-autofill-admin');
  if (autofillBtn) {
    autofillBtn.addEventListener('click', () => {
      if (tabAdmin) tabAdmin.click();
      if (identifierInput) identifierInput.value = '10001';
      if (passwordInput) passwordInput.value = 'Master@2026';
      showToast('Credentials Filled', 'Super Admin ID (10001) & Password loaded.', 'info');
    });
  }

  // Auto-Fill Demo Guest button
  const autofillGuestBtn = document.getElementById('btn-autofill-guest');
  if (autofillGuestBtn) {
    autofillGuestBtn.addEventListener('click', () => {
      if (tabGuest) tabGuest.click();
      if (identifierInput) identifierInput.value = 'vip.guest@leisure.com';
      if (passwordInput) passwordInput.value = 'Leisure@2026';
      showToast('Demo Guest Filled', 'VIP Guest test credentials populated.', 'info');
    });
  }

  // Password Strength Meter for Register page
  const registerPasswordInput = document.getElementById('register-password');
  const strengthBar = document.getElementById('strength-bar-fill');
  const strengthText = document.getElementById('strength-text');

  if (registerPasswordInput && strengthBar && strengthText) {
    registerPasswordInput.addEventListener('input', () => {
      const val = registerPasswordInput.value;
      let score = 0;
      if (val.length >= 6) score += 25;
      if (/[A-Z]/.test(val)) score += 25;
      if (/[0-9]/.test(val)) score += 25;
      if (/[^A-Za-z0-9]/.test(val)) score += 25;

      strengthBar.style.width = score + '%';
      if (score <= 25) {
        strengthBar.style.backgroundColor = '#f43f5e';
        strengthText.textContent = 'Weak';
        strengthText.style.color = '#f43f5e';
      } else if (score <= 50) {
        strengthBar.style.backgroundColor = '#f59e0b';
        strengthText.textContent = 'Fair';
        strengthText.style.color = '#f59e0b';
      } else if (score <= 75) {
        strengthBar.style.backgroundColor = '#38bdf8';
        strengthText.textContent = 'Good';
        strengthText.style.color = '#38bdf8';
      } else {
        strengthBar.style.backgroundColor = '#10b981';
        strengthText.textContent = 'Strong & Secure';
        strengthText.style.color = '#10b981';
      }
    });
  }

  // Login Form Submission
  const loginForm = document.getElementById('login-form');
  if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const submitBtn = loginForm.querySelector('button[type="submit"]');
      const originalBtnText = submitBtn.innerHTML;

      const identifier = identifierInput.value.trim();
      const password = passwordInput.value.trim();

      if (!identifier || !password) {
        showToast('Required Fields', 'Please fill in both identifier and password.', 'warning');
        return;
      }

      try {
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<span class="status-dot pulse" style="background:#0b111e"></span> Authenticating...';

        const res = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ identifier, password }),
        });

        const data = await res.json();

        if (data.success) {
          localStorage.setItem('token', data.token);
          localStorage.setItem('user', JSON.stringify(data.user));

          showToast('Success!', data.message, 'success');

          setTimeout(() => {
            window.location.href = data.redirectUrl || (data.user.role === 'superadmin' ? '/admin-dashboard.html' : '/guest-dashboard.html');
          }, 800);
        } else {
          showToast('Login Failed', data.message || 'Invalid credentials.', 'error');
          submitBtn.disabled = false;
          submitBtn.innerHTML = originalBtnText;
        }
      } catch (err) {
        console.error(err);
        showToast('Connection Error', 'Unable to connect to the authentication server.', 'error');
        submitBtn.disabled = false;
        submitBtn.innerHTML = originalBtnText;
      }
    });
  }

  // Register Form Submission
  const registerForm = document.getElementById('register-form');
  if (registerForm) {
    registerForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const submitBtn = registerForm.querySelector('button[type="submit"]');
      const originalBtnText = submitBtn.innerHTML;

      const name = document.getElementById('register-name').value.trim();
      const email = document.getElementById('register-email').value.trim();
      const phone = document.getElementById('register-phone').value.trim();
      const password = document.getElementById('register-password').value;
      const confirmPassword = document.getElementById('register-confirm-password').value;

      // Collect preference chips
      const preferences = [];
      document.querySelectorAll('input[name="preferences"]:checked').forEach((cb) => {
        preferences.push(cb.value);
      });

      if (!name || !email || !password) {
        showToast('Required Fields', 'Full name, email, and password are required.', 'warning');
        return;
      }

      if (password !== confirmPassword) {
        showToast('Password Mismatch', 'The passwords you entered do not match.', 'error');
        return;
      }

      if (password.length < 6) {
        showToast('Weak Password', 'Password must be at least 6 characters.', 'warning');
        return;
      }

      try {
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<span class="status-dot pulse" style="background:#0b111e"></span> Creating Account...';

        const res = await fetch('/api/auth/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name, email, phone, password, preferences }),
        });

        const data = await res.json();

        if (data.success) {
          localStorage.setItem('token', data.token);
          localStorage.setItem('user', JSON.stringify(data.user));

          showToast('Welcome!', data.message, 'success');

          setTimeout(() => {
            window.location.href = data.redirectUrl || '/guest-dashboard.html';
          }, 900);
        } else {
          showToast('Registration Error', data.message || 'Failed to create account.', 'error');
          submitBtn.disabled = false;
          submitBtn.innerHTML = originalBtnText;
        }
      } catch (err) {
        console.error(err);
        showToast('Connection Error', 'Could not reach database server: ' + err.message, 'error');
        submitBtn.disabled = false;
        submitBtn.innerHTML = originalBtnText;
      }
    });
  }
});
