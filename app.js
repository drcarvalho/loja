// ============================================================================
// Loja Tetê — Aplicação Principal (Vercel + Sync Automático Yupoo)
// ============================================================================

let currentLang = localStorage.getItem('store_lang') || 'pt';
let allProducts = [];
let filteredProducts = [];
let cart = [];
let currentPage = 1;
let activeCategory = 'all';
const ITEMS_PER_PAGE = 24;

// === Tabelas de Preços Base em Dólar (US$) ===
const PRODUCT_TYPE_PRICES = {
  fan: 8.00,
  player: 10.00,
  fan_long_sleeve: 11.00,
  long_sleeve: 13.00,
  retro_long_sleeve: 17.00,
  retro: 12.00,
  shorts: 8.00,
  training_kit: 22.00,
  tracksuit_full_zip: 40.00,
  tracksuit_zip: 39.00,
  kids: 10.00,
  kids_retro: 14.00,
  nba: 18.00
};

const SIZE_SURCHARGES = {
  '3XL': 2.00,
  '4XL': 2.00
};

const ADDON_PRICES = {
  personalization: 3.00,
  patch: 1.00,
  full_sponsor: 5.00
};

const BASE_SIZES = [
  'P (S)', 'M (M)', 'G (L)', 'GG (XL)', '2XL (XG)',
  '3XL', '4XL',
  'Kids (16)', 'Kids (18)', 'Kids (20)',
  'Kids (22)', 'Kids (24)', 'Kids (26)', 'Kids (28)'
];

let storeConfig = {
  phone: localStorage.getItem('store_whatsapp') || '5511999999999',
  name: localStorage.getItem('store_name') || 'Loja Tetê',
  exchangeRate: parseFloat(localStorage.getItem('store_exchange_rate')) || 5.80,
  defaultPriceUSD: parseFloat(localStorage.getItem('store_default_price_usd')) || 8.00
};

// === Elementos DOM ===
const productsGrid = document.getElementById('products-grid');
const searchInput = document.getElementById('search-input');
const clearSearchBtn = document.getElementById('clear-search-btn');
const categoryChips = document.getElementById('category-chips');
const productsCountEl = document.getElementById('products-count');
const cartItemsContainer = document.getElementById('cart-items');
const cartBadge = document.getElementById('cart-badge');
const subtotalVal = document.getElementById('subtotal-val');
const subtotalUsdVal = document.getElementById('subtotal-usd-val');
const shippingUsdVal = document.getElementById('shipping-usd-val');
const shippingInfoBadge = document.getElementById('shipping-info-badge');
const progressBarFill = document.getElementById('shipping-progress-bar');
const progressTargetText = document.getElementById('progress-target-text');
const totalVal = document.getElementById('total-val');
const totalUsdVal = document.getElementById('total-usd-val');
const cartExchangeRate = document.getElementById('cart-exchange-rate');
const headerRateDisplay = document.getElementById('header-rate-display');
const rateBadgePill = document.getElementById('rate-badge-pill');
const btnSendWhatsapp = document.getElementById('btn-send-whatsapp');
const clearCartBtn = document.getElementById('clear-cart-btn');
const toastEl = document.getElementById('toast');
const paginationContainer = document.getElementById('pagination-container');

// Drawer & Mobile
const cartFloatingBtn = document.getElementById('cart-floating-btn');
const cartSidebar = document.getElementById('cart-sidebar');
const cartBackdrop = document.getElementById('cart-backdrop');
const closeCartDrawerBtn = document.getElementById('close-cart-drawer');
const mobileBadge = document.getElementById('mobile-badge');
const mobileTotalVal = document.getElementById('mobile-total-val');
const mobileCartScrollBtn = document.getElementById('mobile-cart-scroll-btn');
const btnBackToTop = document.getElementById('btn-back-to-top');

// Modal Settings
const modalSettings = document.getElementById('modal-settings');
const openSettingsBtn = document.getElementById('open-settings-btn');
const closeSettingsModal = document.getElementById('close-settings-modal');
const cancelSettingsModal = document.getElementById('cancel-settings-modal');
const formSettings = document.getElementById('form-settings');
const storePhoneInput = document.getElementById('store-phone');
const storeNameInput = document.getElementById('store-name-input');
const storeExchangeRateInput = document.getElementById('store-exchange-rate-input');
const storeDefaultPriceInput = document.getElementById('store-default-price-input');

let lastModalTrigger = null;

// === Cálculos e Helpers ===
function calculateShipping(totalPieces) {
  if (totalPieces <= 0) return 0;
  if (totalPieces === 1) return 5.00;
  if (totalPieces === 2) return 4.00;
  if (totalPieces === 3) return 3.00;
  if (totalPieces === 4) return 2.00;
  return 0;
}

function getBaseTypePriceUSD(typeKey) {
  if (typeKey === 'fan') {
    return storeConfig.defaultPriceUSD || PRODUCT_TYPE_PRICES.fan;
  }
  return PRODUCT_TYPE_PRICES[typeKey] || storeConfig.defaultPriceUSD || 8.00;
}

function t(key, ...args) {
  const dict = i18n[currentLang] || i18n.pt;
  let text = dict[key] || i18n.pt[key] || key;
  args.forEach(arg => { text = text.replace('%s', arg); });
  return text;
}

function getTypeLabel(typeKey) {
  const dict = i18n[currentLang] || i18n.pt;
  return (dict.types && dict.types[typeKey]) ? dict.types[typeKey] : typeKey;
}

function getSizeLabel(sizeKey) {
  const dict = i18n[currentLang] || i18n.pt;
  return (dict.sizes && dict.sizes[sizeKey]) ? dict.sizes[sizeKey] : sizeKey;
}

function safeExternalUrl(url) {
  if (!url) return '#';
  try {
    const parsed = new URL(url, window.location.origin);
    if (parsed.protocol === 'https:' || parsed.protocol === 'http:') {
      return parsed.toString();
    }
  } catch {
    // ignore invalid URL
  }
  return '#';
}

