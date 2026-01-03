// content.js - Runs on 4WD Supacentre product pages

// Check if we're on a product page
function isProductPage() {
  const path = window.location.pathname;
  
  // Must end in .html
  if (!path.endsWith('.html')) {
    return false;
  }
  
  // Exclude these paths
  const excludePaths = [
    '/stores.html',
    '/search.html',
    '/returns.html',
    '/payment-options.html',
    '/about-us.html'
  ];
  
  // Exclude category pages (they have .html but are just listings)
  const excludePatterns = [
    '/stores/',
    '/tips-tricks-tech/'
  ];
  
  // Check if it matches any exclude path
  if (excludePaths.includes(path)) {
    return false;
  }
  
  // Check if it contains any exclude pattern
  for (const pattern of excludePatterns) {
    if (path.includes(pattern)) {
      return false;
    }
  }
  
  // If we got here, it's probably a product page
  return true;
}

// Extract product info from the page
function getProductInfo() {
  console.log('[Price Tracker] Attempting to extract product info...');
  
  let price = null;
  
  // Their price is structured as: <div class="calcFreightTotal-*"><span class="integerOriginal-*">629</span>
  // Look for this specific structure
  const priceContainer = document.querySelector('[class*="calcFreightTotal"]');
  
  if (priceContainer) {
    const integerSpan = priceContainer.querySelector('[class*="integerOriginal"]');
    if (integerSpan) {
      const priceInt = integerSpan.textContent.trim();
      price = parseFloat(priceInt);
      console.log('[Price Tracker] Found price in calcFreightTotal:', price);
    }
  }
  
  // Fallback: look for integerOriginal anywhere on page
  if (!price) {
    const integerSpan = document.querySelector('[class*="integerOriginal"]');
    if (integerSpan) {
      const priceInt = integerSpan.textContent.trim();
      price = parseFloat(priceInt);
      console.log('[Price Tracker] Found price in integerOriginal fallback:', price);
    }
  }
  
  if (!price) {
    console.log('[Price Tracker] Could not find price using known selectors');
    return null;
  }
  
  // Get product title
  const titleElement = document.querySelector('h1');
  const title = titleElement ? titleElement.textContent.trim() : 'Unknown Product';
  
  // Get product SKU
  let sku = '';
  const potentialSku = document.querySelector('[class*="sku"]');
  if (potentialSku) {
    sku = potentialSku.textContent.trim();
  }
  
  console.log('[Price Tracker] Successfully extracted:', { title, price, sku });
  
  return {
    url: window.location.href,
    title: title,
    sku: sku,
    price: price,
    timestamp: Date.now()
  };
}

// Check if product is being tracked
async function isTracked(url) {
  const result = await chrome.storage.local.get('trackedProducts');
  const tracked = result.trackedProducts || {};
  return url in tracked;
}

