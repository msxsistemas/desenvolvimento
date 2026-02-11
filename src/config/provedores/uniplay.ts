import { ProviderConfig } from "./types";

/**
 * A API real do Uniplay roda em gesapioffice.com (separada do frontend).
 * Frontend → gestordefender.com, officeplayon.com, etc.
 * API → gesapioffice.com (CORS: *)
 */

/** URLs conhecidas das franquias (frontend → API compartilhada) */
export const UNIPLAY_KNOWN_URLS = [
  { label: 'Uniplay', url: 'https://gestordefender.com' },
  { label: 'PlayOn', url: 'https://officeplayon.com' },
  { label: 'NewTVS', url: 'https://personalgestor.click' },
  { label: 'E3PLAY', url: 'https://e3office.click' },
];

/** URL fixa da API compartilhada por todas as franquias Uniplay */
export const UNIPLAY_API_BASE = 'https://gesapioffice.com';

/**
 * Retorna a URL da API real do Uniplay.
 * Todas as franquias usam a mesma API: gesapioffice.com
 */
export function resolveUniplayApiUrl(_inputUrl: string): string {
  return UNIPLAY_API_BASE;
}

export const UNIPLAY_CONFIG: ProviderConfig = {
  id: 'uniplay',
  nome: 'UNIPLAY E FRANQUIAS',
  descricao: 'Painel Uniplay e Franquias (IPTV e P2P)',
  integrado: true,
  emManutencao: true,
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
    code: '',
  }),
};