function escapeHtml(text) {
  if (!text) return '';
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// === Inicialização ===
document.addEventListener('DOMContentLoaded', () => {
  const yearEl = document.getElementById('current-year');
  if (yearEl) yearEl.textContent = new Date().getFullYear();
  applyLanguage(currentLang);
  loadStoreConfig();
  loadCartFromStorage();
  fetchProducts();
  setupEventListeners();
});

// === Troca de Idioma ===
function applyLanguage(lang) {
  if (!i18n[lang]) lang = 'pt';
  currentLang = lang;
  localStorage.setItem('store_lang', currentLang);
  document.documentElement.lang = currentLang === 'pt' ? 'pt-BR' : (currentLang === 'zh' ? 'zh-CN' : 'en');

  document.querySelectorAll('.lang-btn').forEach(btn => {
    btn.classList.toggle('active', btn.getAttribute('data-lang') === currentLang);
  });

  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.getAttribute('data-i18n');
    el.textContent = t(key);
  });

  document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
    const key = el.getAttribute('data-i18n-placeholder');
    el.setAttribute('placeholder', t(key));
  });

  const titleEl = document.querySelector('title[data-i18n]');
  if (titleEl) titleEl.textContent = t('siteTitle');
  document.title = t('siteTitle');

  if (allProducts.length > 0) {
    renderProducts();
    updateProductsCount();
  }
  renderCart();
}

// === Configuração da Loja ===
function loadStoreConfig() {
  if (storePhoneInput) storePhoneInput.value = storeConfig.phone;
  if (storeNameInput) storeNameInput.value = storeConfig.name;
  if (storeExchangeRateInput) storeExchangeRateInput.value = storeConfig.exchangeRate.toFixed(2);
  if (storeDefaultPriceInput) storeDefaultPriceInput.value = storeConfig.defaultPriceUSD.toFixed(2);
  updateHeaderRate();
}

function updateHeaderRate() {
  if (headerRateDisplay) {
    headerRateDisplay.textContent = storeConfig.exchangeRate.toFixed(2).replace('.', ',');
  }
  if (cartExchangeRate) {
    cartExchangeRate.textContent = `1 USD = R$ ${storeConfig.exchangeRate.toFixed(2).replace('.', ',')}`;
  }
}

function saveStoreConfig(e) {
  e.preventDefault();
  let cleanPhone = storePhoneInput.value.replace(/\D/g, '');
  if (!cleanPhone.startsWith('55') && cleanPhone.length <= 11) {
    cleanPhone = '55' + cleanPhone;
  }

  storeConfig.phone = cleanPhone || '5511999999999';
  storeConfig.name = storeNameInput.value.trim() || 'Loja Tetê';
  storeConfig.exchangeRate = parseFloat(storeExchangeRateInput.value) || 5.80;
  storeConfig.defaultPriceUSD = parseFloat(storeDefaultPriceInput.value) || 8.00;

  localStorage.setItem('store_whatsapp', storeConfig.phone);
  localStorage.setItem('store_name', storeConfig.name);
  localStorage.setItem('store_exchange_rate', storeConfig.exchangeRate);
  localStorage.setItem('store_default_price_usd', storeConfig.defaultPriceUSD);

  updateHeaderRate();
  closeModal(modalSettings);
  showToast(`Cotação atualizada: 1 USD = R$ ${storeConfig.exchangeRate.toFixed(2).replace('.', ',')}`);
  renderProducts();
  renderCart();
}

// === Buscar Produtos (products.json + Sync Automático via /api/yupoo) ===
async function fetchYupooProducts() {
  try {
    const response = await fetch('/api/yupoo');
    if (!response.ok) return [];
    const data = await response.json();
    return Array.isArray(data) ? data : [];
  } catch (err) {
    console.warn('Yupoo sync indisponível:', err);
    return [];
  }
}

function getProductDedupKey(prod) {
  const url = String(prod?.yupoo_url || '');
  const albumMatch = url.match(/\/albums\/(\d+)/);
  if (albumMatch) return `album:${albumMatch[1]}`;
  if (url) return `url:${url.split('?')[0].toLowerCase()}`;
  return `model:${String(prod?.model || prod?.title || '').trim().toLowerCase()}`;
}

function mergeCatalogProducts(baseList, liveList) {
  if (!Array.isArray(liveList) || liveList.length === 0) return baseList;
  const seenKeys = new Set(baseList.map(getProductDedupKey));
  const newOnes = liveList.filter(p => {
    const key = getProductDedupKey(p);
    if (!key || seenKeys.has(key)) return false;
    seenKeys.add(key);
    return true;
  });
  return newOnes.length > 0 ? [...newOnes, ...baseList] : baseList;
}

async function fetchProducts() {
  let loadedFromJson = false;

  // 1) Tenta carregar catálogo base (products.json)
  try {
    const localRes = await fetch('/products.json');
    if (localRes.ok) {
      const data = await localRes.json();
      if (Array.isArray(data) && data.length > 0) {
        allProducts = data;
        loadedFromJson = true;
        applyFilters();
        setupCatalogStats();
      }
    }
  } catch (_) {
    // continua para fallback Yupoo
  }

  // 2) Sincroniza automaticamente com wanfing.x.yupoo.com/categories/3852491 via /api/yupoo
  const liveItems = await fetchYupooProducts();
  if (liveItems.length > 0) {
    if (!loadedFromJson) {
      allProducts = liveItems;
      applyFilters();
      setupCatalogStats();
      return;
    }
    const merged = mergeCatalogProducts(allProducts, liveItems);
    if (merged !== allProducts) {
      allProducts = merged;
      applyFilters();
      setupCatalogStats();
    }
    return;
  }

  if (loadedFromJson) return;

  // 3) Caso nenhuma fonte responda, exibe mensagem amigável
  if (productsCountEl) productsCountEl.textContent = `0 ${t('itemsFound')}`;
  if (productsGrid) {
    productsGrid.innerHTML = `
      <div class="error-msg">
        <i class="fa-solid fa-triangle-exclamation" style="font-size: 32px;"></i>
        <h3>${t('catalogError')}</h3>
      </div>
    `;
  }
}

function setupCatalogStats() {
  const statEl = document.getElementById('catalog-total-stat');
  if (statEl) {
    statEl.textContent = allProducts.length.toLocaleString('pt-BR');
  }
}