// Create and inject the tracking button
async function injectTrackButton() {
  console.log('[Price Tracker] Starting button injection...');
  
  const productInfo = getProductInfo();
  if (!productInfo) {
    console.log('[Price Tracker] Could not extract product info, button injection aborted');
    return;
  }
  
  const tracked = await isTracked(productInfo.url);
  console.log('[Price Tracker] Product tracked status:', tracked);
  
  // Find where to inject the button - try multiple strategies
  let targetContainer = null;
  
  // Strategy 1: Look for product-add-form
  targetContainer = document.querySelector('.product-add-form');
  
  // Strategy 2: Look for the Add to Cart button and use its parent
  if (!targetContainer) {
    const addToCartBtn = document.querySelector('button[type="submit"]');
    if (addToCartBtn) {
      targetContainer = addToCartBtn.parentElement;
      console.log('[Price Tracker] Using Add to Cart button parent as container');
    }
  }
  
  // Strategy 3: Look for any form containing "Add to Cart"
  if (!targetContainer) {
    const forms = document.querySelectorAll('form');
    for (const form of forms) {
      if (form.textContent.includes('ADD TO CART')) {
        targetContainer = form;
        console.log('[Price Tracker] Found form containing ADD TO CART text');
        break;
      }
    }
  }
  
  // Strategy 4: Look for product-info area
  if (!targetContainer) {
    targetContainer = document.querySelector('.product-info-main, .product-info, .product-details');
    if (targetContainer) {
      console.log('[Price Tracker] Using product-info container');
    }
  }
  
  if (!targetContainer) {
    console.log('[Price Tracker] Could not find suitable container for button');
    // As last resort, try to find the h1 and insert after it
    const h1 = document.querySelector('h1');
    if (h1 && h1.parentElement) {
      targetContainer = h1.parentElement;
      console.log('[Price Tracker] Using H1 parent as fallback container');
    } else {
      console.log('[Price Tracker] Button injection aborted - no suitable container found');
      return;
    }
  }
  
  console.log('[Price Tracker] Found container, creating button...');
  
  // Create tracking button
  const trackButton = document.createElement('button');
  trackButton.className = 'price-tracker-btn';
  trackButton.id = 'price-tracker-btn';
  trackButton.type = 'button'; // Important: prevent form submission
  trackButton.innerHTML = tracked ? '📊 Tracking Price' : '📈 Track This Price';
  trackButton.dataset.tracked = tracked;
  
  // Add click handler
  trackButton.addEventListener('click', async (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    console.log('[Price Tracker] Track button clicked');
    
    const isCurrentlyTracked = trackButton.dataset.tracked === 'true';
    
    if (isCurrentlyTracked) {
      // Untrack
      await untrackProduct(productInfo.url);
      trackButton.innerHTML = '📈 Track This Price';
      trackButton.dataset.tracked = 'false';
      console.log('[Price Tracker] Product untracked');
    } else {
      // Track
      await trackProduct(productInfo);
      trackButton.innerHTML = '📊 Tracking Price';
      trackButton.dataset.tracked = 'true';
      showPriceHistory(productInfo.url);
      console.log('[Price Tracker] Product tracked');
    }
  });
  
  // Create "Search for Bundles" button
  const bundleButton = document.createElement('button');
  bundleButton.className = 'price-tracker-btn bundle-search-btn';
  bundleButton.type = 'button';
  bundleButton.innerHTML = '🔍 Search for Bundles';
  bundleButton.title = productInfo.sku ? `Search for SKU: ${productInfo.sku}` : 'Search for this product in bundles';
  
  bundleButton.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    console.log('[Price Tracker] Bundle search clicked');
    
    // Use SKU if available, otherwise use product title
    const searchTerm = productInfo.sku || productInfo.title.split('|')[0].trim();
    const searchUrl = `https://www.4wdsupacentre.com.au/search.html?query=${encodeURIComponent(searchTerm)}`;
    
    // Open in new tab
    window.open(searchUrl, '_blank');
    console.log('[Price Tracker] Opened bundle search for:', searchTerm);
  });
  
  // Insert the buttons
  const addToCartBtn = targetContainer.querySelector('button[type="submit"]');
  if (addToCartBtn && addToCartBtn.parentElement && addToCartBtn.parentElement === targetContainer) {
    // Insert right after the Add to Cart button if it's a direct child
    addToCartBtn.parentElement.insertBefore(trackButton, addToCartBtn.nextSibling);
    addToCartBtn.parentElement.insertBefore(bundleButton, trackButton.nextSibling);
    console.log('[Price Tracker] Buttons inserted after Add to Cart button');
  } else if (addToCartBtn) {
    // Add to Cart exists but in different structure - put after it
    addToCartBtn.after(trackButton);
    trackButton.after(bundleButton);
    console.log('[Price Tracker] Buttons inserted after Add to Cart using .after()');
  } else {
    // No Add to Cart found - just append to container
    targetContainer.appendChild(trackButton);
    targetContainer.appendChild(bundleButton);
    console.log('[Price Tracker] Buttons appended to container');
  }
  
  console.log('[Price Tracker] ✅ Buttons successfully injected!');
  
  // If already tracked, show price history
  if (tracked) {
    showPriceHistory(productInfo.url);
  }
}

// Track a product
async function trackProduct(productInfo) {
  const result = await chrome.storage.local.get('trackedProducts');
  const tracked = result.trackedProducts || {};
  
  if (!tracked[productInfo.url]) {
    tracked[productInfo.url] = {
      title: productInfo.title,
      sku: productInfo.sku,
      priceHistory: []
    };
  }
  
  // Add current price to history
  tracked[productInfo.url].priceHistory.push({
    price: productInfo.price,
    timestamp: productInfo.timestamp
  });
  
  await chrome.storage.local.set({ trackedProducts: tracked });
  console.log('Product tracked:', productInfo.title);
}

// Untrack a product
async function untrackProduct(url) {
  const result = await chrome.storage.local.get('trackedProducts');
  const tracked = result.trackedProducts || {};
  
  delete tracked[url];
  
  await chrome.storage.local.set({ trackedProducts: tracked });
  
  // Remove price history display
  const historyDiv = document.getElementById('price-history-display');
  if (historyDiv) {
    historyDiv.remove();
  }
}

