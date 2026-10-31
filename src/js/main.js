import 'bootstrap/dist/css/bootstrap.min.css';
import 'bootstrap-icons/font/bootstrap-icons.css';
import 'bootstrap/dist/js/bootstrap.bundle.min.js';
import '../css/style.css';
import { renderLayout } from './components/layout.js';
import { renderAuthPage } from './components/pages.js';
import { supabase } from './config/supabase.js';

const pageId = document.body.dataset.page;

if (pageId === 'login' || pageId === 'register') {
  document.title = `${pageId === 'login' ? 'Sign in' : 'Create account'} | PartnerHub`;
  document.getElementById('app').innerHTML = renderAuthPage(pageId);
  setupAuthForm(pageId);
} else {
  renderLayout(pageId);
  setupPageActions();
}

function setupAuthForm(formPage) {
  const form = document.getElementById('auth-form');
  const notice = document.getElementById('auth-notice');
  const password = document.getElementById('password');
  const confirmPassword = document.getElementById('confirm-password');
  const submitButton = form.querySelector('button[type="submit"]');

  if (confirmPassword) {
    const validatePasswordMatch = () => {
      confirmPassword.setCustomValidity(
        confirmPassword.value && password.value !== confirmPassword.value
          ? 'Passwords do not match.'
          : '',
      );
    };
    password.addEventListener('input', validatePasswordMatch);
    confirmPassword.addEventListener('input', validatePasswordMatch);
  }

  form.addEventListener('submit', async (event) => {
    event.preventDefault();

    if (!form.reportValidity()) return;

    notice.className = 'alert d-none';
    submitButton.disabled = true;
    submitButton.setAttribute('aria-busy', 'true');

    try {
      const formData = new FormData(form);
      const email = String(formData.get('email')).trim();
      const passwordValue = String(formData.get('password'));
      const result = formPage === 'login'
        ? await supabase.auth.signInWithPassword({ email, password: passwordValue })
        : await supabase.auth.signUp({
            email,
            password: passwordValue,
            options: { data: { full_name: String(formData.get('name')).trim() } },
          });

      if (result.error) throw result.error;

      if (formPage === 'login') {
        window.location.assign('/src/pages/dashboard.html');
        return;
      }

      notice.className = 'alert alert-success';
      notice.textContent = result.data.session
        ? 'Your account is ready. You can now sign in.'
        : 'Your account was created. Check your email to confirm your address before signing in.';
      form.reset();
    } catch (error) {
      notice.className = 'alert alert-danger';
      notice.textContent = error instanceof Error
        ? error.message
        : 'Authentication failed. Please try again.';
    } finally {
      submitButton.disabled = false;
      submitButton.removeAttribute('aria-busy');
    }
  });
}

function setupPageActions() {
  document.querySelectorAll('[data-notice]').forEach((button) => {
    button.addEventListener('click', () => {
      const notice = document.getElementById('page-notice');
      notice.className = 'alert alert-info';
      notice.textContent = button.dataset.notice;
      notice.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    });
  });
}