// === Filtros (Busca + Categorias) ===
function matchesCategory(prod, cat) {
  if (cat === 'all') return true;
  const type = prod.item_type || 'fan';
  if (cat === 'long_sleeve') {
    return type === 'long_sleeve' || type === 'fan_long_sleeve' || type === 'retro_long_sleeve';
  }
  if (cat === 'training') {
    return type === 'training_kit' || type === 'tracksuit_full_zip' || type === 'tracksuit_zip';
  }
  if (cat === 'kids') {
    return type === 'kids' || type === 'kids_retro';
  }
  return type === cat;
}

function applyFilters() {
  const query = searchInput ? searchInput.value.toLowerCase().trim() : '';
  currentPage = 1;

  filteredProducts = allProducts.filter(p => {
    if (!matchesCategory(p, activeCategory)) return false;
    if (!query) return true;
    return (
      (p.model && p.model.toLowerCase().includes(query)) ||
      (p.title && p.title.toLowerCase().includes(query))
    );
  });

  renderProducts();
  updateProductsCount();
}

function updateProductsCount() {
  if (productsCountEl) {
    productsCountEl.textContent = `${filteredProducts.length.toLocaleString('pt-BR')} ${t('itemsFound')}`;
  }
}

// === Renderizar Produtos ===
function renderProducts() {
  productsGrid.innerHTML = '';
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const pageItems = filteredProducts.slice(startIndex, startIndex + ITEMS_PER_PAGE);

  if (pageItems.length === 0) {
    productsGrid.innerHTML = `
      <div class="catalog-loading">
        <i class="fa-solid fa-magnifying-glass"></i>
        <h3>${t('noProductsFound')}</h3>
        <p>${t('tryOtherSearch')}</p>
      </div>
    `;
    renderPagination(0);
    return;
  }

  const fragment = document.createDocumentFragment();
  const typeKeys = Object.keys(PRODUCT_TYPE_PRICES);

  pageItems.forEach(prod => {
    const prodId = String(prod.id);
    const card = document.createElement('div');
    card.className = 'product-card';
    card.setAttribute('data-id', prodId);

    const defaultType = prod.item_type || 'fan';
    const baseTypePriceUSD = getBaseTypePriceUSD(defaultType);
    const baseTypePriceBRL = baseTypePriceUSD * storeConfig.exchangeRate;

    const imgSrc = prod.image
      ? `/proxy-img?url=${encodeURIComponent(prod.image)}`
      : 'https://placehold.co/400x400?text=Camisa+Futebol';

    const typeOptionsHtml = typeKeys.map(k =>
      `<option value="${k}" ${k === defaultType ? 'selected' : ''}>${escapeHtml(getTypeLabel(k))}</option>`
    ).join('');

    const sizeOptionsHtml = BASE_SIZES.map(s =>
      `<option value="${escapeHtml(s)}">${escapeHtml(getSizeLabel(s))}</option>`
    ).join('');

    const safeYupooHref = escapeHtml(safeExternalUrl(prod.yupoo_url));
    const safeModel = escapeHtml(prod.model || prod.title || 'Camisa');

    card.innerHTML = `
      <div class="product-image-container">
        <img
          src="${escapeHtml(imgSrc)}"
          alt="${safeModel}"
          class="product-img"
          loading="lazy"
          decoding="async"
          referrerpolicy="no-referrer"
          onerror="this.onerror=null; this.src='https://placehold.co/400x400?text=Sem+Foto';"
        >
        <a href="${safeYupooHref}" target="_blank" rel="noopener noreferrer" class="product-badge-source" title="${escapeHtml(t('seeYupoo'))}">
          <i class="fa-solid fa-arrow-up-right-from-square" aria-hidden="true"></i> ${escapeHtml(t('seeYupoo'))}
        </a>
      </div>

      <div class="product-body">
        <h3 class="product-title" title="${safeModel}">${safeModel}</h3>

        <div class="product-price-container">
          <div class="price-usd-main">
            <span class="currency-symbol">$</span>
            <span class="amount-usd" id="card-price-usd-${escapeHtml(prodId)}">${baseTypePriceUSD.toFixed(2)}</span>
            <span class="currency-tag">USD</span>
            <span class="surcharge-notice" id="surcharge-notice-${escapeHtml(prodId)}" style="display:none;"></span>
          </div>
          <div class="price-brl-converted">
            <span id="card-price-brl-${escapeHtml(prodId)}">≈ R$ ${baseTypePriceBRL.toFixed(2).replace('.', ',')}</span>
          </div>
        </div>

        <div class="product-config">
          <div class="config-row">
            <span class="config-label"><i class="fa-solid fa-tags" aria-hidden="true"></i> ${escapeHtml(t('versionType'))}</span>
            <select class="type-select" id="type-select-${escapeHtml(prodId)}" data-id="${escapeHtml(prodId)}" aria-label="${escapeHtml(t('versionType'))}">
              ${typeOptionsHtml}
            </select>
          </div>

          <div class="config-row">
            <span class="config-label"><i class="fa-solid fa-shirt" aria-hidden="true"></i> ${escapeHtml(t('sizeVersion'))}</span>
            <select class="size-select" id="size-select-${escapeHtml(prodId)}" data-id="${escapeHtml(prodId)}" aria-label="${escapeHtml(t('sizeVersion'))}">
              ${sizeOptionsHtml}
            </select>
          </div>

          <div class="card-addons-box">
            <button type="button" class="card-addons-header" data-id="${escapeHtml(prodId)}" aria-expanded="false">
              <span><i class="fa-solid fa-wand-magic-sparkles" aria-hidden="true"></i> ${escapeHtml(t('customizationTitle'))}</span>
              <i class="fa-solid fa-chevron-down addon-toggle-icon" id="addon-icon-${escapeHtml(prodId)}" aria-hidden="true"></i>
            </button>
            <div class="card-addons-body" id="addons-body-${escapeHtml(prodId)}" style="display: none;">
              <label class="addon-checkbox-label">
                <input type="checkbox" id="addon-perso-${escapeHtml(prodId)}" data-id="${escapeHtml(prodId)}" class="addon-checkbox">
                <span>${escapeHtml(t('optPersonalization'))}</span>
              </label>
              <div class="addon-inputs-row" id="perso-inputs-${escapeHtml(prodId)}" style="display: none;">
                <input type="text" id="custom-name-${escapeHtml(prodId)}" placeholder="${escapeHtml(t('customNamePlaceholder'))}" maxlength="15">
                <input type="text" id="custom-number-${escapeHtml(prodId)}" placeholder="${escapeHtml(t('customNumberPlaceholder'))}" maxlength="3">
              </div>

              <label class="addon-checkbox-label">
                <input type="checkbox" id="addon-patch-${escapeHtml(prodId)}" data-id="${escapeHtml(prodId)}" class="addon-checkbox">
                <span>${escapeHtml(t('optPatch'))}</span>
              </label>
              <div class="addon-inputs-row" id="patch-inputs-${escapeHtml(prodId)}" style="display: none;">
                <input type="text" id="custom-patch-${escapeHtml(prodId)}" placeholder="${escapeHtml(t('customPatchPlaceholder'))}" maxlength="30" style="width:100%;">
              </div>

              <label class="addon-checkbox-label">
                <input type="checkbox" id="addon-sponsor-${escapeHtml(prodId)}" data-id="${escapeHtml(prodId)}" class="addon-checkbox">
                <span>${escapeHtml(t('optFullSponsor'))}</span>
              </label>
            </div>
          </div>

          <div class="config-row">
            <span class="config-label"><i class="fa-solid fa-calculator" aria-hidden="true"></i> ${escapeHtml(t('qty'))}</span>
            <div class="qty-control">
              <button type="button" class="qty-btn btn-minus" data-id="${escapeHtml(prodId)}" aria-label="Diminuir quantidade">-</button>
              <input type="text" class="qty-val" id="qty-input-${escapeHtml(prodId)}" value="1" readonly aria-label="Quantidade">
              <button type="button" class="qty-btn btn-plus" data-id="${escapeHtml(prodId)}" aria-label="Aumentar quantidade">+</button>
            </div>
          </div>

          <button type="button" class="btn-add-to-cart add-to-cart" data-id="${escapeHtml(prodId)}">
            <i class="fa-solid fa-cart-plus" aria-hidden="true"></i> ${escapeHtml(t('addToCart'))}
          </button>
        </div>
      </div>
    `;

    fragment.appendChild(card);
  });

  productsGrid.appendChild(fragment);
  renderPagination(filteredProducts.length);
}

