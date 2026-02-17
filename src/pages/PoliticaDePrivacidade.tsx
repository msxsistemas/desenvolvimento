import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function PoliticaDePrivacidade() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="max-w-3xl mx-auto px-4 py-12">
        <button
          onClick={() => window.history.length > 1 ? navigate(-1) : navigate('/auth')}
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-8"
        >
          <ArrowLeft className="h-4 w-4" />
          Voltar
        </button>

        <h1 className="text-3xl font-bold mb-2">Política de Privacidade</h1>
        <p className="text-sm text-muted-foreground mb-10">Última atualização: 17 de fevereiro de 2026</p>

        <div className="prose prose-invert prose-sm max-w-none space-y-8 text-muted-foreground leading-relaxed">
          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-foreground">1. Introdução</h2>
            <p>
              A presente Política de Privacidade descreve como o Gestor MSX ("nós", "nosso" ou "Plataforma") coleta, utiliza, armazena, compartilha e protege as informações pessoais dos usuários, em conformidade com a Lei Geral de Proteção de Dados Pessoais (LGPD - Lei nº 13.709/2018) e demais legislações aplicáveis.
            </p>
            <p>
              Ao utilizar a Plataforma, você consente com a coleta e o tratamento de seus dados conforme descrito nesta política.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-foreground">2. Dados Coletados</h2>
            <p>Coletamos os seguintes tipos de dados pessoais:</p>

            <h3 className="text-base font-medium text-foreground">2.1 Dados fornecidos pelo usuário</h3>
            <ul className="list-disc pl-5 space-y-1.5">
              <li><strong className="text-foreground">Dados cadastrais:</strong> nome completo, e-mail, telefone, nome da empresa;</li>
              <li><strong className="text-foreground">Dados de autenticação:</strong> e-mail e senha (armazenada de forma criptografada);</li>
              <li><strong className="text-foreground">Dados de perfil:</strong> foto de avatar, chave PIX para indicações;</li>
              <li><strong className="text-foreground">Dados financeiros:</strong> chaves de API de gateways de pagamento (armazenadas de forma criptografada), informações de transações;</li>
              <li><strong className="text-foreground">Dados de clientes:</strong> informações cadastradas pelo usuário sobre seus próprios clientes (nome, WhatsApp, e-mail, plano, dados de acesso).</li>
            </ul>

            <h3 className="text-base font-medium text-foreground">2.2 Dados coletados automaticamente</h3>
            <ul className="list-disc pl-5 space-y-1.5">
              <li><strong className="text-foreground">Dados de uso:</strong> páginas acessadas, funcionalidades utilizadas, horários de acesso;</li>
              <li><strong className="text-foreground">Dados do dispositivo:</strong> tipo de navegador, sistema operacional, endereço IP;</li>
              <li><strong className="text-foreground">Logs do sistema:</strong> registros de ações realizadas na Plataforma para fins de auditoria e segurança.</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-foreground">3. Finalidade do Tratamento</h2>
            <p>Utilizamos seus dados pessoais para as seguintes finalidades:</p>
            <ul className="list-disc pl-5 space-y-1.5">
              <li>Criação e gerenciamento da sua conta na Plataforma;</li>
              <li>Prestação dos serviços contratados, incluindo gestão de clientes, cobranças e envio de mensagens;</li>
              <li>Processamento de pagamentos e gestão de assinaturas;</li>
              <li>Envio de notificações relacionadas ao serviço (vencimentos, cobranças, alertas do sistema);</li>
              <li>Integração com serviços de terceiros (gateways de pagamento, WhatsApp, painéis de servidores);</li>
              <li>Geração de relatórios e métricas para o usuário;</li>
              <li>Melhoria contínua da Plataforma e desenvolvimento de novas funcionalidades;</li>
              <li>Cumprimento de obrigações legais e regulatórias;</li>
              <li>Prevenção de fraudes e atividades ilícitas;</li>
              <li>Suporte ao cliente.</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-foreground">4. Base Legal para o Tratamento</h2>
            <p>O tratamento dos dados pessoais é realizado com base nas seguintes hipóteses legais da LGPD:</p>
            <ul className="list-disc pl-5 space-y-1.5">
              <li><strong className="text-foreground">Execução de contrato:</strong> para prestação dos serviços contratados;</li>
              <li><strong className="text-foreground">Consentimento:</strong> para finalidades opcionais, como comunicações de marketing;</li>
              <li><strong className="text-foreground">Legítimo interesse:</strong> para melhoria da Plataforma e prevenção de fraudes;</li>
              <li><strong className="text-foreground">Cumprimento de obrigação legal:</strong> para atender exigências legais e regulatórias.</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-foreground">5. Compartilhamento de Dados</h2>
            <p>Seus dados pessoais poderão ser compartilhados com:</p>
            <ul className="list-disc pl-5 space-y-1.5">
              <li><strong className="text-foreground">Gateways de pagamento:</strong> Asaas, Mercado Pago, Ciabra e V3Pay, para processamento de cobranças e pagamentos;</li>
              <li><strong className="text-foreground">Serviços de comunicação:</strong> APIs de WhatsApp (Evolution API) para envio de mensagens;</li>
              <li><strong className="text-foreground">Painéis de servidores:</strong> Sigma, Koffice, MundoGF, Uniplay e Playfast, para integrações de renovação e gerenciamento;</li>
              <li><strong className="text-foreground">Supabase:</strong> nosso provedor de infraestrutura e banco de dados;</li>
              <li><strong className="text-foreground">Autoridades competentes:</strong> quando exigido por lei, ordem judicial ou determinação regulatória.</li>
            </ul>
            <p>
              Não vendemos, alugamos ou comercializamos seus dados pessoais com terceiros para fins de marketing.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-foreground">6. Armazenamento e Segurança</h2>
            <p>
              Seus dados são armazenados em servidores seguros com criptografia em trânsito (TLS/SSL) e em repouso. Adotamos medidas técnicas e organizacionais para proteger seus dados contra acesso não autorizado, alteração, divulgação ou destruição, incluindo:
            </p>
            <ul className="list-disc pl-5 space-y-1.5">
              <li>Criptografia de senhas e chaves de API;</li>
              <li>Controle de acesso baseado em funções (RLS - Row Level Security);</li>
              <li>Isolamento de dados por usuário;</li>
              <li>Monitoramento e logs de atividades;</li>
              <li>Backups regulares.</li>
            </ul>
            <p>
              Apesar dos nossos esforços, nenhum sistema é completamente invulnerável. Em caso de incidente de segurança que possa causar risco ou dano relevante, notificaremos os titulares afetados e a Autoridade Nacional de Proteção de Dados (ANPD) conforme exigido pela LGPD.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-foreground">7. Retenção de Dados</h2>
            <p>
              Seus dados pessoais serão mantidos pelo tempo necessário para cumprir as finalidades para as quais foram coletados, incluindo obrigações legais, contratuais e regulatórias. Após o encerramento da conta:
            </p>
            <ul className="list-disc pl-5 space-y-1.5">
              <li>Dados da conta e clientes são mantidos por 30 dias para possível recuperação;</li>
              <li>Dados financeiros e fiscais são mantidos pelo prazo legal de 5 anos;</li>
              <li>Logs de sistema são mantidos por 6 meses;</li>
              <li>Após os prazos aplicáveis, os dados são permanentemente excluídos ou anonimizados.</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-foreground">8. Direitos do Titular</h2>
            <p>Em conformidade com a LGPD, você tem direito a:</p>
            <ul className="list-disc pl-5 space-y-1.5">
              <li><strong className="text-foreground">Confirmação e acesso:</strong> saber se tratamos seus dados e acessar as informações;</li>
              <li><strong className="text-foreground">Correção:</strong> solicitar a atualização de dados incompletos, inexatos ou desatualizados;</li>
              <li><strong className="text-foreground">Anonimização ou eliminação:</strong> solicitar a anonimização ou exclusão de dados desnecessários;</li>
              <li><strong className="text-foreground">Portabilidade:</strong> solicitar a transferência dos seus dados a outro fornecedor;</li>
              <li><strong className="text-foreground">Revogação do consentimento:</strong> retirar o consentimento a qualquer momento;</li>
              <li><strong className="text-foreground">Oposição:</strong> opor-se ao tratamento de dados quando baseado em legítimo interesse;</li>
              <li><strong className="text-foreground">Informação sobre compartilhamento:</strong> saber com quais entidades seus dados foram compartilhados.</li>
            </ul>
            <p>
              Para exercer seus direitos, entre em contato através dos canais de suporte disponíveis na Plataforma. Responderemos às solicitações dentro do prazo legal de 15 (quinze) dias úteis.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-foreground">9. Dados de Clientes do Usuário</h2>
            <p>
              O usuário da Plataforma é o controlador dos dados pessoais de seus próprios clientes cadastrados no sistema. O Gestor MSX atua como operador desses dados, processando-os conforme as instruções do usuário. É responsabilidade do usuário:
            </p>
            <ul className="list-disc pl-5 space-y-1.5">
              <li>Obter o consentimento necessário de seus clientes para o tratamento de dados;</li>
              <li>Garantir a legalidade do envio de mensagens via WhatsApp;</li>
              <li>Manter os dados de seus clientes atualizados e corretos;</li>
              <li>Atender às solicitações de direitos dos titulares de dados de seus clientes.</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-foreground">10. Cookies e Tecnologias de Rastreamento</h2>
            <p>
              A Plataforma utiliza cookies e tecnologias semelhantes para manter sua sessão ativa, lembrar preferências e melhorar a experiência de uso. Não utilizamos cookies de rastreamento para fins publicitários de terceiros.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-foreground">11. Transferência Internacional de Dados</h2>
            <p>
              Seus dados podem ser armazenados e processados em servidores localizados fora do Brasil, em países que ofereçam nível adequado de proteção de dados ou mediante a adoção de salvaguardas apropriadas, conforme exigido pela LGPD.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-foreground">12. Menores de Idade</h2>
            <p>
              A Plataforma não é destinada a menores de 18 anos. Não coletamos intencionalmente dados de menores. Caso identifiquemos que dados de um menor foram coletados, procederemos à exclusão imediata.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-foreground">13. Alterações nesta Política</h2>
            <p>
              Esta Política de Privacidade poderá ser atualizada periodicamente. As alterações serão comunicadas através da Plataforma e/ou por e-mail. Recomendamos a revisão periódica desta página para manter-se informado sobre nossas práticas de privacidade.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-foreground">14. Contato e Encarregado de Dados (DPO)</h2>
            <p>
              Para dúvidas, solicitações ou reclamações relacionadas a esta Política de Privacidade ou ao tratamento de seus dados pessoais, entre em contato através dos canais de suporte disponíveis na Plataforma.
            </p>
            <p>
              Caso entenda que o tratamento de seus dados pessoais viola a legislação aplicável, você tem o direito de apresentar uma reclamação à Autoridade Nacional de Proteção de Dados (ANPD).
            </p>
          </section>
        </div>

        <div className="mt-12 pt-6 border-t border-border text-center">
          <p className="text-xs text-muted-foreground/50">
            2026© Todos os direitos reservados Gestor MSX
          </p>
        </div>
      </div>
    </div>
  );
}
