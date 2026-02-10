import { ProviderConfig } from "./types";

export const PLAYFAST_CONFIG: ProviderConfig = {
  id: 'playfast',
  nome: 'PLAYFAST',
  descricao: 'Painel IPTV Playfast',
  integrado: true,
  senhaLabel: 'Senha',
  senhaPlaceholder: 'Senha do painel',
  nomePlaceholder: 'Nome do painel',
  urlPlaceholder: 'https://seupainel.playfast.com',
  usuarioPlaceholder: 'Usuário do painel',
  loginEndpoint: '/api/auth/login',
  loginMethod: 'POST',
  buildLoginPayload: (usuario: string, senha: string) => ({
    username: usuario,
    password: senha,
  }),
};