// Show price history
async function showPriceHistory(url) {
  const result = await chrome.storage.local.get('trackedProducts');
  const tracked = result.trackedProducts || {};
  const product = tracked[url];
  
  if (!product || !product.priceHistory.length) {
    return;
  }
  
  // Remove existing display
  const existing = document.getElementById('price-history-display');
  if (existing) {
    existing.remove();
  }
  
  // Create history display
  const historyDiv = document.createElement('div');
  historyDiv.id = 'price-history-display';
  historyDiv.className = 'price-history-display';
  
  const prices = product.priceHistory;
  const currentPrice = prices[prices.length - 1].price;
  const lowestPrice = Math.min(...prices.map(p => p.price));
  const highestPrice = Math.max(...prices.map(p => p.price));
  
  historyDiv.innerHTML = `
    <h3>Price History</h3>
    <div class="price-stats">
      <div class="stat">
        <span class="label">Current:</span>
        <span class="value">$${currentPrice.toFixed(2)}</span>
      </div>
      <div class="stat">
        <span class="label">Lowest:</span>
        <span class="value lowest">$${lowestPrice.toFixed(2)}</span>
      </div>
      <div class="stat">
        <span class="label">Highest:</span>
        <span class="value">$${highestPrice.toFixed(2)}</span>
      </div>
    </div>
    <div class="price-list">
      <h4>Recent Prices:</h4>
      ${prices.slice().reverse().slice(0, 5).map(p => `
        <div class="price-entry">
          <span>$${p.price.toFixed(2)}</span>
          <span class="date">${new Date(p.timestamp).toLocaleDateString()}</span>
        </div>
      `).join('')}
    </div>
  `;
  
  // Insert after product title
  const titleElement = document.querySelector('.page-title');
  if (titleElement) {
    titleElement.parentElement.insertBefore(historyDiv, titleElement.nextSibling);
  }
}

// Update price if product is already being tracked
async function updateTrackedPrice() {
  const productInfo = getProductInfo();
  if (!productInfo) return;
  
  const result = await chrome.storage.local.get('trackedProducts');
  const tracked = result.trackedProducts || {};
  
  if (tracked[productInfo.url]) {
    const lastPrice = tracked[productInfo.url].priceHistory[tracked[productInfo.url].priceHistory.length - 1];
    
    // Only add new price if it's different from last recorded price
    if (!lastPrice || lastPrice.price !== productInfo.price) {
      await trackProduct(productInfo);
    }
  }
}

// Initialize when page loads
console.log('[Price Tracker] Content script loaded');

// Track the current URL
let currentUrl = window.location.href;

// Function to initialize everything
function initialize() {
  if (!isProductPage()) {
    console.log('[Price Tracker] Not a product page, skipping initialization');
    return;
  }

  console.log('[Price Tracker] Product page detected, initializing...');
  
  // Check if button already exists (avoid duplicates)
  if (document.getElementById('price-tracker-btn')) {
    console.log('[Price Tracker] Button already exists, skipping');
    return;
  }
  
  // Wait for Add to Cart button to appear (better than setTimeout)
  waitForAddToCart();
}

// Wait for the Add to Cart button to appear in the DOM
function waitForAddToCart() {
  const maxAttempts = 20; // Try for 10 seconds max
  let attempts = 0;
  
  const checkInterval = setInterval(() => {
    attempts++;
    
    // Look for Add to Cart button
    const addToCartBtn = document.querySelector('button[type="submit"]');
    
    if (addToCartBtn) {
      console.log('[Price Tracker] Add to Cart button found, injecting tracking buttons...');
      clearInterval(checkInterval);
      injectTrackButton();
      updateTrackedPrice();
    } else if (attempts >= maxAttempts) {
      console.log('[Price Tracker] Add to Cart button not found after 10 seconds, using fallback...');
      clearInterval(checkInterval);
      injectTrackButton();
      updateTrackedPrice();
    }
  }, 500); // Check every 500ms
}

// Watch for URL changes (for SPA navigation)
function observeUrlChanges() {
  // Method 1: Watch for history changes
  const pushState = history.pushState;
  const replaceState = history.replaceState;

  history.pushState = function() {
    pushState.apply(history, arguments);
    checkUrlChange();
  };

  history.replaceState = function() {
    replaceState.apply(history, arguments);
    checkUrlChange();
  };

  // Method 2: Listen for popstate (back/forward button)
  window.addEventListener('popstate', checkUrlChange);
}

function checkUrlChange() {
  if (window.location.href !== currentUrl) {
    console.log('[Price Tracker] URL changed from', currentUrl, 'to', window.location.href);
    currentUrl = window.location.href;
    
    // Wait for the new page to load
    setTimeout(() => {
      initialize();
    }, 1000);
  }
}

// Start watching for URL changes
observeUrlChanges();

// Initial load
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initialize);
} else {
  initialize();
}
