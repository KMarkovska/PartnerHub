import 'bootstrap/dist/css/bootstrap.min.css';
import 'bootstrap-icons/font/bootstrap-icons.css';
import 'bootstrap/dist/js/bootstrap.bundle.min.js';
import '../css/style.css';
import { setupAdminPage } from './components/admin.js';
import { renderLayout } from './components/layout.js';
import { renderAuthPage, renderPasswordRecoveryPage } from './components/pages.js';
import {
  getAuthenticatedProfile,
  InactiveProfileError,
  sendPasswordRecoveryEmail,
  signIn,
  signOut,
  signUp,
  updatePassword,
} from './services/auth.service.js';
import { supabase } from './config/supabase.js';

const pageId = document.body.dataset.page;
const authPages = new Set(['login', 'register']);
let isManualSignOut = false;

if (authPages.has(pageId)) {
  document.title = `${pageId === 'login' ? 'Sign in' : 'Create account'} | PartnerHub`;
  document.getElementById('app').innerHTML = renderAuthPage(pageId);
  await setupAuthForm(pageId);
} else if (pageId === 'forgot-password') {
  document.title = 'Reset password | PartnerHub';
  document.getElementById('app').innerHTML = renderPasswordRecoveryPage('request');
  setupPasswordRecoveryRequest();
} else if (pageId === 'reset-password') {
  document.title = 'Choose a new password | PartnerHub';
  document.getElementById('app').innerHTML = renderPasswordRecoveryPage('update');
  await setupPasswordUpdate();
} else {
  await setupProtectedPage(pageId);
}

function setupPasswordRecoveryRequest() {
  const form = document.getElementById('password-recovery-form');
  const notice = document.getElementById('auth-notice');
  const submitButton = form.querySelector('button[type="submit"]');

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (!form.reportValidity()) return;

    setFormBusy(form, true);
    submitButton.setAttribute('aria-busy', 'true');
    hideNotice(notice);
    try {
      const email = String(new FormData(form).get('email')).trim();
      const { error } = await sendPasswordRecoveryEmail(email);
      if (error) throw error;

      showNotice(
        notice,
        'success',
        'If an account exists for that email, a password reset link has been sent.',
      );
      form.reset();
    } catch (error) {
      showNotice(notice, 'danger', getErrorMessage(error, 'Could not send a password reset link. Please try again.'));
    } finally {
      setFormBusy(form, false);
      submitButton.removeAttribute('aria-busy');
    }
  });
}

async function setupPasswordUpdate() {
  const form = document.getElementById('password-recovery-form');
  const notice = document.getElementById('auth-notice');
  const password = document.getElementById('password');
  const confirmPassword = document.getElementById('confirm-password');
  const submitButton = form.querySelector('button[type="submit"]');

  const { data, error } = await supabase.auth.getSession();
  if (error) {
    showNotice(notice, 'danger', getErrorMessage(error, 'Could not verify the password reset session.'));
    setFormBusy(form, true);
    return;
  }
  if (!data.session) {
    showNotice(notice, 'warning', 'This password reset link is invalid or expired. Request a new link and try again.');
    setFormBusy(form, true);
    return;
  }

  confirmPassword.addEventListener('input', validatePasswords);
  password.addEventListener('input', validatePasswords);

  function validatePasswords() {
    confirmPassword.setCustomValidity(
      confirmPassword.value && password.value !== confirmPassword.value
        ? 'Passwords do not match.'
        : '',
    );
  }

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    validatePasswords();
    if (!form.reportValidity()) return;

    setFormBusy(form, true);
    submitButton.setAttribute('aria-busy', 'true');
    hideNotice(notice);
    try {
      const { error: updateError } = await updatePassword(password.value);
      if (updateError) throw updateError;
      goToDashboard('password-updated=1');
    } catch (updateError) {
      showNotice(notice, 'danger', getErrorMessage(updateError, 'Could not update the password. Please request a new link.'));
    } finally {
      setFormBusy(form, false);
      submitButton.removeAttribute('aria-busy');
    }
  });
}

