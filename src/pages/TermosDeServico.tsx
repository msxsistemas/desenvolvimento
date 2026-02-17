import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function TermosDeServico() {
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

        <h1 className="text-3xl font-bold mb-2">Termos de Serviço</h1>
        <p className="text-sm text-muted-foreground mb-10">Última atualização: 17 de fevereiro de 2026</p>

        <div className="prose prose-invert prose-sm max-w-none space-y-8 text-muted-foreground leading-relaxed">
          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-foreground">1. Aceitação dos Termos</h2>
            <p>
              Ao acessar ou utilizar a plataforma Gestor MSX ("Plataforma"), você concorda em cumprir e ficar vinculado a estes Termos de Serviço. Caso não concorde com qualquer parte destes termos, você não deverá utilizar a Plataforma. O uso continuado da Plataforma após a publicação de alterações constitui aceitação dos termos modificados.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-foreground">2. Descrição do Serviço</h2>
            <p>
              O Gestor MSX é uma plataforma de gestão empresarial que oferece funcionalidades de gerenciamento de clientes, planos, produtos, cobranças automatizadas, envio de mensagens via WhatsApp, integração com gateways de pagamento (Asaas, Mercado Pago, Ciabra, V3Pay, PIX Manual), integração com painéis de servidores (Sigma, Koffice, MundoGF, Uniplay, Playfast), geração de faturas, relatórios financeiros e sistema de indicações.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-foreground">3. Cadastro e Conta</h2>
            <p>
              Para utilizar a Plataforma, é necessário criar uma conta fornecendo informações verdadeiras, completas e atualizadas. Você é responsável por manter a confidencialidade de suas credenciais de acesso (e-mail e senha) e por todas as atividades realizadas em sua conta. Caso tome conhecimento de qualquer uso não autorizado, deverá nos notificar imediatamente.
            </p>
            <p>
              Cada conta é pessoal e intransferível. Não é permitido compartilhar credenciais de acesso com terceiros. A Plataforma reserva-se o direito de suspender ou encerrar contas que violem esta disposição.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-foreground">4. Planos e Assinaturas</h2>
            <p>
              A Plataforma oferece diferentes planos de assinatura, podendo incluir períodos de teste gratuito. Os planos possuem limites específicos de clientes, mensagens, sessões de WhatsApp e painéis integrados. Ao contratar um plano, você concorda com os valores, funcionalidades e limitações descritos na página de planos vigente no momento da contratação.
            </p>
            <p>
              O acesso aos recursos da Plataforma depende da manutenção de uma assinatura ativa. O não pagamento dentro do prazo de vencimento poderá resultar na suspensão temporária ou definitiva do acesso à conta, sem prejuízo dos dados armazenados por período determinado.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-foreground">5. Pagamentos e Reembolsos</h2>
            <p>
              Os pagamentos são processados através dos gateways de pagamento integrados à Plataforma. Ao realizar um pagamento, você declara que está autorizado a utilizar o método de pagamento escolhido. Todos os valores são cobrados em Reais (BRL).
            </p>
            <p>
              Reembolsos podem ser solicitados em até 7 (sete) dias corridos após a contratação, desde que o serviço não tenha sido utilizado de forma substancial. Após esse período, não serão concedidos reembolsos parciais ou totais, salvo em situações excepcionais analisadas caso a caso.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-foreground">6. Uso Aceitável</h2>
            <p>Ao utilizar a Plataforma, você se compromete a:</p>
            <ul className="list-disc pl-5 space-y-1.5">
              <li>Não utilizar o serviço para atividades ilegais, fraudulentas ou que violem direitos de terceiros;</li>
              <li>Não enviar mensagens em massa (spam) ou conteúdo ofensivo, ameaçador ou abusivo através das funcionalidades de WhatsApp;</li>
              <li>Respeitar os termos de uso das plataformas integradas (WhatsApp, gateways de pagamento, painéis de servidores);</li>
              <li>Não tentar acessar áreas restritas, sistemas ou dados de outros usuários;</li>
              <li>Não realizar engenharia reversa, descompilar ou tentar extrair o código-fonte da Plataforma;</li>
              <li>Não utilizar bots, scrapers ou ferramentas automatizadas para acessar a Plataforma sem autorização prévia;</li>
              <li>Manter seus dados cadastrais atualizados e verídicos.</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-foreground">7. Integrações com Terceiros</h2>
            <p>
              A Plataforma oferece integração com serviços de terceiros, incluindo gateways de pagamento, API do WhatsApp (via Evolution API) e painéis de gerenciamento de servidores. Essas integrações estão sujeitas aos termos e políticas dos respectivos provedores. O Gestor MSX não se responsabiliza por falhas, indisponibilidade ou alterações nos serviços de terceiros.
            </p>
            <p>
              As chaves de API e credenciais de acesso fornecidas para as integrações são armazenadas de forma criptografada. Contudo, é responsabilidade do usuário garantir que suas credenciais não sejam comprometidas.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-foreground">8. Envio de Mensagens via WhatsApp</h2>
            <p>
              A funcionalidade de envio de mensagens via WhatsApp é oferecida como ferramenta de comunicação com clientes cadastrados na Plataforma. O usuário é o único responsável pelo conteúdo das mensagens enviadas e deve cumprir as políticas de uso do WhatsApp, incluindo as diretrizes sobre mensagens comerciais.
            </p>
            <p>
              O Gestor MSX não garante a entrega de mensagens, pois está sujeita às políticas e limitações impostas pelo WhatsApp. O envio excessivo ou abusivo de mensagens poderá resultar no bloqueio do número pelo WhatsApp, pelo que o Gestor MSX não se responsabiliza.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-foreground">9. Propriedade Intelectual</h2>
            <p>
              Todo o conteúdo da Plataforma, incluindo marca, logotipos, design, código-fonte, funcionalidades e documentação, é de propriedade exclusiva do Gestor MSX e está protegido pelas leis de propriedade intelectual brasileiras e tratados internacionais. É proibida a reprodução, distribuição ou uso não autorizado de qualquer elemento da Plataforma.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-foreground">10. Limitação de Responsabilidade</h2>
            <p>
              A Plataforma é fornecida "como está" e "conforme disponível". Não garantimos que o serviço será ininterrupto, livre de erros ou completamente seguro. Em nenhuma circunstância o Gestor MSX será responsável por danos indiretos, incidentais, especiais, consequenciais ou punitivos, incluindo perda de lucros, dados ou oportunidades de negócio.
            </p>
            <p>
              A responsabilidade total do Gestor MSX em qualquer reclamação não excederá o valor pago pelo usuário nos últimos 3 (três) meses anteriores ao evento que deu origem à reclamação.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-foreground">11. Suspensão e Encerramento</h2>
            <p>
              Reservamo-nos o direito de suspender ou encerrar sua conta, sem aviso prévio, caso identifiquemos violação destes Termos de Serviço, uso abusivo da Plataforma, inadimplência ou qualquer conduta que possa prejudicar outros usuários ou a integridade do sistema.
            </p>
            <p>
              Em caso de encerramento, seus dados serão mantidos por até 30 (trinta) dias, período durante o qual você poderá solicitar a exportação. Após esse prazo, os dados serão permanentemente excluídos.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-foreground">12. Alterações nos Termos</h2>
            <p>
              O Gestor MSX reserva-se o direito de modificar estes Termos de Serviço a qualquer momento. As alterações serão comunicadas através da Plataforma ou por e-mail. O uso continuado após a notificação constitui aceitação dos novos termos.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-foreground">13. Legislação Aplicável e Foro</h2>
            <p>
              Estes Termos de Serviço são regidos pelas leis da República Federativa do Brasil. Qualquer disputa decorrente destes termos será submetida ao foro da comarca do domicílio do usuário, conforme previsto no Código de Defesa do Consumidor.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-foreground">14. Contato</h2>
            <p>
              Para dúvidas, sugestões ou reclamações relacionadas a estes Termos de Serviço, entre em contato conosco através dos canais de suporte disponíveis na Plataforma.
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
