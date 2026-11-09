import { createContext, useCallback, useContext, useMemo, useState } from 'react';

// El chat base no tiene autenticación: la "sesión" es el usuario elegido, guardado en el navegador.
const KEY = 'chat.identity';
const IdentityContext = createContext(null);

function load() {
  try {
    return JSON.parse(localStorage.getItem(KEY)) || { current: null, known: [] };
  } catch {
    return { current: null, known: [] };
  }
}

function save(state) {
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    /* almacenamiento no disponible: la sesión dura lo que la pestaña */
  }
}

export function IdentityProvider({ children }) {
  const [state, setState] = useState(load);

  const update = useCallback((fn) => {
    setState((prev) => {
      const next = fn(prev);
      save(next);
      return next;
    });
  }, []);

  const value = useMemo(() => ({
    user: state.current,
    known: state.known,
    signIn: (user) => update((prev) => ({
      current: user,
      known: [user, ...prev.known.filter((u) => u.id !== user.id)].slice(0, 8),
    })),
    signOut: () => update((prev) => ({ ...prev, current: null })),
    forget: (id) => update((prev) => ({ ...prev, known: prev.known.filter((u) => u.id !== id) })),
  }), [state, update]);

  return <IdentityContext.Provider value={value}>{children}</IdentityContext.Provider>;
}

export function useIdentity() {
  return useContext(IdentityContext);
}

// Polls no expone quién votó: se recuerda localmente qué opción eligió cada usuario.
const VOTES_KEY = 'chat.votes';

export function getVote(userId, pollId) {
  try {
    return JSON.parse(localStorage.getItem(VOTES_KEY) || '{}')[`${userId}:${pollId}`];
  } catch {
    return undefined;
  }
}

export function rememberVote(userId, pollId, optionId) {
  try {
    const votes = JSON.parse(localStorage.getItem(VOTES_KEY) || '{}');
    votes[`${userId}:${pollId}`] = optionId;
    localStorage.setItem(VOTES_KEY, JSON.stringify(votes));
  } catch {
    /* sin almacenamiento */
  }
}
