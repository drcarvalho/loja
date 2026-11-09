// Estado da Aplicação
let currentLang = localStorage.getItem('store_lang') || 'pt';
let allProducts = [];
let filteredProducts = [];
let cart = [];
let currentPage = 1;
const ITEMS_PER_PAGE = 24;

// Tabela de Preços Base em Dólar (US$) por Tipo de Produto
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

// Tabela de Adicionais de Tamanho
// 3XL = +$2, 4XL = +$2
const SIZE_SURCHARGES = {
  '3XL': 2.00,
  '4XL': 2.00
};

// Tabela de Custos de Personalização Adicional
const ADDON_PRICES = {
  personalization: 3.00, // Nome + Número = $3
  patch: 1.00,           // Patch de Manga = $1
  full_sponsor: 5.00     // Patrocinador completo = $5
};

// Tabela de Frete:
// 1 = $5, 2 = $4, 3 = $3, 4 = $2, 5+ = FRETE GRÁTIS!
function calculateShipping(totalPieces) {
  if (totalPieces <= 0) return 0;
  if (totalPieces === 1) return 5.00;
  if (totalPieces === 2) return 4.00;
  if (totalPieces === 3) return 3.00;
  if (totalPieces === 4) return 2.00;
  return 0; // A partir de 5 peças: FRETE GRÁTIS!
}

// Opções base de tamanho
const BASE_SIZES = [
  'P (S)',
  'M (M)',
  'G (L)',
  'GG (XL)',
  '2XL (XG)',
  '3XL',
  '4XL',
  'Kids (16)',
  'Kids (18)',
  'Kids (20)',
  'Kids (22)',
  'Kids (24)',
  'Kids (26)',
  'Kids (28)'
];

// Helper de tradução
function t(key, ...args) {
  const dict = i18n[currentLang] || i18n.pt;
  let text = dict[key] || i18n.pt[key] || key;
  if (args.length > 0) {
    args.forEach(arg => {
      text = text.replace('%s', arg);
    });
  }
  return text;
}

function getTypeLabel(typeKey) {
  const dict = i18n[currentLang] || i18n.pt;
  if (dict.types && dict.types[typeKey]) {
    return dict.types[typeKey];
  }
  return typeKey;
}

function getSizeLabel(sizeKey) {
  const dict = i18n[currentLang] || i18n.pt;
  if (dict.sizes && dict.sizes[sizeKey]) {
    return dict.sizes[sizeKey];
  }
  return sizeKey;
}

// Configuração da Loja (Salva em LocalStorage)
// Added ARIA and validation enhancements

let storeConfig = {
  phone: localStorage.getItem('store_whatsapp') || '5511999999999',
  name: localStorage.getItem('store_name') || 'Loja Tetê',
  exchangeRate: parseFloat(localStorage.getItem('store_exchange_rate')) || 5.80,
  defaultPriceUSD: parseFloat(localStorage.getItem('store_default_price_usd')) || 8.00
};

// Elementos DOM
const productsGrid = document.getElementById('products-grid');
const searchInput = document.getElementById('search-input');
const productsCountEl = document.getElementById('products-count');
const cartItemsContainer = document.getElementById('cart-items');
const cartBadge = document.getElementById('cart-badge');
const subtotalVal = document.getElementById('subtotal-val');
const subtotalUsdVal = document.getElementById('subtotal-usd-val');
const shippingUsdVal = document.getElementById('shipping-usd-val');
const shippingInfoBadge = document.getElementById('shipping-info-badge');
const shippingInfoText = document.getElementById('shipping-info-text');
const totalVal = document.getElementById('total-val');
const totalUsdVal = document.getElementById('total-usd-val');
const cartExchangeRate = document.getElementById('cart-exchange-rate');
const headerRateDisplay = document.getElementById('header-rate-display');
const rateBadgePill = document.getElementById('rate-badge-pill');
const btnSendWhatsapp = document.getElementById('btn-send-whatsapp');
const clearCartBtn = document.getElementById('clear-cart-btn');
const toastEl = document.getElementById('toast');
const paginationContainer = document.getElementById('pagination-container');

