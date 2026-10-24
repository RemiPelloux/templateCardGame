import { defineBundle } from '@cardgame/i18n';

export const account = defineBundle({
  en: {
    username: 'Username',
    password: 'Password',
    newPassword: 'New password',
    currentPassword: 'Current password',
    usernameHint: '{min} to {max} lowercase letters, digits or _',
    passwordHint: 'At least {min} characters',
    login: {
      title: 'Sign in',
      submit: 'Sign in',
      noAccount: 'No account yet?',
      forgot: 'Forgot your password?',
    },
    register: {
      title: 'Create an account',
      submit: 'Create account',
      hasAccount: 'Already have an account?',
      available: 'Available',
      taken: 'Taken',
    },
    recover: {
      title: 'Reset your password',
      code: 'Recovery code',
      submit: 'Reset password',
      intro: 'Use one of the recovery codes you saved when you signed up.',
    },
    codes: {
      title: 'Your recovery codes',
      intro:
        'Each code resets your password once. Save them somewhere safe: they will not be shown again.',
      copy: 'Copy codes',
      copied: 'Copied',
      done: 'I saved them',
    },
    settings: {
      title: 'Account',
      memberSince: 'Member since {date}',
      language: 'Language',
      password: {
        title: 'Password',
        submit: 'Change password',
        done: 'Password changed. Other devices were signed out.',
      },
      recovery: {
        title: 'Recovery codes',
        remaining: '{remaining} of {total} codes left',
        regenerate: 'New codes',
      },
      sessions: {
        title: 'Signed-in devices',
        current: 'This device',
        lastSeen: 'Last seen {date}',
        revoke: 'Sign out',
      },
      data: { title: 'Your data', export: 'Download my data' },
      danger: {
        title: 'Delete account',
        intro: 'Your account, coins, items and history are erased for good.',
        submit: 'Delete my account',
      },
      signOut: 'Sign out',
    },
  },
  fr: {
    username: 'Pseudo',
    password: 'Mot de passe',
    newPassword: 'Nouveau mot de passe',
    currentPassword: 'Mot de passe actuel',
    usernameHint: '{min} à {max} lettres minuscules, chiffres ou _',
    passwordHint: 'Au moins {min} caractères',
    login: {
      title: 'Connexion',
      submit: 'Se connecter',
      noAccount: 'Pas encore de compte ?',
      forgot: 'Mot de passe oublié ?',
    },
    register: {
      title: 'Créer un compte',
      submit: 'Créer le compte',
      hasAccount: 'Déjà un compte ?',
      available: 'Disponible',
      taken: 'Déjà pris',
    },
    recover: {
      title: 'Réinitialiser le mot de passe',
      code: 'Code de récupération',
      submit: 'Réinitialiser',
      intro: 'Utilisez l’un des codes de récupération enregistrés à l’inscription.',
    },
    codes: {
      title: 'Vos codes de récupération',
      intro:
        'Chaque code réinitialise votre mot de passe une fois. Gardez-les en lieu sûr : ils ne seront plus affichés.',
      copy: 'Copier les codes',
      copied: 'Copiés',
      done: 'Je les ai enregistrés',
    },
    settings: {
      title: 'Compte',
      memberSince: 'Membre depuis le {date}',
      language: 'Langue',
      password: {
        title: 'Mot de passe',
        submit: 'Changer le mot de passe',
        done: 'Mot de passe changé. Les autres appareils ont été déconnectés.',
      },
      recovery: {
        title: 'Codes de récupération',
        remaining: '{remaining} codes sur {total} restants',
        regenerate: 'Nouveaux codes',
      },
      sessions: {
        title: 'Appareils connectés',
        current: 'Cet appareil',
        lastSeen: 'Vu le {date}',
        revoke: 'Déconnecter',
      },
      data: { title: 'Vos données', export: 'Télécharger mes données' },
      danger: {
        title: 'Supprimer le compte',
        intro: 'Votre compte, vos pièces, objets et historique sont effacés définitivement.',
        submit: 'Supprimer mon compte',
      },
      signOut: 'Se déconnecter',
    },
  },
});
