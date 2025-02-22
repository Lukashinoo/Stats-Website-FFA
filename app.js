let leaderboardData = [];
let currentPage = 1;
let currentSortColumn = "kills";
let currentSortDirection = "desc"; // Standardmäßig absteigend sortieren

async function fetchLeaderboard(sortParam = "kills", page = 1, append = false) {
  showLoadingSpinner();
  const url = `https://api.hglabor.de/stats/FFA/top?sort=${sortParam}&page=${page}`;
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error("Fehler beim Abrufen der Daten");
    }
    const data = await response.json();
    const top10 = data.slice(0, 10);

    if (append) {
      leaderboardData = [...leaderboardData, ...top10];
    } else {
      leaderboardData = top10;
    }

    const promises = leaderboardData.map(entry => {
      if ((!entry.playerName || entry.playerName === "") && entry.playerId) {
        return getNameFromAshcon(entry.playerId).then(name => {
          entry.playerName = name;
          return entry;
        });
      }
      return Promise.resolve(entry);
    });

    await Promise.all(promises);
    fillTable(leaderboardData, append);

    // Containerhöhe animieren
    const leaderboardContainer = document.querySelector(".leaderboard-container");
    const newHeight = leaderboardContainer.scrollHeight + 20; // 20px Puffer
    smoothResizeContainer(newHeight, 500); // 500ms Dauer
  } catch (err) {
    console.error(err);
    alert("Fehler beim Laden der Leaderboard-Daten.");
  } finally {
    hideLoadingSpinner();
  }
}

function sortTable(column, direction) {
  leaderboardData.sort((a, b) => {
    if (direction === "asc") {
      return a[column] - b[column];
    } else {
      return b[column] - a[column];
    }
  });
  fillTable(leaderboardData);
}

function showLoadingSpinner() {
  const tbody = document.querySelector("#leaderboard tbody");
  tbody.innerHTML = `<tr><td colspan="7"><div class="loading-spinner"></div></td></tr>`;
}

function hideLoadingSpinner() {
  const loadingSpinner = document.querySelector(".loading-spinner");
  if (loadingSpinner) {
    loadingSpinner.remove();
  }
}

function playLoadSound() {
  const loadSound = document.getElementById("loadSound");
  loadSound.currentTime = 0; // Zurücksetzen, falls bereits abgespielt
  loadSound.play();
}

function playAnimationSound() {
  const animationSound = document.getElementById("animationSound");
  animationSound.currentTime = 0; // Zurücksetzen, falls bereits abgespielt
  animationSound.play();
}

function adjustContainerHeight() {
  const leaderboardContainer = document.querySelector(".leaderboard-container");
  const tbody = document.querySelector("#leaderboard tbody");
  const loadMoreBtn = document.getElementById("loadMoreBtn");

  // Höhe der Tabelle berechnen
  const tbodyHeight = tbody.scrollHeight;

  // Höhe des Buttons berechnen
  const loadMoreBtnHeight = loadMoreBtn.offsetHeight;

  // Gesamthöhe des Containers anpassen
  leaderboardContainer.style.height = `${tbodyHeight + loadMoreBtnHeight + 20}px`; // 20px Puffer für Padding
}

function fillTable(data, append = false) {
  const tbody = document.querySelector("#leaderboard tbody");
  
  if (!append) {
    tbody.innerHTML = ""; // Nur leeren, wenn nicht angehängt wird
  }

  data.forEach((item, index) => {
    const row = document.createElement("tr");
    row.style.animationDelay = `${index * 0.1}s`;

    const rankCell = document.createElement("td");
    rankCell.textContent = index + 1; // Rangnummer basierend auf der Gesamtposition
    row.appendChild(rankCell);

    const nameCell = document.createElement("td");
    const wrapper = document.createElement("div");
    wrapper.classList.add("player-wrapper");

    if (item.playerId) {
      const uuidNoDashes = item.playerId.replace(/-/g, "");
      const headImg = document.createElement("img");
      headImg.classList.add("player-head");
      headImg.dataset.src = `https://crafatar.com/avatars/${uuidNoDashes}?size=28`;
      wrapper.appendChild(headImg);
    }

    const nameSpan = document.createElement("span");
    nameSpan.textContent = item.playerName || "???";
    nameSpan.classList.add("player-name");
    wrapper.appendChild(nameSpan);

    wrapper.style.cursor = "pointer";
    wrapper.addEventListener("click", () => {
      if (item.playerId) {
        showPlayerDetail(item.playerId);
      }
    });

    nameCell.appendChild(wrapper);
    row.appendChild(nameCell);

    const killsCell = document.createElement("td");
    killsCell.textContent = item.kills;
    row.appendChild(killsCell);

    const deathsCell = document.createElement("td");
    deathsCell.textContent = item.deaths;
    row.appendChild(deathsCell);

    const highestCell = document.createElement("td");
    highestCell.textContent = item.highestKillStreak;
    row.appendChild(highestCell);

    const xpCell = document.createElement("td");
    xpCell.textContent = item.xp;
    row.appendChild(xpCell);

    const currentCell = document.createElement("td");
    currentCell.textContent = item.currentKillStreak;
    row.appendChild(currentCell);

    tbody.appendChild(row);

    // Sound nach jedem Eintrag abspielen
    playLoadSound();
  });

  delayedLoadSkins();

  // Höhe der Box anpassen
  adjustContainerHeight();
}