// Modais
const modalSettings = document.getElementById('modal-settings');
const openSettingsBtn = document.getElementById('open-settings-btn');
const closeSettingsModal = document.getElementById('close-settings-modal');
const cancelSettingsModal = document.getElementById('cancel-settings-modal');
const formSettings = document.getElementById('form-settings');
const storePhoneInput = document.getElementById('store-phone');
const storeNameInput = document.getElementById('store-name-input');
const storeExchangeRateInput = document.getElementById('store-exchange-rate-input');
const storeDefaultPriceInput = document.getElementById('store-default-price-input');

// Inicialização
document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('current-year').textContent = new Date().getFullYear();
  applyLanguage(currentLang);
  // Set the HTML lang attribute for accessibility and SEO
  document.documentElement.lang = currentLang;
  loadCartFromStorage();
  loadStoreConfig();
  fetchProducts();
  setupEventListeners();
});

// Troca de idioma
function applyLanguage(lang) {
  if (!i18n[lang]) lang = 'pt';
  currentLang = lang;
  localStorage.setItem('store_lang', currentLang);

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

  document.title = t('siteTitle');

  if (allProducts.length > 0) {
    renderProducts();
    renderCart();
    updateProductsCount();
  }
}

function loadStoreConfig() {
  storePhoneInput.value = storeConfig.phone;
  storeNameInput.value = storeConfig.name;
  storeExchangeRateInput.value = storeConfig.exchangeRate.toFixed(2);
  storeDefaultPriceInput.value = storeConfig.defaultPriceUSD.toFixed(2);
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
  
  const newRate = parseFloat(storeExchangeRateInput.value) || 5.80;
  const newPriceUSD = parseFloat(storeDefaultPriceInput.value) || 8.00;

  storeConfig.phone = cleanPhone;
  storeConfig.name = storeNameInput.value.trim() || 'Loja Tetê';
  storeConfig.exchangeRate = newRate;
  storeConfig.defaultPriceUSD = newPriceUSD;

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

// Buscar Produtos do Arquivo Extraído
async function fetchProducts() {
  try {
    const res = await fetch('products.json');
    if (!res.ok) throw new Error('Não foi possível carregar products.json');
    allProducts = await res.json();
    
    filteredProducts = [...allProducts];
    renderProducts();
    updateProductsCount();
    setupCatalogStats();
  } catch (err) {
    console.error('Erro ao carregar produtos:', err);
    productsGrid.innerHTML = `
      <div style="grid-column: 1/-1; text-align: center; padding: 40px; background: white; border-radius: 12px;">
        <i class="fa-solid fa-triangle-exclamation" style="font-size: 32px; color: #ef4444; margin-bottom: 12px;"></i>
        <h3>Erro ao carregar o catálogo de produtos</h3>
        <p style="color: #64748b;">Verifique se o arquivo products.json está presente na raiz.</p>
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

// Renderizar Produtos
function renderProducts() {
  productsGrid.innerHTML = '';

  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = startIndex + ITEMS_PER_PAGE;
  const pageItems = filteredProducts.slice(startIndex, endIndex);

  if (pageItems.length === 0) {
    productsGrid.innerHTML = `
      <div style="grid-column: 1/-1; text-align: center; padding: 48px; background: white; border-radius: 12px;">
        <i class="fa-solid fa-magnifying-glass" style="font-size: 36px; color: #94a3b8; margin-bottom: 12px;"></i>
        <h3>${t('noProductsFound')}</h3>
        <p style="color: #64748b;">${t('tryOtherSearch')}</p>
      </div>
    `;
    renderPagination(0);
    return;
  }

  const fragment = document.createDocumentFragment();

  pageItems.forEach(prod => {
    const card = document.createElement('div');
    card.className = 'product-card';
    card.setAttribute('data-id', prod.id);

    const defaultType = prod.item_type || 'fan';
    const baseTypePriceUSD = PRODUCT_TYPE_PRICES[defaultType] || 8.00;
    const baseTypePriceBRL = baseTypePriceUSD * storeConfig.exchangeRate;

    const imgSrc = prod.image ? `/proxy-img?url=${encodeURIComponent(prod.image)}` : 'https://placehold.co/400x400?text=Camisa+Futebol';
    
    // Lista de tipos selecionáveis
    const typeKeys = Object.keys(PRODUCT_TYPE_PRICES);
    const typeOptionsHtml = typeKeys.map(k => 
      `<option value="${k}" ${k === defaultType ? 'selected' : ''}>${getTypeLabel(k)}</option>`
    ).join('');

    // Lista de tamanhos
    const sizeOptionsHtml = BASE_SIZES.map(s => 
      `<option value="${s}">${getSizeLabel(s)}</option>`
    ).join('');

    card.innerHTML = `
      <div class="product-image-container">
        <img 
          src="${imgSrc}" 
          alt="${escapeHtml(prod.model)}" 
          class="product-img" 
          loading="lazy" 
          referrerpolicy="no-referrer"
          onerror="this.onerror=null; this.src='https://placehold.co/400x400?text=Sem+Foto';"
        >
        <a href="${prod.yupoo_url}" target="_blank" rel="noopener noreferrer" class="product-badge-source" title="${t('seeYupoo')}">
          <i class="fa-solid fa-arrow-up-right-from-square"></i> ${t('seeYupoo')}
        </a>
      </div>
      
      <div class="product-body">
        <h3 class="product-title" title="${escapeHtml(prod.model)}">${escapeHtml(prod.model)}</h3>
        
        <div class="product-price-container">
          <div class="price-usd-main">
            <span class="currency-symbol">$</span>
            <span class="amount-usd" id="card-price-usd-${prod.id}">${baseTypePriceUSD.toFixed(2)}</span>
            <span class="currency-tag">USD</span>
            <span class="surcharge-notice" id="surcharge-notice-${prod.id}" style="display:none;"></span>
          </div>
          <div class="price-brl-converted">
            <span id="card-price-brl-${prod.id}">≈ R$ ${baseTypePriceBRL.toFixed(2).replace('.', ',')}</span>
          </div>
        </div>

        <div class="product-config">
          <!-- Seletor de Tipo / Versão -->
          <div class="config-row">
            <span class="config-label"><i class="fa-solid fa-tags"></i> ${t('versionType')}</span>
            <select class="type-select" id="type-select-${prod.id}" data-id="${prod.id}">
              ${typeOptionsHtml}
            </select>
          </div>

          <!-- Seletor de Tamanho -->
          <div class="config-row">
            <span class="config-label"><i class="fa-solid fa-shirt"></i> ${t('sizeVersion')}</span>
            <select class="size-select" id="size-select-${prod.id}" data-id="${prod.id}">
              ${sizeOptionsHtml}
            </select>
          </div>

          <!-- Acordeão / Bloco de Adicionais & Personalização -->
          <div class="card-addons-box">
            <div class="card-addons-header" data-id="${prod.id}">
              <span><i class="fa-solid fa-wand-magic-sparkles"></i> ${t('customizationTitle')}</span>
              <i class="fa-solid fa-chevron-down addon-toggle-icon" id="addon-icon-${prod.id}"></i>
            </div>
            <div class="card-addons-body" id="addons-body-${prod.id}" style="display: none;">
              <!-- 1. Personalização Nome + Número ($3) -->
              <label class="addon-checkbox-label">
                <input type="checkbox" id="addon-perso-${prod.id}" data-id="${prod.id}" class="addon-checkbox">
                <span>${t('optPersonalization')}</span>
              </label>
              <div class="addon-inputs-row" id="perso-inputs-${prod.id}" style="display: none;">
                <input type="text" id="custom-name-${prod.id}" placeholder="${t('customNamePlaceholder')}" maxlength="15">
                <input type="text" id="custom-number-${prod.id}" placeholder="${t('customNumberPlaceholder')}" maxlength="3">
              </div>

              <!-- 2. Patch ($1) -->
              <label class="addon-checkbox-label">
                <input type="checkbox" id="addon-patch-${prod.id}" data-id="${prod.id}" class="addon-checkbox">
                <span>${t('optPatch')}</span>
              </label>
              <div class="addon-inputs-row" id="patch-inputs-${prod.id}" style="display: none;">
                <input type="text" id="custom-patch-${prod.id}" placeholder="${t('customPatchPlaceholder')}" maxlength="30" style="width:100%;">
              </div>

              <!-- 3. Patrocinador Completo ($5) -->
              <label class="addon-checkbox-label">
                <input type="checkbox" id="addon-sponsor-${prod.id}" data-id="${prod.id}" class="addon-checkbox">
                <span>${t('optFullSponsor')}</span>
              </label>
            </div>
          </div>

          <div class="config-row">
            <span class="config-label"><i class="fa-solid fa-calculator"></i> ${t('qty')}</span>
            <div class="qty-control">
              <button class="qty-btn btn-minus" data-id="${prod.id}">-</button>
              <input type="text" class="qty-val" id="qty-input-${prod.id}" value="1" readonly>
              <button class="qty-btn btn-plus" data-id="${prod.id}">+</button>
            </div>
          </div>

          <button class="btn-add-to-cart" data-id="${prod.id}">
            <i class="fa-solid fa-cart-plus"></i> ${t('addToCart')}
          </button>
        </div>
      </div>
    `;

    fragment.appendChild(card);
  });

  productsGrid.appendChild(fragment);
  renderPagination(filteredProducts.length);
}

// Calcular preço total de um card com base em Tipo + Tamanho + Checkboxes
function calculateCardPrice(productId) {
  const typeSelect = document.getElementById(`type-select-${productId}`);
  const sizeSelect = document.getElementById(`size-select-${productId}`);
  const chkPerso = document.getElementById(`addon-perso-${productId}`);
  const chkPatch = document.getElementById(`addon-patch-${productId}`);
  const chkSponsor = document.getElementById(`addon-sponsor-${productId}`);

  const typeKey = typeSelect ? typeSelect.value : 'fan';
  const sizeVal = sizeSelect ? sizeSelect.value : 'P (S)';

  let priceUSD = PRODUCT_TYPE_PRICES[typeKey] || 8.00;

  // Tamanho 3XL ou 4XL = +$2
  const sizeSurcharge = SIZE_SURCHARGES[sizeVal] || 0;
  priceUSD += sizeSurcharge;

  // Adicionais
  let addonsSum = 0;
  if (chkPerso && chkPerso.checked) addonsSum += ADDON_PRICES.personalization;
  if (chkPatch && chkPatch.checked) addonsSum += ADDON_PRICES.patch;
  if (chkSponsor && chkSponsor.checked) addonsSum += ADDON_PRICES.full_sponsor;

  priceUSD += addonsSum;
  const priceBRL = priceUSD * storeConfig.exchangeRate;

  // Atualizar visualização no Card
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

// Paginação
function renderPagination(totalItems) {
  paginationContainer.innerHTML = '';
  const totalPages = Math.ceil(totalItems / ITEMS_PER_PAGE);

  if (totalPages <= 1) return;

  const prevBtn = document.createElement('button');
  prevBtn.className = 'page-btn';
  prevBtn.innerHTML = '<i class="fa-solid fa-chevron-left"></i>';
  prevBtn.disabled = currentPage === 1;
  prevBtn.onclick = () => goToPage(currentPage - 1);
  paginationContainer.appendChild(prevBtn);

  let startPage = Math.max(1, currentPage - 2);
  let endPage = Math.min(totalPages, currentPage + 2);

  if (startPage > 1) {
    const firstBtn = document.createElement('button');
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
    lastBtn.className = 'page-btn';
    lastBtn.textContent = totalPages;
    lastBtn.onclick = () => goToPage(totalPages);
    paginationContainer.appendChild(lastBtn);
  }

  const nextBtn = document.createElement('button');
  nextBtn.className = 'page-btn';
  nextBtn.innerHTML = '<i class="fa-solid fa-chevron-right"></i>';
  nextBtn.disabled = currentPage === totalPages;
  nextBtn.onclick = () => goToPage(currentPage + 1);
  paginationContainer.appendChild(nextBtn);
}

function goToPage(page) {
  currentPage = page;
  renderProducts();
  window.scrollTo({ top: 180, behavior: 'smooth' });
}

// Filtro e Busca
function handleSearch() {
  const query = searchInput.value.toLowerCase().trim();
  currentPage = 1;
  
  if (!query) {
    filteredProducts = [...allProducts];
  } else {
    filteredProducts = allProducts.filter(p => 
      p.model.toLowerCase().includes(query) || 
      p.title.toLowerCase().includes(query)
    );
  }

  renderProducts();
  updateProductsCount();
}

function updateProductsCount() {
  productsCountEl.textContent = `${filteredProducts.length.toLocaleString('pt-BR')} ${t('itemsFound')}`;
}

// Carrinho de Compras
function addToCart(productId) {
  const product = allProducts.find(p => p.id === productId);
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

  // Detalhes de customização
  const hasPerso = chkPerso && chkPerso.checked;
  const hasPatch = chkPatch && chkPatch.checked;
  const hasSponsor = chkSponsor && chkSponsor.checked;

  const customName = hasPerso ? (document.getElementById(`custom-name-${productId}`)?.value.trim() || '') : '';
  const customNumber = hasPerso ? (document.getElementById(`custom-number-${productId}`)?.value.trim() || '') : '';
  const customPatch = hasPatch ? (document.getElementById(`custom-patch-${productId}`)?.value.trim() || 'Padrão') : '';

  const { priceUSD, priceBRL, sizeSurcharge } = calculateCardPrice(productId);

  // String única identificadora para agrupar ou separar itens
  const customKey = `${typeKey}|${selectedSize}|${hasPerso ? `${customName}:${customNumber}` : ''}|${hasPatch ? customPatch : ''}|${hasSponsor}`;

  const existingIndex = cart.findIndex(item => 
    item.id === productId && item.customKey === customKey
  );

  if (existingIndex > -1) {
    cart[existingIndex].quantity += quantity;
  } else {
    cart.push({
      id: product.id,
      model: product.model,
      typeKey: typeKey,
      typeLabel: getTypeLabel(typeKey),
      size: selectedSize,
      sizeLabel: getSizeLabel(selectedSize),
      sizeSurcharge: sizeSurcharge,
      hasPerso: hasPerso,
      customName: customName,
      customNumber: customNumber,
      hasPatch: hasPatch,
      customPatch: customPatch,
      hasSponsor: hasSponsor,
      price_usd: priceUSD,
      price_brl: priceBRL,
      quantity: quantity,
      image: product.image,
      yupoo_url: product.yupoo_url,
      customKey: customKey
    });
  }

  saveCartToStorage();
  renderCart();

  const addBtn = document.querySelector(`.btn-add-to-cart[data-id="${productId}"]`);
  if (addBtn) {
    addBtn.classList.add('added');
    addBtn.innerHTML = `<i class="fa-solid fa-check"></i> ${t('added')}`;
    setTimeout(() => {
      addBtn.classList.remove('added');
      addBtn.innerHTML = `<i class="fa-solid fa-cart-plus"></i> ${t('addToCart')}`;
    }, 1200);
  }

  showToast(`"${product.model} (${selectedSize})" ${t('added')}`);
}

function renderCart() {
  updateHeaderRate();

  if (cart.length === 0) {
    cartItemsContainer.innerHTML = `
      <div class="empty-cart-state">
        <i class="fa-solid fa-basket-shopping"></i>
        <p>${t('emptyCartTitle')}</p>
        <span>${t('emptyCartDesc')}</span>
      </div>
    `;
    cartBadge.textContent = '0';
    if (subtotalUsdVal) subtotalUsdVal.textContent = '$ 0.00';
    subtotalVal.textContent = 'R$ 0,00';
    if (shippingUsdVal) shippingUsdVal.textContent = '$ 0.00';
    if (shippingInfoText) shippingInfoText.textContent = t('shippingRulesInfo');
    if (totalUsdVal) totalUsdVal.textContent = '$ 0.00 USD';
    totalVal.textContent = 'R$ 0,00';
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

    const imgSrc = item.image ? `/proxy-img?url=${encodeURIComponent(item.image)}` : 'https://placehold.co/100x100?text=Camisa';

    // Tags de customização
    let badgesHtml = '';
    if (item.hasPerso) {
      badgesHtml += `<span class="cart-addon-pill"><i class="fa-solid fa-font"></i> ${item.customName || 'Sem Nome'} #${item.customNumber || '0'} (+3$)</span>`;
    }
    if (item.hasPatch) {
      badgesHtml += `<span class="cart-addon-pill"><i class="fa-solid fa-shield"></i> Patch: ${item.customPatch || 'Sim'} (+1$)</span>`;
    }
    if (item.hasSponsor) {
      badgesHtml += `<span class="cart-addon-pill"><i class="fa-solid fa-star"></i> Patrocínio Completo (+5$)</span>`;
    }
    if (item.sizeSurcharge > 0) {
      badgesHtml += `<span class="cart-surcharge-tag">${t('tamSpecialTag', item.sizeSurcharge.toFixed(0))}</span>`;
    }

    row.innerHTML = `
      <img 
        src="${imgSrc}" 
        alt="${escapeHtml(item.model)}" 
        class="cart-item-thumb" 
        referrerpolicy="no-referrer"
        onerror="this.onerror=null; this.src='https://placehold.co/100x100?text=Camisa';"
      >
      <div class="cart-item-details">
        <div class="cart-item-model" title="${escapeHtml(item.model)}">${escapeHtml(item.model)}</div>
        <div class="cart-item-meta">
          <span class="cart-item-tag"><strong>${escapeHtml(item.typeLabel || 'Fan')}</strong></span>
          <span class="cart-item-tag">${t('waSize')} <strong>${escapeHtml(item.sizeLabel || item.size)}</strong></span>
          <span class="cart-item-tag">${t('waQty')} <strong>${item.quantity}</strong></span>
        </div>
        ${badgesHtml ? `<div class="cart-badges-wrapper">${badgesHtml}</div>` : ''}
        <div class="cart-item-price">
          <strong>$ ${itemTotalUSD.toFixed(2)} USD</strong> 
          <span class="cart-item-brl-sub">(≈ R$ ${itemTotalBRL.toFixed(2).replace('.', ',')})</span>
        </div>
      </div>
      <div class="cart-item-actions">
        <button class="btn-remove-item" data-index="${index}" title="Remover item">
          <i class="fa-solid fa-trash-can"></i>
        </button>
      </div>
    `;

    fragment.appendChild(row);
  });

  cartItemsContainer.innerHTML = '';
  cartItemsContainer.appendChild(fragment);

  // Cálculo de Frete Baseado na Quantidade Total de Peças
  const shippingUSD = calculateShipping(totalPieces);
  const shippingBRL = shippingUSD * storeConfig.exchangeRate;

  const grandTotalUSD = itemsTotalUSD + shippingUSD;
  const grandTotalBRL = grandTotalUSD * storeConfig.exchangeRate;

  cartBadge.textContent = totalPieces;
  if (subtotalUsdVal) subtotalUsdVal.textContent = `$ ${itemsTotalUSD.toFixed(2)}`;
  subtotalVal.textContent = `R$ ${(itemsTotalUSD * storeConfig.exchangeRate).toFixed(2).replace('.', ',')}`;

  if (shippingUsdVal) {
    if (shippingUSD === 0) {
      shippingUsdVal.innerHTML = `<strong style="color: #16a34a;">$ 0.00 (${t('shippingFree')})</strong>`;
    } else {
      shippingUsdVal.textContent = `$ ${shippingUSD.toFixed(2)} USD (≈ R$ ${shippingBRL.toFixed(2).replace('.', ',')})`;
    }
  }

  if (shippingInfoText) {
    if (totalPieces >= 5) {
      shippingInfoText.innerHTML = `<strong style="color: #16a34a;">${t('shippingFree')}</strong>`;
      shippingInfoBadge.classList.add('free');
    } else {
      const remaining = 5 - totalPieces;
      shippingInfoText.textContent = `Peças: ${totalPieces} un. (Faltam ${remaining} para Frete Grátis!)`;
      shippingInfoBadge.classList.remove('free');
    }
  }

  if (totalUsdVal) totalUsdVal.textContent = `$ ${grandTotalUSD.toFixed(2)} USD`;
  totalVal.textContent = `R$ ${grandTotalBRL.toFixed(2).replace('.', ',')}`;
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
      cart = JSON.parse(saved);
      renderCart();
    }
  } catch (e) {
    console.error('Falha ao restaurar carrinho:', e);
  }
}

