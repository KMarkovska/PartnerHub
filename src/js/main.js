import 'bootstrap/dist/css/bootstrap.min.css';
import 'bootstrap-icons/font/bootstrap-icons.css';
import 'bootstrap/dist/js/bootstrap.bundle.min.js';
import '../css/style.css';
import { renderLayout } from './components/layout.js';
import { renderAuthPage } from './components/pages.js';

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

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    notice.className = 'alert alert-info';
    notice.textContent = `Your ${formPage === 'login' ? 'sign-in' : 'registration'} form is ready. Connect Supabase to enable authentication.`;
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
