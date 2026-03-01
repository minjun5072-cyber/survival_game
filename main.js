import { saveScore, getTopRankings } from "./firebase.js";

const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");

/* ------------------ 화면 맞춤 ------------------ */
function resizeCanvas() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
}
resizeCanvas();
window.addEventListener("resize", () => {
  resizeCanvas();
  player.y = canvas.height - 120;
});

/* ------------------ 이미지 ------------------ */
const playerImg = new Image();
playerImg.src = "./player.png";

const enemyImg = new Image();
enemyImg.src = "./enemy1.png";

const bgImg = new Image();
bgImg.src = "./background.png";

/* ------------------ 상태 ------------------ */
let gameState = "start";
let round = 1;
let score = 0;
let roundTimer = 0;
let roundDuration = 0;
let rankings = [];

/* ------------------ 플레이어 ------------------ */
const player = {
  x: window.innerWidth / 2,
  y: window.innerHeight - 120,
  size: 60,
  speed: 3,
};

let bullets = [];
let enemies = [];
let attackInterval;
let moveDirection = 0;

/* ------------------ 스탯 ------------------ */
let bulletDamage = 3;
let bulletSpeed = 10;
let multiShot = 1;
let fireRate = 1000;

/* ------------------ 라운드 애니메이션 ------------------ */
let showRoundText = false;
let roundTextScale = 1.5; // 🔥 기존보다 작게
let roundTextTimer = 0;

let lastTime = 0;

/* ------------------ 능력 풀 ------------------ */
const abilityPool = {
  Common: [
    { name: "공격력 +1", effect: () => (bulletDamage += 1) },
    { name: "총알 속도 +2", effect: () => (bulletSpeed += 2) },
    { name: "이동속도 +1", effect: () => (player.speed += 1) },
  ],
  Rare: [
    { name: "2연발", effect: () => (multiShot += 1) },
    { name: "공격력 +3", effect: () => (bulletDamage += 3) },
  ],
  Epic: [
    {
      name: "공격속도 증가",
      effect: () => {
        fireRate = Math.max(fireRate * 0.8, 150); // 🔥 최소 0.15초 제한
        clearInterval(attackInterval);
        attackInterval = setInterval(shoot, fireRate);
      },
    },
  ],
  Legendary: [{ name: "5연발", effect: () => (multiShot += 3) }],
};

let cards = [];

/* ------------------ 확률 ------------------ */
function getRandomRarity() {
  const r = Math.random() * 100;
  if (r < 70) return "Common";
  if (r < 95) return "Rare";
  if (r < 99.5) return "Epic";
  return "Legendary";
}

/* ------------------ 카드 생성 ------------------ */
function generateCards() {
  cards = [];
  for (let i = 0; i < 3; i++) {
    const rarity = getRandomRarity();
    const pool = abilityPool[rarity];
    const ability = pool[Math.floor(Math.random() * pool.length)];
    cards.push({ rarity, ability });
  }
  gameState = "upgrade";
}

/* ------------------ 라운드 시작 애니메이션 ------------------ */
function startRoundAnimation() {
  showRoundText = true;
  roundTextScale = 1.5;
  roundTextTimer = 40; // 🔥 짧게
  gameState = "roundIntro";

  setTimeout(() => {
    showRoundText = false;
    gameState = "playing";
    attackInterval = setInterval(shoot, fireRate);
    startSpawning();
  }, 800);
}

/* ------------------ 터치 이동 ------------------ */
canvas.addEventListener("touchstart", (e) => {
  if (gameState !== "playing") return;
  const x = e.touches[0].clientX;
  moveDirection = x < canvas.width / 2 ? -1 : 1;
});
canvas.addEventListener("touchend", () => (moveDirection = 0));

/* ------------------ 발사 ------------------ */
function shoot() {
  if (gameState !== "playing") return;

  for (let i = 0; i < multiShot; i++) {
    setTimeout(() => {
      bullets.push({
        x: player.x + player.size / 2 - 23,
        y: player.y,
        size: 8,
        speed: bulletSpeed,
      });
    }, i * 100);
  }
}

