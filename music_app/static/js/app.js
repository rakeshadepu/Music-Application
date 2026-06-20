/* =======================================================================
   Lyra — app.js
   One plain-JS file replacing jQuery + Flickity + leanModal. Handles:
   the custom player, modals, toasts, like toggling, add/remove from
   playlist, history delete, mobile sidebar, and home-page tabs.
   ======================================================================= */

(function () {
  "use strict";

  function csrfToken() {
    // Read from cookie — always fresh, never stale after login/logout
    var match = document.cookie.match(/csrftoken=([^;]+)/);
    return match ? match[1] : "";
  }

  function post(url, data) {
    return fetch(url, {
      method: "POST",
      headers: {
        "X-CSRFToken": csrfToken(),
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams(data).toString(),
    });
  }

  /* ---------------- Toasts ---------------- */

  function showToast(type, message) {
    var stack = document.getElementById("toastStack");
    if (!stack || !message) return;
    var el = document.createElement("div");
    el.className = "toast" + (type === "error" ? " error" : "");
    el.textContent = message;
    stack.appendChild(el);
    setTimeout(function () {
      el.style.transition = "opacity 0.25s";
      el.style.opacity = "0";
      setTimeout(function () { el.remove(); }, 250);
    }, 2800);
  }
  window.showToast = showToast;

  /* ---------------- Mobile sidebar ---------------- */

  function initSidebarToggle() {
    var toggle = document.getElementById("mobileNavToggle");
    var sidebar = document.querySelector(".sidebar");
    if (!toggle || !sidebar) return;
    toggle.addEventListener("click", function (e) {
      e.stopPropagation();
      sidebar.classList.toggle("open");
    });
    document.addEventListener("click", function (e) {
      if (sidebar.classList.contains("open") && !sidebar.contains(e.target) && e.target !== toggle) {
        sidebar.classList.remove("open");
      }
    });
  }

  /* ---------------- Auth gate for nav links that need a session ---------------- */

  function initAuthGate() {
    document.querySelectorAll("[data-requires-auth]").forEach(function (el) {
      el.addEventListener("click", function (e) {
        e.preventDefault();
        var overlay = document.getElementById("authModal");
        if (overlay) overlay.classList.add("open");
      });
    });
  }

  /* ---------------- Sidebar "Search" jumps focus to the top search box ---------------- */

  // function initSearchFocus() {
  //   var btn = document.getElementById("sidebarSearchBtn");
  //   if (!btn) return;
  //   btn.addEventListener("click", function (e) {
  //     e.preventDefault();
  //     var input = document.querySelector(".search-box input");
  //     if (input) input.focus();
  //   });
  // }

  /* ---------------- Generic modals ---------------- */

  function initModals() {
    document.querySelectorAll("[data-open-modal]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var id = btn.getAttribute("data-open-modal");
        var overlay = document.getElementById(id);
        if (overlay) overlay.classList.add("open");
      });
    });
    document.querySelectorAll("[data-close-modal]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        btn.closest(".modal-overlay").classList.remove("open");
      });
    });
    document.querySelectorAll(".modal-overlay").forEach(function (overlay) {
      overlay.addEventListener("click", function (e) {
        if (e.target === overlay) overlay.classList.remove("open");
      });
    });

    // Login / Sign up tab switch inside the auth modal
    var authTabs = document.querySelectorAll(".modal-tab-btn[data-auth-tab]");
    authTabs.forEach(function (tabBtn) {
      tabBtn.addEventListener("click", function () {
        authTabs.forEach(function (b) { b.classList.remove("active"); });
        tabBtn.classList.add("active");
        var target = tabBtn.getAttribute("data-auth-tab");
        document.querySelectorAll("[data-auth-panel]").forEach(function (panel) {
          panel.style.display = panel.getAttribute("data-auth-panel") === target ? "block" : "none";
        });
      });
    });
  }

  /* ---------------- Add-to-playlist popover ---------------- */

  function initPlaylistPopover() {
    var popover = document.getElementById("playlistPopover");
    if (!popover) return;
    var pendingSongId = null;

    document.querySelectorAll("[data-add-to-playlist]").forEach(function (btn) {
      btn.addEventListener("click", function (e) {
        e.stopPropagation();
        if (btn.hasAttribute("data-needs-login")) {
          var authOverlay = document.getElementById("authModal");
          if (authOverlay) authOverlay.classList.add("open");
          return;
        }
        pendingSongId = btn.getAttribute("data-song-id");
        var rect = btn.getBoundingClientRect();
        popover.style.top = Math.min(rect.bottom + 6, window.innerHeight - 220) + "px";
        popover.style.left = Math.min(rect.left, window.innerWidth - 236) + "px";
        popover.classList.add("open");
      });
    });

    popover.querySelectorAll("[data-playlist-id]").forEach(function (item) {
      item.addEventListener("click", function () {
        if (!pendingSongId) return;
        var playlistId = item.getAttribute("data-playlist-id");
        post("/addSongToPlaylist", { data: "S_" + pendingSongId + "|P_" + playlistId }).then(function () {
          showToast("success", "Added to playlist");
        });
        popover.classList.remove("open");
      });
    });

    document.addEventListener("click", function (e) {
      if (!popover.contains(e.target) && !e.target.closest("[data-add-to-playlist]")) {
        popover.classList.remove("open");
      }
    });
  }

  /* ---------------- Like toggling ---------------- */

  function initLikeButtons() {
    document.querySelectorAll("[data-like-toggle]").forEach(function (btn) {
      btn.addEventListener("click", function (e) {
        e.stopPropagation();
        if (btn.hasAttribute("data-needs-login")) {
          var authOverlay = document.getElementById("authModal");
          if (authOverlay) authOverlay.classList.add("open");
          return;
        }
        var songId = btn.getAttribute("data-song-id");
        var willLike = !btn.classList.contains("liked");
        document.querySelectorAll('[data-like-id="' + songId + '"]').forEach(function (el) {
          el.classList.toggle("liked", willLike);
        });
        post("/likesong", { music_id: songId }).then(function () {
          showToast("success", willLike ? "Added to Liked Songs" : "Removed from Liked Songs");
        });
      });
    });
  }

  /* ---------------- History delete ---------------- */

  function initHistoryDelete() {
    var btn = document.getElementById("deleteHistoryBtn");
    if (!btn) return;
    btn.addEventListener("click", function () {
      post("/history", {}).then(function () {
        showToast("success", "History cleared");
        setTimeout(function () { location.reload(); }, 400);
      });
    });
  }

  /* ---------------- Remove song from playlist ---------------- */

  function initRemoveFromPlaylist() {
    document.querySelectorAll("[data-remove-song]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var songId = btn.getAttribute("data-song-id");
        var playlistId = btn.getAttribute("data-playlist-id");
        var row = btn.closest(".song-row");
        post("/myPlaylist/" + playlistId, { music_id: songId }).then(function () {
          showToast("success", "Removed from playlist");
          if (row) {
            row.style.transition = "opacity 0.25s";
            row.style.opacity = "0";
            setTimeout(function () { row.remove(); }, 250);
          }
        });
      });
    });
  }

  /* ---------------- Tabs (home page sections) ---------------- */

  function initTabs() {
    document.querySelectorAll(".tabs").forEach(function (tabGroup) {
      var buttons = tabGroup.querySelectorAll(".tab-btn");
      buttons.forEach(function (btn) {
        btn.addEventListener("click", function () {
          var target = btn.getAttribute("data-tab");
          buttons.forEach(function (b) { b.classList.remove("active"); });
          btn.classList.add("active");
          document.querySelectorAll(".tab-panel").forEach(function (panel) {
            panel.classList.toggle("active", panel.getAttribute("data-tab") === target);
          });
        });
      });
    });
  }

  /* ---------------- Custom player ---------------- */

  function formatTime(seconds) {
    if (!isFinite(seconds) || seconds < 0) seconds = 0;
    var m = Math.floor(seconds / 60);
    var s = Math.floor(seconds % 60);
    return m + ":" + (s < 10 ? "0" : "") + s;
  }

  function initPlayer() {
    var audio = document.getElementById("audioEl");
    var bar = document.getElementById("player");
    if (!audio || !bar) return;

    var artEl = document.getElementById("playerArt");
    var titleEl = document.getElementById("playerTitle");
    var artistEl = document.getElementById("playerArtist");
    var playBtn = document.getElementById("ctrlPlay");
    var prevBtn = document.getElementById("ctrlPrev");
    var nextBtn = document.getElementById("ctrlNext");
    var seekTrack = document.getElementById("seekTrack");
    var seekInput = document.getElementById("seekInput");
    var seekFill = document.getElementById("seekFill");
    var curTimeEl = document.getElementById("curTime");
    var durTimeEl = document.getElementById("durTime");
    var volInput = document.getElementById("volInput");
    var volFill = document.getElementById("volFill");
    var muteBtn = document.getElementById("muteBtn");
    var likeBtn = document.getElementById("playerLikeBtn");

    var iconPlay = '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>';
    var iconPause = '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M6 5h4v14H6zM14 5h4v14h-4z"/></svg>';

    var queue = [];
    var currentIndex = -1;

    function collectQueue() {
      return Array.prototype.map.call(document.querySelectorAll("[data-playable]"), function (el) {
        return {
          id: el.getAttribute("data-song-id"),
          src: el.getAttribute("data-src"),
          title: el.getAttribute("data-title"),
          artist: el.getAttribute("data-artist"),
          cover: el.getAttribute("data-cover"),
        };
      });
    }

    function setPlayingRowState() {
      document.querySelectorAll(".song-row.is-playing").forEach(function (r) { r.classList.remove("is-playing"); });
      if (currentIndex < 0) return;
      var id = queue[currentIndex].id;
      document.querySelectorAll('[data-playable][data-song-id="' + id + '"]').forEach(function (el) {
        var row = el.closest(".song-row");
        if (row) row.classList.add("is-playing");
      });
    }

    function loadTrack(index, autoplay) {
      if (index < 0 || index >= queue.length) return;
      currentIndex = index;
      var track = queue[index];
      audio.src = track.src;
      if (artEl) artEl.src = track.cover || artEl.src;
      if (titleEl) titleEl.textContent = track.title || "Unknown";
      if (artistEl) artistEl.textContent = track.artist || "";
      if (likeBtn) {
        likeBtn.setAttribute("data-song-id", track.id);
        likeBtn.setAttribute("data-like-id", track.id);
        likeBtn.classList.toggle("liked", document.querySelector('[data-like-id="' + track.id + '"].liked') !== null);
      }
      setPlayingRowState();
      if (autoplay) audio.play();
    }

    function playAt(newQueue, index) {
      queue = newQueue;
      loadTrack(index, true);
    }
    window.lyraPlay = playAt;

    document.addEventListener("click", function (e) {
      var trigger = e.target.closest("[data-play-trigger]");
      if (!trigger) return;
      e.preventDefault();
      var fresh = collectQueue();
      var clickedId = trigger.getAttribute("data-song-id");
      var idx = fresh.findIndex(function (t) { return t.id === clickedId; });
      if (idx === -1) return;
      playAt(fresh, idx);
    });

    function togglePlay() {
      if (!audio.src) return;
      if (audio.paused) audio.play(); else audio.pause();
    }
    if (playBtn) playBtn.addEventListener("click", togglePlay);

    function next() {
      if (!queue.length) return;
      loadTrack((currentIndex + 1) % queue.length, true);
    }
    function prev() {
      if (!queue.length) return;
      loadTrack((currentIndex - 1 + queue.length) % queue.length, true);
    }
    if (nextBtn) nextBtn.addEventListener("click", next);
    if (prevBtn) prevBtn.addEventListener("click", prev);

    audio.addEventListener("play", function () {
      bar.classList.add("is-playing");
      if (playBtn) playBtn.innerHTML = iconPause;
    });
    audio.addEventListener("pause", function () {
      bar.classList.remove("is-playing");
      if (playBtn) playBtn.innerHTML = iconPlay;
    });
    audio.addEventListener("ended", next);

    audio.addEventListener("timeupdate", function () {
      if (!audio.duration) return;
      var pct = (audio.currentTime / audio.duration) * 100;
      if (seekFill) seekFill.style.width = pct + "%";
      if (seekInput) seekInput.value = pct;
      if (curTimeEl) curTimeEl.textContent = formatTime(audio.currentTime);
      if (durTimeEl) durTimeEl.textContent = formatTime(audio.duration);
    });

    if (seekInput) {
      seekInput.addEventListener("input", function () {
        if (audio.duration) audio.currentTime = (seekInput.value / 100) * audio.duration;
      });
    }

    if (volInput) {
      volInput.addEventListener("input", function () {
        audio.volume = volInput.value / 100;
        audio.muted = false;
        if (volFill) volFill.style.width = volInput.value + "%";
      });
      audio.volume = volInput.value / 100;
      if (volFill) volFill.style.width = volInput.value + "%";
    }
    if (muteBtn) {
      muteBtn.addEventListener("click", function () {
        audio.muted = !audio.muted;
        muteBtn.classList.toggle("muted", audio.muted);
      });
    }

    window.addEventListener("keydown", function (e) {
      if (e.code === "Space" && e.target.tagName !== "INPUT" && e.target.tagName !== "TEXTAREA") {
        e.preventDefault();
        togglePlay();
      }
    });
  }

  document.addEventListener("DOMContentLoaded", function () {
    initSidebarToggle();
    initModals();
    initAuthGate();
    // initSearchFocus();
    initPlaylistPopover();
    initLikeButtons();
    initHistoryDelete();
    initRemoveFromPlaylist();
    initTabs();
    initPlayer();
  });
})();
