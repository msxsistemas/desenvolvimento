import { ProviderConfig } from "./types";

/**
 * URLs conhecidas das franquias Uniplay.
 * A API geralmente roda no mesmo domínio do frontend.
 */

/** URLs conhecidas das franquias */
export const UNIPLAY_KNOWN_URLS = [
  { label: 'Uniplay', url: 'https://gestordefender.com' },
  { label: 'PlayOn', url: 'https://officeplayon.com' },
  { label: 'NewTVS', url: 'https://personalgestor.click' },
  { label: 'E3PLAY', url: 'https://e3office.click' },
];

/**
 * Retorna a URL base (origin) da URL informada.
 */
export function resolveUniplayApiUrl(inputUrl: string): string {
  try {
    const url = new URL(inputUrl.replace(/\/$/, ''));
    return url.origin;
  } catch {
    return inputUrl.replace(/\/$/, '');
  }
}

export const UNIPLAY_CONFIG: ProviderConfig = {
  id: 'uniplay',
  nome: 'UNIPLAY E FRANQUIAS',
  descricao: 'Painel Uniplay e Franquias (IPTV e P2P)',
  integrado: true,
  senhaLabel: 'Senha do Painel',
  senhaPlaceholder: 'sua_senha',
  nomePlaceholder: 'Ex: Uniplay Principal, Uniplay Backup',
  urlPlaceholder: 'https://gestordefender.com',
  usuarioPlaceholder: 'seu_usuario',
  loginEndpoint: '/api/login',
  loginMethod: 'POST',
  buildLoginPayload: (usuario: string, senha: string) => ({
    username: usuario,
    password: senha,
  }),
};