/* ------------------ 적 생성 ------------------ */
function spawnEnemy() {
  if (gameState !== "playing") return;

  // 🔥 라운드가 올라갈수록 한 번에 여러 마리 생성
  const spawnCount = 1 + Math.floor(round / 3);
  // 1~2라운드: 1마리
  // 3~5라운드: 2마리
  // 6~8라운드: 3마리
  // 이런 식으로 증가

  for (let i = 0; i < spawnCount; i++) {
    const scaledHp = 5 + Math.floor(round * 1.5);

    enemies.push({
      x: Math.random() * (canvas.width - 50),
      y: -50 - Math.random() * 200, // 🔥 위에서 자연스럽게 흩어져 등장
      size: 50,

      // 🔥 속도 증가 (라운드 기반)
      speed: 2 + round * 0.35 + Math.random() * 0.5,

      hp: scaledHp,
      maxHp: scaledHp,
    });
  }
}
let spawnInterval = 1000;
let spawnTimer;

function startSpawning() {
  clearInterval(spawnTimer);

  // 🔥 라운드가 오를수록 생성 간격 감소 (최소 300ms 제한)
  spawnInterval = Math.max(1000 - round * 70, 300);

  spawnTimer = setInterval(spawnEnemy, spawnInterval);
}

/* ------------------ 업데이트 ------------------ */
function update(delta) {
  if (showRoundText) {
    roundTextScale -= 0.01;
    roundTextTimer--;
    if (roundTextTimer <= 0) showRoundText = false;
  }

  if (gameState !== "playing") return;

  roundDuration = (10 + round + 2) * 1000;
  roundTimer += delta;

  if (roundTimer >= roundDuration) {
    round++;
    roundTimer = 0;
    clearInterval(attackInterval);

    if (round % 2 === 1) {
      generateCards();
    } else {
      startRoundAnimation();
    }
  }

  if (moveDirection === -1 && player.x > 0) player.x -= player.speed;
  if (moveDirection === 1 && player.x < canvas.width - player.size)
    player.x += player.speed;

  bullets.forEach((b) => (b.y -= b.speed));
  enemies.forEach((e) => (e.y += e.speed));

  bullets.forEach((b, bi) => {
    enemies.forEach((e, ei) => {
      if (
        b.x < e.x + e.size &&
        b.x + b.size > e.x &&
        b.y < e.y + e.size &&
        b.y + b.size > e.y
      ) {
        e.hp -= bulletDamage;
        bullets.splice(bi, 1);

        if (e.hp <= 0) {
          enemies.splice(ei, 1);
          score += 10;
        }
      }
    });
  });

  enemies.forEach((e) => {
    if (
      player.x < e.x + e.size &&
      player.x + player.size > e.x &&
      player.y < e.y + e.size &&
      player.y + player.size > e.y
    ) {
      gameState = "gameover";
      clearInterval(attackInterval);
    }
  });
}

