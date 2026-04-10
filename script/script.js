  function scrollToContact() {
    document.getElementById("kontakt").scrollIntoView({ behavior: "smooth" });
  }

  // Canvas animation for electricity flow
  const canvas = document.getElementById('bg-canvas');
  const ctx = canvas.getContext('2d');

  function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  }

  resizeCanvas();
  window.addEventListener('resize', resizeCanvas);

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
      ctx.fillStyle = '#D4AF37';
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
    particles.forEach(particle => {
      particle.update();
      particle.draw();
    });
    requestAnimationFrame(animate);
  }

  animate();



AOS.init({ duration: 800, easing: 'ease-in-out' });
