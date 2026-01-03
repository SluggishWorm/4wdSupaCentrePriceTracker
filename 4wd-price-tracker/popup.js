// popup.js - Handles the popup UI

async function loadTrackedProducts() {
  const result = await chrome.storage.local.get('trackedProducts');
  const tracked = result.trackedProducts || {};
  
  const trackedList = document.getElementById('tracked-list');
  const emptyState = document.getElementById('empty-state');
  
  if (Object.keys(tracked).length === 0) {
    trackedList.style.display = 'none';
    emptyState.style.display = 'block';
    return;
  }
  
  trackedList.style.display = 'flex';
  emptyState.style.display = 'none';
  trackedList.innerHTML = '';
  
  // Sort by most recent update
  const products = Object.entries(tracked).sort((a, b) => {
    const aLatest = a[1].priceHistory[a[1].priceHistory.length - 1].timestamp;
    const bLatest = b[1].priceHistory[b[1].priceHistory.length - 1].timestamp;
    return bLatest - aLatest;
  });
  
  products.forEach(([url, product]) => {
    const card = createProductCard(url, product);
    trackedList.appendChild(card);
  });
}

function createProductCard(url, product) {
  const prices = product.priceHistory.map(p => p.price);
  const currentPrice = prices[prices.length - 1];
  const lowestPrice = Math.min(...prices);
  const highestPrice = Math.max(...prices);
  
  const card = document.createElement('div');
  card.className = 'product-card';
  
  card.innerHTML = `
    <div class="product-title">${product.title}</div>
    <div class="product-stats">
      <div class="stat-item">
        <span class="stat-label">Current</span>
        <span class="stat-value current">$${currentPrice.toFixed(2)}</span>
      </div>
      <div class="stat-item">
        <span class="stat-label">Lowest</span>
        <span class="stat-value lowest">$${lowestPrice.toFixed(2)}</span>
      </div>
      <div class="stat-item">
        <span class="stat-label">Highest</span>
        <span class="stat-value">$${highestPrice.toFixed(2)}</span>
      </div>
    </div>
    <div class="product-actions">
      <button class="btn-small btn-view" data-url="${url}">View Product</button>
      <button class="btn-small btn-remove" data-url="${url}">Remove</button>
    </div>
  `;
  
  // Add event listeners
  card.querySelector('.btn-view').addEventListener('click', () => {
    chrome.tabs.create({ url: url });
  });
  
  card.querySelector('.btn-remove').addEventListener('click', async () => {
    await removeProduct(url);
    await loadTrackedProducts();
  });
  
  return card;
}

async function removeProduct(url) {
  const result = await chrome.storage.local.get('trackedProducts');
  const tracked = result.trackedProducts || {};
  delete tracked[url];
  await chrome.storage.local.set({ trackedProducts: tracked });
}

async function clearAll() {
  if (confirm('Are you sure you want to remove all tracked products?')) {
    await chrome.storage.local.set({ trackedProducts: {} });
    await loadTrackedProducts();
  }
}

function exportData() {
  chrome.storage.local.get('trackedProducts', (result) => {
    const tracked = result.trackedProducts || {};
    const dataStr = JSON.stringify(tracked, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = `4wd-price-tracker-${Date.now()}.json`;
    link.click();
    
    URL.revokeObjectURL(url);
  });
}

// Event listeners
document.addEventListener('DOMContentLoaded', () => {
  loadTrackedProducts();
  
  document.getElementById('clear-all-btn').addEventListener('click', clearAll);
  document.getElementById('export-btn').addEventListener('click', exportData);
});
