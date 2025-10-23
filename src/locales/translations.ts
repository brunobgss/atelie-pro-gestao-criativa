import { Language } from '@/types/internationalization';

export interface Translations {
  // Navegação
  dashboard: string;
  orders: string;
  quotes: string;
  clients: string;
  inventory: string;
  help: string;
  myAccount: string;
  subscription: string;
  documentation: string;
  faq: string;
  
  // Dashboard
  welcome: string;
  totalOrders: string;
  totalClients: string;
  monthlyRevenue: string;
  pendingOrders: string;
  
  // Assinatura
  subscriptionPlans: string;
  monthlyPlan: string;
  yearlyPlan: string;
  monthly: string;
  yearly: string;
  perMonth: string;
  perYear: string;
  mostPopular: string;
  subscribe: string;
  manageSubscription: string;
  currentPlan: string;
  active: string;
  expired: string;
  expiring: string;
  daysRemaining: string;
  
  // Botões e ações
  save: string;
  cancel: string;
  edit: string;
  delete: string;
  create: string;
  update: string;
  confirm: string;
  close: string;
  next: string;
  previous: string;
  finish: string;
  
  // Mensagens
  success: string;
  error: string;
  warning: string;
  info: string;
  loading: string;
  noData: string;
  tryAgain: string;
  
  // Formulários
  name: string;
  email: string;
  phone: string;
  address: string;
  required: string;
  invalidEmail: string;
  invalidPhone: string;
  
  // Status
  pending: string;
  approved: string;
  rejected: string;
  inProgress: string;
  completed: string;
  
  // Ajuda
  needHelp: string;
  contactSupport: string;
  whatsappSupport: string;
  emailSupport: string;
  documentation: string;
  frequentlyAskedQuestions: string;
  
  // Moeda e valores
  currency: string;
  total: string;
  subtotal: string;
  tax: string;
  discount: string;
  finalValue: string;
}

