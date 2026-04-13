  function scrollToContact() {
    const kontakt = document.getElementById("kontakt");
    if (kontakt) {
      kontakt.scrollIntoView({ behavior: "smooth" });
    }
  }

  const API_BASE = "http://localhost:3000";

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

  // OPINIE
  async function loadOpinions() {
    const container = document.getElementById("opinieList");
    if (!container) return;

    const res = await fetch(`${API_BASE}/opinie`);
    const data = await res.json();

    if (!data.length) {
      container.innerHTML = '<div class="card">Brak zatwierdzonych opinii.</div>';
      return;
    }

    container.innerHTML = data
      .map(
        (op) => `
      <div class="card">
        <p>"${op.text}"</p>
        <span>- ${op.name}</span>
      </div>
    `
      )
      .join("");
  }

  loadOpinions();

  // OPINIE - dodawanie
  const opinionForm = document.getElementById("form");
  if (opinionForm) {
    opinionForm.addEventListener("submit", async (e) => {
      e.preventDefault();

      const nameInput = document.getElementById("name");
      const textInput = document.getElementById("text");
      const ratingInput = document.getElementById("rating");

      await fetch(`${API_BASE}/opinie`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: nameInput.value,
          text: textInput.value,
          rating: ratingInput.value
        })
      });

      opinionForm.reset();
      alert("Dzieki! Opinia czeka na zatwierdzenie");
    });
  }

  // ADMIN - logowanie i zarzadzanie opiniami
  function showAdminPanel(isVisible) {
    const loginBox = document.getElementById("adminLoginBox");
    const panel = document.getElementById("adminPanel");

    if (!loginBox || !panel) return;

    loginBox.style.display = isVisible ? "none" : "block";
    panel.style.display = isVisible ? "block" : "none";
  }

  async function loadAdmin() {
    console.log("LOAD ADMIN");
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
      container.innerHTML = '<div class="card">Brak opinii do wyswietlenia.</div>';
      return;
    }

    container.innerHTML = data
      .map(
        (op) => `
      <div class="card">
        <p>${op.text}</p>
        <span>${op.name}</span>
        <p>Ocena: ${op.rating || "-"}</p>
        <p>Status: ${op.approved ? "zatwierdzona" : "oczekuje"}</p>
        ${!op.approved ? `<button data-action="approve" data-id="${op._id}">Zatwierdz</button>` : ""}
        <button data-action="delete" data-id="${op._id}">Usun</button>
      </div>
    `
      )
      .join("");

    container.addEventListener("click", (e) => {
      const btn = e.target.closest("button[data-action]");
      if (!btn) return;

      const id = btn.dataset.id;

      console.log("klik!", btn.dataset.action, id);

      if (btn.dataset.action === "approve") {
        approve(id);
      } else {
        deleteOp(id);
      }
    });
  }

  async function approve(id) {
    console.log("klik approve", id);
    try {
      const res = await fetch(`${API_BASE}/opinie/${id}`, {
        method: "PATCH",
        headers: adminHeaders()
      });
      if (!res.ok) throw new Error("Status: " + res.status);
      loadAdmin();
    } catch (err) {
      alert("Blad zatwierdzania: " + err.message);
    }
  }

  async function deleteOp(id) {
    console.log("klik delete", id);
    try {
      const res = await fetch(`${API_BASE}/opinie/${id}`, {
        method: "DELETE",
        headers: adminHeaders()
      });
      if (!res.ok) throw new Error("Status: " + res.status);
      loadAdmin();
    } catch (err) {
      alert("Blad usuwania: " + err.message);
    }
  }

  window.approve = approve;
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
        alert("Niepoprawne haslo");
        return;
      }

      sessionStorage.setItem("adminPassword", password);
      console.log("Hasło:", getAdminPassword());
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