function calculateCardPrice(productId) {
  const typeSelect = document.getElementById(`type-select-${productId}`);
  const sizeSelect = document.getElementById(`size-select-${productId}`);
  const chkPerso = document.getElementById(`addon-perso-${productId}`);
  const chkPatch = document.getElementById(`addon-patch-${productId}`);
  const chkSponsor = document.getElementById(`addon-sponsor-${productId}`);

  const typeKey = typeSelect ? typeSelect.value : 'fan';
  const sizeVal = sizeSelect ? sizeSelect.value : 'P (S)';

  let priceUSD = getBaseTypePriceUSD(typeKey);
  const sizeSurcharge = SIZE_SURCHARGES[sizeVal] || 0;
  priceUSD += sizeSurcharge;

  let addonsSum = 0;
  if (chkPerso && chkPerso.checked) addonsSum += ADDON_PRICES.personalization;
  if (chkPatch && chkPatch.checked) addonsSum += ADDON_PRICES.patch;
  if (chkSponsor && chkSponsor.checked) addonsSum += ADDON_PRICES.full_sponsor;
  priceUSD += addonsSum;

  const priceBRL = priceUSD * storeConfig.exchangeRate;

  const usdDisplay = document.getElementById(`card-price-usd-${productId}`);
  const brlDisplay = document.getElementById(`card-price-brl-${productId}`);
  const noticeDisplay = document.getElementById(`surcharge-notice-${productId}`);

  if (usdDisplay) usdDisplay.textContent = priceUSD.toFixed(2);
  if (brlDisplay) brlDisplay.textContent = `≈ R$ ${priceBRL.toFixed(2).replace('.', ',')}`;

  if (noticeDisplay) {
    const extraTotal = sizeSurcharge + addonsSum;
    if (extraTotal > 0) {
      noticeDisplay.textContent = `(+$${extraTotal.toFixed(0)})`;
      noticeDisplay.style.display = 'inline-block';
    } else {
      noticeDisplay.style.display = 'none';
    }
  }

  return { priceUSD, priceBRL, sizeSurcharge, addonsSum };
}

// === Paginação ===
function renderPagination(totalItems) {
  paginationContainer.innerHTML = '';
  const totalPages = Math.ceil(totalItems / ITEMS_PER_PAGE);
  if (totalPages <= 1) return;

  const prevBtn = document.createElement('button');
  prevBtn.type = 'button';
  prevBtn.className = 'page-btn';
  prevBtn.innerHTML = '<i class="fa-solid fa-chevron-left" aria-hidden="true"></i>';
  prevBtn.disabled = currentPage === 1;
  prevBtn.setAttribute('aria-label', 'Página anterior');
  prevBtn.onclick = () => goToPage(currentPage - 1);
  paginationContainer.appendChild(prevBtn);

  const startPage = Math.max(1, currentPage - 2);
  const endPage = Math.min(totalPages, currentPage + 2);

  if (startPage > 1) {
    const firstBtn = document.createElement('button');
    firstBtn.type = 'button';
    firstBtn.className = 'page-btn';
    firstBtn.textContent = '1';
    firstBtn.onclick = () => goToPage(1);
    paginationContainer.appendChild(firstBtn);
    if (startPage > 2) {
      const dots = document.createElement('span');
      dots.className = 'page-btn';
      dots.textContent = '...';
      dots.style.border = 'none';
      paginationContainer.appendChild(dots);
    }
  }

  for (let i = startPage; i <= endPage; i++) {
    const pageBtn = document.createElement('button');
    pageBtn.type = 'button';
    pageBtn.className = `page-btn ${i === currentPage ? 'active' : ''}`;
    pageBtn.textContent = i;
    pageBtn.onclick = () => goToPage(i);
    paginationContainer.appendChild(pageBtn);
  }

  if (endPage < totalPages) {
    if (endPage < totalPages - 1) {
      const dots = document.createElement('span');
      dots.className = 'page-btn';
      dots.textContent = '...';
      dots.style.border = 'none';
      paginationContainer.appendChild(dots);
    }
    const lastBtn = document.createElement('button');
    lastBtn.type = 'button';
    lastBtn.className = 'page-btn';
    lastBtn.textContent = totalPages;
    lastBtn.onclick = () => goToPage(totalPages);
    paginationContainer.appendChild(lastBtn);
  }

  const nextBtn = document.createElement('button');
  nextBtn.type = 'button';
  nextBtn.className = 'page-btn';
  nextBtn.innerHTML = '<i class="fa-solid fa-chevron-right" aria-hidden="true"></i>';
  nextBtn.disabled = currentPage === totalPages;
  nextBtn.setAttribute('aria-label', 'Próxima página');
  nextBtn.onclick = () => goToPage(currentPage + 1);
  paginationContainer.appendChild(nextBtn);
}

