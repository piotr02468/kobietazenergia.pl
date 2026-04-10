function scrollToContact(){
  document.getElementById('kontakt').scrollIntoView({
    behavior: 'smooth'
  });
}

/* FADE */
const observer = new IntersectionObserver(entries => {
  entries.forEach(entry => {
    if(entry.isIntersecting){
      entry.target.classList.add('show');
    }
  });
});
document.querySelectorAll('.fade').forEach(el => observer.observe(el));

/* ⚡ ENERGY ANIMATION */
const canvas = document.getElementById("energyCanvas");
const ctx = canvas.getContext("2d");

function resizeCanvas(){
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
}
resizeCanvas();

let lines = [];

for(let i=0;i<60;i++){
  lines.push({
    x: Math.random() * canvas.width,
    y: Math.random() * canvas.height,
    length: Math.random() * 150 + 50,
    speed: Math.random() * 1.5 + 0.5,
    opacity: Math.random() * 0.6 + 0.2
  });
}

function draw(){
  ctx.clearRect(0,0,canvas.width,canvas.height);

  lines.forEach(l => {
    ctx.beginPath();
    ctx.moveTo(l.x, l.y);
    ctx.lineTo(l.x + l.length, l.y);
    ctx.strokeStyle = `rgba(212,175,55,${l.opacity})`;
    ctx.lineWidth = 1.5;
    ctx.stroke();

    l.x += l.speed;

    if(l.x > canvas.width){
      l.x = -l.length;
      l.y = Math.random() * canvas.height;
    }
  });

  requestAnimationFrame(draw);
}

draw();

window.addEventListener("resize", resizeCanvas);