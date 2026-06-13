const productName = document.getElementById("productName");
const productCost = document.getElementById("productCost");
const productStock = document.getElementById("productStock");
const productImageInput = document.getElementById("productImage");
const addProductBtn = document.getElementById("addProductBtn");
const clearBtn = document.getElementById("clearBtn");
const exportBtn = document.getElementById("exportBtn");
const importBtn = document.getElementById("importBtn");
const exportExcelBtn = document.getElementById("exportExcelBtn");
const importFileInput = document.getElementById("importFileInput");
const productTableBody = document.getElementById("productTableBody");
const totalItems = document.getElementById("totalItems");
const totalStock = document.getElementById("totalStock");
const totalCost = document.getElementById("totalCost");
const searchInput = document.getElementById("searchInput");
const prevPageBtn = document.getElementById("prevPageBtn");
const nextPageBtn = document.getElementById("nextPageBtn");
const pageInfo = document.getElementById("pageInfo");
const resultInfo = document.getElementById("resultInfo");
const imageModal = document.getElementById("imageModal");
const modalImage = document.getElementById("modalImage");
const closeImageModal = document.getElementById("closeImageModal");
const confirmModal = document.getElementById("confirmModal");
const confirmMessage = document.getElementById("confirmMessage");
const confirmYesBtn = document.getElementById("confirmYes");
const confirmNoBtn = document.getElementById("confirmNo");

const STORAGE_KEY = "trendystok_products";
const ITEMS_PER_PAGE = 5;
let products = [];
let currentPage = 1;
let selectedImageData = null;
let pendingRemoveIndex = null;

// Ensure modals are hidden on startup
if (imageModal) {
  imageModal.hidden = true;
}
if (confirmModal) {
  confirmModal.hidden = true;
}

function formatCurrency(value) {
  return new Intl.NumberFormat("tr-TR", {
    style: "currency",
    currency: "TRY",
    minimumFractionDigits: 2,
  }).format(value);
}

async function saveProducts() {
  if (window.electronAPI?.saveProducts) {
    const result = await window.electronAPI.saveProducts(products);
    if (!result?.success) {
      console.warn("Dosyaya kaydetme sırasında hata oluştu:", result?.error);
    }
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(products));
}

async function loadProducts() {
  if (window.electronAPI?.loadProducts) {
    try {
      const fileProducts = await window.electronAPI.loadProducts();
      if (Array.isArray(fileProducts)) {
        products = fileProducts.map((item) => ({
          name: item.name || "",
          cost: Number(item.cost) || 0,
          stock: Number(item.stock) || 0,
          image: item.image || null,
        }));
        return;
      }
    } catch (error) {
      console.warn("Dosyadan yükleme sırasında hata oluştu:", error);
    }
  }

  const stored = localStorage.getItem(STORAGE_KEY);
  if (!stored) return;

  try {
    const parsed = JSON.parse(stored);
    if (Array.isArray(parsed)) {
      products = parsed.map((item) => ({
        name: item.name || "",
        cost: Number(item.cost) || 0,
        stock: Number(item.stock) || 0,
        image: item.image || null,
      }));
    }
  } catch (error) {
    console.warn("Stok verisi yüklenirken hata oluştu:", error);
  }
}

function downloadJsonFile(filename, data) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}

async function exportProducts() {
  if (window.electronAPI?.exportProducts) {
    const result = await window.electronAPI.exportProducts(products);
    if (result?.success) {
      alert(`Yedek dosyası kaydedildi:\n${result.path}`);
    } else if (result?.error !== "canceled") {
      alert(`Yedek dışa aktarılırken hata oluştu: ${result.error}`);
    }
  } else {
    downloadJsonFile("stok-yedek.json", products);
  }
}