function goToPage(page) {
  currentPage = page;
  renderProducts();
  window.scrollTo({ top: 180, behavior: 'smooth' });
}

// === Carrinho ===
function addToCart(productId) {
  const product = allProducts.find(p => String(p.id) === String(productId));
  if (!product) return;

  const typeSelect = document.getElementById(`type-select-${productId}`);
  const sizeSelect = document.getElementById(`size-select-${productId}`);
  const qtyInput = document.getElementById(`qty-input-${productId}`);
  const chkPerso = document.getElementById(`addon-perso-${productId}`);
  const chkPatch = document.getElementById(`addon-patch-${productId}`);
  const chkSponsor = document.getElementById(`addon-sponsor-${productId}`);

  const typeKey = typeSelect ? typeSelect.value : (product.item_type || 'fan');
  const selectedSize = sizeSelect ? sizeSelect.value : 'P (S)';
  const quantity = parseInt(qtyInput ? qtyInput.value : 1, 10) || 1;

  const hasPerso = Boolean(chkPerso && chkPerso.checked);
  const hasPatch = Boolean(chkPatch && chkPatch.checked);
  const hasSponsor = Boolean(chkSponsor && chkSponsor.checked);

  const customName = hasPerso ? (document.getElementById(`custom-name-${productId}`)?.value.trim() || '') : '';
  const customNumber = hasPerso ? (document.getElementById(`custom-number-${productId}`)?.value.trim() || '') : '';
  const customPatch = hasPatch ? (document.getElementById(`custom-patch-${productId}`)?.value.trim() || 'Padrão') : '';

  const { priceUSD, priceBRL, sizeSurcharge } = calculateCardPrice(productId);
  const customKey = `${typeKey}|${selectedSize}|${hasPerso ? `${customName}:${customNumber}` : ''}|${hasPatch ? customPatch : ''}|${hasSponsor}`;

  const existingIndex = cart.findIndex(item =>
    String(item.id) === String(productId) && item.customKey === customKey
  );

  if (existingIndex > -1) {
    cart[existingIndex].quantity += quantity;
  } else {
    cart.push({
      id: product.id,
      model: product.model || product.title,
      typeKey,
      typeLabel: getTypeLabel(typeKey),
      size: selectedSize,
      sizeLabel: getSizeLabel(selectedSize),
      sizeSurcharge,
      hasPerso,
      customName,
      customNumber,
      hasPatch,
      customPatch,
      hasSponsor,
      price_usd: priceUSD,
      price_brl: priceBRL,
      quantity,
      image: product.image,
      yupoo_url: product.yupoo_url,
      customKey
    });
  }

  saveCartToStorage();
  renderCart();

  const addBtn = document.querySelector(`.btn-add-to-cart[data-id="${productId}"]`);
  if (addBtn) {
    addBtn.classList.add('added');
    addBtn.innerHTML = `<i class="fa-solid fa-check" aria-hidden="true"></i> ${escapeHtml(t('added'))}`;
    setTimeout(() => {
      addBtn.classList.remove('added');
      addBtn.innerHTML = `<i class="fa-solid fa-cart-plus" aria-hidden="true"></i> ${escapeHtml(t('addToCart'))}`;
    }, 1200);
  }

  showToast(`"${product.model} (${selectedSize})" ${t('added')}`);
}

function updateShippingProgressUI(totalPieces) {
  const pct = Math.min(100, Math.round((totalPieces / 5) * 100));
  if (progressBarFill) progressBarFill.style.width = `${pct}%`;
  if (progressTargetText) {
    if (totalPieces >= 5) {
      progressTargetText.textContent = t('shippingFreeDone');
    } else {
      progressTargetText.textContent = t('shippingRemaining', String(5 - totalPieces));
    }
  }
}