// Geração e Envio do Pedido via WhatsApp
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
    if (item.sizeSurcharge > 0) {
      itemsText += ` _(+ $${item.sizeSurcharge.toFixed(0)})_`;
    }
    itemsText += `\n`;

    // Adicionais do item
    if (item.hasPerso || item.hasPatch || item.hasSponsor) {
      itemsText += `   ✨ ${t('waCustomizations')}\n`;
      if (item.hasPerso) {
        itemsText += `      • Nome: *${item.customName || '-'}* | Nº: *${item.customNumber || '-'}* (+3$)\n`;
      }
      if (item.hasPatch) {
        itemsText += `      • Patch: *${item.customPatch || 'Padrão'}* (+1$)\n`;
      }
      if (item.hasSponsor) {
        itemsText += `      • Patrocinador Completo (+5$)\n`;
      }
    }

    itemsText += `   🔢 ${t('waQty')} *${item.quantity}* un.\n`;
    itemsText += `   💲 ${t('waUnitPrice')} *$ ${item.price_usd.toFixed(2)} USD* (≈ R$ ${(item.price_usd * storeConfig.exchangeRate).toFixed(2).replace('.', ',')})\n`;
    itemsText += `   📊 ${t('waSubtotal')} $ ${itemTotalUSD.toFixed(2)} USD (R$ ${itemTotalBRL.toFixed(2).replace('.', ',')})\n`;
    if (item.yupoo_url) {
      itemsText += `   🔗 Link: ${item.yupoo_url}\n`;
    }
    itemsText += `\n`;
  });

  const shippingUSD = calculateShipping(totalPieces);
  const shippingBRL = shippingUSD * storeConfig.exchangeRate;

  const grandTotalUSD = itemsTotalUSD + shippingUSD;
  const grandTotalBRL = grandTotalUSD * storeConfig.exchangeRate;

  const now = new Date();
  const dateStr = now.toLocaleDateString(currentLang === 'zh' ? 'zh-CN' : (currentLang === 'en' ? 'en-US' : 'pt-BR')) + ' - ' + now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  // Mensagem estruturada para WhatsApp
  const message = 
