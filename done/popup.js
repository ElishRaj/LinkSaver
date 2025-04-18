document.addEventListener("DOMContentLoaded", function () {
  const nameInput = document.getElementById("nameInput");
  const urlInput = document.getElementById("urlInput");
  const saveButton = document.getElementById("saveButton");
  const linksContainer = document.getElementById("linksContainer");
  const underlineAnimate = document.getElementById("underlineAnimate");

  // Load existing links
  loadLinks();

  // Get current tab URL
  chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
    if (tabs[0]) {
      const url = tabs[0].url;
      urlInput.value = url;
      // Auto-fill name from page title
      nameInput.value = tabs[0].title || "";
    }
  });

  saveButton.addEventListener("click", saveLink);

  // Enter key support
  [nameInput, urlInput].forEach((input) => {
    input.addEventListener("keypress", function (e) {
      if (e.key === "Enter") saveLink();
    });
  });

  function saveLink() {
    const name = nameInput.value.trim();
    const url = urlInput.value.trim();

    if (!name || !url) {
      showToast("Please enter both name and URL");
      return;
    }

    if (!isValidUrl(url)) {
      showToast("Please enter a valid URL");
      return;
    }

    chrome.storage.sync.get(["links"], function (result) {
      const links = result.links || [];
      links.push({
        name,
        url,
        favicon: getFaviconUrl(url),
        timestamp: Date.now(),
      });

      chrome.storage.sync.set({ links }, function () {
        loadLinks();
        nameInput.value = "";
        urlInput.value = "";
        showToast("Link saved successfully");
      });
    });
  }

  function loadLinks() {
    chrome.storage.sync.get(["links"], function (result) {
      const links = result.links || [];
      linksContainer.innerHTML = "";

      if (links.length === 0) {
        showEmptyState();
        return;
      }

      // Sort by most recent first
      links.sort((a, b) => b.timestamp - a.timestamp);

      links.forEach((link, index) => {
        const linkElement = createLinkElement(link, index);
        linksContainer.appendChild(linkElement);
      });
    });
  }

  function createLinkElement(link, index) {
    const div = document.createElement("div");
    div.className = "link-item";

    const favicon = document.createElement("img");
    favicon.className = "favicon";
    favicon.src = link.favicon || getFaviconUrl(link.url);
    favicon.onerror = function () {
      this.src =
        'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><text y=".9em" font-size="90">🔗</text></svg>';
    };

    const details = document.createElement("div");
    details.className = "link-details";

    const name = document.createElement("div");
    name.className = "link-name";
    name.textContent = link.name;

    const url = document.createElement("div");
    url.className = "link-url";
    url.textContent = link.url;

    const deleteBtn = document.createElement("button");
    deleteBtn.className = "delete-button";
    deleteBtn.innerHTML = `
      <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M4 7H20M10 11V17M14 11V17M5 7L6 19C6 19.5304 6.21071 20.0391 6.58579 20.4142C6.96086 20.7893 7.46957 21 8 21H16C16.5304 21 17.0391 20.7893 17.4142 20.4142C17.7893 20.0391 18 19.5304 18 19L19 7M9 7V4C9 3.73478 9.10536 3.48043 9.29289 3.29289C9.48043 3.10536 9.73478 3 10 3H14C14.2652 3 14.5196 3.10536 14.7071 3.29289C14.8946 3.48043 15 3.73478 15 4V7" 
              stroke="#dc2626" 
              stroke-width="1.5" 
              stroke-linecap="round" 
              stroke-linejoin="round"/>
      </svg>
    `;

    deleteBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      deleteBtn.classList.add("clicked");

      // Trigger underline animation
      underlineAnimate.classList.add("active");
      setTimeout(() => {
        underlineAnimate.classList.remove("active");
      }, 600);

      div.classList.add("deleting");
      setTimeout(() => {
        div.remove();
        deleteLink(index);
        // Check if we need to show empty state
        if (linksContainer.children.length === 0) {
          showEmptyState();
        }
      }, 300);
    });

    details.appendChild(name);
    details.appendChild(url);
    div.appendChild(favicon);
    div.appendChild(details);
    div.appendChild(deleteBtn);

    div.onclick = function (e) {
      if (e.target !== deleteBtn && !deleteBtn.contains(e.target)) {
        chrome.tabs.create({ url: link.url });
      }
    };

    return div;
  }

  function deleteLink(index) {
    chrome.storage.sync.get(["links"], function (result) {
      const links = result.links || [];
      links.splice(index, 1);
      chrome.storage.sync.set({ links }, loadLinks);
    });
  }

  function isValidUrl(string) {
    try {
      new URL(string);
      return true;
    } catch (_) {
      return false;
    }
  }

  function getFaviconUrl(url) {
    try {
      const urlObj = new URL(url);
      return `https://www.google.com/s2/favicons?sz=64&domain=${urlObj.hostname}`;
    } catch {
      return 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><text y=".9em" font-size="90">🔗</text></svg>';
    }
  }

  function showEmptyState() {
    linksContainer.innerHTML = `
      <div class="empty-state">
        No saved links yet. Add your first link above!
      </div>
    `;
  }

  function showToast(message) {
    const toast = document.createElement("div");
    toast.style.cssText = `
      position: fixed;
      bottom: 16px;
      left: 50%;
      transform: translateX(-50%);
      background: #1f2937;
      color: white;
      padding: 8px 16px;
      border-radius: 6px;
      font-size: 14px;
      z-index: 1000;
      opacity: 0;
      transition: opacity 0.3s ease;
    `;
    toast.textContent = message;
    document.body.appendChild(toast);

    setTimeout(() => (toast.style.opacity = "1"), 10);
    setTimeout(() => {
      toast.style.opacity = "0";
      setTimeout(() => toast.remove(), 300);
    }, 1700);
  }
});