function renderCart() {
  updateHeaderRate();

  if (cart.length === 0) {
    cartItemsContainer.innerHTML = `
      <div class="empty-cart-state">
        <i class="fa-solid fa-basket-shopping" aria-hidden="true"></i>
        <p>${escapeHtml(t('emptyCartTitle'))}</p>
        <span>${escapeHtml(t('emptyCartDesc'))}</span>
      </div>
    `;
    cartBadge.textContent = '0';
    if (mobileBadge) mobileBadge.textContent = '0';
    if (subtotalUsdVal) subtotalUsdVal.textContent = '$ 0.00';
    subtotalVal.textContent = 'R$ 0,00';
    if (shippingUsdVal) shippingUsdVal.textContent = '$ 0.00';
    if (shippingInfoBadge) {
      shippingInfoBadge.innerHTML = `<i class="fa-solid fa-truck-fast" aria-hidden="true"></i> <span id="shipping-info-text">${escapeHtml(t('shippingRulesInfo'))}</span>`;
      shippingInfoBadge.classList.remove('free');
    }
    if (totalUsdVal) totalUsdVal.textContent = '$ 0.00 USD';
    totalVal.textContent = 'R$ 0,00';
    if (mobileTotalVal) mobileTotalVal.textContent = 'R$ 0,00';
    updateShippingProgressUI(0);
    btnSendWhatsapp.disabled = true;
    return;
  }

  btnSendWhatsapp.disabled = false;
  let totalPieces = 0;
  let itemsTotalUSD = 0;
  const fragment = document.createDocumentFragment();

  cart.forEach((item, index) => {
    totalPieces += item.quantity;
    const itemTotalUSD = item.price_usd * item.quantity;
    const itemTotalBRL = itemTotalUSD * storeConfig.exchangeRate;
    itemsTotalUSD += itemTotalUSD;

    const row = document.createElement('div');
    row.className = 'cart-item-row';
    const imgSrc = item.image
      ? `/proxy-img?url=${encodeURIComponent(item.image)}`
      : 'https://placehold.co/100x100?text=Camisa';

    let badgesHtml = '';
    if (item.hasPerso) {
      badgesHtml += `<span class="cart-addon-pill"><i class="fa-solid fa-font" aria-hidden="true"></i> ${escapeHtml(item.customName || 'Sem Nome')} #${escapeHtml(item.customNumber || '0')} (+3$)</span>`;
    }
    if (item.hasPatch) {
      badgesHtml += `<span class="cart-addon-pill"><i class="fa-solid fa-shield" aria-hidden="true"></i> Patch: ${escapeHtml(item.customPatch || 'Sim')} (+1$)</span>`;
    }
    if (item.hasSponsor) {
      badgesHtml += `<span class="cart-addon-pill"><i class="fa-solid fa-star" aria-hidden="true"></i> Patrocínio (+5$)</span>`;
    }
    if (item.sizeSurcharge > 0) {
      badgesHtml += `<span class="cart-surcharge-tag">${escapeHtml(t('tamSpecialTag', item.sizeSurcharge.toFixed(0)))}</span>`;
    }

    row.innerHTML = `
      <img src="${escapeHtml(imgSrc)}" alt="${escapeHtml(item.model)}" class="cart-item-thumb" referrerpolicy="no-referrer"
           onerror="this.onerror=null; this.src='https://placehold.co/100x100?text=Camisa';">
      <div class="cart-item-details">
        <div class="cart-item-model" title="${escapeHtml(item.model)}">${escapeHtml(item.model)}</div>
        <div class="cart-item-meta">
          <span class="cart-item-tag"><strong>${escapeHtml(item.typeLabel || 'Fan')}</strong></span>
          <span class="cart-item-tag">${escapeHtml(t('waSize'))} <strong>${escapeHtml(item.sizeLabel || item.size)}</strong></span>
          <span class="cart-item-tag">${escapeHtml(t('waQty'))} <strong>${item.quantity}</strong></span>
        </div>
        ${badgesHtml ? `<div class="cart-badges-wrapper">${badgesHtml}</div>` : ''}
        <div class="cart-item-price">
          <strong>$ ${itemTotalUSD.toFixed(2)} USD</strong>
          <span class="cart-item-brl-sub">(≈ R$ ${itemTotalBRL.toFixed(2).replace('.', ',')})</span>
        </div>
      </div>
      <div class="cart-item-actions">
        <button type="button" class="btn-remove-item" data-index="${index}" title="Remover item" aria-label="Remover ${escapeHtml(item.model)}">
          <i class="fa-solid fa-trash-can" aria-hidden="true"></i>
        </button>
      </div>
    `;
    fragment.appendChild(row);
  });

  cartItemsContainer.innerHTML = '';
  cartItemsContainer.appendChild(fragment);

  const shippingUSD = calculateShipping(totalPieces);
  const shippingBRL = shippingUSD * storeConfig.exchangeRate;
  const grandTotalUSD = itemsTotalUSD + shippingUSD;
  const grandTotalBRL = grandTotalUSD * storeConfig.exchangeRate;
  const grandTotalBRLText = `R$ ${grandTotalBRL.toFixed(2).replace('.', ',')}`;

  cartBadge.textContent = String(totalPieces);
  if (mobileBadge) mobileBadge.textContent = String(totalPieces);
  if (subtotalUsdVal) subtotalUsdVal.textContent = `$ ${itemsTotalUSD.toFixed(2)}`;
  subtotalVal.textContent = `R$ ${(itemsTotalUSD * storeConfig.exchangeRate).toFixed(2).replace('.', ',')}`;

  if (shippingUsdVal) {
    if (shippingUSD === 0) {
      shippingUsdVal.innerHTML = `<strong style="color: #16a34a;">$ 0.00 (${escapeHtml(t('shippingFree'))})</strong>`;
    } else {
      shippingUsdVal.textContent = `$ ${shippingUSD.toFixed(2)} USD (≈ R$ ${shippingBRL.toFixed(2).replace('.', ',')})`;
    }
  }

  if (shippingInfoBadge) {
    if (totalPieces >= 5) {
      shippingInfoBadge.innerHTML = `<i class="fa-solid fa-truck-fast" aria-hidden="true"></i> <strong style="color: #16a34a;">${escapeHtml(t('shippingFree'))}</strong>`;
      shippingInfoBadge.classList.add('free');
    } else {
      const remaining = 5 - totalPieces;
      shippingInfoBadge.innerHTML = `<i class="fa-solid fa-truck-fast" aria-hidden="true"></i> <span>${escapeHtml(t('shippingPiecesProgress', String(totalPieces), String(remaining)))}</span>`;
      shippingInfoBadge.classList.remove('free');
    }
  }

  if (totalUsdVal) totalUsdVal.textContent = `$ ${grandTotalUSD.toFixed(2)} USD`;
  totalVal.textContent = grandTotalBRLText;
  if (mobileTotalVal) mobileTotalVal.textContent = grandTotalBRLText;
  updateShippingProgressUI(totalPieces);
}

function removeFromCart(index) {
  if (index >= 0 && index < cart.length) {
    const removed = cart.splice(index, 1)[0];
    saveCartToStorage();
    renderCart();
    showToast(`"${removed.model}" ${t('itemRemoved')}`);
  }
}

function clearCart() {
  if (cart.length === 0) return;
  if (confirm(t('confirmClearCart'))) {
    cart = [];
    saveCartToStorage();
    renderCart();
    showToast(t('cartCleared'));
  }
}