function exportAllToExcel() {
  if (!products || products.length === 0) {
    alert("Aktarılacak stok bulunmuyor.");
    return;
  }
  // Build an array-of-arrays for SheetJS
  const aoa = [];
  aoa.push(["Ürün Adı", "Birim Maliyet", "Stok Adetleri", "Toplam Değer"]);

  products.forEach((p) => {
    const name = (p.name || "").replace(/\t|\n|\r/g, " ");
    const costNum = Number(p.cost || 0);
    const stockNum = Number(p.stock || 0);
    const totalNum = +(costNum * stockNum);
    aoa.push([name, costNum, stockNum, totalNum]);
  });

  const ws = XLSX.utils.aoa_to_sheet(aoa);
  // Apply Turkish Lira currency format to "Birim Maliyet" (col B) and "Toplam Değer" (col D)
  // SheetJS expects cell objects; set numeric type and format (z) for each data row
  for (let row = 2; row <= aoa.length; row++) {
    const costCell = `B${row}`;
    const totalCell = `D${row}`;
    if (ws[costCell]) {
      ws[costCell].t = 'n';
      ws[costCell].z = '₺#,##0.00';
    }
    if (ws[totalCell]) {
      ws[totalCell].t = 'n';
      ws[totalCell].z = '₺#,##0.00';
    }
  }
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Stok");
  const wbout = XLSX.write(wb, { bookType: "xlsx", type: "array" });
  const blob = new Blob([wbout], { type: "application/octet-stream" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "tum-stok.xlsx";
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

async function importProducts() {
  if (window.electronAPI?.importProducts) {
    const result = await window.electronAPI.importProducts();
    if (result?.success && Array.isArray(result.products)) {
      products = result.products.map((item) => ({
        name: item.name || "",
        cost: Number(item.cost) || 0,
        stock: Number(item.stock) || 0,
        image: item.image || null,
      }));
      renderTable();
      alert("Yedek dosyası başarıyla yüklendi.");
    } else if (result?.error && result.error !== "canceled") {
      alert(`Yedekten yükleme sırasında hata oluştu: ${result.error}`);
    }
  } else {
    importFileInput.click();
  }
}

importFileInput.addEventListener("change", async (event) => {
  const file = event.target.files?.[0];
  if (!file) return;

  try {
    const text = await file.text();
    const parsed = JSON.parse(text);
    if (!Array.isArray(parsed)) {
      throw new Error("Geçersiz yedek dosyası formatı.");
    }
    products = parsed.map((item) => ({
      name: item.name || "",
      cost: Number(item.cost) || 0,
      stock: Number(item.stock) || 0,
    }));
    renderTable();
    alert("Yedek dosyası başarıyla yüklendi.");
  } catch (error) {
    alert(`Yedekten yükleme sırasında hata oluştu: ${error.message}`);
  } finally {
    importFileInput.value = "";
  }
});

function getFilteredItems() {
  const query = searchInput.value.trim().toLowerCase();
  return products
    .map((item, index) => ({ item, index }))
    .filter(({ item }) => item.name.toLowerCase().includes(query));
}

function updateSummary() {
  const itemCount = products.length;
  const stockSum = products.reduce((sum, item) => sum + item.stock, 0);
  const costSum = products.reduce((sum, item) => sum + item.stock * item.cost, 0);

  totalItems.textContent = itemCount;
  totalStock.textContent = stockSum;
  totalCost.textContent = formatCurrency(costSum);
}

function renderPagination(filteredCount, totalPages) {
  pageInfo.textContent = `Sayfa ${currentPage} / ${totalPages}`;
  resultInfo.textContent = `${filteredCount} sonuç bulundu`;
  prevPageBtn.disabled = currentPage <= 1;
  nextPageBtn.disabled = currentPage >= totalPages;
}

function renderTable() {
  const filteredItems = getFilteredItems();
  const totalPages = Math.max(1, Math.ceil(filteredItems.length / ITEMS_PER_PAGE));
  if (currentPage > totalPages) {
    currentPage = totalPages;
  }

  const start = (currentPage - 1) * ITEMS_PER_PAGE;
  const pageItems = filteredItems.slice(start, start + ITEMS_PER_PAGE);

  productTableBody.innerHTML = "";

  pageItems.forEach(({ item, index }) => {
    const row = document.createElement("tr");

    const nameCell = document.createElement("td");
    if (item.image) {
      const thumbWrapper = document.createElement("div");
      thumbWrapper.className = "thumbnail-cell";

      const thumbImage = document.createElement("img");
      thumbImage.className = "thumb-image";
      thumbImage.src = item.image;
      thumbImage.alt = item.name;
      thumbImage.addEventListener("click", () => openImageModal(item.image));

      const nameText = document.createElement("span");
      nameText.textContent = item.name;

      thumbWrapper.appendChild(thumbImage);
      thumbWrapper.appendChild(nameText);
      nameCell.appendChild(thumbWrapper);
    } else {
      nameCell.textContent = item.name;
    }

    const costCell = document.createElement("td");
    costCell.textContent = formatCurrency(item.cost);
    costCell.textContent = formatCurrency(item.cost);

    const stockCell = document.createElement("td");
    stockCell.textContent = item.stock;

    const valueCell = document.createElement("td");
    valueCell.textContent = formatCurrency(item.stock * item.cost);

    const actionsCell = document.createElement("td");
    const btnGroup = document.createElement("div");
    btnGroup.className = "action-buttons";

    const minusBtn = document.createElement("button");
    minusBtn.className = "button-remove";
    minusBtn.textContent = "-";
    minusBtn.title = "Stok azalt";
    minusBtn.addEventListener("click", () => {
      changeStock(index, -1);
    });

    const plusBtn = document.createElement("button");
    plusBtn.className = "button-add";
    plusBtn.textContent = "+";
    plusBtn.title = "Stok arttır";
    plusBtn.addEventListener("click", () => {
      changeStock(index, 1);
    });

    const deleteBtn = document.createElement("button");
    deleteBtn.className = "button-delete";
    deleteBtn.textContent = "Stoktan Kaldır";
    deleteBtn.title = "Stoktaki ürünü sil";
    deleteBtn.addEventListener("click", () => {
      requestRemoveProduct(index, item.name);
    });

    btnGroup.appendChild(minusBtn);
    btnGroup.appendChild(plusBtn);
    btnGroup.appendChild(deleteBtn);
    actionsCell.appendChild(btnGroup);

    row.appendChild(nameCell);
    row.appendChild(costCell);
    row.appendChild(stockCell);
    row.appendChild(valueCell);
    row.appendChild(actionsCell);

    productTableBody.appendChild(row);
  });

  updateSummary();
  renderPagination(filteredItems.length, totalPages);
  saveProducts();
}

function changeStock(index, diff) {
  const newStock = products[index].stock + diff;
  products[index].stock = Math.max(0, newStock);
  renderTable();
}

function requestRemoveProduct(index, name) {
  pendingRemoveIndex = index;
  if (confirmMessage) {
    confirmMessage.textContent = name
      ? `"${name}" ürününü stoktan kaldırmak istediğinizden emin misiniz?`
      : "Bu ürünü stoktan kaldırmak istediğinizden emin misiniz?";
  }
  if (confirmModal) {
    confirmModal.hidden = false;
  } else {
    if (window.confirm(`"${name}" ürününü stoktan kaldırmak istediğinizden emin misiniz?`)) {
      removeProduct(index);
    }
  }
}

function removeProduct(index) {
  if (index === null || index === undefined) return;
  products.splice(index, 1);
  pendingRemoveIndex = null;
  renderTable();
}

function closeConfirmModal() {
  pendingRemoveIndex = null;
  if (confirmModal) {
    confirmModal.hidden = true;
  }
}

function openImageModal(imageSrc) {
  // Only open modal when a valid image source is provided
  if (!imageSrc) return;
  modalImage.src = imageSrc;
  imageModal.hidden = false;
}

function closeModal() {
  imageModal.hidden = true;
  modalImage.src = "";
}

function clearForm() {
  productName.value = "";
  productCost.value = "";
  productStock.value = "";
  productName.focus();
}

function addProduct() {
  const name = productName.value.trim();
  const cost = Number(productCost.value.replace(",", "."));
  const stock = Number(productStock.value);

  if (!name) {
    alert("Lütfen ürün adını girin.");
    productName.focus();
    return;
  }
  if (!cost || cost <= 0) {
    alert("Lütfen geçerli bir maliyet girin.");
    productCost.focus();
    return;
  }
  if (!Number.isInteger(stock) || stock < 0) {
    alert("Stok miktarı pozitif bir tam sayı olmalıdır.");
    productStock.focus();
    return;
  }

  // Prevent adding a product with the same name (case-insensitive)
  const exists = products.some((p) => (p.name || "").trim().toLowerCase() === name.toLowerCase());
  if (exists) {
    alert("Bu üründen stok listende mevcut.");
    productName.focus();
    return;
  }

  // Add new item to the front so newest items show first
  products.unshift({
    name,
    cost,
    stock,
    image: selectedImageData,
  });

  selectedImageData = null;
  productImageInput.value = "";

  // Show the newest items at the top (page 1)
  currentPage = 1;
  renderTable();
  clearForm();
}

function changePage(diff) {
  currentPage += diff;
  renderTable();
}

addProductBtn.addEventListener("click", addProduct);
clearBtn.addEventListener("click", clearForm);
exportBtn.addEventListener("click", exportProducts);
importBtn.addEventListener("click", importProducts);
if (exportExcelBtn) exportExcelBtn.addEventListener("click", exportAllToExcel);
productImageInput.addEventListener("change", (event) => {
  const file = event.target.files?.[0];
  if (!file) {
    selectedImageData = null;
    return;
  }
  const reader = new FileReader();
  reader.onload = () => {
    selectedImageData = reader.result;
  };
  reader.readAsDataURL(file);
});
imageModal.addEventListener("click", (event) => {
  if (event.target === imageModal || event.target === closeImageModal) {
    closeModal();
  }
});
closeImageModal.addEventListener("click", closeModal);

if (confirmModal) {
  confirmModal.addEventListener("click", (event) => {
    if (event.target === confirmModal) {
      closeConfirmModal();
    }
  });
}
if (confirmYesBtn) {
  confirmYesBtn.addEventListener("click", () => {
    if (pendingRemoveIndex !== null && pendingRemoveIndex !== undefined) {
      removeProduct(pendingRemoveIndex);
    }
    closeConfirmModal();
  });
}
if (confirmNoBtn) {
  confirmNoBtn.addEventListener("click", closeConfirmModal);
}

searchInput.addEventListener("input", () => {
  currentPage = 1;
  renderTable();
});
prevPageBtn.addEventListener("click", () => changePage(-1));
nextPageBtn.addEventListener("click", () => changePage(1));

productCost.addEventListener("input", () => {
  if (/[^0-9.,]/.test(productCost.value)) {
    productCost.value = productCost.value.replace(/[^0-9.,]/g, "");
  }
});

productStock.addEventListener("input", () => {
  productStock.value = productStock.value.replace(/[^0-9]/g, "");
});

loadProducts().then(() => {
  renderTable();
});