function delayedLoadSkins() {
  const heads = document.querySelectorAll(".player-head");
  heads.forEach((img, i) => {
    setTimeout(() => {
      if (img.dataset.src) {
        img.src = img.dataset.src;
      }
      setTimeout(() => {
        img.classList.add("fade-in");
        const nameSpan = img.parentElement.querySelector(".player-name");
        nameSpan.classList.add("move-down"); // Aktiviere die Animation für den Namen
        playAnimationSound(); // Sound bei Animation abspielen
      }, 100);
    }, i * 200);
  });
}

function showPlayerDetail(playerId) {
  const url = "https://api.hglabor.de/stats/FFA/" + playerId;
  fetch(url)
    .then(res => res.json())
    .then(data => {
      document.querySelector(".leaderboard-container").style.display = "none";
      const playerDetail = document.getElementById("playerDetail");
      playerDetail.style.display = "block";
      playerDetail.style.animation = "slideInFromRight 0.5s ease forwards";

      const detailSkin = document.getElementById("detailSkin");
      detailSkin.src = `https://crafatar.com/avatars/${playerId}?size=64`;

      if (data.spieler) {
        document.getElementById("detailName").textContent = data.spieler;
      } else {
        getNameFromAshcon(playerId).then(name => {
          document.getElementById("detailName").textContent = name;
        });
      }
      document.getElementById("detailUUID").textContent = data.playerId || playerId;
      document.getElementById("detailKills").textContent = data.kills || 0;
      document.getElementById("detailDeaths").textContent = data.deaths || 0;
      document.getElementById("detailXP").textContent = data.xp || 0;
      document.getElementById("detailHighestStreak").textContent = data.highestKillStreak || 0;
      document.getElementById("detailCurrentStreak").textContent = data.currentKillStreak || 0;

      let kd = 0;
      if ((data.deaths || 0) > 0) {
        kd = (data.kills || 0) / data.deaths;
      }
      document.getElementById("detailKD").textContent = kd.toFixed(2);
    })
    .catch(err => {
      alert("Fehler beim Laden der Detaildaten.");
      console.error(err);
    });
}

function hidePlayerDetail() {
  const leaderboardContainer = document.querySelector(".leaderboard-container");
  const playerDetail = document.getElementById("playerDetail");

  playerDetail.classList.add("hide");
  setTimeout(() => {
    playerDetail.style.display = "none";
    leaderboardContainer.style.display = "block";
  }, 500);
}

function getNameFromAshcon(uuid) {
  const uuidNoDashes = uuid.replace(/-/g, "");
  const url = "https://api.ashcon.app/mojang/v2/user/" + uuidNoDashes;
  return fetch(url)
    .then(res => res.json())
    .then(data => {
      if (!data || !data.username) return "Unknown";
      return data.username;
    })
    .catch(() => "Unknown");
}

function showLoadingAnimation() {
  const loadMoreBtn = document.getElementById("loadMoreBtn");
  loadMoreBtn.classList.add("loading");
  loadMoreBtn.disabled = true;
}

function hideLoadingAnimation() {
  const loadMoreBtn = document.getElementById("loadMoreBtn");
  loadMoreBtn.classList.remove("loading");
  loadMoreBtn.disabled = false;
}

function showBubbleEffect(x, y) {
  const bubble = document.createElement("div");
  bubble.classList.add("bubble-effect");
  bubble.style.left = `${x}px`;
  bubble.style.top = `${y}px`;
  document.body.appendChild(bubble);

  setTimeout(() => {
    bubble.remove();
  }, 500);
}

function playClickSound() {
  const clickSound = document.getElementById("clickSound");
  clickSound.currentTime = 0;
  clickSound.play();
}

function smoothScrollTo(position, duration) {
  const start = window.scrollY;
  const distance = position - start;
  let startTime = null;

  function animation(currentTime) {
    if (startTime === null) startTime = currentTime;
    const timeElapsed = currentTime - startTime;
    const run = easeInOutQuad(timeElapsed, start, distance, duration);
    window.scrollTo(0, run);
    if (timeElapsed < duration) requestAnimationFrame(animation);
  }

  function easeInOutQuad(t, b, c, d) {
    t /= d / 2;
    if (t < 1) return (c / 2) * t * t + b;
    t--;
    return (-c / 2) * (t * (t - 2) - 1) + b;
  }

  requestAnimationFrame(animation);
}

