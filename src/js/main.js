import 'bootstrap/dist/css/bootstrap.min.css';
import 'bootstrap-icons/font/bootstrap-icons.css';
import 'bootstrap/dist/js/bootstrap.bundle.min.js';
import '../css/style.css';
import { setupAdminPage } from './components/admin.js';
import { renderLayout } from './components/layout.js';
import { renderAuthPage } from './components/pages.js';
import {
  getAuthenticatedProfile,
  InactiveProfileError,
  signIn,
  signOut,
  signUp,
} from './services/auth.service.js';
import { supabase, verifySupabaseConnection } from './config/supabase.js';

const pageId = document.body.dataset.page;
const authPages = new Set(['login', 'register']);
let isManualSignOut = false;

if (authPages.has(pageId)) {
  document.title = `${pageId === 'login' ? 'Sign in' : 'Create account'} | PartnerHub`;
  document.getElementById('app').innerHTML = renderAuthPage(pageId);
  await setupAuthForm(pageId);
} else {
  await setupProtectedPage(pageId);
}

async function setupAuthForm(formPage) {
  const form = document.getElementById('auth-form');
  const notice = document.getElementById('auth-notice');
  const password = document.getElementById('password');
  const confirmPassword = document.getElementById('confirm-password');
  const fullName = document.getElementById('full-name');
  const submitButton = form.querySelector('button[type="submit"]');
  const verifyButton = document.getElementById('verify-supabase-connection');

  const validateFields = () => {
    if (fullName) {
      fullName.setCustomValidity(
        fullName.value.trim().length < 2 ? 'Enter your full name.' : '',
      );
    }

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

  verifyButton.addEventListener('click', async () => {
    verifyButton.disabled = true;
    verifyButton.setAttribute('aria-busy', 'true');
    hideNotice(notice);

    try {
      await verifySupabaseConnection();
      showNotice(notice, 'success', 'Successfully connected to the Supabase project.');
    } catch (error) {
      showNotice(notice, 'danger', getErrorMessage(error, 'Could not verify the Supabase connection.'));
    } finally {
      verifyButton.disabled = false;
      verifyButton.removeAttribute('aria-busy');
    }
  });

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    validateFields();
    if (!form.reportValidity()) return;

    setFormBusy(form, true);
    submitButton.setAttribute('aria-busy', 'true');
    hideNotice(notice);

    try {
      const formData = new FormData(form);
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

  if (formPage === 'register' && normalizedMessage.includes('already registered')) {
    return 'An account with this email already exists. Try signing in instead.';
  }

  return message;
}