function saveCartToStorage() {
  localStorage.setItem('loja_tete_cart', JSON.stringify(cart));
}

function loadCartFromStorage() {
  try {
    const saved = localStorage.getItem('loja_tete_cart');
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed)) cart = parsed;
      renderCart();
    }
  } catch (e) {
    console.error('Falha ao restaurar carrinho:', e);
  }
}

// === Checkout WhatsApp ===
function sendOrderToWhatsApp() {
  if (cart.length === 0) {
    alert(t('alertEmptyCart'));
    return;
  }

  const customerName = document.getElementById('customer-name').value.trim();
  const customerAddress = document.getElementById('customer-address').value.trim();
  const orderNotes = document.getElementById('order-notes').value.trim();

  if (!customerName) {
    alert(t('alertNameRequired'));
    document.getElementById('customer-name').focus();
    return;
  }

  let totalPieces = 0;
  let itemsTotalUSD = 0;
  let itemsText = '';

  cart.forEach((item, idx) => {
    totalPieces += item.quantity;
    const itemTotalUSD = item.price_usd * item.quantity;
    const itemTotalBRL = itemTotalUSD * storeConfig.exchangeRate;
    itemsTotalUSD += itemTotalUSD;

    itemsText += `${idx + 1}️⃣ *${item.model}*\n`;
    itemsText += `   👕 ${t('waType')} *${item.typeLabel}*\n`;
    itemsText += `   📐 ${t('waSize')} *${item.sizeLabel}*`;
    if (item.sizeSurcharge > 0) itemsText += ` _(+ $${item.sizeSurcharge.toFixed(0)})_`;
    itemsText += `\n`;

    if (item.hasPerso || item.hasPatch || item.hasSponsor) {
      itemsText += `   ✨ ${t('waCustomizations')}\n`;
      if (item.hasPerso) itemsText += `      • Nome: *${item.customName || '-'}* | Nº: *${item.customNumber || '-'}* (+3$)\n`;
      if (item.hasPatch) itemsText += `      • Patch: *${item.customPatch || 'Padrão'}* (+1$)\n`;
      if (item.hasSponsor) itemsText += `      • Patrocinador Completo (+5$)\n`;
    }

    itemsText += `   🔢 ${t('waQty')} *${item.quantity}* un.\n`;
    itemsText += `   💲 ${t('waUnitPrice')} *$ ${item.price_usd.toFixed(2)} USD* (≈ R$ ${(item.price_usd * storeConfig.exchangeRate).toFixed(2).replace('.', ',')})\n`;
    itemsText += `   📊 ${t('waSubtotal')} $ ${itemTotalUSD.toFixed(2)} USD (R$ ${itemTotalBRL.toFixed(2).replace('.', ',')})\n`;
    if (item.yupoo_url) itemsText += `   🔗 Link: ${item.yupoo_url}\n`;
    itemsText += `\n`;
  });

  const shippingUSD = calculateShipping(totalPieces);
  const shippingBRL = shippingUSD * storeConfig.exchangeRate;
  const grandTotalUSD = itemsTotalUSD + shippingUSD;
  const grandTotalBRL = grandTotalUSD * storeConfig.exchangeRate;

  const now = new Date();
  const locale = currentLang === 'zh' ? 'zh-CN' : (currentLang === 'en' ? 'en-US' : 'pt-BR');
  const dateStr = now.toLocaleDateString(locale) + ' - ' + now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  const message =
`🛍️ *${t('waTitle')} - ${storeConfig.name.toUpperCase()}*
📅 Data: ${dateStr}

👤 *${t('waCustomerData')}*
• ${t('waName')} *${customerName}*
• ${t('waDelivery')} ${customerAddress || 'A combinar / Retirada'}
${orderNotes ? `• ${t('waNotes')} ${orderNotes}\n` : ''}━━━━━━━━━━━━━━━━━━━
💱 *${t('waExchangeRate')}* 1 USD = R$ ${storeConfig.exchangeRate.toFixed(2).replace('.', ',')}
━━━━━━━━━━━━━━━━━━━
📦 *${t('waItems')}*

${itemsText}━━━━━━━━━━━━━━━━━━━
📊 *${t('waSubtotalItems')}* $ ${itemsTotalUSD.toFixed(2)} USD (≈ R$ ${(itemsTotalUSD * storeConfig.exchangeRate).toFixed(2).replace('.', ',')})
🚚 *${t('waShipping')}* ${shippingUSD === 0 ? t('waShippingFree') : `$ ${shippingUSD.toFixed(2)} USD (≈ R$ ${shippingBRL.toFixed(2).replace('.', ',')})`}
━━━━━━━━━━━━━━━━━━━
💵 *${t('waTotalUSD')} $ ${grandTotalUSD.toFixed(2)} USD*
💰 *${t('waTotalBRL')} R$ ${grandTotalBRL.toFixed(2).replace('.', ',')}*
━━━━━━━━━━━━━━━━━━━

${t('waFooter')}`;

  const whatsappUrl = `https://wa.me/${storeConfig.phone}?text=${encodeURIComponent(message)}`;
  window.open(whatsappUrl, '_blank', 'noopener,noreferrer');
  showToast(t('openingWhatsApp'));
}

// === Drawer & Modais ===
function setCartDrawerOpen(isOpen) {
  if (!cartSidebar) return;
  cartSidebar.classList.toggle('open', isOpen);
  if (cartBackdrop) cartBackdrop.classList.toggle('active', isOpen);
  if (cartFloatingBtn) cartFloatingBtn.setAttribute('aria-expanded', String(isOpen));
}

function getFocusableElements(container) {
  return Array.from(
    container.querySelectorAll('button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [href], [tabindex]:not([tabindex="-1"])')
  );
}

function openModal(modal, triggerEl = null) {
  if (!modal) return;
  lastModalTrigger = triggerEl || document.activeElement;
  modal.classList.add('active');
  modal.setAttribute('aria-hidden', 'false');
  const focusables = getFocusableElements(modal);
  if (focusables.length > 0) focusables[0].focus();
}

