import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { api, setToken } from '../api/client';
import type { PlayerIdentity } from '../game/types';
import { useI18n } from '../i18n';
import { cacheIdentity } from '../pwa/identityCache';
import { Button } from '../ui/atoms';

interface AccountPageProps {
  identity: PlayerIdentity;
  onLinked: (identity: PlayerIdentity) => void;
  onLogout: () => void;
  onDeleted: () => void;
  onBack: () => void;
}

export function AccountPage({ identity, onLinked, onLogout, onDeleted, onBack }: AccountPageProps) {
  const { t } = useI18n();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  const [deletePassword, setDeletePassword] = useState('');
  const [deleteConfirmed, setDeleteConfirmed] = useState(false);
  const [deletePending, setDeletePending] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  async function link(event: FormEvent) {
    event.preventDefault();
    if (password !== confirm) { setError(t('account.error.passwordMismatch')); return; }
    setPending(true);
    setError('');
    try {
      const result = await api.linkAccount(email, password);
      setToken(result.token);
      cacheIdentity(result.player);
      onLinked(result.player);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : t('account.error.link'));
      setPending(false);
    }
  }

  async function deleteAccount(event: FormEvent) {
    event.preventDefault();
    if (!deleteConfirmed) return;
    setDeletePending(true);
    setDeleteError('');
    try {
      await api.deleteAccount(deletePassword);
      onDeleted();
    } catch (reason) {
      setDeleteError(reason instanceof Error ? reason.message : t('account.delete.error'));
      setDeletePending(false);
    }
  }

  return (
    <main className="screen account-screen">
      <header className="screen-header">
        <div>
          <span className="eyebrow">{t('account.eyebrow')}</span>
          <h1>{t(identity.isAccount ? 'account.title.secured' : 'account.title.secure')}</h1>
          <p>{identity.isAccount ? t('account.connectedAs', { email: identity.accountEmail ?? '' }) : t('account.guestIntro')}</p>
        </div>
        <Button onClick={onBack}>← {t('account.menu')}</Button>
      </header>

      {identity.isAccount ? (
        <div className="account-connected-layout">
          <section className="account-status">
            <b>✓ {t('account.active')}</b>
            <p>{t('account.activeDescription')}</p>
            <small>{t('account.staySignedIn')}</small>
            <Link className="account-legal-link" to="/legal">{t('legal.shortLink')}</Link>
            <Button variant="ghost" onClick={onLogout}>{t('account.logout')}</Button>
          </section>
          <section className="account-danger-zone">
            <span className="eyebrow">{t('account.delete.eyebrow')}</span>
            <h2>{t('account.delete.title')}</h2>
            <p>{t('account.delete.body')}</p>
            <form onSubmit={deleteAccount}>
              <label htmlFor="delete-password">{t('account.delete.password')}</label>
              <input
                id="delete-password"
                type="password"
                autoComplete="current-password"
                value={deletePassword}
                onChange={(event) => setDeletePassword(event.target.value)}
                placeholder={t('account.passwordPlaceholder')}
              />
              <label className="account-delete-confirm" htmlFor="delete-confirmed">
                <input
                  id="delete-confirmed"
                  type="checkbox"
                  checked={deleteConfirmed}
                  onChange={(event) => setDeleteConfirmed(event.target.checked)}
                />
                <span>{t('account.delete.confirm')}</span>
              </label>
              {deleteError && <span className="form-error" role="alert">{deleteError}</span>}
              <Button
                className="danger-button"
                type="submit"
                disabled={deletePending || deletePassword.length < 8 || !deleteConfirmed}
              >
                {t(deletePending ? 'account.delete.pending' : 'account.delete.action')}
              </Button>
            </form>
          </section>
        </div>
      ) : (
        <section className="account-layout">
          <article>
            <span className="eyebrow">{t('account.guestToAccount')}</span>
            <h2>{t('account.noLossTitle')}</h2>
            <p>{t('account.noLossBody')}</p>
            <ul>
              <li>{t('account.benefit.decks')}</li>
              <li>{t('account.benefit.boosters')}</li>
              <li>{t('account.benefit.devices')}</li>
            </ul>
          </article>
          <form className="account-form" onSubmit={link}>
            <label htmlFor="link-email">{t('account.email')}</label>
            <input id="link-email" type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder={t('account.emailPlaceholder')} />
            <label htmlFor="link-password">{t('account.password')}</label>
            <input id="link-password" type="password" autoComplete="new-password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder={t('account.passwordPlaceholder')} />
            <label htmlFor="link-confirm">{t('account.confirmPassword')}</label>
            <input id="link-confirm" type="password" autoComplete="new-password" value={confirm} onChange={(event) => setConfirm(event.target.value)} placeholder={t('account.confirmPlaceholder')} />
            {error && <span className="form-error" role="alert">{error}</span>}
            <Button variant="primary" type="submit" disabled={pending || !email || password.length < 8 || confirm !== password}>{t(pending ? 'account.saving' : 'account.link')}</Button>
            <small>{t('account.privacy')} <Link className="account-legal-link" to="/legal">{t('legal.shortLink')}</Link></small>
          </form>
        </section>
      )}
    </main>
  );
}
