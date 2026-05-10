const STORAGE_KEY = "goldenGuildState";

const seedState = {
  currentUser: null,
  users: [
    {
      username: "Mira",
      password: "guild",
      joinedAt: "2026-04-24T18:30:00.000Z",
    },
    {
      username: "Jonah",
      password: "guild",
      joinedAt: "2026-04-25T15:20:00.000Z",
    },
  ],
  posts: [
    {
      id: crypto.randomUUID(),
      title: "On Keeping Tiny Promises",
      body: "I keep thinking about how friendships are built less from grand gestures than from little remembered things: the book someone meant to read, the soup they like, the Tuesday they said would be hard. The tiny promise is a lantern. It does not light the whole road, but it lights enough.",
      author: "Mira",
      createdAt: "2026-05-01T17:20:00.000Z",
    },
    {
      id: crypto.randomUUID(),
      title: "Notes From a Long Walk",
      body: "The city changes when you refuse to hurry through it. Every block becomes a paragraph. Every window has its own grammar. I walked home the long way and arrived with nothing solved, which was somehow exactly the point.",
      author: "Jonah",
      createdAt: "2026-05-04T21:12:00.000Z",
    },
  ],
};

let state = loadState();
let authMode = "login";

const accountArea = document.querySelector("#accountArea");
const authDialog = document.querySelector("#authDialog");
const authForm = document.querySelector("#authForm");
const authTitle = document.querySelector("#authTitle");
const authMessage = document.querySelector("#authMessage");
const usernameInput = document.querySelector("#usernameInput");
const passwordInput = document.querySelector("#passwordInput");
const postForm = document.querySelector("#postForm");
const postGrid = document.querySelector("#postGrid");
const postTemplate = document.querySelector("#postTemplate");
const searchInput = document.querySelector("#searchInput");
const sortSelect = document.querySelector("#sortSelect");
const emptyState = document.querySelector("#emptyState");
const memberList = document.querySelector("#memberList");
const editorHint = document.querySelector("#editorHint");

function loadState() {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (!saved) return seedState;

  try {
    const parsed = JSON.parse(saved);
    return {
      currentUser: parsed.currentUser ?? null,
      users: parsed.users?.length ? parsed.users : seedState.users,
      posts: parsed.posts?.length ? parsed.posts : seedState.posts,
    };
  } catch {
    return seedState;
  }
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function setView(viewName) {
  document.querySelectorAll(".view").forEach((view) => {
    view.classList.toggle("active", view.id === `${viewName}View`);
  });
  document.querySelectorAll(".nav-link").forEach((button) => {
    button.classList.toggle("active", button.dataset.view === viewName);
  });
}

function openAuth(mode = "login") {
  authMode = mode;
  updateAuthMode();
  authMessage.textContent = "";
  authForm.reset();
  authDialog.showModal();
  usernameInput.focus();
}

function updateAuthMode() {
  authTitle.textContent = authMode === "login" ? "Sign in" : "Create account";
  passwordInput.autocomplete = authMode === "login" ? "current-password" : "new-password";
  document.querySelectorAll(".segment").forEach((button) => {
    button.classList.toggle("active", button.dataset.authMode === authMode);
  });
}

function getUser(username) {
  return state.users.find((user) => user.username.toLowerCase() === username.toLowerCase());
}

function initials(username) {
  return username.trim().slice(0, 1).toUpperCase();
}

function formatDate(dateString) {
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(dateString));
}

function renderAccount() {
  accountArea.replaceChildren();

  if (state.currentUser) {
    const pill = document.createElement("span");
    pill.className = "user-pill";
    const avatar = document.createElement("span");
    avatar.className = "avatar";
    avatar.textContent = initials(state.currentUser);
    const username = document.createElement("span");
    username.textContent = state.currentUser;
    pill.append(avatar, username);

    const logout = document.createElement("button");
    logout.className = "secondary-action";
    logout.type = "button";
    logout.textContent = "Log out";
    logout.addEventListener("click", () => {
      state.currentUser = null;
      saveState();
      render();
    });

    accountArea.append(pill, logout);
    return;
  }

  const login = document.createElement("button");
  login.className = "secondary-action";
  login.type = "button";
  login.textContent = "Log in";
  login.addEventListener("click", () => openAuth("login"));

  const signup = document.createElement("button");
  signup.className = "primary-action";
  signup.type = "button";
  signup.textContent = "Join";
  signup.addEventListener("click", () => openAuth("signup"));

  accountArea.append(login, signup);
}

function filteredPosts() {
  const query = searchInput.value.trim().toLowerCase();
  const posts = state.posts.filter((post) => {
    const searchable = `${post.title} ${post.body} ${post.author}`.toLowerCase();
    return searchable.includes(query);
  });

  return posts.sort((a, b) => {
    if (sortSelect.value === "oldest") return new Date(a.createdAt) - new Date(b.createdAt);
    if (sortSelect.value === "author") return a.author.localeCompare(b.author);
    return new Date(b.createdAt) - new Date(a.createdAt);
  });
}