async function setupAuthForm(formPage) {
  const form = document.getElementById('auth-form');
  const notice = document.getElementById('auth-notice');
  const password = document.getElementById('password');
  const confirmPassword = document.getElementById('confirm-password');
  const passwordLength = document.getElementById('password-length');
  const fullName = document.getElementById('full-name');
  const submitButton = form.querySelector('button[type="submit"]');

  const validateFields = () => {
    if (fullName) {
      fullName.setCustomValidity(
        fullName.value.trim().length < 2 ? 'Enter your full name.' : '',
      );
    }

    const characterCount = Array.from(password.value).length;
    if (passwordLength) {
      passwordLength.textContent = `${characterCount} / 8`;
    }

    password.setCustomValidity(
      formPage === 'register' && password.value && characterCount < 8
        ? 'Use at least 8 characters.'
        : '',
    );

    if (confirmPassword) {
      confirmPassword.setCustomValidity(
        confirmPassword.value && password.value !== confirmPassword.value
          ? 'Passwords do not match.'
          : '',
      );
    }
  };

  fullName?.addEventListener('input', validateFields);
  password.addEventListener('input', validateFields);
  confirmPassword?.addEventListener('input', validateFields);
  validateFields();
  form.addEventListener('input', () => hideNotice(notice));

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    validateFields();
    if (!form.reportValidity()) return;

    const formData = new FormData(form);
    setFormBusy(form, true);
    submitButton.setAttribute('aria-busy', 'true');
    hideNotice(notice);

    try {
      const email = String(formData.get('email')).trim();
      const passwordValue = String(formData.get('password'));

      if (formPage === 'login') {
        const { error } = await signIn(email, passwordValue);
        if (error) throw error;

        const identity = await getAuthenticatedProfile();
        if (!identity) throw new Error('Your session could not be established. Please sign in again.');
        goToDashboard();
        return;
      }

      if (Array.from(passwordValue).length < 8) {
        password.setCustomValidity('Use at least 8 characters.');
        setFormBusy(form, false);
        password.reportValidity();
        return;
      }

      const { data, error } = await signUp(
        String(formData.get('name')).trim(),
        email,
        passwordValue,
      );
      if (error) throw error;

      if (data.session) {
        const identity = await getAuthenticatedProfile();
        if (!identity) throw new Error('Your account was created, but your session could not be established.');
        goToDashboard('welcome=1');
        return;
      }

      showNotice(
        notice,
        'success',
        'Your account was created. Check your email to confirm your address before signing in.',
      );
      form.reset();
      validateFields();
    } catch (error) {
      if (error instanceof InactiveProfileError) {
        const { error: signOutError } = await signOut();
        if (signOutError) {
          showNotice(notice, 'danger', 'This account is inactive and could not be signed out automatically. Close this page and contact your administrator.');
          return;
        }
      }
      showNotice(notice, 'danger', getAuthErrorMessage(error, formPage));
    } finally {
      setFormBusy(form, false);
      submitButton.removeAttribute('aria-busy');
    }
  });

  setFormBusy(form, true);
  try {
    const identity = await getAuthenticatedProfile();
    if (identity) {
      goToDashboard();
      return;
    }
  } catch (error) {
    if (error instanceof InactiveProfileError) {
      const { error: signOutError } = await signOut();
      showNotice(
        notice,
        signOutError ? 'danger' : 'warning',
        signOutError
          ? 'This account is inactive and could not be signed out automatically. Close this page and contact your administrator.'
          : error.message,
      );
    } else {
      showNotice(notice, 'danger', getErrorMessage(error, 'Could not verify your current session.'));
    }
  } finally {
    setFormBusy(form, false);
  }

  const reason = new URLSearchParams(window.location.search).get('reason');
  if (reason === 'session-expired') {
    showNotice(notice, 'info', 'Your session expired. Please sign in again.');
  } else if (reason === 'inactive') {
    showNotice(notice, 'warning', 'This account is inactive. Contact your administrator for assistance.');
  }
}

async function setupProtectedPage(protectedPageId) {
  const app = document.getElementById('app');
  app.innerHTML = `
    <main class="auth-loading" role="status" aria-live="polite">
      <span class="spinner-border spinner-border-sm me-2" aria-hidden="true"></span>
      Checking your PartnerHub session…
    </main>
  `;

  let identity;
  try {
    identity = await getAuthenticatedProfile();
  } catch (error) {
    if (error instanceof InactiveProfileError) {
      const { error: signOutError } = await signOut();
      if (signOutError) {
        showProtectedError('This account is inactive and could not be signed out. Close this page and contact your administrator.');
        return;
      }
      redirectToLogin('inactive');
      return;
    }

    showProtectedError(getErrorMessage(error, 'Your session could not be verified. Check your connection and try again.'));
    return;
  }

  if (!identity) {
    redirectToLogin();
    return;
  }

  if (protectedPageId === 'admin' && identity.profile.role !== 'admin') {
    window.location.replace('/src/pages/dashboard.html?access=denied');
    return;
  }

  renderLayout(protectedPageId, identity.profile);
  setProfileSummary(identity.profile);
  setupAuthStateListener(identity.user.id);
  setupPageActions();
  if (protectedPageId === 'admin') {
    setupAdminPage(identity.user.id);
  }

  const query = new URLSearchParams(window.location.search);
  const notice = document.getElementById('page-notice');
  if (query.get('access') === 'denied') {
    showNotice(notice, 'warning', 'The Administration page is available to administrators only.');
  } else if (query.get('welcome') === '1') {
    showNotice(notice, 'success', 'Your account is ready. Welcome to PartnerHub.');
  } else if (query.get('password-updated') === '1') {
    showNotice(notice, 'success', 'Your password was updated.');
  }
}