`🛍️ *${t('waTitle')} - ${storeConfig.name.toUpperCase()}*
📅 Data: ${dateStr}

👤 *${t('waCustomerData')}*
• ${t('waName')} *${customerName}*
• ${t('waDelivery')} ${customerAddress || 'A combinar / Retirada'}
${orderNotes ? `• ${t('waNotes')} ${orderNotes}\n` : ''}
━━━━━━━━━━━━━━━━━━━
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

  const encodedMessage = encodeURIComponent(message);
  const whatsappUrl = `https://wa.me/${storeConfig.phone}?text=${encodedMessage}`;

  window.open(whatsappUrl, '_blank');
  showToast(t('openingWhatsApp'));
}

// Configuração de Event Listeners
function setupEventListeners() {
  let debounceTimeout;
  searchInput.addEventListener('input', () => {
    clearTimeout(debounceTimeout);
    debounceTimeout = setTimeout(handleSearch, 300);
  });

  document.querySelectorAll('.lang-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const selected = btn.getAttribute('data-lang');
      applyLanguage(selected);
    });
  });

  // Mudança de Tipo no select do card
  productsGrid.addEventListener('change', (e) => {
    const prodId = parseInt(e.target.getAttribute('data-id'), 10);
    if (!prodId) return;

    if (e.target.classList.contains('type-select') || e.target.classList.contains('size-select')) {
      calculateCardPrice(prodId);
      return;
    }

    if (e.target.classList.contains('addon-checkbox')) {
      // Abre ou fecha campos de texto se houver
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

  // Cliques na grade de produtos
  productsGrid.addEventListener('click', (e) => {
    // Acordeão de adicionais
    const addonHeader = e.target.closest('.card-addons-header');
    if (addonHeader) {
      const prodId = addonHeader.getAttribute('data-id');
      const body = document.getElementById(`addons-body-${prodId}`);
      const icon = document.getElementById(`addon-icon-${prodId}`);
      if (body) {
        const isHidden = body.style.display === 'none';
        body.style.display = isHidden ? 'flex' : 'none';
        if (icon) icon.className = isHidden ? 'fa-solid fa-chevron-up addon-toggle-icon' : 'fa-solid fa-chevron-down addon-toggle-icon';
      }
      return;
    }

    const addBtn = e.target.closest('.btn-add-to-cart');
    if (addBtn) {
      const prodId = parseInt(addBtn.getAttribute('data-id'), 10);
      addToCart(prodId);
      return;
    }

    const plusBtn = e.target.closest('.btn-plus');
    if (plusBtn) {
      const prodId = plusBtn.getAttribute('data-id');
      const input = document.getElementById(`qty-input-${prodId}`);
      if (input) {
        input.value = Math.max(1, parseInt(input.value || 1, 10) + 1);
      }
      return;
    }

    const minusBtn = e.target.closest('.btn-minus');
    if (minusBtn) {
      const prodId = minusBtn.getAttribute('data-id');
      const input = document.getElementById(`qty-input-${prodId}`);
      if (input) {
        input.value = Math.max(1, parseInt(input.value || 1, 10) - 1);
      }
      return;
    }
  });

  cartItemsContainer.addEventListener('click', (e) => {
    const removeBtn = e.target.closest('.btn-remove-item');
    if (removeBtn) {
      const index = parseInt(removeBtn.getAttribute('data-index'), 10);
      removeFromCart(index);
    }
  });

  clearCartBtn.addEventListener('click', clearCart);
  btnSendWhatsapp.addEventListener('click', sendOrderToWhatsApp);

  document.getElementById('cart-floating-btn').addEventListener('click', () => {
    const sidebar = document.getElementById('cart-sidebar');
    sidebar.scrollIntoView({ behavior: 'smooth' });
  });

  if (rateBadgePill) {
    rateBadgePill.addEventListener('click', () => openModal(modalSettings));
  }

  openSettingsBtn.addEventListener('click', () => openModal(modalSettings));
  closeSettingsModal.addEventListener('click', () => closeModal(modalSettings));
  cancelSettingsModal.addEventListener('click', () => closeModal(modalSettings));
  document.getElementById('backdrop-settings').addEventListener('click', () => closeModal(modalSettings));
  formSettings.addEventListener('submit', saveStoreConfig);
}

function openModal(modal) {
  modal.classList.add('active');
}

function closeModal(modal) {
  modal.classList.remove('active');
}

function showToast(message) {
  toastEl.innerHTML = `<i class="fa-solid fa-circle-check" style="color:#25d366;"></i> <span>${escapeHtml(message)}</span>`;
  toastEl.classList.add('show');
  setTimeout(() => {
    toastEl.classList.remove('show');
  }, 3500);
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
