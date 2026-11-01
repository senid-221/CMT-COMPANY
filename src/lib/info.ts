import type { Metadata } from 'next';
import type { Locale } from './i18n';
import { clampText, OG_IMAGE } from './seo';

type Text = { en: string; fr: string };
export type InfoSection = { heading: Text; paragraphs: Text[] };
export type InfoPage = {
  slug: string;
  path: string;
  title: Text;
  intro: Text;
  sections: InfoSection[];
};

export const INFO_PAGES: InfoPage[] = [
  {
    slug: 'about',
    path: '/about',
    title: { en: 'About CityMarket', fr: 'À propos de CityMarket' },
    intro: {
      en: 'CityMarket is a neighbourhood online market: groceries, beauty, drinks, fashion and electronics from trusted vendors, packed with care and delivered to homes and offices across the city.',
      fr: 'CityMarket est un marché en ligne de proximité : courses, beauté, boissons, mode et électronique auprès de vendeurs de confiance, préparés avec soin et livrés aux particuliers et aux bureaux de la ville.',
    },
    sections: [
      {
        heading: { en: 'Checked before it ships', fr: 'Contrôlé avant expédition' },
        paragraphs: [
          {
            en: 'Fresh produce comes from market suppliers every morning, and beauty, drinks, fashion and electronics come from independent shops and brands. Every listing is reviewed before it goes live, and stock is updated as soon as a batch runs out.',
            fr: 'Les produits frais proviennent chaque matin des fournisseurs du marché, tandis que la beauté, les boissons, la mode et l’électronique viennent de commerces et de marques indépendants. Chaque fiche est contrôlée avant sa mise en ligne et le stock est mis à jour dès qu’un lot est épuisé.',
          },
        ],
      },
      {
        heading: { en: 'Delivered to your door', fr: 'Livrés à votre porte' },
        paragraphs: [
          {
            en: 'Choose express, same-day or next-morning delivery at checkout. Pay cash when the rider hands over your order, or online with a debit/credit card, MTN Mobile Money, Orange Money or Wave.',
            fr: 'Choisissez la livraison express, le jour même ou le lendemain matin lors de la commande. Payez en espèces à la remise de votre commande, ou en ligne par carte bancaire, MTN Mobile Money, Orange Money ou Wave.',
          },
        ],
      },
      {
        heading: { en: 'Built with local vendors', fr: 'Construit avec les vendeurs locaux' },
        paragraphs: [
          {
            en: 'Shops, brands and makers open a vendor account and activate a storefront plan. Each store has its own page on CityMarket, and its products also appear across the market with a link back to the store. Online payments are split to the vendor at checkout.',
            fr: 'Les commerces, marques et artisans ouvrent un compte vendeur et activent une formule boutique. Chaque boutique dispose de sa propre page sur CityMarket, et ses produits apparaissent aussi dans le marché avec un lien vers la boutique. Les paiements en ligne sont répartis au vendeur dès la commande.',
          },
        ],
      },
    ],
  },
  {
    slug: 'faq',
    path: '/faq',
    title: { en: 'Frequently asked questions', fr: 'Questions fréquentes' },
    intro: {
      en: 'Quick answers about ordering, delivery, payment and returns.',
      fr: 'Réponses rapides sur les commandes, la livraison, le paiement et les retours.',
    },
    sections: [
      {
        heading: { en: 'How do I place an order?', fr: 'Comment passer une commande ?' },
        paragraphs: [
          {
            en: 'Add products to your cart, open the cart and continue to checkout. Enter your name, phone number and delivery address, choose a delivery window, then confirm. You will receive an order number immediately.',
            fr: 'Ajoutez des produits au panier, ouvrez le panier et passez à la commande. Indiquez votre nom, votre numéro de téléphone et votre adresse, choisissez un créneau de livraison, puis confirmez. Un numéro de commande vous est attribué immédiatement.',
          },
        ],
      },
      {
        heading: { en: 'Do I need an account?', fr: 'Faut-il créer un compte ?' },
        paragraphs: [
          {
            en: 'No. You can order as a guest. An account keeps your details ready for next time and shows all your purchases in one place.',
            fr: 'Non. Vous pouvez commander sans compte. Un compte enregistre vos coordonnées pour la prochaine fois et regroupe tous vos achats au même endroit.',
          },
        ],
      },
      {
        heading: { en: 'How do I pay?', fr: 'Comment payer ?' },
        paragraphs: [
          {
            en: 'Every order is cash on delivery. Prepare the exact total shown on your order page for the rider.',
            fr: 'Toutes les commandes sont payées à la livraison. Préparez le montant exact affiché sur la page de votre commande pour le livreur.',
          },
        ],
      },
      {
        heading: { en: 'Can I change or cancel an order?', fr: 'Puis-je modifier ou annuler une commande ?' },
        paragraphs: [
          {
            en: 'Call or message us as soon as possible with your order number. We can change an order while it is still being packed. Once it is on the way, changes may not be possible.',
            fr: 'Appelez-nous ou écrivez-nous au plus vite avec votre numéro de commande. Une commande peut être modifiée tant qu’elle est en préparation. Une fois en route, les modifications peuvent ne plus être possibles.',
          },
        ],
      },
      {
        heading: { en: 'What if something is wrong with my order?', fr: 'Que faire si ma commande pose problème ?' },
        paragraphs: [
          {
            en: 'Tell us within 24 hours of delivery. Keep the product and its packaging. We will arrange a replacement or a refund for items that are damaged, missing or not as described.',
            fr: 'Signalez-le dans les 24 heures suivant la livraison. Conservez le produit et son emballage. Nous organisons un remplacement ou un remboursement pour les articles endommagés, manquants ou non conformes.',
          },
        ],
      },
    ],
  },
  {
    slug: 'shipping',
    path: '/shipping',
    title: { en: 'Delivery and fees', fr: 'Livraison et frais' },
    intro: {
      en: 'Delivery windows, fees and coverage. All prices are in US dollars.',
      fr: 'Créneaux, frais et zones desservies. Tous les prix sont en dollars américains.',
    },
    sections: [
      {
        heading: { en: 'Delivery windows', fr: 'Créneaux de livraison' },
        paragraphs: [
          {
            en: 'Express arrives in 25 to 40 minutes. Same-day arrives within 2 to 4 hours. Next-morning delivery arrives before midday the following day.',
            fr: 'Express arrive en 25 à 40 minutes. Le jour même arrive dans les 2 à 4 heures. La livraison du lendemain matin arrive avant midi le jour suivant.',
          },
        ],
      },
      {
        heading: { en: 'Fees', fr: 'Frais' },
        paragraphs: [
          {
            en: 'Delivery costs $3.50 for express, $2.50 for same-day and $1.50 for next morning. Orders of $50.00 or more are delivered free.',
            fr: 'La livraison coûte 3,50 $ en express, 2,50 $ le jour même et 1,50 $ le lendemain matin. Les commandes de 50,00 $ ou plus sont livrées gratuitement.',
          },
        ],
      },
      {
        heading: { en: 'Coverage', fr: 'Zone desservie' },
        paragraphs: [
          {
            en: 'We deliver inside the city and nearby districts. If your address is outside the zone, checkout will show it and our team will call you to arrange an alternative.',
            fr: 'Nous livrons en ville et dans les quartiers voisins. Si votre adresse est hors zone, la commande vous l’indiquera et notre équipe vous appellera pour trouver une solution.',
          },
        ],
      },
      {
        heading: { en: 'Payment', fr: 'Paiement' },
        paragraphs: [
          {
            en: 'Pay cash on delivery, or online with a debit/credit card, MTN Mobile Money, Orange Money or Wave. Online payments are handled securely by Flutterwave; mobile money is charged in CFA francs at the rate shown at checkout. If an online payment fails, the order stays saved and you can retry it from the order page.',
            fr: 'Payez en espèces à la livraison, ou en ligne par carte bancaire, MTN Mobile Money, Orange Money ou Wave. Les paiements en ligne sont traités de façon sécurisée par Flutterwave ; le mobile money est débité en francs CFA au taux affiché lors de la commande. Si un paiement en ligne échoue, la commande reste enregistrée et vous pouvez réessayer depuis la page de la commande.',
          },
        ],
      },
    ],
  },
  {
    slug: 'terms',
    path: '/terms',
    title: { en: 'Terms of service', fr: 'Conditions d’utilisation' },
    intro: {
      en: 'The rules that apply when you order from CityMarket.',
      fr: 'Les règles applicables lorsque vous commandez sur CityMarket.',
    },
    sections: [
      {
        heading: { en: 'Using CityMarket', fr: 'Utiliser CityMarket' },
        paragraphs: [
          {
            en: 'You must give accurate contact and delivery details. Orders with an unreachable phone number may be cancelled. You must be old enough to enter a contract in your country.',
            fr: 'Vous devez fournir des coordonnées et une adresse de livraison exactes. Les commandes dont le numéro est injoignable peuvent être annulées. Vous devez avoir l’âge requis pour contracter dans votre pays.',
          },
        ],
      },
      {
        heading: { en: 'Products and prices', fr: 'Produits et prix' },
        paragraphs: [
          {
            en: 'Prices are shown in US dollars and include applicable taxes. Products are sold by the unit shown on the product page. If an item is unavailable after you order, we will contact you and adjust or cancel that line.',
            fr: 'Les prix sont affichés en dollars américains et incluent les taxes applicables. Les produits sont vendus selon l’unité indiquée sur la page produit. Si un article devient indisponible après votre commande, nous vous contactons pour l’ajuster ou l’annuler.',
          },
        ],
      },
      {
        heading: { en: 'Delivery and payment', fr: 'Livraison et paiement' },
        paragraphs: [
          {
            en: 'Delivery times are estimates, not guarantees. Payment is due when the order is handed over, or online at checkout by card or mobile money. Repeated refused deliveries may lead to us declining future orders.',
            fr: 'Les délais de livraison sont estimatifs et non garantis. Le paiement est dû à la remise de la commande, ou en ligne lors de la commande par carte ou mobile money. Des refus de livraison répétés peuvent nous conduire à refuser de futures commandes.',
          },
        ],
      },
      {
        heading: { en: 'Accounts', fr: 'Comptes' },
        paragraphs: [
          {
            en: 'Keep your password private. You are responsible for orders placed from your account. Tell us immediately if you think someone else has access to it.',
            fr: 'Gardez votre mot de passe confidentiel. Vous êtes responsable des commandes passées depuis votre compte. Informez-nous immédiatement si vous pensez que quelqu’un d’autre y a accès.',
          },
        ],
      },
    ],
  },
  {
    slug: 'privacy',
    path: '/privacy',
    title: { en: 'Privacy policy', fr: 'Politique de confidentialité' },
    intro: {
      en: 'What we collect, why we collect it, and the choices you have.',
      fr: 'Ce que nous collectons, pourquoi, et les choix dont vous disposez.',
    },
    sections: [
      {
        heading: { en: 'What we collect', fr: 'Ce que nous collectons' },
        paragraphs: [
          {
            en: 'When you order we store your name, phone number, optional email, delivery address and order contents. If you create an account we also store your password in hashed form. We never store card numbers.',
            fr: 'Lors d’une commande, nous enregistrons votre nom, votre numéro de téléphone, votre e-mail facultatif, votre adresse et le contenu de la commande. Si vous créez un compte, nous stockons aussi votre mot de passe sous forme chiffrée. Nous ne stockons jamais de numéros de carte.',
          },
        ],
      },
      {
        heading: { en: 'How we use it', fr: 'Comment nous l’utilisons' },
        paragraphs: [
          {
            en: 'Your details are used to prepare, deliver and support your orders, to show your purchase history, and to improve the catalogue. We do not sell personal data.',
            fr: 'Vos informations servent à préparer, livrer et suivre vos commandes, à afficher votre historique d’achats et à améliorer le catalogue. Nous ne vendons pas de données personnelles.',
          },
        ],
      },
      {
        heading: { en: 'Cookies and analytics', fr: 'Cookies et mesure d’audience' },
        paragraphs: [
          {
            en: 'We keep your cart and language on your device. We also record anonymous page views on our own servers to understand which pages are useful. No third-party advertising trackers are used.',
            fr: 'Nous conservons votre panier et votre langue sur votre appareil. Nous enregistrons aussi des pages vues anonymes sur nos propres serveurs pour savoir quelles pages sont utiles. Aucun traceur publicitaire tiers n’est utilisé.',
          },
        ],
      },
      {
        heading: { en: 'Your choices', fr: 'Vos choix' },
        paragraphs: [
          {
            en: 'You can ask us to correct or delete your account data at any time. Order records are kept as long as needed for accounting and delivery disputes.',
            fr: 'Vous pouvez nous demander de corriger ou supprimer les données de votre compte à tout moment. Les commandes sont conservées le temps nécessaire à la comptabilité et au traitement des litiges.',
          },
        ],
      },
    ],
  },
  {
    slug: 'support',
    path: '/support',
    title: { en: 'Support', fr: 'Assistance' },
    intro: {
      en: 'We are here to help with orders, products and vendor questions.',
      fr: 'Nous sommes là pour vous aider sur les commandes, les produits et les questions des vendeurs.',
    },
    sections: [
      {
        heading: { en: 'Order help', fr: 'Aide sur une commande' },
        paragraphs: [
          {
            en: 'Have your order number ready (it starts with CMB). We can check the status, change a delivery slot or resolve a missing item.',
            fr: 'Ayez votre numéro de commande à portée de main (il commence par CMB). Nous pouvons vérifier le statut, modifier un créneau ou régler un article manquant.',
          },
        ],
      },
      {
        heading: { en: 'Talk to a person', fr: 'Parler à une personne' },
        paragraphs: [
          {
            en: 'Message us on WhatsApp for the fastest reply. You can also call the number on your order confirmation.',
            fr: 'Écrivez-nous sur WhatsApp pour une réponse rapide. Vous pouvez aussi appeler le numéro indiqué sur la confirmation de commande.',
          },
        ],
      },
      {
        heading: { en: 'Vendors', fr: 'Vendeurs' },
        paragraphs: [
          {
            en: 'Selling on CityMarket starts with a vendor account and a storefront plan. Register online, publish your products and activate your storefront to appear in the market and on your own store page.',
            fr: 'Pour vendre sur CityMarket, créez un compte vendeur et souscrivez à une formule boutique. Inscrivez-vous en ligne, publiez vos produits et activez votre boutique pour apparaître dans le marché et sur votre page de boutique.',
          },
        ],
      },
    ],
  },
];

export function infoPage(slug: string) {
  return INFO_PAGES.find((page) => page.slug === slug) ?? null;
}

export function infoTitle(page: InfoPage, locale: Locale) {
  return page.title[locale];
}

/** Page metadata for the static info routes, so each one has its own title, snippet and canonical URL. */
export function infoMetadata(slug: string): Metadata {
  const page = infoPage(slug);
  if (!page) return {};
  return {
    title: page.title.en,
    description: clampText(page.intro.en),
    alternates: { canonical: page.path },
    openGraph: {
      type: 'article',
      url: page.path,
      title: page.title.en,
      description: clampText(page.intro.en),
      images: [OG_IMAGE],
    },
    twitter: {
      card: 'summary_large_image',
      title: page.title.en,
      description: clampText(page.intro.en),
      images: [OG_IMAGE.url],
    },
  };
}

