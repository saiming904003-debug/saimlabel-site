/* SAIM Label main.js — 汉堡菜单 / 图库筛选 / 报价表单预填 (渐进增强,JS挂掉页面完整可读) */
(function () {
  "use strict";

  /* mobile menu */
  try {
    var burger = document.querySelector(".burger");
    var menu = document.querySelector(".mobile-menu");
    if (burger && menu) {
      burger.addEventListener("click", function () {
        var open = menu.classList.toggle("open");
        burger.setAttribute("aria-expanded", open ? "true" : "false");
      });
    }
  } catch (e) {}

  /* gallery filter chips */
  try {
    var chips = document.querySelectorAll(".chips button[data-filter]");
    var items = document.querySelectorAll(".g-item[data-cat]");
    chips.forEach(function (chip) {
      chip.addEventListener("click", function () {
        chips.forEach(function (c) { c.classList.remove("active"); });
        chip.classList.add("active");
        var f = chip.getAttribute("data-filter");
        var shown = 0;
        items.forEach(function (it) {
          var show = f === "all" || (" " + it.getAttribute("data-cat") + " ").indexOf(" " + f + " ") > -1;
          it.classList.toggle("hide", !show);
          if (show) shown++;
        });
        var count = document.querySelector(".g-count");
        if (count) count.textContent = shown + " samples";
      });
    });
  } catch (e) {}

  /* product image detail dialog */
  try {
    var dialog = document.querySelector(".product-detail-dialog");
    var triggers = document.querySelectorAll(".product-detail-trigger");
    if (dialog && triggers.length && typeof dialog.showModal === "function") {
      var dialogImage = dialog.querySelector(".product-detail-image");
      var dialogTitle = dialog.querySelector(".product-detail-title");
      var dialogDescription = dialog.querySelector(".product-detail-description");
      var dialogClose = dialog.querySelector(".product-detail-close");
      var activeTrigger = null;

      function openProductDetail(trigger) {
        activeTrigger = trigger;
        dialogImage.src = trigger.getAttribute("data-detail-src");
        dialogImage.alt = trigger.getAttribute("data-detail-alt") || "";
        dialogTitle.textContent = trigger.getAttribute("data-detail-title") || "Product sample";
        dialogDescription.textContent = trigger.getAttribute("data-detail-description") || "";
        dialog.showModal();
        dialogClose.focus();
      }

      triggers.forEach(function (trigger) {
        trigger.addEventListener("click", function () { openProductDetail(trigger); });
      });
      dialogClose.addEventListener("click", function () { dialog.close(); });
      dialog.addEventListener("click", function (event) {
        if (event.target === dialog) dialog.close();
      });
      dialog.addEventListener("close", function () {
        if (activeTrigger) activeTrigger.focus();
      });
    }
  } catch (e) {}

  /* quote form: ?product= 预填 + 提交状态 */
  try {
    var sel = document.querySelector('form.rfq select[name="product"]');
    if (sel) {
      var want = new URLSearchParams(window.location.search).get("product");
      if (want) {
        for (var i = 0; i < sel.options.length; i++) {
          if (sel.options[i].getAttribute("data-slug") === want) { sel.selectedIndex = i; break; }
        }
      }
    }

    function initRfqUpload(root) {
      var picker = root.querySelector(".rfq-upload-input");
      var dropzone = root.querySelector(".rfq-upload-dropzone");
      var list = root.querySelector(".rfq-upload-list");
      var holder = root.querySelector(".rfq-upload-files");
      var status = root.querySelector(".rfq-upload-status");
      var maxFiles = parseInt(root.getAttribute("data-max-files"), 10) || 5;
      var maxBytes = parseInt(root.getAttribute("data-max-bytes"), 10) || 10485760;
      var allowed = /\.(png|jpe?g|webp|pdf|ai|svg|eps|zip)$/i;
      var files = [];
      var previewUrls = [];
      var enhanced = typeof DataTransfer !== "undefined";

      if (!picker || !dropzone || !list || !holder || !status || !enhanced) return;

      var defaultNote = status.textContent;
      root.classList.add("rfq-upload--enhanced");

      function announce(message) {
        status.textContent = message;
      }

      function key(file) {
        return [file.name, file.size, file.lastModified].join(":");
      }

      function totalBytes() {
        return files.reduce(function (total, file) { return total + file.size; }, 0);
      }

      function formatBytes(bytes) {
        if (bytes < 1048576) return Math.max(1, Math.ceil(bytes / 1024)) + " KB";
        return (bytes / 1048576).toFixed(1) + " MB";
      }

      function clearUrls() {
        previewUrls.forEach(function (url) { URL.revokeObjectURL(url); });
        previewUrls = [];
      }

      function syncInputs() {
        holder.textContent = "";
        files.forEach(function (file, index) {
          var transfer = new DataTransfer();
          var input = document.createElement("input");
          transfer.items.add(file);
          input.type = "file";
          input.name = "attachment_" + (index + 1);
          input.files = transfer.files;
          holder.appendChild(input);
        });
        picker.value = "";
      }

      function countMessage() {
        return files.length + (files.length === 1 ? " file attached, " : " files attached, ") +
          formatBytes(totalBytes()) + " total.";
      }

      function render() {
        clearUrls();
        list.textContent = "";
        files.forEach(function (file, index) {
          var item = document.createElement("div");
          var visual;
          if (/^image\//i.test(file.type)) {
            var url = URL.createObjectURL(file);
            previewUrls.push(url);
            visual = document.createElement("img");
            visual.src = url;
            visual.alt = "";
          } else {
            visual = document.createElement("span");
            visual.textContent = file.name.split(".").pop().toUpperCase();
            visual.className = "rfq-upload-filetype";
          }

          var meta = document.createElement("span");
          var fileName = document.createElement("b");
          var fileSize = document.createElement("small");
          meta.className = "rfq-upload-meta";
          fileName.textContent = file.name;
          fileSize.textContent = formatBytes(file.size);
          meta.appendChild(fileName);
          meta.appendChild(fileSize);

          var remove = document.createElement("button");
          remove.className = "rfq-upload-remove";
          remove.type = "button";
          remove.textContent = "Remove";
          remove.setAttribute("aria-label", "Remove " + file.name);
          remove.addEventListener("click", function () {
            files.splice(index, 1);
            syncInputs();
            render();
            announce(files.length ? countMessage() : defaultNote);
          });

          item.className = "rfq-upload-item";
          item.setAttribute("role", "listitem");
          item.appendChild(visual);
          item.appendChild(meta);
          item.appendChild(remove);
          list.appendChild(item);
        });
      }

      function addFiles(incoming) {
        var firstError = "";
        var added = false;
        Array.prototype.forEach.call(incoming, function (file) {
          var error = "";
          if (!allowed.test(file.name)) {
            error = "This file type is not supported.";
          } else if (files.some(function (current) { return key(current) === key(file); })) {
            error = "This file is already attached.";
          } else if (files.length >= maxFiles) {
            error = "You can attach up to 5 files.";
          } else if (totalBytes() + file.size > maxBytes) {
            error = "Attachments must total 10 MB or less.";
          }

          if (error) {
            if (!firstError) firstError = error;
            return;
          }
          files.push(file);
          added = true;
        });

        if (added) {
          syncInputs();
          render();
        }
        announce(firstError || countMessage());
      }

      picker.addEventListener("change", function () {
        addFiles(picker.files);
        picker.value = "";
      });
      dropzone.addEventListener("click", function () {
        dropzone.focus();
      });
      dropzone.addEventListener("dragover", function (event) {
        event.preventDefault();
        root.classList.add("rfq-upload--drag");
      });
      dropzone.addEventListener("dragleave", function () {
        root.classList.remove("rfq-upload--drag");
      });
      dropzone.addEventListener("drop", function (event) {
        event.preventDefault();
        root.classList.remove("rfq-upload--drag");
        addFiles(event.dataTransfer.files);
      });
      dropzone.addEventListener("paste", function (event) {
        var items = event.clipboardData && event.clipboardData.items;
        var fileItems = [];
        var pasted = [];
        Array.prototype.forEach.call(items || [], function (item) {
          if (item.kind === "file") fileItems.push(item);
          if (item.kind !== "file" || !/^image\//i.test(item.type)) return;
          var image = item.getAsFile();
          if (!image) return;
          var now = new Date();
          var stamp = [
            now.getFullYear(),
            String(now.getMonth() + 1).padStart(2, "0"),
            String(now.getDate()).padStart(2, "0"),
            String(now.getHours()).padStart(2, "0"),
            String(now.getMinutes()).padStart(2, "0"),
            String(now.getSeconds()).padStart(2, "0")
          ].join("");
          pasted.push(new File([image], "pasted-image-" + stamp + ".png", {
            type: image.type || "image/png",
            lastModified: Date.now() + pasted.length
          }));
        });
        if (pasted.length) {
          event.preventDefault();
          addFiles(pasted);
          return;
        }
        if (fileItems.length) {
          announce("No image found in the clipboard.");
          return;
        }
        setTimeout(function () { announce("Text added to attachment notes."); }, 0);
      });
      window.addEventListener("beforeunload", clearUrls);
    }

    document.querySelectorAll(".rfq-upload").forEach(initRfqUpload);

    document.querySelectorAll("form.rfq[action]").forEach(function (form) {
      form.addEventListener("submit", function () {
        var btn = form.querySelector('button[type="submit"]');
        if (btn) { btn.disabled = true; btn.textContent = "Sending…"; }
      });
    });
  } catch (e) {}

  /* company video: load near viewport, muted autoplay, pause offscreen */
  try {
    var companyVideos = document.querySelectorAll("video[data-video-src]");
    if (companyVideos.length) {
      var reduceVideoMotion = window.matchMedia &&
        window.matchMedia("(prefers-reduced-motion: reduce)").matches;

      function loadCompanyVideo(video) {
        if (video.getAttribute("src")) return;
        video.src = video.getAttribute("data-video-src");
        video.load();
      }

      function playCompanyVideo(video) {
        if (reduceVideoMotion || video.dataset.videoUserPaused === "true") return;
        video.muted = true;
        var attempt = video.play();
        if (attempt && attempt.catch) attempt.catch(function () {});
      }

      companyVideos.forEach(function (video) {
        if (reduceVideoMotion) video.removeAttribute("autoplay");
        video.addEventListener("pause", function () {
          if (video.dataset.videoViewportPause === "true") {
            delete video.dataset.videoViewportPause;
          } else {
            video.dataset.videoUserPaused = "true";
          }
        });
        video.addEventListener("play", function () {
          video.dataset.videoUserPaused = "false";
        });
      });

      if ("IntersectionObserver" in window) {
        var companyVideoObserver = new IntersectionObserver(function (entries) {
          entries.forEach(function (entry) {
            var video = entry.target;
            if (entry.isIntersecting) {
              loadCompanyVideo(video);
              playCompanyVideo(video);
            } else if (!video.paused) {
              video.dataset.videoViewportPause = "true";
              video.pause();
            }
          });
        }, { rootMargin: "300px 0px", threshold: 0.15 });
        companyVideos.forEach(function (video) {
          companyVideoObserver.observe(video);
        });
      } else {
        companyVideos.forEach(function (video) {
          loadCompanyVideo(video);
          playCompanyVideo(video);
        });
      }
    }
  } catch (e) {}
})();
