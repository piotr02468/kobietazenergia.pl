  function scrollToContact() {
    const kontakt = document.getElementById("kontakt");
    if (kontakt) {
      kontakt.scrollIntoView({ behavior: "smooth" });
    }
  }

  const API_BASE = "https://kobietazenergia-pl.onrender.com";
  let publicConfig = null;
  let publicConfigPromise = null;

  async function loadPublicConfig() {
    const res = await fetch(`${API_BASE}/public-config`);
    if (!res.ok) {
      throw new Error("Nie udało się pobrać konfiguracji formularza.");
    }

    const config = await res.json();
    publicConfig = {
      opinionsApiKey: String(config.opinionsApiKey || "").trim(),
      minOpinionLength: Number(config.minOpinionLength) || 0
    };

    return publicConfig;
  }

  async function ensurePublicConfig() {
    if (publicConfig) {
      return publicConfig;
    }

    if (!publicConfigPromise) {
      publicConfigPromise = loadPublicConfig().catch((err) => {
        publicConfigPromise = null;
        throw err;
      });
    }

    return publicConfigPromise;
  }

  // Canvas animation for electricity flow
  const canvas = document.getElementById("bg-canvas");
  if (canvas) {
    const ctx = canvas.getContext("2d");

    function resizeCanvas() {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    }

    resizeCanvas();
    window.addEventListener("resize", resizeCanvas);

    class Particle {
      constructor() {
        this.x = Math.random() * canvas.width;
        this.y = Math.random() * canvas.height;
        this.vx = (Math.random() - 0.5) * 2;
        this.vy = (Math.random() - 0.5) * 2;
        this.size = Math.random() * 3 + 1;
        this.alpha = Math.random() * 0.5 + 0.5;
      }

      update() {
        this.x += this.vx;
        this.y += this.vy;

        if (this.x < 0 || this.x > canvas.width) this.vx *= -1;
        if (this.y < 0 || this.y > canvas.height) this.vy *= -1;

        this.alpha -= 0.005;
        if (this.alpha <= 0) {
          this.x = Math.random() * canvas.width;
          this.y = Math.random() * canvas.height;
          this.alpha = Math.random() * 0.5 + 0.5;
        }
      }

      draw() {
        ctx.globalAlpha = this.alpha;
        ctx.fillStyle = "#D4AF37";
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    const particles = [];
    for (let i = 0; i < 100; i++) {
      particles.push(new Particle());
    }

    function animate() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      particles.forEach((particle) => {
        particle.update();
        particle.draw();
      });
      requestAnimationFrame(animate);
    }

    animate();
  }

  if (window.AOS) {
    AOS.init({ duration: 800, easing: "ease-in-out" });
  }

  function getAdminPassword() {
    return sessionStorage.getItem("adminPassword") || "";
  }

  function adminHeaders() {
    return {
      "Content-Type": "application/json",
      "x-admin-password": getAdminPassword()
    };
  }

  function renderOpinionCard(opinion) {
    const stars = "⭐".repeat(Number(opinion.rating) || 5);
    return `
      <div class="card">
        <div class="card-stars">${stars}</div>
        <p>"${opinion.text}"</p>
        <span>- ${opinion.name}</span>
      </div>
    `;
  }

  async function loadAllOpinions() {
    const container = document.getElementById("opinieList");
    if (!container) return;

    try {
      const res = await fetch(`${API_BASE}/opinie`);
      const data = await res.json();

      if (!Array.isArray(data) || !data.length) {
        container.innerHTML = '<div class="card">Brak opinii do wyświetlenia.</div>';
        return;
      }

      container.innerHTML = data.map(renderOpinionCard).join("");
    } catch (err) {
      container.innerHTML = '<div class="card">Nie udało się pobrać opinii.</div>';
    }
  }

  async function loadFeaturedOpinions() {
    const section = document.getElementById("homeOpinionsSection");
    const heading = document.getElementById("homeOpinionsHeading");
    const container = document.getElementById("featuredOpinieList");
    if (!container) return;

    try {
      const res = await fetch(`${API_BASE}/opinie/wyroznione`);
      const data = await res.json();

      if (!Array.isArray(data) || !data.length) {
        container.innerHTML = "";
        if (section) section.classList.add("home-opinions-empty");
        if (heading) heading.setAttribute("aria-hidden", "true");
        return;
      }

      if (section) section.classList.remove("home-opinions-empty");
      if (heading) heading.removeAttribute("aria-hidden");
      container.innerHTML = data.map(renderOpinionCard).join("");
    } catch (err) {
      container.innerHTML = "";
      if (section) section.classList.add("home-opinions-empty");
      if (heading) heading.setAttribute("aria-hidden", "true");
    }
  }

  loadAllOpinions();
  loadFeaturedOpinions();

  // OPINIE - dodawanie
  const opinionForm = document.getElementById("form");
  if (opinionForm) {
    opinionForm.addEventListener("submit", async (e) => {
      e.preventDefault();

      const nameInput = document.getElementById("name");
      const textInput = document.getElementById("text");
      const ratingInput = document.getElementById("rating");
      let opinionsApiKey = "";

      try {
        const config = await ensurePublicConfig();
        opinionsApiKey = config.opinionsApiKey;
      } catch (err) {
        alert("Formularz opinii jest chwilowo niedostępny.");
        return;
      }

      if (!opinionsApiKey) {
        alert("Formularz opinii nie jest jeszcze skonfigurowany.");
        return;
      }

      const res = await fetch(`${API_BASE}/opinie`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": opinionsApiKey
        },
        body: JSON.stringify({
          name: nameInput.value,
          text: textInput.value,
          rating: ratingInput.value
        })
      });

      if (!res.ok) {
        let message = "Nie udało się dodać opinii.";
        try {
          const errorData = await res.json();
          if (errorData && errorData.message) {
            message = errorData.message;
          }
        } catch (err) {
          // Ignore JSON parse errors and keep generic message.
        }
        alert(message);
        return;
      }

      opinionForm.reset();
      loadAllOpinions();
      alert("Dziękujemy. Opinia została dodana i jest już widoczna na stronie.");
    });
  }

  // ADMIN - logowanie i zarządzanie opiniami
  function showAdminPanel(isVisible) {
    const loginBox = document.getElementById("adminLoginBox");
    const panel = document.getElementById("adminPanel");

    if (!loginBox || !panel) return;

    loginBox.style.display = isVisible ? "none" : "block";
    panel.style.display = isVisible ? "block" : "none";
  }

  async function loadAdmin() {
    const container = document.getElementById("adminOpinie");
    if (!container) return;

    const res = await fetch(`${API_BASE}/admin/opinie`, {
      headers: adminHeaders()
    });

    if (res.status === 401) {
      showAdminPanel(false);
      return;
    }

    const data = await res.json();

    if (!data.length) {
      container.innerHTML = '<div class="card">Brak opinii do wyświetlenia.</div>';
      return;
    }

    container.innerHTML = data
      .map(
        (op) => `
      <div class="card">
        <p>${op.text}</p>
        <span>${op.name}</span>
        <p>Ocena: ${op.rating || "-"}</p>
        <p>Wyróżniona: ${op.featured ? "tak" : "nie"}</p>
        <button data-action="toggle-featured" data-featured="${op.featured ? "true" : "false"}" data-id="${op._id}">${op.featured ? "Cofnij wyróżnienie" : "Wyróżnij na głównej"}</button>
        <button data-action="delete" data-id="${op._id}">Usuń</button>
      </div>
    `
      )
      .join("");
  }

  const adminContainer = document.getElementById("adminOpinie");
  if (adminContainer) {
    adminContainer.addEventListener("click", (e) => {
      const btn = e.target.closest("button[data-action]");
      if (!btn) return;

      const id = btn.dataset.id;

      if (btn.dataset.action === "toggle-featured") {
        toggleFeatured(id, btn.dataset.featured === "true");
        return;
      }

      if (btn.dataset.action === "delete") {
        deleteOp(id);
      }
    });
  }

  async function toggleFeatured(id, currentlyFeatured) {
    try {
      const res = await fetch(`${API_BASE}/opinie/${id}/wyroznione`, {
        method: "PATCH",
        headers: adminHeaders(),
        body: JSON.stringify({ featured: !currentlyFeatured })
      });
      if (!res.ok) throw new Error("Status: " + res.status);
      loadAdmin();
      loadFeaturedOpinions();
    } catch (err) {
      alert("Błąd zmiany wyróżnienia: " + err.message);
    }
  }

  async function deleteOp(id) {
    try {
      const res = await fetch(`${API_BASE}/opinie/${id}`, {
        method: "DELETE",
        headers: adminHeaders()
      });
      if (!res.ok) throw new Error("Status: " + res.status);
      loadAdmin();
      loadAllOpinions();
      loadFeaturedOpinions();
    } catch (err) {
      alert("Błąd usuwania: " + err.message);
    }
  }

  window.toggleFeatured = toggleFeatured;
  window.deleteOp = deleteOp;

  const adminForm = document.getElementById("adminLoginForm");
  if (adminForm) {
    adminForm.addEventListener("submit", async (e) => {
      e.preventDefault();

      const passwordInput = document.getElementById("adminPassword");
      const password = passwordInput.value;

      const res = await fetch(`${API_BASE}/admin/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password })
      });

      if (!res.ok) {
        alert("Niepoprawne hasło");
        return;
      }

      sessionStorage.setItem("adminPassword", password);
      showAdminPanel(true);
      passwordInput.value = "";
      loadAdmin();
    });

    const logoutButton = document.getElementById("adminLogout");
    if (logoutButton) {
      logoutButton.addEventListener("click", () => {
        sessionStorage.removeItem("adminPassword");
        showAdminPanel(false);
      });
    }

    if (getAdminPassword()) {
      showAdminPanel(true);
      loadAdmin();
    } else {
      showAdminPanel(false);
    }
  }