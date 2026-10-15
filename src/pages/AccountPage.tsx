import { useState, type FormEvent } from 'react';
import { api, setToken } from '../api/client';
import type { PlayerIdentity } from '../game/types';
import { useI18n } from '../i18n';
import { cacheIdentity } from '../pwa/identityCache';
import { Button } from '../ui/atoms';

export function AccountPage({ identity, onLinked, onBack }: { identity: PlayerIdentity; onLinked: (identity: PlayerIdentity) => void; onBack: () => void }) {
  const { t } = useI18n();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');

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

  return (
    <main className="screen account-screen">
      <header className="screen-header"><div><span className="eyebrow">{t('account.eyebrow')}</span><h1>{t(identity.isAccount ? 'account.title.secured' : 'account.title.secure')}</h1><p>{identity.isAccount ? t('account.connectedAs', { email: identity.accountEmail ?? '' }) : t('account.guestIntro')}</p></div><Button onClick={onBack}>← {t('account.menu')}</Button></header>
      {identity.isAccount ? <section className="account-status"><b>✓ {t('account.active')}</b><p>{t('account.activeDescription')}</p></section> : <section className="account-layout"><article><span className="eyebrow">{t('account.guestToAccount')}</span><h2>{t('account.noLossTitle')}</h2><p>{t('account.noLossBody')}</p><ul><li>{t('account.benefit.decks')}</li><li>{t('account.benefit.boosters')}</li><li>{t('account.benefit.devices')}</li></ul></article><form className="account-form" onSubmit={link}><label htmlFor="link-email">{t('account.email')}</label><input id="link-email" type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder={t('account.emailPlaceholder')} /><label htmlFor="link-password">{t('account.password')}</label><input id="link-password" type="password" autoComplete="new-password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder={t('account.passwordPlaceholder')} /><label htmlFor="link-confirm">{t('account.confirmPassword')}</label><input id="link-confirm" type="password" autoComplete="new-password" value={confirm} onChange={(event) => setConfirm(event.target.value)} placeholder={t('account.confirmPlaceholder')} />{error && <span className="form-error">{error}</span>}<Button variant="primary" type="submit" disabled={pending || !email || password.length < 8 || confirm !== password}>{t(pending ? 'account.saving' : 'account.link')}</Button><small>{t('account.privacy')}</small></form></section>}
    </main>
  );
}