function setupAuthStateListener(currentUserId) {
  supabase.auth.onAuthStateChange((event, session) => {
    if (event === 'SIGNED_OUT' || !session) {
      redirectToLogin(isManualSignOut ? undefined : 'session-expired');
      return;
    }

    if (event === 'SIGNED_IN' && session.user.id !== currentUserId) {
      window.location.reload();
    }
  });

  window.addEventListener('pageshow', (event) => {
    if (event.persisted) window.location.reload();
  });
}

function setProfileSummary(profile) {
  const roleLabel = document.getElementById('role-label');
  const userName = document.getElementById('auth-user-name');
  roleLabel.textContent = profile.role === 'admin' ? 'Administrator' : 'Regular user';
  userName.textContent = profile.full_name.trim() || 'PartnerHub user';
}

function setupPageActions() {
  document.querySelectorAll('[data-notice]').forEach((button) => {
    button.addEventListener('click', () => {
      const notice = document.getElementById('page-notice');
      showNotice(notice, 'info', button.dataset.notice);
      notice.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    });
  });

  document.querySelectorAll('[data-auth-action="sign-out"]').forEach((button) => {
    button.addEventListener('click', async () => {
      const notice = document.getElementById('page-notice');
      button.disabled = true;
      button.setAttribute('aria-busy', 'true');
      isManualSignOut = true;

      try {
        const { error } = await signOut();
        if (error) throw error;
        window.location.replace('/src/pages/login.html');
      } catch (error) {
        isManualSignOut = false;
        showNotice(notice, 'danger', getErrorMessage(error, 'Could not sign out. Please try again.'));
        button.disabled = false;
        button.removeAttribute('aria-busy');
      }
    });
  });
}

function setFormBusy(form, isBusy) {
  form.querySelectorAll('input, button[type="submit"]').forEach((control) => {
    control.disabled = isBusy;
  });
}

function showNotice(notice, type, message) {
  notice.className = `alert alert-${type}`;
  notice.textContent = message;
}

function hideNotice(notice) {
  notice.className = 'alert d-none';
  notice.textContent = '';
}

function showProtectedError(message) {
  const app = document.getElementById('app');
  app.innerHTML = `
    <main class="auth-loading">
      <section class="alert alert-danger auth-error-card" role="alert">
        <p id="auth-guard-error" class="mb-3"></p>
        <a class="btn btn-primary btn-sm" href="/src/pages/login.html">Go to sign in</a>
      </section>
    </main>
  `;
  document.getElementById('auth-guard-error').textContent = message;
}

function redirectToLogin(reason) {
  const query = reason ? `?reason=${encodeURIComponent(reason)}` : '';
  window.location.replace(`/src/pages/login.html${query}`);
}

function goToDashboard(query = '') {
  const suffix = query ? `?${query}` : '';
  window.location.replace(`/src/pages/dashboard.html${suffix}`);
}

function getErrorMessage(error, fallback) {
  return error instanceof Error && error.message
    ? error.message
    : fallback;
}

function getAuthErrorMessage(error, formPage) {
  const message = getErrorMessage(error, 'Authentication failed. Please try again.');
  const normalizedMessage = message.toLowerCase();

  if (error?.code === 'invalid_credentials' || normalizedMessage.includes('invalid login credentials')) {
    return 'Email or password is incorrect.';
  }

  if (
    formPage === 'register'
    && (error?.code === 'over_email_send_rate_limit' || normalizedMessage.includes('email rate limit exceeded'))
  ) {
    return 'Supabase has temporarily limited sign-up emails. Wait before retrying, or configure a custom SMTP provider in your Supabase Auth settings.';
  }

  const passwordLengthError = formPage === 'register'
    ? normalizedMessage.match(/password should be at least (\d+) characters/)
    : null;
  if (passwordLengthError) {
    return `Supabase received a password shorter than its ${passwordLengthError[1]}-character minimum. PartnerHub requires 8 characters; check the count below and re-enter the password manually.`;
  }

  if (formPage === 'register' && normalizedMessage.includes('already registered')) {
    return 'An account with this email already exists. Try signing in instead.';
  }

  return message;
}