export const translations: Record<Language, Translations> = {
  'pt-BR': {
    // Navegação
    dashboard: 'Dashboard',
    orders: 'Pedidos',
    quotes: 'Orçamentos',
    clients: 'Clientes',
    inventory: 'Estoque',
    help: 'Ajuda',
    myAccount: 'Minha Conta',
    subscription: 'Assinatura',
    documentation: 'Documentação',
    faq: 'FAQ',
    
    // Dashboard
    welcome: 'Bem-vindo',
    totalOrders: 'Total de Pedidos',
    totalClients: 'Total de Clientes',
    monthlyRevenue: 'Receita Mensal',
    pendingOrders: 'Pedidos Pendentes',
    
    // Assinatura
    subscriptionPlans: 'Planos de Assinatura',
    monthlyPlan: 'Plano Mensal',
    yearlyPlan: 'Plano Anual',
    monthly: 'Mensal',
    yearly: 'Anual',
    perMonth: 'por mês',
    perYear: 'por ano',
    mostPopular: 'Mais Popular',
    subscribe: 'Assinar',
    manageSubscription: 'Gerenciar Assinatura',
    currentPlan: 'Plano Atual',
    active: 'Ativo',
    expired: 'Expirado',
    expiring: 'Expirando',
    daysRemaining: 'dias restantes',
    
    // Botões e ações
    save: 'Salvar',
    cancel: 'Cancelar',
    edit: 'Editar',
    delete: 'Excluir',
    create: 'Criar',
    update: 'Atualizar',
    confirm: 'Confirmar',
    close: 'Fechar',
    next: 'Próximo',
    previous: 'Anterior',
    finish: 'Finalizar',
    
    // Mensagens
    success: 'Sucesso',
    error: 'Erro',
    warning: 'Aviso',
    info: 'Informação',
    loading: 'Carregando...',
    noData: 'Nenhum dado encontrado',
    tryAgain: 'Tentar novamente',
    
    // Formulários
    name: 'Nome',
    email: 'E-mail',
    phone: 'Telefone',
    address: 'Endereço',
    required: 'Obrigatório',
    invalidEmail: 'E-mail inválido',
    invalidPhone: 'Telefone inválido',
    
    // Status
    pending: 'Pendente',
    approved: 'Aprovado',
    rejected: 'Rejeitado',
    inProgress: 'Em Andamento',
    completed: 'Concluído',
    
    // Ajuda
    needHelp: 'Precisa de Ajuda?',
    contactSupport: 'Contatar Suporte',
    whatsappSupport: 'Suporte WhatsApp',
    emailSupport: 'Suporte por E-mail',
    documentation: 'Documentação',
    frequentlyAskedQuestions: 'Perguntas Frequentes',
    
    // Moeda e valores
    currency: 'Moeda',
    total: 'Total',
    subtotal: 'Subtotal',
    tax: 'Imposto',
    discount: 'Desconto',
    finalValue: 'Valor Final'
  },
  
  'pt-PT': {
    // Navegação
    dashboard: 'Painel',
    orders: 'Encomendas',
    quotes: 'Orçamentos',
    clients: 'Clientes',
    inventory: 'Inventário',
    help: 'Ajuda',
    myAccount: 'A Minha Conta',
    subscription: 'Subscrição',
    documentation: 'Documentação',
    faq: 'FAQ',
    
    // Dashboard
    welcome: 'Bem-vindo',
    totalOrders: 'Total de Encomendas',
    totalClients: 'Total de Clientes',
    monthlyRevenue: 'Receita Mensal',
    pendingOrders: 'Encomendas Pendentes',
    
    // Assinatura
    subscriptionPlans: 'Planos de Subscrição',
    monthlyPlan: 'Plano Mensal',
    yearlyPlan: 'Plano Anual',
    monthly: 'Mensal',
    yearly: 'Anual',
    perMonth: 'por mês',
    perYear: 'por ano',
    mostPopular: 'Mais Popular',
    subscribe: 'Subscrever',
    manageSubscription: 'Gerir Subscrição',
    currentPlan: 'Plano Actual',
    active: 'Activo',
    expired: 'Expirado',
    expiring: 'A Expirar',
    daysRemaining: 'dias restantes',
    
    // Botões e ações
    save: 'Guardar',
    cancel: 'Cancelar',
    edit: 'Editar',
    delete: 'Eliminar',
    create: 'Criar',
    update: 'Actualizar',
    confirm: 'Confirmar',
    close: 'Fechar',
    next: 'Seguinte',
    previous: 'Anterior',
    finish: 'Finalizar',
    
    // Mensagens
    success: 'Sucesso',
    error: 'Erro',
    warning: 'Aviso',
    info: 'Informação',
    loading: 'A carregar...',
    noData: 'Nenhum dado encontrado',
    tryAgain: 'Tentar novamente',
    
    // Formulários
    name: 'Nome',
    email: 'E-mail',
    phone: 'Telefone',
    address: 'Morada',
    required: 'Obrigatório',
    invalidEmail: 'E-mail inválido',
    invalidPhone: 'Telefone inválido',
    
    // Status
    pending: 'Pendente',
    approved: 'Aprovado',
    rejected: 'Rejeitado',
    inProgress: 'Em Curso',
    completed: 'Concluído',
    
    // Ajuda
    needHelp: 'Precisa de Ajuda?',
    contactSupport: 'Contactar Suporte',
    whatsappSupport: 'Suporte WhatsApp',
    emailSupport: 'Suporte por E-mail',
    documentation: 'Documentação',
    frequentlyAskedQuestions: 'Perguntas Frequentes',
    
    // Moeda e valores
    currency: 'Moeda',
    total: 'Total',
    subtotal: 'Subtotal',
    tax: 'Imposto',
    discount: 'Desconto',
    finalValue: 'Valor Final'
  },
  
  'en': {
    // Navegação
    dashboard: 'Dashboard',
    orders: 'Orders',
    quotes: 'Quotes',
    clients: 'Clients',
    inventory: 'Inventory',
    help: 'Help',
    myAccount: 'My Account',
    subscription: 'Subscription',
    documentation: 'Documentation',
    faq: 'FAQ',
    
    // Dashboard
    welcome: 'Welcome',
    totalOrders: 'Total Orders',
    totalClients: 'Total Clients',
    monthlyRevenue: 'Monthly Revenue',
    pendingOrders: 'Pending Orders',
    
    // Assinatura
    subscriptionPlans: 'Subscription Plans',
    monthlyPlan: 'Monthly Plan',
    yearlyPlan: 'Yearly Plan',
    monthly: 'Monthly',
    yearly: 'Yearly',
    perMonth: 'per month',
    perYear: 'per year',
    mostPopular: 'Most Popular',
    subscribe: 'Subscribe',
    manageSubscription: 'Manage Subscription',
    currentPlan: 'Current Plan',
    active: 'Active',
    expired: 'Expired',
    expiring: 'Expiring',
    daysRemaining: 'days remaining',
    
    // Botões e ações
    save: 'Save',
    cancel: 'Cancel',
    edit: 'Edit',
    delete: 'Delete',
    create: 'Create',
    update: 'Update',
    confirm: 'Confirm',
    close: 'Close',
    next: 'Next',
    previous: 'Previous',
    finish: 'Finish',
    
    // Mensagens
    success: 'Success',
    error: 'Error',
    warning: 'Warning',
    info: 'Information',
    loading: 'Loading...',
    noData: 'No data found',
    tryAgain: 'Try again',
    
    // Formulários
    name: 'Name',
    email: 'Email',
    phone: 'Phone',
    address: 'Address',
    required: 'Required',
    invalidEmail: 'Invalid email',
    invalidPhone: 'Invalid phone',
    
    // Status
    pending: 'Pending',
    approved: 'Approved',
    rejected: 'Rejected',
    inProgress: 'In Progress',
    completed: 'Completed',
    
    // Ajuda
    needHelp: 'Need Help?',
    contactSupport: 'Contact Support',
    whatsappSupport: 'WhatsApp Support',
    emailSupport: 'Email Support',
    documentation: 'Documentation',
    frequentlyAskedQuestions: 'Frequently Asked Questions',
    
    // Moeda e valores
    currency: 'Currency',
    total: 'Total',
    subtotal: 'Subtotal',
    tax: 'Tax',
    discount: 'Discount',
    finalValue: 'Final Value'
  },
  
  // Traduções para outros idiomas (espanhol, francês, italiano, alemão)
  'es': {
    dashboard: 'Panel',
    orders: 'Pedidos',
    quotes: 'Cotizaciones',
    clients: 'Clientes',
    inventory: 'Inventario',
    help: 'Ayuda',
    myAccount: 'Mi Cuenta',
    subscription: 'Suscripción',
    documentation: 'Documentación',
    faq: 'FAQ',
    welcome: 'Bienvenido',
    totalOrders: 'Total de Pedidos',
    totalClients: 'Total de Clientes',
    monthlyRevenue: 'Ingresos Mensuales',
    pendingOrders: 'Pedidos Pendientes',
    subscriptionPlans: 'Planes de Suscripción',
    monthlyPlan: 'Plan Mensual',
    yearlyPlan: 'Plan Anual',
    monthly: 'Mensual',
    yearly: 'Anual',
    perMonth: 'por mes',
    perYear: 'por año',
    mostPopular: 'Más Popular',
    subscribe: 'Suscribirse',
    manageSubscription: 'Gestionar Suscripción',
    currentPlan: 'Plan Actual',
    active: 'Activo',
    expired: 'Expirado',
    expiring: 'Por Expirar',
    daysRemaining: 'días restantes',
    save: 'Guardar',
    cancel: 'Cancelar',
    edit: 'Editar',
    delete: 'Eliminar',
    create: 'Crear',
    update: 'Actualizar',
    confirm: 'Confirmar',
    close: 'Cerrar',
    next: 'Siguiente',
    previous: 'Anterior',
    finish: 'Finalizar',
    success: 'Éxito',
    error: 'Error',
    warning: 'Advertencia',
    info: 'Información',
    loading: 'Cargando...',
    noData: 'No se encontraron datos',
    tryAgain: 'Intentar de nuevo',
    name: 'Nombre',
    email: 'Correo',
    phone: 'Teléfono',
    address: 'Dirección',
    required: 'Requerido',
    invalidEmail: 'Correo inválido',
    invalidPhone: 'Teléfono inválido',
    pending: 'Pendiente',
    approved: 'Aprobado',
    rejected: 'Rechazado',
    inProgress: 'En Progreso',
    completed: 'Completado',
    needHelp: '¿Necesitas Ayuda?',
    contactSupport: 'Contactar Soporte',
    whatsappSupport: 'Soporte WhatsApp',
    emailSupport: 'Soporte por Correo',
    documentation: 'Documentación',
    frequentlyAskedQuestions: 'Preguntas Frecuentes',
    currency: 'Moneda',
    total: 'Total',
    subtotal: 'Subtotal',
    tax: 'Impuesto',
    discount: 'Descuento',
    finalValue: 'Valor Final'
  },
  
  'fr': {
    dashboard: 'Tableau de bord',
    orders: 'Commandes',
    quotes: 'Devis',
    clients: 'Clients',
    inventory: 'Inventaire',
    help: 'Aide',
    myAccount: 'Mon Compte',
    subscription: 'Abonnement',
    documentation: 'Documentation',
    faq: 'FAQ',
    welcome: 'Bienvenue',
    totalOrders: 'Total des Commandes',
    totalClients: 'Total des Clients',
    monthlyRevenue: 'Revenus Mensuels',
    pendingOrders: 'Commandes en Attente',
    subscriptionPlans: 'Plans d\'Abonnement',
    monthlyPlan: 'Plan Mensuel',
    yearlyPlan: 'Plan Annuel',
    monthly: 'Mensuel',
    yearly: 'Annuel',
    perMonth: 'par mois',
    perYear: 'par an',
    mostPopular: 'Le Plus Populaire',
    subscribe: 'S\'abonner',
    manageSubscription: 'Gérer l\'Abonnement',
    currentPlan: 'Plan Actuel',
    active: 'Actif',
    expired: 'Expiré',
    expiring: 'Expire Bientôt',
    daysRemaining: 'jours restants',
    save: 'Enregistrer',
    cancel: 'Annuler',
    edit: 'Modifier',
    delete: 'Supprimer',
    create: 'Créer',
    update: 'Mettre à jour',
    confirm: 'Confirmer',
    close: 'Fermer',
    next: 'Suivant',
    previous: 'Précédent',
    finish: 'Terminer',
    success: 'Succès',
    error: 'Erreur',
    warning: 'Avertissement',
    info: 'Information',
    loading: 'Chargement...',
    noData: 'Aucune donnée trouvée',
    tryAgain: 'Réessayer',
    name: 'Nom',
    email: 'E-mail',
    phone: 'Téléphone',
    address: 'Adresse',
    required: 'Requis',
    invalidEmail: 'E-mail invalide',
    invalidPhone: 'Téléphone invalide',
    pending: 'En Attente',
    approved: 'Approuvé',
    rejected: 'Rejeté',
    inProgress: 'En Cours',
    completed: 'Terminé',
    needHelp: 'Besoin d\'Aide?',
    contactSupport: 'Contacter le Support',
    whatsappSupport: 'Support WhatsApp',
    emailSupport: 'Support par E-mail',
    documentation: 'Documentation',
    frequentlyAskedQuestions: 'Questions Fréquentes',
    currency: 'Devise',
    total: 'Total',
    subtotal: 'Sous-total',
    tax: 'Taxe',
    discount: 'Remise',
    finalValue: 'Valeur Finale'
  },
  
  'it': {
    dashboard: 'Dashboard',
    orders: 'Ordini',
    quotes: 'Preventivi',
    clients: 'Clienti',
    inventory: 'Inventario',
    help: 'Aiuto',
    myAccount: 'Il Mio Account',
    subscription: 'Abbonamento',
    documentation: 'Documentazione',
    faq: 'FAQ',
    welcome: 'Benvenuto',
    totalOrders: 'Totale Ordini',
    totalClients: 'Totale Clienti',
    monthlyRevenue: 'Ricavi Mensili',
    pendingOrders: 'Ordini in Sospeso',
    subscriptionPlans: 'Piani di Abbonamento',
    monthlyPlan: 'Piano Mensile',
    yearlyPlan: 'Piano Annuale',
    monthly: 'Mensile',
    yearly: 'Annuale',
    perMonth: 'al mese',
    perYear: 'all\'anno',
    mostPopular: 'Più Popolare',
    subscribe: 'Abbonati',
    manageSubscription: 'Gestisci Abbonamento',
    currentPlan: 'Piano Attuale',
    active: 'Attivo',
    expired: 'Scaduto',
    expiring: 'In Scadenza',
    daysRemaining: 'giorni rimanenti',
    save: 'Salva',
    cancel: 'Annulla',
    edit: 'Modifica',
    delete: 'Elimina',
    create: 'Crea',
    update: 'Aggiorna',
    confirm: 'Conferma',
    close: 'Chiudi',
    next: 'Avanti',
    previous: 'Precedente',
    finish: 'Termina',
    success: 'Successo',
    error: 'Errore',
    warning: 'Avviso',
    info: 'Informazione',
    loading: 'Caricamento...',
    noData: 'Nessun dato trovato',
    tryAgain: 'Riprova',
    name: 'Nome',
    email: 'E-mail',
    phone: 'Telefono',
    address: 'Indirizzo',
    required: 'Richiesto',
    invalidEmail: 'E-mail non valida',
    invalidPhone: 'Telefono non valido',
    pending: 'In Sospeso',
    approved: 'Approvato',
    rejected: 'Rifiutato',
    inProgress: 'In Corso',
    completed: 'Completato',
    needHelp: 'Hai Bisogno di Aiuto?',
    contactSupport: 'Contatta il Supporto',
    whatsappSupport: 'Supporto WhatsApp',
    emailSupport: 'Supporto E-mail',
    documentation: 'Documentazione',
    frequentlyAskedQuestions: 'Domande Frequenti',
    currency: 'Valuta',
    total: 'Totale',
    subtotal: 'Subtotale',
    tax: 'Tassa',
    discount: 'Sconto',
    finalValue: 'Valore Finale'
  },
  
  'de': {
    dashboard: 'Dashboard',
    orders: 'Bestellungen',
    quotes: 'Angebote',
    clients: 'Kunden',
    inventory: 'Inventar',
    help: 'Hilfe',
    myAccount: 'Mein Konto',
    subscription: 'Abonnement',
    documentation: 'Dokumentation',
    faq: 'FAQ',
    welcome: 'Willkommen',
    totalOrders: 'Gesamtbestellungen',
    totalClients: 'Gesamtkunden',
    monthlyRevenue: 'Monatliche Einnahmen',
    pendingOrders: 'Ausstehende Bestellungen',
    subscriptionPlans: 'Abonnementpläne',
    monthlyPlan: 'Monatsplan',
    yearlyPlan: 'Jahresplan',
    monthly: 'Monatlich',
    yearly: 'Jährlich',
    perMonth: 'pro Monat',
    perYear: 'pro Jahr',
    mostPopular: 'Am Beliebtesten',
    subscribe: 'Abonnieren',
    manageSubscription: 'Abonnement Verwalten',
    currentPlan: 'Aktueller Plan',
    active: 'Aktiv',
    expired: 'Abgelaufen',
    expiring: 'Läuft Ab',
    daysRemaining: 'Tage verbleibend',
    save: 'Speichern',
    cancel: 'Abbrechen',
    edit: 'Bearbeiten',
    delete: 'Löschen',
    create: 'Erstellen',
    update: 'Aktualisieren',
    confirm: 'Bestätigen',
    close: 'Schließen',
    next: 'Weiter',
    previous: 'Zurück',
    finish: 'Beenden',
    success: 'Erfolg',
    error: 'Fehler',
    warning: 'Warnung',
    info: 'Information',
    loading: 'Laden...',
    noData: 'Keine Daten gefunden',
    tryAgain: 'Erneut versuchen',
    name: 'Name',
    email: 'E-Mail',
    phone: 'Telefon',
    address: 'Adresse',
    required: 'Erforderlich',
    invalidEmail: 'Ungültige E-Mail',
    invalidPhone: 'Ungültige Telefonnummer',
    pending: 'Ausstehend',
    approved: 'Genehmigt',
    rejected: 'Abgelehnt',
    inProgress: 'In Bearbeitung',
    completed: 'Abgeschlossen',
    needHelp: 'Brauchen Sie Hilfe?',
    contactSupport: 'Support Kontaktieren',
    whatsappSupport: 'WhatsApp Support',
    emailSupport: 'E-Mail Support',
    documentation: 'Dokumentation',
    frequentlyAskedQuestions: 'Häufig Gestellte Fragen',
    currency: 'Währung',
    total: 'Gesamt',
    subtotal: 'Zwischensumme',
    tax: 'Steuer',
    discount: 'Rabatt',
    finalValue: 'Endwert'
  }
};

// Hook removido daqui - será movido para o contexto
