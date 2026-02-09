import { ProviderConfig } from "./types";

export const SIGMA_CONFIG: ProviderConfig = {
  id: 'sigma-v2',
  nome: 'PAINEL SIGMA',
  descricao: 'Painel Sigma versão 2',
  integrado: true,
  senhaLabel: 'Senha do Painel',
  senhaPlaceholder: 'sua_senha',
  nomePlaceholder: 'Ex: Meu Painel Principal',
  urlPlaceholder: 'https://painel.exemplo.com',
  usuarioPlaceholder: 'seu_usuario',
  loginEndpoint: '/api/auth/login',
  loginMethod: 'POST',
  buildLoginPayload: (usuario: string, senha: string) => ({
    captcha: 'not-a-robot',
    captchaChecked: true,
    username: usuario,
    password: senha,
    twofactor_code: '',
    twofactor_recovery_code: '',
    twofactor_trusted_device_id: '',
  }),
};