function smoothResizeContainer(newHeight, duration) {
  const leaderboardContainer = document.querySelector(".leaderboard-container");
  const startHeight = leaderboardContainer.offsetHeight;
  const distance = newHeight - startHeight;
  let startTime = null;

  function animation(currentTime) {
    if (startTime === null) startTime = currentTime;
    const timeElapsed = currentTime - startTime;
    const run = easeInOutQuad(timeElapsed, startHeight, distance, duration);
    leaderboardContainer.style.height = `${run}px`;
    if (timeElapsed < duration) requestAnimationFrame(animation);
  }

  function easeInOutQuad(t, b, c, d) {
    t /= d / 2;
    if (t < 1) return (c / 2) * t * t + b;
    t--;
    return (-c / 2) * (t * (t - 2) - 1) + b;
  }

  requestAnimationFrame(animation);
}

document.addEventListener("DOMContentLoaded", () => {
  fetchLeaderboard("kills", 1);

  document.querySelectorAll("thead th").forEach(th => {
    th.addEventListener("click", function() {
      const column = this.getAttribute("data-sort");
      if (column === "rank" || column === "playerName") return;

      if (this.classList.contains("sorted")) {
        // Wenn bereits sortiert, wechsle die Richtung
        if (currentSortDirection === "desc") {
          currentSortDirection = "asc";
          this.querySelector(".sort-icon").classList.remove("fa-arrow-down");
          this.querySelector(".sort-icon").classList.add("fa-arrow-up");
        } else {
          currentSortDirection = "desc";
          this.querySelector(".sort-icon").classList.remove("fa-arrow-up");
          this.querySelector(".sort-icon").classList.add("fa-arrow-down");
        }
      } else {
        // Entferne Sortier-Icons von anderen Spalten
        document.querySelectorAll("thead th").forEach(el => {
          el.classList.remove("sorted");
          const icon = el.querySelector(".sort-icon");
          if (icon) icon.remove();
        });

        // Füge Sortier-Icon hinzu
        this.classList.add("sorted");
        const icon = document.createElement("i");
        icon.classList.add("sort-icon", "fa-solid");
        if (currentSortDirection === "desc") {
          icon.classList.add("fa-arrow-down");
        } else {
          icon.classList.add("fa-arrow-up");
        }
        this.appendChild(icon);
      }

      // Sortiere die Tabelle
      sortTable(column, currentSortDirection);
    });
  });

  document.getElementById("backBtn").addEventListener("click", hidePlayerDetail);

  document.getElementById("searchBtn").addEventListener("click", () => {
    const input = document.getElementById("playerInput");
    const name = input.value.trim();
    if (!name) return;
    fetch("https://api.ashcon.app/mojang/v2/user/" + encodeURIComponent(name))
      .then(res => {
        if (res.status === 204) throw new Error("Spieler nicht gefunden");
        return res.json();
      })
      .then(profile => {
        const uuid = profile.uuid;
        showPlayerDetail(uuid);
      })
      .catch(err => {
        alert("Spieler nicht gefunden: " + name);
        console.error(err);
      });
  });

  document.getElementById("loadMoreBtn").addEventListener("click", (event) => {
    playClickSound();
    showLoadingAnimation();

    const scrollPosition = window.scrollY;
    currentPage += 1;

    fetchLeaderboard(currentSortColumn, currentPage, true)
      .then(() => {
        hideLoadingAnimation();
        showBubbleEffect(event.clientX, event.clientY);

        // Warte, bis die neuen Einträge eingeblendet sind
        setTimeout(() => {
          // Scroll langsam nach unten
          const newScrollPosition = document.documentElement.scrollHeight - window.innerHeight + 100; // 100px weiter nach unten
          smoothScrollTo(newScrollPosition, 1000); // 1000ms = 1 Sekunde
        }, 500); // Warte 500ms, bis die Animation der neuen Einträge abgeschlossen ist
      })
      .catch((err) => {
        hideLoadingAnimation();
        console.error(err);
      });
  });

  // Scroll-to-Top Button
  const scrollToTopBtn = document.getElementById("scrollToTopBtn");
  window.addEventListener("scroll", () => {
    if (window.scrollY > 300) {
      scrollToTopBtn.style.display = "flex";
    } else {
      scrollToTopBtn.style.display = "none";
    }
  });

  scrollToTopBtn.addEventListener("click", () => {
    smoothScrollTo(0, 1000); // 1000ms = 1 Sekunde
  });
});
