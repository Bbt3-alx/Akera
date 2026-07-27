import { BookOpen, FileLock2, Scale } from 'lucide-react'
import { Link } from 'react-router-dom'

import { AuthHeader, AuthPage } from '../../../shared/components/AuthUI.tsx'

function InformationPage({
  children,
  icon,
  title,
}: {
  children: React.ReactNode
  icon: typeof Scale
  title: string
}) {
  return (
    <AuthPage wide>
      <AuthHeader icon={icon} title={title} />
      <div className="prose prose-slate max-w-none text-sm leading-7 text-slate-700">
        {children}
      </div>
      <p className="auth-footer">
        <Link className="auth-secondary-link" to="/login">
          Retour à Akera
        </Link>
      </p>
    </AuthPage>
  )
}

export function TermsPage() {
  return (
    <InformationPage icon={Scale} title="Conditions d’utilisation">
      <p className="auth-notice auth-notice--info">
        Projet de document à faire valider par un conseil juridique avant
        publication en production.
      </p>
      <h2>1. Objet</h2>
      <p>
        Akera fournit des outils de gestion d’opérations financières,
        d’entreprises, de correspondants et de partenaires. Chaque utilisateur
        doit employer le service dans le cadre de ses autorisations.
      </p>
      <h2>2. Compte et sécurité</h2>
      <p>
        Vous êtes responsable de vos identifiants, de la confidentialité de
        votre mot de passe et de toute action réalisée depuis votre compte.
        Signalez immédiatement tout accès suspect.
      </p>
      <h2>3. Exactitude des opérations</h2>
      <p>
        Les montants, bénéficiaires, devises et justificatifs doivent être
        vérifiés avant validation. Les journaux d’audit peuvent être conservés
        afin de protéger les entreprises et leurs membres.
      </p>
      <h2>4. Suspension et disponibilité</h2>
      <p>
        Akera peut limiter un accès présentant un risque de fraude ou de
        sécurité. Le service peut évoluer et connaître des interruptions de
        maintenance raisonnables.
      </p>
    </InformationPage>
  )
}

export function PrivacyPage() {
  return (
    <InformationPage icon={FileLock2} title="Politique de confidentialité">
      <p className="auth-notice auth-notice--info">
        Projet de document à faire valider par un conseil juridique avant
        publication en production.
      </p>
      <h2>Données traitées</h2>
      <p>
        Akera traite les informations de compte, les appartenances aux
        entreprises, les opérations enregistrées, les journaux de sécurité et
        les données nécessaires au support.
      </p>
      <h2>Finalités</h2>
      <p>
        Ces données servent à fournir le service, sécuriser les accès, prévenir
        la fraude, assurer la traçabilité et répondre aux obligations
        applicables.
      </p>
      <h2>Conservation et droits</h2>
      <p>
        Les durées de conservation dépendent de la nature des données et des
        obligations réglementaires. Les demandes d’accès, de correction ou de
        suppression doivent être adressées à l’administrateur Akera.
      </p>
    </InformationPage>
  )
}

export function DocumentationPage() {
  return (
    <InformationPage icon={BookOpen} title="Bien démarrer avec Akera">
      <h2>Créer et sécuriser votre compte</h2>
      <p>
        Créez votre compte avec votre adresse professionnelle, puis saisissez
        le code à six chiffres reçu par e-mail. Le code reste valable pendant
        quinze minutes.
      </p>
      <h2>Configurer une entreprise</h2>
      <p>
        Choisissez l’activité correspondant à vos opérations, renseignez les
        coordonnées de l’entreprise et définissez sa devise principale. Ces
        choix déterminent les modules disponibles.
      </p>
      <h2>Rejoindre une équipe</h2>
      <p>
        Ouvrez le lien reçu par e-mail ou saisissez le code d’invitation. Pour
        votre sécurité, l’adresse de votre compte doit correspondre à celle
        utilisée lors de l’invitation.
      </p>
      <h2>Changer d’entreprise et récupérer l’accès</h2>
      <p>
        Utilisez le sélecteur pour passer d’un espace autorisé à un autre. Si
        vous oubliez votre mot de passe, demandez un lien de réinitialisation
        depuis l’écran de connexion.
      </p>
    </InformationPage>
  )
}
