(() => {
  const normalize = (value) => value.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

  function initializeTheme() {
    const buttons = document.querySelectorAll(".theme-toggle, .mobile-theme-toggle");
    const updateLabels = () => {
      const current = document.documentElement.dataset.theme || "dark";
      buttons.forEach((button) => {
        const label = current === "dark" ? "Switch to light theme" : "Switch to dark theme";
        button.setAttribute("aria-label", label);
        button.setAttribute("title", label);
        if (button.classList.contains("mobile-theme-toggle")) button.textContent = label;
      });
    };

    updateLabels();
    buttons.forEach((button) => {
      button.addEventListener("click", () => {
        const current = document.documentElement.dataset.theme || "dark";
        const next = current === "dark" ? "light" : "dark";
        document.documentElement.dataset.theme = next;
        try {
          localStorage.setItem("penguin-coders-theme", next);
        } catch (error) {
          console.warn("Theme preference could not be saved.", error);
        }
        updateLabels();
      });
    });
  }

  function initializeNavigation() {
    document.querySelectorAll(".mobile-nav__panel a").forEach((link) => {
      link.addEventListener("click", () => {
        const menu = link.closest(".mobile-nav");
        if (menu) menu.open = false;
      });
    });
  }

  function initializeArticleSearch() {
    const list = document.querySelector("#article-list");
    const input = document.querySelector("#article-search");
    if (!list || !input) return;

    const cards = Array.from(list.querySelectorAll("[data-article-card]"));
    const topicButtons = Array.from(document.querySelectorAll("[data-topic-filter]"));
    const tagFilter = document.querySelector("#tag-filter");
    const status = document.querySelector("#search-status");
    const noResults = document.querySelector("#no-results");
    const pagination = document.querySelector("#pagination-controls");
    const previousButton = pagination?.querySelector("[data-page-previous]");
    const nextButton = pagination?.querySelector("[data-page-next]");
    const pageIndicator = pagination?.querySelector("[data-page-indicator]");
    const pageSize = 6;
    const params = new URLSearchParams(window.location.search);
    let activeTopic = normalize(params.get("topic") || "");
    let activeTag = normalize(params.get("tag") || "");
    let currentPage = 1;

    input.value = params.get("q") || "";
    if (tagFilter && Array.from(tagFilter.options).some((option) => option.value === activeTag)) {
      tagFilter.value = activeTag;
    } else {
      activeTag = "";
    }

    const updateTopicButtons = () => {
      topicButtons.forEach((button) => {
        const selected = button.dataset.topicFilter === activeTopic;
        button.classList.toggle("is-active", selected);
        button.setAttribute("aria-pressed", String(selected));
      });
    };

    const updateAddress = () => {
      const updated = new URL(window.location.href);
      updated.searchParams.delete("focus");
      ["q", "topic", "tag"].forEach((key) => updated.searchParams.delete(key));
      if (input.value.trim()) updated.searchParams.set("q", input.value.trim());
      if (activeTopic) updated.searchParams.set("topic", activeTopic);
      if (activeTag) updated.searchParams.set("tag", activeTag);
      const query = updated.searchParams.toString();
      window.history.replaceState({}, "", `${updated.pathname}${query ? `?${query}` : ""}${updated.hash}`);
    };

    const render = () => {
      const query = input.value.toLowerCase().trim();
      const matches = cards.filter((card) => {
        const matchesText = !query || card.dataset.search.includes(query);
        const matchesTopic = !activeTopic || card.dataset.topic === activeTopic;
        const tags = (card.dataset.tags || "").split(/\s+/);
        const matchesTag = !activeTag || tags.includes(activeTag);
        return matchesText && matchesTopic && matchesTag;
      });
      const pageCount = Math.max(1, Math.ceil(matches.length / pageSize));
      currentPage = Math.min(currentPage, pageCount);
      const visibleStart = (currentPage - 1) * pageSize;
      const visibleCards = new Set(matches.slice(visibleStart, visibleStart + pageSize));
      cards.forEach((card) => {
        card.hidden = !visibleCards.has(card);
      });
      if (status) {
        const countLabel = `${matches.length} ${matches.length === 1 ? "article" : "articles"}`;
        status.textContent = query || activeTopic || activeTag
          ? `${countLabel} found`
          : countLabel;
      }
      if (noResults) noResults.hidden = matches.length > 0;
      if (pagination) pagination.hidden = pageCount <= 1;
      if (pageIndicator) pageIndicator.textContent = `Page ${currentPage} of ${pageCount}`;
      if (previousButton) previousButton.disabled = currentPage <= 1;
      if (nextButton) nextButton.disabled = currentPage >= pageCount;
      updateTopicButtons();
      updateAddress();
    };

    input.addEventListener("input", () => {
      currentPage = 1;
      render();
    });
    topicButtons.forEach((button) => {
      button.addEventListener("click", () => {
        activeTopic = button.dataset.topicFilter || "";
        currentPage = 1;
        render();
      });
    });
    tagFilter?.addEventListener("change", () => {
      activeTag = tagFilter.value;
      currentPage = 1;
      render();
    });
    document.querySelector("#clear-filters")?.addEventListener("click", () => {
      input.value = "";
      activeTopic = "";
      activeTag = "";
      if (tagFilter) tagFilter.value = "";
      currentPage = 1;
      render();
      input.focus();
    });
    previousButton?.addEventListener("click", () => {
      currentPage = Math.max(1, currentPage - 1);
      render();
    });
    nextButton?.addEventListener("click", () => {
      currentPage += 1;
      render();
    });
    document.addEventListener("keydown", (event) => {
      const target = event.target;
      const isTyping = target instanceof HTMLElement
        && (target.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName));
      if (event.key === "/" && !isTyping && !event.metaKey && !event.ctrlKey && !event.altKey) {
        event.preventDefault();
        input.focus();
      }
      if (event.key === "Escape" && target === input) {
        input.value = "";
        currentPage = 1;
        render();
        input.blur();
      }
    });

    render();
    if (params.get("focus") === "search") input.focus({ preventScroll: true });
  }

  function initializeTableOfContents() {
    const article = document.querySelector(".article-body");
    const toc = document.querySelector("#article-toc");
    if (!article || !toc) return;

    const headings = Array.from(article.querySelectorAll("h2, h3"));
    if (headings.length < 2) return;

    const list = toc.querySelector("ol");
    const usedIds = new Set();
    headings.forEach((heading) => {
      if (!heading.id) {
        const base = normalize(heading.textContent);
        let id = base;
        let suffix = 2;
        while (usedIds.has(id) || document.getElementById(id)) {
          id = `${base}-${suffix}`;
          suffix += 1;
        }
        heading.id = id;
      }
      usedIds.add(heading.id);
      const item = document.createElement("li");
      if (heading.tagName === "H3") item.classList.add("article-toc__subitem");
      const link = document.createElement("a");
      link.href = `#${heading.id}`;
      link.textContent = heading.textContent;
      item.append(link);
      list.append(item);
    });
    toc.hidden = false;
  }

  function initializeReadingProgress() {
    const article = document.querySelector(".article-body");
    const progress = document.querySelector(".reading-progress > span");
    if (!article || !progress) return;

    let scheduled = false;
    const update = () => {
      const bounds = article.getBoundingClientRect();
      const articleTop = window.scrollY + bounds.top;
      const scrollable = Math.max(1, article.offsetHeight - window.innerHeight * 0.35);
      const percentage = Math.min(100, Math.max(0, ((window.scrollY - articleTop + window.innerHeight * 0.2) / scrollable) * 100));
      progress.style.width = `${percentage}%`;
      scheduled = false;
    };
    const scheduleUpdate = () => {
      if (!scheduled) {
        scheduled = true;
        window.requestAnimationFrame(update);
      }
    };
    window.addEventListener("scroll", scheduleUpdate, { passive: true });
    window.addEventListener("resize", scheduleUpdate);
    update();
  }

  async function copyText(text) {
    if (!navigator.clipboard?.writeText) {
      throw new Error("Clipboard access is unavailable in this browser.");
    }
    await navigator.clipboard.writeText(text);
  }

  function initializeCopyButtons() {
    document.querySelectorAll(".article-body pre").forEach((pre) => {
      const container = pre.parentElement;
      if (!container || container.querySelector(".copy-code-button")) return;
      const button = document.createElement("button");
      button.type = "button";
      button.className = "copy-code-button";
      button.textContent = "Copy";
      button.addEventListener("click", async () => {
        try {
          await copyText(pre.innerText);
          button.textContent = "Copied";
        } catch (error) {
          console.error("Could not copy this code block.", error);
          button.textContent = "Copy failed";
        }
        window.setTimeout(() => {
          button.textContent = "Copy";
        }, 1800);
      });
      container.append(button);
    });

    document.querySelectorAll("[data-copy-link]").forEach((button) => {
      button.addEventListener("click", async () => {
        try {
          await copyText(button.dataset.copyLink);
          button.textContent = "Link copied";
        } catch (error) {
          console.error("Could not copy the article link.", error);
          button.textContent = "Copy failed";
        }
        window.setTimeout(() => {
          button.textContent = "Copy link";
        }, 1800);
      });
    });
  }

  function initializeFigureCaptions() {
    document.querySelectorAll(".article-body p > img[title]").forEach((image) => {
      const captionText = image.getAttribute("title");
      const paragraph = image.parentElement;
      if (!captionText || !paragraph) return;

      const figure = document.createElement("figure");
      const caption = document.createElement("figcaption");
      caption.textContent = captionText;
      image.removeAttribute("title");
      paragraph.replaceWith(figure);
      figure.append(image, caption);
    });
  }

  function initialize() {
    initializeTheme();
    initializeNavigation();
    initializeArticleSearch();
    initializeTableOfContents();
    initializeReadingProgress();
    initializeFigureCaptions();
    initializeCopyButtons();
  }

  document.addEventListener("DOMContentLoaded", initialize);
})();
