const CATEGORIES = ["Life", "Dreams", "Relationships", "Confessions", "Motivation"];
const STORAGE_KEY = "unsaid-local-demo-v1";

const sampleThoughts = [
  { id: "sample-1", category: "Life", text: "I’m learning that starting over doesn’t mean I failed. Sometimes it means I finally listened to myself.", minutesAgo: 12, reactions: 24 },
  { id: "sample-2", category: "Relationships", text: "I hope one day I can tell you how much your kindness mattered, even if you never knew I needed it.", minutesAgo: 38, reactions: 18 },
  { id: "sample-3", category: "Dreams", text: "Somewhere between the plans and the practical stuff, I forgot what I wanted. I’m trying to remember.", minutesAgo: 74, reactions: 31 },
  { id: "sample-4", category: "Confessions", text: "I pretend to have it all figured out because I’m afraid everyone else is waiting for me to.", minutesAgo: 126, reactions: 42 },
  { id: "sample-5", category: "Life", text: "I’m proud of the version of me that kept going, even when nobody was clapping.", minutesAgo: 203, reactions: 27 }
];

const form = document.querySelector("#thought-form");
const input = document.querySelector("#thought-input");
const count = document.querySelector("#character-count");
const formError = document.querySelector("#form-error");
const toast = document.querySelector("#toast");
const feed = document.querySelector("#thought-feed");
const emptyState = document.querySelector("#empty-state");
const filter = document.querySelector("#category-filter");

let toastTimer;
let state = loadState();

function loadState() {
  const freshState = { posts: [], likedIds: [], reportedIds: [] };
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return freshState;
    const parsed = JSON.parse(stored);
    if (!parsed || typeof parsed !== "object" || !Array.isArray(parsed.posts) ||
        !Array.isArray(parsed.likedIds) || !Array.isArray(parsed.reportedIds)) {
      throw new Error("Saved demo data has an unexpected format.");
    }
    return {
      posts: parsed.posts.filter(isValidSavedPost),
      likedIds: parsed.likedIds.filter(id => typeof id === "string"),
      reportedIds: parsed.reportedIds.filter(id => typeof id === "string")
    };
  } catch (error) {
    showToast(`Could not load saved demo data: ${error.message}`, true);
    return freshState;
  }
}

function isValidSavedPost(post) {
  return post && typeof post.id === "string" && typeof post.text === "string" &&
    CATEGORIES.includes(post.category) && typeof post.createdAt === "number";
}

function saveState() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    return true;
  } catch (error) {
    showToast(`Could not save to this browser: ${error.message}`, true);
    return false;
  }
}

function showToast(message, isError = false) {
  window.clearTimeout(toastTimer);
  toast.textContent = message;
  toast.classList.toggle("is-error", isError);
  if (message) {
    toastTimer = window.setTimeout(() => {
      toast.textContent = "";
      toast.classList.remove("is-error");
    }, 5000);
  }
}

function getThoughts() {
  const savedPosts = state.posts.map(post => ({
    ...post,
    minutesAgo: Math.max(0, Math.floor((Date.now() - post.createdAt) / 60000)),
    reactions: 0,
    isLocal: true
  }));
  return [...savedPosts, ...sampleThoughts];
}