/* ------------------ 그리기 ------------------ */
function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(bgImg, 0, 0, canvas.width, canvas.height);

  if (gameState === "start") {
    ctx.fillStyle = "rgba(0,0,0,0.7)";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.textAlign = "center";
    ctx.fillStyle = "white";
    ctx.font = "bold 48px Arial";
    ctx.fillText("SURVIVAL", canvas.width / 2, canvas.height / 2 - 40);
    ctx.font = "24px Arial";
    ctx.fillText("Touch To Start", canvas.width / 2, canvas.height / 2 + 20);
  }

  if (gameState === "playing" || gameState === "roundIntro") {
    ctx.drawImage(playerImg, player.x, player.y, player.size, player.size);

    enemies.forEach((e) => {
      ctx.drawImage(enemyImg, e.x, e.y, e.size, e.size);

      ctx.fillStyle = "red";
      ctx.fillRect(e.x, e.y - 8, e.size, 5);
      ctx.fillStyle = "lime";
      ctx.fillRect(e.x, e.y - 8, e.size * (e.hp / e.maxHp), 5);
    });

    bullets.forEach((b) => {
      ctx.fillStyle = "yellow";
      ctx.fillRect(b.x, b.y, b.size, b.size);
    });

    ctx.textAlign = "center";
    ctx.fillStyle = "white";
    ctx.font = "20px Arial";
    const timeLeft = Math.ceil((roundDuration - roundTimer) / 1000);
    ctx.fillText(
      `Score: ${score}   Round: ${round}   Time: ${timeLeft}`,
      canvas.width / 2,
      40,
    );
  }

  if (gameState === "roundIntro") {
    ctx.font = `bold ${60 * roundTextScale}px Arial`;
    ctx.fillText(`ROUND ${round}`, canvas.width / 2, canvas.height / 2);
  }

  if (gameState === "upgrade") {
    ctx.fillStyle = "rgba(10,10,20,0.95)";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.textAlign = "center";
    ctx.fillStyle = "white";
    ctx.font = "bold 36px Arial";
    ctx.fillText("CHOOSE YOUR POWER", canvas.width / 2, 120);

    const cardWidth = canvas.width * 0.7;
    const cardHeight = 170;
    const startY = canvas.height / 2 - 200;

    cards.forEach((card, i) => {
      const x = canvas.width / 2 - cardWidth / 2;
      const y = startY + i * (cardHeight + 20);

      let borderColor =
        card.rarity === "Common"
          ? "#fff"
          : card.rarity === "Rare"
            ? "#2196F3"
            : card.rarity === "Epic"
              ? "#9C27B0"
              : "#FFC107";

      ctx.fillStyle = "#1e1e2f";
      ctx.fillRect(x, y, cardWidth, cardHeight);

      ctx.strokeStyle = borderColor;
      ctx.lineWidth = 4;
      ctx.strokeRect(x, y, cardWidth, cardHeight);

      ctx.fillStyle = borderColor;
      ctx.fillText(card.rarity, canvas.width / 2, y + 35);

      ctx.fillStyle = "white";
      ctx.fillText(card.ability.name, canvas.width / 2, y + 100);
    });
  }

  if (gameState === "ranking") {
    ctx.fillStyle = "rgba(0,0,0,0.8)";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.textAlign = "center";
    ctx.fillStyle = "white";
    ctx.font = "bold 36px Arial";
    ctx.fillText("RANKING", canvas.width / 2, 120);

    ctx.font = "24px Arial";
    rankings.forEach((r, i) => {
      ctx.fillText(
        `${i + 1}. ${r.name} - ${r.score}`,
        canvas.width / 2,
        180 + i * 40,
      );
    });

    ctx.font = "18px Arial";
    ctx.fillText("Touch To Restart", canvas.width / 2, canvas.height - 60);
  }

  if (gameState === "gameover") {
    ctx.textAlign = "center";
    ctx.fillStyle = "white";
    ctx.font = "36px Arial";
    ctx.fillText("GAME OVER", canvas.width / 2, canvas.height / 2);
  }
}

/* ------------------ 클릭 ------------------ */
canvas.addEventListener("click", async (e) => {
  if (gameState === "start") {
    generateCards();
  } else if (gameState === "upgrade") {
    const cardHeight = 170;
    const startY = canvas.height / 2 - 200;

    cards.forEach((card, i) => {
      const top = startY + i * (cardHeight + 20);
      const bottom = top + cardHeight;

      if (e.clientY > top && e.clientY < bottom) {
        card.ability.effect();
        startRoundAnimation();
      }
    });
  } else if (gameState === "gameover") {
    document.getElementById("nicknameModal").style.display = "flex";
    rankings = await getTopRankings();
    gameState = "ranking";
  } else if (gameState === "ranking") {
    location.reload();
  }
});

/* ------------------ 루프 ------------------ */
function gameLoop(timestamp) {
  if (!lastTime) lastTime = timestamp;
  const delta = timestamp - lastTime;
  lastTime = timestamp;

  update(delta);
  draw();

  requestAnimationFrame(gameLoop);
}
gameLoop();

document.getElementById("saveBtn").addEventListener("click", async () => {
  const name = document.getElementById("nicknameInput").value.trim();
  if (!name) return;

  await saveScore(name, score);
  rankings = await getTopRankings();

  document.getElementById("nicknameModal").style.display = "none";
  gameState = "ranking";
});