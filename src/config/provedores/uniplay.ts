import { ProviderConfig } from "./types";

/**
 * Mapeamento de URLs de frontend para URLs de API do Uniplay/Franquias.
 * O frontend (SPA Vue.js) roda em um domínio e a API em outro.
 */
export const UNIPLAY_URL_MAP: Record<string, string> = {
  'gestordefender.com': 'gesapioffice.com',
  'www.gestordefender.com': 'gesapioffice.com',
};

/** URLs conhecidas das franquias */
export const UNIPLAY_KNOWN_URLS = [
  { label: 'Uniplay', url: 'https://gestordefender.com' },
  { label: 'PlayOn', url: 'https://officeplayon.com' },
  { label: 'NewTVS', url: 'https://personalgestor.click' },
  { label: 'E3PLAY', url: 'https://e3office.click' },
];

/**
 * Converte URL de frontend para URL da API real.
 * Se a URL já for a API ou não tiver mapeamento, retorna a própria URL.
 */
export function resolveUniplayApiUrl(inputUrl: string): string {
  try {
    const url = new URL(inputUrl.replace(/\/$/, ''));
    const host = url.hostname.toLowerCase();
    const apiHost = UNIPLAY_URL_MAP[host];
    if (apiHost) {
      return `${url.protocol}//${apiHost}`;
    }
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
