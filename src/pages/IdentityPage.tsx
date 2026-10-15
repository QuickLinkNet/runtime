import { useState, type FormEvent } from 'react';
import { api, setToken } from '../api/client';
import type { PlayerIdentity } from '../game/types';
import { useI18n } from '../i18n';
import { cacheIdentity } from '../pwa/identityCache';
import { Button } from '../ui/atoms';

type AccessMode = 'guest' | 'login' | 'register';

interface IdentityPageProps {
  onCreated: (player: PlayerIdentity) => void;
  onLoggedIn: (player: PlayerIdentity) => void;
}

export function IdentityPage({ onCreated, onLoggedIn }: IdentityPageProps) {
  const { t } = useI18n();
  const [mode, setMode] = useState<AccessMode>('guest');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [pending, setPending] = useState(false);
  const current = {
    label: t(`identity.${mode}.label`),
    title: t(`identity.${mode}.title`),
    body: t(`identity.${mode}.body`),
    action: t(`identity.${mode}.action`),
  };

  function changeMode(next: AccessMode) {
    setMode(next);
    setError('');
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (mode === 'register' && password !== confirm) { setError(t('account.error.passwordMismatch')); return; }
    setPending(true);
    setError('');
    try {
      const result = mode === 'guest'
        ? await api.createPlayer(name.trim())
        : mode === 'login'
          ? await api.login(email, password)
          : await api.registerAccount(name.trim(), email, password);
      setToken(result.token);
      cacheIdentity(result.player);
      if (mode === 'guest') onCreated(result.player);
      else onLoggedIn(result.player);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : t('identity.error.connection'));
      setPending(false);
    }
  }

  const valid = mode === 'guest'
    ? name.trim().length >= 2
    : mode === 'login'
      ? Boolean(email) && password.length >= 8
      : name.trim().length >= 2 && Boolean(email) && password.length >= 8 && password === confirm;

  return (
    <main className="screen identity-screen">
      <header className="identity-header"><div className="brand-small">RUNTIME<span>_</span></div><span><i /> {t('identity.systemOnline')}</span></header>
      <section className="identity-hero"><span className="eyebrow">{t('identity.heroEyebrow')}</span><h1><span>{t('identity.heroDeploy')}</span><span>{t('identity.heroDefend')}</span><em>{t('identity.heroDebug')}</em></h1><p>{t('identity.heroBody')}</p><div className="identity-specs" aria-label={t('identity.features')}><span><b>30</b> {t('identity.coreIntegrity')}</span><span><b>02</b> {t('identity.techDomains')}</span><span><b>1V1</b> {t('identity.runtimeDuel')}</span></div></section>
      <section className="identity-access-card">
        <div className="identity-access-topline"><span>{t(`identity.${mode}.code`)}</span><b>01</b></div>
        <span className="eyebrow">{current.label}</span><h2>{current.title}</h2><p>{current.body}</p>
        <form onSubmit={submit}>
          {mode !== 'login' && <><label htmlFor="player-name">{t('identity.playerNameLabel')}</label><input id="player-name" autoFocus maxLength={24} autoComplete="nickname" value={name} onChange={(event) => setName(event.target.value)} placeholder={t('identity.playerNamePlaceholder')} /></>}
          {mode !== 'guest' && <><label htmlFor="account-email">{t('account.email')}</label><input id="account-email" autoFocus={mode === 'login'} type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder={t('account.emailPlaceholder')} /><label htmlFor="account-password">{t('account.password')}</label><input id="account-password" type="password" autoComplete={mode === 'login' ? 'current-password' : 'new-password'} value={password} onChange={(event) => setPassword(event.target.value)} placeholder={t('account.passwordPlaceholder')} /></>}
          {mode === 'register' && <><label htmlFor="account-confirm">{t('account.confirmPassword')}</label><input id="account-confirm" type="password" autoComplete="new-password" value={confirm} onChange={(event) => setConfirm(event.target.value)} placeholder={t('account.confirmPlaceholder')} /></>}
          <Button variant="primary" type="submit" disabled={pending || !valid}>{pending ? t('identity.connecting') : <>{current.action} <span aria-hidden="true">→</span></>}</Button>
          {error && <span className="form-error">{error}</span>}
        </form>
        <div className="identity-account-switches">
          {mode !== 'register' && <button type="button" onClick={() => changeMode('register')}>{t('identity.switch.register')}</button>}
          {mode !== 'login' && <button type="button" onClick={() => changeMode('login')}>{t('identity.switch.login')}</button>}
          {mode !== 'guest' && <button type="button" onClick={() => changeMode('guest')}>{t('identity.switch.guest')}</button>}
        </div>
        <small>{t(mode === 'guest' ? 'identity.guestNote' : 'identity.accountNote')}</small>
      </section>
      <footer className="identity-footer"><span>{t('identity.serverAuthoritative')}</span><span>{t('identity.noPayToWin')}</span></footer>
    </main>
  );
}