function formatTime(minutes) {
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

function createThoughtCard(thought) {
  const card = document.createElement("article");
  card.className = "thought-card";

  const top = document.createElement("div");
  top.className = "thought-topline";
  const badge = document.createElement("span");
  badge.className = "category-badge";
  badge.textContent = thought.category;
  const time = document.createElement("time");
  time.className = "thought-time";
  time.textContent = thought.isLocal ? "your device · just now" : `demo · ${formatTime(thought.minutesAgo)}`;
  top.append(badge, time);

  const text = document.createElement("p");
  text.className = "thought-text";
  text.textContent = thought.text;

  const actions = document.createElement("div");
  actions.className = "thought-actions";
  const reaction = document.createElement("button");
  const isLiked = state.likedIds.includes(thought.id);
  reaction.type = "button";
  reaction.className = `reaction-button${isLiked ? " is-liked" : ""}`;
  reaction.setAttribute("aria-pressed", String(isLiked));
  reaction.setAttribute("aria-label", `${isLiked ? "Remove reaction from" : "React to"} thought in ${thought.category}`);
  const heart = document.createElement("span");
  heart.className = "heart";
  heart.setAttribute("aria-hidden", "true");
  heart.textContent = isLiked ? "♥" : "♡";
  const reactionCount = document.createElement("span");
  reactionCount.textContent = String(thought.reactions + (isLiked ? 1 : 0));
  reaction.append(heart, reactionCount);
  reaction.addEventListener("click", () => toggleReaction(thought.id));

  const report = document.createElement("button");
  report.type = "button";
  const isReported = state.reportedIds.includes(thought.id);
  report.className = `report-button${isReported ? " is-reported" : ""}`;
  report.textContent = isReported ? "Reported" : "Report";
  report.disabled = isReported;
  report.setAttribute("aria-label", isReported ? "Thought marked as reported on this device" : "Report this thought on this device");
  report.addEventListener("click", () => reportThought(thought.id));
  actions.append(reaction, report);
  card.append(top, text, actions);
  return card;
}

function renderFeed() {
  const selectedCategory = filter.value;
  const thoughts = getThoughts().filter(thought =>
    selectedCategory === "All" || thought.category === selectedCategory
  );
  feed.replaceChildren(...thoughts.map(createThoughtCard));
  emptyState.hidden = thoughts.length > 0;
}

function toggleReaction(id) {
  const alreadyLiked = state.likedIds.includes(id);
  state.likedIds = alreadyLiked
    ? state.likedIds.filter(likedId => likedId !== id)
    : [...state.likedIds, id];
  const saved = saveState();
  renderFeed();
  showToast(saved
    ? (alreadyLiked ? "Reaction removed on this device." : "Reaction saved on this device.")
    : "Reaction updated for this session, but could not be saved to this browser.", !saved);
}

function reportThought(id) {
  if (state.reportedIds.includes(id)) return;
  state.reportedIds = [...state.reportedIds, id];
  const saved = saveState();
  renderFeed();
  showToast(saved
    ? "Marked as reported on this device. No report is sent or shared."
    : "Marked for this session only; it could not be saved to this browser.", !saved);
}

input.addEventListener("input", () => {
  count.textContent = `${input.value.length} / 500`;
  formError.hidden = true;
});

form.addEventListener("submit", event => {
  event.preventDefault();
  const text = input.value.trim();
  if (!text) {
    formError.textContent = "Write a thought before letting it out.";
    formError.hidden = false;
    input.focus();
    return;
  }
  if (text.length > 500) {
    formError.textContent = "Your thought must be 500 characters or fewer.";
    formError.hidden = false;
    input.focus();
    return;
  }

  const category = form.querySelector('input[name="category"]:checked')?.value;
  if (!CATEGORIES.includes(category)) {
    formError.textContent = "Choose a category for your thought.";
    formError.hidden = false;
    return;
  }

  const id = window.crypto && typeof window.crypto.randomUUID === "function"
    ? window.crypto.randomUUID()
    : `local-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  state.posts.unshift({ id, category, text, createdAt: Date.now() });
  const saved = saveState();
  input.value = "";
  count.textContent = "0 / 500";
  formError.hidden = true;
  filter.value = "All";
  renderFeed();
  showToast(saved
    ? "Your thought has landed. It is saved only in this browser."
    : "Your thought has landed for this session, but could not be saved to this browser.", !saved);
  document.querySelector("#community").scrollIntoView({ behavior: "smooth", block: "start" });
});

filter.addEventListener("change", renderFeed);
renderFeed();