function renderPosts() {
  const posts = filteredPosts();
  postGrid.replaceChildren();

  posts.forEach((post) => {
    const node = postTemplate.content.cloneNode(true);
    const card = node.querySelector(".post-card");
    const avatar = node.querySelector(".avatar");
    const author = node.querySelector(".author");
    const time = node.querySelector("time");
    const title = node.querySelector("h3");
    const body = node.querySelector("p");
    const readButton = node.querySelector("button");

    avatar.textContent = initials(post.author);
    author.textContent = post.author;
    time.textContent = formatDate(post.createdAt);
    time.dateTime = post.createdAt;
    title.textContent = post.title;
    body.textContent = post.body;
    readButton.addEventListener("click", () => showFullPost(post));
    card.style.borderTop = `4px solid ${authorColor(post.author)}`;
    postGrid.append(node);
  });

  emptyState.classList.toggle("hidden", posts.length > 0);
  document.querySelector("#postCount").textContent = state.posts.length;
}

function showFullPost(post) {
  const wrapper = document.createElement("div");
  wrapper.className = "full-post";
  wrapper.innerHTML = `
    <div class="post-meta">
      <span class="avatar">${initials(post.author)}</span>
      <span>${escapeHtml(post.author)}</span>
      <time datetime="${post.createdAt}">${formatDate(post.createdAt)}</time>
    </div>
    <h2>${escapeHtml(post.title)}</h2>
    <p>${escapeHtml(post.body)}</p>
  `;

  const closeButton = document.createElement("button");
  closeButton.className = "primary-action";
  closeButton.type = "button";
  closeButton.textContent = "Back to library";
  closeButton.addEventListener("click", renderPosts);

  postGrid.replaceChildren(wrapper);
  wrapper.append(closeButton);
  emptyState.classList.add("hidden");
}

function escapeHtml(value) {
  return value.replace(/[&<>"']/g, (character) => {
    return {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#039;",
    }[character];
  });
}

function authorColor(author) {
  const colors = ["#275846", "#283e61", "#8f3f4a", "#8d5f12"];
  const total = [...author].reduce((sum, letter) => sum + letter.charCodeAt(0), 0);
  return colors[total % colors.length];
}

function renderMembers() {
  memberList.replaceChildren();
  state.users
    .slice()
    .sort((a, b) => a.username.localeCompare(b.username))
    .forEach((user) => {
      const count = state.posts.filter((post) => post.author === user.username).length;
      const card = document.createElement("article");
      card.className = "member-card";
      card.innerHTML = `
        <span class="avatar">${initials(user.username)}</span>
        <div>
          <strong>${escapeHtml(user.username)}</strong>
          <span>${count} ${count === 1 ? "post" : "posts"}</span>
        </div>
      `;
      memberList.append(card);
    });

  document.querySelector("#memberCount").textContent = state.users.length;
}

function renderEditor() {
  const button = postForm.querySelector("button[type='submit']");
  button.disabled = !state.currentUser;
  editorHint.textContent = state.currentUser
    ? `Publishing as ${state.currentUser}.`
    : "Sign in to publish under your username.";
}

function render() {
  renderAccount();
  renderPosts();
  renderMembers();
  renderEditor();
}

document.querySelectorAll(".nav-link").forEach((button) => {
  button.addEventListener("click", () => setView(button.dataset.view));
});

document.querySelector("#quickWriteButton").addEventListener("click", () => setView("write"));

document.querySelector("#closeAuthButton").addEventListener("click", () => authDialog.close());

document.querySelectorAll(".segment").forEach((button) => {
  button.addEventListener("click", () => {
    authMode = button.dataset.authMode;
    authMessage.textContent = "";
    updateAuthMode();
  });
});

authForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const username = usernameInput.value.trim();
  const password = passwordInput.value;
  const existingUser = getUser(username);

  if (authMode === "signup") {
    if (existingUser) {
      authMessage.textContent = "That username is already part of the guild.";
      return;
    }

    state.users.push({
      username,
      password,
      joinedAt: new Date().toISOString(),
    });
    state.currentUser = username;
    saveState();
    authDialog.close();
    render();
    return;
  }

  if (!existingUser || existingUser.password !== password) {
    authMessage.textContent = "Username or password did not match.";
    return;
  }

  state.currentUser = existingUser.username;
  saveState();
  authDialog.close();
  render();
});

postForm.addEventListener("submit", (event) => {
  event.preventDefault();
  if (!state.currentUser) {
    openAuth("login");
    return;
  }

  const title = document.querySelector("#titleInput").value.trim();
  const body = document.querySelector("#bodyInput").value.trim();
  if (!title || !body) return;

  state.posts.unshift({
    id: crypto.randomUUID(),
    title,
    body,
    author: state.currentUser,
    createdAt: new Date().toISOString(),
  });

  saveState();
  postForm.reset();
  render();
  setView("feed");
});

searchInput.addEventListener("input", renderPosts);
sortSelect.addEventListener("change", renderPosts);

render();
