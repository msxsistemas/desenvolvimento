import { ProviderConfig } from "./types";

export const UNIPLAY_CONFIG: ProviderConfig = {
  id: 'uniplay',
  nome: 'UNIPLAY E FRANQUIAS',
  descricao: 'Painel Uniplay e Franquias',
  integrado: true,
  senhaLabel: 'Senha do Painel',
  senhaPlaceholder: 'sua_senha',
  nomePlaceholder: 'Ex: Meu Painel Uniplay',
  urlPlaceholder: 'https://gesapioffice.com',
  usuarioPlaceholder: 'seu_usuario',
  loginEndpoint: '/api/login',
  loginMethod: 'POST',
  buildLoginPayload: (usuario: string, senha: string) => ({
    username: usuario,
    password: senha,
    code: '',
  }),
};
