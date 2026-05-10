/**
 * Safe Order — UI translations.
 *
 * Three locales (Arabic / French / English). French is the canonical source —
 * any key that is missing from another locale will fall back to French at runtime.
 *
 * Add new strings as `key: { fr, en, ar }`. Keep keys lowercase.dot.notation.
 */
export type Locale = 'fr' | 'en' | 'ar'

export const LOCALES: { code: Locale; label: string; flag: string }[] = [
  { code: 'fr', label: 'Français', flag: '🇫🇷' },
  { code: 'en', label: 'English', flag: '🇬🇧' },
  { code: 'ar', label: 'العربية', flag: '🇩🇿' },
]

export const RTL_LOCALES: Locale[] = ['ar']

type Dict = Record<Locale, string>

export const TRANSLATIONS: Record<string, Dict> = {
  // ── Branding / generic ──
  'app.tagline': {
    fr: "Sécurisez vos livraisons e-commerce en Algérie. Réduisez les retours, protégez votre chiffre d'affaires.",
    en: 'Secure your e-commerce deliveries in Algeria. Reduce returns, protect your revenue.',
    ar: 'أمّن عمليات التوصيل الخاصة بمتجرك الإلكتروني في الجزائر. قلّل المرتجعات وحافظ على إيراداتك.',
  },
  'common.back': { fr: 'Retour', en: 'Back', ar: 'رجوع' },
  'common.continue': { fr: 'Continuer', en: 'Continue', ar: 'متابعة' },
  'common.cancel': { fr: 'Annuler', en: 'Cancel', ar: 'إلغاء' },
  'common.save': { fr: 'Enregistrer', en: 'Save', ar: 'حفظ' },
  'common.send': { fr: 'Envoyer', en: 'Send', ar: 'إرسال' },
  'common.loading': { fr: 'Chargement...', en: 'Loading…', ar: 'جارٍ التحميل…' },
  'common.required': { fr: 'Requis', en: 'Required', ar: 'مطلوب' },
  'common.optional': { fr: 'Optionnel', en: 'Optional', ar: 'اختياري' },
  'common.logout': { fr: 'Déconnexion', en: 'Log out', ar: 'تسجيل الخروج' },
  'common.copy': { fr: 'Copier', en: 'Copy', ar: 'نسخ' },
  'common.select_placeholder': { fr: '— Sélectionner —', en: '— Select —', ar: '— اختر —' },
  'common.print': { fr: 'Imprimer', en: 'Print', ar: 'طباعة' },
  'common.home': { fr: "Retour à l'accueil", en: 'Back to home', ar: 'العودة إلى الصفحة الرئيسية' },
  'common.demo_otp': {
    fr: 'Mode démo — le code OTP est 123456',
    en: 'Demo mode — the OTP code is 123456',
    ar: 'الوضع التجريبي — رمز OTP هو 123456',
  },

  // ── Languages ──
  'lang.label': { fr: 'Langue', en: 'Language', ar: 'اللغة' },

  // ── Landing ──
  'landing.role.merchant': { fr: 'Marchand', en: 'Merchant', ar: 'تاجر' },
  'landing.role.merchant.desc': {
    fr: 'Gérez vos commandes, suivez vos livraisons et analysez vos retours avec Safe Insights.',
    en: 'Manage your orders, track your deliveries, and analyse returns with Safe Insights.',
    ar: 'إدارة الطلبات، تتبع التوصيل، وتحليل المرتجعات عبر Safe Insights.',
  },
  'landing.role.customer': { fr: 'Client', en: 'Customer', ar: 'عميل' },
  'landing.role.customer.desc': {
    fr: 'Suivez votre commande, payez votre acompte Safe Pay et laissez votre avis.',
    en: 'Track your order, pay your Safe Pay deposit, and leave a review.',
    ar: 'تابع طلبك، ادفع وديعة Safe Pay، واترك تقييمك.',
  },
  'landing.cta.choose_role': {
    fr: 'Choisissez votre rôle pour commencer',
    en: 'Pick your role to get started',
    ar: 'اختر دورك للبدء',
  },

  // ── Merchant Auth ──
  'merchant.login.title': { fr: 'Connexion marchand', en: 'Merchant login', ar: 'تسجيل دخول التاجر' },
  'merchant.login.subtitle': {
    fr: 'Accédez à votre tableau de bord pour gérer vos commandes.',
    en: 'Access your dashboard to manage your orders.',
    ar: 'ادخل إلى لوحة التحكم لإدارة طلباتك.',
  },
  'merchant.login.submit': { fr: 'Se connecter', en: 'Sign in', ar: 'تسجيل الدخول' },
  'merchant.login.no_account': { fr: 'Pas encore de compte ?', en: 'No account yet?', ar: 'ليس لديك حساب بعد؟' },
  'merchant.login.create_account': { fr: 'Créer un compte', en: 'Create one', ar: 'أنشئ حساباً' },
  'merchant.login.demo_title': { fr: 'Comptes de test', en: 'Test accounts', ar: 'حسابات تجريبية' },
  'merchant.login.prefill_test': {
    fr: '🧪 Pré-remplir le compte de test',
    en: '🧪 Fill the test account',
    ar: '🧪 ملء حساب الاختبار',
  },
  'merchant.login.quick_test': {
    fr: '⚡ Connexion rapide — Compte de test',
    en: '⚡ Quick login — Test account',
    ar: '⚡ تسجيل سريع — حساب الاختبار',
  },

  'merchant.register.title': { fr: 'Créer un compte marchand', en: 'Create a merchant account', ar: 'إنشاء حساب تاجر' },
  'merchant.register.subtitle': {
    fr: 'Inscrivez votre boutique pour commencer à sécuriser vos livraisons.',
    en: 'Register your store to start securing your deliveries.',
    ar: 'سجّل متجرك لبدء تأمين عمليات التوصيل.',
  },
  'merchant.register.submit': { fr: 'Créer mon compte', en: 'Create my account', ar: 'إنشاء حسابي' },
  'merchant.register.has_account': { fr: 'Déjà un compte ?', en: 'Already have an account?', ar: 'لديك حساب بالفعل؟' },

  'field.first_name': { fr: 'Prénom', en: 'First name', ar: 'الاسم' },
  'field.last_name': { fr: 'Nom', en: 'Last name', ar: 'اللقب' },
  'field.phone': { fr: 'Téléphone', en: 'Phone', ar: 'الهاتف' },
  'field.email': { fr: 'Email', en: 'Email', ar: 'البريد الإلكتروني' },
  'field.password': { fr: 'Mot de passe', en: 'Password', ar: 'كلمة المرور' },
  'field.store_name': { fr: 'Nom de la boutique', en: 'Store name', ar: 'اسم المتجر' },
  'field.wilaya': { fr: 'Wilaya', en: 'Wilaya', ar: 'الولاية' },
  'field.municipality': { fr: 'Commune', en: 'Municipality', ar: 'البلدية' },
  'field.address': { fr: 'Adresse', en: 'Address', ar: 'العنوان' },
  'field.delivery_companies': { fr: 'Sociétés de livraison', en: 'Delivery companies', ar: 'شركات التوصيل' },
  'field.delivery_company': { fr: 'Société de livraison', en: 'Delivery company', ar: 'شركة التوصيل' },
  'field.remark': { fr: 'Remarque', en: 'Remark', ar: 'ملاحظة' },

  // ── Customer Auth ──
  'customer.login.hub_title': { fr: 'Espace client', en: 'Customer space', ar: 'فضاء العميل' },
  'customer.login.hub_subtitle': {
    fr: 'Identifiez-vous par votre numéro de téléphone — un code à 6 chiffres vous sera envoyé.',
    en: 'Identify yourself with your phone number — a 6-digit code will be sent.',
    ar: 'سجّل دخولك برقم هاتفك — سيتم إرسال رمز من 6 أرقام.',
  },
  'customer.login.signup_title': { fr: 'Créer mon compte', en: 'Create my account', ar: 'إنشاء حسابي' },
  'customer.login.login_title': { fr: 'Se connecter', en: 'Sign in', ar: 'تسجيل الدخول' },
  'customer.login.otp_subtitle': {
    fr: 'Entrez le code à 6 chiffres reçu par SMS.',
    en: 'Enter the 6-digit code received by SMS.',
    ar: 'أدخل الرمز المكوَّن من 6 أرقام المُرسل إليك.',
  },
  'customer.login.send_code': { fr: 'Recevoir le code', en: 'Send the code', ar: 'إرسال الرمز' },
  'customer.login.signup': { fr: 'Créer mon compte', en: 'Create my account', ar: 'إنشاء حسابي' },
  'customer.login.signin': { fr: 'Se connecter', en: 'Sign in', ar: 'تسجيل الدخول' },
  'customer.login.change_phone': { fr: '← Modifier le numéro', en: '← Change number', ar: '← تغيير الرقم' },
  'customer.login.first_name_hint': {
    fr: 'Requis pour les nouveaux clients',
    en: 'Required for new customers',
    ar: 'مطلوب للعملاء الجدد',
  },

  // ── Customer Home ──
  'customer.home.greeting': { fr: 'Bonjour', en: 'Hello', ar: 'مرحباً' },
  'customer.home.wallet': { fr: 'Wallet', en: 'Wallet', ar: 'المحفظة' },
  'customer.home.active_deposits': { fr: 'Acomptes actifs', en: 'Active deposits', ar: 'الودائع النشطة' },
  'customer.home.total_paid': { fr: 'Total versé', en: 'Total paid', ar: 'الإجمالي المدفوع' },
  'customer.home.orders_count': { fr: 'Commandes', en: 'Orders', ar: 'الطلبات' },
  'customer.home.track_by_code': { fr: 'Suivre par code', en: 'Track by code', ar: 'التتبع برمز' },
  'customer.home.tracking_code': { fr: 'Code de suivi', en: 'Tracking code', ar: 'رمز التتبع' },
  'customer.home.track': { fr: 'Suivre', en: 'Track', ar: 'تتبع' },
  'customer.home.my_orders': { fr: 'Mes commandes', en: 'My orders', ar: 'طلباتي' },
  'customer.home.no_orders.title': { fr: 'Aucune commande', en: 'No orders yet', ar: 'لا توجد طلبات' },
  'customer.home.no_orders.desc': {
    fr: "Vos commandes apparaîtront ici dès qu'un marchand vous enverra un lien Safe Order.",
    en: 'Your orders will appear here once a merchant sends you a Safe Order link.',
    ar: 'ستظهر طلباتك هنا بمجرد أن يرسل لك تاجر رابط Safe Order.',
  },
  'customer.home.history.weekly': { fr: 'Cette semaine', en: 'This week', ar: 'هذا الأسبوع' },
  'customer.home.history.monthly': { fr: 'Ce mois', en: 'This month', ar: 'هذا الشهر' },
  'customer.home.history.all': { fr: 'Tout', en: 'All', ar: 'الكل' },
  'customer.home.history.deposit': { fr: 'Acompte', en: 'Deposit', ar: 'وديعة' },
  'customer.home.history.remaining': { fr: 'Restant', en: 'Remaining', ar: 'المتبقّي' },

  // ── Order pipeline / status ──
  'status.confirmation': { fr: 'Confirmation', en: 'Confirmation', ar: 'التأكيد' },
  'status.preparation': { fr: 'Préparation', en: 'Preparation', ar: 'التحضير' },
  'status.dispatch': { fr: 'Expédition', en: 'Dispatch', ar: 'الإرسال' },
  'status.delivery': { fr: 'Livraison', en: 'Delivery', ar: 'التوصيل' },
  'status.delivered': { fr: 'Livré', en: 'Delivered', ar: 'مُسلَّم' },
  'status.return_processed': { fr: 'Retour', en: 'Returned', ar: 'مرتجع' },

  // ── Smart badges ──
  'badge.safe_pay': { fr: 'Safe Pay', en: 'Safe Pay', ar: 'Safe Pay' },
  'badge.new': { fr: 'Nouveau', en: 'New (call)', ar: 'جديد (اتصال)' },
  'badge.loyal': { fr: 'Fidèle', en: 'Loyal', ar: 'وفي' },
  'badge.risk': { fr: 'Risque', en: 'Risk', ar: 'خطر' },

  // ── Merchant nav ──
  'nav.dashboard': { fr: 'Tableau de bord', en: 'Dashboard', ar: 'لوحة التحكم' },
  'nav.orders': { fr: 'Commandes', en: 'Orders', ar: 'الطلبات' },
  'nav.stats': { fr: 'Statistiques', en: 'Statistics', ar: 'الإحصائيات' },
  'nav.insights': { fr: 'Safe Insights', en: 'Safe Insights', ar: 'Safe Insights' },
  'nav.create_order': { fr: 'Nouvelle commande', en: 'New order', ar: 'طلب جديد' },
  'nav.menu_main': { fr: 'Menu principal', en: 'Main menu', ar: 'القائمة الرئيسية' },
  'nav.menu_manage': { fr: 'Gestion', en: 'Manage', ar: 'الإدارة' },

  // ── Order detail / actions ──
  'order.print_label': { fr: 'Imprimer l\'étiquette PDF', en: 'Print PDF label', ar: 'طباعة ملصق PDF' },
  'order.actions': { fr: 'Actions', en: 'Actions', ar: 'الإجراءات' },
  'order.timeline': { fr: 'Suivi', en: 'Timeline', ar: 'التتبع' },
  'order.alert.d_minus_1': {
    fr: '⚠️ Date détectée dans la remarque — alerte D-1 programmée',
    en: '⚠️ Date detected in remark — D-1 alert scheduled',
    ar: '⚠️ تم اكتشاف تاريخ في الملاحظة — تم جدولة تنبيه D-1',
  },

  // ── Customer order sheet (FR-07/F08) ──
  'order.invalid_link.title': { fr: 'Lien invalide', en: 'Invalid link', ar: 'رابط غير صالح' },
  'order.invalid_link.desc': {
    fr: "Ce lien de commande n'existe pas ou a expiré.",
    en: 'This order link does not exist or has expired.',
    ar: 'هذا الرابط غير موجود أو منتهي الصلاحية.',
  },
  'order.paste.title': { fr: 'Coller votre lien Safe Order', en: 'Paste your Safe Order link', ar: 'الصق رابط Safe Order' },
  'order.paste.subtitle': {
    fr: 'Collez le lien complet reçu par votre marchand, ou seulement le code à 32 caractères.',
    en: 'Paste the full link from your merchant, or just the 32-character token.',
    ar: 'الصق الرابط الكامل الذي أرسله التاجر، أو فقط الرمز المكوّن من 32 حرفًا.',
  },
  'order.paste.placeholder': {
    fr: 'https://safeorder.dz/order/… ou collez juste le code',
    en: 'https://safeorder.dz/order/… or just paste the code',
    ar: '…/order/safeorder.dz/https أو الصق الرمز فقط',
  },
  'order.paste.cta': { fr: 'Ouvrir ma commande', en: 'Open my order', ar: 'فتح طلبي' },
  'order.paste.invalid': {
    fr: 'Lien invalide. Vérifiez que vous avez collé le bon code.',
    en: 'Invalid link. Make sure you pasted the right code.',
    ar: 'رابط غير صالح. تأكّد من نسخ الرمز الصحيح.',
  },
  'order.product.price': { fr: 'PRIX', en: 'PRICE', ar: 'السعر' },
  'order.product.deposit': { fr: 'ACOMPTE', en: 'DEPOSIT', ar: 'الوديعة' },
  'order.fill.cta_view': { fr: 'Remplir mes informations', en: 'Fill my information', ar: 'املأ معلوماتي' },
  'order.fill.title': { fr: 'Complétez votre commande', en: 'Complete your order', ar: 'أكمل طلبك' },
  'order.fill.subtitle': {
    fr: 'Remplissez vos informations de livraison pour confirmer cette commande.',
    en: 'Fill in your delivery information to confirm this order.',
    ar: 'املأ معلومات التوصيل لتأكيد هذا الطلب.',
  },
  'order.delivery.title': { fr: 'Informations de livraison', en: 'Delivery information', ar: 'معلومات التوصيل' },
  'order.delivery.subtitle': {
    fr: 'Où souhaitez-vous recevoir votre colis ?',
    en: 'Where would you like to receive your package?',
    ar: 'أين تود استلام طردك؟',
  },
  'order.delivery.home': { fr: '🏠 À domicile', en: '🏠 Home', ar: '🏠 المنزل' },
  'order.delivery.pickup': { fr: '📍 Point de retrait', en: '📍 Pickup point', ar: '📍 نقطة الاستلام' },
  'order.delivery.mode': { fr: 'Mode de livraison', en: 'Delivery mode', ar: 'وضع التوصيل' },
  'order.confirm': { fr: 'Confirmer ma commande', en: 'Confirm my order', ar: 'تأكيد طلبي' },
  'order.field.address_placeholder': {
    fr: 'Rue, quartier, n° immeuble…',
    en: 'Street, neighborhood, building number…',
    ar: 'الشارع، الحي، رقم البناية…',
  },
  'order.field.remark_placeholder': {
    fr: 'Ex: Disponible après 17h, livrez le 15/05…',
    en: 'Ex: Available after 5pm, deliver on 15/05…',
    ar: 'مثال: متاح بعد 17:00، التوصيل في 15/05…',
  },

  // ── Payment (F08) ──
  'pay.title': { fr: "Paiement de l'acompte", en: 'Deposit payment', ar: 'دفع الوديعة' },
  'pay.subtitle': {
    fr: 'Un acompte de {amount} DA est requis pour confirmer votre commande.',
    en: 'A deposit of {amount} DA is required to confirm your order.',
    ar: 'مطلوب وديعة بقيمة {amount} د.ج لتأكيد طلبك.',
  },
  'pay.method': { fr: 'Moyen de paiement', en: 'Payment method', ar: 'وسيلة الدفع' },
  'pay.cta': { fr: 'Payer {amount} DA', en: 'Pay {amount} DA', ar: 'ادفع {amount} د.ج' },
  'pay.card_number': { fr: 'Numéro de carte', en: 'Card number', ar: 'رقم البطاقة' },
  'pay.card_holder': { fr: 'Titulaire', en: 'Card holder', ar: 'حامل البطاقة' },
  'pay.expiry': { fr: 'Expiration', en: 'Expiry', ar: 'تاريخ الانتهاء' },
  'pay.cvv': { fr: 'CVV', en: 'CVV', ar: 'CVV' },
  'pay.baridimob.instruction': {
    fr: 'Envoyez {amount} DA au numéro BaridiMob de Safe Order',
    en: 'Send {amount} DA to Safe Order’s BaridiMob number',
    ar: 'أرسل {amount} د.ج إلى رقم BaridiMob الخاص بـ Safe Order',
  },
  'pay.secure': {
    fr: '🔒 Paiement sécurisé · Mode démo — tous les paiements sont simulés',
    en: '🔒 Secure payment · Demo mode — all payments are simulated',
    ar: '🔒 دفع آمن · الوضع التجريبي — جميع المدفوعات وهمية',
  },

  // ── Done / Confirmation (F07 done step) ──
  'order.done.title': { fr: 'Commande confirmée !', en: 'Order confirmed!', ar: 'تم تأكيد الطلب!' },
  'order.done.subtitle': {
    fr: 'Votre commande a bien été enregistrée. Vous serez contacté pour la livraison.',
    en: 'Your order has been registered. You will be contacted for delivery.',
    ar: 'تم تسجيل طلبك بنجاح. سيتم الاتصال بك للتوصيل.',
  },
  'order.done.tracking': { fr: 'Code de suivi', en: 'Tracking code', ar: 'رمز التتبع' },
  'order.done.total': { fr: 'TOTAL', en: 'TOTAL', ar: 'الإجمالي' },
  'order.done.track_cta': { fr: '📍 Suivre ma commande', en: '📍 Track my order', ar: '📍 تتبع طلبي' },

  // ── Merchant CreateOrder share ──
  'create.share.title': {
    fr: 'Lien client — envoyez-le via WhatsApp ou DM',
    en: 'Customer link — send it via WhatsApp or DM',
    ar: 'رابط العميل — أرسله عبر WhatsApp أو الرسائل الخاصة',
  },
  'create.share.copy': { fr: '📋 Copier le lien', en: '📋 Copy link', ar: '📋 نسخ الرابط' },
  'create.share.copied': { fr: '✓ Copié !', en: '✓ Copied!', ar: '✓ تم النسخ!' },
  'create.share.whatsapp': { fr: '💬 Partager sur WhatsApp', en: '💬 Share on WhatsApp', ar: '💬 المشاركة عبر WhatsApp' },
  'create.success': { fr: 'Commande créée !', en: 'Order created!', ar: 'تم إنشاء الطلب!' },
  'create.code': { fr: 'Code de suivi', en: 'Tracking code', ar: 'رمز التتبع' },
  'create.another': { fr: 'Créer une autre commande', en: 'Create another order', ar: 'إنشاء طلب آخر' },

  // ── Safe Standards ──
  'standards.title': { fr: 'Safe Standards', en: 'Safe Standards', ar: 'Safe Standards' },
  'standards.subtitle': {
    fr: 'Pour bénéficier de Safe Pay et protéger vos livraisons, vous devez respecter ces 3 conditions.',
    en: 'To benefit from Safe Pay and protect your deliveries you must accept these 3 conditions.',
    ar: 'للاستفادة من Safe Pay وحماية عمليات التوصيل، يجب الالتزام بالشروط الثلاثة التالية.',
  },
  'standards.photos.title': { fr: 'Photos authentiques', en: 'Authentic photos', ar: 'صور حقيقية' },
  'standards.photos.desc': {
    fr: 'Publiez uniquement des photos réelles de vos produits. Pas de photos trouvées sur internet ou retouchées de manière trompeuse.',
    en: 'Use only real photos of your products. No internet photos or misleadingly edited images.',
    ar: 'انشر فقط صوراً حقيقية لمنتجاتك. لا للصور المأخوذة من الإنترنت أو المعدّلة بشكل مضلل.',
  },
  'standards.description.title': { fr: 'Description complète', en: 'Complete description', ar: 'وصف كامل' },
  'standards.description.desc': {
    fr: 'Chaque produit doit avoir une description détaillée : taille, couleur, matériau, poids, et tout détail important pour le client.',
    en: 'Every product must include size, colour, material, weight, and any detail useful to the customer.',
    ar: 'يجب أن يحتوي كل منتج على وصف مفصّل: الحجم، اللون، المادة، الوزن، وكل تفصيل يهم العميل.',
  },
  'standards.packaging.title': { fr: 'Emballage soigné', en: 'Careful packaging', ar: 'تغليف عناية' },
  'standards.packaging.desc': {
    fr: 'Emballez vos produits avec soin pour éviter les dommages pendant le transport. Utilisez du papier bulle et des cartons adaptés.',
    en: 'Pack your products carefully to avoid transport damage. Use bubble wrap and proper boxes.',
    ar: 'غلّف منتجاتك بعناية لتفادي الأضرار أثناء النقل. استخدم غلاف الفقاعات وصناديق مناسبة.',
  },
  'standards.accept': { fr: "J'accepte les Safe Standards", en: 'I accept the Safe Standards', ar: 'أوافق على Safe Standards' },
  'standards.check_all': { fr: 'Cochez les 3 conditions', en: 'Check all 3 conditions', ar: 'حدّد الشروط الثلاثة' },
}

export function translate(locale: Locale, key: string): string {
  const entry = TRANSLATIONS[key]
  if (!entry) return key
  return entry[locale] || entry.fr || key
}