function closeModal(modal) {
  if (!modal) return;
  modal.classList.remove('active');
  modal.setAttribute('aria-hidden', 'true');
  if (lastModalTrigger && typeof lastModalTrigger.focus === 'function') {
    lastModalTrigger.focus();
    lastModalTrigger = null;
  }
}

// === Event Listeners ===
function setupEventListeners() {
  let debounceTimeout;
  if (searchInput) {
    searchInput.addEventListener('input', () => {
      if (clearSearchBtn) {
        clearSearchBtn.style.display = searchInput.value ? 'flex' : 'none';
      }
      clearTimeout(debounceTimeout);
      debounceTimeout = setTimeout(applyFilters, 250);
    });
  }

  if (clearSearchBtn && searchInput) {
    clearSearchBtn.addEventListener('click', () => {
      searchInput.value = '';
      clearSearchBtn.style.display = 'none';
      applyFilters();
      searchInput.focus();
    });
  }

  if (categoryChips) {
    categoryChips.addEventListener('click', (e) => {
      const chip = e.target.closest('.chip');
      if (!chip) return;
      categoryChips.querySelectorAll('.chip').forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      activeCategory = chip.getAttribute('data-filter') || 'all';
      applyFilters();
    });
  }

  document.querySelectorAll('.lang-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      applyLanguage(btn.getAttribute('data-lang'));
    });
  });

  productsGrid.addEventListener('change', (e) => {
    const prodId = e.target.getAttribute('data-id');
    if (!prodId) return;

    if (e.target.classList.contains('type-select') || e.target.classList.contains('size-select')) {
      calculateCardPrice(prodId);
      return;
    }

    if (e.target.classList.contains('addon-checkbox')) {
      if (e.target.id === `addon-perso-${prodId}`) {
        const inputs = document.getElementById(`perso-inputs-${prodId}`);
        if (inputs) inputs.style.display = e.target.checked ? 'flex' : 'none';
      }
      if (e.target.id === `addon-patch-${prodId}`) {
        const inputs = document.getElementById(`patch-inputs-${prodId}`);
        if (inputs) inputs.style.display = e.target.checked ? 'block' : 'none';
      }
      calculateCardPrice(prodId);
    }
  });

  productsGrid.addEventListener('click', (e) => {
    const addonHeader = e.target.closest('.card-addons-header');
    if (addonHeader) {
      const prodId = addonHeader.getAttribute('data-id');
      const body = document.getElementById(`addons-body-${prodId}`);
      const icon = document.getElementById(`addon-icon-${prodId}`);
      if (body) {
        const isHidden = body.style.display === 'none';
        body.style.display = isHidden ? 'flex' : 'none';
        addonHeader.setAttribute('aria-expanded', String(isHidden));
        if (icon) {
          icon.className = isHidden
            ? 'fa-solid fa-chevron-up addon-toggle-icon'
            : 'fa-solid fa-chevron-down addon-toggle-icon';
        }
      }
      return;
    }

    const addBtn = e.target.closest('.btn-add-to-cart');
    if (addBtn) {
      addToCart(addBtn.getAttribute('data-id'));
      return;
    }

    const plusBtn = e.target.closest('.btn-plus');
    if (plusBtn) {
      const prodId = plusBtn.getAttribute('data-id');
      const input = document.getElementById(`qty-input-${prodId}`);
      if (input) input.value = Math.max(1, parseInt(input.value || '1', 10) + 1);
      return;
    }

    const minusBtn = e.target.closest('.btn-minus');
    if (minusBtn) {
      const prodId = minusBtn.getAttribute('data-id');
      const input = document.getElementById(`qty-input-${prodId}`);
      if (input) input.value = Math.max(1, parseInt(input.value || '1', 10) - 1);
    }
  });

  cartItemsContainer.addEventListener('click', (e) => {
    const removeBtn = e.target.closest('.btn-remove-item');
    if (removeBtn) {
      removeFromCart(parseInt(removeBtn.getAttribute('data-index'), 10));
    }
  });

  clearCartBtn.addEventListener('click', clearCart);
  btnSendWhatsapp.addEventListener('click', sendOrderToWhatsApp);

  if (cartFloatingBtn) {
    cartFloatingBtn.addEventListener('click', () => {
      setCartDrawerOpen(!cartSidebar.classList.contains('open'));
    });
  }

  if (mobileCartScrollBtn) {
    mobileCartScrollBtn.addEventListener('click', () => setCartDrawerOpen(true));
  }

  if (closeCartDrawerBtn) {
    closeCartDrawerBtn.addEventListener('click', () => setCartDrawerOpen(false));
  }

  if (cartBackdrop) {
    cartBackdrop.addEventListener('click', () => setCartDrawerOpen(false));
  }

  if (btnBackToTop) {
    window.addEventListener('scroll', () => {
      btnBackToTop.classList.toggle('visible', window.scrollY > 400);
    }, { passive: true });

    btnBackToTop.addEventListener('click', () => {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  }

  // Modal e Focus Trap + Tecla Escape
  if (rateBadgePill) rateBadgePill.addEventListener('click', () => openModal(modalSettings, rateBadgePill));
  openSettingsBtn.addEventListener('click', () => openModal(modalSettings, openSettingsBtn));
  closeSettingsModal.addEventListener('click', () => closeModal(modalSettings));
  cancelSettingsModal.addEventListener('click', () => closeModal(modalSettings));
  document.getElementById('backdrop-settings').addEventListener('click', () => closeModal(modalSettings));
  formSettings.addEventListener('submit', saveStoreConfig);

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      if (modalSettings && modalSettings.classList.contains('active')) {
        closeModal(modalSettings);
        return;
      }
      if (cartSidebar && cartSidebar.classList.contains('open')) {
        setCartDrawerOpen(false);
        return;
      }
    }

    if (e.key === 'Tab' && modalSettings && modalSettings.classList.contains('active')) {
      const focusables = getFocusableElements(modalSettings);
      if (focusables.length === 0) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
  });
}

function showToast(message) {
  toastEl.innerHTML = `<i class="fa-solid fa-circle-check" style="color:#25d366;" aria-hidden="true"></i> <span>${escapeHtml(message)}</span>`;
  toastEl.classList.add('show');
  setTimeout(() => {
    toastEl.classList.remove('show');
  }, 3500);
}
